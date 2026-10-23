"""Native-startup mutations must stay scoped and preserve recovery on failure."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch, Mock

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location("direct_startup", PROJECT / "scripts/manage-direct-startup.py")
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class DirectStartupTests(unittest.TestCase):
    def plan(self, attempted=None):
        return {"before": {"homeAutoLaunch": "on", "defaultApps": {}, "inputs": [],
                           "launcher": {"enabled": True}}, "attempted": attempted or [], "state": "captured"}

    def test_mutating_command_without_execute_never_connects(self):
        with patch.object(sys, "argv", ["manage-direct-startup.py", "home"]), \
                patch.object(manager, "luna") as luna, patch.object(manager, "ssh") as ssh:
            manager.main()
        luna.assert_not_called()
        ssh.assert_not_called()

    def test_input_is_verified_before_changing_startup_preference(self):
        with patch.object(manager, "load", return_value=self.plan()), \
                patch.object(manager, "save"), patch.object(manager, "inputs", return_value=[]), \
                patch.object(manager, "luna", return_value={"returnValue": True}) as luna:
            with self.assertRaisesRegex(RuntimeError, "not registered"):
                manager.input_startup()
        self.assertEqual(luna.call_count, 1)
        self.assertTrue(luna.call_args.args[0].endswith("addDevice"))
        self.assertEqual(luna.call_args.args[1]["appId"], manager.APP)

    def test_home_mapping_refused_while_old_helper_runs(self):
        helper = Mock()
        helper.status.return_value = {"running": True}
        with patch.object(manager, "load", return_value=self.plan(["helper"])), \
                patch.object(manager, "launcher", return_value=helper), \
                patch.object(manager, "luna") as luna:
            with self.assertRaises(RuntimeError):
                manager.map_home()
        luna.assert_not_called()

    def test_restore_only_removes_reframe_input(self):
        devices = [{"appId": "com.webos.app.hdmi2"}, {"appId": manager.APP}]
        with patch.object(manager, "load", return_value=self.plan(["input"])), \
                patch.object(manager, "save"), patch.object(manager, "inputs", side_effect=[devices, devices[:1]]), \
                patch.object(manager, "luna") as luna:
            manager.restore()
        luna.assert_called_once_with(manager.EIM + "deleteDevice", {"appId": manager.APP})

    def test_restore_stops_if_home_was_changed_by_someone_else(self):
        with patch.object(manager, "load", return_value=self.plan(["home", "input"])), \
                patch.object(manager, "general", return_value={"defaultApps": {"home": "another.launcher"}}), \
                patch.object(manager, "luna") as luna:
            with self.assertRaisesRegex(RuntimeError, "Unexpected Home"):
                manager.restore()
        luna.assert_not_called()


if __name__ == "__main__":
    unittest.main()
