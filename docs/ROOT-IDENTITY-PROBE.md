# Limited root identity probe

Prepared after the owner resumed and explicitly instructed proceeding with the
TV on and Reframe open. The live preflight still reports firmware 33.30.97,
webOS TV Lite SDK 10.3.0, Reframe 0.1.1, and prisoner UID 6349. The installed
Node runtime is v16.20.2. No root installer has run.

## Scope

The first root action is a single jsserver invocation through a previously
verified overlay app, using the launch layout from pinned SlopBro commit
`21023d56ca424607bb03d2939609cc658c655fc7`. The implementation is separate from
the all-in-one installer. It downloads only a package manifest and an
identity-only module into `/media/internal/downloads/reframe-uid-<random-id>`.
The module reads its UID/EUID, PID/argv, selected /proc/self/status fields, and
metadata for four relevant host paths. It contains no child-process execution,
shell script, HBC install, Developer Mode marker change, activity registration,
startup hook, firmware/partition write, telnet server, or reboot request.

Delivery still creates writable download state; LG service logs/download
history or runtime helper files may remain. This is not a claim of zero writes,
zero risk, a working root installation, or a complete unroot procedure.

## Cleanup and reporting

The module checks the staging directory, manifest nonce/name/main, and both
files before removing only main.js and package.json. It uses nonrecursive
rmdir, preserving unexpected additional files. It posts its identity report
to a random scoped endpoint on this computer. The local server accepts only
the TV's source IP and the current run path, serves an explicit asset allowlist,
and bounds input size/timeouts. It does not serve repository contents.

The module exits only if its module directory and process argv identify the
new probe process. An unexpected/shared process is reported and not exited.
Root identity is not inferred from HTTP delivery or a service success reply.
The controller reports incomplete ownership/cleanup separately even if UID 0
is observed. On failure it stops; there is no automatic retry or kernel fallback.
The page requests its own closure and the controller restores Reframe. The
local server stops and raw results are saved in ignored fingerprint text files.

## Checks and local recovery material

All 28 local tests pass: 17 existing bridge regressions and 11 root-probe tests.
The root tests use fake filesystem, process, and HTTP objects; they do not run
real privileged operations. They check actual/negative identity, marker and
symlink refusal, extra-file preservation, shared-process handling, report
failure, isolated downloads, and no execution after download denial. Python
controller syntax, generated JS syntax, run-ID/URL validation, and the upstream
source hash were also checked. This does not establish TV compatibility.

An ignored `backups/pre-root-<UTC timestamp>/` snapshot contains the committed
source archive, local Reframe 0.1.0/0.1.1 packages, private device evidence, and
hash manifest. It does not contain a TV firmware image or the private SSH key,
and is not a boot recovery mechanism. Privileged original-state backups still
need capture before any persistent root installation changes.

## Tools

- `scripts/probe-root-identity.py`: default prepares inert local review files;
  `--execute` is required to start the server and invoke the TV service route.
- `scripts/root-probe/identity-service.js`: identity-only module template.
- `scripts/root-probe/probe.html`: bounded download/service/close page template.
- `tests/root-probe.test.mjs`: offline simulated safety checks.

Live execution results must be added after the attempt. Success would establish
only root execution in the reported context; persistence, protected-state
backup/rollback, replacement access, and Home integration remain separate gates.
