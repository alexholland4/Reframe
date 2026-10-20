# Proposed root attempt — not executed

Prepared 2026-10-20, America/Chicago. The owner has authorized investigation and
diagnostics. The owner is also willing to proceed if the assessed risk is
reasonable, while prioritizing avoiding a bricked TV and understanding undo.
**No root installer has been executed.** Conditional willingness does not make
rollback proven; the preparation gates below still apply.

## Stop/resume instruction - 2026-10-20

The owner requested stopping at the working Reframe 0.1.1 baseline tonight
and attempting root in the next session. No further TV actions are part of
this checkpoint. On resume, recheck the actual firmware and Developer Mode
connection, preserve the confirmed Settings/playback/iPhone casting baseline,
and complete the acquisition-only/backup/rollback preparation below. No custom
acquisition-only payload has been prepared or tested. Do not run the stock
all-in-one installer as an automatic continuation from baseline success.

## Completed prerequisites

GitHub contains the original source checkpoint `c344f63` and native bridge fix
`4cb3696`. Reframe 0.1.1 is installed; 17 bridge regression tests and the build
passed. Actual Settings, YouTube, and HDMI 1/2 tile launches returned native
success. The owner confirmed normal Settings/Back, YouTube video with sound,
and iPhone Screen Mirroring, AirPlay playback, and YouTube Cast. See
[SYSTEM-COMPATIBILITY.md](SYSTEM-COMPATIBILITY.md) for that baseline and limits.
Acquisition-only staging, targeted privileged backups, and verified rollback
are still outstanding. No root installer has run.

## Native functionality is a required acceptance condition

The owner requires Settings, installed-app launching/playback, and casting to
continue working. Follow [SYSTEM-COMPATIBILITY.md](SYSTEM-COMPATIBILITY.md).
Capture a baseline before persistent changes, check again after root alone,
and check again after independently enabling any Home/boot interception.
A root success dialog or working SSH is not a substitute for these checks.
Preserve the stock Home/Settings/casting components and a remote escape to LG
Home. Stop integration if a stage causes a regression.

## Evidence and version

All five SlopBro entry apps load a diagnostic page and provide native bridge
access on our actual TV. Root and persistence remain unverified. See
[`ROOT-INVESTIGATION.md`](ROOT-INVESTIGATION.md) for results and limits.

