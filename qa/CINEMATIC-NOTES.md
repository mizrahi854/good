# GOOM source-sequence repair — 2026-09-08

## Runtime and entry point

The current site is ordinary HTML, CSS and deferred JavaScript: `index.html`, `site.css`, `cinematic.css`, `app.js`. It does not require React, the Design Component runtime, a CDN, npm, or a build. The legacy `GOOM 2026.dc.html` redirects to the index and preserves query/hash. The pre-repair page is preserved in `.recovery/GOOM-before-live-server-repair.html`.

## Recorded motion

The supplied film is 1280 × 720, 24 fps, 240 frames. The player uses native frames 0–172 (through 7.167 seconds), then crossfades into the existing interactive formula section. It excludes the filmed isolated-ring and final lineup section. Liquid deformation, bottle poses, fruit and camera movement in the retained footage come from the video, not the previous CSS product-layer reconstruction.

The 50 supplied clean JPEGs guide removal of the film's baked copy/navigation. See `frame-sequence/mapping.json`. Each JPEG also has an enhanced 1920-wide copy under the source folder's `enhanced` directory. Source files are preserved. Desktop sequence files are 1920 × 1080; mobile files are 1280 × 720. Uniform sharpening/color/resize processing improves presentation but does not recover detail absent from the 720p source.

Scroll selects a source frame with a short, interruptible catch-up. Canvas redraws only when the decoded frame or viewport changes. Decode concurrency is three; decoded images are capped at 24 desktop / 20 mobile, with explicit bitmap disposal. Compressed frame prefetch has two workers. Transient loading failures retry up to three times. A poster remains visible until the first decoded frame arrives. The mobile composition reframes the complete shot while keeping all filmed motion together. Reduced motion uses static sections.

Live headings, logo, glass controls, product carousel and remaining site sections are preserved. The cut to the existing carousel is a crossfade; that endpoint intentionally differs from the excluded filmed ending.

## Current verification

`verify-source-sequence.cjs` is the current QA script using the host's installed Playwright library; it is not a runtime dependency. Historical `check-cinematic` / `verify-cinematic` scripts and their screenshots describe the superseded layered animation.

Verified Chromium at 1440 × 900, 390 × 844, 320 × 740, 768 × 1024 and 844 × 390; WebKit mobile at 390 × 844, 2× DPR. Checks cover frame selection and rendering, forward/reverse scroll, bounded cache, no horizontal overflow, carousel buttons, mobile menu, FAQ, ritual selector, reduced motion, root entry and legacy redirect. No page exceptions, failed HTTP responses or external HTTP dependencies in the checked Chromium run. WebKit also rendered the source frames without page errors.

Screenshots and performance output are under `output/playwright`. Performance sampling is a controlled local browser test, not a guarantee for physical devices. A physical phone has not been tested.

## Subsequent refinements (current)

The active source range is now frames 0–145 (146 frames), ending on the intact orange splash before the outgoing ring transition. The remaining stored source frames are preserved but never requested. A feathered handoff moves the recorded shot toward the live carousel; its outgoing bottle remains above the arriving products. Five scroll stops follow in order: Flow, Shine, Deep Sleep, B12+D3+B9, Grow. Wheel gestures and vertical touch gestures select one stop at a time; after the fifth, the next downward gesture exits to the following section. Reduced motion retains ordinary static sections and direct product controls.

The supplied `assets/לוגו.png` replaces the previous filtered wordmark. The three-step section has new product illustrations; the existing final CTA now shows the five-product lineup inspired by `frame_030.jpg`. An additional bundle section follows the community section, inspired by `frame_019.jpg` and the official GOOM bundle listings. Existing other sections are retained. Community strip durations changed from 58/64 to 53/58 seconds; the story ring revolution changed from 44 to 40 seconds. Playback speed of the videos themselves is unchanged.

Current QA: `check-refinements.cjs` checks desktop/mobile layouts and all five scroll-selected captions. `check-scroll-stops.cjs` verifies wheel stops, next-section exit, simulated vertical touch gestures, arrows and reduced-motion controls in Chromium and WebKit. Screenshots live under `output/refinements`. The former source-sequence QA uses superseded timeline positions and is historical.
