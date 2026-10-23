"""Guard presentation patches and prevent accidental native mutation without execute."""
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, PROJECT / path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


manager = module("native_manager", "scripts/manage-native-cover.py")
patcher = module("native_patch", "scripts/native-cover/patch-cover.py")


class NativeCoverTests(unittest.TestCase):
    def test_native_install_without_execute_never_connects(self):
        with patch.object(sys, "argv", ["manage-native-cover.py", "install"]), \
                patch.object(manager, "ssh") as ssh:
            manager.main()
        ssh.assert_not_called()

    def test_unknown_native_source_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "refusing patch"):
            patcher.patch("Unexpected firmware")

    def test_ambiguous_native_target_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "refusing patch"):
            patcher.patch('    color: "black"\n    color: "black"')

    def test_disabled_native_override_cannot_start_restart_trial(self):
        with patch.object(manager, "manage", return_value={"enabled": False}), \
                patch.object(manager, "node") as node:
            with self.assertRaisesRegex(RuntimeError, "disabled"):
                manager.trial()
        node.assert_not_called()


if __name__ == "__main__":
    unittest.main()
