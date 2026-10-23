"""Native Reframe input/Home configuration with private snapshots and scoped undo."""
import argparse
import importlib.util
import json
from pathlib import Path
import secrets
from tv_connection import PROJECT, HOST, luna, ssh

APP = "com.reframe.home"
STOCK = "com.webos.app.home"
SETTINGS = "luna://com.webos.settingsservice/"
EIM = "luna://com.webos.service.eim/"
MANAGER = "luna://com.webos.service.applicationmanager/"
PLAN = PROJECT / "backups/direct-startup/current.json"


def node(source):
    result = ssh("/usr/bin/node -", input=source)
    result.check_returncode()
    return json.loads(result.stdout)


def general(keys):
    return luna(SETTINGS + "getSystemSettings", {"category": "general", "keys": keys})["settings"]


def inputs():
    return luna(EIM + "getAllInputStatus", {})["devices"]


def save(plan):
    PLAN.parent.mkdir(parents=True, exist_ok=True)
    temp = PLAN.with_suffix(".tmp")
    temp.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    temp.replace(PLAN)


def load():
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    before = plan.get("before", {})
    if (plan.get("schema") != 1 or plan.get("host") != HOST
            or plan.get("app") != APP or before.get("homeAutoLaunch") not in {"on", "off"}
            or not isinstance(before.get("defaultApps"), dict)
            or not isinstance(before.get("inputs"), list)
            or any(d.get("appId") == APP for d in before["inputs"])):
        raise ValueError("Unexpected direct-startup snapshot; preserving TV state")
    old_home = before["defaultApps"].get("home", STOCK)
    if old_home != STOCK:
        raise ValueError("Snapshot did not start with native LG Home")
    return plan


