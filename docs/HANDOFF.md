# Reframe — Project Handoff

_Last updated: 2026-10-21. Written so a new coding agent can pick up the work
without the original conversation._

**Current - owner curated Home; Reframe 0.3.1 installed/foreground:**
The owner liked the scenic photo but rejected the clutter of the 32-app view.
Their exact selection is Netflix, Prime Video, HBO Max, Peacock, Paramount+,
Hulu, Apple TV, Disney+ and Apple Music, in one horizontal row of larger cards.
More Apps is the final, same-size card and opens the native LG App Store
(com.webos.app.discovery). No Settings/input/other app rows remain. The photo
is retained; other native apps remain installed. This resolves the pending
Home app choices described below. See [CURATED-HOME.md](CURATED-HOME.md).
Production build and browser checks passed for the ten-card single row,
actual store dispatch target, focus/reveal behavior and 1080p/4K layout.
Source checkpoint `b52b266` is pushed. The native install and launch succeeded;
all 41 installed file hashes matched the package, actual foreground was
com.reframe.home, and the owned upload stage was removed. The previous 0.3.0
local package was preserved privately. Root/boot/wake and native Home/Back
routing are unchanged. Owner visual/remote acceptance of 0.3.1 is pending.
All entries below describe earlier checkpoints and are superseded where relevant.

**Current - Reframe 0.3.0 installed/foreground; owner app choices pending:**
Source checkpoint `d4407fb` is pushed. The owner requested a richer, smoother
launcher with many more apps before choosing Home favorites versus More Apps.
The TV now has Reframe 0.3.0 installed and foreground. All 40 installed app-file
hashes matched the package, native install/launch passed, and the exact owned
upload stage was removed. The previous local 0.2.0 package was saved privately.
The boot/wake helper remains enabled/running with the same PID 3767; no root,
boot/wake or app-exit/startup routing changes were made in this iteration.

The collection exposes 32 installed apps across Watch (14), Listen & Play (5)
and Explore (13), plus four TV/input controls. No extra third-party app was
installed and no Home/More Apps choice was made for the owner. Hidden internal
apps, Reframe itself and a temporary promotion are omitted. Full app list and
previews: [LIBRARY-REFRESH.md](LIBRARY-REFRESH.md). Owner should browse the shelves
and tell us which apps stay on Home; the remainder can then move to More Apps.
Actual owner feedback on 0.3.0 motion/appearance and curation is still pending.

A generated blue-hour coastal scene replaces the flat background; artwork is
bundled at public/backgrounds/coast-blue-hour.png. Built-in imagegen tool and
exact prompt/resolution are documented in LIBRARY-REFRESH.md. Focus now follows
ordered shelves with real button focus, row memory, genuine pointer movement,
independent cancellable 220 ms scroll reveals and safe rapid reversal. Held OK
is ignored after the initial press. Native Back and launch bridge are retained.

Production build/package, 77 Node/12 Python tests and the reusable local browser
check passed. scripts/check-ui.mjs checks 36 buttons/33 images, 1080p/4K layout,
row memory, held OK, pointer/remote synchronization, scroll reveal and direction
reversal. Hidden-browser throttling is disabled for meaningful frame checks.
These are browser/installation checks, not a new physical-remote/casting/playback
acceptance result for 0.3.0. Keep app/cast exit and native startup-flash work
separate as already deferred in NEXT-SESSION.md. Current requested build is done.

**Latest - Reframe 0.2.0 UI refresh deployed, 2026-10-21:**
The owner superseded the earlier stop for a visual refresh and then explicitly
said to finish after a usage interruption. Source checkpoint `e4a47d9` is pushed.
Reframe 0.2.0 is now installed and foreground on the TV. It has crisp bundled
Netflix/YouTube/Prime Video/Disney+ SVG wordmarks, large rounded app cards,
spacious layout, subdued charcoal/teal gradients, light type and a quieter
Settings/input row. Weather is hidden until a real location is configured.
See [UI-REFRESH.md](UI-REFRESH.md) and its saved screenshot.

