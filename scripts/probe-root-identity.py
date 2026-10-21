#!/usr/bin/env python3
"""Prepare (default) or execute (--execute) a limited root identity probe.

Execution temporarily opens an existing overlay app and invokes the pinned
SlopBro service route with an identity-only module. No installer, shell command,
HBC/startup change, or reboot is included. Download history may remain even if
the module removes its own uniquely marked files. Raw results remain ignored.
"""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import ipaddress
import json
from pathlib import Path
import re
import secrets
import shlex
import socket
import subprocess
import threading
import time
from urllib.parse import urlsplit

PROJECT = Path(__file__).absolute().parent.parent
TEMPLATES = PROJECT / "scripts" / "root-probe"
PIN = "21023d56ca424607bb03d2939609cc658c655fc7"
APPS = {"adoverlayex": "interactiveUrl", "adoverlay": "interactiveUrl"}


def render(run_id, base_url, app_id):
    if not re.fullmatch(r"[a-f0-9]{24}", run_id):
        raise ValueError("Invalid run identifier")
    if app_id not in {"com.webos.app." + name for name in APPS}:
        raise ValueError("Unsupported diagnostic app")
    parsed = urlsplit(base_url)
    if parsed.scheme != "http" or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Invalid local callback URL")
    if parsed.path != "/" + run_id + "/":
        raise ValueError("Callback URL must be scoped to this run")
    stage = "/media/internal/downloads/reframe-uid-" + run_id
    values = {
        "__RUN_ID__": run_id,
        "__STAGE_DIR__": stage,
        "__REPORT_URL__": base_url + "result",
        "__BASE_URL__": base_url,
        "__APP_ID__": app_id,
    }
    files = {}
    for output, template in [("main.js", "identity-service.js"), ("probe.html", "probe.html")]:
        source = (TEMPLATES / template).read_text(encoding="utf-8")
        for marker, value in values.items():
            source = source.replace(marker, json.dumps(value))
        if re.search(r"__[A-Z_]+__", source):
            raise ValueError("Unexpanded template marker")
        files[output] = source.encode("utf-8")
    files["package.json"] = (json.dumps({
        "name": "com.webos.service.jsserver", "main": "main.js", "reframeProbe": run_id,
    }, indent=2) + "\n").encode("utf-8")
    return files, stage


