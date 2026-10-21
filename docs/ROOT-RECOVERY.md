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
