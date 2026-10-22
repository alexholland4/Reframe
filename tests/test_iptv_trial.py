"""Reject unreviewed IPTV bytes and package paths before any TV connection."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).absolute().parent.parent
sys.path.insert(0,str(ROOT/"scripts"))
spec=importlib.util.spec_from_file_location("iptv_deploy",ROOT/"scripts/deploy-iptv-trial.py")
deploy=importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


def tar(entries):
    stream=io.BytesIO()
    with tarfile.open(fileobj=stream,mode="w:gz") as archive:
        for name,data,link in entries:
            item=tarfile.TarInfo(name)
            if link:
                item.type=tarfile.SYMTYPE;item.linkname="/etc/passwd"
                archive.addfile(item)
            else:
                item.size=len(data);archive.addfile(item,io.BytesIO(data))
    return stream.getvalue()


def fixture(extra=None,hook=False,wrong_service=False):
    roots=deploy.ROOTS;app=deploy.APP
    content={roots[0]+"/appinfo.json":{"id":app,"version":deploy.VERSION,"type":"web"},
        roots[2]+"/packageinfo.json":{"id":app,"version":deploy.VERSION,"app":app,"services":[app+".service"]},
        roots[1]+"/services.json":{"id":app+".service","services":[{"name":"other.service" if wrong_service else app+".service"}]}}
    entries=[(name,json.dumps(data).encode(),False) for name,data in content.items()]
    if extra:entries.append(extra)
    control=[("control",("Package: "+app+"\nVersion: "+deploy.VERSION+"\n").encode(),False)]
    if hook:control.append(("postinst",b"unexpected hook",False))
    output=b"!<arch>\n"
    for name,data in [("debian-binary",b"2.0\n"),("control.tar.gz",tar(control)),("data.tar.gz",tar(entries))]:
        header=(name+"/").ljust(16)+"0".ljust(12)+"0".ljust(6)+"0".ljust(6)+"100644".ljust(8)+str(len(data)).ljust(10)+"`\n"
        output+=header.encode()+data+(b"\n" if len(data)%2 else b"")
    return output


class IptvPackageTests(unittest.TestCase):
    def inspect(self,data,reviewed=True):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"trial.ipk";path.write_bytes(data)
            if reviewed:
                with patch.object(deploy,"SHA256",hashlib.sha256(data).hexdigest()):return deploy.package_info(path)
            return deploy.package_info(path)
    def test_unreviewed_package_rejected(self):
        with self.assertRaises(ValueError):self.inspect(fixture(),reviewed=False)
    def test_owned_app_service_registration_accepted(self):
        _,files=self.inspect(fixture());self.assertEqual(len(files),3)
    def test_foreign_path_rejected(self):
        with self.assertRaises(ValueError):self.inspect(fixture(("etc/changed",b"bad",False)))
    def test_symlink_rejected(self):
        with self.assertRaises(ValueError):self.inspect(fixture((deploy.ROOTS[0]+"/link",b"",True)))
    def test_install_hook_rejected(self):
        with self.assertRaises(ValueError):self.inspect(fixture(hook=True))
    def test_other_service_registration_rejected(self):
        with self.assertRaises(ValueError):self.inspect(fixture(wrong_service=True))


class TrialToolBoundaries(unittest.TestCase):
    def test_inspector_rejects_other_apps_without_connecting(self):
        import tv_inspector
        with patch.object(tv_inspector,"ssh") as ssh:
            with self.assertRaises(ValueError):tv_inspector.commands("com.palm.app.settings",[{"method":"Runtime.evaluate"}])
            ssh.assert_not_called()
    def test_inspector_rejects_unlisted_commands_without_connecting(self):
        import tv_inspector
        with patch.object(tv_inspector,"ssh") as ssh:
            with self.assertRaises(ValueError):tv_inspector.commands("com.lennylxx.iptv",[{"method":"Browser.close"}])
            ssh.assert_not_called()
    def test_setup_rejects_unrelated_routes_without_connecting(self):
        import iptv_setup
        with patch.object(iptv_setup,"evaluate") as evaluate:
            with self.assertRaises(ValueError):iptv_setup.request("/uploads/../../etc/passwd")
            evaluate.assert_not_called()
    def test_capture_rejects_tracked_output_without_connecting(self):
        import capture_tv
        with patch.object(capture_tv,"luna") as luna:
            with self.assertRaises(ValueError):capture_tv.capture("com.lennylxx.iptv",ROOT/"docs/unwanted.png")
            luna.assert_not_called()


if __name__=="__main__":unittest.main()
