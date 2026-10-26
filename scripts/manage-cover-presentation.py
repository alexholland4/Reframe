"""Stage/guard a direct-to-launcher revision; keep hosts and original undo intact."""
import argparse
import base64
import hashlib
import json
import secrets
from pathlib import Path
from tv_connection import PROJECT, ssh, luna

BASE = "/var/lib/reframe/early-cover"
PLAN = "/var/lib/reframe/early-cover-plan.json"
MAIN = BASE + "/version/usr/lib/qml/CoverUI/UserInterfaceLayer/Containers/MainView.qml"
IMAGE = BASE + "/version/usr/palm/data/images/com.reframe.nativecover/data.img"
LOCAL = PROJECT / "backups/early-cover/direct-revision.json"
ACTIVITY = "com.reframe.directcover.trial"


def node(source, timeout=40):
    result = ssh("/usr/bin/node -", input=source, timeout=timeout)
    result.check_returncode()
    return json.loads(result.stdout)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def stage(build):
    if LOCAL.exists():
        raise ValueError("Preserve the existing revision journal")
    manifest = json.loads((build / "manifest.json").read_text())
    if manifest.get("presentation") != "direct" or len(manifest.get("files", {})) != 58:
        raise ValueError("Expected the direct presentation build")
    observed = node(r"""const fs=require('fs'),crypto=require('crypto');
const api=require('/var/lib/reframe/early-cover/EarlyResource.cjs').create(fs,require('child_process'),crypto,process),s=api.status();
if(!s.active||s.mounts.length!==3||s.mounts.some(m=>!m.owned||!m.readonly))throw Error('Existing resource unhealthy');
const plan=fs.readFileSync('/var/lib/reframe/early-cover-plan.json');
console.log(JSON.stringify({plan:plan.toString('base64'),files:JSON.parse(plan).files.map(f=>({...f,base64:fs.readFileSync(f.path).toString('base64')}))}));""")
    before = base64.b64decode(observed["plan"])
    after = json.loads(before)
    original = {f["path"]: f for f in observed["files"]}
    changed = {}
    for name, sha in manifest["files"].items():
        if name.startswith("/") or ".." in name.split("/"):
            raise ValueError("Unexpected build path")
        data = (build / "payload" / name).read_bytes()
        target = BASE + "/version/" + name
        if digest(data) != sha or target not in original:
            raise ValueError("Build inventory changed")
        if sha != original[target]["sha256"]:
            changed[target] = data
    image = (build / "data.img").read_bytes()
    if digest(image) != manifest["imageSha256"]:
        raise ValueError("Image hash differs")
    changed[IMAGE] = image
    if set(changed) != {MAIN, IMAGE}:
        raise ValueError("Only presentation QML and its image may change; hosts stay identical")
    nonce = secrets.token_hex(12)
    folder = BASE + "/revisions/" + nonce
    files, entries = [], []

    def add(name, data):
        entries.append({"name": name, "base64": base64.b64encode(data).decode(), "sha256": digest(data)})

    for i, target in enumerate([MAIN, IMAGE]):
        old = base64.b64decode(original[target]["base64"])
        if digest(old) != original[target]["sha256"]:
            raise ValueError("Previous resource bytes differ")
        files.append({"target": target, "beforeSha256": digest(old), "afterSha256": digest(changed[target])})
        add("before-" + str(i), old)
        add("after-" + str(i), changed[target])
        next(f for f in after["files"] if f["path"] == target)["sha256"] = digest(changed[target])
    after = json.dumps(after, separators=(",", ":")).encode()
    revision = {"schema": 1, "purpose": "reframe-direct-cover-revision", "folder": folder,
                "beforePlanSha256": digest(before), "afterPlanSha256": digest(after), "files": files}
    add("before-plan.json", before)
    add("after-plan.json", after)
    add("revision.json", json.dumps(revision).encode())
    add("CoverRevision.cjs", (PROJECT / "scripts/native-cover/CoverRevision.cjs").read_bytes())
    LOCAL.parent.mkdir(parents=True, exist_ok=True)
    LOCAL.write_text(json.dumps(revision, indent=2), encoding="utf8")
    result = node("const folder=" + json.dumps(folder) + ",entries=" + json.dumps(entries) + r""";
const fs=require('fs'),crypto=require('crypto'),root='/var/lib/reframe/early-cover/revisions';
if(process.getuid()!==0)throw Error('Root required');
if(!fs.existsSync(root))fs.mkdirSync(root,{mode:448});
for(const p of ['/var/lib/reframe/early-cover',root]){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe revision parent');}
fs.mkdirSync(folder,{mode:448});for(const e of entries){if(!/^[a-zA-Z0-9.-]+$/.test(e.name))throw Error('Bad name');const p=folder+'/'+e.name;fs.writeFileSync(p,Buffer.from(e.base64,'base64'),{flag:'wx',mode:384});if(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==e.sha256)throw Error('Stage hash differs');}
require(folder+'/CoverRevision.cjs').load(folder);console.log(JSON.stringify({staged:true,changedFiles:2,hostsUnchanged:true}));""")
    print(result)


