"""Disable only optional LG promotions/recommendations/Live Plus, with exact undo."""
import argparse
import json
from tv_connection import PROJECT, HOST, luna

PLAN = PROJECT / "backups/distractions/current.json"
TARGETS = {"general": {"homePromotion": "off", "screenSaverAd": "off"},
           "other": {"contentRecommendation": "off"},
           "option": {"livePlus": "off", "livePromotion": "off"}}


def read(category):
    result = luna("luna://com.webos.settingsservice/getSystemSettings", {
        "category": category, "keys": list(TARGETS[category])})["settings"]
    if set(result) != set(TARGETS[category]) or any(v not in {"on", "off"} for v in result.values()):
        raise ValueError("Optional preferences differ from reviewed schema")
    return result


def load():
    plan = json.loads(PLAN.read_text(encoding="utf8"))
    if (plan.get("schema") != 1 or plan.get("host") != HOST or plan.get("purpose") != "reframe-distractions"
            or set(plan.get("before", {})) != set(TARGETS)
            or any(set(plan["before"][c]) != set(TARGETS[c]) or any(v not in {"on", "off"} for v in plan["before"][c].values()) for c in TARGETS)
            or any(c not in TARGETS for c in plan.get("attempted", []))):
        raise ValueError("Invalid optional preference journal")
    return plan


def save(plan):
    PLAN.parent.mkdir(parents=True, exist_ok=True)
    temp = PLAN.with_suffix(".tmp")
    temp.write_text(json.dumps(plan, indent=2), encoding="utf8")
    temp.replace(PLAN)


def change(restore=False):
    if PLAN.exists():
        plan = load()
    elif restore:
        raise ValueError("No original preference journal")
    else:
        plan = {"schema": 1, "host": HOST, "purpose": "reframe-distractions",
                "before": {c: read(c) for c in TARGETS}, "attempted": []}
        save(plan)
    for category in reversed(plan["attempted"]) if restore else TARGETS:
        current = read(category)
        if any(current[k] not in {v, plan["before"][category][k]} for k, v in TARGETS[category].items()):
            raise RuntimeError("Preference changed outside this journal")
        if category not in plan["attempted"]:
            plan["attempted"].append(category)
            save(plan)
        desired = plan["before"][category] if restore else TARGETS[category]
        luna("luna://com.webos.settingsservice/setSystemSettings", {"category": category, "settings": desired})
        if read(category) != desired:
            raise RuntimeError("Preference not observed")
    print("Original optional preferences restored" if restore else "Disabled Home/screensaver promotions, recommendations and Live Plus")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["apply", "restore", "status"])
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.action != "status" and not args.execute:
        print("Prepared", args.action, "(no TV connection; --execute required)")
        return
    if args.action == "status":
        print(json.dumps({c: read(c) for c in TARGETS}, indent=2))
    else:
        change(args.action == "restore")


if __name__ == "__main__":
    main()
