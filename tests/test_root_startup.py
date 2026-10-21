"""Regression checks for this TV's activity-query definition/state distinction."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location("startup_manager", PROJECT / "scripts/manage-root-startup.py")
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class ActivityTests(unittest.TestCase):
    def test_query_uses_brief_list_then_only_matching_saved_definition(self):
        item = {"activityId": 212, "name": manager.ACTIVITY}
        definition = {**item, "callback": {"method": "luna://org.webosbrew.hbchannel.service/autostart"}}
        replies = [{"returnValue": True, "activities": [{"activityId": 1, "name": "unrelated"}, item]},
                   {"returnValue": True, "activity": definition}]
        with patch.object(manager, "luna", side_effect=replies) as call:
            self.assertEqual(manager.activities(), [definition])
        self.assertFalse(call.call_args_list[0].args[1]["details"])
        self.assertFalse(call.call_args_list[1].args[1]["current"])
        self.assertEqual(call.call_args_list[1].args[1]["activityId"], 212)

    def test_remove_cancels_and_verifies_before_deleting_startup(self):
        events = []
        item = {"activityId": 212, "callback": {"method": "luna://org.webosbrew.hbchannel.service/autostart"}}
        with patch.object(manager, "verify_files", return_value={"files": []}), \
             patch.object(manager, "activities", side_effect=[[item], []]), \
             patch.object(manager, "luna", side_effect=lambda *args: events.append("cancel")), \
             patch.object(manager, "node", side_effect=lambda source: events.append("remove" if "unlinkSync" in source else "check-launcher")):
            manager.remove()
        self.assertEqual(events, ["check-launcher", "cancel", "remove"])

    def test_remove_preserves_startup_if_cancel_does_not_remove_activity(self):
        item = {"activityId": 212, "callback": {"method": "luna://org.webosbrew.hbchannel.service/autostart"}}
        with patch.object(manager, "verify_files", return_value={"files": []}), \
             patch.object(manager, "activities", side_effect=[[item], [item]]), \
             patch.object(manager, "luna"), patch.object(manager, "node") as node:
            with self.assertRaises(RuntimeError): manager.remove()
            node.assert_called_once()
            self.assertNotIn("unlinkSync", node.call_args.args[0])

    def test_remove_refuses_installed_launcher_before_cancelling_callback(self):
        with patch.object(manager, "verify_files", return_value={"files": []}), \
             patch.object(manager, "node", side_effect=RuntimeError("Remove launcher first")), \
             patch.object(manager, "activities") as activities:
            with self.assertRaises(RuntimeError): manager.remove()
            activities.assert_not_called()


if __name__ == "__main__":
    unittest.main()
