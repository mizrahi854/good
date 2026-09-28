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

## Mobile repair — September 11 (current behavior)

The carousel is now arrow-only; all wheel/touch interception and product scroll stops were removed. The three-step section was removed. The active movie ends at frame 145 and hands over to one transparent Flow bottle. Its start pose is calculated from the same frame dimensions/reframing as the canvas, and its end pose is measured from the live carousel. The arriving section moves 22% of a viewport rather than 65%, avoiding a long blank transition. A static splash plate bridges the background. Canvas resize is skipped when viewport dimensions are unchanged. Product selection does not reset while reduced motion is enabled.

Mobile layout uses stable small viewport units, separate heading/product/caption areas, 44px+ arrow targets and compact rules for short screens. The previous 600px minimum pinned height was removed. Remaining sections have responsive spacing, type and media sizes. The legacy #how fragment maps to #ritual on initial load and hash changes. Saved copies before this repair are in `.recovery/before-mobile-fix`.

`qa/check-mobile-repair.cjs` verifies geometry at 320×568, 375×667, 390×844, 430×932, 768×1024, 844×390 and 1440×900 in Chromium; mobile 390×844 and 320×568 in WebKit at 2× DPR. It checks no horizontal overflow, caption/product separation, landing geometry, arrow control, free scrolling, menu links, old anchors and reduced motion. These are browser viewport tests; no physical phone was used.

## Mobile portrait film — 2026-09-27

Phones (`max-width:900px` portrait) now play `assets/sequence/mobile-film/` — 150 full-screen 852×1846 frames built only from the supplied mobile plates: hero blob (`assets/mobile-cinematic-art.webp`) → Flow drops through the bubble (camera aligned to the blob by SIFT) → orange splash → second descent → Flow in the glass ring with Grow/Shine → the existing formula section. The Flow bottle is a separate layer (GrabCut mask, ECC-aligned labels) so it travels while the world changes. The web-style ring copy ("כל הטוב. בקצב שלך") and chapter rail are hidden on phones. Desktop is unchanged. Pipeline + plates: `scripts/mobile-film/` (run clean4 → plates → masks → envs → align → ecc → render). Backups: `.recovery/*-before-mobile-film.*`. Verified in Chromium at 390×844, 375×667, 430×932; no physical phone.

### v2 (same day, after feedback)
Ring beat removed. Frames now `assets/sequence/mobile-film-v2/` (134, versioned folder to beat cached v1 frames), built by `scripts/mobile-film/render2.py`, following the original film (`assets/film`): Flow lifts inside its lobe → falls out of the bubble with the glass membrane stretched after it and snapping back (static camera) → camera follows, the bottle rises back into frame → orange splash landing with dip-and-rise, then a gentle float → world sinks while the formulas section rises over it as a curtain (`margin-top:-48svh`, masked top edge) and the bottle falls into it. Splash copy on phones: "להיכנס ל־Flow." + existing paragraph + "מה יש בפנים?" CTA; desktop keeps its own headline.

### v3 (after second feedback) — current
Frames `assets/sequence/mobile-film-v3/` (134), `scripts/mobile-film/render3.py`. Exactly three rests with magnetic scroll stops (`.film-stop`, `scroll-snap-type:y proximity`, scroll-padding 0 on phones): hero → scroll 1 the bottle rises → scroll 2 falls through the bubble (glass stretches/snaps), camera follows, lands in the orange splash (copy + CTA) → scroll 3 falls through the liquid ring, camera sinks one screen and the bottle lands in the Flow slot of the formulas section. The final frame is captured from the live formulas section at frame resolution (`F_*.png`), and `#formulas` (margin-top:-100svh) fades in exactly on top of it when progress ≥ .985 — invisible handoff. Frame catch-up smoothing 70ms on phones. Chapter pill (הטוב שלך · Flow · הפורמולות) is a fixed liquid-glass pill on phones, moved to <body> so it floats above the formulas. All phone buttons use liquid glass (light for controls, deep violet for primary). Desktop unchanged.

