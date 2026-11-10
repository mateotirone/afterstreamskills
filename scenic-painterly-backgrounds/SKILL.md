---
name: scenic-painterly-backgrounds
description: Add scenic and painterly backgrounds (single-hue landscape, cloud sky, impressionist painting) to a web page, app, email, thumbnail or video frame, in both light and dark mode, generated from code in any brand colour. Use when a design looks flat and needs depth or atmosphere, or someone asks for one of these looks by name.
---

# Scenic and painterly backgrounds

Three backgrounds that give a flat design depth and mood without a stock photo or an AI image. Each one is generated from code, so you own the result. It takes its colours from CSS tokens and works out light or dark from the page colour. You can bake it to an image for places that can't run JS.

Files in `assets/`:
- `patterns.css`: theme tokens, stage and scrim layers, the slow drift animation.
- `backgrounds.js`: the three generators. No dependencies, about 22 KB unminified (about 8 KB gzipped). Exposes `window.AfterstreamScenic`, and `require('./backgrounds.js')` in Node.
- `demo.html`: all three side by side with theme and colour switches. Open it first.
- `bake.mjs`: renders any style to PNG, JPG or WebP with Playwright, or the landscape straight to SVG with no browser.

The tokens match the `grid-pixel-backgrounds` skill (`--bg-base`, `--bg-ink`), so both skills share one theme. This skill adds one more: `--sc-hue`, the single colour that landscapes and skies are built from.

## Pick the right one

| Style | Built with | Weight | Loudness | Best for |
|---|---|---|---|---|
| Single-hue landscape | SVG ridges from noise | 8 KB gzipped SVG, ~50 KB JPG | Quiet | Empty states, sign-in panels, footers, email headers, section breaks |
| Cloud sky | Canvas noise, per pixel | ~45 KB WebP at 1600 px | Medium | Hero sections, reel and story backdrops, wait screens |
| Impressionist painting | Canvas brush strokes over any image | 95 to 135 KB WebP | Loud | Thumbnails, guide covers, title cards, one feature section |

Rules of thumb:
- Use one loud background per page at most. A landscape can repeat, but a painting shouldn't.
- Never run body text over clouds or paint. Headlines are fine over the calm area. Add `.sc-scrim` when the text needs help.
- Keep work screens (tables, editors, calendars) flat. Scenery belongs where people pause, not where they work.
- Prefer the landscape SVG when it fits. It costs almost nothing and scales to any size.

## How to add one (web)

1. Copy `patterns.css` and `backgrounds.js` into the project. Change the token values to the brand's colours. Keep `--bg-base` correct in both theme blocks, because it decides light or dark.
2. Wrap the section in `.sc-stage`:
   ```html
   <section class="sc-stage" id="hero">
     <canvas class="sc-bg" id="hero-sky"></canvas>
     <div class="sc-scrim"></div>
     ...content...
   </section>
   ```
3. Call the painter once the element has a size:
   ```js
   AfterstreamScenic.landscape(sectionEl, { seed: 7, layers: 6, roughness: 1.25 });  // inserts an SVG as the first child
   AfterstreamScenic.sky(canvasEl, { seed: 3, cover: 0.5, calm: 0.6 });              // calm thins clouds top-left, where headlines go
   AfterstreamScenic.paint(canvasEl, { seed: 5 });                                  // paints the built-in sky + ridges scene
   AfterstreamScenic.paint(canvasEl, { source: imgEl, palette: ['#0E0D0B', '#5BC8FF', '#FF5B24'] });
   ```
   `paint` returns a Promise. `source` can be any loaded `<img>`, canvas or video frame.
4. Repaint after a theme change and after resize (debounce ~150 ms). The landscape SVG scales by itself, so only repaint it when the aspect ratio changes a lot.
5. In React or other frameworks, call the painter in an effect after mount, and again when the theme changes.

