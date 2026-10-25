"""Manage one early native cover resource and its boot-trial rollback Activity."""
import argparse
import base64
import hashlib
import json
import secrets
from tv_connection import PROJECT, ssh, luna

BASE = "/var/lib/reframe/early-cover"
VERSION = BASE + "/version"
PLAN = "/var/lib/reframe/early-cover-plan.json"
NAME = "com.reframe.nativecover"
ACTIVITY = "com.reframe.earlycover.trial"
COMMAND = "/usr/bin/node " + BASE + "/EarlyResource.cjs watchdog"
LOCAL = PROJECT / "backups/early-cover/current.json"


def node(source, timeout=40):
    result = ssh("/usr/bin/node -", input=source, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


def control(action):
    if action not in {"status", "enable", "disable", "accept", "watchdog"}:
        raise ValueError("Unexpected resource action")
    result = node("console.log(JSON.stringify(require(" + json.dumps(BASE + "/EarlyResource.cjs")
                  + ").create(require('fs'),require('child_process'),require('crypto'),process)."
                  + action + "()));")
    print(result, flush=True)
    return result


def install():
    if LOCAL.exists():
        raise RuntimeError("Preserve the existing early-resource snapshot; do not reinstall")
    build = PROJECT / ".research/early-cover-build"
    manifest = json.loads((build / "manifest.json").read_text())
    if manifest.get("schema") != 1 or manifest.get("purpose") != "reframe-early-cover-build" or len(manifest["files"]) != 58:
        raise ValueError("Unexpected build manifest")
    metadata = json.loads((build / "payload/usr/palm/packages" / NAME / "packageinfo.json").read_text())
    if metadata != {"id": NAME, "version": "1.0.0", "filePaths": ["/usr/lib/qml/CoverUI", "/etc/hosts"]}:
        raise ValueError("Unexpected resource targets")
    entries = []
    def entry(path, data, expected=None):
        digest = hashlib.sha256(data).hexdigest()
        if expected and digest != expected:
            raise ValueError("Build bytes differ from manifest")
        entries.append({"path": path, "base64": base64.b64encode(data).decode(), "sha256": digest})
    for name, digest in manifest["files"].items():
        if name.startswith("/") or ".." in name.split("/"):
            raise ValueError("Unsafe resource path")
        entry(VERSION + "/" + name, (build / "payload" / name).read_bytes(), digest)
    entry(VERSION + "/usr/palm/data/images/" + NAME + "/data.img", (build / "data.img").read_bytes(), manifest["imageSha256"])
    entry(BASE + "/EarlyResource.cjs", (PROJECT / "scripts/native-cover/EarlyResource.cjs").read_bytes())
    plan = {"schema": 1, "purpose": "reframe-early-cover", "name": NAME, "base": BASE,
            "hostsBeforeSha256": manifest["hostsBeforeSha256"],
            "files": [{"path": e["path"], "sha256": e["sha256"]} for e in entries]}
    before = node(r"""const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
function safe(p){const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe file');}
if(process.getuid()!==0||fs.existsSync('/var/lib/reframe/early-cover')||fs.existsSync('/var/lib/reframe/early-cover-plan.json'))throw Error('Existing destination');
const db='/var/palm/data/resourceinstallerutility/packageInstallHistory.db';safe(db);safe('/etc/hosts');
const schema=cp.execFileSync('/usr/bin/sqlite3',['-readonly',db,'.schema'],{encoding:'utf8'});
const rows=JSON.parse(cp.execFileSync('/usr/bin/sqlite3',['-readonly','-json',db,'select * from PackageInfo;'],{encoding:'utf8'})||'[]');
if(rows.length)throw Error('Review existing native resource records before adding ours');
console.log(JSON.stringify({schema,rows,hostsSha256:crypto.createHash('sha256').update(fs.readFileSync('/etc/hosts')).digest('hex')}));""")
    if before["hostsSha256"] != manifest["hostsBeforeSha256"]:
        raise RuntimeError("Hosts changed since the private snapshot; preserving them")
    LOCAL.parent.mkdir(parents=True, exist_ok=True)
    LOCAL.write_text(json.dumps({"purpose": "reframe-early-cover", "before": before, "plan": plan}, indent=2), encoding="utf-8")
    source = "const entries=" + json.dumps(entries) + ",plan=" + json.dumps(plan) + r""";
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
for(const p of ['/var/lib/reframe']){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&18))throw Error('Unsafe parent');}
if(process.getuid()!==0||fs.existsSync(plan.base)||fs.existsSync('/var/lib/reframe/early-cover-plan.json'))throw Error('Destination exists');
fs.writeFileSync('/var/lib/reframe/early-cover-plan.json',JSON.stringify(plan),{flag:'wx',mode:384});
fs.mkdirSync(plan.base,{mode:493});
for(const e of entries){if(!e.path.startsWith(plan.base+'/')||e.path.includes('/../'))throw Error('Unexpected source');fs.mkdirSync(path.dirname(e.path),{recursive:true,mode:493});fs.writeFileSync(e.path,Buffer.from(e.base64,'base64'),{flag:'wx',mode:420});if(crypto.createHash('sha256').update(fs.readFileSync(e.path)).digest('hex')!==e.sha256)throw Error('Uploaded bytes differ');}
cp.execFileSync('/usr/bin/sqlite3',['/var/palm/data/resourceinstallerutility/packageInstallHistory.db',".backup '/var/lib/reframe/early-cover/original-resource-history.db'"],{timeout:5000});fs.chmodSync(plan.base+'/original-resource-history.db',384);
console.log(JSON.stringify({staged:true,files:entries.length,registered:false,firmwareFilesChanged:0}));"""
    print(node(source), flush=True)


def activities():
    reply = luna("luna://com.palm.activitymanager/list", {"details": False, "subscribers": False, "current": False, "internal": False})
    result = []
    for item in reply["activities"]:
        if item.get("name") == ACTIVITY:
            detail = luna("luna://com.palm.activitymanager/getDetails", {"activityId": item["activityId"], "current": False, "internal": False})["activity"]
            if detail.get("callback") != {"method": "luna://org.webosbrew.hbchannel.service/exec", "params": {"command": COMMAND}}:
                raise RuntimeError("Foreign early-resource Activity; preserving it")
            result.append(detail)
    return result


def refresh():
    state = control("status")
    if state["registered"] or state["mounts"]:
        raise RuntimeError("Disable the live resource before refreshing its controller")
    data = (PROJECT / "scripts/native-cover/EarlyResource.cjs").read_bytes()
    source = "const data=Buffer.from(" + json.dumps(base64.b64encode(data).decode()) + r""",'base64');
const fs=require('fs'),crypto=require('crypto'),base='/var/lib/reframe/early-cover',pp='/var/lib/reframe/early-cover-plan.json',p=base+'/EarlyResource.cjs';
const plan=JSON.parse(fs.readFileSync(pp,'utf8')),entry=plan.files.find(f=>f.path===p),s=fs.lstatSync(p);
if(!entry||!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==entry.sha256)throw Error('Controller ownership changed');
const backup=base+'/controller-before-'+entry.sha256+'.cjs';if(!fs.existsSync(backup))fs.writeFileSync(backup,fs.readFileSync(p),{flag:'wx',mode:384});
entry.sha256=crypto.createHash('sha256').update(data).digest('hex');
fs.writeFileSync(p+'.new',data,{flag:'wx',mode:420});fs.renameSync(p+'.new',p);
fs.writeFileSync(pp+'.new',JSON.stringify(plan),{flag:'wx',mode:384});fs.renameSync(pp+'.new',pp);
console.log(JSON.stringify({refreshedOwnController:true}));"""
    print(node(source), flush=True)
    control("status")


def trial():
    state = control("status")
    if state["registered"] or state["mounts"] or activities():
        raise RuntimeError("Early-resource trial already exists; inspect it first")
    nonce = secrets.token_hex(16)
    node("require('fs').writeFileSync(" + json.dumps(BASE + "/trial.json") + "," + json.dumps(json.dumps({"nonce": nonce}))
         + ",{flag:'wx',mode:384});console.log(JSON.stringify({armed:true}));")
    definition = {"name": ACTIVITY, "description": "Guard Reframe's early-cover trial; preserve independent root SSH",
                  "type": {"foreground": True, "persist": True, "continuous": True},
                  "trigger": {"method": "luna://com.webos.bootManager/getBootStatus", "params": {"subscribe": True},
                              "where": {"prop": ["signals", "core-boot-done"], "op": "=", "val": True}},
                  "callback": {"method": "luna://org.webosbrew.hbchannel.service/exec", "params": {"command": COMMAND}}}
    print(luna("luna://com.palm.activitymanager/create", {"activity": definition, "start": True}), flush=True)
    if len(activities()) != 1:
        raise RuntimeError("Boot watchdog Activity was not verified; resource stays disabled")
    control("watchdog")
    control("enable")
    print("Resource record enabled; reboot promptly for a fresh guarded boot. Root SSH startup is unchanged.", flush=True)


def cancel_guard():
    for item in activities():
        luna("luna://com.palm.activitymanager/cancel", {"activityId": item["activityId"]})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "refresh", "trial", "accept", "disable", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared:", args.action, "(no TV connection; --execute required)")
        return
    if args.action == "install":
        install()
    elif args.action == "refresh":
        refresh()
    elif args.action == "trial":
        trial()
    elif args.action in {"accept", "disable"}:
        control(args.action)
        cancel_guard()
    else:
        control("status")


if __name__ == "__main__":
    main()
