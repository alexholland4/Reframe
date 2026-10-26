# Performance: what changed and what was measured

The goal was to improve an everyday experience on existing hardware: fewer
distractions, predictable remote input, and a shorter wait for the home screen.
Measurements informed the changes instead of assuming every installed app was
slowing the TV down.

## Results

| Measure | Earlier sample | Improved sample |
| --- | ---: | ---: |
| App package | 4,024,642 bytes | 1,564,698 bytes |
| Fresh-document load complete | 4.15 s | 1.84–2.00 s |
| Native wake handoff | 13.68 s | 2.40 s |

The package reduction is approximately **61%**. The page-load comparison was
captured from the TV browser's navigation timing after fresh launcher relaunches.
The earlier and improved samples used the same device; cache state, swapping,
CPU activity, and the small sample count limit causal conclusions.

Wake handoff means the native startup cover opening to the launcher being
reported in the foreground. It is **not** the complete remote-button-to-picture
time. On a real remote off/wait/on check, the launcher appeared within a few
seconds after the TV visibly turned on, without an extra logo or Loading screen.

Full restart remains about **36 seconds** to the launcher. The measurements do
not establish a major cold-boot improvement or a universal speedup across apps.

## Changes behind the results

1. **Smaller local artwork.** Cropped the wallpaper to the same displayed area,
   compressed the JPEG, and removed an unused large image from the app package.
2. **Earlier independent rendering.** Preloaded the wallpaper, declared that the
   launcher can start offline, and kept weather asynchronous.
3. **Reduced background work.** Disabled automatic preloads for the stock home
   screen and three unused optional apps. App availability was preserved.
4. **Fewer promotional features.** Turned off optional screensaver advertising,
   live promotions, and content recognition. Screen protection remained enabled.
5. **Direct presentation.** Removed the custom loading animation and fade/hold,
   while preserving the TV's native readiness and fallback behavior.

The combined effect was evaluated on the TV. Individual contributions were not
isolated, so these results should not be attributed to one setting alone.

## What the audit did not justify

The investigation inspected installed apps, active processes, proportional
memory use, storage, service dependencies, and preload policy. Several
promotional apps were installed but inactive. Available storage was sufficient;
deleting them had no demonstrated startup benefit. Shared media, audio,
networking, casting, and recovery services were preserved.

Memory snapshots were taken under different workloads and at different uptimes.
They do not establish an exact RAM saving. The work disabled specific optional
features and preloads; it did not delete a broad set of system services.

## Validation

Changes were staged with original-state snapshots and rollback paths. Startup
integration was exercised through full restarts and standby/wake. Compatibility
checks included Settings/Back, the original-Home shortcut, streaming playback
with sound, app exit back to the launcher, iPhone Screen Mirroring, AirPlay, and
the YouTube app's Cast button. Those final checks passed on the actual TV.
