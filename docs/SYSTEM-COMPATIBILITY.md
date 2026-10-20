# Preserve native TV functionality

Owner requirement added 2026-10-20: the launcher work and any rooting must retain
normal system Settings, app launching, and casting. This is an acceptance
condition for the project, alongside the risk/undo gates in
[ROOT-ATTEMPT-PLAN.md](ROOT-ATTEMPT-PLAN.md).

## Design requirements

- Keep LG Home, Settings, Home Hub, installed streaming apps, and casting/network
  services available. A custom home surface must not require deleting or
  disabling them. No debloat, broad domain blocking, or DRM changes are in scope.
- Use native application launching for streaming apps and inputs. Root acquisition
  is separate from verifying playback, DRM, app logins, and application switching.
- Keep native remote controls working: Settings/quick settings, Back, Input,
  volume/mute, play/pause, power, and dedicated app buttons where present.
- Any Home interception must be narrowly scoped and independently removable.
  It must yield to Settings, permission/pairing dialogs, native apps, HDMI, and
  casting. No timer may continuously force Reframe into the foreground.
- Boot/wake auto-launch must not override a cast, HDMI/CEC selection, or an app
  already opened by another source. Cold boot and standby wake are separate cases.
- Provide a tested way to suspend Home interception and reach the original LG
  Home using the remote. Remote access is an additional recovery path, not the
  only escape. This escape has not been implemented yet.
- On ambiguous state or repeated failure, Home integration should stop redirecting
  rather than block native navigation. A running custom launcher must not be a
  prerequisite for using the TV normally.

## Evidence from the saved on-device inventory

The paired read-only inventory returned these installed apps. Presence does not
prove that a feature is enabled, that a protocol is functional, or that Reframe
can launch the app from its current permissions.

| Function | Installed app ID | Current evidence |
| --- | --- | --- |
| System Settings | `com.palm.app.settings` | Present; Reframe helper corrected from the unlisted `com.webos.app.settings` ID. No live launch check in this pass. |
| LG Home | `com.webos.app.home` | Present; no Home interception installed. |
| Home Hub | `com.webos.app.homeconnect` | Present. |
| AirPlay | `airplay` | Present; sender/session test pending. |
| Screen Share | `com.webos.app.miracast` | Present; sender/session test pending. |
| Chromecast built-in | `com.webos.chromecast` | Present; discovery/session test pending. |
| Chromecast settings | `com.webos.chromecast-settings` | Present. |
| App casting | `com.webos.app.appcasting` | Present; not evidence that every app uses this component. |
| Netflix / YouTube / Prime Video / Disney+ | `netflix` / `youtube.leanback.v4` / `amazon` / `com.disney.disneyplus-prod` | Installed; tile launches and playback still unverified. |
| HDMI 1 / HDMI 2 / Live TV | `com.webos.app.hdmi1` / `com.webos.app.hdmi2` / `com.webos.app.livetv` | Installed; switching and return paths still unverified. |

Known Reframe blocker: `src/core/luna.ts` expects the `webOS.service.request`
global supplied by webOSTV.js, but the current page does not load that library.
Absent that global, it reports mock success even on a TV. App inventory and a
successful SSH launch of Reframe do not validate its tiles. Before relying on
Reframe as Home, fix and validate native bridge detection, real launch responses,
and clear failures for missing/denied apps. Spotify's configured ID was not in
the saved inventory and must not be assumed available. The Settings helper's
optional page targets also remain unverified for this firmware.

## Owner's required casting paths

Confirmed by the owner on 2026-10-20: iPhone Screen Mirroring, AirPlay playback,
and the Cast button inside the YouTube iPhone app. All three must continue to
work. Android/Miracast and other Google Cast senders are not owner-required
acceptance paths at present; preserve their installed components nonetheless.
Do not infer the YouTube session's underlying protocol from the Cast icon.

For each of the three required paths, capture a working baseline with the
owner's iPhone, then repeat after root/persistence alone and again after any
Home interception is enabled:

