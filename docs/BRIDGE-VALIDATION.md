# Native bridge validation - 2026-10-20

The pre-root GitHub source checkpoint is `c344f63`. Reframe **0.1.1** was then
built, packaged, and installed as an ordinary Developer Mode app on the same
LG 55UA7050PUB, firmware 33.30.97 / webOS TV Lite 10.3.0. The existing SSH
identity remains prisoner (UID 6349); no root installer, persistent Home/boot
hook, Developer Mode removal, firmware change, or reboot was performed.

## Changes

- Replaced the missing webOSTV.js dependency with direct native
  PalmServiceBridge requests; alternate webOSServiceBridge is supported.
- TV detection is independent of bridge availability. A detected TV with no
  bridge fails visibly instead of entering desktop mock mode.
- Retain each native request until completion/timeout, cancel it afterward,
  and reject denied/malformed responses and timeouts. Failed tile launches
  show a status message rather than silently appearing successful.
- Replaced the absent Spotify placeholder tile with native Settings, app ID
  `com.palm.app.settings`. Settings deep-link parameters remain unverified.
- Set `disableBackHistoryAPI` false to restore platform Back handling; physical
  remote behavior still needs a manual check.
- Declared only `application.launcher` in requiredACG. LG's guide describes
  this declaration for newer platforms; it is not a claim to root privileges.

## Local checks

Seventeen Node transport regression tests pass, covering desktop preview,
missing bridge on TV, both bridge constructor names, request serialization,
negative and contradictory responses, malformed JSON/objects, timeout and
late reply, native exceptions, cancellation exceptions, and overlapping calls.
TypeScript and Vite production build pass. The build is about 8.22 kB JS and
2.26 kB CSS before gzip; no SDK or new runtime dependency was added.

## Live evidence and limits

The uploaded IPK's SHA-256 matched the local package. The packager rewrites
JavaScript during packaging, so installed appinfo, HTML, and JavaScript were
verified against the **IPK payload**, not the pre-package Vite bundle. The
installed version is 0.1.1. Reframe reports webOS rather than Browser preview.

A loopback-only developer SSH tunnel exposed Reframe's inspector. A temporary
in-page observer relayed native calls without changing their URI, parameters,
or replies. Actual DOM tile clicks produced the following native replies:

| Reframe tile | Requested app ID | Observed reply |
| --- | --- | --- |
| Settings | `com.palm.app.settings` | `returnValue: true` |
| YouTube | `youtube.leanback.v4` | `returnValue: true` |
| HDMI 1 | `com.webos.app.hdmi1` | `returnValue: true` |
| HDMI 2 | `com.webos.app.hdmi2` | `returnValue: true` |

These results were collected across separate runs. The initial run recorded
three successful tile calls before a short foreground-restoration response
window expired. A targeted HDMI 2 run recorded native success but exposed a
cleanup assumption: foreground switching can replace/disconnect Reframe's
inspector page. The helper now removes its observer before restoring foreground
and reconnects between cases; a targeted Settings run then passed with cleanup
and restoration. No full four-target run was repeated after that helper fix.
Reframe was restored and temporary inspector tunnels were closed.

Raw per-run results are in ignored `docs/fingerprint-launches-*.txt`. The
manual checker is `scripts/check-tv-launches.mjs` (Node 22+); it is not part of
the app or the local build. It intentionally opens native apps/inputs, so run
only when the TV is available. `--only settings|youtube|hdmi1|hdmi2` limits it.

Native launch acceptance does not prove visible Settings pages, streaming
playback/DRM, HDMI signal, physical remote controls, or casting. Those manual
checks remain pending in [SYSTEM-COMPATIBILITY.md](SYSTEM-COMPATIBILITY.md),
including the owner's iPhone Screen Mirroring, AirPlay playback, and YouTube
Cast. Do not start root or Home integration on the strength of these four
launch replies alone.

## Deployment findings

Legacy SCP mode failed because the TV has no scp executable; SFTP transfer
worked. Non-interactive Luna requests returned no output and left the old app
installed. A read-only SDK query verified that keeping stdin open allows the
reply loop to run. A single install request with that input lifetime succeeded.
Normal responses were parsed and installed payload hashes were verified;
there was no benchmark-mode repetition of installation in this pass.

The deployment script now keeps stdin open for bounded single interactive
install/launch requests, rejects bad/empty replies, and checks the installed
version. Its Bash syntax passes. Its individual commands have been validated
on the TV; the revised script was not used for another unnecessary reinstall.
The existing 0.1.0 IPK and source checkpoint remain local/source recovery aids,
not a firmware backup or root recovery mechanism.

## Primary references

- [LG's native wrapper implementation](https://github.com/webOS-TV-app-samples/LunaService/blob/master/lib/webOSTVjs-1.2.4/webOSTV.js)
  constructs PalmServiceBridge, retains requests, parses replies, and cancels
  one-shot requests. Reframe implements its own small wrapper, not a copied SDK.
- [Application Manager](https://webostv.developer.lge.com/develop/references/application-manager)
  documents launch ID/params and the returnValue/error fields.
- [Back handling](https://webostv.developer.lge.com/develop/guides/back-button)
  documents platform history/exit behavior.
- [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)
  maps application launching to application.launcher and describes newer-platform
  enforcement; this is not a workaround for privileged API access.