def launcher():
    spec = importlib.util.spec_from_file_location("managed_launcher", PROJECT / "scripts/manage-launcher.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def snapshot():
    if PLAN.exists():
        raise RuntimeError("Snapshot already exists; use status/restore, do not overwrite it")
    settings = general(["homeAutoLaunch", "defaultApps", "selectedInputApp", "checkForcedInputPowerOn"])
    devices = inputs()
    if any(d.get("appId") == APP for d in devices):
        raise RuntimeError("Reframe is already an input; inspect ownership before proceeding")
    native = node("""const fs=require('fs'),crypto=require('crypto'),paths=[
      '/var/lib/eim/lastinput','/var/lib/eim/eim_device_db.json',
      '/var/luna/preferences/bootd_last_foreground_app_id.json',
      '/var/lib/reframe/launcher-plan.json','/var/lib/reframe/launcher-status.json'];
      const files={};for(const p of paths){try{const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>200000)throw Error('Unexpected snapshot file');files[p]={base64:fs.readFileSync(p).toString('base64'),mode:s.mode&511}}catch(e){if(e.code!=='ENOENT')throw e;}}
      const app=JSON.parse(fs.readFileSync('/media/developer/apps/usr/palm/applications/com.reframe.home/appinfo.json','utf8'));
      if(app.id!=='com.reframe.home'||!app.supportGIP||app.spinnerOnLaunch!==false)throw Error('Install the escape-capable Reframe package first');
      console.log(JSON.stringify({uid:process.getuid(),app,files}));""")
    plan = {"schema": 1, "host": HOST, "app": APP, "run": secrets.token_hex(8),
            "before": {**settings, "inputs": devices, "launcher": launcher().status(), "native": native},
            "attempted": [], "state": "captured"}
    save(plan)
    load()  # Validate the rollback target before any mutations are possible.
    print("Private startup snapshot saved:", PLAN)


def attempt(plan, name):
    if name not in plan["attempted"]:
        plan["attempted"].append(name)
    plan["state"] = name
    save(plan)  # Journal intent before requests, including ambiguous replies.


def input_startup():
    plan = load()
    if plan["state"] == "restored":
        raise RuntimeError("Archive the restored snapshot before a new trial")
    if not any(d.get("appId") == APP for d in inputs()):
        attempt(plan, "input")
        luna(EIM + "addDevice", {"appId": APP, "pigImage": "", "mvpdIcon": ""})
    if not any(d.get("appId") == APP for d in inputs()):
        raise RuntimeError("Reframe input was not registered")
    attempt(plan, "preference")
    luna(SETTINGS + "setSystemSettings", {"category": "general", "settings": {"homeAutoLaunch": "off"}})
    if general(["homeAutoLaunch"])["homeAutoLaunch"] != "off":
        raise RuntimeError("Home auto-launch preference did not persist")
    luna(MANAGER + "launch", {"id": APP})
    print("Native input registered; Home auto-launch disabled")
    print("Input routing:", general(["lastInputApp", "physicalLastInputApp"]))


def retire_helper():
    plan = load()
    if "input" not in plan["attempted"]:
        raise RuntimeError("Register the native input before retiring its fallback")
    module = launcher()
    current = module.status()
    if current["enabled"]:
        attempt(plan, "helper")
        module.remove()  # Existing controller verifies hashes/PID and preserves SSH.
    if module.status()["running"]:
        raise RuntimeError("The old helper still runs; native startup is not isolated")
    print("Old post-Home helper retired; root SSH is independent")


def map_home():
    plan = load()
    if "helper" not in plan["attempted"] or launcher().status()["running"]:
        raise RuntimeError("Retire the old helper before mapping Home")
    defaults = general(["defaultApps"])["defaultApps"]
    if defaults.get("home", STOCK) not in {STOCK, APP}:
        raise RuntimeError("Home mapping changed outside this trial; preserving it")
    attempt(plan, "home")
    luna(MANAGER + "setDefaultApp", {"category": "home", "appId": APP})
    if general(["defaultApps"])["defaultApps"].get("home") != APP:
        raise RuntimeError("Native Home mapping not observed")
    print("Home category mapped to Reframe; explicit stock Home remains launchable")


def restore():
    plan = load()
    if "home" in plan["attempted"]:
        current = general(["defaultApps"])["defaultApps"].get("home", STOCK)
        if current not in {APP, STOCK}:
            raise RuntimeError("Unexpected Home mapping; preserving it")
        luna(MANAGER + "setDefaultApp", {"category": "home", "appId": STOCK})
        if general(["defaultApps"])["defaultApps"].get("home", STOCK) != STOCK:
            raise RuntimeError("Stock Home mapping not restored")
    if "input" in plan["attempted"] and any(d.get("appId") == APP for d in inputs()):
        luna(EIM + "deleteDevice", {"appId": APP})
    if any(d.get("appId") == APP for d in inputs()):
        raise RuntimeError("Reframe input remains; preserving other state for inspection")
    if "preference" in plan["attempted"]:
        current = general(["homeAutoLaunch"])["homeAutoLaunch"]
        if current not in {"off", plan["before"]["homeAutoLaunch"]}:
            raise RuntimeError("Unexpected startup preference")
        luna(SETTINGS + "setSystemSettings", {"category": "general", "settings": {
            "homeAutoLaunch": plan["before"]["homeAutoLaunch"]}})
        if general(["homeAutoLaunch"])["homeAutoLaunch"] != plan["before"]["homeAutoLaunch"]:
            raise RuntimeError("Original startup preference not restored")
    previous_input = next((d["appId"] for d in plan["before"]["inputs"]
        if d.get("activate") and d.get("appId") in {
            "com.webos.app.hdmi1", "com.webos.app.hdmi2", "com.webos.app.hdmi3", "com.webos.app.hdmi4"}), None)
    if previous_input and "input" in plan["attempted"]:
        luna(MANAGER + "launch", {"id": previous_input})
    if "helper" in plan["attempted"] and plan["before"]["launcher"]["enabled"]:
        module = launcher()
        if not module.status()["enabled"]:
            module.install()
        module.start()
    plan["state"] = "restored"
    save(plan)
    print("Native Home/startup behavior restored; only the owned Reframe input was removed")


def status():
    print(json.dumps({"settings": general(["homeAutoLaunch", "defaultApps"]),
        "inputs": [{k: d.get(k) for k in ["id", "appId", "activate"]} for d in inputs()],
        "helper": launcher().status(),
        "journal": load()["state"] if PLAN.exists() else None}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["snapshot", "input", "retire-helper", "home", "restore", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared:", args.action, "(no TV connection; --execute required)")
        return
    {"snapshot": snapshot, "input": input_startup, "retire-helper": retire_helper,
     "home": map_home, "restore": restore, "status": status}[args.action]()


if __name__ == "__main__":
    main()
