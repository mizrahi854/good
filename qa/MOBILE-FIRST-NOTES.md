# Mobile-first cinematic update — 2026-09-27

Reference: `/Users/yanaimizrahi/Downloads/Create_a_premium_cinematic_WEB.mp4` (1280 × 720, 24 fps, 240 frames, 10 seconds).

All 240 frames were inspected in four numbered contact sheets in `output/reference-analysis/`. Source beats:
- 000–063: five-bottle establishing shot.
- 064–105: Flow descends with the original liquid connection.
- 106–163: fruit / gummy splash and rotating Flow bottle.
- 164–195: camera retreats into the liquid ring.
- 196–239: the other bottles join the ring.

The former implementation stopped at frame 145 and substituted a transparent bottle transform. The new timeline uses the full film, including the ring ending, then dissolves into the interactive formula selector. Original cleaned frames 000–172 are retained; 173–239 are native video frames with recorded website chrome excluded by the canvas crop. No product motion is synthesized. Scroll controls playback and reverses the sequence. Establishing holds are shortened through a piecewise timeline; desktop height is 280svh, portrait 265svh (previously 380svh).

Portrait opening: `assets/mobile-cinematic-art.webp`. Built-in ImageGen edited the supplied mobile reference to remove overlaid UI while retaining the five bottles and liquid composition. This is a static portrait establishing image, dissolving over the first 10% of scroll into reframed original landscape footage. It is not a newly generated portrait video. Headline, GO/OM lettering, navigation, CTA, and scroll cue are live HTML/CSS.

Image edit prompt: “Create a clean portrait background artwork at the same aspect ratio. Remove only phone status bar, hamburger, header logo, search/cart icons, Hebrew subtitle, giant GO/OM lettering, Hebrew headline, CTA pill and text/arrow, and bottom scroll icon/text. Fill these regions with the existing lavender background. Preserve the five bottles, packaging, exact positions, sizes, rotations, clear liquid sculpture, bubbles, composition, and empty upper-left copy area. Do not add elements.”

Mobile layout is isolated in `mobile-first.css`, loaded after the existing styles. Touch controls have generous targets; stories use a native horizontal swipe gallery on portrait screens, while desktop retains its 3D ring. Brand, community, bundles, FAQ, footer, and reduced-motion layout are responsive. Existing ordering links and interactions are retained. Full compressed-frame warming begins on scroll intent, not first paint, and respects Save-Data. Decoded frame memory remains bounded to 20 frames on mobile / 24 desktop.

Verification: `node qa/check-mobile-first.cjs`. Checks Chromium at 320×568, 375×667, 390×844, 430×932, 768×1024, 844×390, 1440×900; WebKit at 320×568 and 390×844. Verifies overflow, product/caption separation, formula arrows, menu navigation, FAQ, source end frame 239, reverse playback, reduced motion, missing resources and JS errors. Screenshots and JSON results are in `output/playwright/mobile-first/`.

Tests use desktop engines with touch-enabled viewports; physical iPhone/Android performance has not been measured. No deployment was performed.
