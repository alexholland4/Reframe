"""Verify optional preload scope, preserved foreign settings and journaled undo."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location("manage_preloads", PROJECT / "scripts/manage-preloads.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreloadTests(unittest.TestCase):
    def test_apply_and_restore_preserve_other_apps_and_foreign_changes(self):
        config = {"version": 3, "allowedApps": {app: True for app in module.TARGETS},
                  "setting": {"interval": 5}}
        config["allowedApps"]["airplay"] = True
        policy = {app: {"id": app, "isEnabled": True, "preloadMode": "partial"} for app in module.TARGETS}
        requests = []

        def read():
            return {"base64": base64.b64encode(json.dumps(config).encode()).decode(), "mode": 420}, copy.deepcopy(config)

        def write(_snap, data):
            config.clear()
            config.update(copy.deepcopy(data))

        def luna(uri, data):
            self.assertEqual(uri, "luna://com.webos.service.preloadmanager/setPreloadPolicy")
            app = data["application"]
            self.assertIn(app["id"], module.TARGETS)
            self.assertEqual(set(app), {"id", "isEnabled"})
            # Before even the first runtime mutation the undo journal must exist.
            self.assertTrue(module.PLAN.exists())
            requests.append(copy.deepcopy(data))
            policy[app["id"]]["isEnabled"] = app["isEnabled"]
            return {"returnValue": True}

        with tempfile.TemporaryDirectory() as folder, \
                patch.object(module, "PLAN", Path(folder) / "current.json"), \
                patch.object(module, "config_read", side_effect=read), \
                patch.object(module, "config_write", side_effect=write), \
                patch.object(module, "policy_read", side_effect=lambda: copy.deepcopy(policy)), \
                patch.object(module, "luna", side_effect=luna):
            module.change()
            self.assertTrue(all(config["allowedApps"][app] is False for app in module.TARGETS))
            self.assertTrue(config["allowedApps"]["airplay"])
            config["allowedApps"]["new.foreign.app"] = False
            config["setting"]["interval"] = 7
            module.change(restore=True)
            self.assertTrue(all(config["allowedApps"][app] is True for app in module.TARGETS))
            self.assertFalse(config["allowedApps"]["new.foreign.app"])
            self.assertEqual(config["setting"]["interval"], 7)
        self.assertEqual(len(requests), 6)

    def test_wrong_journal_is_refused(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(module, "PLAN", Path(folder) / "current.json"):
            module.PLAN.write_text(json.dumps({"schema": 1, "host": "foreign", "purpose": "reframe-optional-preloads"}))
            with self.assertRaises(ValueError):
                module.load()

    def test_dry_run_has_no_tv_connection(self):
        with patch.object(sys, "argv", ["manage-preloads.py", "apply"]), \
                patch.object(module, "config_read") as read, patch.object(module, "luna") as luna:
            module.main()
        read.assert_not_called()
        luna.assert_not_called()


if __name__ == "__main__":
    unittest.main()