Candidate: [SlopBro commit 21023d56ca424607bb03d2939609cc658c655fc7](https://github.com/throwaway96/slopbro/tree/21023d56ca424607bb03d2939609cc658c655fc7).
The pristine local checkout is `.research/slopbro-21023d5/`; no file in it was
executed. The installer references Homebrew Channel **0.7.3**. Its release package was
downloaded to `.research/hbc-0.7.3/` for local inspection only, not installed or
executed. Package size: 1,699,858 bytes. SHA-256:
`d10bf3c753551d7c72fb7a92b20fcd2317e502a220ac668ba8e76f6ea78b363c`.
The package metadata identifies version 0.7.3; its control archive has only
metadata, with no maintainer scripts. The packaged startup, jumpstart, service,
and elevation files were extracted as inert files for review. The checksum
identifies the downloaded bytes; it is not an independently signed attestation.

SHA-256 of the reviewed local files:

```text
slopbro.py
1A64F7050B3682AB1AC50A3E2998946A93C07ABBA0DFFCA0C4B8AFC77403D75F
wwwroot/index.html
0430D93C45885DE73BA5F3E2F32B1E4EF9E713234DE818162F0CB8AC20A1FF36
wwwroot/main.js
3A6830AC858BB71F0BD0B9F45514FF1FD85D707170F59941E6771D454102F791
wwwroot/package.json
F573657CB5DB54FD8B0F724AE69D8F8FD6903EC6CA0F038CE2B47E4F45EF1EF0
wwwroot/autoroot.sh
16BEDFF5EE8F8C754E6E302E3251DFC904F6AA7CA71C0B0483F7E5FC6BBB3611
```

These identify reviewed bytes; they are not a guarantee of compatibility or an
independent authentication of the author's identity.

## What the normal attempt would change

The normal page downloads service/installer files to `/media/internal/downloads`
and invokes jsserver. If execution gains root, the bundled installer converts
the Developer Mode marker into a directory, restarts appinstalld, installs and
elevates HBC, and may rename an invalid Developer Mode startup script. It
instructs the owner to remove LG Developer Mode before reboot where applicable.
It is not a temporary UID-only test and provides no dry-run/stop-before-install
mode. Optional installer telnet and insecure-download flags would remain off.
This does **not** disable HBC startup telnet: its packaged startup script starts
unauthenticated root telnet unless the disabling preference exists. Its
failsafe branch also starts telnet, regardless of that preference. Provision
and test key-based access and account for both paths before startup testing.
[Reviewed installer](https://github.com/throwaway96/slopbro/blob/21023d56ca424607bb03d2939609cc658c655fc7/wwwroot/autoroot.sh)

The package is installed through normal app services; this proposal includes
no firmware flashing, downgrade, partition write, debloat, or launcher takeover.

## Risk and undo assessment (2026-10-20)

The reviewed service route does not intentionally write bootloader, kernel,
rootfs, or TV firmware partitions. This is a reason to expect a lower risk of
permanent boot failure than a flashing experiment. It is an inference from code,
not a measured failure rate or a compatibility guarantee for 55UA7050PUB/33.30.97.
No numerical brick probability is supported by the available evidence.

The immediate documented concern is incomplete root/persistence and loss of
access or development apps. [SlopBro issue 22](https://github.com/throwaway96/slopbro/issues/22)
reports a k25lp TV still responding normally after the completion dialog,
Developer Mode removal, and reboot, but without HBC or working root SSH.
This is an individual report on a different model/firmware, not proof of our
outcome. Automatic startup also adds failure modes and network exposure.

HBC's reviewed [startup source](https://github.com/webosbrew/webos-homebrew-channel/blob/v0.7.3/services/startup.sh)
resets devmode counters, may bind-mount generated hosts/password files, creates
telemetry-related bind mounts, and executes user startup hooks. Its failsafe is
useful only if enough of boot, service activation, networking, and the packaged
telnet binary still work; it is not bootloader recovery. The packaged service
contains a persistent ActivityManager autostart registration. Its elevation
code changes HBC-specific writable Luna service/role/permission/manifest files.

A targeted rollback is plausible while adequate root access remains: cancel
HBC's startup activity, reverse only the recorded changes, restore backed-up
originals, remove newly installed app/service state, and retain/recover normal
Developer Mode. **This has not been implemented or demonstrated here.** Merely
uninstalling the HBC app is not a verified complete unroot. Do not recursively
sweep the whole live filesystem: an [unroot request/report](https://github.com/throwaway96/slopbro/issues/14)
describes loops in jail bind mounts, severe load, and leftover persistence.
Its author's claim that factory reset is foolproof is not established for this TV.

A factory reset is a possible fallback only while the TV can reach its reset
function. It sacrifices settings/apps and is not a guaranteed undo or a repair
for damaged signed partitions. The [RootMyTV security notice](https://rootmy.tv/warning)
warns that immutable-file changes can survive reset and that a severe brick may
require storage reprogramming or mainboard replacement. Do not introduce
immutable-file tricks, firmware downgrades, partition writes, or a kernel exploit
as part of this attempt. A file backup is not an independently bootable restore
image, and no hardware recovery path has been established for this unit.

Assessment: reasonable to continue preparing the service route, with limited
expected exposure to permanent brick by design. A stock all-in-one installation
is **not yet ready under the owner's reversibility preference**. Before running,
prepare an explicit backup/change journal and targeted rollback for the reviewed
writable paths; account for first HBC launch and network defaults; and preserve
Developer Mode until replacement authority is actually verified. Backup paths
that prisoner cannot read must be captured after obtaining authority but before
changing them. That may require a separately reviewed acquisition-only payload;
the stock installer has no such stopping point. Do not describe that payload as
available, tested, or completely nonpersistent until it has been built/reviewed.

## Proposed sequence

1. The referenced HBC package has been downloaded and hashed locally. Confirm
   that delivery will not depend on an untested TV-to-GitHub connection. Review
   any delivery adjustment before running it. Preserve existing Reframe source,
   package, inventory, and current Developer Mode access.
2. Use the pinned service route through a proven candidate app. Capture the
   actual service response and installer log. Do not treat HTTP delivery or a
   completion dialog as proof of root.
3. Before removing Developer Mode or rebooting, verify HBC is installed and its
   service reports actual root execution. Establish and test replacement root
   access. HBC registration/startup behavior must be checked explicitly.
4. If acquisition, installation, elevation, or replacement access is incomplete,
   stop with logs. Do not reboot, remove Developer Mode, repeat blindly, or
   switch to Chronomaly automatically. Recovery depends on what authority and
   access actually remain; no complete rollback has been demonstrated here.
5. Only after those checks should Developer Mode removal and a controlled
   reboot/persistence test be considered. A failed K25 persistence report makes
   this verification material. Reframe Home/boot integration is a later task.

This is still an experiment on an unconfirmed exact model/firmware. The normal
installer can change persistent state before any final success check. There is
no verified one-command rollback for this unit. Authorization to attempt root
must account for those installer effects and the owner's conditional risk and
reversibility preference, not just another read-only probe.
