---
name: grid-pixel-backgrounds
description: Add grid, pattern and pixel backgrounds (blueprint grid, square-dot grid, contour lines, halftone, dithered image, pixel mosaic, ASCII) to a web page, app, email, thumbnail or video frame, in both light and dark mode. Use when a design looks flat, or someone asks for one of these textures by name.
---

# Grid and pixel backgrounds

Seven backgrounds that take a design from flat to textured without a stock image. Each one is ready to use, reads its colors from CSS tokens so it works in light and dark mode, and can be baked to a PNG for places that can't run CSS or JS.

Files in `assets/`:
- `patterns.css`: theme tokens, the two pure-CSS styles, fade masks.
- `backgrounds.js`: the five generated styles. No dependencies, about 13 KB unminified (about 4 KB gzipped). Exposes `window.AfterstreamBG`.
- `demo.html`: all seven side by side with a theme switch. Open it first.
- `bake.mjs`: renders any style to a PNG with Playwright, for emails, thumbnails, OG images and video frames.

## Pick the right one

| Style | Built with | Weight | Loudness | Best for |
|---|---|---|---|---|
| Blueprint grid | CSS, 4 gradients | ~400 B | Quiet | Hero sections, "how it works", empty states, technical or data stories |
| Square-dot grid | CSS, 1 conic-gradient | ~150 B | Quietest | Whole-page or panel backgrounds, calendars, onboarding, chat panels |
| Contour lines | SVG from noise | 5 to 10 KB gzipped | Quiet | Outdoor, racing, maps, "terrain" themes, report headers |
| Halftone | Canvas dots | ~1 KB JS | Loud | Thumbnails, title cards, one feature section |
| Dithered image | Canvas, 8x8 Bayer | ~1 KB JS | Loud | Retro heroes, email headers, end cards. Works on any photo |
| Pixel mosaic | Tiny canvas, scaled | ~1 KB JS | Medium | Gaming, "starting soon" screens, launch pages |
| ASCII and pixels | Canvas text | ~1 KB JS | Medium | Developer pages, API docs, glitch transitions |

Rules of thumb:
- Use one loud background per page at most. Quiet ones can repeat.
- Never put a loud background directly behind body text. Fade it away from the text side.
- Prefer the CSS styles when they fit. They cost nothing and never repaint.

## How to add one (web)

1. Copy `patterns.css` and `backgrounds.js` into the project. Change the token values in `patterns.css` to the brand's colors. Keep the light block in sync with the dark one.
2. Wrap the section in `.gp-stage` and put the background layer first:
   ```html
   <section class="gp-stage">
     <div class="gp-bg gp-blueprint gp-fade-corner"></div>
     ...content...
   </section>
   ```
   For a canvas style, use `<canvas class="gp-bg gp-fade-left" id="hero-bg"></canvas>` and call the painter once the element has a size:
   ```js
   AfterstreamBG.halftone(el, { step: 11, cx: 0.86, cy: 0.18 });  // light source position, 0..1
   AfterstreamBG.dither(el, { pixel: 3, source: imgEl });          // omit source for the built-in sunset scene
   AfterstreamBG.mosaic(el, { cell: 22, vertical: false });        // vertical: true makes it brighten downward (phones)
   const a = AfterstreamBG.ascii(el, { size: 12, animate: true }); // a.repaint(), a.stop()
   el.insertAdjacentHTML('afterbegin', AfterstreamBG.contourSVG({ width: 1200, height: 675, seed: 21 }));
   ```
   Add `gp-pixelated` to the canvas for dither and mosaic so the browser scales them without blur.
3. Repaint canvas styles after a theme change and after resize (debounce ~150 ms). CSS and SVG styles update on their own because they use tokens.
4. In React or other frameworks, call the painter in an effect after mount, and again when the theme changes.

### Pre-build when you can
`contourSVG` is pure, with no DOM needed, so it can run at build time in Node and ship as a static SVG with no runtime JS. The same goes for any canvas style you don't need to be dynamic: bake it to WebP or PNG.

## Light and dark

- Every color comes from a token, so there's one source of truth per theme.
- Lines and dots: text color at 7 to 18% alpha. Anything stronger fights the content.
- Dark mode: lighter lines on a dark base. Light mode: use a darker, more saturated version of the accent (for example deep blue instead of sky blue), or the grid disappears.
- Dither and halftone draw only "on" pixels and leave the rest transparent. The page color shows through, so one export can work on both themes.
- Check both themes at full size every time. A grid that's perfect in dark is often invisible in light.

## Phones

Text usually spans the full width on a phone, so a left-to-right fade no longer protects it. `patterns.css` switches the fades to top-to-bottom below 560 px. Move canvas light sources to the bottom too (`halftone` `cy: 1`, `mosaic` `vertical: true`). Hide small decorative labels and crosshairs that would land on text.

## Performance and accessibility

- The ASCII animation runs at about 12 fps. It pauses when off screen or when the tab is hidden, and doesn't run at all when `prefers-reduced-motion` is on. Keep that behavior if you change it.
- Canvases cap device pixel ratio at 2. Halftone draws in under 20 ms on a laptop at 1200x500.
- Backgrounds are decoration: keep `aria-hidden` on SVGs and `pointer-events: none` on layers.
- Re-check text contrast over the busiest part of the background, not the calm part.

## Emails, thumbnails and video

Email clients ignore CSS masks, conic gradients and JS. Bake an image instead:
```
node assets/bake.mjs contour 600 200 light header-light.png
node assets/bake.mjs dither 600 200 dark header.png --transparent
```
- Always set a solid `bgcolor` behind the image so it degrades well when images are blocked.
- For dark mode email, either ship a transparent dither/halftone (works on both) or two images swapped with `@media (prefers-color-scheme: dark)` for the clients that support it.
- For thumbnails and video, bake at the final size (1280x720, 1080x1920) and layer it under the subject. Keep the face and title over the calm area.

## Quality check before shipping

Make it, look at it, fix it, at least three times. Each look means screenshots of light, dark, desktop and phone at full size. Check:
- Can every line of text be read without effort over the background?
- Is anything landing on a button, a face or a headline?
- Does it look intentional in both themes, or just faint in one?
- Does it still look right at a different width (resize, don't just reload)?

---
Part of the Afterstream skills pack. https://useafterstream.com
