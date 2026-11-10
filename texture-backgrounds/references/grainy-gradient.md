# Grainy gradient

Soft color glows with film grain on top. The grain also hides gradient banding.

**Build:** `tx-glow` paints two radial gradients from the `--tx-glow-1` and `--tx-glow-2` tokens; a `tx-bg tx-grain` layer adds fine grayscale noise with `overlay` (`--tx-grain`: 0.6 light, 0.3 dark).

```html
<section class="tx-stage tx-glow">
  <div class="tx-bg tx-grain"></div>
  ...content...
</section>
```

For your own gradient, drop `tx-glow` and set `background-image` on the stage yourself; the grain layer works over anything.

**Tuning:** in light mode use pale tints of the brand colors (they turn muddy otherwise) and raise grain opacity, because overlay grain shows less on light colors.

**For video:** bake the frame, keep the grain static, and scale it so each speck is at least 2 px at 1080p.

**Pitfalls:** grain over large flat areas with no gradient looks like a dirty screen. Too many color stops looks like a 2019 SaaS hero.
