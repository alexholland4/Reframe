# Minimal root persistence and staged launcher integration

The owner authorized persistent Reframe launch and then explicitly approved
HBC's broad root-service permissions. HBC elevation and actual UID 0 command
execution are verified. All five changed profiles match the reviewed plan;
its undo passes validation against the actual state. The owner again confirmed
all required native/casting features work after elevation.

## Minimal startup

The prepared callback replaces the **absent writable HBC startup file**, not
LG's signed startup script. `/var/lib/webosbrew/startup.sh` executes only
`/usr/bin/node /var/lib/reframe/startup.cjs`. This code verifies root ownership,
safe file types/modes, and the pinned SSH binary hash; preserves an already
matching key-only listener or starts it on IPv4 port 2222; and writes an atomic
root-owned status record with actual UID and Linux boot ID. Binding 0.0.0.0
lets the server start before DHCP completes. Password login and forwarding
remain disabled. No telnet, default password, telemetry mounts, hosts-file
changes, session-counter reset, or launcher action is included.

`scripts/manage-root-startup.py` provides separate install, callback test,
register, remove and status actions. Mutations need `--execute`; otherwise they
make no TV connection. Installation requires absent destinations and records
its protected hash manifest before creating the two startup files. It requires
the standard HBC boot activity to be absent rather than replacing an unknown
existing registration. `scripts/tv_connection.py` uses strictly pinned SSH and
checks native replies, with bounded open stdin for this TV's Luna behavior.

The live callback test first verifies HBC access through independent developer
SSH and runs the callback while root SSH is still available. It then stops
only the matching dedicated SSH listener and invokes HBC's callback again via
developer SSH. New authenticated root SSH and the root-written boot-status
record must succeed before registration/reboot.

HBC's own `registerActivity` method registers its persistent core-boot-done
callback. Its success response alone is insufficient: the controller lists
actual activities and verifies exactly one matching persistent callback.
This is an HBC-specific writable activity, not a signed init/firmware patch.

## Undo for this stage

`manage-root-startup.py remove --execute` validates its exact managed file
hashes, cancels only the matching HBC boot activity by ID, verifies that it is
gone, then deletes its two files, status record, and manifest. SSH remains
running. Cancelling before removal prevents a dangling boot callback from
falling back to HBC's stock startup. Unexpected files or a different callback
are preserved. This stage undo must precede the separate elevation/access
undo. It has not been exercised live at this preparation checkpoint.

## First controlled boot test

After callback/registration checks and the owner's post-elevation functional
confirmation, the first controlled reboot will **retain LG Developer Mode,
its regular session marker, and the original verified signed startup script**.
This preserves developer SSH as a fallback if HBC startup fails on this K25 TV.
Confirm changed Linux boot ID, root-owned startup status from the new boot,
authenticated root SSH, HBC UID 0, and developer fallback after restart.
Do not infer success from a saved activity or a service reply alone.

Passing that test does not yet remove dependence on Developer Mode/session
validity. Its eventual transition needs its own journal/recovery checks before
LG app removal or marker conversion. No such transition is included in the
minimal startup installer. Launcher boot/wake behavior and a tested remote
escape are a separate stage; native apps/casts/HDMI must remain in control.

Five startup tests use fake filesystem/process objects to check actual boot
identity, key-only daemon flags, duplicate-listener avoidance, and refusal of
unsafe files, altered binaries, or a PID belonging to another process. These
supplement the existing 44 Node and three Python checks. Live results will be
recorded after execution; preparation is not proof of boot persistence.