TypeScript/Vite build and native package passed. Browser checks passed at
1080p/4K with all icons loaded, no clipping, and Right/Down/Left/Up focus movement.
77 Node and 12 Python tests pass. The new pinned-root deploy controller passed
live: previous 0.1.1 IPK saved privately, staged upload hash verified, native
install accepted, all 11 installed app files matched their package hashes,
Reframe launch accepted and actual foreground verified, own stage removed.
Existing boot/wake helper remains enabled/running with the same PID 3767.
No root/boot/wake settings or Home/Back routing were changed by this UI update.
The earlier full owner casting/playback acceptance belongs to 0.1.1; no new
owner visual/functional confirmation has been received for 0.2.0 yet.

Use `python scripts/deploy-root.py <Reframe.ipk> --execute` for future rooted app
updates; default mode validates locally without TV access. The old developer
SSH deployment/inspector tools remain historical. App/cast exit return routing
and the brief native startup screen stay deferred in NEXT-SESSION.md. Current
work is complete; retain this working stop and do not perform additional TV
foreground tests or power cycles without a new request.

**Working stop, 2026-10-21 - session-independent root and boot/wake launcher VERIFIED:**
The owner is going to bed soon and explicitly deferred UX improvements to next
session. Do not continue TV changes/foreground tests tonight. Save this baseline
and resume from [`NEXT-SESSION.md`](NEXT-SESSION.md).

Dedicated key-only root SSH on 2222, HBC UID 0 and Reframe returned automatically
after a controlled restart with LG Developer Mode app/startup absent and the
root-owned directory marker preserved. Fresh uptime (~45s), changed daemon/helper
PIDs, new root status and actual HDMI 2 -> Reframe foreground were verified.
The owner then confirmed Settings/Back, YouTube playback with sound, iPhone
Screen Mirroring, AirPlay and YouTube iPhone Cast all work. A final remote
off/10s/on check again opened Reframe automatically. Native Home/Back remain
available; all five HBC elevation profiles match the reviewed plan.

Known UX intentionally deferred: closing YouTube or Screen Mirroring currently
returns to native LG Home; power-on briefly displays LG Home or HDMI 2 before
Reframe. The owner wants return-to-Reframe after app/cast exit and a smoother
startup without the visible native-screen transition. Investigate narrowly scoped
return/startup routing while preserving Settings, active app/cast/input sessions,
native prompts, and a remote escape. No blanket foreground-forcing timer or
signed firmware patch was added. Installed helper is `8521bcf`, using actual
native tvpower Suspend -> Active events. See
[`LAUNCH-PERSISTENCE.md`](LAUNCH-PERSISTENCE.md).

The owner explicitly approved removing only LG Developer Mode after auto-review
blocked it; that approval resolved the block and native removal completed.
Developer SSH 9922 is retired. Use strict pinned root SSH and the paired SSAP
recovery; independent recovery was tested with root SSH deliberately stopped,
actual UID/EUID 0, owned staging cleanup, Reframe restore and root return.
See [`ROOT-RECOVERY.md`](ROOT-RECOVERY.md).

Private LG app/service/package backup is verified: 6,443,932 bytes, 113 entries.
The original session credential is protected under the root transition journal
and in ignored local backups. Marker undo was demonstrated live before LG
removal; exact bytes/UID/GID/mode and then-working developer SSH were verified.
Launcher-only undo/reinstall and native Home escape also passed. Reinstalling
LG Developer Mode now needs a planned transition back, possibly sign-in; do not
install it alongside this rooted setup. Full unroot/firmware rescue is unverified.
See [`SESSION-INDEPENDENCE.md`](SESSION-INDEPENDENCE.md).

77 Node and seven Python tests pass. Git excludes keys/pairing tokens, raw
fingerprints, downloaded packages/research and private backups. Older developer
Bash deployment/inspector and callback-test transports need migration before
future use; root SSH intentionally disables TCP forwarding. No signed LG startup
or firmware partition was patched. Historical checkpoints below are superseded
where they describe current state.

