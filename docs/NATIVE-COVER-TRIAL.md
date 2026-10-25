# Late compositor override: manual test passed, real wake failed

**Owner result: real wake still showed Reframe Loading, black, then Madison.**
The restored compositor uses its original import path, ignoring the persistent
environment file until restarted. The screenshots below prove the manual cover
component only. The replacement early-resource approach was subsequently explicitly approved,
installed and accepted after a real restart. The old environment override is
now disabled. See [EARLY-COVER-TRIAL.md](EARLY-COVER-TRIAL.md) and the top of
HANDOFF.md for current state and pending owner wake acceptance. The early
resource, rather than this late override, is the active persistence method.

2026-10-23: the owner reported that 0.3.10 still shows LG's Reframe Loading
cover and a translucent transition, with no visible AH draw. Prime Video exit
does return directly to Reframe, without the failed app-level animation.
The owner requested one sequence: AH on pure black, then Madison, with no
Reframe Loading text, and explicitly said to work until this is solved.

## Approval and current state - October 25

The owner explicitly answered **"Approve native CoverUI override and UI restart"**
to the exact environment-path/private-import/guarded-restart question. That
resolved the earlier automatic approval rejection; no alternate bypass was used.

The private module is installed, all 57 file hashes match, and the environment
file exists. The compositor process environment was read back with the intended
QML2_IMPORT_PATH. Reframe **0.3.11 is installed**, all 47 app file hashes verified,
and its failed browser-level startup curtain is gone. The obsolete read-only
observer permission was removed with its exact restore controller.

Actual native compositor screenshots verify the progressive draw, complete AH
on true black, and automatic transition into Madison. The final successful
trial was accepted while enabled. Root SSH and the UI daemon remained healthy.
These are actual TV pixels, not a browser or local Qt preview:

![AH cover captured on the TV](images/native-ah-tv.png)

Private evidence: `.research/native-cover-trial/8e5bc78e05620505dbf02931/`
contains middle, final and home captures. The home capture is taken before the
tool's forced cleanup, establishing that the cover faded by itself. Reframe was
the foreground app at the end. No firmware files were modified.

Two unconfirmed trials restored the original environment automatically. In the
second, image review outlasted the window, so acceptance arrived after rollback;
a fresh trial was correctly rerun and confirmed. The controller now refuses to
accept disabled/rolled-back trials. Initial all-black captures were taken while
app surfaces were still recovering from a compositor restart; a foreground ID
alone was not sufficient evidence of a ready app surface.

The capture tool now holds luna-send's interactive stdin open until a complete
reply arrives. The previous execFileSync path could close stdin before the
service response, returning an empty string. Full-screen PNG bounds were raised
to 8 MB to accommodate the real Madison frame. Temporary captures are cleaned.

**Owner standby/wake, control/app-return, and popup observations are pending.**
No TV launch/recovery/restart/power requests during those checks. A new full
boot with this native import override is also still unverified. Earlier native
startup/Home/return acceptance remains the baseline, not proof of this change.

## Installed approach

