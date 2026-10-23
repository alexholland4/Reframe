"""Target firmware-check and Alexa onboarding preferences; leave app updates intact."""
import argparse
import json
from tv_connection import PROJECT, HOST, luna

PLAN = PROJECT / "backups/notifications/current.json"
TARGETS = {"support": {"softwareUpdateEnable": "false"},
           "voiceframework": {"amazonLongDistanceGuided": True}}


def read(category, keys):
    return luna("luna://com.webos.settingsservice/getSystemSettings",
                {"category": category, "keys": keys})["settings"]


def save(plan):
    PLAN.parent.mkdir(parents=True, exist_ok=True)
    temp = PLAN.with_suffix(".tmp")
    temp.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    temp.replace(PLAN)


def load():
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    if (plan.get("schema") != 1 or plan.get("host") != HOST
            or plan.get("purpose") != "reframe-target-notifications"
            or set(plan.get("before", {})) != set(TARGETS)
            or any(set(plan["before"][c]) != set(TARGETS[c]) for c in TARGETS)
            or plan["before"]["support"].get("softwareUpdateEnable") not in {"true", "false"}
            or type(plan["before"]["voiceframework"].get("amazonLongDistanceGuided")) is not bool):
        raise ValueError("Unexpected notification snapshot")
    return plan


def apply():
    if PLAN.exists():
        plan = load()
    else:
        before = {category: read(category, list(settings)) for category, settings in TARGETS.items()}
        plan = {"schema": 1, "host": HOST, "purpose": "reframe-target-notifications",
                "before": before, "attempted": [],
                "appUpdateMode": read("option", ["appUpdateMode"])["appUpdateMode"],
                "automaticUpdate": read("support", ["automaticUpdate"])["automaticUpdate"]}
        save(plan)
        load()
    if plan["automaticUpdate"] != "off":
        raise RuntimeError("Firmware auto-update must be off before this notification trial")
    for category, settings in TARGETS.items():
        if category not in plan["attempted"]:
            plan["attempted"].append(category)
            save(plan)  # Record original values and intent before every mutation.
        luna("luna://com.webos.settingsservice/setSystemSettings", {"category": category, "settings": settings})
        if read(category, list(settings)) != settings:
            raise RuntimeError("Notification setting not observed: " + category)
    if read("option", ["appUpdateMode"])["appUpdateMode"] != plan["appUpdateMode"]:
        raise RuntimeError("App-update mode changed outside this trial")
    print("Firmware checks disabled; Alexa long-distance guide marked seen; app-update mode preserved:", plan["appUpdateMode"])


def restore():
    plan = load()
    for category in reversed(plan["attempted"]):
        if category not in TARGETS:
            raise ValueError("Unexpected notification category")
        current = read(category, list(TARGETS[category]))
        if current not in [TARGETS[category], plan["before"][category]]:
            raise RuntimeError("Notification preference changed outside this trial")
        luna("luna://com.webos.settingsservice/setSystemSettings", {
            "category": category, "settings": plan["before"][category]})
        if read(category, list(TARGETS[category])) != plan["before"][category]:
            raise RuntimeError("Original preference not observed")
    print("Original firmware/Alexa preferences restored; app updates unchanged")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["apply", "restore", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared:", args.action, "(no TV connection; --execute required)")
        return
    if args.action == "status":
        print(json.dumps({**{c: read(c, list(s)) for c, s in TARGETS.items()},
                          "option": read("option", ["appUpdateMode"]),
                          "firmwareAuto": read("support", ["automaticUpdate"])}, indent=2))
    else:
        {"apply": apply, "restore": restore}[args.action]()


if __name__ == "__main__":
    main()
