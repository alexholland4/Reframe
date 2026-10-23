import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location("notifications", PROJECT / "scripts/manage-notifications.py")
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class NotificationTests(unittest.TestCase):
    def test_notification_apply_without_execute_never_connects(self):
        with patch.object(sys, "argv", ["manage-notifications.py", "apply"]), \
                patch.object(manager, "luna") as call:
            manager.main()
        call.assert_not_called()

    def test_only_firmware_and_alexa_flags_change_and_originals_restore(self):
        state = {"support": {"softwareUpdateEnable": "true", "automaticUpdate": "off"},
                 "voiceframework": {"amazonLongDistanceGuided": False},
                 "option": {"appUpdateMode": "manual"}}
        calls = []
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(manager, "PLAN", Path(directory) / "current.json"):
            def luna(uri, payload):
                category = payload["category"]
                self.assertTrue(uri.endswith("/setSystemSettings"))
                journal = json.loads(manager.PLAN.read_text())
                self.assertIn(category, journal["attempted"])
                self.assertEqual(set(payload["settings"]), set(manager.TARGETS[category]))
                calls.append((category, payload["settings"]))
                state[category].update(payload["settings"])
                return {"returnValue": True}
            with patch.object(manager, "read", side_effect=lambda c, keys: {k: state[c][k] for k in keys}), \
                    patch.object(manager, "luna", side_effect=luna):
                manager.apply()
                self.assertEqual(len(calls), 2)
                self.assertEqual(state["option"], {"appUpdateMode": "manual"})
                self.assertEqual(state["support"]["automaticUpdate"], "off")
                manager.restore()
            self.assertEqual(state["support"]["softwareUpdateEnable"], "true")
            self.assertFalse(state["voiceframework"]["amazonLongDistanceGuided"])
            self.assertEqual(state["option"]["appUpdateMode"], "manual")

    def test_unexpected_snapshot_keys_cannot_be_restored(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(manager, "PLAN", Path(directory) / "current.json"), \
                patch.object(manager, "luna") as call:
            manager.save({"schema": 1, "host": manager.HOST, "purpose": "reframe-target-notifications",
                          "before": {"support": {"softwareUpdateEnable": "true", "automaticUpdate": "on"},
                                     "voiceframework": {"amazonLongDistanceGuided": False}}})
            with self.assertRaises(ValueError):
                manager.restore()
        call.assert_not_called()


if __name__ == "__main__":
    unittest.main()
