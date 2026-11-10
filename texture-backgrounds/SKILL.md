---
name: texture-backgrounds
description: Add tactile texture backgrounds (felt, speckled graphite, grass, paper, grainy gradients, stippled gradients) to a web page, app, email, thumbnail or video frame, in both light and dark mode. Use when a design looks flat or "too digital", or someone asks for grain, noise, paper, felt, speckle, stipple or grass.
---

# Texture backgrounds

Six textures that make a flat design feel physical, without a stock image. Each one reads its colors from CSS tokens so it works in light and dark mode, and can be baked to a PNG for places that can't run CSS or JS.

Files in `assets/`:
- `textures.css`: theme tokens, the four SVG-noise textures as inline tiles (no requests, under 1 KB each), the grainy gradient glow.
- `textures.js`: the two canvas textures, grass and stipple. No dependencies, about 4 KB. Exposes `window.AfterstreamTX`.
- `demo.html`: all six side by side with a theme switch. Open it first.
- `bake.mjs`: renders any texture to a PNG with Playwright, for emails, thumbnails, OG images and video frames.
- `felt.svg`, `speckle.svg`, `paper.svg`, `grain.svg`: readable sources of the inline tiles.

Token names (`--bg-base`, `--bg-ink`) match the grid-pixel-backgrounds skill, so both packs share one theme.

## Pick the right one

| Texture | Built with | Weight | Loudness | Best for |
|---|---|---|---|---|
| Felt | SVG noise, blurred, plus mottling | <1 KB | Quiet | Color panels, cards, friendly brand posts |
| Speckled graphite | Two thresholded noise layers | <1 KB | Quiet | Premium plan cards, footers, dark surfaces |
| Grass | Canvas blades in a seamless tile | ~2 KB JS | Loud | Sports, racing and outdoor themes, thumbnails |
| Paper | SVG noise lit with `feDiffuseLighting` | <1 KB | Quiet | Article headers, letters, quotes, email headers |
| Grainy gradient | Radial gradients + overlay grain | <1 KB | Medium | Heroes, sign-in pages, video backgrounds |
| Stippled gradient | Canvas dots, ordered threshold | ~1 KB JS | Medium | Hero corners, empty states, thumbnails |

Rules of thumb:
- One texture per screen. Quiet ones can sit behind a whole section; loud ones only behind headlines or images.
- Never put texture on text, icons, inputs or tables, and keep body text off grass and dense stipple.
- Prefer the CSS textures when they fit. They are drawn once and never repaint.

Details, tuning knobs and pitfalls for each are in `references/<texture>.md`.

## How to add one (web)

1. Copy `textures.css` and (for grass or stipple) `textures.js` into the project. Change the token values to the brand's colors and keep the light block in sync with the dark one.
2. Wrap the section in `.tx-stage` and put the texture layer first:
   ```html
   <section class="tx-stage" style="--bg-base:#F4EFE6">
     <div class="tx-bg tx-paper"></div>
     ...content...
   </section>
   ```
   Grainy gradient: `<section class="tx-stage tx-glow"><div class="tx-bg tx-grain"></div>...`
   Canvas textures, once the element has a size:
   ```js
   AfterstreamTX.grass(el);                                   // sets a repeating tile on el; colors from --tx-grass-*
   AfterstreamTX.stipple(canvasEl, { angle: 45, from: -.9 }); // dots in --bg-ink, dense toward the top right
   ```
3. Repaint canvas textures after a theme change and after resize (debounce ~150 ms). CSS textures update on their own.
4. In React or other frameworks, call the painters in an effect after mount, and again when the theme changes.

## Light and dark

- Never reuse one opacity for both themes. The tokens ship tested values: felt .9 / .5, speckle .7 / .8, paper .4 multiply / .7 soft-light, grain .6 / .3 (light / dark).
- `multiply` only darkens, so it disappears on dark surfaces. Use `soft-light` or `overlay` there.
- Felt and speckle read as static on near-black. Lift the base to a graphite (#26241F) in dark.
- Grainy gradients need pale tints in light mode, or they turn muddy.
- Check both themes at full size every time.

## Performance and accessibility

- Never put `filter: url(#noise)` on a live element that scrolls or animates. Filters recompute on every repaint; background tiles are drawn once.
- Grass draws in about 15 ms. Stipple caps device pixel ratio at 2.
- `textures.css` hides every `.tx-bg` for `prefers-contrast: more` and in print. Keep that.
- Layers are decoration: `pointer-events: none`, and measure text contrast over the darkest and lightest spots of the texture, not the base color.

## Emails, thumbnails and video

Email clients ignore SVG filters, blend modes and canvas. Bake an image instead:
```
node assets/bake.mjs paper 600 160 light header.png --base=#F4EFE6
node assets/bake.mjs grain 1280 720 dark thumb-bg.png
```
- Always set a solid `bgcolor` behind the image so it degrades well when images are blocked. Keep email body text on a flat color.
- Video: keep grain static (moving grain eats bitrate and turns to mush after platform re-encoding) and make specks at least 2 px at the final size.
- Thumbnails: bake at the final size and keep the face and title over the calm area.

Typical baked tile sizes as WebP: felt 34 KB, speckle 26 KB, grain 19 KB, paper 16 KB, grass 10 KB.

## Quality check before shipping

Make it, look at it, fix it, at least three times. Each look means screenshots of light, dark, desktop and phone at full size. Check:
- Is it too strong? Most first versions are.
- Does it read as the intended material, not something else (rain, TV static, stucco, confetti)?
- Can every line of text be read without effort over it?
- Does it look intentional in both themes, or just faint in one?

---
Part of the Afterstream skills pack. https://useafterstream.com
