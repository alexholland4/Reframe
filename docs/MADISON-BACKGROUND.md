# Madison Capitol wallpaper

Reframe 0.3.6 replaces the generated coastline with a real sunset aerial of
Madison, Wisconsin, looking toward the State Capitol and Lake Mendota.
Photograph by [Josh Sorenson](https://unsplash.com/@joshsorenson), from
[Unsplash](https://unsplash.com/photos/a-city-with-a-domed-building-rA6Y9-eflx8),
used under the [Unsplash License](https://unsplash.com/license).

The original 3840 x 2765 download is preserved unchanged under `assets/source/`.
Version 0.3.12 bundles a 3840 x 2160 JPEG at
`public/backgrounds/madison-capitol-sunset.jpg`, with source/license details in
`public/backgrounds/ATTRIBUTION.md`. It keeps precisely the bottom-aligned
16:9 area previously displayed by CSS and uses quality 85 compression. The
Capitol framing and contrast gradients are unchanged. The previous coastal
asset is retained under `assets/source/` for source-level rollback, outside
the TV package. Rebuild the derivative using `scripts/optimize-wallpaper.ps1`.

![Madison wallpaper on Reframe](images/reframe-0.3.6.png)

Native installation passed all 46 file hashes and foreground verification;
the owned upload stage was removed. Production build, package validation and
the existing browser checks pass:
1080p/4K layout, eleven tiles/twelve loaded images, remote navigation and live
weather. The preview was visually checked for Capitol visibility and readable
header text. This changes only wallpaper/framing; native Home/startup routing,
IPTV sources and Favorites are unaffected.