**First controlled restart: root startup VERIFIED with Developer Mode retained.**
Root SSH, HBC UID 0 and a fresh startup record returned automatically; kernel
uptime reset and SSH daemon PID changed. The TV reused its Linux boot ID, so
the initial UUID-only verifier timed out despite root actually returning.
The TV resumed HDMI 2; the owner confirmed the dark screen was an active TV
with working Settings. Both Reframe/HBC and developer SSH survived. No launcher
boot hook or Developer Mode transition yet. Normal Home/Power On preference is
already Home/On per owner; it was not changed. A separately paired app-launch
recovery path is prepared before removing developer SSH; see
[`ROOT-RECOVERY.md`](ROOT-RECOVERY.md). It has not been paired or live-tested yet.

**Minimal root callback and undo VERIFIED; first reboot prepared:** HBC's
custom two-file startup restarted key-only root SSH through the independent
developer route. Its persistent activity/startup undo was then exercised live,
verified removed, and the same startup/activity reinstalled. The controller now
queries the saved activity definition with `current:false`; runtime/current
responses contain serials rather than the callback configuration. The owner
explicitly approved sending the LG session token only to its normal LG HTTPS
validation endpoint; the session is valid (~975h). Original signed startup,
init, and marker hashes match backups and developer SSH works. No reboot or
launcher interception yet. First boot test retains LG Developer Mode. See
[`ROOT-PERSISTENCE.md`](ROOT-PERSISTENCE.md).

**Latest - HBC elevation approved and VERIFIED:** The owner explicitly said
"yes" to the broad persistent HBC permission expansion. The reviewed operation
then ran once; all five actual profile hashes match the simulation, HBC's root
check passed, and its command execution returned UID 0. Its prepared undo
validates all five actual profiles in dry-run. The owner again confirmed all
requested Settings/Back/playback/iPhone casting checks pass after elevation.
The minimal root startup and removal tools are being checkpointed before live
callback testing. Developer Mode remains installed with its original regular
marker and signed script. No startup/boot activity/Home redirect/reboot has run.
See [`ROOT-PERSISTENCE.md`](ROOT-PERSISTENCE.md). The former elevation approval
block below is historical and was resolved by the explicit owner reply.

**Current stage - root SSH established; HBC elevation awaiting explicit approval:**
The owner authorized actual rooting and persistent Reframe launch. Dedicated
key-only root SSH on port 2222 is verified, including rejection of an unrelated
key. Its targeted undo was executed successfully live, Developer SSH survived,
and the same root access was then reprovisioned. The owner confirmed Settings,
Back, YouTube playback/sound, Screen Mirroring, AirPlay, and YouTube iPhone Cast
still work. See [`ROOT-ACCESS.md`](ROOT-ACCESS.md).

HBC 0.7.3 is installed and its package/script hashes match the pinned bytes.
**Automatic approval review rejected HBC elevation before execution**, because
it grants persistent broad Luna role/API permissions, including a root command
endpoint. Do not bypass that rejection. The exact five-file changes were then
simulated locally against captured originals; a targeted profile undo passed
five offline tests. A private LG Developer Mode app/service archive was also
saved. See [`HBC-ELEVATION-REVIEW.md`](HBC-ELEVATION-REVIEW.md) for concrete scope,
recovery material, and the required approval. No HBC startup, boot activity,
Developer Mode marker change/removal, launcher interception, or reboot occurred.
Authenticated root is available now; persistence and Reframe auto-launch remain
unfinished behind the elevation decision. All 44 Node and three Python tests pass.
The following checkpoints are historical where they say HBC/access is absent.

**Root execution CONFIRMED on the actual TV:** The owner-authorized single
identity-only probe through adoverlayex reported UID 0/EUID 0, /proc UID/GID
fields all zero, and CapEff `0000003fffffffff` on firmware 33.30.97 / SDK 10.3.0.
Its two marked download files and staging directory were reported removed.
Reframe was restored, ordinary prisoner SSH still works, and a read query
confirms HBC is absent. No installer, persistence hook, Home takeover, Developer
Mode removal, firmware change, or reboot occurred. The source was checkpointed
at `c7ef279` before execution. See [`ROOT-IDENTITY-PROBE.md`](ROOT-IDENTITY-PROBE.md)
for evidence and limits. **Root acquisition is now proven; persistence and
rollback are not.** Targeted privileged original-state backups have since
completed; rollback/replacement-access work remains before persistence. Do not run the stock
all-in-one installer based only on this proof. The owner confirmed Reframe, Settings, and Back still work after the probe.
Casting/playback have not been retested after it; the pre-probe baseline is recorded separately.

