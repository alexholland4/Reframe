import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / 'scripts'))
spec = importlib.util.spec_from_file_location('early_cover', PROJECT / 'scripts/manage-early-cover.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class EarlyCoverTests(unittest.TestCase):
    def test_mutations_without_execute_never_connect(self):
        for action in ['install', 'refresh', 'trial', 'accept', 'disable']:
            with self.subTest(action=action), patch.object(sys, 'argv', ['manage-early-cover.py', action]), patch.object(manager, 'ssh') as ssh, patch.object(manager, 'luna') as luna:
                manager.main()
            ssh.assert_not_called()
            luna.assert_not_called()

    def test_existing_resource_trial_cannot_be_overwritten(self):
        with patch.object(manager, 'control', return_value={'registered': True, 'mounts': []}), patch.object(manager, 'luna') as luna, patch.object(manager, 'node') as node:
            with self.assertRaisesRegex(RuntimeError, 'already exists'):
                manager.trial()
        node.assert_not_called()
        luna.assert_not_called()

    def test_guard_cancellation_preserves_other_activity_callbacks(self):
        with patch.object(manager, 'luna', side_effect=[{'activities': [{'name': manager.ACTIVITY, 'activityId': 17}]}, {'activity': {'callback': {'method': 'luna://foreign/exec'}}}]) as luna:
            with self.assertRaisesRegex(RuntimeError, 'Foreign early-resource Activity'):
                manager.cancel_guard()
        self.assertEqual(luna.call_count, 2)
