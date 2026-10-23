# Alex's portfolio startup animation

Reframe 0.3.9 bundles Alex Holland's original AH hero SVG from
[his portfolio source](https://github.com/alexholland4/alexholland4.github.io/tree/66c1dec6b1585652681086a618bb6019f33a442e),
at commit `66c1dec6b1585652681086a618bb6019f33a442e`.
Alex explicitly requested extracting and using his own artwork here.

The SVG in `index.html` preserves the six line coordinates, normalized path
lengths, 22-unit rounded strokes, and dormant arrow/pop elements. It keeps the
normal hero's cream ink (`#F3F2EA`), easing `cubic-bezier(.22,1,.36,1)`, 350 ms
initial delay, 170 ms staggering and 620 ms draw duration. The final stroke
finishes 1.82 seconds after playback starts. The portfolio's optional company
personalization overlay is separate and is not the reference. The owner later
requested a pure black background; 0.3.10 uses `#000` rather than portfolio green.

## Actual TV diagnosis and 0.3.10 correction

The owner saw no mark on wake and partial static strokes on app returns with
0.3.9, despite the desktop checks. Read-only native CoverUI inspection found
500 ms loading-text fade followed by 1,500 ms background fade. The old intro
started its clock at page creation, spending most/all of its draw behind that
cover. Its absolute three-second dismissal could truncate visible playback.

Actual TV replay measurements also identified the large SVG drop shadow as a
rendering cost: 34 frames / 1.94 seconds (about 18 fps) with the shadow, versus
84 / 1.90 seconds (about 44 fps) without it. An actual TV intermediate screenshot
confirmed the SVG paints correctly without the filter. This is not evidence of
exhausted memory. The filter is removed in 0.3.10.

`src/core/startup.ts` now subscribes to native `getForegroundWindowInfo`:

- Presence of `com.webos.app.cpcover` arms a startup/wake sequence, with drawing
  paused. Ordinary app returns without this cover leave the intro hidden.
- When the cover disappears, wait for visible app state, local artwork decoding
  and two animation frames, then begin the original six-stroke draw.
- Completion of the actual final stroke starts a 280 ms hold, then a 450 ms
  fade. An eight-second failure guard replaces the absolute normal clock.
- Input dismisses immediately and still reaches the normal UI control handler.
  Hidden/visible notifications, queued readiness work and reduced motion are
  handled without restarting after cancellation. No launch/power calls occur.
- A later native cover appearance can rearm the same retained webview on wake.

The markup starts hidden, so unavailable/denied status leaves Home usable.
All artwork/code is bundled; weather/network availability does not gate drawing.
Native status and decoded artwork gate playback, rather than guessing a delay.

![Personal startup mark](images/personal-startup.png)

## Read-only visibility permission and rollback

The generated dev-app profile originally grants `public` only; appinfo
`requiredACG` alone does not give this TV's dev-installed app native window
status. The initial separate custom one-method policy did not yield access and
was removed. The working controller adds the existing **read-only**
`surfaces.status` group only to `com.reframe.home-*`. It grants window/surface
queries, with no app launch, input, power or root control. The app uses only
`getForegroundWindowInfo` with a subscription.

```powershell
python scripts/manage-startup-visibility.py install --execute
python scripts/manage-startup-visibility.py status
python scripts/manage-startup-visibility.py remove --execute
```

This controller snapshots the exact original public-only profile bytes/mode
before writes, in `/var/lib/reframe/visibility-plan.json`. It owns just its new
manifest under `/var/luna-service2/manifests.d` and the added group in Reframe's
own generated `/var/luna-service2-dev/client-permissions.d` file. Hash/ownership
checks refuse foreign modifications. Removal restores original bytes/mode and
removes only its own manifest/journal. Root SSH/HBC/native Home/return policy
are independent. Reopen only Reframe after changing permissions: the TV caches
permission groups on an existing app bridge connection. Actual fresh-app
status access succeeded; simply creating another bridge in the old process
did not refresh the grant.

App installs regenerate that profile. `deploy-root.py` now reapplies the
hash-verified managed opt-in after installation and before launching, then
closes only Reframe via the SDK's `dev/closeByAppId` endpoint to refresh cached
connections. It does nothing if the observer plan is absent. This integration
has local regression tests; its first full live deployment is still pending.
The known manual close/reopen via Reframe's normal `window.close()` succeeded.

## Native screen boundary

Read-only inspection located the earlier “Reframe Loading” text in LG's native
CoverUI `UserInterfaceLayer/Containers/MainView.qml`. It displays the launching
app title plus a localized Loading string before the app renders. This is
separate from the app splash and spinner already disabled in Reframe metadata.
The inspected component exposes no app-specific animated-SVG splash field.
The app intro alone does not establish replacement of this earliest native UI.
The owner confirmed these native words remain before the 0.3.9 app intro.
The 0.3.10 timing fix waits for this cover to close; it does not remove it.

The reverse shutdown animation is deferred. LG has separate native logo and
compositor assets; a page visibility event neither identifies power-off reliably
nor guarantees time to render before the panel goes dark. No shutdown hook,
system QML, logo asset, firmware, boot partition or power sequencing was changed.
A later investigation can examine a reversible native customization; do not
delay or intercept shutdown merely to replay a web animation.

## Validation and undo

- Production build, all 82 Node and 31 Python tests pass. New policy tests cover
  exact original-byte restoration, journal-before-write, foreign file/symlink
  refusal and repair after an app reinstall. Deployment tests ensure only
  Reframe can be closed and the managed opt-in is refreshed first.
- Browser checks hold a simulated native cover open for 2.3 seconds (longer than
  the whole draw), verifying no strokes advance. After release, they verify
  progressive drawing, the complete final frame held before fade, ordinary app
  return skipping, a second cover/wake, remote cancellation races, reduced
  motion and observer-denial fallback. Existing UI/navigation/weather checks
  at 1080p/4K pass.
- Root deployment verified all 47 installed files and Reframe foreground.
  Actual TV inspection confirmed pure black and successful native window
  status access after reopening Reframe. Original shadow A/B timing and a real
  SVG intermediate screenshot are retained under ignored research.
- Owner confirmed Prime Video exit and Screen Mirroring disconnect return to
  Reframe. 0.3.10 wake/full-animation and no-intro-on-Prime-exit retests have
  been requested. No TV launch/recovery/reboot/power actions during those checks.

To remove the intro, remove its overlay and stylesheet link from `index.html`
and the `mountStartup` import/call from `src/main.ts`, then rebuild/deploy with
the guarded installer. Remove its read-only observer separately with the
controller above and reopen Reframe. The previous app package is retained
locally in ignored backups. Native startup/Home/app-exit settings are independent.
