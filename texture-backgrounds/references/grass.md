# Grass

Short tapered blades seen from above, like trackside turf.

**Build:** `AfterstreamTX.grass(el, {base, light, dark, size, density, seed})` in `assets/textures.js`. Colors default to the `--tx-grass-base`, `--tx-grass-light` and `--tx-grass-dark` tokens. Draws about 3,000 blades into a 256 px tile with canvas: each blade is a thin curved triangle 10 to 24 px long, leaning within ±20° of vertical, colored light or dark at 12 to 42% opacity. Blades near an edge are drawn on the opposite edge too, so the tile repeats seamlessly. It sets the tile as the element's repeating background and also returns the PNG data URL:

```js
AfterstreamTX.grass(document.querySelector('.hero .tx-bg'));
```

**Tuning:** `density` (1 is full turf), blade width (`w`), lean (`a`). For real grass use greens: base #3F7F3A, light #A8D86A, dark #1E3D1B.

**Pitfalls:** pure SVG noise stretched vertically (`baseFrequency="0.9 0.05"`) looks like rain or denim, not grass. You need blade shapes. Grass is busy, so keep long text off it or put text on a solid chip.
