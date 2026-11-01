import http.cookiejar
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
from unittest.mock import patch

from src import server


class LocalEventCreationTests(unittest.TestCase):
    def test_local_user_can_create_and_persist_event(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory) / "data"
            data_file = data_dir / "program.json"
            data_dir.mkdir()
            data_file.write_text('{"events": []}', encoding="utf-8")

            with (
                patch.object(server, "DATA_DIR", data_dir),
                patch.object(server, "DATA_FILE", data_file),
                patch.dict(os.environ, {"LOCAL_AUTH_BYPASS": "true", "RENDER": ""}),
            ):
                httpd = server.ConniHTTPServer(("127.0.0.1", 0), server.ConniHandler)
                worker = threading.Thread(target=httpd.serve_forever, daemon=True)
                worker.start()
                base_url = f"http://127.0.0.1:{httpd.server_port}"
                cookies = http.cookiejar.CookieJar()
                client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))

                try:
                    login_request = urllib.request.Request(
                        f"{base_url}/auth/local-login",
                        data=json.dumps({"name": "Local Tester"}).encode(),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with client.open(login_request) as response:
                        self.assertEqual(response.status, 204)

                    create_request = urllib.request.Request(
                        f"{base_url}/api/events",
                        data=json.dumps({"name": "New Local Event"}).encode(),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with client.open(create_request) as response:
                        self.assertEqual(response.status, 201)
                        created_event = json.loads(response.read())["event"]

                    self.assertEqual(created_event["name"], "New Local Event")
                    saved_data = json.loads(data_file.read_text(encoding="utf-8"))
                    self.assertEqual(saved_data["events"], [created_event])
                finally:
                    httpd.shutdown()
                    httpd.server_close()
                    worker.join()


if __name__ == "__main__":
    unittest.main()