### Speed pass — 2026-09-28
Frames `mobile-film-v4/` at 720×1560 WebP q74 (7.4 MB, ~54 KB/frame; was 12 MB). All frames are fetched on page open in playback order (6 lanes, first 30 high priority) and kept as Blobs; decoding runs 22 frames ahead / 8 behind in the scroll direction, cropped+resized to the canvas once so each paint is a 1:1 blit (28 bitmaps max). Catch-up smoothing 14 ms (was 70). Scroll snapping removed; phone film 330svh. The brand video no longer autoplays on load (IntersectionObserver). Product PNGs → alpha WebP (1.76 MB → 248 KB). Measured (Chromium, 20 Mbps / 40 ms): first frame 0.27 s, first 30 frames 1 s, all 134 ≈4 s; whole-film sweep in 0.65 s at 4× CPU throttle → avg lag 0.8 frame.

### Buttons + second speed pass — 2026-09-28
One button system on phones: every text button is the same liquid-glass pill (48px, 14px/600), every icon button the same 52px circle; deep violet = main action or selected, light glass = secondary. No square buttons remain (checked by computed radius). Frames load first-scroll-first, then coarse-to-fine (every 8th, 4th, 2nd, all). Video posters load only near their section; all content images below the hero are lazy; formula background → WebP (215 → 74 KB); desktop-only manifest not fetched on phones. Non-film bytes in the first 1.5 s: ~1.75 MB → ~330 KB. Slow-4G test (8 Mbps / 70 ms), full sweep 1.5 s after open: max lag 1 frame.

### Real-phone smoothness pass — 2026-09-28
Benchmark: `node qa/perf-mobile-film.cjs` (WebKit + Chrome, 390×844 @3×, finger-like 2.4 s sweep down and up; prints rAF p50/p95/max, long frames and where they happen; `ONLY=webkit` for one engine).
- Frames are fetched and decoded in a Web Worker (inline Blob URL) and transferred as ImageBitmaps; the main thread only blits. Fallback: worker posts Blobs and the page decodes.
- Neighbouring frames are blended by the fractional film position (`sourcePosAt`), 1/16 alpha steps; redraw only when the pair/mix changes.
- DOM writes in `applySourceProgress` happen only when a visible state changes (no per-scroll-frame attribute/class/style writes).
- No `backdrop-filter` on phones (glass = gradients + highlights); press/community marquees and the story ring loop stop off screen.
- The landing stall was the bottles' live `filter: drop-shadow` (WebKit re-rasterises it on reveal: 167 ms). Phones now use `*-sh.webp` with the identical shadow baked in (`.formula-item img.is-baked`, padded canvas, same position). Reveal cost 167 → 34 ms (two-frame measurement floor).
Result (WebKit): max frame 113–197 ms → 39 ms, p95 18 ms. Desktop keeps the original images and filters.

### Final acceptance — 2026-09-28 (34/34 pass)
`node qa/final-perf.cjs` — WebKit and Chrome (1×, 4×, 6× CPU), 375×667 / 390×844 / 430×932 @3×, touch; slow 6 s, normal 2.4 s, fast 0.8 s and flick sweeps; cold loads on 4G and slow 4G. Raw output: `qa/final-perf-results.txt`.
Criteria: p95 ≤ 20 ms (Chrome: its headless build here is fixed at 30 Hz even on about:blank, so p95 ≤ 35 ms), worst frame ≤ 50 ms (70 ms at 4–6× CPU), average frame lag ≤ 1, zero long tasks, settles on the exact frame, no errors / 404s / overflow; first frame ≤ 1 s on 4G.
Fixes made during this run:
- Stale "already requested" check could leave the start frame undecoded after scrolling back (showed frame 1 at the top). Request signature now includes a cache version.
- Quarter-resolution proxies of all 134 frames (~40 MB) are decoded in idle worker slots; very fast scrolls show the exact frame from its proxy until the sharp one lands (WebKit fast-sweep lag 1.38 → 0.02 frames).
- Bottle shadows on phones: the unchanged bottle image plus a separate pre-rendered shadow image behind it (`*-shadow.webp`), instead of resizing a baked image inside a <button>.
Results: WebKit p95 17–18 ms, worst 33–40 ms, lag ≤ 0.05; Chrome 0 long tasks even at 6×; first frame 0.25 s (4G) / 0.97 s (slow 4G); first scroll ready 1.0 s / 4.2 s; all frames 3.5 s / 15.8 s.
Known tool limit: Playwright's WebKit does not render CSS perspective in screenshots (verified on a two-div test page), so the 3D formula ring looks flat in WebKit screenshots only; geometry measures identical to Chrome.
