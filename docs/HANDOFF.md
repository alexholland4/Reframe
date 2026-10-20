# Reframe — Project Handoff

_Last updated: 2026-10-20. Written so a new coding agent can pick up the work
without the original conversation._

**Git checkpoint preparation, 2026-10-20:** The owner requested a reviewed
source/docs checkpoint on GitHub before rooting. The repository already had a
minimal initial commit; this checkpoint adds the app, diagnostic scripts, and
sanitized investigation/compatibility notes. Raw fingerprints, pairing/trust
files, keys, packages/builds, research downloads, backups, and OS caches stay
local. README now reflects the bridge blocker and working deployment route.
Deployment now records first-use host trust and rejects changed host keys;
that script adjustment has not been exercised against the TV in this pass.
Validation for this checkpoint: TypeScript and Vite production build passed;
Python/JSON/shell syntax, local Markdown links, secret checks, and ignore-rule
checks passed. Native TV/casting checks remain pending.
No TV actions are part of this checkpoint. Next: fix/verify the app bridge,
record the native/iPhone casting baseline, then prepare staged root/rollback.

**System compatibility requirement, 2026-10-20:** The owner requires normal
Settings, native apps/playback, and casting to remain usable. See
[`SYSTEM-COMPATIBILITY.md`](SYSTEM-COMPATIBILITY.md) for the installed component
IDs, staged acceptance checks, remote escape requirement, and pending bridge
blocker. Corrected the source Settings helper to the inventoried
`com.palm.app.settings`; this source edit has not been deployed. No root or
Home interception has been installed. The owner uses an iPhone for Screen
Mirroring, AirPlay playback, and the
YouTube app Cast button. All three are required acceptance paths, to be tested
separately; no end-to-end casting result is claimed.

**Risk/undo follow-up, 2026-10-20:** The owner is conditionally willing to
proceed if risk is reasonable, prioritizing avoiding a brick and understanding
undo. No root installer has run. HBC 0.7.3 was downloaded and hashed locally for
inspection only. Its startup defaults include unauthenticated root telnet and a
persistent autostart activity. A tested rollback for this exact TV is still
missing. See the risk/undo section of `docs/ROOT-ATTEMPT-PLAN.md`; prepare a
backup/change journal and acquisition-stage stopping point before installation.

**Latest follow-up, 2026-10-20:** Paired inventory returned 165 apps. All five
SlopBro candidate apps loaded harmless diagnostic pages and exposed native
PalmServiceBridge with working read queries on this ATSC unit. Named-requester
permission introspection also denied a known-successful call, so it cannot be
used alone as a root compatibility verdict. Root itself has not been attempted.
Diagnostic servers were stopped and Reframe was relaunched. Exact upstream
source is pinned locally; see `docs/ROOT-ATTEMPT-PLAN.md` for the proposed next
stage and its persistent effects.

**Follow-up, 2026-10-19:** The owner reopened root research. Read
[`ROOT-INVESTIGATION.md`](ROOT-INVESTIGATION.md) for primary-source review and
fresh read-only TV measurements. Root is plausible but unverified on this exact
unit. Investigate SlopBro first, retaining Chronomaly as an alternative. No root
installer has been run.

---

## 1. What Reframe is

A lightweight, personalized, ad-free **home screen / launcher for the owner's LG
TV**. It shows a clock, greeting, weather, and a grid of app/input tiles, all
driven by the TV remote's D-pad. It is a plain web app packaged as a webOS
**Developer Mode** app (`com.reframe.home`).

**Owner:** Alex (the greeting is hard-coded to "Alex" in `src/core/config.ts`).

---

## 2. The TV — hard facts (measured on the device)

