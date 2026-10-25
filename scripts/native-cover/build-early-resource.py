"""Build a private early-loader image from the reviewed native snapshot."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

PROJECT = Path(__file__).absolute().parents[2]
NAME = "com.reframe.nativecover"
DOMAINS = ["snu.lge.com", "su-dev.lge.com", "su.lge.com", "su-ssl.lge.com"]


def build(builder):
    root = PROJECT / ".research/early-cover-build"
    payload = root / "payload"
    cover = payload / "usr/lib/qml/CoverUI"
    original = json.loads((PROJECT / "backups/native-cover/original.json").read_text(encoding="utf-8"))
    hosts = json.loads((PROJECT / ".research/native-analysis/original-hosts.json").read_text())
    before = base64.b64decode(hosts["base64"])
    if b"Reframe firmware" in before or len(before) > 16384:
        raise ValueError("Review the original hosts snapshot")
    spec = importlib.util.spec_from_file_location("cover_patch", PROJECT / "scripts/native-cover/patch-cover.py")
    patcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patcher)
    for item in original["files"]:
        if item["name"].startswith("/") or ".." in item["name"].split("/"):
            raise ValueError("Unexpected original path")
        path = cover / item["name"]
        path.parent.mkdir(parents=True, exist_ok=True)
        data = base64.b64decode(item["base64"])
        if hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise ValueError("Original snapshot hash mismatch")
        if item["name"] == "UserInterfaceLayer/Containers/MainView.qml":
            data = patcher.patch(data.decode("utf-8")).encode("utf-8")
        path.write_bytes(data)
    (cover / "UserInterfaceLayer/Containers/PersonalMark.qml").write_bytes(
        (PROJECT / "scripts/native-cover/PersonalMark.qml").read_bytes())
    hosts_path = payload / "etc/hosts"
    hosts_path.parent.mkdir(parents=True, exist_ok=True)
    hosts_path.write_bytes(before.rstrip(b"\n") + b"\n\n# Reframe firmware servers only; app updates unchanged\n"
                           + ("127.0.0.1 " + " ".join(DOMAINS) + "\n::1 " + " ".join(DOMAINS) + "\n").encode())
    package = {"id": NAME, "version": "1.0.0", "filePaths": ["/usr/lib/qml/CoverUI", "/etc/hosts"]}
    metadata = payload / "usr/palm/packages" / NAME / "packageinfo.json"
    metadata.parent.mkdir(parents=True, exist_ok=True)
    metadata.write_text(json.dumps(package), encoding="utf-8")
    image = root / "data.img"
    subprocess.run([str(builder), "-D", str(payload), "-c", "gzip", "--all-root", "-f", str(image)],
                   check=True, capture_output=True)
    files = {p.relative_to(payload).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in payload.rglob("*") if p.is_file()}
    if len(files) != 58:
        raise ValueError("Unexpected payload inventory")
    manifest = {"schema": 1, "purpose": "reframe-early-cover-build", "files": files,
                "imageSha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                "hostsBeforeSha256": hashlib.sha256(before).hexdigest(), "domains": DOMAINS}
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("Built private early-loader resource:", len(files), "files;", image.stat().st_size, "image bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--builder", required=True, type=Path)
    build(parser.parse_args().builder)
