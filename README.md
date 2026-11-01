# OpenSpace

A small OpenSpace program and topic browser. The HTML/CSS/JavaScript interface and Python HTTP server live in `src/`; editable event data lives in `data/program.json`.

## Run locally

Python 3 is required. Install the runtime dependencies before starting the server:

On Windows:

```powershell
py -m pip install -r requirements.txt
$env:LOCAL_AUTH_BYPASS = "true"
py src/server.py
```

On other systems, use:

```sh
python3 -m pip install -r requirements.txt
LOCAL_AUTH_BYPASS=true python3 src/server.py
```

Open <http://127.0.0.1:8000/>. The default host and port can be changed with `--host` and `--port`, for example:

```sh
python3 src/server.py --host 0.0.0.0 --port 8080
```

Stop the server with `Ctrl+C`.

Run the test suite with `py -m unittest discover -s tests` on Windows or `python3 -m unittest discover -s tests` elsewhere.

### Browser tests with Robot Framework

Install the browser-test dependencies with `py -m pip install -r requirements-test.txt`, then start the app in another PowerShell window with local bypass enabled:

```powershell
$env:LOCAL_AUTH_BYPASS = "true"
py src/server.py
```

With Microsoft Edge installed, run the end-to-end tests from the repository root:

```powershell
py -m robot --variable BASE_URL:http://127.0.0.1:8000/ --outputdir robot-results tests/robot
```

The suite covers local sign-in, event creation/rename/deletion, location creation/editing, topic creation/editing/deletion as both contributors, scheduling and rescheduling, and the available program/topic filters and views. It creates a uniquely named event and deletes it when the test succeeds. If a test fails before cleanup, remove its `RF Event ...` event in the UI. Topics use list cards; the calendar view is available for program items only.

`LOCAL_AUTH_BYPASS=true` signs local loopback requests in as a development user without GitHub. On first visit, enter a name; it is saved in a local-only cookie and used for likes. Use **Change local name** to update it. The bypass is ignored on Render and for non-loopback clients. Events created in this mode use the `local-development` creator ID; assign the real GitHub creator ID before moving those events to production.

## GitHub OAuth

Create a GitHub OAuth App from **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**. Set its homepage to `https://openspace4you.onrender.com` and its authorization callback URL to:

```text
https://openspace4you.onrender.com/auth/callback
```

Do not include `:8080` in the callback URL. Render exposes the service on standard HTTPS externally and uses `$PORT` internally.

In the Render service's **Environment** settings, set:

- `GITHUB_CLIENT_ID`: the OAuth App client ID.
- `GITHUB_CLIENT_SECRET`: the client secret from GitHub.
- `GITHUB_REDIRECT_URI`: `https://openspace4you.onrender.com/auth/callback`.
- `SESSION_SECRET`: a private random value of at least 32 characters. Generate one with `py -c "import secrets; print(secrets.token_urlsafe(48))"` and keep it secret.

Save the variables and redeploy. Keep the GitHub client secret and session secret only in Render's environment settings, never in the repository. To test real GitHub OAuth locally instead of using the development bypass, set the same variables but use `http://127.0.0.1:8000/auth/callback` as the redirect URI and register that exact URL in the local GitHub OAuth App configuration.

## Deploy to Render

This repository includes a Render Blueprint in `render.yaml`. In Render, create a new Blueprint instance from the repository and accept the `openspace` web service. Render installs dependencies from `requirements.txt` and starts `src/server.py` on its assigned port.

The default Blueprint uses Render's free plan. Its filesystem is ephemeral, so changes saved to `data/program.json` may be lost when the service restarts or is redeployed. For persistent event data, use a paid Render instance with a persistent disk and configure the application data file to live on that disk before deploying.

## Multi-user use

For a small event with roughly 250 users, run one server process on a machine reachable by the attendees. To accept connections from the local network, start it with `--host 0.0.0.0` and share the machine's network address, for example `http://192.168.1.20:8000/`.

