# Next session: launcher UX polish

Latest: 0.3.10 black startup intro waits for native CoverUI closure and draws
without the expensive SVG shadow. Installed; owner wake/full-animation and
Prime-exit-without-intro retests pending. Leave the TV alone during checks.
Native Prime/mirroring exit routing is owner-confirmed working. Read the top
of HANDOFF.md and PERSONAL-STARTUP.md, including the new read-only status
permission journal, cached connections, deployment handling and undo.


Latest 2026-10-23: 0.3.9 personal AH startup animation is installed; native
lastAppHandlerPolicy=lastInputApp returned a real paused-guide Back exit to
Reframe. See PERSONAL-STARTUP.md and HANDOFF.md. Owner visual wake, Prime
exit, mirroring disconnect and Blue checks are pending: leave the TV alone
during those checks. Earlier startup/Home/Blue/Settings/casting acceptance
was confirmed; subsequent paragraphs describing it as pending are historical.
Native CoverUI still owns the earlier "Reframe Loading" text. Reverse native
shutdown animation is deferred; no system QML/logo was changed.


Current 2026-10-23: Reframe 0.3.8 has the lower row and launch-spinner metadata.
Native input/default-Home integration replaced the delayed helper. A controlled
restart selected Reframe as native first app and actual foreground, with root
SSH returned and the old helper absent. Blue in Reframe opens stock LG Home;
paired recovery does too. The full undo was demonstrated before final install.
Read NATIVE-STARTUP.md and the latest HANDOFF.md. The owner now explicitly
allows Home -> Reframe, superseding the earlier restriction. Visible wake/
spinner, physical controls and native/casting checks are pending owner answers:
do not send TV actions during that check. Other-HDMI/mains boot cases remain
untested. IPTV is unchanged. Preserve the private live rollback snapshot.

Latest follow-up: Madison sunset aerial is installed in Reframe 0.3.6; all 46
file hashes and foreground verified. See MADISON-BACKGROUND.md. The owner has
now reopened direct boot/wake investigation, with Home explicitly staying LG
Home as a backup. Read DIRECT-STARTUP.md: native input startup is a plausible
first trial, not yet applied or proven. Current startup settings/helper are
unchanged. The separate app/cast-exit return task remains deferred.

Latest follow-up, 2026-10-22: the owner asked for wider US channel browsing with
the original ten as Favorites, without testing more streams. This is configured
and app-reload verified. Full catalog enabled, 1,483 entries, ten Favorites,
autoplay off; fresh load selects All, so choose Favorites in the sidebar.
Remote controls are in IPTV-REMOTE-GUIDE.md. Reframe 0.3.5's cleaner Live TV icon
is installed, with 44 file hashes/foreground verified. Earlier instructions
below to keep the full catalog disabled are superseded by this request.
The two native return/startup tasks remain deferred.

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

The owner later requested a visual refresh, completed as Reframe 0.2.0:
large app cards, crisp offline logos, more space and subdued colors. It is
installed/foreground; see UI-REFRESH.md. Rooted app updates now have a validated,
live-tested route through `scripts/deploy-root.py`; use it instead of the old
Bash developer transport. The inspector and developer-based callback test are
still historical. The two requested return/startup UX tasks above remain open.

Current automated baseline: 77 Node tests and 12 Python tests passing.


## Owner selected Home apps (0.3.1)

The expanded 0.3.0 view was a candidate collection. The owner liked its scenic
background but asked to remove the clutter. Home now contains only Netflix,
Prime Video, HBO Max, Peacock, Paramount+, Hulu, Apple TV, Disney+ and Apple Music,
in that order, in one large horizontal row. More Apps ends the row and opens
the LG App Store. Settings/input rows are removed; existing native apps remain
installed. Curation is resolved; do not restore the multi-shelf collection.
Read CURATED-HOME.md and the current HANDOFF.md for deployment status.
The app/cast return and startup transition requests above remain deferred.

## Small visual cleanup and local weather (0.3.2)

The owner accepted the curated row and requested removing the changing app
heading, Reframe branding and footer text. Greeting/time/date are enlarged;
Sheboygan weather in Fahrenheit is restored with refresh/reconnect handling.
See current HANDOFF.md and CURATED-HOME.md for deployment and validation.
The two native return/startup UX tasks above remain deferred.

## Navigation and IPTV follow-up (0.3.3)

The owner likes the 0.3.2 appearance. Navigation tuning addresses lag/skipping;
read REMOTE-NAVIGATION.md and current HANDOFF.md for deployment status.
IPTV feasibility is documented in IPTV-FEASIBILITY.md. No player/tile installed.
Next proof would evaluate a dedicated webOS player's package, then test a small
playlist with real picture/sound before adding one Live TV tile. This does not
replace the two separately deferred native return/startup UX tasks.

## Native IPTV trial and curated sports list (0.3.4)

The owner authorized installation/setup/testing and specified common US sports
networks with some news. webOS IPTV Player 1.17.0 is installed. Native playback
and display captures establish feasibility; see IPTV-TRIAL.md and current
HANDOFF.md for precise results/limits. The full US catalog is saved disabled;
the active ten-channel subset is TV-resident and configurable through
iptv-trial-channels.json and prepare-iptv.py. No custom player is needed for
favorites/hiding/reordering. Reframe 0.3.4 has one Live TV tile before More Apps.
Full ABC/NBC sports coverage, XMLTV schedules and source reliability remain
open; do not equate local station/news streams with network sports rights.
Keep owner acceptance separate from automated channel/launch tests. The
original native return/startup UX tasks above remain deferred.

Owner acceptance of the native IPTV trial passed: normal FS1 picture, audible
sound and Back returning to the ten-channel guide. Live TV launches correctly
from Reframe, and app exit/reopen preserves the small list. Refine the subset
with the owner; do not restore the full catalog by default. A custom player is
not required for this granularity. No further TV actions are needed for this trial.
