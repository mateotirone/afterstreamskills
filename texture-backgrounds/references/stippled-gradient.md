# Stippled gradient

A gradient drawn with dots, like a print or pen stipple.

**Build:** `AfterstreamTX.stipple(canvas, {color, angle, from, to, dot, gap, jitter, seed})` in `assets/textures.js`. Color defaults to the `--bg-ink` token. Walks a grid every `gap` px, works out the gradient value `t` at that point, and draws a dot when `t` beats a 4×4 Bayer threshold plus a little randomness. Each dot is nudged by `jitter` (0 is a halftone grid, 1 is organic) so density reads as an even tone without clumps.

```html
<div class="tx-stage">
  <canvas class="tx-bg"></canvas>
  ...content...
</div>
<script>AfterstreamTX.stipple(document.querySelector('.tx-stage canvas'), {angle: 45, from: -.9})</script>
```

**Tuning:** `angle` points toward the dense side (45 is the top right). Start `from` below 0 so the area under your text stays clean. `dot` 1.1 and `gap` 4 suit UI; double both for thumbnails.

**Pitfalls:** pure random acceptance gives clumps that look like confetti. Jitter 0 looks like a mechanical halftone. Redraw on resize and on theme change.