- iPhone Screen Mirroring: TV discovery, any code/permission prompt, mirrored
  display orientation and motion, audio where the baseline supports it, stop,
  and reconnect.
- AirPlay playback: start audio/video from a source that works at baseline,
  confirm TV audio and video, sender pause/resume and seeking where supported,
  disconnect, and reconnect. Do not assume a source app permits protected video
  mirroring merely because ordinary screen mirroring works.
- YouTube iPhone app: select this TV using the Cast button, launch the native
  YouTube receiver as needed, play a video, pause/resume and seek, disconnect,
  and reconnect. If discovery or pairing requires a setup step at baseline,
  record it and compare like for like.

Repeat session starts with Reframe visible and another app active, then check
standby/wake and cold boot under the safe reboot gates. Pairing/code dialogs
must retain focus; Reframe must yield to the receiver and must not interrupt
playback. These are pending manual checks with the owner's iPhone, not completed
tests or evidence of a specific receiving protocol.

## Acceptance checks and stages

Record results with firmware, sender device/protocol, launch origin, and stage.
Every row below is **pending**; this document specifies checks, not results.
Establish the baseline first. Repeat after root/persistence with Home interception
off, then after any Home interception is enabled. Test cold boot and standby
wake separately when it is safe to reboot under the root attempt plan.

| Area | Required checks |
| --- | --- |
| Settings | Remote gear opens quick settings and All Settings from Reframe, native playback, and casting. Open picture, sound, and network pages without changing saved values. Launch Settings from Reframe once its bridge is fixed. Dialogs retain focus and Back works. |
| Apps and playback | Launch actual installed streaming apps using the remote and Reframe. Play an entitled sample, confirm audio, pause/resume, logins, and Back/Home navigation. Include the owner's usual DRM streaming service. |
| Casting | Required: iPhone Screen Mirroring, AirPlay playback, and YouTube iPhone Cast. Verify discovery, pairing/permission dialog, audio/video, sender controls, disconnect, reconnect, and normal navigation afterward. Start while Reframe is visible and while another app is active. |
| Inputs and controls | HDMI 1/2 and Live TV where connected/configured; remote Input and app buttons; volume/mute, playback controls, and CEC behavior where used. Returning Home must not interrupt the selected source prematurely. |
| Power transitions | Repeat discovery and a cast connection after standby wake and cold boot. Start/wake a session from a sender if that works at baseline; Reframe must not take foreground away. |
| Escape and failure | Suspend/disable Home interception using the planned remote escape; reach stock Home, Settings, and apps. Simulate Reframe unavailable only after an independent recovery path is tested. No relaunch loop or unbounded retry. |

Do not progress to the next integration stage after a regression. Disable the
new Home/boot hook first if that is the stage that introduced the regression;
if functionality regresses after root alone, stop launcher integration and use
the recorded root recovery/rollback plan. Passing acquisition or persistence
checks is insufficient to declare the launcher compatible.

## Primary references and limits

- [LG Application Manager](https://webostv.developer.lge.com/develop/references/application-manager)
  documents launching by app ID; it does not prove permission or behavior for
  every internal app on this unit.
- [LG Back button guide](https://webostv.developer.lge.com/develop/guides/back-button)
  describes platform navigation; validate the actual remote/firmware behavior.
- [LG screen mirroring guide](https://www.lg.com/us/support/help-library/mirror-your-smartphone-to-your-lg-tv-wirelessly--20155311499809)
  distinguishes Android mirroring from AirPlay. Google Cast and in-app casting
  also need separate checks; one successful protocol does not validate another.
- [Launch Home reference implementation](https://github.com/gprot42/webos-launch-home)
  describes reopening a launcher when LG Home appears. It is a design reference,
  not installed code or proof that its behavior meets these requirements.
- [HBC 0.7.3 startup](https://github.com/webosbrew/webos-homebrew-channel/blob/v0.7.3/services/startup.sh)
  includes bind mounts, telemetry suppression, and optional update blocking.
  Rooting is not literally a UI-only change; those effects belong in baseline
  comparisons. Broad ad/service blocking is not part of the launcher plan.
