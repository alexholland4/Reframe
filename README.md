# Reframe

A lightweight, personalized, ad-free launcher for an LG smart TV, with a clock,
greeting, weather, and an app/input grid controlled by the remote's D-pad.
Built with TypeScript and Vite, without a UI framework.

Target: **LG 55UA7050PUB**, webOS TV Lite 10.3.0 / webOS 25, firmware 33.30.97.

## Current status

As of 2026-10-20, the app builds, packages, and has been installed and launched
as a Developer Mode app. **Rooting, boot persistence, and Home-button takeover
have not been performed.**

Version **0.1.1** uses the TV's native service bridge directly, without requiring
webOSTV.js. Detected TVs never fall back to mock launches. Settings, YouTube,
HDMI 1, and HDMI 2 tiles returned successful native launch replies on this TV;
playback, input signal, physical remote keys, and iPhone casting still need
manual verification. The unavailable Spotify placeholder was replaced with
Settings. Back now uses the platform's normal handling. Weather coordinates
remain placeholders. See [bridge validation](docs/BRIDGE-VALIDATION.md).

Settings, streaming-app playback, HDMI/Live TV, and the owner's iPhone Screen
Mirroring, AirPlay playback, and YouTube Cast must remain usable throughout
future work. Root research is promising but compatibility and rollback on this
exact TV are unverified.

## Develop

Requires Node.js/npm (Node 22+ for the manual inspector check). Run from the project directory:

```bash
npm ci
npm run dev        # http://localhost:5173; arrow keys / Enter simulate the remote
npm run build      # TypeScript check and production build into dist/
npm test           # native bridge regression tests; no TV access
```

The Vite development server listens on the LAN for TV previewing. Desktop app
launches are simulated; native requests are used on the TV. A missing bridge
on a detected TV raises an error instead of simulating success.

## Package and deploy

Install LG's webOS CLI for the local `ares-package` command, and configure
Developer Mode and SSH as described in [Phase 0](docs/PHASE-0-SETUP.md).
On this TV, `ares-install`, `ares-launch`, and `ares-shell` failed SSH
authentication. Use the existing OpenSSH deployment script from Git Bash:

```bash
npm run package                     # local build and .ipk packaging only
bash scripts/deploy.sh --no-build    # installs and launches the newest .ipk
# Or build, package, install, and launch together:
bash scripts/deploy.sh
```

This script changes the installed Reframe app and foreground application. It
sends one install request and one launch request, checks the replies, and
verifies the installed app version. It does not root the TV or install a
Home/boot hook. It uses the local developer
SSH key (`REFRAME_KEY` overrides the default) and a project-local known-hosts
file (`REFRAME_KNOWN_HOSTS` overrides it). First-use host trust is recorded;
subsequent connections reject a changed host key. Verify the TV identity when
establishing that first trust. Do not commit SSH keys or pairing files.

The npm `install:tv`/`launch:tv` shortcuts still use ares and are not the working
deployment path for this unit. An OpenSSH uninstall procedure has not been
validated; do not use Developer Mode removal as a proposed root rollback.

## Manual TV launch check

Only run while the TV is available: this opens Settings, YouTube, and HDMI 1/2
from Reframe and restores Reframe afterward, using its developer inspector.
It creates a loopback SSH tunnel and removes its temporary in-page observer.
No root or persistent system changes are involved.

```bash
node scripts/check-tv-launches.mjs
node scripts/check-tv-launches.mjs --only settings
```

The default uses the saved developer key and host trust file. `--host` and
`--key` override the target/key. This tool checks launch replies, not actual
playback or casting. Logs go to ignored `docs/fingerprint-launches-*.txt`.

## Project notes

- [Handoff](docs/HANDOFF.md): current state, hardware facts, known issues.
- [Root investigation](docs/ROOT-INVESTIGATION.md): measured evidence and limits.
- [Root attempt plan](docs/ROOT-ATTEMPT-PLAN.md): persistent effects, risks, and
  preparation required before an attempt; nothing has been executed.
- [System compatibility](docs/SYSTEM-COMPATIBILITY.md): native functionality and
  casting acceptance checks, all still pending.

`src/core/` contains configuration, remote focus, and TV service helpers;
`src/widgets/` contains the clock, greeting, and weather; `src/launcher/`
contains the tiles. Styling lives in `src/styles.css` and uses a 4K layout.
`scripts/` contains deployment and diagnostic tools. Diagnostic scripts can
create TV pairing relationships or temporarily launch apps; they are not root
installers. Do not run them as part of an ordinary local build.

## Local-only files

Git excludes dependencies, generated builds/packages, raw `docs/fingerprint*.txt`
logs/inventories/pairing files, `.research/` downloads, `/backups/`, private-key
formats, local environment files, and OS caches. These remain on this machine;
a GitHub source checkpoint does not back up the TV or provide firmware recovery.
Share sanitized findings rather than raw fingerprints, which can contain serial
numbers, MAC addresses, unique device IDs, or credentials.
