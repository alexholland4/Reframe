"""Journal the Developer Mode session transition; mutations require --execute."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
import tarfile
import time
from tv_connection import PROJECT, ssh, luna

BACKUP = PROJECT / "backups/devmode-session-transition"
ORIGINAL = PROJECT / "backups/protected-5ad48cec858021b059f8b054/files"
APP = "com.palmdts.devmode"
SERVICE = "/media/cryptofs/apps/usr/palm/services/" + APP + ".service"
spec = importlib.util.spec_from_file_location("root_startup", PROJECT / "scripts/manage-root-startup.py")
startup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup)
node = startup.node


def expected():
    paths = ["/etc/init/devmode.conf", SERVICE + "/start-devmode.sh", SERVICE + "/start-devmode.sig"]
    return {"markerSha256": hashlib.sha256((ORIGINAL / "var/luna/preferences/devmode_enabled").read_bytes()).hexdigest(),
            "originals": [{"path": p, "sha256": hashlib.sha256((ORIGINAL / p.lstrip("/")).read_bytes()).hexdigest()} for p in paths]}


def prepare():
    if BACKUP.exists():
        raise RuntimeError("Private transition backup already exists; inspect instead of replacing it")
    startup.verify_files()
    if luna("luna://org.webosbrew.hbchannel.service/checkRoot", {}).get("returnValue") is not True:
        raise RuntimeError("HBC root unavailable")
    result = luna("luna://org.webosbrew.hbchannel.service/exec", {"command": "id -u"})
    if result.get("stdoutString", "").strip() != "0":
        raise RuntimeError("HBC did not execute as actual root")
    evidence = json.loads((PROJECT / "docs/fingerprint-root-identity-5d8410c685742e1bbd7fd663.txt").read_text(encoding="utf-8"))
    identity = evidence["identity"]
    if (identity.get("uid") != 0 or identity.get("euid") != 0 or
            not identity.get("cleanup", {}).get("removedDirectory") or
            not any(e.get("transport") == "pinned-ssap" and e.get("id") == "com.webos.app.adoverlayex" for e in evidence["events"])):
        raise RuntimeError("Independent recovery proof incomplete")
    source = """const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const dirs=['usr/palm/applications/com.palmdts.devmode','usr/palm/services/com.palmdts.devmode.service','usr/palm/packages/com.palmdts.devmode'];
for(const p of dirs){const s=fs.lstatSync('/media/cryptofs/apps/'+p);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Unexpected LG package path');}
const archive=cp.execFileSync('/bin/tar',['-C','/media/cryptofs/apps','-czf','-',...dirs],{timeout:15000,maxBuffer:16777216});
console.log(JSON.stringify({uid:process.getuid(),bytes:archive.length,sha256:crypto.createHash('sha256').update(archive).digest('hex'),base64:archive.toString('base64')}));"""
    reply = node(source)
    data = base64.b64decode(reply.pop("base64"), validate=True)
    if reply["uid"] != 0 or len(data) != reply["bytes"] or hashlib.sha256(data).hexdigest() != reply["sha256"]:
        raise RuntimeError("Private archive identity/hash mismatch")
    prefixes = tuple("usr/palm/" + p for p in ["applications/" + APP, "services/" + APP + ".service", "packages/" + APP])
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        entries = archive.getmembers()
        if len(entries) > 256 or sum(e.size for e in entries) > 32 * 1024 * 1024:
            raise RuntimeError("Unexpected archive size")
        if any(e.name.startswith("/") or ".." in e.name.split("/") or not any(e.name == p or e.name.startswith(p + "/") for p in prefixes) for e in entries):
            raise RuntimeError("Unexpected archive path")
    BACKUP.mkdir(parents=True)
    (BACKUP / "lg-devmode-complete.tar.gz").write_bytes(data)
    (BACKUP / "manifest.json").write_text(json.dumps({**reply, "entries": len(entries), "originals": expected()}, indent=2), encoding="utf-8")
    print("Private LG app/service/package backup verified:", reply["bytes"], "bytes;", len(entries), "entries")


def marker(action):
    manifest = json.loads((BACKUP / "manifest.json").read_text(encoding="utf-8"))
    data = (BACKUP / "lg-devmode-complete.tar.gz").read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest["sha256"] or manifest["originals"] != expected():
        raise RuntimeError("Private original backup differs")
    source = (PROJECT / "scripts/root-probe/session-marker.cjs").read_text(encoding="utf-8")
    print(node(source + "\nconsole.log(JSON.stringify(marker(require('fs'),process," + json.dumps(expected()) + "," + json.dumps(action) + ")));"))


def state():
    return node("""const fs=require('fs');const marker=fs.lstatSync('/var/luna/preferences/devmode_enabled');
console.log(JSON.stringify({uid:process.getuid(),markerDirectory:marker.isDirectory()&&!marker.isSymbolicLink(),lgAppPresent:fs.existsSync('/media/cryptofs/apps/usr/palm/applications/com.palmdts.devmode/appinfo.json'),lgStartupPresent:fs.existsSync('/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/start-devmode.sh'),journal:fs.existsSync('/var/lib/reframe/devmode-transition/journal.json'),counters:fs.readdirSync('/var/luna/preferences').filter(n=>/^dc/.test(n))}));""")


def remove_app():
    before = state()
    if not before["markerDirectory"] or not before["journal"] or not before["lgAppPresent"]:
        raise RuntimeError("Expected converted marker/journal and installed LG app before native removal")
    startup.verify_files()
    print("Native remove accepted:", luna("luna://com.webos.appInstallService/remove", {"id": APP, "subscribe": False}))
    for _ in range(10):
        time.sleep(2)
        after = state()
        if not after["lgAppPresent"] and not after["lgStartupPresent"]:
            if not after["markerDirectory"]:
                raise RuntimeError("Session-independent marker lost; inspect before any reboot")
            print("LG app/startup absent; root marker preserved:", after)
            print("HBC root:", luna("luna://org.webosbrew.hbchannel.service/checkRoot", {}))
            return
    raise RuntimeError("Native removal not verified; inspect before any reboot")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "convert", "restore-marker", "remove-app", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action == "status":
        print(json.dumps(state(), indent=2))
    elif not args.execute:
        print("Prepared session transition:", args.action, "(no TV connection; --execute required)")
    else:
        {"prepare": prepare, "convert": lambda: marker("convert"), "restore-marker": lambda: marker("restore"), "remove-app": remove_app}[args.action]()


if __name__ == "__main__":
    main()
