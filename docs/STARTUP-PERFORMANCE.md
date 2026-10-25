# Startup performance investigation

## Installed optimization checkpoint

Later October 25: **Reframe 0.3.13 is installed**, with all 46 package files
verified. 0.3.12 introduced the measured changes below; 0.3.13 has identical UI
assets and adds only `supportQuickStart: true`. The owner approved optimization
and made the TV available for testing. The owner has now accepted the final
package: real off/on was notably faster, AH to Madison worked, and all requested
controls, Prime playback/exit and iPhone casting checks passed. The passive wake
observer completed without making any launch, recovery or power requests.

Changes actually applied:

- `needNetworkToLaunchOnBoot: false`, confirmed in LG's getAppInfo response.
  Weather remains asynchronous. The real restart below did **not** demonstrate
  removal of the approximately 10-second cover-to-launch interval; metadata
  acceptance alone is not proof of an effective boot-time improvement.
- Wallpaper preloaded from the HTML, with asynchronous decoding on the image.
  The bundled JPEG is now 3840 x 2160 and 1,325,791 bytes, retaining precisely
  the bottom-aligned area already displayed. Original bytes remain in
  `assets/source/`; the unused coastal photo was also moved out of the package.
  IPK size fell from 4,024,642 to about 1,564,576 bytes (61% smaller).
- Only LG Channels, browser and LG voice **preloads** are disabled, using the
  existing writable version-3 allowlist plus the immediate native policy API.
  No apps were uninstalled and no services stopped. Stock Home, HDMI/audio,
  AirPlay, YouTube, Prime, Netflix, update services and root startup are unchanged.
  The live restore/reapply passed before the restart.
- App-only Quick Start support is declared in 0.3.13, confirmed in getAppInfo.
  This is also used by the upstream
  [webOS Homebrew YouTube app](https://github.com/webosbrew/youtube-webos/blob/main/assets/appinfo.json).
  The combined changes passed the real standby/wake test below. This flag's
  individual contribution and renderer retention were not isolated, and it
  is not a guarantee of residency under memory pressure.

### Measurements, with limits

The owner confirmed the new real remote off/on was notably faster, while the
complete AH animation and all compatibility checks still passed. The passive
bootd record contains this matching native event comparison:

| Wake event | Earlier accepted 0.3.11 wake | New 0.3.13 wake |
| --- | ---: | ---: |
| Cover open | 382.661 s | 618.394 s |
| Reframe foreground report | 396.342 s | 620.717 s |
| Cover to foreground interval | 13.68 s | 2.32 s |

This records the startup handoff, not the entire remote-button-to-picture
latency. It also does not isolate which individual change contributed how
much. The owner independently confirmed the visible improvement. Do not
conflate this standby/wake result with the slower full-restart measurement.

| Browser event after fresh document navigation | 0.3.11 sample | 0.3.12 samples |
| --- | ---: | ---: |
| First contentful paint | 2.96 s | 1.94 s / 1.52 s |
| Window load complete | 4.15 s | 2.00 s / 1.84 s |

These are fresh Reframe relaunches on an already-running TV, with the three
optional preload policies already disabled in both versions. Caches and CPU
conditions can vary; the small sample is not a statistical speed guarantee.
It supports a faster launcher page, not a claim that the whole TV is twice as
fast. `measure-launch.py` also records SAM foreground timing, but **that can
precede actual first paint** and must not be presented as time-to-picture.

One actual 0.3.12 full restart returned pinned root SSH at uptime 45.50 s with
a fresh root callback. Reframe's native launch began at 27.76 s; compositor
visibility was recorded at 35.76 s, versus 36.45 s previously. The cover opened
at 17.72 s. Cold-start browser load complete was 1.92 s and first contentful
paint 1.84 s. Thus the web page improved substantially, but total cold boot
improved little in this comparison. The native service/readiness interval
still dominates the completed-logo hold. No further native cover/early-loader
patch has been made to bypass those gates or add a Loading label.

After restart the three exclusions persisted as `isAllowed: false`.
`isEnabled` resets to true in LG's runtime policy; the persistent allowlist
still prevents those apps from preloading. At more than three minutes uptime,
all three were absent from SAM's running-app list; stock Home, Prime, Netflix,
YouTube and AirPlay remained present. No extra replay hook was added.
Post-restart memory was healthier than the earlier post-playback sample, but
these different workloads cannot isolate how many bytes the change freed.

Production build, package validation, desktop 1080p/4K artwork/navigation/live
weather checks, 92 Node tests and 45 Python tests passed. The native cover's
three readonly mounts and exact ownership/hash status remain active. Owner
visual wake and Home/Blue/Settings/Back, Prime playback/exit, Screen Mirroring,
AirPlay and YouTube Cast acceptance for 0.3.13 subsequently passed.

### Undo and evidence

- `python scripts/manage-preloads.py restore --execute` restores only the three
  saved policy/allowlist entries and preserves unrelated changes. Its private
  journal is `backups/preloads/current.json`; preserve it. Default apply/restore
  commands are review-only without `--execute`.
- Reinstall the preserved 0.3.12 IPK using `deploy-root.py` to undo only the
  Quick Start opt-in. Reinstall 0.3.11 to undo the entire app optimization.
  Private deployment backups are under `backups/ui-before-0.3.12-*` and
  `backups/ui-before-0.3.13-*`. Native Home/return routing, AH cover, firmware
  hostname block and root SSH are independent of these app packages.
- New ignored evidence includes `fresh-0311.json`, `fresh-0312-a.json`,
  `fresh-0312-b.json`, `0312-full-restart.json`, `0312-cold-browser.json`,
  `0312-postboot-preloads.json`, `0312-running.json` and
  `0312-postboot-memory.json`. `0313-before-wake.json` is the passive observer's
  baseline; `0313-owner-wake.json` contains the completed matching wake result.

The initial investigation below is historical and explains the selected work.

---

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
