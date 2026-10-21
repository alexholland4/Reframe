# Authenticated root access stage

The owner explicitly authorized rooting and persistent Reframe launch after
reviewing the proven UID 0 route and verified backup. This stage establishes
authenticated access before installation/persistence/Home changes.

The root preflight read actual host mounts: `/` is read-only squashfs;
`/var` and `/home` have writable ext4 mounts. Root's home is `/home/root`
and shell `/bin/sh`. The new state paths were absent before provisioning.

The SSH binary is extracted from the already pinned HBC 0.7.3 package,
not downloaded from an unreviewed binary source. It is 227,608 bytes,
SHA-256 `8f5b03abd1075b843eba4b204de380cd30f7cb2940090f7c13276b54aab70f20`.
Its help ran successfully as prisoner: Dropbear 2022.83. No separate
dropbearkey is packaged; `-R` generates host keys on first connection.

`--operation provision-access --public-key <public-key> --execute` uses
the proven route with a fixed provisioning module. Before writing, it checks
root/process identity, safe root-owned parents, absence of destination state,
the binary's size/hash, and a supplied Ed25519 public key. It uses exclusive
file creation and writes its journal before the remaining provisioning.

| New state | Purpose |
| --- | --- |
| `/var/lib/reframe/access-journal.json` | Original absences, hashes, port; 0600 |
| `/var/lib/reframe/dropbear` | Root-owned SSH executable; 0700 |
| `/var/lib/webosbrew/sshd/` | Dropbear's compiled default host-key storage; 0700 |
| `/home/root/.ssh/authorized_keys` | Dedicated public key only; 0600 |
| `/var/run/reframe-sshd.pid` | Dedicated server PID |

The dedicated client private key stays outside the repository in the owner's
`.ssh` folder. The server uses TCP 2222 on the TV's current LAN address,
`-s` (password authentication disabled), `-G root`, `-j -k` (forwarding
disabled), and an idle timeout. No password file, signed filesystem,
Developer Mode marker, LG app, boot job, HBC app, ActivityManager activity,
or Home behavior is changed at this stage. Root access is not yet reboot
persistent. The server binary is older software from the pinned package;
do not expose this port to the internet.

## Targeted undo

`scripts/root-probe/rollback-access.cjs` defaults to validation/dry-run.
Run it with Node as root, adding `--execute` only for removal. It checks
the journal, root ownership, file types, binary/key hashes, known host-key
filenames, and daemon command line. It refuses later integration files or
other HBC state. On execution it removes only the access-stage files and
empty directories and stops only the matching daemon. It does not recursively
delete, touch Developer Mode, or reboot. Existing SSH sessions may finish.
After later stages, reverse those first; this tool deliberately refuses to
guess how to undo them. Recovery also remains possible through the proven
one-shot route while that route and normal TV app services work.

Four new offline provisioning tests check exclusive journal-first writes,
key-only launch flags, and refusal before mutation on hash/ownership/existence
failures. Existing transport/probe/snapshot tests remain applicable. Live access
and undo verification must be recorded below; preparation alone proves neither.
