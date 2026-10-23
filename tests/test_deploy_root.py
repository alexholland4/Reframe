"""Validate package identity and archive boundaries before root deployment."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).absolute().parent.parent
sys.path.insert(0, str(PROJECT / "scripts"))
spec = importlib.util.spec_from_file_location("deploy_root", PROJECT / "scripts/deploy-root.py")
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


def archive(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w:gz") as tar:
        for name, content, link in entries:
            item = tarfile.TarInfo(name)
            if link:
                item.type = tarfile.SYMTYPE
                item.linkname = "/etc/passwd"
                tar.addfile(item)
            else:
                item.size = len(content)
                tar.addfile(item, io.BytesIO(content))
    return out.getvalue()


def package(extra=None, wrong_id=False, hook=False):
    control = [("control", b"Package: com.reframe.home\nVersion: 0.2.0\n", False)]
    if hook:
        control.append(("postinst", b"unexpected hook", False))
    app = {"id": "other.app" if wrong_id else deploy.APP, "version": "0.2.0"}
    entries = [("usr/palm/applications/" + deploy.APP + "/appinfo.json", json.dumps(app).encode(), False)]
    if extra:
        entries.append(extra)
    out = b"!<arch>\n"
    for name, data in [("debian-binary", b"2.0\n"), ("control.tar.gz", archive(control)), ("data.tar.gz", archive(entries))]:
        header = (name + "/").ljust(16) + "0".ljust(12) + "0".ljust(6) + "0".ljust(6) + "100644".ljust(8) + str(len(data)).ljust(10) + "`\n"
        out += header.encode() + data + (b"\n" if len(data) % 2 else b"")
    return out


class PackageTests(unittest.TestCase):
    def inspect(self, data):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "test.ipk"
            path.write_bytes(data)
            return deploy.package_info(path)

    def test_valid_package_reports_version_and_exact_app_file_hashes(self):
        data, version, files = self.inspect(package())
        self.assertEqual(version, "0.2.0")
        self.assertEqual(set(files), {"appinfo.json"})
        self.assertEqual(len(files["appinfo.json"]["sha256"]), 64)

    def test_foreign_path_is_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(package(("etc/unexpected", b"bad", False)))

    def test_symbolic_link_is_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(package(("usr/palm/applications/com.reframe.home/link", b"", True)))

    def test_wrong_app_identity_is_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(package(wrong_id=True))

    def test_package_control_script_is_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(package(hook=True))

    def test_unconfigured_visibility_permission_never_closes_an_app(self):
        with patch.object(deploy, "node", return_value=False), patch.object(deploy, "luna") as call:
            deploy.refresh_startup_visibility()
        call.assert_not_called()

    def test_managed_permission_is_reapplied_before_closing_only_reframe(self):
        events = []
        def node(source):
            events.append("policy" if "const action=" in source else "check")
            return True
        def luna(uri, payload):
            events.append((uri, payload))
            return {"running": [{"id": "amazon"}, {"id": deploy.APP}]}
        with patch.object(deploy, "node", side_effect=node), patch.object(deploy, "luna", side_effect=luna):
            deploy.refresh_startup_visibility()
        self.assertEqual(events[:2], ["check", "policy"])
        self.assertEqual(events[-1], ("luna://com.webos.applicationManager/dev/closeByAppId",
                                    {"id": deploy.APP, "subscribe": False}))


if __name__ == "__main__":
    unittest.main()
