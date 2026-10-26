"""Check native revision scope and reversible optional feature changes."""
import copy
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))


def module(name, relative):
    spec = importlib.util.spec_from_file_location(name, PROJECT / relative)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


patcher = module("direct_patch", "scripts/native-cover/patch-cover.py")
distractions = module("distractions", "scripts/manage-distractions.py")
presentation = module("presentation", "scripts/manage-cover-presentation.py")
preloads = module("preloads_direct", "scripts/manage-preloads.py")


class DirectStartTests(unittest.TestCase):
    def test_direct_patch_rejects_unknown_or_duplicate_native_structure(self):
        for source in ["unknown", '    color: "black"\n    color: "black"']:
            with self.assertRaises(ValueError):
                patcher.patch_direct(source)

    def test_presentation_actions_require_execute(self):
        for action in ["stage", "trial", "accept", "restore"]:
            with patch.object(sys, "argv", ["manage-cover-presentation.py", action]), patch.object(presentation, "ssh") as ssh, patch.object(presentation, "luna") as luna:
                presentation.main()
            ssh.assert_not_called()
            luna.assert_not_called()

    def test_home_preload_has_its_own_journal_and_preserves_app_preloads(self):
        targets, journal = preloads.PROFILES["home"]
        self.assertEqual(targets, ("com.webos.app.home",))
        self.assertNotEqual(journal, preloads.PROFILES["optional"][1])
        self.assertFalse(set(targets) & {"airplay", "amazon", "netflix", "youtube.leanback.v4"})

    def test_optional_preferences_restore_exact_values_and_preserve_updates(self):
        state = {c: {k: "on" for k in keys} for c, keys in distractions.TARGETS.items()}
        original = copy.deepcopy(state)
        requests = []

        def luna(uri, payload):
            category = payload["category"]
            self.assertIn(category, distractions.TARGETS)
            if uri.endswith("/getSystemSettings"):
                return {"settings": copy.deepcopy(state[category])}
            self.assertTrue(distractions.PLAN.exists())
            self.assertEqual(set(payload["settings"]), set(distractions.TARGETS[category]))
            state[category].update(payload["settings"])
            requests.append(payload)
            return {"returnValue": True}

        with tempfile.TemporaryDirectory() as folder, patch.object(distractions, "PLAN", Path(folder) / "journal.json"), patch.object(distractions, "luna", side_effect=luna):
            distractions.change()
            self.assertTrue(all(v == "off" for settings in state.values() for v in settings.values()))
            distractions.change(restore=True)
            self.assertEqual(state, original)
        self.assertEqual(len(requests), 6)

    def test_optional_preference_dry_run_never_connects(self):
        with patch.object(sys, "argv", ["manage-distractions.py", "apply"]), patch.object(distractions, "luna") as luna:
            distractions.main()
        luna.assert_not_called()


if __name__ == "__main__":
    unittest.main()
