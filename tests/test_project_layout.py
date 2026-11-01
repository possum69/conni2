import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from src import server


class ProjectLayoutTests(unittest.TestCase):
    def test_application_files_are_under_src(self):
        self.assertEqual(server.ROOT.name, "src")
        self.assertTrue((server.ROOT / "index.html").is_file())

    def test_event_data_is_under_data(self):
        self.assertEqual(server.DATA_DIR.name, "data")
        self.assertEqual(server.DATA_FILE, server.DATA_DIR / "program.json")
        self.assertTrue(server.DATA_FILE.is_file())
        self.assertNotEqual(server.DATA_FILE.parent, server.ROOT)

    def test_event_data_is_valid_json(self):
        content = json.loads(server.DATA_FILE.read_text(encoding="utf-8"))
        self.assertIsInstance(content.get("events"), list)

    def test_write_data_creates_missing_data_directory(self):
        with TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory) / "data"
            data_file = data_dir / "program.json"
            with patch.object(server, "DATA_DIR", data_dir), patch.object(server, "DATA_FILE", data_file):
                server.ConniHandler.write_data({"events": []})
            self.assertEqual(json.loads(data_file.read_text(encoding="utf-8")), {"events": []})


if __name__ == "__main__":
    unittest.main()
