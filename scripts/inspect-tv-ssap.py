#!/usr/bin/env python3
"""Pair with a LAN webOS TV, request its app inventory, then disconnect.

Standard library only. The only SSAP request URI in this client is listApps.
Pairing credentials and the inventory are saved in gitignored fingerprint files.
TLS certificate trust is pinned on first use for this TV, separately from SSH.
"""

import argparse
import base64
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import socket
import ssl
import struct
import sys
import time


PROJECT = Path(__file__).absolute().parent.parent
PAIRING = PROJECT / "docs" / "fingerprint-ssap-pairing.txt"
INVENTORY = PROJECT / "docs" / "fingerprint-ssap-apps.txt"
LIST_APPS = "ssap://com.webos.applicationManager/listApps"
CANDIDATES = ("adoverlayex", "adoverlay", "acroverlay", "tinybrowser", "dangbei-overlay")
MAX_MESSAGE = 8 * 1024 * 1024


class TVSocket:
    """Small RFC 6455 text transport with bounded messages and receive deadlines."""

    def __init__(self, host, certificate_pin):
        self.buffer = bytearray()
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        # TVs use self-signed certs: apply our saved fingerprint after the handshake.
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        raw = socket.create_connection((host, 3001), timeout=10)
        try:
            self.sock = context.wrap_socket(raw, server_hostname=host)
        except BaseException:
            raw.close()
            raise
        try:
            self.certificate_pin = hashlib.sha256(self.sock.getpeercert(binary_form=True)).hexdigest()
            if certificate_pin and certificate_pin != self.certificate_pin:
                raise RuntimeError("TV TLS certificate differs from the saved pairing; inspect it before retrying")
            nonce = base64.b64encode(os.urandom(16)).decode("ascii")
            request = (
                f"GET / HTTP/1.1\r\nHost: {host}:3001\r\n"
                "Connection: Upgrade\r\nUpgrade: websocket\r\n"
                f"Sec-WebSocket-Key: {nonce}\r\nSec-WebSocket-Version: 13\r\n\r\n"
            )
            self.sock.sendall(request.encode("ascii"))
            deadline = time.monotonic() + 10
            while b"\r\n\r\n" not in self.buffer:
                self.sock.settimeout(max(0.01, deadline - time.monotonic()))
                chunk = self.sock.recv(4096)
                if not chunk or len(self.buffer) + len(chunk) > 65536:
                    raise RuntimeError("Invalid WebSocket handshake")
                self.buffer.extend(chunk)
                if time.monotonic() >= deadline:
                    raise TimeoutError("WebSocket handshake timed out")
            headers, remaining = bytes(self.buffer).split(b"\r\n\r\n", 1)
            self.buffer = bytearray(remaining)
            lines = headers.decode("latin-1").split("\r\n")
            if lines[0].split()[1] != "101":
                raise RuntimeError(f"WebSocket upgrade rejected: {lines[0]}")
            fields = {
                name.lower(): value.strip()
                for name, value in (line.split(":", 1) for line in lines[1:] if ":" in line)
            }
            expected = base64.b64encode(hashlib.sha1(
                (nonce + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")
            ).digest()).decode("ascii")
            if fields.get("sec-websocket-accept", "").strip() != expected:
                raise RuntimeError("WebSocket accept value mismatch")
        except BaseException:
            self.sock.close()
            raise

    def read(self, size, deadline):
        while len(self.buffer) < size:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("TV response timed out")
            self.sock.settimeout(remaining)
            chunk = self.sock.recv(min(65536, max(4096, size - len(self.buffer))))
            if not chunk:
                raise RuntimeError("TV closed the connection")
            self.buffer.extend(chunk)
        value = bytes(self.buffer[:size])
        del self.buffer[:size]
        return value

    def send(self, opcode, payload):
        size = len(payload)
        if size < 126:
            header = bytes((0x80 | opcode, 0x80 | size))
        elif size <= 65535:
            header = bytes((0x80 | opcode, 0x80 | 126)) + struct.pack("!H", size)
        else:
            header = bytes((0x80 | opcode, 0x80 | 127)) + struct.pack("!Q", size)
        mask = os.urandom(4)
        self.sock.settimeout(10)
        self.sock.sendall(header + mask + bytes(value ^ mask[i % 4] for i, value in enumerate(payload)))

    def send_json(self, message):
        self.send(1, json.dumps(message, separators=(",", ":")).encode("utf-8"))

    def receive_json(self, deadline):
        parts = bytearray()
        started = False
        while True:
            first, second = self.read(2, deadline)
            final, opcode = bool(first & 0x80), first & 15
            if first & 0x70 or second & 0x80:
                raise RuntimeError("Unexpected WebSocket extensions or masked server frame")
            size = second & 127
            if size == 126:
                size = struct.unpack("!H", self.read(2, deadline))[0]
            elif size == 127:
                size = struct.unpack("!Q", self.read(8, deadline))[0]
            if size > MAX_MESSAGE or len(parts) + size > MAX_MESSAGE:
                raise RuntimeError("TV response exceeds the inventory size limit")
            if opcode >= 8 and (not final or size > 125):
                raise RuntimeError("Invalid WebSocket control frame")
            payload = self.read(size, deadline)
            if opcode == 8:
                raise RuntimeError("TV closed the WebSocket")
            if opcode == 9:
                self.send(10, payload)
                continue
            if opcode == 10:
                continue
            if opcode == 1 and not started:
                started = True
            elif opcode != 0 or not started:
                raise RuntimeError("Expected a WebSocket text message")
            parts.extend(payload)
            if final:
                message = json.loads(parts.decode("utf-8"))
                if not isinstance(message, dict):
                    raise RuntimeError("Expected a JSON response object")
                return message

    def close(self):
        try:
            self.send(8, struct.pack("!H", 1000))
        except OSError:
            pass
        finally:
            self.sock.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="192.168.40.124")
    parser.add_argument("--pair-timeout", type=int, default=120, choices=range(1, 181), metavar="1..180")
    args = parser.parse_args()
    address = ipaddress.ip_address(args.host)
    if address.version != 4 or not address.is_private or address.is_loopback:
        parser.error("host must be the TV's private LAN IPv4 address")
    saved = json.loads(PAIRING.read_text(encoding="utf-8")) if PAIRING.exists() else {}
    if saved and saved.get("host") != args.host:
        raise RuntimeError("Saved pairing belongs to another host")
    print(f"Connecting to TV {args.host}:3001 for app inventory only...", flush=True)
    tv = TVSocket(args.host, saved.get("certificate_sha256"))
    try:
        payload = {
            "forcePairing": False,
            "pairingType": "PROMPT",
            "manifest": {
                "manifestVersion": 1,
                "appVersion": "0.1.0",
                "appId": "com.reframe.inventory",
                "vendorId": "Reframe",
                "localizedAppNames": {"": "Reframe app inventory"},
                "permissions": ["READ_INSTALLED_APPS"],
            },
        }
        if saved.get("client_key"):
            payload["client-key"] = saved["client_key"]
        tv.send_json({"type": "register", "id": "pair", "payload": payload})
        print("Accept 'Reframe app inventory' on the TV if a pairing prompt appears.", flush=True)
        deadline = time.monotonic() + args.pair_timeout
        while True:
            message = tv.receive_json(deadline)
            if message.get("type") == "error":
                raise RuntimeError(f"Pairing rejected: {message.get('error', 'unknown error')}")
            if message.get("type") == "registered":
                client_key = message.get("payload", {}).get("client-key") or saved.get("client_key")
                if not client_key:
                    raise RuntimeError("TV registered without providing a pairing key")
                PAIRING.write_text(json.dumps({
                    "host": args.host, "client_key": client_key,
                    "certificate_sha256": tv.certificate_pin,
                }, indent=2) + "\n", encoding="utf-8")
                break
        print("Paired. Requesting listApps...", flush=True)
        tv.send_json({"type": "request", "id": "inventory", "uri": LIST_APPS, "payload": {}})
        deadline = time.monotonic() + 15
        while True:
            message = tv.receive_json(deadline)
            if message.get("id") != "inventory":
                continue
            result = message.get("payload", {})
            if message.get("type") == "error" or result.get("returnValue") is False:
                raise RuntimeError(f"App inventory denied: {message.get('error') or result.get('errorText')}")
            apps = result.get("apps")
            if not isinstance(apps, list):
                raise RuntimeError("App inventory response contains no apps array")
            INVENTORY.write_text(json.dumps({
                "collected_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "host": args.host, "response": message,
            }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            by_id = {app["id"]: app for app in apps if isinstance(app, dict) and "id" in app}
            print(f"Inventory received: {len(apps)} apps. Saved to {INVENTORY.name}.")
            for suffix in CANDIDATES:
                app_id = "com.webos.app." + suffix
                app = by_id.get(app_id)
                if app is None:
                    print(f"{app_id}: not listed")
                else:
                    summary = {key: app[key] for key in (
                        "id", "title", "version", "type", "folderPath", "trustLevel",
                        "privilegedJail", "standAloneLaunchable", "handlesRelaunch", "visible",
                    ) if key in app}
                    print(json.dumps(summary, ensure_ascii=True))
            print("Inventory complete; disconnecting.", flush=True)
            return
    finally:
        tv.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Inventory stopped: {error}", file=sys.stderr)
        sys.exit(1)
