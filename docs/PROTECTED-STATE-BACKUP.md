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

At this checkpoint the protected capture has not run. Its results must be
reviewed before persistent installation is designed. A file backup is not a
firmware image, boot rescue method, or proof that an installer can be undone.
