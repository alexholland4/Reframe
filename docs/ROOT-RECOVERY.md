# Recovery independent of developer SSH

Root SSH/HBC survived the first controlled restart, with a fresh startup status,
low kernel uptime, and a new SSH daemon PID. The TV remained functional and the
owner confirmed its apparent power-off was a black HDMI 2 screen: Settings
opened and stayed on. The first verifier timed out because this TV reused its
Linux boot ID across the restart; a changed boot UUID must not be required as
the sole evidence on this snapshot-boot system. Developer SSH and both apps
also survived. No Developer Mode transition or Reframe boot launch has run yet.

## Remaining Developer Mode dependency

The regular marker and LG app are still present. The owner-approved LG HTTPS
session check confirmed about 975 hours remaining. This is working rooted
startup with Developer Mode retained, not proof of independence from its session
expiry. Do not remove that fallback until a different recovery entry is tested.

The existing inventory SSAP client is limited to READ_INSTALLED_APPS. A harmless
Reframe launch attempt returned 401 insufficient permissions, so that pairing
cannot be represented as an independent recovery launcher.

## Prepared replacement entry

`pair-tv-recovery.py --execute` requests a separate TV-remote consent prompt for
**Reframe recovery**, asking only LAUNCH permission. It strictly reuses the TV
TLS fingerprint already saved by the inventory pairing; it does not accept a
new or changed device certificate silently. The new client key remains in an
ignored fingerprint file. It does not grant remote shell/root permission itself.

`tv_recovery.py` permits only Reframe and the proven adoverlayex entry app.
`probe-root-identity.py --launch-transport ssap --operation resume-access
--execute` then uses that pinned launch route instead of developer SSH, serves
only the existing bounded probe assets, and invokes the proven one-shot root
route. Its fixed recovery module checks the protected startup manifest and
source hash before executing the **existing** minimal SSH startup. It creates
no replacement keys, changes no boot configuration, and requests no reboot.
Staging ownership/cleanup and Reframe restoration use the established controls.

The required live check is to stop only our matching SSH listener, recover it
through this SSAP/probe path, authenticate again with the same dedicated key
and host pin, and verify root. Developer Mode stays available throughout that
test. Pairing and that live recovery have not happened at this checkpoint.

Four offline recovery tests cover exact existing-source execution, hash and
ownership refusal before execution, and rejection of unprivileged output.
The recovery payload parses as JavaScript; pairing defaults to no connection
without `--execute`. This is a userspace recovery route, not firmware or
bootloader rescue, and depends on normal TV app/control services still working.


## Live pairing and recovery result

The owner accepted the LAUNCH-only pairing after the first prompt was missed.
The initial immediate post-pair launch was rejected; a fresh pinned connection
later returned native launch success. No extra permission scope was added.
The independent test stopped only our SSH daemon, launched adoverlayex via
SSAP, received actual UID/EUID 0 from the proven route, and invoked the existing
minimal startup. Its staging files/folder were removed and root SSH returned.
The controller's final SSAP Reframe restore hit a TLS-handshake timeout, so the
whole test reported failure even though its core access recovery succeeded.
Reframe was then restored through authenticated root SSH. The controller now
permits that recovered-root transport solely for final Reframe restoration;
the recovery entry itself remains SSAP-only. A complete rerun is still required.

Runtime inspection showed load average around 34, but 33 blocked tasks were
mostly native Realtek hardware/driver threads and available memory was about
470 MiB. Direct CPU sampling measured 26.5% busy, and no managed startup process
was running at that snapshot. A startup storm was not demonstrated. The initial
load concern must not be recorded as proof of one. Nevertheless the minimal
startup omitted HBC's `/tmp/webosbrew_startup` once-per-boot guard. A guarded
runtime marker was created and only the managed boot activity was cancelled
while correcting that omission; SSH and TV operation remained available.

The source now creates that runtime marker after validating the core access
state, so HBC avoids repeated payload spawns. Direct recovery stays idempotent
and may execute with the marker already present. The callback test explicitly
removes only our validated guard before its deliberate listener restart. Six
startup tests include guard creation, rejection before side effects, and direct
recovery with an existing guard. Reinstall/register the corrected callback
before any further reboot. This correction was subsequently installed,
callback-tested by restarting only root SSH, and registered again (activity
109 at that checkpoint). Root and developer SSH were both available afterwards.

The owner confirmed HDMI 2 is a soundbar. It reports a signal despite its blank
screen; connection/signal flags alone cannot classify it as a video source.
Home Auto Launch/Power On Screen was already Home/On and was not changed.
A later boot/wake launcher may treat that specific audio-only input as a startup
fallback, while yielding to actual video apps/casting/other HDMI inputs.


## Complete independent retest, 2026-10-21

After installing the optional launcher, a retest first hit a launch rejection;
root SSH was restored through the retained developer/HBC route. Another SSAP
launch was accepted but did not produce a page report. The stock diagnostic
entry reads its URL only on initial page load; that is a possible explanation,
not a demonstrated cause of those transient failures. A separate SSAP close
request was denied with 403; no permission expansion was requested.

A subsequent full run succeeded, then the decisive test deliberately stopped
only the dedicated root SSH listener and used SSAP-only entry again. It reported
actual UID/EUID 0 and owned-process/staging cleanup, executed the hash-verified
existing startup, restored Reframe, and exited successfully. Strict dedicated-key
root SSH subsequently returned UID 0. Developer SSH was not the entry or cleanup
transport in that successful run. The launcher PID was preserved, avoiding a
duplicate helper. Recovery remains dependent on working native app/control
services and has shown transient launch failures; it is not bootloader rescue.

The controller explicitly restores Reframe at completion. That interrupted an
overlapping owner YouTube test; functional checks must be isolated from all
such app-launch/recovery requests. The helper's latest automatic-launch record
predated the interruption. The owner reported other functionality still worked.