Native CoverUI imports a `CoverUI 1.0` QML module. The compositor's systemd unit
already reads `/var/systemd/system/env/surface-manager.env`. The installer
created that file and its previously absent parent directories after recording
them in its ownership plan. The native wrapper does not overwrite
`QML2_IMPORT_PATH`, and its product environment has no QML import-path assignment.
Qt supports module search paths through that environment variable:
[Qt import documentation](https://doc.qt.io/qt-6/qtqml-syntax-imports.html#qml-import-path).

`scripts/manage-native-cover.py install --execute` completed these steps:

1. Snapshot the original module privately under `backups/native-cover/original.json`.
2. Copy all 55 original files (197,303 bytes) into a private module tree under
   `/var/lib/reframe/native-cover/imports/CoverUI`. No firmware file is modified.
3. Change only the copied `UserInterfaceLayer/Containers/MainView.qml`, with
   `scripts/native-cover/patch-cover.py` requiring exact reviewed source anchors.
   The original presentation remains for other first apps and errors/stolen mode.
4. For Reframe only, hide title/loading words, draw the AH mark in native Qt,
   hold the completed mark until app readiness, and fade over 350 ms. The existing
   app launch, boot signals, input handling and error/network flows stay intact.
   Explicit close still passes through the original `assureIBD` path and can
   bypass the drawing hold. A missing draw completion has a bounded fallback.
5. Write the protected ownership/hash plan before mutations, then create the
   environment file pointing to the private import path. Firmware paths remain
   untouched. This is a persistent compositor configuration change, not a web
   app splash setting, hence the approval gate.

`PersonalMark.qml` uses the exact six SVG line coordinates, 22-unit rounded
strokes, cream color, 350 ms delay, 170 ms stagger, 620 ms draw and cubic Bezier
(.22,1,.36,1). Native scene-graph rectangles provide the same vector geometry
without a browser SVG/filter dependency. The background is the cover's true
black. The last stroke's actual finish starts a 280 ms hold; an early app-ready
event cannot cut it off. A slow app leaves the complete logo visible.

## Safety checks completed locally

- An isolated PySide6 6.8.3 runtime is under ignored `.research/qt-runtime`.
  The new QtQuick 2.12 component compiled, drew and completed in a local Qt test.
  Intermediate/final renders are under `.research/direct-startup/native-mark-*`.
- The patch applied to this exact TV's saved MainView source. The proprietary
  original/copied source is private; only our patch/component are tracked.
- Tests cover unknown/ambiguous patch refusal, no connection without execute,
  disabled-trial refusal, and watchdog acceptance/foreign-file protections.
- Root SSH and the compositor are in the same init mount namespace. No bind
  mount is needed for the selected import-path approach.
- The UI has a managed `surface-manager-daemon.service` unit. Root SSH is
  independent. Native screenshot capture works and returned a 1920x1080 PNG of
  Reframe, with its temporary file cleaned up. This can verify trial pixels:
  [native capture API](https://www.webosose.org/docs/reference/ls2-api/com-webos-surfacemanager/#capturecompositoroutput).

## Trial operation and recovery

The original module snapshot is private at `backups/native-cover/original.json`.
The active remote ownership plan is `/var/lib/reframe/native-cover-plan.json`.
Do not overwrite either. No bind mount or firmware modification was used.

`manage-native-cover.py trial --execute` starts an independent 90-second root
watchdog and restarts only `surface-manager-daemon.service`. The watchdog removes
only our exact environment file and restarts the stock UI if no confirmation
appears. It refuses foreign/changed configuration. Two live rollbacks worked.

`check-native-cover.py --execute` requires Reframe foreground, exercises the
native cover and captures middle/final/home frames. Verify actual pixels and
healthy UI/root before `accept --execute`. Acceptance is an operator judgment;
the command refuses disabled or already rolled-back trials but does not itself
judge the images. The final accepted trial is recorded privately in
`backups/native-cover/trial.json` with its root-owned confirmation marker.

Rollback via independent pinned root SSH:

1. `python scripts/manage-native-cover.py disable --execute` removes only the
   exact owned compositor environment file.
2. Restart `surface-manager-daemon.service` using `/bin/systemctl` to reload
   the unchanged original module. This temporarily interrupts GUI applications.
3. Keep the private module and journals for inspection. Firmware paths are
   untouched. This is GUI recovery, not a firmware/bootloader rescue.

For another approved guarded trial, `enable --execute` verifies all module
hashes and recreates only the exact absent owned environment file, then `trial
--execute` arms rollback and restarts the UI. A fresh install is intentionally
refused when the journal already exists.

Obtain owner standby/wake acceptance: AH only on black, full draw, direct
Madison, no LG/Reframe loading words, no duplicate app intro. Check
Home/Blue/Settings and ordinary app/cast return. Verify a controlled full restart
separately for early persistence. Preserve the native Home/startup/return undo
and independent root callback. Reverse shutdown animation remains deferred.

## Notification work in parallel

The owner also asked to suppress firmware-update reminders and Alexa onboarding,
while preserving necessary app updates. `manage-notifications.py apply --execute`
has completed with a private intent/undo snapshot:

- `support.softwareUpdateEnable`: `"true"` -> `"false"` (firmware version checks).
- `voiceframework.amazonLongDistanceGuided`: `false` -> `true` (guide already seen).
- `support.automaticUpdate` remains `"off"`; it was already off.
- `option.appUpdateMode` remains `"manual"`; no app service/domain was blocked.

Read-back verified all four again on October 25; they persisted since October 23. No firmware check, download or installation was
requested. Actual reminder suppression still needs wake observation, including
whether any cached firmware notice remains. Alexa's flag is a targeted first
trial, not proof that every Alexa promotion uses it. The firmware service reads
these support settings; its separate hotel-mode notice flag was already off and
is ignored without hotel mode, which was deliberately left off.

Undo these two preferences only:
`python scripts/manage-notifications.py restore --execute`.
The private snapshot is `backups/notifications/current.json`. Do not overwrite it.
