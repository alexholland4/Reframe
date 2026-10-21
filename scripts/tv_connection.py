"""Pinned local TV transports. Credentials and trust pins remain outside Git."""
import json
from pathlib import Path
import shlex
import subprocess

PROJECT = Path(__file__).absolute().parent.parent
HOST = "192.168.40.124"


def ssh(command, input=None, timeout=30, root=True):
    pin = PROJECT / "docs" / ("fingerprint-root-ssh-known-hosts.txt" if root else "fingerprint-ssh-known-hosts.txt")
    options = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "UserKnownHostsFile=" + str(pin), "-o", "ConnectTimeout=8"]
    if not root:
        options += ["-o", "HostKeyAlgorithms=+ssh-rsa", "-o", "PubkeyAcceptedAlgorithms=+ssh-rsa"]
    options += ["-i", str(Path.home() / ".ssh" / ("reframe-root_ed25519" if root else "reframe-tv_dec")),
                "-p", "2222" if root else "9922", ("root" if root else "prisoner") + "@" + HOST]
    return subprocess.run([r"C:\Windows\System32\OpenSSH\ssh.exe", "-T", *options, command],
                          input=input, capture_output=True, text=True, timeout=timeout)


def luna(uri, payload, root=True, seconds=5):
    command = "(sleep %d) | /usr/bin/%s -i -n 1 -w %d -f %s %s" % (
        seconds, "luna-send" if root else "luna-send-pub", (seconds - 1) * 1000,
        shlex.quote(uri), shlex.quote(json.dumps(payload, separators=(",", ":"))))
    result = ssh(command, root=root, timeout=seconds + 12)
    if result.returncode:
        raise RuntimeError("TV request failed: " + result.stderr.strip())
    reply = json.loads(result.stdout)
    if reply.get("returnValue") is not True:
        raise RuntimeError("TV rejected request: " + json.dumps(reply))
    return reply
