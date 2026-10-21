# Auto-Launch & Home Takeover — Findings

**Current result, 2026-10-21:** Root and Reframe automatic boot/wake launch have
now been demonstrated on this TV. The root helper uses native foreground and
TV power subscriptions, keeps LG Home/Back available, and yields to native
apps/casting. Root/launcher also returned after removing LG Developer Mode.
See [LAUNCH-PERSISTENCE.md](LAUNCH-PERSISTENCE.md) and [HANDOFF.md](HANDOFF.md)
for exact checks and current status. The non-root investigation below is
historical; it does not describe today's rooted configuration.


**Follow-up, 2026-10-19:** Root research is reopened. Read
[`ROOT-INVESTIGATION.md`](ROOT-INVESTIGATION.md). The probes below describe the
prisoner's sandbox, not necessarily the host filesystem. They establish no
working integration under current Dev Mode access; they do not rule out rooted
persistence or every possible non-root workaround.

Investigated directly on the TV (read-only) via the Dev Mode shell.

## Question
Can Reframe (a) launch automatically at boot/wake and (b) take over the Home
button — **without root** — on this 55UA7050PUB (webOS TV Lite, K25/ptl4tv)?

## Evidence gathered on-device
- **No boot/init hook is writable or even present** for the `prisoner` user:
  `/var/lib/webosbrew/init.d` **absent**, `/etc/init.d` **absent**,
  `/var/palm/event.d` **absent**, `/var/luna` present but **not writable**,
  `/media/developer/startup` absent. `/media/developer` itself is owned by root
  and only its `apps`/`temp` subtrees are app-writable.
- **The prisoner role is sandboxed on the luna bus.** Privileged methods are
  explicitly denied, e.g. `applicationManager/getForegroundAppInfo` returns
  `"Denied method call ... for category /"`. Config is **readable**
  (`com.webos.service.config/getConfigs` works) but there is no exposed,
  permitted method for the prisoner to set a boot/default/home app.
- **The Dev Mode service offers no auto-launch feature** — it ships only the
  devmode binaries (gdb/strace/openssh), no startup hook.

## What these observations establish
The launcher projects that *do* achieve boot-launch and Home interception
(e.g. webos-launch-home) do it by writing root init scripts to
`/var/lib/webosbrew/init.d` and using the Homebrew Channel **root** service to
re-open the app and watch for the stock Home screen. On this TV those paths do
not exist, because there is no Homebrew/root — and the prisoner cannot create
them. There is no sanctioned non-root API to register a boot app or rebind Home.

## Conclusion
- **Boot auto-launch:** no supported on-TV mechanism established under current
  Dev Mode privileges. Cold boot and standby wake need separate validation.
- **Home-button takeover:** no working mechanism established under current
  Dev Mode privileges.
- **What works without root today:** Reframe installs as an app and launches on
  demand (our `scripts/deploy.sh` proves install + launch + running). The user
  still opens it like any app; it cannot replace the home screen or appear on
  boot.

## The root path on this specific TV
Root on this exact **K25 / ptl4tv / webOS TV Lite** unit remains unverified.
The follow-up found closer platform evidence and the SlopBro service candidate.
Signed read-only rootfs alone does not block runtime root or persistence using
writable state and privileged boot activities. The earlier blanket exclusion
is superseded by `ROOT-INVESTIGATION.md`.

## Honest options
1. **Accept manual-launch Reframe** (ship Phases 1–2; best experience possible
   without root). Reality: not a home-screen replacement, no boot launch.
2. **Pursue root research (reopened by the owner).** Investigate the service
   route first; verify acquisition, persistence, and Home integration separately.
   No root installer or persistent system changes have been run on this unit.
3. **Hardware/behavioral workarounds** (weak): e.g. a universal-remote macro or
   a smart-home routine that sends the keypresses to open Reframe after power-on.
   Not true boot integration; fragile; outside the TV's sanctioned surface.
