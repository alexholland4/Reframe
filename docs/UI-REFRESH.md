# Reframe 0.2.0 visual refresh

The owner requested actual app icons and a simple, spacious Apple TV-inspired
appearance. This refresh uses large rounded 16:9 branded app cards, a quieter
row for TV/input controls, restrained charcoal/teal gradients, lighter type,
more negative space, and a raised white remote-focus outline.

![Reframe 0.2.0 desktop preview](images/reframe-0.2.0.png)

Netflix, YouTube, Prime Video and Disney+ use bundled SVG wordmarks for sharp
4K rendering without runtime icon downloads. Sources/credits are in
`public/icons/README.md`. Settings, HDMI, soundbar and TV have consistent
line icons. HDMI 2 is labeled as the owner's soundbar. Weather stays hidden
until a real location is configured, instead of showing placeholder coordinates.

The native launch bridge, app IDs, remote Back and existing root/boot/wake
configuration are unchanged. App/cast exit routing and the brief native startup
screen remain the separately deferred tasks in NEXT-SESSION.md.

TypeScript/Vite production build and packaging pass. A hidden browser verified
all four images, eight buttons, no overflow at 1920x1080 and 3840x2160, and
Right/Down/Left/Up remote navigation across both rows. All 77 Node and 12 Python checks pass. Root deployment completed live; see
HANDOFF.md for the current stop.

`python scripts/deploy-root.py com.reframe.home_0.2.0_all.ipk --execute` uses the
existing strict root SSH pin/key, validates the app-only IPK and metadata,
preserves the previous local package under ignored backups, uploads to a unique
protected temporary stage, requests one native install, verifies every installed
app-file hash and version, launches Reframe, and removes only its validated
stage. Without `--execute` it inspects the local package without TV access.
It does not require reinstating LG Developer Mode or enabling TCP forwarding.


## Live deployment

The reviewed source was saved/pushed as `e4a47d9` before installation. The rooted
deployment controller saved the previous local 0.1.1 package privately, verified
the uploaded IPK hash, obtained native install success, verified all 11 installed
app-file hashes and version 0.2.0, and launched Reframe. Actual foreground then
reported `com.reframe.home`. Its unique upload stage was checked and removed.
The existing enabled boot/wake helper remained running with the same PID.

The screenshot above is the desktop preview, not a captured TV image. No new
owner visual, casting or playback check has been received after this UI-only
update. Prior 0.1.1 native compatibility acceptance remains recorded separately.
The native launch bridge and root persistence were not modified.
