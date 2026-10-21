"""Offline validation of protected backup extraction; never connects to the TV."""
import base64
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

PROJECT = Path(__file__).absolute().parent.parent
module_spec = importlib.util.spec_from_file_location("probe", PROJECT / "scripts/probe-root-identity.py")
probe = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(probe)
RUN_ID = "1234567890abcdef12345678"
SPEC = json.loads((probe.TEMPLATES / "snapshot-paths.json").read_text(encoding="utf-8"))


def original_report():
    data = b"original\x00\xff\n"
    paths = SPEC["files"] + SPEC["metadata"] + SPEC["virtual"]
    entries = [{"path": path, "exists": False, "error": "ENOENT"} for path in paths]
    entries[0] = {"path": paths[0], "exists": True, "type": "file", "contentsCaptured": True,
                  "bytes": len(data), "base64": base64.b64encode(data).decode("ascii"),
                  "sha256": hashlib.sha256(data).hexdigest()}
    return {"kind": "protected-snapshot", "runId": RUN_ID, "uid": 0, "euid": 0,
            "snapshot": {"schema": 1, "counterListing": [], "entries": entries, "totalBytes": len(data)}}


class SnapshotTests(unittest.TestCase):
    def test_original_bytes_and_manifest(self):
        with tempfile.TemporaryDirectory() as folder:
            target = probe.save_snapshot(original_report(), RUN_ID, Path(folder))
            self.assertEqual((target / "files/var/luna/preferences/devmode_enabled").read_bytes(), b"original\x00\xff\n")
            manifest = json.loads((target / "manifest.json").read_text(encoding="utf-8"))
            self.assertNotIn("base64", manifest["entries"][0])
            self.assertEqual(manifest["entries"][1]["error"], "ENOENT")

    def test_invalid_reports_are_rejected_before_any_backup_is_written(self):
        cases = []
        report = original_report(); report["snapshot"]["entries"][0]["path"] = "/../../outside"; cases.append(report)
        report = original_report(); report["snapshot"]["entries"][0]["sha256"] = "0" * 64; cases.append(report)
        report = original_report(); report["snapshot"]["entries"][0]["base64"] = "!!!"; cases.append(report)
        report = original_report(); report["snapshot"]["entries"][0]["bytes"] = 999; cases.append(report)
        report = original_report(); report["snapshot"]["entries"][0]["contentsCaptured"] = False; cases.append(report)
        report = original_report(); report["snapshot"]["entries"][1]["error"] = "EACCES"; cases.append(report)
        report = original_report(); report["snapshot"]["entries"].pop(); cases.append(report)
        report = original_report(); report["snapshot"]["entries"][1] = copy.deepcopy(report["snapshot"]["entries"][0]); cases.append(report)
        report = original_report(); report["snapshot"]["totalBytes"] = 0; cases.append(report)
        report = original_report(); report["snapshot"]["counterListing"] = ["dc/../../bad"]; cases.append(report)
        report = original_report(); report["snapshot"]["counterListing"] = ["dc:bad"]; cases.append(report)
        report = original_report(); report["uid"] = 6349; cases.append(report)
        for index, report in enumerate(cases):
            with self.subTest(case=index), tempfile.TemporaryDirectory() as folder:
                with self.assertRaises(ValueError):
                    probe.save_snapshot(report, RUN_ID, Path(folder))
                self.assertEqual(list(Path(folder).iterdir()), [])

    def test_render_separates_identity_and_snapshot_modes(self):
        for enabled in (False, True):
            files, _ = probe.render(RUN_ID, "http://127.0.0.1:0/" + RUN_ID + "/", "com.webos.app.adoverlayex", enabled)
            source = files["main.js"].decode("utf-8")
            self.assertNotIn("__SNAPSHOT", source)
            self.assertEqual("function captureProtectedState" in source, enabled)
            self.assertEqual("/proc/mounts" in source, enabled)


if __name__ == "__main__":
    unittest.main()
