# Protected original-state backup

Prepared after the successful UID 0 probe and owner confirmation that Reframe,
Settings, and Back still work. Persistent root, HBC, Home integration, and
reboots remain outside this backup stage. Post-probe casting/playback have not
been retested; the earlier owner-confirmed baseline remains recorded.

## Scope and controls

`scripts/probe-root-identity.py --snapshot` prepares inert local payloads.
Adding `--execute` invokes the proven one-shot service route once, captures the
fixed list in `scripts/root-probe/snapshot-paths.json`, cleans only its own
marked staging files, restores Reframe, and stops its local HTTP server.
No shell command runs inside the privileged module.

The list covers the Developer Mode marker, boot job, startup script/signature
and verification key, HBC startup/preferences/service-registration paths, root
authorized public keys, relevant directory metadata, mounts, and UID mapping.
Missing paths are recorded. The only discovery is one nonrecursive listing
of `/var/luna/preferences` for names starting `dc`, limited to 16 entries.
No password database or private keys are copied. Final file symlinks are
recorded without reading their targets; path ancestors are not recursively
audited. A symlink or missing critical original requires review rather than
assuming a restorable copy exists.

Files use read-only/no-follow descriptors with inode checks, 128 KiB per-file
and 512 KiB total limits. Changing regular files and oversized content are
refused. Virtual proc files have bounded reads despite their zero stat size.
The module hashes and base64-encodes exact bytes, retaining UID/GID/mode and
timestamps as metadata. The receiver restricts source IP and random run path,
caps snapshot reports at 1 MiB, and validates the complete allowlist, content
lengths, and checksums before extracting local copies. Capture errors other
than recorded ENOENT prevent a validated backup from being produced.

Raw evidence stays in ignored `docs/fingerprint-root-identity-*.txt`. Validated
copies and a manifest stay in ignored `backups/protected-<run-id>/`. Neither is
committed. Download/service logs may remain on the TV, as with the identity
probe. The capture installs nothing and changes no protected original.

## Validation before execution

35 Node tests pass, including existing transport/probe checks and new binary,
symlink, missing-file, size-limit, mutation, descriptor-cleanup, and bounded
counter-discovery checks. Three Python tests cover binary extraction, multiple
invalid reports (including paths, hashes, permission failures and incomplete
copies), and separation of identity/snapshot rendering. Generated identity
and snapshot JavaScript and page syntax parse; the pinned upstream launch
source hash matches. These tests do not execute privileged operations.

## Completed live capture

One capture using the source checkpoint `40c7faf` completed with exit code 0.
Its own process reported UID/EUID 0, matching module/argv ownership, and removal
of its two marked staging files and empty folder. Reframe's restore launch
returned true and the local server stopped. A separate read-only SSH check
still returned prisoner UID 6349; HBC's app status returned `exist: false`.
The owner separately confirmed Reframe, Settings, and Back work after this
capture, as well as after the earlier identity-only probe. Post-capture
casting/playback have not been retested.

The ignored backup is `backups/protected-5ad48cec858021b059f8b054/`, with
32 path records and **15,918 copied bytes across five regular files**. All five
local hashes were independently rechecked against the capture manifest.

| Original state | Captured result |
| --- | --- |
| Developer Mode marker | Regular file, 64 bytes, 0644, UID 5850/GID 5000; copied privately |
| `/etc/init/devmode.conf` | 3,211 bytes, 0755, root-owned; copied |
| LG `start-devmode.sh` | 11,331 bytes, 0700, UID 0/GID 5000; copied |
| LG startup signature | 512 bytes; copied |
| LG verification public key | 800 bytes; copied |
| Existing startup `.backup` | Absent |
| HBC app/service/state and listed Luna registrations | Absent |
| Root `.ssh`/authorized_keys and listed HBC preferences | Absent |
| Developer Mode `dc*` counters | No matching names in the bounded listing |
| `/proc/mounts` | Symlink to `self/mounts`; recorded without following |
| `/proc/self/uid_map` | Absent |

Mount contents were therefore **not captured**. This backup does not establish
which filesystems will retain a future root key or hook across boot. That
requires a separate targeted read before provisioning replacement access.
The Developer Mode marker contains session material: keep its bytes private.
A saved marker does not guarantee that LG will accept an expired session.

The copied script passed local `openssl dgst -sha512 -verify ... -signature ...`
verification with the copied LG public key: **Verified OK**. This proves that
these captured script/signature/key bytes agree; it does not prove reboot
behavior, future server acceptance, or a complete undo procedure.

## Rollback implications from the actual originals

The actual init job verifies the startup script before running it. On failure,
it deletes the Developer Mode marker/counters and tears down the developer SSH
jail. With no marker, it recursively removes `/media/developer` and developer
Luna registrations. The signed startup script can also remove the marker for
an app/login-version mismatch or a failed online Developer Mode session check.
The stock script is currently valid and none of these files was changed.
**Do not overwrite this signed startup script or reboot with unreviewed state.**

The reviewed all-in-one installer would convert the regular marker to a
directory and change HBC service registrations, with a Developer Mode removal
prompt. Restoring a few bytes afterwards is not a demonstrated complete undo:
package/service state, registered startup activity, session validity, and boot
ordering must all be accounted for while working root access remains.
No protected-state restoration has been executed or tested on this TV.

HBC 0.7.3 startup additionally mounts telemetry paths read-only even when update
blocking is off. It also has default/failsafe root telnet behavior described in
[ROOT-ATTEMPT-PLAN.md](ROOT-ATTEMPT-PLAN.md). These effects are separate from the
UID 0 acquisition route and are unnecessary for this backup. No HBC startup,
replacement SSH server, ActivityManager registration, boot hook, Developer Mode
removal, or Home interception has run.

The next preparation stage should establish a minimal change journal and
reviewed recovery commands, provision authenticated replacement access without
those broad startup side effects, and validate it before any persistence,
Developer Mode transition, or reboot. A file backup is not a firmware image,
boot rescue method, or proof that an installer can be undone.