The server runs up to 64 request workers and admits up to 256 additional queued requests. Data-changing requests are serialized so simultaneous likes, edits, and creates cannot overwrite one another in `data/program.json`. API requests require a GitHub session, and the JSON data file is not exposed as a static file. Users can only list, load, or change events for which they are the creator or have been authorized by the creator. Event rename/delete and authorized-user management are checked server-side against the creator's stable GitHub user ID. Any GitHub account can sign in, but it cannot access an event until authorized. Item edit/delete is not restricted server-side to listed contributors; any authorized event member can change its items. This JSON-backed setup assumes one server process; for multiple instances or sustained high write volume, use a transactional database.

## Features

- Sign in with GitHub, then choose an event you can access or create one. The creator can grant or revoke access for other GitHub accounts, and only the creator can rename or delete the event.
- Assign contributors from the event creator and authorized accounts; the server rejects new contributor names outside that list.
- Keep each event's locations, scheduled program, and topic ideas separate.
- Browse the program in list or calendar view; filter by language, likes, contributions, or search terms and see the matching item count.
- Browse and create topics, edit item details, and schedule a topic in the program; the topic view shows the count of matching items.
- Language, item-type, and likes filters default to All, and topics default to date order. Entering a name does not change the selected likes filter.
- Create and edit locations, including descriptions, capacity, and facilities. Location capacity appears in the scheduling dropdown; renaming a location updates program items assigned to it.
- Like items using the signed-in GitHub login. The selected page language is stored in browser local storage.
- Choose from the supported page languages using the language selector.

## Data

`data/program.json` contains an `events` array. Each newly created event records `creatorId` (the creator's GitHub user ID), `creatorLogin`, and an `authorizedUsers` array containing GitHub login strings or `{ "id": "...", "login": "..." }` accounts. The creator has access implicitly. New grants store the login and match it against the login verified by OAuth; numeric IDs are preferred when already present. Each event also has its own:

- `program`: scheduled items, including location, date, start/end time, contributors, languages, and likes.
- `topics`: unscheduled topic ideas, with descriptions, contributors, languages, and likes.
- `locations`: locations with descriptions and optional capacity and facilities.

Changes made in the interface are written back to `data/program.json`. New events start with their own empty program, topics, locations, and authorization list. For legacy events, set `creatorLogin` to the creator's exact GitHub login if there is no numeric `creatorId`; authorized entries may be login strings or objects with a `login` when importing older lists. Numeric GitHub IDs remain preferred and are used for entries created through the interface. Keep a backup before manually editing or replacing this file.

## API

The server exposes these JSON endpoints for the interface:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/auth/login` | Start GitHub OAuth sign-in. |
| `GET` | `/auth/callback` | Complete GitHub OAuth sign-in. |
| `POST` | `/auth/logout` | Clear the current session. |
| `GET` | `/api/me` | Return the signed-in GitHub account. |
| `GET` | `/api/events` | List events for a signed-in user. |
| `GET` | `/api/event?eventId=...` | Load an event and its program, topics, and locations. |
| `POST` | `/api/events` | Create an empty event owned by the signed-in account. |
| `POST` | `/api/events/authorized-users` | Resolve a GitHub login and grant it access to an event (creator only). |
| `DELETE` | `/api/events/authorized-users` | Revoke an authorized GitHub account (creator only). |
| `PUT` | `/api/events` | Rename an event when the session user is its creator. |
| `DELETE` | `/api/events` | Delete an event and its data when the session user is its creator. |
| `POST` | `/api/like` | Add or remove a user's like on a program item or topic. |
| `POST` | `/api/topics` | Create a topic. |
| `PUT` | `/api/items` | Edit a program item or topic, or move a topic into or out of the program. |
| `DELETE` | `/api/items` | Delete a program item or topic. |
| `POST` | `/api/locations` | Create a location. |
| `PUT` | `/api/locations` | Edit a location and update program references when it is renamed. |

All API endpoints require a valid GitHub session. `/api/events` only lists accessible events; direct event reads and writes also check access server-side. The creator can enter a GitHub login in the event chooser; it is matched against the login verified during OAuth, without a separate GitHub API lookup. For legacy data, the server also matches explicit `creatorLogin` and login-only authorized entries. Program, topic, and location requests accept an `eventId` query parameter to select which accessible event they change. Event names must be unique (case-insensitively); event contents are kept separate.

The server binds to localhost by default. Binding to another host may expose the app and its writable data file to other machines on the network.
