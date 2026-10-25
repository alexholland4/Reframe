# Startup performance investigation

October 25, 2026. Read-only investigation after the owner accepted the early
AH cover on real remote off/on. The complete drawing, pure black background,
fade into Madison, absence of firmware/Alexa popups in that use, controls,
Prime playback/exit and iPhone casting all passed. Preserve this baseline.

The remaining concern is the completed logo holding for several seconds.
The owner prefers faster startup; a subtle Loading indication after the draw
is acceptable if the remaining wait cannot reasonably be shortened.

## What the actual TV establishes

Retained `/var/log/messages.0.gz` and `/var/log/bootd.log` contain these monotonic
timestamps. These are service events, not camera measurements or the complete
remote-button-to-picture duration.

| Recorded event | Full restart | Owner-tested wake |
| --- | ---: | ---: |
| Native cover open request | 17.81 s | 382.66 s |
| SAM begins launching Reframe | 28.18 s | 385.14 s |
| Compositor reports Reframe visible | 36.45 s | 395.95 s |
| Launch request to visible | 8.28 s | 10.81 s |

The first optional preload recorded on this restart was LG Channels at 88.02 s,
well after Reframe became visible. LG Home followed at 98.02 s, Prime at
105.02 s and Netflix at 112.04 s. These events do not establish optional
preloads as the cause of the cold-start delay. Apps already resident across
standby can still affect wake performance; no controlled comparison exists yet.

The live preload policy confirms LG Channels, stock Home, browser, voice,
Netflix, YouTube and other apps are enabled candidates. AirPlay's preload
policy flag is false even though its own service launches the receiver.
Policy lists are not an accurate inventory of removable dependencies.

Reframe's retained browser navigation sample reported:

- DOM interactive: 4.23 s after document navigation started.
- First contentful paint: 4.89 s.
- Window load event complete: 7.96 s.
- Madison image: 3840 x 2765, 1,707,035 JPEG bytes.

The sample describes this renderer's initial document load, not later fast
returns to an existing page. It does not attribute individual milliseconds to
image decoding, CPU contention, filesystem access or web-engine initialization.
Resource entries were empty in this inspection; do not invent per-file timings.
The app renders synchronously and does not await weather/network completion.

After the owner's app/casting checks, MemAvailable was about 332 MiB of
1.67 GiB reported RAM. There was swap use and some measured memory pressure;
this later snapshot cannot prove or exclude pressure during wake. `/var` was
35% used and the app-store filesystem 45% used. Storage exhaustion is not
indicated. Summing process RSS would double-count shared memory.

## Promising targeted changes

1. **Declare that Reframe can start offline.** The actual native CoverUI reads
   `appInfo.needNetworkToLaunchOnBoot`; absent that field, it assumes true.
   Its launch path can wait for connectivity or a 10-second timeout. Reframe's
   packaged `appinfo.json` does not currently declare the field. A false value
   matches this local launcher: weather may arrive later and apps still use
   their own networking. Before deploying, verify SAM preserves/returns the
   field through getAppInfo, then compare real startup. The full restart's
   roughly 10-second cover-to-launch gap is consistent with this gate, but the
   retained logs do not establish that it fired. The tested wake's gap was
   about 2.5 seconds, so a universal 10-second saving is not supported.
2. **Measure and reduce app artwork work.** The wallpaper includes pixels
   outside the bottom-aligned 16:9 viewport. An equivalent bottom crop and
   appropriate compression could reduce decode/upload work without changing
   the visible framing. Benchmark image decoding and first paint on this TV,
   preserve the original photo, and compare visual quality at 4K. LG recommends
   packaged, compressed images to reduce load time in its
   [app resource guidance](https://webostv.developer.lge.com/develop/getting-started/app-resources).
   Browser navigation timing alone does not prove the wallpaper is the bottleneck.
3. **Evaluate selective preload policy only after those comparisons.** There
   is a native get/setPreloadPolicy interface and a configuration-backed list.
   A backed-up change to a specific unused app's preload entry is preferable
   to uninstalling apps or stopping the entire preload manager. Its persistence,
   restart semantics and effect on wake still need a controlled trial. Keep
   stock Home available for Blue recovery, and preserve casting, HDMI/audio,
   app updates and root startup. No safe speedup estimate exists yet.
4. **Add delayed feedback only if a meaningful wait remains.** Show a small
   Loading label after the mark completes and a short grace period, without
   delaying readiness or replaying the intro on ordinary app exits. The
   active cover lives in a hashed readonly resource: a change requires a
   separately staged, guarded resource update with undo, not overwriting the
   accepted image in place.

No TV files, settings, app state, services or preload policies changed in this
investigation. No reboot, app launch or power request was made. No app was
removed and no loading label has been installed. Start with the app-only
offline metadata/artwork trial; optional service changes are not prerequisites.

## Private evidence and recovery

Ignored evidence is under `.research/startup-performance/`: `baseline.json`,
`details.json`, `configs.json`, `browser.json`, `cover-logs.json`,
`preload-policy.json`, `readiness.json` and `app-metadata.json`.
Device logs and proprietary native QML remain private.

The installed animation and firmware-only hostname mapping have the existing
ownership journal and exact undo in [EARLY-COVER-TRIAL.md](EARLY-COVER-TRIAL.md).
Performance experiments must preserve that accepted baseline and its backups.