From a read-only probe over the Dev Mode SSH shell. The raw dump is in
`docs/fingerprint-20261019.txt` (**gitignored**: it contains the serial number,
MAC addresses and NDUID, so don't commit it or paste it anywhere public).

| Property | Value |
|---|---|
| Model / product id | **LG 55UA7050PUB** (`55UA7050PUB.BUSSLKR`), 55" 4K LCD, ATSC (US) |
| OS | **webOS TV Lite**, NOT full webOS. `webos_release 10.3.0`, core_os "Rockhopper" `10.3.0-1906`, codename `ponytail-papikonda`. Marketed as "webOS 25". |
| Firmware | `33.30.97` (build 2026-02-11), image `lib32-starfish-global-secured` |
| SoC / platform | chip **K25**, board `K25_ATSC`, platform `ptl4tv`, device_name `k25lp`, hardware_id `HE_DTV_W25P_AFADATAA` |
| CPU | 4× ARM Cortex-A73 (implementer 0x41, part 0xd09), aarch64 kernel; userland is **lib32** (32-bit) |
| Kernel | `5.4.268-294.ptl4tv.24` (built 2025-08-27) |
| RAM | **2 GB** nominal, ~1.75 GB visible, only ~100 MB free / ~400 MB available at idle |
| Storage | 8 GB eMMC |
| Boot security | dm-verity (`webos-verity`) over a **read-only squashfs rootfs**, `prodkey`-signed image, `portProtection` on the kernel cmdline |
| Network | IP **`192.168.40.124`** on the LAN (as of 2026-10-19, not guaranteed static) |

### Connecting to the TV

- Dev Mode SSH: **host `192.168.40.124`, port `9922`, user `prisoner`**.
- The TV only offers the **legacy `ssh-rsa`** host-key and pubkey algorithms.
  OpenSSH works only with:
  `-o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa`
- **`ares-install` / `ares-shell` (webOS CLI, ares v3.2.6 installed globally) fail
  to authenticate** ("All configured authentication methods failed") because
  their bundled node `ssh2` stack refuses ssh-rsa. **Don't use ares to talk to
  the TV.** Use `scripts/deploy.sh`, which uses OpenSSH. `ares-package` (local
  packaging only) works fine.
- Keys on this laptop:
  - `~/.ssh/reframe-tv_webos`: the encrypted dev key fetched from the TV
    (`ares-novacom --device reframe-tv --getkey`, passphrase from the Dev Mode
    app's Key Server).
  - `~/.ssh/reframe-tv_dec`: a **decrypted** copy (`ssh-keygen -p -P <passphrase>
    -N '' -f <copy>`). `deploy.sh` uses this by default (override with
    `REFRAME_KEY`).
- The ares device alias used in the docs is `reframe-tv`.
- Manual shell:
  ```bash
  ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \
      -i ~/.ssh/reframe-tv_dec -p 9922 prisoner@192.168.40.124
  ```

### On-device environment quirks (important)

- `/usr/bin/luna-send` is **root-only** (`rwx------`) on this TV Lite build. Use
  **`/usr/bin/luna-send-pub`** (world-executable), which is what the ares CLI's
  own `command-service.json` does.
- `luna-send-pub` over a non-interactive SSH exec **exits before the async
  reply arrives**. `-t N` repeats the call N times (it's a benchmark count,
  **not a timeout**), which keeps the process alive long enough. The output is
  noisy, so `deploy.sh` checks the filesystem and `ps` to verify results instead
  of parsing it.
- The `prisoner` role is **sandboxed on the Luna bus**. Privileged methods are
  denied, e.g. `applicationManager/getForegroundAppInfo` returns
  `Denied method call ... for category /`. `com.webos.service.config/getConfigs`
  (read) works.
- Writable paths: only `/media/developer/apps` and `/media/developer/temp`.
  `/media/developer` itself is root-owned.
- Installed app location:
  `/media/developer/apps/usr/palm/applications/com.reframe.home/`.
- App processes show up in `ps -ef` with `--app-id=com.reframe.home`.
- Dev Mode session lasts **~1000 hours** and must be renewed in the LG Developer
  Mode app. Dev Mode also turns itself off if the TV reboots 10 times while
  offline. The Key Server passphrase is shown in that app.

---

## 3. Key decisions & findings (the "why")

### 3.1 Phased roadmap
- **Phase 0**: safe setup + read-only hardware fingerprint. **DONE.** See
  `docs/PHASE-0-SETUP.md`.
- **Phase 1**: personalized launcher, no root. **Scaffolded, builds, deploys
  and runs on the TV.**
- **Phase 2**: more widgets/personalization, still no root. **Next.**
- **Phase 3**: boot persistence / Home-button takeover / debloat (needs root).
  **ROOT RESEARCH REOPENED.** The owner is conditionally willing to proceed if
  risk is reasonable, while requiring reversibility and normal functionality.
  No root execution or root persistence changes have been attempted; the
  preparation gates in `ROOT-ATTEMPT-PLAN.md` remain unmet. Debloat is out of scope.

### 3.2 Root: plausible; investigation reopened
- A firmware match alone remains insufficient, but Chronomaly's reported QNED
  entry shares our hardware/OTA identifier. The earlier claim that QNED meant
  a different platform was not established.
- Public documentation describes a rooted K25/webOS TV Lite UA73. Fresh
  measurements show several relevant kernel prerequisites on our unit.
- Signed read-only squashfs does not itself rule out runtime root, overlays,
  or boot persistence. The exact persistence mechanism remains unverified.
- SlopBro's service route is the first candidate to investigate. An unresolved
  HBC-after-reboot report on another `k25lp` model means acquisition and
  persistence must be verified separately.
- See `docs/ROOT-INVESTIGATION.md` for sources, measurements, gaps, and the
  completed SSAP/page preflight. No root installer has been executed.

### 3.3 Auto-launch / Home takeover: not established under current Dev Mode access
Investigated on-device (read-only):
- No boot hooks exist or can be created: `/var/lib/webosbrew/init.d`,
  `/etc/init.d`, `/var/palm/event.d`, and `/media/developer/startup` are all
  absent. `/var/luna` exists but isn't writable.
- No permitted Luna method lets the prisoner set a boot, default or home app.
- The Dev Mode service has no startup feature.
- Projects that do this (e.g. webos-launch-home) rely on Homebrew Channel
  **root** init scripts.
- **Result:** Reframe is a manually launched app. The owner opens it from the app
  list like any other app. Weak workarounds that were noted but not pursued:
  universal-remote macros or smart-home routines that send keypresses after
  power-on.

These shell observations concern the prisoner's sandbox view. They do not
prove paths are absent from the host filesystem or that rooted startup
integration is impossible. See `docs/ROOT-INVESTIGATION.md` for the follow-up.

### 3.4 Tech stack: vanilla TypeScript + Vite, no framework
- Picked because of the **2 GB RAM / TV Lite** constraint. Production JS is
  about 7 KB and the whole `.ipk` is about 5.5 KB.
- Design rules that follow from it: tiny bundle, CSS gradients over images or
  video, modest icons, and few simultaneous animations or `backdrop-filter`
  effects (GPU and memory cost on this panel class).
- TS target / build target **ES2019** for the TV's older WebKit/Chromium.
- No runtime dependencies. Dev dependencies are pinned: `typescript 5.7.3`,
  `vite 6.0.7`.

### 3.5 Build specifics needed for webOS
- `vite.config.ts` sets `base: "./"`, because packaged apps load over `file://`
  and need relative asset paths.
- A custom plugin **strips `crossorigin`** from the emitted `<script>`/`<link>`
  tags, which otherwise fail as cross-origin under `file://` on the TV.
- `public/appinfo.json`: id `com.reframe.home`, type `web`, `resolution
  3840x2160`, `disableBackHistoryAPI: true`, `bgColor #0b0f14`. The icons are in
  `public/`.
- The UI is authored in a **4K coordinate space**: `<meta viewport width=3840>`
  and root `font-size: 32px`, with everything else in `rem`. Change that one
  value to scale the whole UI.

---

## 4. Codebase map

```
index.html              viewport width=3840, mounts #app, loads src/main.ts
vite.config.ts          base "./", strip-crossorigin plugin, es2019 target
public/appinfo.json     webOS app manifest (+ icon.png, largeIcon.png)
src/
  main.ts               composition root: renders layout, mounts widgets, starts FocusManager
  styles.css            theme tokens on :root, 4K layout, focus styles, dev toast
  core/
    config.ts           static config: name, location (lat/lon), clock24h, tiles[]
    luna.ts             Luna bridge: window.webOS.service.request on TV, console mock in browser
    tv.ts               launchApp(id), switchToHdmi(n), switchToLiveTv(), openSettings(page)
    focus.ts            spatial D-pad focus: elements with [data-focusable]; arrows 37-40,
                        Enter 13 → click(); Back 461 defined but unhandled; score = primary + 3×cross
  widgets/
    clock.ts            updates every 15 s, 12/24h from config
    greeting.ts         time-of-day greeting (set once at mount; doesn't update)
    weather.ts          Open-Meteo (keyless, CORS-open), °F, WMO code → emoji/label
  launcher/apps.ts      tile grid (4 columns); click → launchApp; browser shows a toast of the app id
scripts/
  deploy.sh             build → ares-package → scp → luna-send-pub install → launch → verify
  fingerprint-tv.sh     read-only probe via ares-shell (note: ares auth fails on this TV, see §2)
docs/
  PHASE-0-SETUP.md      Dev Mode / CLI / registration / fingerprint walkthrough
  FINGERPRINT-ANALYSIS.md  hardware verdict, root decision
  AUTO-LAUNCH.md        boot/Home takeover investigation and conclusion
  HANDOFF.md            this file
```

Current tile config (`src/core/config.ts`): Netflix (`netflix`), YouTube
(`youtube.leanback.v4`), Prime Video (`amazon`), Disney+
(`com.disney.disneyplus-prod`), Spotify (`com.webos.app.spotify-beehive`), HDMI 1/2
(`com.webos.app.hdmi1|2`), Live TV (`com.webos.app.livetv`). Paired inventory now
confirms all of these IDs except the configured Spotify ID are installed.
Actual tile launching from Reframe remains unverified.

Weather location is a **placeholder** (New York City, 40.7128, -74.006, label
"Local"). The real location hasn't been set.

---

## 5. How to run things

```bash
npm install
npm run dev              # http://localhost:5173; arrow keys = D-pad, Enter = OK
npm run build            # tsc --noEmit + vite build → dist/
bash scripts/deploy.sh   # build, package, install, launch on TV (prints INSTALLED / RUNNING)
bash scripts/deploy.sh --no-build   # reuse the newest .ipk in the repo root
```

Deploy flow inside `deploy.sh`: `ares-package dist -o .` →
`scp` the ipk to `/media/developer/temp/` →
`luna-send-pub -t 40 luna://com.webos.appInstallService/dev/install {"id","ipkUrl","subscribe":true}` →
check that `index.html` exists in the install dir →
`luna-send-pub -t 8 luna://com.webos.applicationManager/launch {"id":"com.reframe.home"}` →
check `ps` for the app.

Uninstall: the README/PHASE-0 docs give `ares-install --remove ...`, but ares
can't authenticate (§2). The working equivalent would be `luna-send-pub` to
`com.webos.appInstallService/dev/remove` with `{"id":"com.reframe.home"}` over
SSH. That call **hasn't been tested**.

Bash scripts run under Git Bash on Windows (the dev machine is Windows 11).

---

## 6. Status, known issues & next steps

### Working / verified
- Fingerprint collected and analyzed.
- Build and packaging work (`com.reframe.home_0.1.0_all.ipk` exists).
- `deploy.sh` installed and launched the app on the TV (INSTALLED + RUNNING).

### Known issues / unverified (check these first)
1. **The Luna bridge is probably inactive on the TV.** `isOnTV()` checks for
   `window.webOS.service.request`, which is provided by the **`webOSTV.js`**
   library. That library **isn't bundled or included** anywhere. If the global
   is missing on the device, the app falls into **mock mode**: tile presses
   just log, and the footer says "Browser preview". Fix options: vendor
   `webOSTV.js` (from LG's webOS TV SDK) and load it in `index.html`, or call the
   native `PalmServiceBridge` directly. Then confirm tile launches actually
   switch apps/inputs on the TV.
2. **Remote ares commands fail authentication.** README now documents
   `deploy.sh`; PHASE-0 flags its older ares steps as historical. The bundled
   `fingerprint-tv.sh` still uses ares. The actual fingerprint was gathered over
   direct SSH. npm install/launch shortcuts also still use ares.
3. The fingerprint filename discrepancy was corrected: the source is
   `fingerprint-20261019.txt` (local date).
4. Whether the app has been **visually checked on the TV** (layout at 4K,
   focus, weather loading, fonts) isn't recorded. Do a visual pass.
5. **The Back key (461) isn't handled.** With `disableBackHistoryAPI: true`,
   decide what Back should do: nothing, or exit to the system.
6. The greeting doesn't update across time boundaries. The clock and weather
   don't refresh on resume (no `visibilitychange`/`webOSRelaunch` handling).
   Weather is fetched only once.
7. Paired SSAP inventory confirms Netflix, YouTube, Prime Video, Disney+, HDMI
   1/2, and Live TV IDs are installed. The configured Spotify ID is not listed.
   Reframe's actual tile launches remain unverified. System app metadata is
   available through paired SSAP even when denied in the prisoner shell.
8. **Git:** the owner requested the first full source/docs checkpoint on
   `main`. Check Git history/status for its commit and synchronization state;
   local-only evidence and generated artifacts are deliberately excluded.

### Suggested next steps (Phase 1 polish → Phase 2)
1. Fix the bridge (#1) and verify app/HDMI launching on the TV.
2. Set the real weather location and name. Move config to `localStorage` (the
   shape in `config.ts` was kept stable for this), then add a settings UI.
3. Phase 2 widgets/personalization: real app icons (small assets), themes via
   the CSS tokens, maybe a calendar or now-playing widget. Keep the RAM budget
   in mind.
4. Validate an OpenSSH uninstall procedure before presenting it as working.
   README/PHASE-0 now point to the actual deployment path.
5. Keep reviewed source/docs checkpoints before later integration stages.

### Hard constraints to respect
- The owner is conditionally willing to proceed with root at reasonable risk;
  this is not evidence that an unreviewed installer or firmware write is safe.
  Meet the root plan's preparation gates first. This investigation ran no root
  installer. Firmware writes and debloat are outside the current scope.
- Preserve access and native functionality. Do not present the Dev Mode toggle
  as a root rollback. No exact-model root rollback has been demonstrated.
- Keep the bundle tiny (2 GB RAM, about 100 MB free).
