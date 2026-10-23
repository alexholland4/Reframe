# Reframe boot and wake launcher

Update 2026-10-23: this post-Home helper is now retired on the TV. Native input
startup plus the native default-Home mapping replaced it, with a tested Blue
escape to stock LG Home. The old helper remains a verified undo/reinstall path;
root SSH's separate minimal callback remains active. Current results/undo are
in [NATIVE-STARTUP.md](NATIVE-STARTUP.md). Do not reinstall the old helper by
default: its startup window can conflict with intentional LG Home escape.

Update 2026-10-22: the owner wants direct startup with no LG Home flash while
preserving the physical Home button as LG Home. A read-only investigation is
documented in [DIRECT-STARTUP.md](DIRECT-STARTUP.md). This helper remains
unchanged; its post-Home launch behavior is not a zero-flash startup solution.

Prepared 2026-10-21; live installation/results are recorded in HANDOFF.md.

The optional root helper subscribes to native foreground and TV power-state events.
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


## Live launch and undo, 2026-10-21

Sources checkpointed as `2578dae` were installed after updating and testing the
minimal root callback. With LG Home foreground, native subscriptions resulted
in a recorded Reframe launch and actual foreground `com.reframe.home`. Opening
LG Home again left Home foreground, demonstrating the once-only behavior.

The exact managed launcher undo then stopped its verified helper and removed
all three files plus flag/manifest/status. Root SSH remained available. Identical
sources were installed again and actual Home-to-Reframe launch recorded. An
independent SSAP root-access recovery later kept the existing helper PID.

The owner confirmed Settings/Back, YouTube sound and all three requested iPhone
casting paths work. A recovery cleanup overlapped YouTube testing and explicitly
restored Reframe, so an isolated playback check is pending. Full restart and
standby/wake behavior with this helper still need live verification. Developer
Mode remains installed and its marker is still the original regular file.


## Restart and initial standby test

The controlled restart returned actual root SSH and a fresh helper PID/status.
The owner saw HDMI 2 first, followed automatically by Reframe after a few seconds;
a later native foreground query confirmed Reframe. The initial query during
transition still returned HDMI 2, so request acceptance is not visibility proof.

Standby/wake instead returned to LG Home and stayed there. The initial helper
subscribed to bootManager power reports. It now uses the read-only native
`com.webos.service.tvpower/power/getPowerState` subscription, which returns
`subscribed:true`, and saves a bounded eight-event power history in its protected
status. The policy handles Active Standby and a retained Reframe surface before
LG restores Home. Other native apps/casts still disarm the window; committing a
launch still leaves subsequent Home/Back alone. Corrected standby behavior must
be verified live before calling wake launch complete.


## Standby correction verified

The native-power helper from checkpoint `8521bcf` received actual Suspend and
Active events. The owner repeated remote off, about 10 seconds wait, then on:
LG Home appeared for about one second, then Reframe opened automatically.
The same helper PID remained alive and recorded a new launch from LG Home.
The initial standby failure is resolved for this tested path. This was tested
before removing LG Developer Mode; the later session-independent configuration
still needs its own restart/functional confirmation.


## Final configuration accepted

After explicitly approved LG Developer Mode removal, a controlled restart again
returned root SSH and actual Reframe foreground automatically. The owner then
confirmed all requested native/playback/iPhone features and a separate remote
off/10s/on Reframe wake check. Boot/wake launch is verified in the final rooted
configuration. Home/Back are still native: closing YouTube or Screen Mirroring
returns to LG Home, and native startup is briefly visible before Reframe.
The owner explicitly deferred both UX changes to next session; see
[NEXT-SESSION.md](NEXT-SESSION.md). Leave the working TV alone tonight.
