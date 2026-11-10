# Grainy gradient

Soft color glows with film grain on top. The grain also hides gradient banding.

**Build:** layer two or three `radial-gradient`s on the element, then add `class="tex tex-grain"`. `assets/grain.svg` is fine fractal noise in grayscale, blended with `overlay` (0.6 light, 0.3 dark).

```html
<section class="tex tex-grain" style="--tex-base:#0E0D0B;
  background-image:radial-gradient(60% 80% at 15% 10%,rgba(255,91,36,.55),transparent 70%),
                   radial-gradient(70% 90% at 95% 100%,rgba(42,93,120,.9),transparent 70%)">
```

**Tuning:** in light mode use pale tints of the brand colors (they turn muddy otherwise) and raise grain opacity, because overlay grain shows less on light colors.

**For video:** bake the frame, keep the grain static, and scale it so each speck is at least 2 px at 1080p.

**Pitfalls:** grain over large flat areas with no gradient looks like a dirty screen. Too many color stops looks like a 2019 SaaS hero.
