import argparse
import ipaddress
import json
import os
import secrets
import tempfile
import threading
from datetime import datetime
from functools import wraps
from concurrent.futures import ThreadPoolExecutor
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
from uuid import uuid4

import requests
from authlib.integrations.requests_client import OAuth2Session
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "program.json"
MAX_REQUEST_SIZE = 16_384
MAX_REQUEST_WORKERS = 64
MAX_QUEUED_REQUESTS = 256
LOCAL_DEVELOPMENT_USER = {"id": "local-development", "login": "local-developer", "local": True}
DATA_LOCK = threading.RLock()


def serialize_data_mutation(handler_method):
    @wraps(handler_method)
    def wrapped(self, *args, **kwargs):
        with DATA_LOCK:
            return handler_method(self, *args, **kwargs)

    return wrapped


class ConniHTTPServer(ThreadingHTTPServer):
    """Serve requests with bounded workers and pending-request capacity."""

    request_queue_size = MAX_QUEUED_REQUESTS
    daemon_threads = True

    def __init__(self, server_address, request_handler):
        self.request_executor = ThreadPoolExecutor(max_workers=MAX_REQUEST_WORKERS)
        self.request_slots = threading.BoundedSemaphore(MAX_REQUEST_WORKERS + MAX_QUEUED_REQUESTS)
        super().__init__(server_address, request_handler)

    def process_request(self, request, client_address):
        if not self.request_slots.acquire(blocking=False):
            self.shutdown_request(request)
            return

        try:
            future = self.request_executor.submit(self.process_request_thread, request, client_address)
        except RuntimeError:
            self.request_slots.release()
            self.shutdown_request(request)
        else:
            future.add_done_callback(lambda completed_request: self.request_slots.release())

    def server_close(self):
        super().server_close()
        self.request_executor.shutdown(wait=True)


class ConniHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        served_path = Path(self.translate_path(self.path)).resolve()
        data_path = DATA_FILE.resolve()
        root_path = ROOT.resolve()
        if served_path == data_path or (served_path.parent == root_path and served_path.name.startswith(".program-")):
            self.send_error(404, "File not found")
            return None
        return super().send_head()

    def log_request(self, code="-", size="-"):
        if urlparse(self.path).path == "/auth/callback":
            return
        super().log_request(code, size)

    def do_GET(self):
        request_path = urlparse(self.path).path
        if request_path == "/auth/login":
            self.start_github_login()
            return
        if request_path == "/auth/callback":
            self.finish_github_login()
            return
        if request_path == "/api/me":
            user = self.authenticated_user()
            if user is None:
                self.send_json(401, {"error": "Sign in required"})
            else:
                self.send_json(200, {"user": user})
            return
        if request_path not in ("/api/events", "/api/event"):
            super().do_GET()
            return

        user = self.require_authenticated_user()
        if user is None:
            return

        try:
            data = self.read_data()
            if request_path == "/api/events":
                self.send_json(200, {
                    "events": [self.event_summary(event, user) for event in data["events"] if self.can_access_event(event, user)]
                })
                return

            event = self.find_event(data, self.requested_event_id())
            if event is None:
                self.send_json(404, {"error": "Event not found"})
                return
            if not self.can_access_event(event, user):
                self.send_json(403, {"error": "You are not authorized for this event"})
                return
            self.send_json(200, {"event": event})
        except (json.JSONDecodeError, UnicodeDecodeError, OSError):
            self.send_json(500, {"error": "Could not load event data"})

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    @staticmethod
    def oauth_configuration():
        client_id = os.environ.get("GITHUB_CLIENT_ID")
        client_secret = os.environ.get("GITHUB_CLIENT_SECRET")
        redirect_uri = os.environ.get("GITHUB_REDIRECT_URI")
        session_secret = os.environ.get("SESSION_SECRET")
        if not all((client_id, client_secret, redirect_uri)) or not session_secret or len(session_secret) < 32:
            return None
        return client_id, client_secret, redirect_uri, session_secret

    @staticmethod
    def session_serializer():
        secret = os.environ.get("SESSION_SECRET", "")
        if len(secret) < 32:
            return None
        return URLSafeTimedSerializer(secret, salt="conni2-github-session")

    def cookie_value(self, cookie_name):
        try:
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            return cookies[cookie_name].value if cookie_name in cookies else None
        except Exception:
            return None

    def authenticated_user(self):
        if self.local_auth_bypass_enabled():
            user = dict(LOCAL_DEVELOPMENT_USER)
            user["login"] = unquote(self.cookie_value("conni2_local_name") or "").strip()
            return user
        serializer = self.session_serializer()
        cookie_value = self.cookie_value("conni2_session")
        if serializer is None or not cookie_value:
            return None
        try:
            user = serializer.loads(cookie_value, max_age=604800)
        except (BadSignature, SignatureExpired):
            return None
        if not isinstance(user, dict) or not isinstance(user.get("id"), str) or not isinstance(user.get("login"), str):
            return None
        return user

    def local_auth_bypass_enabled(self):
        if os.environ.get("RENDER") or os.environ.get("LOCAL_AUTH_BYPASS", "").casefold() != "true":
            return False
        try:
            return ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            return False

    def require_authenticated_user(self):
        user = self.authenticated_user()
        if user is None:
            self.send_json(401, {"error": "Sign in required"})
        return user

    def secure_cookie(self):
        redirect_uri = os.environ.get("GITHUB_REDIRECT_URI", "")
        return "; Secure" if os.environ.get("RENDER") or redirect_uri.startswith("https://") else ""

    def redirect(self, location, cookie_header=None):
        self.send_response(303)
        self.send_header("Location", location)
        if cookie_header:
            self.send_header("Set-Cookie", cookie_header)
        self.end_headers()

    def start_github_login(self):
        configuration = self.oauth_configuration()
        if configuration is None:
            self.send_json(503, {"error": "GitHub OAuth is not configured on the server"})
            return

        client_id, client_secret, redirect_uri, session_secret = configuration
        state = secrets.token_urlsafe(32)
        code_verifier = secrets.token_urlsafe(64)
        oauth = OAuth2Session(
            client_id,
            client_secret,
            scope="read:user",
            redirect_uri=redirect_uri,
            token_endpoint_auth_method="client_secret_post",
            code_challenge_method="S256",
        )
        authorization_url, _ = oauth.create_authorization_url(
            "https://github.com/login/oauth/authorize",
            state=state,
            code_verifier=code_verifier,
        )
        state_cookie = URLSafeTimedSerializer(session_secret, salt="conni2-github-state").dumps({
            "state": state,
            "codeVerifier": code_verifier,
        })
        cookie = f"conni2_oauth_state={state_cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600{self.secure_cookie()}"
        self.redirect(authorization_url, cookie)

    def finish_github_login(self):
        configuration = self.oauth_configuration()
        cookie = self.cookie_value("conni2_oauth_state")
        query = parse_qs(urlparse(self.path).query)
        state = query.get("state", [""])[0]
        code = query.get("code", [""])[0]
        if configuration is None or not cookie or not state or not code:
            self.send_json(400, {"error": "GitHub sign-in could not be completed"})
            return

        client_id, client_secret, redirect_uri, session_secret = configuration
        try:
            state_data = URLSafeTimedSerializer(session_secret, salt="conni2-github-state").loads(cookie, max_age=600)
            expected_state = state_data.get("state", "")
            code_verifier = state_data.get("codeVerifier", "")
            if not secrets.compare_digest(state, expected_state) or not code_verifier:
                raise BadSignature("Invalid OAuth state")

            oauth = OAuth2Session(
                client_id,
                client_secret,
                scope="read:user",
                redirect_uri=redirect_uri,
                token_endpoint_auth_method="client_secret_post",
                code_challenge_method="S256",
            )
            token = oauth.fetch_token(
                "https://github.com/login/oauth/access_token",
                code=code,
                code_verifier=code_verifier,
            )
            oauth.token = token
            profile = oauth.get("https://api.github.com/user").json()
            if not isinstance(profile.get("id"), int) or not isinstance(profile.get("login"), str):
                raise ValueError("Invalid GitHub profile")
            user = {"id": str(profile["id"]), "login": profile["login"]}
            session_cookie = URLSafeTimedSerializer(session_secret, salt="conni2-github-session").dumps(user)
            session_header = f"conni2_session={session_cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800{self.secure_cookie()}"
            clear_state = f"conni2_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0{self.secure_cookie()}"
            self.send_response(303)
            self.send_header("Location", "/")
            self.send_header("Set-Cookie", session_header)
            self.send_header("Set-Cookie", clear_state)
            self.end_headers()
        except (BadSignature, SignatureExpired, ValueError, KeyError, OSError):
            self.send_json(400, {"error": "GitHub sign-in could not be completed"})
        except Exception:
            self.send_json(502, {"error": "Could not verify the GitHub account"})

    def clear_session(self):
        self.send_response(204)
        self.send_header(
            "Set-Cookie",
            f"conni2_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0{self.secure_cookie()}",
        )
        self.send_header("Set-Cookie", "conni2_local_name=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0")
        self.end_headers()

    def start_local_login(self):
        if not self.local_auth_bypass_enabled():
            self.send_json(404, {"error": "Not found"})
            return
        try:
            request_size = int(self.headers.get("Content-Length", "0"))
            if request_size <= 0 or request_size > MAX_REQUEST_SIZE:
                self.send_json(400, {"error": "Invalid request size"})
                return
            request = json.loads(self.rfile.read(request_size))
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self.send_json(400, {"error": "Invalid JSON request"})
            return

        name = request.get("name") if isinstance(request, dict) else None
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
            self.send_json(400, {"error": "Enter a name of 1 to 120 characters"})
            return

        cookie = f"conni2_local_name={quote(name.strip(), safe='')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800"
        self.send_response(204)
        self.send_header("Set-Cookie", cookie)
        self.end_headers()

    @staticmethod
    def find_event(data, event_id):
        events = data.get("events", [])
        if event_id is None and events:
            return events[0]
        return next((event for event in events if event.get("id") == event_id), None)

    def requested_event_id(self):
        return parse_qs(urlparse(self.path).query).get("eventId", [None])[0]

    def read_data(self):
        with DATA_LOCK:
            data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return data

    def read_event_data(self):
        user = self.authenticated_user()
        data = self.read_data()
        event = self.find_event(data, self.requested_event_id())
        if event is None:
            self.send_json(404, {"error": "Event not found"})
            return None, None
        if user is None:
            self.send_json(401, {"error": "Sign in required"})
            return None, None
        if not self.can_access_event(event, user):
            self.send_json(403, {"error": "You are not authorized for this event"})
            return None, None
        return data, event

    @staticmethod
    def can_access_event(event, user):
        if user.get("local"):
            return True
        if str(event.get("creatorId", "")) == user["id"]:
            return True
        return any(
            isinstance(authorized_user, dict) and authorized_user.get("id") == user["id"]
            for authorized_user in event.get("authorizedUsers", [])
        )

    @classmethod
    def event_summary(cls, event, user):
        summary = {"id": event["id"], "name": event["name"], "creatorId": event.get("creatorId")}
        if cls.is_event_creator(event, user):
            summary["authorizedUsers"] = event.get("authorizedUsers", [])
        return summary

    @serialize_data_mutation
    def do_POST(self):
        """Handle like updates and event, topic, or location creation requests."""
        request_path = urlparse(self.path).path
        if request_path == "/auth/local-login":
            self.start_local_login()
            return
        if request_path == "/auth/logout":
            self.clear_session()
            return
        if request_path not in ("/api/events", "/api/events/authorized-users", "/api/like", "/api/topics", "/api/locations"):
            self.send_json(404, {"error": "Not found"})
            return
        user = self.require_authenticated_user()
        if user is None:
            return

        try:
            request_size = int(self.headers.get("Content-Length", "0"))
            if request_size <= 0 or request_size > MAX_REQUEST_SIZE:
                self.send_json(400, {"error": "Invalid request size"})
                return

            request = json.loads(self.rfile.read(request_size))
            if not isinstance(request, dict):
                self.send_json(400, {"error": "Invalid request body"})
                return

            if request_path == "/api/events":
                self.create_event(request, user)
                return
            if request_path == "/api/events/authorized-users":
                self.add_authorized_user(request, user)
                return
            data, event = self.read_event_data()
            if event is None:
                return
            if request_path == "/api/topics":
                self.create_topic(request, data, event)
                return
            if request_path == "/api/locations":
                self.create_location(request, data, event)
                return

            item_type = request.get("itemType")
            item_name = request.get("itemName")
            user_name = user["login"]
            liked = request.get("liked")

            if item_type not in ("program", "topics"):
                self.send_json(400, {"error": "Invalid item type"})
                return
            if not isinstance(item_name, str) or not item_name.strip():
                self.send_json(400, {"error": "Invalid item name"})
                return
            if not isinstance(user_name, str) or not user_name.strip() or len(user_name) > 120:
                self.send_json(400, {"error": "Invalid user name"})
                return
            if not isinstance(liked, bool):
                self.send_json(400, {"error": "Invalid like state"})
                return

            item = next(
                (entry for entry in event.get(item_type, []) if entry.get("name") == item_name),
                None,
            )
            if item is None:
                self.send_json(404, {"error": "Item not found"})
                return

            user_key = user_name.strip().casefold()
            likers = item.setdefault("likers", [])
            already_liked = any(liker.casefold() == user_key for liker in likers)

            if liked and not already_liked:
                likers.append(user_name.strip())
            elif not liked and already_liked:
                item["likers"] = [liker for liker in likers if liker.casefold() != user_key]
                likers = item["likers"]

            item["likeCount"] = len(likers)
            self.write_data(data)
            self.send_json(200, {"itemType": item_type, "item": item})
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self.send_json(400, {"error": "Invalid JSON request"})
        except OSError:
            self.send_json(500, {"error": "Could not save program.json"})

    @serialize_data_mutation
    def do_DELETE(self):
        request_path = urlparse(self.path).path
        if request_path not in ("/api/items", "/api/events", "/api/events/authorized-users"):
            self.send_json(404, {"error": "Not found"})
            return
        user = self.require_authenticated_user()
        if user is None:
            return

        try:
            request_size = int(self.headers.get("Content-Length", "0"))
            if request_size <= 0 or request_size > MAX_REQUEST_SIZE:
                self.send_json(400, {"error": "Invalid request size"})
                return

            request = json.loads(self.rfile.read(request_size))
            if not isinstance(request, dict):
                self.send_json(400, {"error": "Invalid request body"})
                return

            if request_path == "/api/events":
                self.delete_event(request, user)
                return
            if request_path == "/api/events/authorized-users":
                self.remove_authorized_user(request, user)
                return

            item_type = request.get("itemType")
            item_name = request.get("itemName")
            if item_type not in ("program", "topics"):
                self.send_json(400, {"error": "Invalid item type"})
                return
            if not isinstance(item_name, str) or not item_name.strip():
                self.send_json(400, {"error": "Invalid item name"})
                return

            data, event = self.read_event_data()
            if event is None:
                return
            items = event.get(item_type, [])
            item_index = next(
                (index for index, item in enumerate(items) if item.get("name") == item_name),
                None,
            )
            if item_index is None:
                self.send_json(404, {"error": "Item not found"})
                return

            deleted_item = items.pop(item_index)
            self.write_data(data)
            self.send_json(200, {"itemType": item_type, "item": deleted_item})
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self.send_json(400, {"error": "Invalid JSON request"})
        except OSError:
            self.send_json(500, {"error": "Could not save program.json"})

    @serialize_data_mutation
    def do_PUT(self):
        """Update an event, program item, topic, or location from a JSON body."""
        request_path = urlparse(self.path).path
        if request_path not in ("/api/events", "/api/items", "/api/locations"):
            self.send_json(404, {"error": "Not found"})
            return
        user = self.require_authenticated_user()
        if user is None:
            return

        try:
            request_size = int(self.headers.get("Content-Length", "0"))
            if request_size <= 0 or request_size > MAX_REQUEST_SIZE:
                self.send_json(400, {"error": "Invalid request size"})
                return

            request = json.loads(self.rfile.read(request_size))
            if not isinstance(request, dict):
                self.send_json(400, {"error": "Invalid request body"})
                return

            if request_path == "/api/events":
                self.update_event(request, user)
                return

            data, event = self.read_event_data()
            if event is None:
                return
            if request_path == "/api/locations":
                self.update_location(request, data, event)
                return

            source_type = request.get("itemType")
            target_type = request.get("targetType", source_type)
            item_name = request.get("itemName")
            name = request.get("name")
            description = request.get("description")
            contributors = request.get("contributors")
            languages = request.get("languages")

            if source_type not in ("program", "topics") or target_type not in ("program", "topics"):
                self.send_json(400, {"error": "Invalid item type"})
                return
            if not isinstance(item_name, str) or not item_name.strip():
                self.send_json(400, {"error": "Invalid item name"})
                return
            if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
                self.send_json(400, {"error": "A name of 1 to 160 characters is required"})
                return
            if not isinstance(description, str) or len(description.strip()) > 4000:
                self.send_json(400, {"error": "Description must be at most 4000 characters"})
                return
            if not self.valid_string_list(contributors, max_items=30, max_length=120):
                self.send_json(400, {"error": "Invalid contributor list"})
                return
            if not self.valid_string_list(languages, max_items=20, max_length=80):
                self.send_json(400, {"error": "Invalid language list"})
                return

            source_items = event.get(source_type, [])
            source_index = next(
                (index for index, entry in enumerate(source_items) if entry.get("name") == item_name),
                None,
            )
            if source_index is None:
                self.send_json(404, {"error": "Item not found"})
                return

            item = source_items[source_index]
            target_items = event.setdefault(target_type, [])
            normalized_name = name.strip().casefold()
            if any(
                entry is not item and entry.get("name", "").strip().casefold() == normalized_name
                for entry in target_items
            ):
                self.send_json(409, {"error": "An item with that name already exists"})
                return

            updated_item = dict(item)
            updated_item.update({
                "name": name.strip(),
                "desc": description.strip(),
                "contributers": self.clean_string_list(contributors),
                "languages": self.clean_string_list(languages),
            })

            if target_type == "program":
                location = request.get("location")
                date = request.get("date")
                start = request.get("start")
                end = request.get("end")
                valid_location = isinstance(location, str) and any(
                    entry.get("name") == location for entry in event.get("locations", [])
                )
                if not valid_location:
                    self.send_json(400, {"error": "Select a valid location"})
                    return
                try:
                    valid_date = isinstance(date, str) and datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d") == date
                    start_time = datetime.strptime(start, "%H:%M") if isinstance(start, str) else None
                    end_time = datetime.strptime(end, "%H:%M") if isinstance(end, str) else None
                except ValueError:
                    valid_date = False
                    start_time = None
                    end_time = None
                if not valid_date or start_time is None or end_time is None:
                    self.send_json(400, {"error": "Enter a valid date and start/end time"})
                    return
                duration = int((end_time - start_time).total_seconds() // 60)
                if duration <= 0:
                    self.send_json(400, {"error": "End time must be after start time"})
                    return
                updated_item.update({
                    "location": location,
                    "date": date,
                    "start": start_time.strftime("%H:%M"),
                    "end": end_time.strftime("%H:%M"),
                    "duration": duration,
                })
            else:
                for field in ("location", "date", "start", "end", "duration"):
                    updated_item.pop(field, None)

            if target_type == source_type:
                source_items[source_index] = updated_item
            else:
                source_items.pop(source_index)
                target_items.append(updated_item)

            self.write_data(data)
            self.send_json(200, {
                "sourceType": source_type,
                "targetType": target_type,
                "item": updated_item,
            })
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self.send_json(400, {"error": "Invalid JSON request"})
        except OSError:
            self.send_json(500, {"error": "Could not save program.json"})

    def create_event(self, request, user):
        name = request.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
            self.send_json(400, {"error": "An event name of 1 to 160 characters is required"})
            return

        data = self.read_data()
        normalized_name = name.strip().casefold()
        if any(event.get("name", "").strip().casefold() == normalized_name for event in data["events"]):
            self.send_json(409, {"error": "An event with that name already exists"})
            return

        event = {
            "id": uuid4().hex,
            "name": name.strip(),
            "creatorId": user["id"],
            "creatorLogin": user["login"],
            "authorizedUsers": [],
            "program": [],
            "topics": [],
            "locations": [],
        }
        data["events"].append(event)
        self.write_data(data)
        self.send_json(201, {"event": event})

    def update_event(self, request, user):
        event_id = request.get("eventId")
        name = request.get("name")
        if not isinstance(event_id, str) or not event_id:
            self.send_json(400, {"error": "Invalid event"})
            return
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
            self.send_json(400, {"error": "An event name of 1 to 160 characters is required"})
            return

        data = self.read_data()
        event = self.find_event(data, event_id)
        if event is None:
            self.send_json(404, {"error": "Event not found"})
            return
        if not self.is_event_creator(event, user):
            self.send_json(403, {"error": "Only the event creator can rename this event"})
            return
        normalized_name = name.strip().casefold()
        if any(
            candidate is not event and candidate.get("name", "").strip().casefold() == normalized_name
            for candidate in data["events"]
        ):
            self.send_json(409, {"error": "An event with that name already exists"})
            return

        event["name"] = name.strip()
        self.write_data(data)
        self.send_json(200, {"event": event})

    def delete_event(self, request, user):
        event_id = request.get("eventId")
        if not isinstance(event_id, str) or not event_id:
            self.send_json(400, {"error": "Invalid event"})
            return

        data = self.read_data()
        event_index = next(
            (index for index, event in enumerate(data["events"]) if event.get("id") == event_id),
            None,
        )
        if event_index is None:
            self.send_json(404, {"error": "Event not found"})
            return

        if not self.is_event_creator(data["events"][event_index], user):
            self.send_json(403, {"error": "Only the event creator can delete this event"})
            return

        deleted_event = data["events"].pop(event_index)
        self.write_data(data)
        self.send_json(200, {"event": deleted_event})

    @staticmethod
    def is_event_creator(event, user):
        return user.get("local", False) or str(event.get("creatorId", "")) == user["id"]

    def add_authorized_user(self, request, user):
        event_id = request.get("eventId")
        login = request.get("login")
        if not isinstance(event_id, str) or not event_id:
            self.send_json(400, {"error": "Invalid event"})
            return
        if not isinstance(login, str) or not login.strip() or len(login.strip()) > 39:
            self.send_json(400, {"error": "Enter a valid GitHub username"})
            return

        data = self.read_data()
        event = self.find_event(data, event_id)
        if event is None:
            self.send_json(404, {"error": "Event not found"})
            return
        if not self.is_event_creator(event, user):
            self.send_json(403, {"error": "Only the event creator can manage authorized users"})
            return

        try:
            response = requests.get(
                f"https://api.github.com/users/{quote(login.strip(), safe='')}",
                headers={"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "OpenSpace"},
                timeout=5,
            )
        except requests.RequestException:
            self.send_json(503, {"error": "Could not reach GitHub to verify that account"})
            return
        if response.status_code == 404:
            self.send_json(404, {"error": "GitHub account not found"})
            return
        if response.status_code != 200:
            self.send_json(503, {"error": "GitHub could not verify that account right now"})
            return

        profile = response.json()
        if not isinstance(profile.get("id"), int) or not isinstance(profile.get("login"), str):
            self.send_json(502, {"error": "GitHub returned an invalid account"})
            return
        authorized_user = {"id": str(profile["id"]), "login": profile["login"]}
        if authorized_user["id"] == user["id"]:
            self.send_json(409, {"error": "The event creator is already authorized"})
            return

        authorized_users = event.setdefault("authorizedUsers", [])
        if any(entry.get("id") == authorized_user["id"] for entry in authorized_users if isinstance(entry, dict)):
            self.send_json(409, {"error": "That account is already authorized"})
            return
        authorized_users.append(authorized_user)
        self.write_data(data)
        self.send_json(201, {"authorizedUsers": authorized_users})

    def remove_authorized_user(self, request, user):
        event_id = request.get("eventId")
        user_id = request.get("userId")
        if not isinstance(event_id, str) or not event_id:
            self.send_json(400, {"error": "Invalid event"})
            return
        if not isinstance(user_id, str) or not user_id:
            self.send_json(400, {"error": "Invalid GitHub user"})
            return

        data = self.read_data()
        event = self.find_event(data, event_id)
        if event is None:
            self.send_json(404, {"error": "Event not found"})
            return
        if not self.is_event_creator(event, user):
            self.send_json(403, {"error": "Only the event creator can manage authorized users"})
            return

        authorized_users = event.setdefault("authorizedUsers", [])
        updated_users = [entry for entry in authorized_users if not isinstance(entry, dict) or entry.get("id") != user_id]
        if len(updated_users) == len(authorized_users):
            self.send_json(404, {"error": "Authorized account not found"})
            return
        event["authorizedUsers"] = updated_users
        self.write_data(data)
        self.send_json(200, {"authorizedUsers": updated_users})

    def create_topic(self, request, data, event):
        name = request.get("name")
        description = request.get("description")
        contributors = request.get("contributors", [])
        languages = request.get("languages", [])

        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
            self.send_json(400, {"error": "A topic name of 1 to 160 characters is required"})
            return
        if not isinstance(description, str) or not description.strip() or len(description.strip()) > 4000:
            self.send_json(400, {"error": "A description of 1 to 4000 characters is required"})
            return
        if not self.valid_string_list(contributors, max_items=30, max_length=120):
            self.send_json(400, {"error": "Invalid contributor list"})
            return
        if not self.valid_string_list(languages, max_items=20, max_length=80):
            self.send_json(400, {"error": "Invalid language list"})
            return

        normalized_name = name.strip().casefold()
        topics = event.setdefault("topics", [])
        if any(topic.get("name", "").strip().casefold() == normalized_name for topic in topics):
            self.send_json(409, {"error": "A topic with that name already exists"})
            return

        topic = {
            "name": name.strip(),
            "desc": description.strip(),
            "contributers": self.clean_string_list(contributors),
            "languages": self.clean_string_list(languages),
            "likers": [],
            "likeCount": 0,
        }
        topics.append(topic)
        self.write_data(data)
        self.send_json(201, {"topic": topic})

    def create_location(self, request, data, event):
        """Validate and append a location with optional capacity and facilities."""
        name = request.get("name")
        description = request.get("description")
        capacity = request.get("capacity")
        facilities = request.get("facilities")

        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
            self.send_json(400, {"error": "A location name of 1 to 160 characters is required"})
            return
        if not isinstance(description, str) or not description.strip() or len(description.strip()) > 4000:
            self.send_json(400, {"error": "A description of 1 to 4000 characters is required"})
            return
        if not self.valid_string_list(facilities, max_items=40, max_length=120):
            self.send_json(400, {"error": "Invalid facilities list"})
            return
        if not self.valid_location_capacity(capacity):
            self.send_json(400, {"error": "Capacity must be a positive whole number"})
            return

        locations = event.setdefault("locations", [])
        normalized_name = name.strip().casefold()
        if any(location.get("name", "").strip().casefold() == normalized_name for location in locations):
            self.send_json(409, {"error": "A location with that name already exists"})
            return

        location = {
            "name": name.strip(),
            "desc": description.strip(),
            "facilities": self.clean_string_list(facilities),
        }
        if capacity is not None:
            location["capacity"] = capacity

        locations.append(location)
        self.write_data(data)
        self.send_json(201, {"location": location})

    def update_location(self, request, data, event):
        """Update a location and keep program references in sync after a rename."""
        item_name = request.get("itemName")
        name = request.get("name")
        description = request.get("description")
        capacity = request.get("capacity")
        facilities = request.get("facilities")

        if not isinstance(item_name, str) or not item_name.strip():
            self.send_json(400, {"error": "Invalid location name"})
            return
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 160:
            self.send_json(400, {"error": "A location name of 1 to 160 characters is required"})
            return
        if not isinstance(description, str) or not description.strip() or len(description.strip()) > 4000:
            self.send_json(400, {"error": "A description of 1 to 4000 characters is required"})
            return
        if not self.valid_string_list(facilities, max_items=40, max_length=120):
            self.send_json(400, {"error": "Invalid facilities list"})
            return
        if not self.valid_location_capacity(capacity):
            self.send_json(400, {"error": "Capacity must be a positive whole number"})
            return

        locations = event.get("locations", [])
        location_index = next(
            (index for index, location in enumerate(locations) if location.get("name") == item_name),
            None,
        )
        if location_index is None:
            self.send_json(404, {"error": "Location not found"})
            return

        normalized_name = name.strip().casefold()
        if any(
            index != location_index and location.get("name", "").strip().casefold() == normalized_name
            for index, location in enumerate(locations)
        ):
            self.send_json(409, {"error": "A location with that name already exists"})
            return

        previous_name = locations[location_index].get("name", "")
        updated_location = dict(locations[location_index])
        updated_location.update({
            "name": name.strip(),
            "desc": description.strip(),
            "facilities": self.clean_string_list(facilities),
        })
        if capacity is None:
            updated_location.pop("capacity", None)
        else:
            updated_location["capacity"] = capacity

        locations[location_index] = updated_location
        if previous_name != updated_location["name"]:
            for program_item in event.get("program", []):
                if program_item.get("location") == previous_name:
                    program_item["location"] = updated_location["name"]

        self.write_data(data)
        self.send_json(200, {"location": updated_location, "previousName": previous_name})

    @staticmethod
    def valid_location_capacity(capacity):
        """Allow an omitted capacity or a positive integer no greater than 100,000."""
        return capacity is None or (type(capacity) is int and 1 <= capacity <= 100000)

    @staticmethod
    def valid_string_list(values, max_items, max_length):
        return (
            isinstance(values, list)
            and len(values) <= max_items
            and all(isinstance(value, str) and len(value.strip()) <= max_length for value in values)
        )

    @staticmethod
    def clean_string_list(values):
        cleaned = []
        seen = set()
        for value in values:
            item = value.strip()
            key = item.casefold()
            if item and key not in seen:
                cleaned.append(item)
                seen.add(key)
        return cleaned

    @staticmethod
    def write_data(data):
        file_descriptor, temporary_path = tempfile.mkstemp(
            dir=ROOT,
            prefix=".program-",
            suffix=".tmp",
            text=True,
        )
        try:
            with os.fdopen(file_descriptor, "w", encoding="utf-8", newline="\n") as output:
                json.dump(data, output, ensure_ascii=False, indent=4)
                output.write("\n")
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary_path, DATA_FILE)
        except Exception:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
            raise


def main():
    parser = argparse.ArgumentParser(description="Serve OpenSpace and save likes to program.json")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ConniHTTPServer((args.host, args.port), ConniHandler)
    print(f"Serving OpenSpace at http://{args.host}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()