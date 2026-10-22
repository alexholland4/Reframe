# Reframe 0.3.3: remote navigation

The owner accepted the 0.3.2 appearance, but reported lag and accidental
multi-tile skips. The old handler allowed marked repeats every 90 ms and
accepted every unmarked repeat. It did not track key release. Card transforms
and shadow transitions ran for 320 ms; each focus change also animated a large
blurred background layer for 650 ms. These are plausible contributors; there
has not been an on-device event trace or frame-time measurement.

The first press now moves immediately. Explicit keydown/keyup state suppresses
repeat bursts even when event.repeat is false. Holding an arrow waits 360 ms,
then advances at most once per 180 ms, driven by actual remote events. There
is no queued movement or timer that continues after release. Fresh taps and
direction changes respond immediately. Lost releases recover after a 650 ms
idle gap, and blur/visibility changes clear held state. OK activates once per
hold, including unmarked repeats. Native Back remains untouched.

For motion remotes, pointer focus ignores jitter for 250 ms following a D-pad
event; normal pointer interaction then resumes. Focus transforms and scroll
reveals now take 160 ms. Shadows switch immediately rather than repainting
throughout a transition. A static soft radial glow replaces the per-selection
blurred color animation. Card surfaces are prepared for transform compositing.
The selected apps, card sizes, scene, enlarged header and weather are retained.

Production build and the browser check pass. New cases cover unmarked repeat
bursts, hold delay/pacing, release/reversal, pointer jitter and unmarked held
OK, alongside earlier navigation, More Apps, weather and 1080p/4K checks.
Browser shutdown now tolerates a missing Browser.close acknowledgement.
No claim of measured TV frame rate or owner acceptance is made by these checks.
Reframe 0.3.3 is installed and foreground on the TV. Native install/launch
passed, all 41 installed file hashes matched and the owned upload stage was
removed. The previous local 0.3.2 package was saved privately. Source checkpoint
`5e3202f` is pushed. Owner physical-remote acceptance remains pending.

IPTV feasibility was investigated separately; see IPTV-FEASIBILITY.md.
