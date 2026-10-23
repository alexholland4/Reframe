# Manage Live TV from the remote

Current setup, 2026-10-22: webOS IPTV Player 1.17.0 has the GitHub US catalog
enabled (1,483 stream entries when loaded) and the original ten channels saved
as Favorites. No additional streams were played or tested for this change.
The catalog and Favorites are stored on the TV; no computer is needed to use them.

## Your shortlist

Open **Live TV** in Reframe. In the player's left sidebar, select **Favorites**
with OK to see the ten saved channels. Select **All** to browse everything.
The number above the sidebar is the total catalog size, even in Favorites.

The player may start on **All** after a fresh launch/reload; the selected group
is not a saved startup preference in this release. Favorites themselves persist.
It was left on Favorites after verification. Autoplay remains off.

## Find a channel

Select the **magnifying glass** in the top bar and type a channel name with the
TV's keyboard, such as CBS, ESPN or Fox. Results search the enabled catalog,
including channels outside Favorites. Move down to a result and press OK to
watch. Back closes Search/returns to the preceding view.

There is no program schedule configured yet. Search by channel name, rather
than a team, game or air time. Listings can include multiple regional feeds,
news-only versions and unavailable streams. A listed station does not establish
that it carries the particular game or the full network schedule.

## Add or remove a favorite

- In the **Live** channel list, highlight a channel without pressing OK, then
  press the remote's **Green** button. This toggles its favorite star immediately.
  The same action removes a channel from Favorites.
- When watching a Search result, press **Right** to open the player menu, then
  **Green** to favorite the current channel. Green is not a favorite shortcut
  on the Search results screen itself.
- For bulk cleanup, **Favorites** has a **Manage favorites** button. The channel
  list's **Yellow** button opens editing, including reorder/hide/rename options.

Controls are defined by the installed player's
[v1.17.0 remote mapping](https://github.com/lennylxx/webos-iptv-player/blob/v1.17.0/README.md#remote-control-mapping).
Green-button additions were verified on the TV for all ten existing channels.
Search returned CBS listings while video remained paused; no result was opened.

## Current Favorites

FS1, ESPN, TNT West, TBS East, truTV West, NBC Sports NOW, NBC News NOW,
FOX Weather, WISN 12 Milwaukee's local stream and TMJ4 Milwaukee's local stream.
The larger catalog supplies the displayed names, so the local entries appear
as ABC WISN-TV and NBC WTMJ-TV, and some names include resolution/region labels.

The uploaded **Reframe trial** source is also retained. Do not run
`check-iptv.py --execute` as routine setup: it changes channels and tests playback.
`prepare-iptv.py --execute` revises that original uploaded source; it is not
needed to manage Favorites. Use the remote for normal channel curation.