def load():
    p = json.loads(LOCAL.read_text(encoding="utf8"))
    folder = p.get("folder", "")
    if (p.get("purpose") != "reframe-direct-cover-revision" or not folder.startswith(BASE + "/revisions/")
            or len(folder.rsplit("/", 1)[-1]) != 24 or any(c not in "0123456789abcdef" for c in folder.rsplit("/", 1)[-1])):
        raise ValueError("Unexpected local revision")
    return folder


def command(action, folder):
    return "/usr/bin/node " + folder + "/CoverRevision.cjs " + action + " " + folder


def guard_activities(folder):
    found = []
    for a in luna("luna://com.palm.activitymanager/list", {"details": False, "subscribers": False, "current": False, "internal": False})["activities"]:
        if a.get("name") != ACTIVITY:
            continue
        detail = luna("luna://com.palm.activitymanager/getDetails", {"activityId": a["activityId"], "current": False, "internal": False})["activity"]
        if detail.get("callback") != {"method": "luna://org.webosbrew.hbchannel.service/exec", "params": {"command": command("watchdog", folder)}}:
            raise RuntimeError("Foreign revision Activity; preserving it")
        found.append(a["activityId"])
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["stage", "trial", "accept", "restore", "status"])
    parser.add_argument("--build", type=Path)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared", args.action, "(no TV connection; --execute required)")
        return
    if args.action == "stage":
        if not args.build:
            raise ValueError("A private direct build is required")
        stage(args.build)
        return
    folder = load()
    if args.action == "status":
        print(node("const fs=require('fs'),crypto=require('crypto'),folder=" + json.dumps(folder) + ";const r=require(folder+'/CoverRevision.cjs');r.load(folder);console.log(JSON.stringify({accepted:r.accepted(folder),rolledBack:fs.existsSync(folder+'/rolled-back'),guardError:fs.existsSync(folder+'/guard-error.json'),resource:require('/var/lib/reframe/early-cover/EarlyResource.cjs').create(fs,require('child_process'),crypto,process).status()}));"))
        return
    if args.action == "trial":
        if guard_activities(folder):
            raise RuntimeError("Existing revision trial")
        activity = {"name": ACTIVITY, "description": "Restore previous Reframe cover if direct-start trial is unconfirmed",
                    "type": {"foreground": True, "persist": True, "continuous": True},
                    "trigger": {"method": "luna://com.webos.bootManager/getBootStatus", "params": {"subscribe": True},
                                "where": {"prop": ["signals", "core-boot-done"], "op": "=", "val": True}},
                    "callback": {"method": "luna://org.webosbrew.hbchannel.service/exec", "params": {"command": command("watchdog", folder)}}}
        print(luna("luna://com.palm.activitymanager/create", {"activity": activity, "start": True}), flush=True)
        if len(guard_activities(folder)) != 1:
            raise RuntimeError("Boot guard not verified")
    action = {"trial": "apply", "accept": "accept", "restore": "rollback"}[args.action]
    result = ssh(command(action, folder), timeout=45)
    result.check_returncode()
    print(result.stdout, flush=True)
    if args.action in {"accept", "restore"}:
        for activity_id in guard_activities(folder):
            luna("luna://com.palm.activitymanager/cancel", {"activityId": activity_id})


if __name__ == "__main__":
    main()
