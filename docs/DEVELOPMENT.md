# Development

Use Node.js 22 or newer with npm.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Arrow keys move between apps; Enter selects one.
Pointer input also works. App launches are simulated in desktop previews.
The development server binds to the local machine by default.

## Customize the preview

Copy `.env.example` to `.env.local` and set an optional display name and weather
city/coordinates. The public default has no personal name and uses the city
shown in the wallpaper. Set `VITE_REFRAME_WEATHER=false` to hide weather.
Restart the development server after changing these values.

These are display preferences, not secrets: Vite bundles them into the app.
`.env.local` is ignored by Git. Keep credentials and device connection details
out of both source and `VITE_*` variables.

Edit the tile list in `src/core/config.ts` to change the app row. Each tile
specifies an installed app ID and local artwork. Availability and IDs can vary
between webOS versions and regions. Styling lives in `src/styles.css`.

## Check and build

```sh
npm test
npm run build
```

With the development server running, `npm run check:ui` launches a local
Chromium browser to check navigation, held-button behavior, artwork, weather
recovery, and 1080p/4K layout. Set `REFRAME_BROWSER` if Chrome/Chromium/Edge is
installed in another location. The check uses a controlled weather fixture;
`node scripts/check-ui.mjs --live-weather` additionally checks the real endpoint.
Generated browser profiles and screenshots remain local and ignored.

`npm run build` type-checks the project and writes `dist/`. Relative asset URLs
and the packaged-HTML adjustment support loading from the TV's local filesystem.
With LG's webOS packaging CLI installed, `npm run package` also produces an IPK.
Packaging does not install anything or connect to a TV.

## Assets

The original scenic photo and its attribution are preserved. Run
`scripts/optimize-wallpaper.ps1` on Windows to recreate the bundled crop.
The README photos are exported by `scripts/prepare-readme-photos.ps1` from
private originals; exports omit camera/location metadata and visibly redact
personal on-screen details. The public checkout already includes those exports.

## Scope

This is a personal project validated on one webOS TV, not a universal launcher
installer. Startup integration and app support vary by device. The public
checkout deliberately contains no personal device connection defaults or
automated installation target. Hardware-specific maintenance and rollback
records remain private.
