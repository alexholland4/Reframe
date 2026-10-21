# Reframe boot and wake launcher

Prepared 2026-10-21; live installation/results are recorded in HANDOFF.md.

The optional root helper subscribes to native foreground and boot/power events.
During the first 20 seconds of startup or wake it may launch Reframe once from
LG Home or HDMI 2. The owner confirmed HDMI 2 is a soundbar: its blank display
reports a video signal, so signal flags alone cannot identify it as audio-only.
Before launching, the helper checks the current native foreground again after
a short settling delay. Any other app/input disarms that startup window.

Settings, YouTube, AirPlay/casting and other HDMI inputs take priority. After
the initial decision, normal Home and Back are available without interception.
Screensaver dismissal does not count as a new wake. This is boot/wake launch,
not a Home-button replacement. Actual standby power notifications and boot
behavior need live verification on this firmware; tests cannot establish them.

The existing minimal root callback optionally starts the helper only when its
enable flag and three source hashes pass root-ownership/type/mode checks. A
launcher error cannot prevent key-only SSH startup. The helper keeps two native
subscriptions, performs no foreground polling, and stops its own activity on
transport/protocol failure, leaving native TV behavior available.

## Install and undo

`python scripts/manage-launcher.py install --execute` writes a protected
manifest before creating three files under `/var/lib/reframe`, then creates
`launcher-enabled` last. The installed minimal startup must match the reviewed
local source. `start --execute` runs that existing startup and `status` reports
the actual matching PID and latest result. Mutations default to no TV connection
without `--execute`.

`python scripts/manage-launcher.py remove --execute` checks its exact source
hashes and root-owned files, removes its enable flag, stops only its verified
helper PID, then removes its files/manifest/status. Unexpected state is
preserved for inspection. Root SSH remains available. Remove the launcher
before using the separate startup/elevation/access undo tools; the startup
manager refuses removal while the launcher manifest exists.

No firmware partition, signed LG startup, native app, casting component,
remote key mapping, power preference or network block is changed by this stage.
Developer Mode/session independence remains a separate unfinished transition.
