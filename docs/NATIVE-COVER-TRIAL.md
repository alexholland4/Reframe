# Native personal startup replacement: prepared, not enabled

2026-10-23: the owner reported that 0.3.10 still shows LG's Reframe Loading
cover and a translucent transition, with no visible AH draw. Prime Video exit
does return directly to Reframe, without the failed app-level animation.
The owner requested one sequence: AH on pure black, then Madison, with no
Reframe Loading text, and explicitly said to work until this is solved.

## Approval gate

Automatic approval review **rejected** enabling a persistent compositor import
override because of the broad boot/UI impact and absence of explicit approval
for that exact system mutation. The owner has been asked via the async input
tool to approve creation of
`/var/systemd/system/env/surface-manager.env`, a private CoverUI import path,
and a controlled `surface-manager-daemon` restart. **Approval is pending. Do not
install this override, use a bind mount as a workaround, or restart the UI for
this trial until that explicit answer arrives.** The rejected command never
ran; no native module or environment override has been installed.

The current TV package is still **0.3.10**. **0.3.11 is built/packaged locally**
and passes browser checks. It removes the failed app-level curtain/observer;
its UI is otherwise unchanged. It has not been deployed. The original portfolio
SVG is preserved in `public/identity/ah-monogram.svg`. The old observer permission
controller remains available for exact cleanup/undo.

## Prepared approach

Native CoverUI imports a `CoverUI 1.0` QML module. The compositor's systemd unit
already reads the optional writable environment path above. That file and its
parent directories are currently absent. The native wrapper does not overwrite
`QML2_IMPORT_PATH`, and its product environment has no QML import-path assignment.
Qt supports module search paths through that environment variable:
[Qt import documentation](https://doc.qt.io/qt-6/qtqml-syntax-imports.html#qml-import-path).

`scripts/manage-native-cover.py install --execute` is prepared to:

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

## Next steps after explicit approval

Review the prepared controller, then install and verify its hash plan. Remove
the now-unneeded app observer permission with its existing controller, deploy
0.3.11, and verify ordinary launcher functionality. Keep the original UI package.

`manage-native-cover.py trial --execute` starts a 90-second independent root
watchdog and requests a controlled UI-daemon restart. The watchdog removes only
our exact environment override and restarts the stock UI if no confirmation
marker appears. It refuses a foreign/changed environment file. Its source is
`scripts/native-cover/TrialWatchdog.cjs`, copied into the protected private tree.

Check independent root SSH, UI daemon health, and native CoverUI QML errors.
Exercise the native cover with Reframe as first/fallback app and capture actual
intermediate/final frames. Confirm the full mark/fade and Reframe foreground
before calling `accept --execute`; do not accept merely because the daemon runs.
The accept command writes the per-trial proof marker; the controller currently
relies on the operator to verify actual health/animation before that action.

If needed, `disable --execute` removes only our exact environment override;
then restart the UI daemon to reload stock imports. The original firmware
module remains available. Copies/journal stay for inspection. A failed GUI can
be recovered through pinned root SSH; this is not a firmware/bootloader rescue.

After automated proof, obtain owner standby/wake acceptance: AH only on black,
full draw, direct Madison, no LG/Reframe loading words, no duplicate app intro.
Check Home/Blue/Settings and ordinary app/cast return. Verify a controlled full
restart separately for early persistence. Preserve the previously demonstrated
native Home/startup/return undo and independent root callback.

## Notification work in parallel

The owner also asked to suppress firmware-update reminders and Alexa onboarding,
while preserving necessary app updates. `manage-notifications.py apply --execute`
has completed with a private intent/undo snapshot:

- `support.softwareUpdateEnable`: `"true"` -> `"false"` (firmware version checks).
- `voiceframework.amazonLongDistanceGuided`: `false` -> `true` (guide already seen).
- `support.automaticUpdate` remains `"off"`; it was already off.
- `option.appUpdateMode` remains `"manual"`; no app service/domain was blocked.

Read-back verified all four. No firmware check, download or installation was
requested. Actual reminder suppression still needs wake observation, including
whether any cached firmware notice remains. Alexa's flag is a targeted first
trial, not proof that every Alexa promotion uses it. The firmware service reads
these support settings; its separate hotel-mode notice flag was already off and
is ignored without hotel mode, which was deliberately left off.

Undo these two preferences only:
`python scripts/manage-notifications.py restore --execute`.
The private snapshot is `backups/notifications/current.json`. Do not overwrite it.
