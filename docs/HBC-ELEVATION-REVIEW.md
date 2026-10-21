# HBC root-service elevation: approval review

The owner authorized actual rooting and persistent Reframe launch. Key-only
root SSH is established and its access-only undo was demonstrated live.
The owner confirmed Settings/Back, YouTube playback with sound, iPhone Screen
Mirroring, AirPlay playback, and YouTube Cast still work with root SSH enabled.

HBC **0.7.3 is installed**, but its elevation was rejected by automatic approval
review before the command ran. No HBC startup, persistent boot activity,
Developer Mode transition, Home interception, or reboot has happened.
Do not execute the rejected elevation indirectly or treat it as approved.

## Exact proposed changes

The installed elevation script matches the pinned package's extracted script.
Its code was simulated locally using the actual captured profile bytes, an
in-memory filesystem, and a mocked child-process API. No TV elevation ran.
The simulation changes exactly these five files under `/var/luna-service2-dev`:

| File | Proposed change |
| --- | --- |
| `services.d/org.webosbrew.hbchannel.service.service` | Replace the stock `/usr/bin/run-js-service` launcher with HBC's own unsandboxed `run-js-service` |
| `client-permissions.d/org.webosbrew.hbchannel.service.root.json` | Create HBC service wildcard access to the `all` permission group |
| `api-permissions.d/org.webosbrew.hbchannel.service.api.public.json` | Create a public API permission for `org.webosbrew.hbchannel.service/*` |
| `roles.d/org.webosbrew.hbchannel.service.service.json` | Add `*` and `com.webos.service.capture.client*` allowed names and wildcard inbound/outbound permissions |
| `manifests.d/org.webosbrew.hbchannel.json` | Register the two new permission files |

The two new files are absent now. The other three currently have their original
unelevated contents. The corresponding nondeveloper `/var/luna-service2` paths
are absent and the simulation leaves them absent. The only subprocess requested
by elevation is `ls-control scan-services` to refresh service definitions.

The proposed permissions are broad. HBC provides an `exec` method that runs a
shell command; after elevation that means root commands. Public Luna permission
can make this endpoint available to permitted local apps/services. This is an
additional security boundary change beyond possession of a dedicated SSH key;
it is not a claim that every app can bypass every other Luna check. It does not
itself open an internet-facing TCP command server or modify signed partitions.
See the pinned [HBC service source](https://github.com/webosbrew/webos-homebrew-channel/blob/v0.7.3/services/service.ts).

Automatic approval review specifically rejected this persistent permission/role
expansion because its broad security effects had not been specifically approved
or fully characterized. Additional owner approval is required before retrying
this step. Root acquisition and key-only SSH provisioning remain successful.

## Recovery material and prepared undo

Ignored `backups/hbc-before-elevation/` contains the exact original profiles,
the simulated before/after contents, and a validated elevation plan. A separate
targeted LG Developer Mode app/service archive contains 111 entries and is
6,443,822 bytes; its hash/size manifest is beside it. It may contain session or
account material and must remain private. The archive was limited to the two
named folders, measured before capture, and does not follow symlinks. It is not
a firmware image or a demonstrated full Developer Mode restore.

`scripts/root-probe/rollback-elevation.cjs` is prepared for this elevation stage
only. It checks the five proposed hashes and original checksums before any
mutation; stops only matching HBC service runners; restores the three originals
with original ownership/modes; removes only the two newly created profiles;
and refreshes service definitions. It refuses unexpected paths/changed content
and refuses if an HBC startup script exists (undo that later stage first).
The plan is not yet installed on the TV; before approved elevation it must be
written as root-owned 0600 `/var/lib/reframe/elevation-plan.json`.
Five offline tests cover dry-run, exact restoration/deletion, matching-service
termination, and refusal on changed profiles, unexpected paths, or later startup
state. This profile undo has **not** been executed live because elevation has
not run. The earlier access-only undo has been demonstrated live.

## Sequence after explicit elevation approval

1. Copy the validated plan to the protected root state directory and record the
   installed HBC package in its change journal.
2. Run the hash-verified HBC-specific elevation once. Compare actual profile
   contents to the simulated results and verify actual UID 0 through its service.
3. Validate the prepared undo against actual elevated state before boot changes.
4. Prepare and test a minimal root startup that starts key-only SSH and avoids
   stock HBC telnet/password/telemetry effects. Preserve the stock signed LG script.
5. Verify the boot callback and replacement access before any Developer Mode
   transition or controlled reboot. Test persistence separately from launcher
   behavior, then enable narrowly scoped Reframe launch with a remote escape.

The broad stock HBC startup is not approved merely by approving elevation.
Full boot recovery and complete unroot remain unproven on this exact TV.
