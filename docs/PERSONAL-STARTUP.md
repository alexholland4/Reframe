# Alex's portfolio startup animation

Reframe 0.3.9 bundles Alex Holland's original AH hero SVG from
[his portfolio source](https://github.com/alexholland4/alexholland4.github.io/tree/66c1dec6b1585652681086a618bb6019f33a442e),
at commit `66c1dec6b1585652681086a618bb6019f33a442e`.
Alex explicitly requested extracting and using his own artwork here.

The SVG in `index.html` preserves the six line coordinates, normalized path
lengths, 22-unit rounded strokes, and dormant arrow/pop elements verbatim.
`public/startup.css` preserves the normal hero's cream ink (`#F3F2EA`), deep
green canvas (`#0C1410`), easing `cubic-bezier(.22,1,.36,1)`, 350 ms initial
delay, 170 ms stroke staggering and 620 ms draw duration. The final stroke
finishes at 1.82 seconds. The portfolio's optional company-personalization
overlay is separate and is not used: ordinary hero timing is the reference.

TV framing centers the mark at 25% of the viewport width, holds the complete
mark until 2.1 seconds, then fades the overlay out over 450 ms into Madison.
The SVG and critical stylesheet are in the initial HTML, ahead of application
JavaScript, without any website/network dependency. Home renders underneath;
weather does not delay the intro. Remote or pointer input dismisses it and
continues to the normal control handler. Reduced motion skips drawing and
releases the screen promptly. CSS fades the overlay even without its JS
completion listener; the JS also retires it after three seconds.

The current implementation plays on document creation. Ordinary hidden/visible
app transitions do not replay it, so returning from Settings/casting/apps stays
quick. Owner standby/wake observation is still needed: retained webviews may
need a separate verified wake signal to replay, rather than guessing based on
time spent hidden.

![Personal startup mark](images/personal-startup.png)

## Native screen boundary

Read-only inspection located the earlier “Reframe Loading” text in LG's native
CoverUI `UserInterfaceLayer/Containers/MainView.qml`. It displays the launching
app title plus a localized Loading string before the app renders. This is
separate from the app splash and spinner already disabled in Reframe metadata.
The inspected component exposes no app-specific animated-SVG splash field.
The app intro alone does not establish replacement of this earliest native UI.
Owner observation is pending to establish the actual wake sequence.

The reverse shutdown animation is deferred. LG has separate native logo and
compositor assets; a page visibility event neither identifies power-off reliably
nor guarantees time to render before the panel goes dark. No shutdown hook,
system QML, logo asset, firmware, boot partition or power sequencing was changed.
A later investigation can examine a reversible native customization; do not
delay or intercept shutdown merely to replay a web animation.

## Validation and undo

- Production build and all 77 Node / 29 Python tests pass.
- Browser checks seek the actual CSS animations: staggered intermediate strokes,
  complete mark, final fade without JS, immediate remote dismissal with normal
  navigation, reduced motion, and existing 1080p/4K UI/navigation/weather checks.
- Root deployment verified all 47 installed files and Reframe foreground.
  Actual TV inspection found all six strokes, the local startup stylesheet,
  and the correctly retired overlay after playback.
- Owner wake/visual check has been requested; no TV actions during that check.

To remove only the intro, remove its overlay and stylesheet link from
`index.html`, and `mountStartup` import/call from `src/main.ts`, then rebuild
and deploy through the existing guarded installer. The previous 0.3.8 package
is retained locally under ignored backups by that installer. Native startup,
Home mapping and app-exit policy are independent of the animation package.
