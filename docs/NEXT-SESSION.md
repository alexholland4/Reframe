# Next session: launcher UX polish

Working stop: 2026-10-21. The owner is going to bed and deferred these changes.
Preserve the current TV configuration tonight. Read HANDOFF.md first next time.

## Accepted baseline

- Root SSH/HBC and Reframe survived a full restart with LG Developer Mode absent.
- Reframe opens automatically on boot and standby/wake. Actual native power
  events show Suspend -> Active; the corrected helper is checkpoint `8521bcf`.
- Final owner checks passed: Settings/Back, YouTube sound, iPhone Screen
  Mirroring, AirPlay and YouTube iPhone Cast. Final standby/off-10s-on also passed.
- Launcher-only undo/reinstall, native Home escape, pre-removal marker undo,
  and independent SSAP root recovery were demonstrated. Full unroot/firmware
  recovery is not established. Private archives/credentials remain outside Git.

## Requested next changes

1. **Return to Reframe after an app or casting session closes.** Today closing
   YouTube or Screen Mirroring returns to LG Home. This is intentional for the
   first integration: the helper makes one startup/wake decision, then leaves
   Home/Back native. Investigate native lifecycle/foreground events and a scoped
   return rule, distinguishing app/cast exit from deliberately opening LG Home.
   Preserve Settings, active playback/casts, HDMI input selection, permission
   dialogs and a clear remote escape. Avoid continuously forcing foreground.
2. **Reduce or eliminate the visible native screen before Reframe.** Today a
   full restart may briefly show soundbar HDMI 2; standby/wake briefly shows LG
   Home (about one second in the final test) before Reframe. Investigate earlier
   native startup routing/launch ordering and app readiness. A success reply
   alone is not proof of visibility; verify the actual owner-visible sequence.
   Zero-transition startup is not yet established on this model. Do not use
   firmware/bootloader or signed rootfs changes merely to hide the transition.

## Maintenance before implementation

Dedicated root SSH on 2222 uses the existing external private key and strict
saved host pin. Developer SSH 9922 and its inspector workflow are retired.
Do not reinstall LG Developer Mode alongside the rooted directory marker.
The older Bash deployment, inspector and developer-based callback restart
diagnostic need a root-transport migration before reuse. Root SSH intentionally
disables TCP forwarding; do not silently relax that setting for the inspector.

Root/launcher controllers and undo are documented in LAUNCH-PERSISTENCE.md,
SESSION-INDEPENDENCE.md and ROOT-RECOVERY.md. Keep app/recovery/reboot requests
separate from owner playback/casting tests: a recovery cleanup previously
restored Reframe over YouTube while testing overlapped. The isolated follow-up
stayed on YouTube. No evidence showed the helper caused that interruption.

Current automated baseline: 77 Node tests and seven Python tests passing.
