"""Pinned SSAP app launch for recovery independent of Developer Mode SSH."""
import importlib.util
import json
import time
from tv_connection import PROJECT, HOST

_spec = importlib.util.spec_from_file_location("reframe_ssap_transport", PROJECT / "scripts/inspect-tv-ssap.py")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
PAIRING = PROJECT / "docs/fingerprint-ssap-recovery-pairing.txt"


def connect(pair=False):
    original = json.loads((PROJECT / "docs/fingerprint-ssap-pairing.txt").read_text(encoding="utf-8"))
    saved = json.loads(PAIRING.read_text(encoding="utf-8")) if PAIRING.exists() else {}
    if original.get("host") != HOST or (saved and saved.get("host") != HOST):
        raise RuntimeError("Pairing host mismatch")
    if not saved and not pair:
        raise RuntimeError("Recovery app-launch pairing must be approved on the TV first")
    tv = _module.TVSocket(HOST, original["certificate_sha256"])
    payload = {"forcePairing": False, "pairingType": "PROMPT", "manifest": {
        "manifestVersion": 1, "appVersion": "0.1.0", "appId": "com.reframe.recovery",
        "vendorId": "Reframe", "localizedAppNames": {"": "Reframe recovery"}, "permissions": ["LAUNCH"]}}
    if saved.get("client_key"):
        payload["client-key"] = saved["client_key"]
    try:
        tv.send_json({"type": "register", "id": "register", "payload": payload})
        deadline = time.monotonic() + (120 if pair else 12)
        while True:
            reply = tv.receive_json(deadline)
            if reply.get("type") == "error":
                (PROJECT / "docs/fingerprint-recovery-pairing-error.txt").write_text(json.dumps({"type": reply.get("type"), "error": reply.get("error")}, indent=2), encoding="utf-8")
                raise RuntimeError("TV rejected recovery registration: " + str(reply.get("error", "unspecified")))
            if reply.get("type") == "registered":
                key = reply.get("payload", {}).get("client-key") or saved.get("client_key")
                if not key:
                    raise RuntimeError("Recovery registration supplied no key")
                if pair:
                    PAIRING.write_text(json.dumps({"host": HOST, "client_key": key,
                        "certificate_sha256": tv.certificate_pin}, indent=2) + "\n", encoding="utf-8")
                return tv
    except BaseException:
        tv.close()
        raise


def launch(target, params=None):
    if target not in {"com.reframe.home", "com.webos.app.adoverlayex"}:
        raise ValueError("Unsupported recovery launch target")
    tv = connect()
    try:
        payload = {"id": target}
        if params:
            payload["params"] = params
        tv.send_json({"type": "request", "id": "launch", "uri": "ssap://system.launcher/launch", "payload": payload})
        deadline = time.monotonic() + 15
        while True:
            reply = tv.receive_json(deadline)
            if reply.get("id") != "launch":
                continue
            result = reply.get("payload", {})
            if reply.get("type") == "error" or result.get("returnValue") is not True:
                (PROJECT / "docs/fingerprint-recovery-launch-error.txt").write_text(
                    json.dumps(reply, indent=2) + "\n", encoding="utf-8")
                raise RuntimeError("TV rejected recovery app launch")
            return result
    finally:
        tv.close()
