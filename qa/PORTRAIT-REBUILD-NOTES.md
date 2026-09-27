# Portrait rebuild following mobile feedback

The previous approach was rejected: a generated still was stretched to the phone viewport, then dissolved into differently framed landscape footage. This version removes that layer from HTML and JS completely.

## Film

`scripts/build-portrait-sequence.py` composes all 240 native source frames to a consistent 720×1560 portrait coordinate system. Product artwork uses one uniform scale, never independent horizontal/vertical scaling. The camera path follows the establishing group, descending Flow bottle, splash, receding ring, and five-product finale. It uses the existing cleaned native source frames, not synthesized product motion. The environment is blended into a lavender portrait background; original artwork was not reshot in 3D, and the original film's optical detail / edge crops remain source limitations.

`assets/sequence/portrait/` contains the complete 24fps sequence and the camera manifest. The browser only applies uniform cover fitting for different phone ratios. There is no static opening replacement, per-frame aspect-ratio distortion, or simulated traveling bottle. The complete film now occupies a 440svh scroll section. The interactive product selector is a separate normal-flow section after the film, so it cannot fade over the recorded ring finale.

Decoded frames are capped at 12 (about 54 MB for bitmaps); neighboring decode requests are bounded. Full compressed warming starts on scroll intent, respecting Save-Data. Reduced motion displays the portrait poster and leaves the following content available.

## Requested section changes

- The original 12-card rotating testimonial ring is restored, including rotation, pause, arrows and drag. Native horizontal-story replacement is removed. Mouse hover pauses rotation; touch pointer entry does not leave it accidentally paused.
- Community rows run in 18 / 21 seconds instead of 53 / 58 seconds. Touch hover does not suspend the marquee; reduced motion still disables it.
- Better Together has a sticky portrait stage with three cards. Each vertical touch or wheel gesture advances one card. A gesture is consumed until it ends, preventing inertia from skipping the second card. Reverse gestures go back. First / last boundaries release to normal document scrolling. Numbered buttons also select cards. Only the active card is focusable. Reduced motion falls back to the ordinary unpinned cards.

## Verification

`qa/check-portrait-rebuild.cjs`: Chromium and WebKit at 320×568, 375×667, 390×844, 430×932. Screenshots for all major film beats, formulas, every lower section, each bundle at each size, reduced motion. Checks no overflow, film reaches source frame 239, product navigation, ordered bundle stepping, reverse stepping / exit, ring rotation, community duration, console errors and missing files.

A separate Chromium CDP touch test dispatches native touchStart / multiple touchMove / touchEnd events, including small movements before the gesture threshold: exactly 0→1→2, reverse 2→1, return 1→2, then release. Physical-device Safari/Android performance is not measured.

`mobile-preview.html` presents the real site in a 390px iframe, so the desktop preview surface displays the phone layout. It is a preview wrapper, not the production entry point. The site remains `index.html`. No deployment performed.
