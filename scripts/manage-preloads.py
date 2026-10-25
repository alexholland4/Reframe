"""Disable only three optional app preloads with a private journal and exact undo."""
import argparse
import base64
import hashlib
import json
from tv_connection import HOST, PROJECT, luna, ssh

TARGETS = ("com.webos.app.lgchannels", "com.webos.app.browser", "com.webos.app.voice")
CONFIG = "/var/preferences/webos-preload-manager-conf.json"
PLAN = PROJECT / "backups/preloads/current.json"


def config_read():
    source = r"""const fs=require('fs'),p=PATH,s=fs.lstatSync(p);
if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&18)||s.size>65536)throw Error('Unsafe preload config');
const b=fs.readFileSync(p);console.log(JSON.stringify({base64:b.toString('base64'),mode:s.mode&4095}));"""
    result = ssh("/usr/bin/node -", input=source.replace("PATH", json.dumps(CONFIG)))
    result.check_returncode()
    snap = json.loads(result.stdout)
    data = json.loads(base64.b64decode(snap["base64"]))
    if data.get("version") != 3 or not isinstance(data.get("allowedApps"), dict):
        raise ValueError("Unexpected preload configuration")
    if any(type(data["allowedApps"].get(app)) is not bool for app in TARGETS):
        raise ValueError("Expected existing boolean allowlist entries")
    return snap, data


def config_write(snap, data):
    """Replace only after checking exact read bytes/mode; preserve foreign keys."""
    content = json.dumps(data, separators=(",", ":")).encode()
    expected = hashlib.sha256(base64.b64decode(snap["base64"])).hexdigest()
    source = r"""const fs=require('fs'),crypto=require('crypto'),p=PATH,s=fs.lstatSync(p);
if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&4095)!==MODE||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==HASH)throw Error('Preload config changed; refusing write');
const temp=p+'.reframe-'+crypto.randomBytes(8).toString('hex'),fd=fs.openSync(temp,'wx',MODE);
try{fs.writeFileSync(fd,Buffer.from(DATA,'base64'));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
fs.renameSync(temp,p);console.log(JSON.stringify({written:true}));"""
    for key, value in {"PATH": CONFIG, "MODE": snap["mode"], "HASH": expected,
                       "DATA": base64.b64encode(content).decode()}.items():
        source = source.replace(key, json.dumps(value))
    result = ssh("/usr/bin/node -", input=source)
    result.check_returncode()
    if json.loads(result.stdout) != {"written": True}:
        raise RuntimeError("Preload config write not acknowledged")


def policy_read():
    apps = luna("luna://com.webos.service.preloadmanager/getPreloadPolicy", {})["applications"]
    selected = {app["id"]: app for app in apps if app["id"] in TARGETS}
    if set(selected) != set(TARGETS) or any(type(app.get("isEnabled")) is not bool for app in selected.values()):
        raise ValueError("Optional preload policy differs from reviewed apps")
    return selected


def load():
    plan = json.loads(PLAN.read_text(encoding="utf8"))
    if (plan.get("schema") != 1 or plan.get("host") != HOST
            or plan.get("purpose") != "reframe-optional-preloads"
            or set(plan.get("policyBefore", {})) != set(TARGETS)):
        raise ValueError("Unexpected preload journal")
    original = json.loads(base64.b64decode(plan["configBefore"]["base64"]))
    if (original.get("version") != 3
            or any(type(original.get("allowedApps", {}).get(app)) is not bool for app in TARGETS)
            or any(type(plan["policyBefore"][app].get("isEnabled")) is not bool for app in TARGETS)):
        raise ValueError("Invalid original preload state")
    return plan, original


def change(restore=False):
    snap, current = config_read()
    policy = policy_read()
    if not PLAN.exists():
        if restore:
            raise ValueError("No preload journal to restore")
        # Intent and original bytes are saved before the first TV mutation.
        PLAN.parent.mkdir(parents=True, exist_ok=True)
        plan = {"schema": 1, "host": HOST, "purpose": "reframe-optional-preloads",
                "configBefore": snap, "policyBefore": policy}
        with PLAN.open("x", encoding="utf8") as stream:
            stream.write(json.dumps(plan, indent=2) + "\n")
    plan, original = load()
    for app in TARGETS:
        allowed_before = original["allowedApps"][app]
        enabled_before = plan["policyBefore"][app]["isEnabled"]
        if (current["allowedApps"][app] not in (allowed_before, False)
                or policy[app]["isEnabled"] not in (enabled_before, False)):
            raise RuntimeError("Target preload was changed outside this journal: " + app)
        current["allowedApps"][app] = allowed_before if restore else False
    config_write(snap, current)
    for app in TARGETS:
        luna("luna://com.webos.service.preloadmanager/setPreloadPolicy", {
            "application": {"id": app, "isEnabled": plan["policyBefore"][app]["isEnabled"] if restore else False}})
    _, observed = config_read()
    live = policy_read()
    if observed != current or any(live[app]["isEnabled"] != (
            plan["policyBefore"][app]["isEnabled"] if restore else False) for app in TARGETS):
        raise RuntimeError("Preload state not observed; preserve journal and inspect")
    print("Original optional preloads restored" if restore else "Disabled optional preloads:", ", ".join(TARGETS))
    print("No apps closed/uninstalled; Home, inputs, casting, media and update services unchanged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["apply", "restore", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared", args.action, "for", ", ".join(TARGETS), "(no TV connection; --execute required)")
        return
    if args.action == "status":
        _, data = config_read()
        print(json.dumps({"allowedApps": {app: data["allowedApps"][app] for app in TARGETS},
                          "policy": policy_read()}, indent=2))
    else:
        change(args.action == "restore")


if __name__ == "__main__":
    main()
