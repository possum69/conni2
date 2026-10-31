# OpenSpace

A small OpenSpace program and topic browser. It is a static HTML/CSS/JavaScript interface served by a Python standard-library HTTP server, with editable data stored in `program.json`.

## Run locally

Python 3 is required; no third-party packages are needed.

On Windows:

```powershell
py server.py
```

On other systems, use:

```sh
python3 server.py
```

Open <http://127.0.0.1:8000/>. The default host and port can be changed with `--host` and `--port`, for example:

```sh
python3 server.py --host 0.0.0.0 --port 8080
```

Stop the server with `Ctrl+C`.

## Deploy to Render

This repository includes a Render Blueprint in `render.yaml`. In Render, create a new Blueprint instance from the repository and accept the `openspace` web service. Render installs the (empty) `requirements.txt` and starts the server on its assigned port.

The default Blueprint uses Render's free plan. Its filesystem is ephemeral, so changes saved to `program.json` may be lost when the service restarts or is redeployed. For persistent event data, use a paid Render instance with a persistent disk and configure the application data file to live on that disk before deploying.

## Multi-user use

For a small event with roughly 250 users, run one server process on a machine reachable by the attendees. To accept connections from the local network, start it with `--host 0.0.0.0` and share the machine's network address, for example `http://192.168.1.20:8000/`.

The server runs up to 64 request workers and admits up to 256 additional queued requests. Data-changing requests are serialized so simultaneous likes, edits, and creates cannot overwrite one another in `program.json`. This lightweight JSON-backed setup assumes one server process and a trusted network; it has no user authentication and should not be exposed directly to the public internet. Event management and item edit/delete controls are not access-controlled; item controls are only hidden in the browser when the entered name does not match an item's contributor. For multiple server instances or sustained high write volume, use a transactional database and an authenticated production web server.

## Features

- Enter your name and favorite language, then choose an existing event or create one; manage events by renaming or deleting them.
- Keep each event's locations, scheduled program, and topic ideas separate.
- Browse the program in list or calendar view; filter by language, likes, contributions, or search terms and see the matching item count.
- Browse and create topics, edit item details, and schedule a topic in the program; the topic view shows the count of matching items.
- Language, item-type, and likes filters default to All, and topics default to date order. Entering a name does not change the selected likes filter.
- Create and edit locations, including descriptions, capacity, and facilities. Location capacity appears in the scheduling dropdown; renaming a location updates program items assigned to it.
- Like items by entering a name. The name and selected page language are stored in browser local storage.
- Choose from the supported page languages using the language selector.

## Data

After its first load, `program.json` contains an `events` array. Each event has its own:

- `program`: scheduled items, including location, date, start/end time, contributors, languages, and likes.
- `topics`: unscheduled topic ideas, with descriptions, contributors, languages, and likes.
- `locations`: locations with descriptions and optional capacity and facilities.

Changes made in the interface are written back to `program.json`. New events start with their own empty program, topics, and locations. Keep a backup before manually editing or replacing this file.

## API

The server exposes these JSON endpoints for the interface:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/events` | List events. |
| `GET` | `/api/event?eventId=...` | Load an event and its program, topics, and locations. |
| `POST` | `/api/events` | Create an empty event. |
| `PUT` | `/api/events` | Rename an event. |
| `DELETE` | `/api/events` | Delete an event and its data. |
| `POST` | `/api/like` | Add or remove a user's like on a program item or topic. |
| `POST` | `/api/topics` | Create a topic. |
| `PUT` | `/api/items` | Edit a program item or topic, or move a topic into or out of the program. |
| `DELETE` | `/api/items` | Delete a program item or topic. |
| `POST` | `/api/locations` | Create a location. |
| `PUT` | `/api/locations` | Edit a location and update program references when it is renamed. |

All program, topic, and location API requests accept an `eventId` query parameter to select the event whose data they change. Event names must be unique (case-insensitively); event contents are kept separate.

The server binds to localhost by default. Binding to another host may expose the app and its writable data file to other machines on the network.