def verify_source_pin():
    path = PROJECT / ".research" / "slopbro-21023d5" / "wwwroot" / "index.html"
    expected = "0430d93c45885de73ba5f3e2f32b1e4ef9e713234de818162f0cb8ac20a1ff36"
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise RuntimeError("Reviewed upstream launch source is missing or differs from its pin")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="actually launch the limited service probe")
    parser.add_argument("--host", default="192.168.40.124")
    parser.add_argument("--app", choices=APPS, default="adoverlayex")
    args = parser.parse_args()
    address = ipaddress.ip_address(args.host)
    if address.version != 4 or not address.is_private or address.is_loopback:
        parser.error("host must be the TV's private LAN IPv4 address")
    verify_source_pin()
    run_id = secrets.token_hex(12)
    app_id = "com.webos.app." + args.app
    folder = PROJECT / ".research" / ("root-identity-" + run_id)
    folder.mkdir()
    if not args.execute:
        files, stage = render(run_id, "http://127.0.0.1:0/" + run_id + "/", app_id)
        for name, data in files.items():
            (folder / name).write_bytes(data)
        print("Prepared inert review files in", folder.name)
        print("No server, TV connection, or exploit execution. TV staging path would be", stage)
        return

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect((args.host, 9922))
        local_ip = route.getsockname()[0]
    events = []
    identity = {}
    identity_received = threading.Event()
    page_failed = threading.Event()
    files = {}
    prefix = "/" + run_id + "/"

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *unused):
            pass

        def allowed(self):
            parts = urlsplit(self.path)
            return (self.client_address[0] == args.host and not parts.query and
                    parts.path.startswith(prefix))

        def do_GET(self):
            if not self.allowed():
                self.send_error(404)
                return
            name = urlsplit(self.path).path[len(prefix):]
            if name not in files:
                self.send_error(404)
                return
            events.append({"event": "served", "file": name})
            data = files[name]
            self.send_response(200)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Type", "text/html; charset=utf-8" if name.endswith("html") else
                             "application/json" if name.endswith("json") else "application/javascript")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            name = urlsplit(self.path).path[len(prefix):]
            if not self.allowed() or name not in ("page", "result"):
                self.send_error(404)
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 32768:
                    raise ValueError("Invalid result size")
                report = json.loads(self.rfile.read(size))
                if not isinstance(report, dict):
                    raise ValueError("Invalid result")
                if name == "result":
                    if (report.get("runId") != run_id or report.get("kind") != "identity-only" or
                            type(report.get("uid")) is not int or type(report.get("euid")) is not int):
                        raise ValueError("Unexpected identity result")
                    if identity_received.is_set():
                        raise ValueError("Duplicate identity result")
                    identity.update(report)
                events.append({"event": name, "report": report})
            except (ValueError, UnicodeError):
                self.send_error(400)
                return
            self.send_response(204)
            self.end_headers()
            if name == "result":
                identity_received.set()
            elif report.get("phase") == "failed":
                page_failed.set()

    server = HTTPServer((local_ip, 0), Handler)
    original_get_request = server.get_request

    def bounded_request():
        connection, peer = original_get_request()
        connection.settimeout(5)
        return connection, peer

    server.get_request = bounded_request
    base_url = "http://%s:%s%s" % (local_ip, server.server_address[1], prefix)
    files, stage = render(run_id, base_url, app_id)
    for name, data in files.items():
        (folder / name).write_bytes(data)
    (folder / "manifest.json").write_text(json.dumps({
        "upstream_pin": PIN, "run_id": run_id, "staging_directory": stage,
        "sha256": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()},
    }, indent=2) + "\n", encoding="utf-8")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    ssh = [r"C:\Windows\System32\OpenSSH\ssh.exe", "-T", "-o", "BatchMode=yes",
           "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=" +
           str(PROJECT / "docs" / "fingerprint-ssh-known-hosts.txt"),
           "-o", "HostKeyAlgorithms=+ssh-rsa", "-o", "PubkeyAcceptedAlgorithms=+ssh-rsa",
           "-o", "ConnectTimeout=10", "-i", str(Path.home() / ".ssh" / "reframe-tv_dec"),
           "-p", "9922", "prisoner@" + args.host]

    def launch(target, params=None):
        payload = {"id": target}
        if params:
            payload["params"] = params
        command = ("(sleep 7) | /usr/bin/luna-send-pub -i -n 1 -w 6000 -f "
                   "luna://com.webos.applicationManager/launch " +
                   shlex.quote(json.dumps(payload, separators=(",", ":"))))
        result = subprocess.run(ssh + [command], capture_output=True, text=True, timeout=20)
        response = json.loads(result.stdout) if result.stdout.strip() else {}
        events.append({"event": "app-launch", "id": target, "exit_code": result.returncode,
                       "response": response, "stderr": result.stderr.strip()})
        if result.returncode or response.get("returnValue") is not True:
            raise RuntimeError("App launch was not confirmed: " + target)

    try:
        print("Launching one identity-only probe via", app_id, flush=True)
        print("No HBC, installer, startup change, kernel exploit, or reboot is included.", flush=True)
        launch(app_id, {APPS[args.app]: base_url + "probe.html"})
        deadline = time.monotonic() + 40
        while not identity_received.is_set() and time.monotonic() < deadline:
            if page_failed.is_set():
                # A service reply can fail while an already-started module is reporting.
                if identity_received.wait(3):
                    break
                break
            identity_received.wait(0.25)
        if identity_received.is_set():
            print("Process identity:", json.dumps({key: identity.get(key) for key in (
                "uid", "euid", "pid", "ownsProcess", "cleanup", "hostView")}), flush=True)
        else:
            print("No process identity received; root is NOT established.", flush=True)
            for event in events:
                if event["event"] == "page":
                    report = event["report"]
                    print("Page phase:", report.get("phase"), report.get("error", ""), flush=True)
        time.sleep(3)
    finally:
        try:
            launch("com.reframe.home")
            print("Reframe restored.", flush=True)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=6)
            target = PROJECT / "docs" / ("fingerprint-root-identity-" + run_id + ".txt")
            target.write_text(json.dumps({"run_id": run_id, "stage": stage,
                "identity": identity, "events": events}, indent=2) + "\n", encoding="utf-8")
            print("Probe server stopped; private results saved to", target.name, flush=True)
    if not identity_received.is_set():
        raise SystemExit(2)
    if identity.get("uid") != 0 or identity.get("euid") != 0:
        raise SystemExit(3)
    if not identity.get("ownsProcess") or not identity.get("cleanup", {}).get("removedDirectory"):
        print("Identity received, but process ownership/cleanup is incomplete; stop before further changes.")
        raise SystemExit(4)


if __name__ == "__main__":
    main()
