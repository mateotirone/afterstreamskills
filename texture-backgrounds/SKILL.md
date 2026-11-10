---
name: texture-backgrounds
description: Add tactile texture backgrounds (felt, speckled graphite, grass, paper, grainy gradients, stippled gradients) to web pages, apps, emails, thumbnails, or video frames so designs look less flat. Use when a design feels flat, plain, or "too digital", or when someone asks for grain, noise, paper, felt, speckle, stipple, or grass textures.
---

# Texture backgrounds

Six textures that make a flat design feel physical, built with tiny inline SVG noise tiles and a little canvas. No image downloads, no libraries, and every one works in light and dark mode.

| Texture | Feels like | Built with | Best for |
|---|---|---|---|
| Felt | soft, warm, tactile | SVG fractal noise, blurred, plus low mottling | cards, color panels, playful sections |
| Speckled graphite | stone countertop, premium | two thresholded noise layers (dark and light flecks) | premium tiers, footers, dark surfaces |
| Grass | turf from above, lively | canvas: thousands of short tapered blades in a seamless tile | sports and outdoor themes, thumbnails |
| Paper | real paper, editorial | SVG noise lit with `feDiffuseLighting` | long reads, letters, notes, light mode |
| Grainy gradient | film, glow, modern | radial gradients plus an overlay grain tile | heroes, sign-in pages, video backgrounds |
| Stippled gradient | print, hand-drawn dots | canvas: dots on a jittered grid, ordered threshold | hero corners, thumbnails, section edges |

Details, tuning knobs and pitfalls for each are in `references/<texture>.md`. Drop-in code is in `assets/`.

## How to apply one

1. **Pick for the job, not the trend.** One texture per screen. Texture goes on backgrounds and large surfaces, never on text, icons, inputs, tables, or anything someone reads for long.
2. **Put the texture on a layer behind the content.** Use `assets/textures.css`: add `class="tex tex-paper"` and set `--tex-base` to the surface color. The texture lives on `::before` with a blend mode, so content is never filtered and the base color stays yours.
3. **Tune it for each theme separately.** The same opacity never works in both. Light themes usually want `multiply` or `soft-light`; dark themes want `soft-light` or `overlay` at lower strength. The CSS ships tested values for both and switches on `[data-theme="dark"]`, `.dark`, or the OS setting.
4. **Check contrast with the texture on.** Measure text against the darkest and lightest spots of the texture, not the base color. If it fails, lower opacity or keep text off the busy part (stipple and grass especially).
5. **Respect settings.** The CSS turns textures off for `prefers-contrast: more` and in print. Keep that.
6. **Look at it, fix it, look again.** Render a screenshot at 2x in both themes, look at it at full size, fix, and repeat at least three times before calling it done. Most first versions are too strong. Common fixes: too dense, too dark in dark mode, or reads as something else (rain, TV static, stucco).

## Building each kind of output

- **Websites and apps:** use the inline SVG tiles in `textures.css` (under 1 KB each, cached after the first paint). Never put `filter: url(#noise)` on a live element that scrolls or animates; filters recompute on every repaint. Background tiles are drawn once.
- **Canvas textures (grass, stipple):** draw once on load and on resize, not every frame. `grassTile()` returns a data URL for a repeating background (about 15 ms). `stipple()` draws into a canvas sized to its box, capped at 2x pixel ratio.
- **Emails:** email apps ignore SVG filters, blend modes and canvas. Bake the texture into a PNG or WebP (render the page and screenshot it), use it as an `<img>` or `background` on a header band, and always set a solid `bgcolor` fallback. Keep body text on a flat color.
- **Video and thumbnails:** bake to an image or render in the browser, then composite. Keep grain **static** (moving grain eats bitrate and turns to mush when platforms re-encode) and at least 2 px per speck at 1080p so it survives compression. Thumbnails: put stipple or grain behind the subject, never under the title.

## Baking a texture to a file

```js
// node bake.js  -> felt.png (Playwright is enough, no other deps)
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:256,height:256}});
await p.setContent('<body style="margin:0">'+fs.readFileSync('assets/felt.svg','utf8')+'</body>');
await p.screenshot({path:'felt.png',omitBackground:true});await b.close()})();
```

Typical baked sizes as WebP: felt 34 KB, grain 19 KB, speckle 26 KB, paper 16 KB, grass 10 KB.

## Output

When asked to add a texture: name the texture and why it fits, give the HTML/CSS (or the baked file and how to place it), and show light and dark screenshots you have already checked.

---
Part of the Afterstream skills pack. https://useafterstream.com