**Protected original-state backup COMPLETE:** One read-only privileged capture
using checkpoint `40c7faf` saved 32 path records and five files (15,918 bytes)
under ignored `backups/`; all copied-file hashes were independently verified.
The captured LG startup script passes SHA-512 signature verification with the
captured LG key/signature. Its originals show that signature/session failure
can disable Developer Mode and remove developer apps at boot. No originals
were changed. Staging cleanup and Reframe restoration succeeded; ordinary SSH
still works and HBC remains absent. The owner confirmed Reframe, Settings, and Back still work after capture;
casting/playback have not been retested after it.
See [`PROTECTED-STATE-BACKUP.md`](PROTECTED-STATE-BACKUP.md) for scope, missing
mount contents, and rollback limits. Before persistent changes, prepare a
minimal change journal/recovery sequence and authenticated replacement access.
Do not run HBC's broad startup or the stock installer as an automatic next step.

Older notes below describe earlier stages and are superseded where they call
root execution unverified. They do not establish present authorization to
remove Developer Mode or reboot without completing the preparation gates.

**Resumed with owner instruction to proceed:** The TV is on with Reframe
open. Fresh read-only checks confirmed firmware 33.30.97, SDK 10.3.0, Reframe
0.1.1, prisoner UID 6349, and Node v16.20.2. A local source/package/evidence
snapshot was saved under ignored `backups/`. The acquisition-only identity
probe is now implemented and passed offline checks (28 total tests). See
[`ROOT-IDENTITY-PROBE.md`](ROOT-IDENTITY-PROBE.md). No live service exploit has
run at this checkpoint; the next action is one limited identity probe, not HBC
installation or persistence. The previous stop instruction is superseded by
the owner's explicit resume. No reboot or Developer Mode removal is planned.

**Stopping point, 2026-10-20:** The owner asked to finish at a working state
and defer the root attempt until tomorrow/next session. Reframe 0.1.1 is
installed; Settings/Back, YouTube playback with sound, and all three required
iPhone casting paths are owner-confirmed working. No root exploit/installer,
HBC installation, persistence hook, Home interception, or reboot has occurred.
Do not continue TV diagnostics or execute a root attempt during this stop.

Resume from `ROOT-ATTEMPT-PLAN.md`: recheck firmware and Developer Mode access,
then finish acquisition-only staging, original-state backups/change journal,
and rollback review before any installer or persistent changes. Root proof,
installation, persistence, and Home takeover remain separate stages. Retain
Developer Mode until replacement access is verified; do not blindly follow an
uninstall/reboot prompt. The stock all-in-one installer is not the next command.
The current stage is a stable app baseline, not a prepared root recovery image.

**Owner-confirmed normal-use baseline, 2026-10-20:** Settings, physical
remote Back, YouTube video with sound, iPhone Screen Mirroring, AirPlay
video/audio, and YouTube iPhone Cast all worked with Reframe 0.1.1. No problems
were reported for the requested casting prompts/controls/disconnect checks.
See `SYSTEM-COMPATIBILITY.md` for scope and remaining checks. This is the
pre-root baseline; no root or Home/boot integration has been performed.
Next is staged acquisition/backup/rollback preparation, not a stock all-in-one
installer or an automatic reboot.

**Native bridge update, 2026-10-20:** Reframe 0.1.1 is installed. It now uses
PalmServiceBridge directly (alternate bridge supported), rejects native errors,
retains/cancels requests, and only mocks desktop previews. Added a Settings tile
in place of the unavailable Spotify placeholder and restored normal platform
Back handling. Seventeen transport regression tests and the build passed.
Actual Reframe Settings, YouTube, HDMI 1, and HDMI 2 tiles returned native launch
success across separate live runs; Reframe was restored. The owner later confirmed Settings/Back, YouTube playback with sound, and
all three iPhone casting paths; individual settings pages, other services, and
power transitions were not itemized. See
[`BRIDGE-VALIDATION.md`](BRIDGE-VALIDATION.md) for limits and helper lifecycle
findings. Root, persistence, Home interception, and reboot remain untouched.