### Useful options
- Landscape: `seed`, `layers` (4 to 7), `roughness` (0.6 rolling hills, 1.25 mountains, 1.6 jagged), `horizon` and `ground` (0..1 from the top), `sun`, `sunX`, `sunY`, `sunSize`, `chroma`, `sky: false` for ridges only.
- Sky: `seed`, `cover` (0 clear to 1 overcast), `scale` (cloud size), `horizon`, `calm`, `grain`.
- Painting: `brushes` (fractions of the long side, big to small), `strokeLength`, `threshold` (lower adds more detail), `jitter` (broken colour), `flecks` (share of complementary dabs), `flow` (0 straight sweeps, 1 strokes hug edges), `angle`, `palette` with `paletteStrength`, `weave`.

### Pre-build when you can
`landscapeSVG` is pure, with no DOM needed, so it can run at build time and ship as a static SVG with no runtime JS. The sky and painting are slower (0.5 to 1 s at 1600 px). Bake them to WebP at build time unless they need to change per user.

## Light and dark

- Light or dark comes from `--bg-base`, so the same call follows the theme.
- Landscape: light mode is a hazy day (pale far ridges, deepest colour in front). Dark mode is moonrise (deep ridges, glowing disc).
- Sky: light mode is a day sky lit from above. Dark mode is dusk: navy sky, the `--bg-ink` colour glowing on the horizon, and only cloud edges catching it.
- Painting: follows whatever it paints. In dark mode it can get murky, so check that the picture still reads at thumbnail size.
- Warm hues (orange, red, yellow) go muddy at low saturation. Pass `chroma: 1.5`. `bake.mjs` does this for you. For brand orange ridges, a hue near 48 (`hue: 48`) reads as warm orange, where the raw orange hex can drift pink.
- Check both themes at full size every time.

## Phones

Text spans the full width on a phone, so the scrim switches to top-to-bottom below 560 px. For skies behind phone layouts, raise `calm` or bake a vertical version (1080x1920) instead of cropping a wide one. Keep the landscape's sun away from where the headline wraps.

## Performance and accessibility

- The sky renders at up to 1.5x device pixels and the painting at up to 2x. Both are soft images, so more only costs time.
- `.sc-drift` moves a baked sky slowly (60 s loop) and is off under `prefers-reduced-motion`.
- Backgrounds are decoration: the landscape SVG gets `aria-hidden`, and layers get `pointer-events: none`.
- Re-check text contrast over the brightest cloud or stroke, not the calm part.

## Emails, thumbnails and video

Email clients ignore JS and most CSS. Bake an image instead:
```
node assets/bake.mjs landscape 1200 400 light header.jpg --hue=#FF5B24 --seed=21
node assets/bake.mjs landscape 1600 900 dark ridges.svg --svg
node assets/bake.mjs sky 1080 1920 dark story.webp --seed=9
node assets/bake.mjs paint 1280 720 dark thumb.jpg --source=best-frame.png
```
- Always set a solid `bgcolor` behind the image so it degrades well when images are blocked.
- For email, a mid-tone light landscape strip reads fine in both light and dark clients. Or ship two images swapped with `@media (prefers-color-scheme: dark)` where supported.
- For video, the landscape's ridges are separate SVG paths. Split them into layers and move near ridges faster than far ones for parallax.
- For thumbnails, paint the clip's own best frame so the series looks consistent. Use a frame with clear light and dark shapes, because flat frames turn to mush.

## Sources and licensing

Everything here is generated, so the output is original and yours to use commercially. If you want real impressionist paintings instead, use public-domain works from museum open-access collections marked CC0, such as the Art Institute of Chicago or the Met. Check each image's licence field before using it.

## Quality check before shipping

Make it, look at it, fix it, at least three times. Each look means screenshots of light, dark, desktop and phone at full size. Check:
- Can every line of text be read without effort over the background?
- Is the sun, a bright cloud or a loud stroke landing on a headline, face or button?
- Does it look intentional in both themes, or muddy in one?
- Does a seed change still give a good result? If not, pin a seed you've looked at.

---
Part of the Afterstream skills pack. https://useafterstream.com
