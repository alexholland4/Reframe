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
#   - luna-send-pub exits early when stdin closes. Keep its input open for a
#     bounded interval and request one reply. Do not use benchmark mode (-t),
#     which repeats mutating requests.
#
# Usage: bash scripts/deploy.sh [--no-build]
set -euo pipefail

TV_HOST="${REFRAME_HOST:-192.168.40.124}"
TV_PORT="9922"
TV_USER="prisoner"
TV_KEY="${REFRAME_KEY:-$HOME/.ssh/reframe-tv_dec}"   # decrypted dev key
APP_ID="com.reframe.home"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

KNOWN_HOSTS="${REFRAME_KNOWN_HOSTS:-$PROJECT_ROOT/docs/fingerprint-ssh-known-hosts.txt}"
# Record first-use trust locally; reject changes to a previously saved host key.
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$KNOWN_HOSTS" \
  -o ConnectTimeout=10 -o HostKeyAlgorithms=+ssh-rsa \
  -o PubkeyAcceptedAlgorithms=+ssh-rsa -i "$TV_KEY")
ssh_tv() { ssh "${SSH_OPTS[@]}" -p "$TV_PORT" "$TV_USER@$TV_HOST" "$@"; }

if [[ ! -f "$TV_KEY" ]]; then
  echo "Dev key not found at $TV_KEY." >&2
  echo "Fetch it: ares-novacom --device reframe-tv --getkey  (passphrase from the Dev Mode app)," >&2
  echo "then decrypt a copy: ssh-keygen -p -P <passphrase> -N '' -f <copy>" >&2
  exit 1
fi

if [[ "${1:-}" != "--no-build" ]]; then
  echo "==> build + package"
  ( cd "$PROJECT_ROOT" && npm run build >/dev/null && ares-package dist -o . >/dev/null )
fi

IPK="$(cd "$PROJECT_ROOT" && ls -t ${APP_ID}_*.ipk 2>/dev/null | head -n1)"
[[ -n "$IPK" ]] || { echo "no ipk found; run without --no-build" >&2; exit 1; }
echo "==> ipk: $IPK"

echo "==> copy to TV"
scp "${SSH_OPTS[@]}" -P "$TV_PORT" "$PROJECT_ROOT/$IPK" "$TV_USER@$TV_HOST:/media/developer/temp/" >/dev/null

# A failed or empty reply must fail deployment, not look like a successful app.
check_success() {
  node -e 'const fs = require("fs");
    try {
      const reply = JSON.parse(fs.readFileSync(0, "utf8"));
      if (reply.returnValue !== true) throw new Error(JSON.stringify(reply));
    } catch (error) { console.error("TV request failed: " + error.message); process.exit(1); }'
}

EXPECTED_VERSION=$(node -e 'const fs = require("fs"); console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).version)' "$PROJECT_ROOT/public/appinfo.json")

echo "==> install (one request)"
ssh_tv "(sleep 8) | /usr/bin/luna-send-pub -i -w 7000 -n 1 -f luna://com.webos.appInstallService/dev/install \
  '{\"id\":\"$APP_ID\",\"ipkUrl\":\"/media/developer/temp/$IPK\",\"subscribe\":true}'" | check_success

INSTALLED_VERSION=$(ssh_tv "cat /media/developer/apps/usr/palm/applications/$APP_ID/appinfo.json" | \
  node -e 'const fs = require("fs"); console.log(JSON.parse(fs.readFileSync(0, "utf8")).version)')
if [[ "$INSTALLED_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "Installed version $INSTALLED_VERSION differs from expected $EXPECTED_VERSION; stop before launch." >&2
  exit 1
fi
echo "INSTALLED $INSTALLED_VERSION"

echo "==> launch (one request)"
ssh_tv "(sleep 7) | /usr/bin/luna-send-pub -i -w 6000 -n 1 -f luna://com.webos.applicationManager/launch \
  '{\"id\":\"$APP_ID\"}'" | check_success
echo "LAUNCH ACCEPTED"