The original source checkpoint is GitHub commit `c344f63`. Deployment was also
changed to one bounded interactive install/launch call with parsed replies and
an installed-version check, replacing benchmark-mode repeated requests. The
individual commands were validated live; the revised Bash script itself has
only been syntax-checked, not used for an additional reinstall in this pass.

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
IDs, staged acceptance checks, remote escape requirement, and native launch
results. The Settings helper/tile uses the inventoried `com.palm.app.settings`
and is deployed in 0.1.1. No root or
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
- `luna-send-pub` exits early when stdin reaches EOF. Holding stdin open
  with `(sleep N) | luna-send-pub -i -n 1 -w TIMEOUT ...` permits a single
  request and reply. `-t N` is benchmark mode that repeats calls; do not use
  it to keep mutating requests alive. `deploy.sh` now parses replies and
  checks the installed app version.
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
    luna.ts             Native PalmServiceBridge requests; desktop-only preview mocks
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
(`com.disney.disneyplus-prod`), Settings (`com.palm.app.settings`), HDMI 1/2
(`com.webos.app.hdmi1|2`), and Live TV (`com.webos.app.livetv`). All IDs are
present in the paired inventory. Settings, YouTube, and HDMI 1/2 tile launch
requests have successful native replies; playback and remaining tiles still
need verification.

Weather location is a **placeholder** (New York City, 40.7128, -74.006, label
"Local"). The real location hasn't been set.

---

## 5. How to run things

```bash
npm install
npm run dev              # http://localhost:5173; arrow keys = D-pad, Enter = OK
npm run build            # tsc --noEmit + vite build → dist/
bash scripts/deploy.sh   # build, package, install, launch on TV (prints INSTALLED / LAUNCH ACCEPTED)
bash scripts/deploy.sh --no-build   # reuse the newest .ipk in the repo root
```

Deploy flow inside `deploy.sh`: `ares-package dist -o .` -> SFTP-copy the IPK
to `/media/developer/temp/` -> one interactive Luna install call with stdin
held open -> parse acceptance and check installed app version -> one
interactive Luna launch call -> parse acceptance. The revised script has been
syntax-checked; equivalent individual commands were validated live. Launch
acceptance is not playback/foreground verification.

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
1. **Bridge fixed in 0.1.1.** Native launches for Settings, YouTube, and HDMI
   1/2 have successful replies. Do not equate those with manual playback or
   casting acceptance; those checks are pending in `SYSTEM-COMPATIBILITY.md`.
2. **Remote ares commands fail authentication.** README now documents
   `deploy.sh`; PHASE-0 flags its older ares steps as historical. The bundled
   `fingerprint-tv.sh` still uses ares. The actual fingerprint was gathered over
   direct SSH. npm install/launch shortcuts also still use ares.
3. The fingerprint filename discrepancy was corrected: the source is
   `fingerprint-20261019.txt` (local date).
4. Whether the app has been **visually checked on the TV** (layout at 4K,
   focus, weather loading, fonts) isn't recorded. Do a visual pass.
5. Back now delegates to webOS (`disableBackHistoryAPI: false`). Verify the
   physical remote and exit/navigation behavior manually.
6. The greeting doesn't update across time boundaries. The clock and weather
   don't refresh on resume (no `visibilitychange`/`webOSRelaunch` handling).
   Weather is fetched only once.
7. Paired SSAP inventory confirms Netflix, YouTube, Prime Video, Disney+, HDMI
   1/2, and Live TV IDs are installed. The absent Spotify placeholder was
   replaced by Settings. Four native tile launch requests are now verified. System app metadata is
   available through paired SSAP even when denied in the prisoner shell.
8. **Git:** the owner requested the first full source/docs checkpoint on
   `main`. Check Git history/status for its commit and synchronization state;
   local-only evidence and generated artifacts are deliberately excluded.

### Suggested next steps (Phase 1 polish → Phase 2)
1. The owner-confirmed normal-use Settings/Back/YouTube/iPhone baseline passes.
   Prepare staged root acquisition and backup/rollback; retain repeat checks
   after each future root/persistence/Home stage. Remaining app tiles and
   power transitions still need verification where applicable.
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
