# IPTV player trial

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

Installation, setup and playback results are pending. Even advancing native
video time and decoded frames cannot prove owner-visible picture or audible
sound. Keep automated foreground tests separate from owner acceptance checks.
