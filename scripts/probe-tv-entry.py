#!/usr/bin/env python3
"""Load the project's diagnostic page in one existing TV app.

Serves only probe.html, whose actions are read-only queries and app cleanup.
Uses the existing SSH key to launch/close a selected app. No root installer,
downloads, or jsserver execution calls.
"""

import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import ipaddress
import json
from pathlib import Path
import secrets
import shlex
import socket
import subprocess
import threading
import time
from urllib.parse import parse_qs, urlsplit


PROJECT = Path(__file__).absolute().parent.parent
APPS = {
    "adoverlayex": "interactiveUrl",
    "adoverlay": "interactiveUrl",
    "acroverlay": "contentTarget",
    "tinybrowser": "contentTarget",
    "dangbei-overlay": "target",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", choices=APPS, default="adoverlayex")
    parser.add_argument("--host", default="192.168.40.124")
    parser.add_argument("--wait", type=int, default=30, choices=range(10, 61), metavar="10..60")
    args = parser.parse_args()
    address = ipaddress.ip_address(args.host)
    if address.version != 4 or not address.is_private or address.is_loopback:
        parser.error("host must be the TV's private LAN IPv4 address")
    app_id = "com.webos.app." + args.app
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect((args.host, 9922))
        local_ip = route.getsockname()[0]
    page = (PROJECT / "scripts" / "tv-diagnostics" / "probe.html").read_bytes()
    token = secrets.token_urlsafe(24)
    events = []
    finished = threading.Event()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *values):
            # Do not put the per-run token or untrusted response text in access logs.
            pass

        def authorized(self):
            return (self.client_address[0] == args.host and
                    parse_qs(urlsplit(self.path).query).get("token") == [token])

        def do_GET(self):
            if not self.authorized() or urlsplit(self.path).path != "/probe.html":
                self.send_error(404)
                return
            events.append({"event": "page_requested"})
            print("TV requested the diagnostic page.", flush=True)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(page)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(page)

        def do_POST(self):
            if not self.authorized() or urlsplit(self.path).path != "/result":
                self.send_error(404)
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 16384:
                    raise ValueError("Invalid diagnostic length")
                report = json.loads(self.rfile.read(size))
                if not isinstance(report, dict) or report.get("phase") not in ("loaded", "finished"):
                    raise ValueError("Invalid diagnostic report")
            except (ValueError, UnicodeError):
                self.send_error(400)
                return
            events.append({"event": "page_report", "report": report})
            self.send_response(204)
            self.end_headers()
            print(json.dumps(report, ensure_ascii=True), flush=True)
            if report["phase"] == "finished":
                finished.set()

    server = HTTPServer((local_ip, 0), Handler)
    # Bound reads from a broken/malicious connection, so shutdown can complete.
    original_get_request = server.get_request

    def bounded_connection():
        connection, peer = original_get_request()
        connection.settimeout(5)
        return connection, peer

    server.get_request = bounded_connection
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    url = f"http://{local_ip}:{port}/probe.html?token={token}&app={app_id}"
    ssh = [
        r"C:\Windows\System32\OpenSSH\ssh.exe", "-T",
        "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
        "-o", "UserKnownHostsFile=" + str(PROJECT / "docs" / "fingerprint-ssh-known-hosts.txt"),
        "-o", "HostKeyAlgorithms=+ssh-rsa", "-o", "PubkeyAcceptedAlgorithms=+ssh-rsa",
        "-o", "ConnectTimeout=10", "-o", "ConnectionAttempts=1",
        "-i", r"C:\Users\holla\.ssh\reframe-tv_dec",
        "-p", "9922", "prisoner@" + args.host,
    ]

    def app_call(method, payload):
        remote = (
            "/usr/bin/luna-send-pub -w 3000 -n 1 -f "
            "luna://com.webos.applicationManager/" + method + " " +
            shlex.quote(json.dumps(payload, separators=(",", ":")))
        )
        result = subprocess.run(ssh + [remote], capture_output=True, text=True, timeout=20)
        text = result.stdout.strip()
        # The launch reply contains the URL/token on some versions; keep it local.
        events.append({"event": method, "exit_code": result.returncode,
                       "stdout": text, "stderr": result.stderr.strip()})
        if result.returncode:
            raise RuntimeError(f"SSH {method} failed: {result.stderr.strip()}")
        try:
            response = json.loads(text)
        except ValueError:
            response = {}
        print(f"{method}: " + json.dumps({
            key: response[key] for key in ("returnValue", "errorCode", "errorText", "id") if key in response
        }), flush=True)
        return response

    launched = False
    completed = False
    try:
        print(f"Serving the read-only page on {local_ip}:{port}; launching {app_id}.", flush=True)
        response = app_call("launch", {"id": app_id, "params": {APPS[args.app]: url}})
        launched = response.get("returnValue") is True
        if response.get("returnValue") is False:
            raise RuntimeError("TV rejected the diagnostic app launch")
        completed = finished.wait(args.wait)
        if not completed:
            print("No completed page report within the observation window.", flush=True)
        if not events or not any(event["event"] == "page_requested" for event in events):
            print("No diagnostic-page HTTP request was observed.", flush=True)
        if not completed:
            raise RuntimeError("Diagnostic did not complete; inspect the saved log before retrying")
    finally:
        try:
            if launched:
                if completed:
                    # The page requests its own window.close() after receipt.
                    time.sleep(2)
                else:
                    app_call("closeByAppId", {"id": app_id})
                command = "ps -ef | grep -- '[a]pp-id=" + app_id + "'"
                result = subprocess.run(ssh + [command], capture_output=True, text=True, timeout=20)
                events.append({"event": "process_check", "exit_code": result.returncode,
                               "stdout": result.stdout.strip(), "stderr": result.stderr.strip()})
                if result.returncode == 1 and not result.stdout.strip() and not result.stderr.strip():
                    print("No matching diagnostic app process remains in the visible process list.", flush=True)
                elif result.returncode == 0:
                    print("The diagnostic app still appears in the process list.", flush=True)
                else:
                    print("Could not verify diagnostic app process cleanup.", flush=True)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=6)
            target = PROJECT / "docs" / ("fingerprint-entry-" + args.app + "-" +
                                         time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + ".txt")
            target.write_text(json.dumps({"app": app_id, "events": events}, indent=2) + "\n", encoding="utf-8")
            print(f"Server stopped. Results saved to {target.name}.", flush=True)


if __name__ == "__main__":
    main()
