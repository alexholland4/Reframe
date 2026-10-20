#!/usr/bin/env bash
#
# deploy.sh — build, package, install, and launch Reframe on the TV.
#
# Why this exists instead of `ares-install`:
#   - This TV's SSH only offers legacy ssh-rsa host/pubkey algorithms, which the
#     ares CLI's bundled SSH stack (node ssh2) refuses — ares-install fails with
#     "All configured authentication methods failed". OpenSSH works if we opt
#     back into the legacy algorithms explicitly.
#   - On this "webOS TV Lite" build, /usr/bin/luna-send is root-only (rwx------),
#     so we drive installs through the world-executable /usr/bin/luna-send-pub,
#     exactly as the ares CLI config (command-service.json) does.
#   - luna-send-pub over a non-interactive SSH exec returns before the async
#     reply unless kept alive; `-t N` runs the call N times (a benchmark count,
#     NOT a timeout), which both keeps it alive and lets the first real reply
#     through. We parse the first meaningful payload.
#
# Usage: bash scripts/deploy.sh [--no-build]
set -euo pipefail

HOST="192.168.40.124"
PORT="9922"
USER="prisoner"
KEY="${REFRAME_KEY:-$HOME/.ssh/reframe-tv_dec}"   # decrypted dev key
APP_ID="com.reframe.home"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

KNOWN_HOSTS="${REFRAME_KNOWN_HOSTS:-$ROOT/docs/fingerprint-ssh-known-hosts.txt}"
# Record first-use trust locally; reject changes to a previously saved host key.
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$KNOWN_HOSTS" \
  -o ConnectTimeout=10 -o HostKeyAlgorithms=+ssh-rsa \
  -o PubkeyAcceptedAlgorithms=+ssh-rsa -i "$KEY")
ssh_tv() { ssh "${SSH_OPTS[@]}" -p "$PORT" "$USER@$HOST" "$@"; }

if [[ ! -f "$KEY" ]]; then
  echo "Dev key not found at $KEY." >&2
  echo "Fetch it: ares-novacom --device reframe-tv --getkey  (passphrase from the Dev Mode app)," >&2
  echo "then decrypt a copy: ssh-keygen -p -P <passphrase> -N '' -f <copy>" >&2
  exit 1
fi

if [[ "${1:-}" != "--no-build" ]]; then
  echo "==> build + package"
  ( cd "$ROOT" && npm run build >/dev/null && ares-package dist -o . >/dev/null )
fi

IPK="$(cd "$ROOT" && ls -t ${APP_ID}_*.ipk 2>/dev/null | head -n1)"
[[ -n "$IPK" ]] || { echo "no ipk found; run without --no-build" >&2; exit 1; }
echo "==> ipk: $IPK"

echo "==> copy to TV"
scp "${SSH_OPTS[@]}" -P "$PORT" "$ROOT/$IPK" "$USER@$HOST:/media/developer/temp/" >/dev/null

# luna-send-pub returns before the async reply unless kept alive; `-t N` repeats
# the call N times (keeps the process alive long enough for replies). We don't
# parse the noisy stream — the filesystem and `ps` are the reliable oracles.
echo "==> install"
ssh_tv "/usr/bin/luna-send-pub -t 40 -f luna://com.webos.appInstallService/dev/install \
  '{\"id\":\"$APP_ID\",\"ipkUrl\":\"/media/developer/temp/$IPK\",\"subscribe\":true}' >/dev/null 2>&1; \
  sleep 3; \
  test -f /media/developer/apps/usr/palm/applications/$APP_ID/index.html \
    && echo INSTALLED || echo INSTALL_FAILED"

echo "==> launch"
ssh_tv "/usr/bin/luna-send-pub -t 8 -f luna://com.webos.applicationManager/launch \
  '{\"id\":\"$APP_ID\"}' >/dev/null 2>&1; sleep 1; \
  ps -ef 2>/dev/null | grep -- '--app-id=$APP_ID' | grep -qv grep \
    && echo RUNNING || echo NOT_RUNNING"
