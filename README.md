# Reframe

A lightweight, personalized, ad-free launcher for an LG smart TV, with a clock,
greeting, weather, and an app/input grid controlled by the remote's D-pad.
Built with TypeScript and Vite, without a UI framework.

Target: **LG 55UA7050PUB**, webOS TV Lite 10.3.0 / webOS 25, firmware 33.30.97.

## Current status

As of 2026-10-21, **authenticated root SSH and automatic Reframe startup are
working on this exact TV**. HBC 0.7.3 executes as root. A controlled restart
returned root SSH and the launcher with LG Developer Mode uninstalled and its
session startup absent; the directory marker survived. Reframe followed the
initial HDMI 2 screen automatically. The owner also confirmed final
post-transition standby/wake and all requested native/playback/iPhone casting
checks pass. See the [current handoff](docs/HANDOFF.md).

Version **0.3.0** adds a scenic blue-hour coastal background and 32 installed
apps across Watch, Listen & Play and Explore shelves, plus TV/input controls.
Navigation uses real button focus, remembered shelf positions and bounded
scroll easing. All artwork is bundled for offline use. See the
[collection, interaction checks and preview](docs/LIBRARY-REFRESH.md).

The owner will choose which of these apps stay on Home versus a future More
Apps view after trying the full collection. The native launch bridge and
root/boot/wake setup are unchanged. App/cast exit still returns to native LG Home,
and startup briefly shows a native screen before Reframe; these separate UX
changes remain in [next-session notes](docs/NEXT-SESSION.md).

Launcher-only undo/reinstall and session-marker undo were demonstrated live.
Private original-state/LG package backups are hash-verified; complete unroot
and firmware rescue are not established. No signed firmware partition or LG
startup script was patched. See [launcher behavior and undo](docs/LAUNCH-PERSISTENCE.md),
[session independence](docs/SESSION-INDEPENDENCE.md) and
[recovery](docs/ROOT-RECOVERY.md). Weather is hidden until a real location is configured.

## Develop

Requires Node.js/npm (Node 22+ for the manual inspector check). Run from the project directory:

```bash
npm ci
npm run dev        # http://localhost:5173; arrow keys / Enter simulate the remote
npm run build      # TypeScript check and production build into dist/
npm test           # bridge, root controls and launcher regression tests; no TV access
```

The Vite development server listens on the LAN for TV previewing. Desktop app
launches are simulated; native requests are used on the TV. A missing bridge
on a detected TV raises an error instead of simulating success.

## Package and deploy

**This TV now uses dedicated root SSH on port 2222.** Build/package locally,
then use the validated root deployment controller:

```bash
npm run build
ares-package dist -o .
python scripts/deploy-root.py com.reframe.home_0.3.0_all.ipk       # local validation
python scripts/deploy-root.py com.reframe.home_0.3.0_all.ipk --execute
```

It uses the existing external root key and strict host pin, validates the
Reframe-only package, preserves the previous local package in ignored backups,
verifies upload/installed file hashes and version, launches Reframe and cleans
only its upload stage. This route was exercised live for 0.2.0. Do not reinstall
LG Developer Mode alongside the session-independent rooted setup.

The older Bash deployment and inspector commands below document developer SSH
9922, which is retired. Use the root controller above for this TV; the inspector
workflow still needs a separate migration.

### Earlier developer transport

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
  original risk review and staged preparation; read the current handoff first.
- [System compatibility](docs/SYSTEM-COMPATIBILITY.md): native functionality and
  casting baseline, plus repeat checks required after later integration stages.

`src/core/` contains configuration, remote focus, and TV service helpers;
`src/widgets/` contains the clock, greeting, and weather; `src/launcher/`
contains the tiles. Styling lives in `src/styles.css` and uses a 4K layout.
`scripts/` contains app tools and explicitly selected root/persistence
controllers. Mutations require `--execute`; some diagnostics pair with the TV
or change foreground. Do not run TV controllers as part of a local build.

## Local-only files

Git excludes dependencies, generated builds/packages, raw `docs/fingerprint*.txt`
logs/inventories/pairing files, `.research/` downloads, `/backups/`, private-key
formats, local environment files, and OS caches. These remain on this machine;
a GitHub source checkpoint does not back up the TV or provide firmware recovery.
Share sanitized findings rather than raw fingerprints, which can contain serial
numbers, MAC addresses, unique device IDs, or credentials.
