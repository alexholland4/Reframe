# Early cover and firmware notices: installed native resource

The October 25 owner wake check **failed**: Reframe Loading still appeared,
followed by black and Madison. Home/Blue/Settings/app returns passed. Firmware
reminders still appeared; Alexa did not. Prime Video's remote shortcut asked
for an app update, while Reframe's tile opened Prime normally.

## Explicit approval received

Automatic approval review rejected `manage-early-cover.py trial --execute`:

> This registers a persistent early-boot resource and hosts-file bind mount
> that can affect startup and firmware networking before the rollback guard runs;
> the user approved the later CoverUI override, but not this broader early-boot/network
> mutation with its pre-guard failure risk.

The rejected command did not run. The owner then explicitly answered
**"Approve guarded early-boot and firmware-hosts trial"** to the exact resource
record, readonly cover/hosts mounts, restart and pre-guard risk question.
That resolved this approval gate; the approved command subsequently completed.

## Actual full-restart result

The private resource was registered, and the old late compositor environment
override was disabled using its existing ownership controller. A real restart
returned independent root SSH at uptime 46.68 seconds with a fresh root callback.
The snapshot-restored compositor is PID 758 with its original
`QML2_IMPORT_PATH=/usr/lib/qt5/qml`. All three private-image/target mounts are
active, owned and readonly. All 60 staged source/controller files verify.

Without restarting the compositor after that boot, the native cover rendered
partial AH, complete AH on black, then faded to Madison. Private evidence:
`.research/native-cover-trial/f07ccd6ba47fd98f9dc9d415/`.
This proves the restored compositor now reads the early resource. The actual
startup observer connected after Madison was already visible; its four captures
are `.research/actual-early-boot/c0c3e23eb5e9b912e05fcc29/`. **Those captures do
not prove the full opening sequence. Owner off/on acceptance is pending.**

The early trial was accepted while its mounts/record were active and GUI/root
were healthy. Only its own trial Activity was cancelled; the original root/HBC
callback remains. The retired late environment file is absent. Read-only checks
after the guard window found the resource still active.

All four firmware hosts resolve to loopback through the TV's resolver;
`us.lgtvsdp.com` resolves to a non-loopback address. This establishes the narrow
DNS mapping, not a completed app-update download. App-update mode/services and
existing hosts entries remain unchanged. Firmware/Alexa popup and compatibility
observations are pending, with no TV actions during the owner's checks.

## Cause established on the actual TV

After power-on, compositor PID 758 had its original
`QML2_IMPORT_PATH=/usr/lib/qt5/qml`, despite our environment override remaining
on disk. LG restored a prebuilt system snapshot. Restarting the compositor
reads the override, which explains the successful manual cover captures;
that did not prove real startup persistence. The regular HBC boot Activity
runs after the loading cover is already visible, so a late restart cannot
deliver the requested uninterrupted startup.

## Installed resource

LG's existing mount-readwrite script runs `ResourceInstallerUtility -c setup`
before emitting mount-readwrite-done. It reads
`/var/palm/data/resourceinstallerutility/packageInstallHistory.db` and mounts
registered resource images readonly. The TV's PackageInfo table was empty.

The private resource contains the reviewed original CoverUI copy with the
AH-only patch and original portfolio timing, plus the existing hosts entries
with only these firmware server names mapped to loopback (IPv4 and IPv6):
`snu.lge.com`, `su-dev.lge.com`, `su.lge.com`, `su-ssl.lge.com`.
This is the same firmware blocklist as Homebrew Channel 0.7.3's startup script.
App-update mode and app-update services are unchanged. No OS update request,
download or installation is part of this work.

Only two runtime targets appear in package metadata:

- `/usr/lib/qml/CoverUI`, a readonly image mount over the original directory.
- `/etc/hosts`, a readonly image mount over the unchanged original file.

The image and unpacked metadata are under `/var/lib/reframe/early-cover/version`.
All 60 staged files, including the controller, are hashed. The root-owned plan
is `/var/lib/reframe/early-cover-plan.json`. A consistent original resource DB
backup is private at `/var/lib/reframe/early-cover/original-resource-history.db`;
local intent/undo is `backups/early-cover/current.json`. Preserve these.
Only our `com.reframe.nativecover` resource row was added. No firmware,
bootloader, kernel or saved snapshot image is changed. The original root SSH
callback is unchanged.

The private local build uses the original module snapshot and the original
hosts snapshot; proprietary QML and built images remain ignored. Builder:
`scripts/native-cover/build-early-resource.py`. SquashFS tools-ng 1.3.2 came
from the [project's official Windows distribution](https://infraroot.at/pub/squashfs/windows/).

## Actual isolated tests completed

The native LG loader ran in a separate private mount namespace, with an isolated
database and `/usr/palm` made readonly to match the live TV. It activated both
targets from the private image. All three image/target mounts were readonly and
their backing image ownership verified. The live parent namespace, original
cover and original hosts hashes remained unchanged.

The exact staged controller then verified the resource and removed its row and
all mounts; original cover and hosts returned. Repeated native setup stacks
mounts, a behavior caught in testing. Rollback now removes every owned layer,
and the repeated-setup/full-undo test passed on the TV. Private evidence:
`.research/native-analysis/resource-probe/latest-result.json` (successful final
probe stage suffix `d04c078fe592532fccf3c001`).

## Guarded activation and recovery

`manage-early-cover.py trial --execute` prepares a nonce and registers only its
own persistent boot-trial Activity, `com.reframe.earlycover.trial`, invoking the
existing root HBC exec service. The Activity starts a detached 90-second guard
after core-boot-done. It is verified before adding the resource row. A full
restart then tests the real startup loader, rather than another late UI restart.
Disable the obsolete environment override with its existing exact controller
so the early image is the sole native animation path.

The guard removes only its exact pre/post-activation row and image-backed target
mounts, then restarts the UI if no acceptance marker appears. Foreign rows and
mounts are preserved. Accept only after actual startup pixels, GUI health and
independent root SSH are verified. Acceptance cancels only our trial Activity.

**Limit:** the boot guard starts after core-boot-done. It cannot guarantee
recovery from a failure that prevents reaching that phase or starting HBC/root
SSH. This is an earlier boot change than the already-approved compositor
environment trial. Isolated real-loader tests reduce that uncertainty; they
do not replace a full boot test or establish a firmware rescue method.

Manual recovery through independent root SSH:

1. `python scripts/manage-early-cover.py disable --execute` deletes only the
   exact owned resource row, removes all verified owned mount layers and cancels
   only its trial Activity. It preserves all source/backup files.
2. Restart only `surface-manager-daemon.service` with `/bin/systemctl` to clear
   its cached cover component. The original signed files remain underneath.
3. Leave the retired environment override disabled for stock behavior.

`check-native-cover.py --early --execute` captures a manual cover sequence after
the early resource is active. That proves the component, not the whole boot
sequence. Owner wake acceptance and the real boot state must be recorded
separately. Keep the working Home/Blue/Settings and app/casting return routing.
