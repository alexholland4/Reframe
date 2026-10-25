# Packers and the local Fox channel

## Deeper same-day search: no verified full-game feed

Later October 25, the owner explicitly required another search, prioritizing
watching today through software. They are open to an antenna later, but declined
FOX One signup/trials and requested a no-signup stream. Those constraints remain
unmet for a verified complete-game feed; do not mark game viewing solved.

The expanded search tested 14 distinct public stream candidates, without
credentials, geographic workarounds or access-limit resets:

| Candidates | Result |
| --- | --- |
| Catalog Fox West and WSVN | Both timed out |
| Separate public WLUK test-stream reference | HTTP 404 |
| Posted Fox East, Philadelphia, Miami and Denver feeds | Connections refused |
| Alternate Fox East IP source | Connection refused |
| Separate Fox East channel on catalog host | Timed out |
| Another published Fox East source | HTTP 403; no bypass attempted |
| Fox Deportes fallback | Timed out |
| Two newest Fox East reports in upstream's tracker | Both HTTP 404 |
| English Channel 5 fallback catalog entry | Hostname did not resolve |

The public web-player sites checked were also unavailable: one did not resolve,
the other timed out from the PC and was unreachable from the TV. A repeat Fox
West request from the TV timed out too. These results cannot establish that
every internet stream is unavailable; they establish that none tested supplied
playable video. No failed candidate was added to Favorites or represented as a
working Packers channel. No channels were played on the TV in this follow-up.

An ordinary desktop browser, using the local market, exposed the actual
[official WITI live player](https://www.foxsports.com/live/witi-dt), labeled
Packers at Lions. Its guest UI displayed a preview with 04:54 remaining, not an
unrestricted stream. A preceding initialization screen showed an expired-preview
message before the player finished loading. No TV playback was tested and no
complete-game playback established. Browser research did not reset cookies,
device identity, location or preview limits. A five-minute preview does not
meet sustained viewing and must not be marketed as a permanent solution.

[Stanford Puffer](https://puffer.stanford.edu/faq/) carries a complete Bay Area
Fox station through a research study, but requires registration and carries
regional programming. It does not meet the owner's no-signup constraint, and
this game's availability there was not verified. No study enrollment occurred.

The working-route prerequisites remain a received local antenna signal, or an
eligible authenticated internet service. The owner declined the latter for
today. FOX One is not installed on the TV; the installed-app query confirmed
this. No account, purchase, trial, app installation or TV setting change was
made in the deeper search. The accepted Reframe 0.3.13 startup remains intact.

Private evidence is under `.research/packers-channel/deeper/`, including the
manifest probe results, upstream issue snapshots and ordinary-browser results.
The original investigation below explains the news-stream distinction.

---

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
