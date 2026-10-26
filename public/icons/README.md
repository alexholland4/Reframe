# App artwork

Bundled locally so Reframe does not depend on an icon CDN at runtime.

- Netflix wordmark: [SVG Logos](https://github.com/gilbarbara/logos),
  `logos/netflix.svg`.
- Prime Video: [Simple Icons 11.15.0](https://github.com/simple-icons/simple-icons/blob/11.15.0/icons/primevideo.svg),
  displayed white with a tighter viewBox for a TV card.
- Disney+: [SVGL](https://github.com/pheralb/svgl/blob/main/static/library/disneyplus.svg),
  displayed white through CSS.

Brand names and marks belong to their respective owners. These icons identify
installed apps and do not imply endorsement. Utility symbols are drawn in
Reframe's source; the Live TV and More Apps symbols are local SVG assets.

`installed/` contains the six app icons used by the curated row: Apple Music,
Apple TV, Paramount+, Peacock, HBO Max, and Hulu. These are app artwork, without
account, device-identity, pairing, or usage data. See `src/core/config.ts` for
the corresponding app IDs. The marks remain property of their respective owners.
