# IPTV player trial

## Current native-TV results

webOS IPTV Player 1.17.0 is installed and all 80 installed app/service/package
files matched the pinned release. The service runs as ordinary UID 6149.
The existing root marker and Reframe baseline remain intact. No Developer Mode,
SSH forwarding, firmware, boot or Home/Back routing changes were made.

The full GitHub US playlist loaded 1,486 entries on the actual TV. It is saved
as US catalog (optional), disabled. A smaller uploaded Reframe trial playlist
is the active source. The ten-entry [selection](iptv-trial-channels.json) is
FS1, ESPN, TNT West, TBS East, truTV West, NBC Sports NOW, NBC News NOW,
FOX Weather, WISN 12 Milwaukee local stream and TMJ4 Milwaukee local stream.
All ten selected entries produced advancing native playback with expected
labels/source hosts, video dimensions, no media error, and enabled audio tracks
across the main run and focused rechecks. This does not prove long-term source
reliability, every program entitlement, or audible sound in the room.

Native display snapshots show FS1 sports programming with its logo, TBS
programming with its logo, TNT Sports hockey coverage on a Turner entry,
NBC Sports NOW basketball, and a TMJ4 commercial-break slate. Screenshots are
private under ignored .research, never in Git. FS1 also stayed at 720p through a roughly one-minute stability check.
ESPN ran at 720p continuously
for roughly a minute and remained at 720p afterward; its captured frames were
commercials, so a channel logo/program identity has not yet been confirmed.
Native frame counters report zero even while native display snapshots contain
video; do not treat zero counters as proof of failed hardware playback.

ABC News Live and CBS News Chicago candidates did not remain on the requested
channel during automated trials and were excluded. The precise failure cause
is unestablished. A same-name/count upload was cached at first, so an initial
alternate ABC retry was not a distinct verified feed test. The supported
source disable/re-enable path now forces a fresh list. A WISN measurement that
crossed a delayed tune was rechecked with stable-pipeline timing and passed.
Full ABC/NBC network sports coverage is not established by local-station
streams. One full NBC entry and FS2 timed out during manifest probes; no
authentication or region restriction was bypassed.

The player already supports favorites, hiding and reordering; a custom player
is unnecessary for channel granularity. The uploaded subset is stored on the
TV and needs no always-on PC. Autoplay on startup is off, so opening the app
shows the guide. A reload preserved the ten-channel list, disabled full catalog
and autoplay preference; Back returned from playback to the guide. A real
Back/exit sequence removed the app inspector target and closed its old setup
listener. A fresh native launch reopened the same ten-channel guide with
autoplay off and the full catalog disabled. The immediate post-exit foreground
reply had an empty app ID; do not infer a successful return to LG Home/Reframe
from that response. The new app reopened normally. No XMLTV
EPG is configured, so schedule data is not claimed. Reboot persistence has not
been retested during this app trial.

Reframe 0.3.4 has one Live TV tile before More Apps. Its production package and
local browser checks pass; UI deployment and final launch-tile/background checks
are pending. Owner picture/sound/physical-remote confirmation is pending.

## Repeat the setup or change the shortlist

Edit the public channel IDs/labels/groups in iptv-trial-channels.json.
`python scripts/prepare-iptv.py` fetches the upstream US playlist and generates
an ignored M3U locally, without TV access. Add --execute while the IPTV app is
open to upload it through the app's authenticated setup API, invalidate the
parsed cache through source-enable actions and verify the actual TV list.
`python scripts/check-iptv.py --execute` tests the prepared list on the TV;
--capture additionally takes private display snapshots. These change foreground
playback and must not overlap owner checks. They are not local build steps.

The inspector batches input events on one connection so multi-digit channel
entry is not split by SSH round trips. Checks wait for number-entry debounce,
query the current video element after replacement, require expected channel
label/source host, and measure progress within a stable media pipeline. SSH
output is explicitly UTF-8 so channel text does not get decoded as Windows
ANSI. Raw JSON TV logs now join TXT fingerprints in .gitignore.

22 Python tests pass, including four additional app/method/path/capture
boundaries. Reframe browser checks pass with eleven buttons and twelve images.

## Reviewed package and transport


The owner authorized installation, configuration and automated TV testing of
webOS IPTV Player, with a small channel selection and minimal manual work.
Full channel curation will follow their preferences; trial choices are not a
claim about their eventual favorites.

Reviewed release: [webOS IPTV Player v1.17.0](https://github.com/lennylxx/webos-iptv-player/releases/tag/v1.17.0).
IPK SHA-256: `7f38a23df46fedc6381a660b280ce3e8abdeb88aff519f3a41ee3a5c15391299`.
Both release downloads matched the GitHub-provided SHA-256 values. The tagged
source was read for LAN setup, storage, source updates and reminder behavior.
The source ZIP's .claude/skills symlink was skipped; source guidance is not
executed or installed. Downloaded source/package remain under ignored .research.

The package has 80 regular files confined to its app, service and package
registration directories. It has one control metadata file and no install
hooks, links, elevated modes or system configuration files. It includes an
on-demand LAN setup/upload service with token authorization for writes and
foreground/background start/stop handling. Uploaded playlists use the app's
own service storage; reminders are not part of this trial. No root permissions,
boot files, Developer Mode installation or SSH forwarding changes are needed.

`scripts/deploy-iptv-trial.py` is dedicated to this exact pinned release.
Default mode validates locally. `--execute` installs only the initially absent
IPTV app, verifies all app/service/package file hashes, launches it and removes
only its own unique upload stage. Before-state records remain in ignored backups.
The Reframe-only deploy controller is unchanged. Six local validator tests pass,
including pin, ownership, symlink, hook and service-registration boundaries.
`--uninstall --execute` verifies the pinned installed package before requesting
native removal of only the IPTV app and restoring Reframe. Data cleanup is a
separate step; app removal is not claimed to erase every uploaded playlist.

`scripts/tv_inspector.py` sends bounded, app-scoped inspector commands through
the existing pinned root SSH session to the already-running loopback inspector
on 9998. It does not create a tunnel or change SSH policy. Read-only Reframe
DOM and live weather queries passed on the TV. No Developer Mode app is used.
Inspector evaluation/input commands can change an app and are manual tools,
not part of local builds or unit tests. Both allowed app IDs and command names
are checked before SSH access. Screenshots/logs may be private and stay ignored.

Even advancing native
video time and decoded frames cannot prove owner-visible picture or audible
sound. Keep automated foreground tests separate from owner acceptance checks.
