# IPTV on this TV: feasibility investigation

The owner subsequently authorized an app trial. The player is now installed;
see current [IPTV-TRIAL.md](IPTV-TRIAL.md) and HANDOFF.md. The findings below
describe the pre-install investigation.

Investigated 2026-10-21. No IPTV package, repository, tile or background service
was installed or enabled. Reframe's approved Home selection is unchanged.

## Finding and recommended route

Yes, the requested experience is technically feasible: a single Live TV tile
can launch a webOS IPTV app, showing channels and favorites, and selecting a
channel can play it full-screen directly on the TV. Compatible public streams
need no VLC window, casting session or always-on computer. This is a platform
and source assessment; actual channel playback on this exact TV is untested.

Start by evaluating an existing separate player rather than expanding the
launcher into a media application. A concrete open-source candidate is
[lennylxx/webos-iptv-player](https://github.com/lennylxx/webos-iptv-player).
Its documentation lists M3U/M3U8, XMLTV guides, favorites, remote navigation,
native TV playback, webOS 25 support and Homebrew installation. Its manifest
identifies com.lennylxx.iptv. The app also has a bundled LAN setup service;
review its package, dependencies, service exposure and update behavior before
installation. Compatibility is the author's claim, not a test on our TV.
Do not reinstall LG Developer Mode using its generic installation instructions.
Our existing session-independent root setup must remain intact. The current
Reframe-only deploy validator intentionally rejects other app identities;
a separate reviewed app-specific installation path would be needed.

A custom small Channels view inside Reframe is another feasible route, and
would let Back return directly to its Home. That requires a playlist parser,
channel-list UI, player state/error handling and scoped Back behavior. It has
more implementation and maintenance work than evaluating a dedicated player.
An external player's exit currently returns to native LG Home, like other
apps, until the separately deferred app-exit return routing is implemented.

## What the linked repository provides

[iptv-org/iptv](https://github.com/iptv-org/iptv) provides stream links in M3U
playlists. It is not itself a TV app or a hosted video service. It offers
country/category playlists, including the [US playlist](https://iptv-org.github.io/iptv/countries/us.m3u).
A sensible first trial uses a few channels and favorites, rather than putting
the entire worldwide catalog on screen. During this investigation the US file
contained 1,486 stream entries, 1,328 using HTTPS; entries are not necessarily
unique channels or verified working streams.

The [metadata API](https://github.com/iptv-org/api) offers channels, logos,
streams and guide references. It also describes region restrictions,
non-continuous broadcasts and special request headers. A cable-style schedule
grid needs separate XMLTV/program data and channel-ID matching; a playlist
alone is sufficient for a channel list but not a populated schedule. The
[EPG project](https://github.com/iptv-org/epg) provides guide-download utilities.

## Hardware support and practical limits

LG documents [HLS and HTTP/HTTPS support](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm)
and [webOS 25 codec support](https://webostv.developer.lge.com/develop/specifications/video-audio-250),
including H.264 video and AAC audio. Native HTML video is a reasonable initial
playback path for compatible HLS streams; a native player does not make every
URL/codec/manifest feature compatible. A desktop Chrome result is not a TV
playback result.

A bounded read-only probe of one Bloomberg-hosted entry returned HTTP 200,
a valid HLS master manifest and wildcard CORS. No segment decoding, audio,
channel switching or TV playback was tested. No transient stream URL is saved
here. Other entries can be offline, region-restricted or require headers,
formats or media features that the player cannot handle. Unsupported streams
may need a different source or an external proxy/transcoder; that would be a
separate requirement, not necessary for every compatible channel.

The next useful proof is to review the chosen player's package, install only
that app, load a small US playlist and test actual picture/sound, remote
channel switching, Back/exit and resume. Add one Live TV tile only once the
player works. Keep Home tidy and preserve the existing launcher/root baseline.
App-only removal and reverting the tile provide an ordinary undo path; no
firmware or boot changes are needed for the proposed player experiment.
