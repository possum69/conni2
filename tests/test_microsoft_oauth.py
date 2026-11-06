import http.cookiejar
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from http.cookies import SimpleCookie
from unittest.mock import patch

from src import server


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class MicrosoftOAuthTests(unittest.TestCase):
    def test_microsoft_oauth_round_trip_creates_provider_session(self):
        class ProfileResponse:
            def raise_for_status(self):
                pass

            def json(self):
                return {
                    "id": "microsoft-object-id",
                    "displayName": "Microsoft Tester",
                    "mail": "tester@example.com",
                    "userPrincipalName": "tester@example.com",
                }

        class FakeOAuthSession:
            code_verifiers = []

            def __init__(self, *args, **kwargs):
                pass

            def create_authorization_url(self, url, state, code_verifier):
                self.code_verifiers.append(code_verifier)
                return f"{url}?{urllib.parse.urlencode({'state': state})}", {}

            def fetch_token(self, url, code, code_verifier):
                if code != "test-code" or code_verifier not in self.code_verifiers:
                    raise AssertionError("OAuth code exchange was not supplied")

            def get(self, url):
                self.profile_url = url
                return ProfileResponse()

        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory) / "data"
            data_file = data_dir / "program.json"
            data_dir.mkdir()
            data_file.write_text('{"events": []}', encoding="utf-8")
            environment = {
                "MICROSOFT_CLIENT_ID": "test-client",
                "MICROSOFT_CLIENT_SECRET": "test-secret",
                "MICROSOFT_REDIRECT_URI": "http://127.0.0.1/auth/microsoft/callback",
                "SESSION_SECRET": "test-session-secret-with-at-least-32-characters",
                "RENDER": "",
            }
            with (
                patch.object(server, "DATA_DIR", data_dir),
                patch.object(server, "DATA_FILE", data_file),
                patch.dict(os.environ, environment, clear=True),
                patch.object(server, "OAuth2Session", FakeOAuthSession),
            ):
                httpd = server.ConniHTTPServer(("127.0.0.1", 0), server.ConniHandler)
                worker = threading.Thread(target=httpd.serve_forever, daemon=True)
                worker.start()
                base_url = f"http://127.0.0.1:{httpd.server_port}"
                cookies = http.cookiejar.CookieJar()
                client = urllib.request.build_opener(
                    urllib.request.HTTPCookieProcessor(cookies),
                    NoRedirectHandler(),
                )
                try:
                    with self.assertRaises(urllib.error.HTTPError) as login_response:
                        client.open(f"{base_url}/auth/microsoft/login")
                    self.assertEqual(login_response.exception.code, 303)
                    authorization_url = login_response.exception.headers["Location"]
                    state = urllib.parse.parse_qs(urllib.parse.urlparse(authorization_url).query)["state"][0]
                    state_cookie = SimpleCookie(
                        login_response.exception.headers.get_all("Set-Cookie")[0]
                    )["conni2_microsoft_state"].value
                    login_response.exception.close()

                    callback_url = (
                        f"{base_url}/auth/microsoft/callback?"
                        f"{urllib.parse.urlencode({'state': state, 'code': 'test-code'})}"
                    )
                    callback_request = urllib.request.Request(
                        callback_url,
                        headers={"Cookie": f"conni2_microsoft_state={state_cookie}"},
                    )
                    with self.assertRaises(urllib.error.HTTPError) as callback_response:
                        client.open(callback_request)
                    self.assertEqual(callback_response.exception.code, 303)
                    session_cookie = SimpleCookie(
                        callback_response.exception.headers.get_all("Set-Cookie")[0]
                    )["conni2_session"].value
                    callback_response.exception.close()

                    me_request = urllib.request.Request(
                        f"{base_url}/api/me",
                        headers={"Cookie": f"conni2_session={session_cookie}"},
                    )
                    with client.open(me_request) as response:
                        user = json.loads(response.read())["user"]
                    self.assertEqual(user, {
                        "id": "microsoft:microsoft-object-id",
                        "login": "tester@example.com",
                        "provider": "microsoft",
                    })

                    invalid_callback_url = (
                        f"{base_url}/auth/microsoft/callback?"
                        f"{urllib.parse.urlencode({'state': 'invalid-state', 'code': 'test-code'})}"
                    )
                    invalid_callback_request = urllib.request.Request(
                        invalid_callback_url,
                        headers={"Cookie": f"conni2_microsoft_state={state_cookie}"},
                    )
                    with self.assertRaises(urllib.error.HTTPError) as invalid_response:
                        client.open(invalid_callback_request)
                    self.assertEqual(invalid_response.exception.code, 400)
                    invalid_response.exception.close()
                finally:
                    httpd.shutdown()
                    httpd.server_close()
                    worker.join()

    def test_event_access_matches_microsoft_email_only_for_microsoft_sessions(self):
        event = {
            "id": "event-1",
            "creatorId": "123",
            "creatorLogin": "organizer",
            "authorizedUsers": [{"login": "member@example.com", "provider": "microsoft"}],
        }
        microsoft_user = {
            "id": "microsoft:object-id",
            "login": "member@example.com",
            "provider": "microsoft",
        }
        github_user = {"id": "456", "login": "member@example.com", "provider": "github"}

        self.assertTrue(server.ConniHandler.can_access_event(event, microsoft_user))
        self.assertFalse(server.ConniHandler.can_access_event(event, github_user))
        cross_provider_id = {
            "id": microsoft_user["id"],
            "login": "another-account",
            "provider": "github",
        }
        event["authorizedUsers"] = [cross_provider_id]
        self.assertFalse(server.ConniHandler.can_access_event(event, microsoft_user))

    def test_microsoft_oauth_requires_all_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(server.ConniHandler.microsoft_oauth_configuration())


if __name__ == "__main__":
    unittest.main()
