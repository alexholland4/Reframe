#!/usr/bin/env bash
#
# fingerprint-tv.sh — READ-ONLY hardware/OS fingerprint of a webOS TV.
#
# Usage:  bash scripts/fingerprint-tv.sh <device-name>
#   where <device-name> is the name registered with ares-setup-device.
#
# This script ONLY reads system information over the Developer Mode shell.
# It writes NOTHING to the TV. Output is saved locally to docs/fingerprint-<date>.txt.
#
set -euo pipefail

DEVICE="${1:-}"
if [[ -z "$DEVICE" ]]; then
  echo "usage: bash scripts/fingerprint-tv.sh <device-name>" >&2
  exit 1
fi

if ! command -v ares-shell >/dev/null 2>&1; then
  echo "ares-shell not found. Install the CLI first:  npm install -g @webos-tools/cli" >&2
  exit 1
fi

OUT="docs/fingerprint-$(date +%Y%m%d).txt"
mkdir -p docs

# Read-only probes. Each is harmless; missing files are tolerated.
read -r -d '' REMOTE <<'EOF' || true
echo "===== uname ====="; uname -a 2>/dev/null || true
echo "===== /proc/version ====="; cat /proc/version 2>/dev/null || true
echo "===== cpu / soc ====="; cat /proc/cpuinfo 2>/dev/null || true
echo "===== webos-release ====="; cat /etc/webos-release 2>/dev/null || true
echo "===== starfish-release ====="; cat /etc/starfish-release 2>/dev/null || true
echo "===== os-release ====="; cat /etc/os-release 2>/dev/null || true
echo "===== device_info ====="; cat /var/run/nyx/device_info.json 2>/dev/null || true
echo "===== os_info ====="; cat /var/run/nyx/os_info.json 2>/dev/null || true
echo "===== memory ====="; cat /proc/meminfo 2>/dev/null | head -n 3 || true
EOF

echo "Fingerprinting device '$DEVICE' (read-only)..."
{
  echo "# Reframe TV fingerprint — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# device alias: $DEVICE"
  echo
  ares-shell --device "$DEVICE" --run "$REMOTE"
} | tee "$OUT"

echo
echo "Saved to $OUT — paste its contents back for analysis."
