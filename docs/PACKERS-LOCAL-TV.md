# Packers and the local Fox channel

Investigated October 25, 2026. The owner wants a free TV stream and has neither
an antenna connected nor a live-TV subscription. No subscription or purchase
was started, and no playlist/Favorite was changed during this investigation.

The Packers' [official game guide](https://www.packers.com/news/packers-vs-lions-how-to-watch-stream-listen-week-7-2026)
confirms Packers at Lions on Fox, October 25 at 3:25 p.m. Central. This guide is
specific to that game; future games can be on different broadcasters.

The current [IPTV US catalog](https://iptv-org.github.io/iptv/countries/us.m3u)
contains one Wisconsin Fox affiliate entry: `Fox.us@WITI`, labeled Fox
(United States) WITI (1080p). There is no WLUK/Green Bay or WMSN/Madison entry
in this catalog snapshot. Its WITI manifest responds successfully, but that
does not establish NFL availability. The host/path identify Fox Digital's
Amagi/LG stream. The list also contains Fox Weather, news and other affiliates;
these names are not a guarantee of the full local broadcast schedule.

FOX6's own [FOX LOCAL explanation](https://www.fox6now.com/fox-local) explicitly
excludes Fox network programming, including NFL games, from its free service.
Its [free web stream](https://www.fox6now.com/live) is presented as local news.
This explains why finding a Fox-branded feed can still fail to find the game.
No verified free WITI game stream suitable for the existing player was found.
Do not add the news stream to Favorites labeled as Packers/NFL coverage.

## Practical options

- An antenna can receive the local broadcast without a monthly subscription,
  subject to reception at the owner's address. A TV tuner channel can be
  exposed through Reframe's native Live TV integration; it is not a public M3U
  stream. No antenna/channel scan or tuned-channel shortcut was configured.
- Fox offers NFL streaming through
  [FOX One](https://www.fox.com/sports/football/nfl). Its authenticated service
  is separate from a free M3U playlist. A subscription/trial requires the
  owner's choice and sign-in; do not purchase, start a trial or extract session
  URLs into the player automatically.
- Provider/local-market availability and regional scheduling must be checked
  for the particular game. A different city's Fox feed is not automatically a
  solution. No geographic restrictions or authentication were bypassed.

All catalog work was read-only. Only the selected WITI manifest was fetched;
no additional catalog channels were played on the TV. Ignored catalog and
manifest snapshots are under `.research/packers-channel/`.
