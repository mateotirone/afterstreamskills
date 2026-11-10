# Felt

Soft fuzz with a little mottling, like a pool table or a felt letter board.

**Build:** `assets/felt.svg`. High-frequency fractal noise (`baseFrequency 0.55`, 4 octaves) blurred by 0.45 px for the fuzz, mixed with low-frequency noise (`0.06`) for gentle mottling, then pushed to grayscale with extra contrast. Class `tx-felt`, blended with `soft-light` so it tints any base color.

**Tuning**
- Fuzz size: `baseFrequency` on the first `feTurbulence`. Lower is coarser.
- Mottling: `k3` in the `feComposite`. Above 0.3 starts to look stained.
- Strength: the `--tx-felt` token. Tested: 0.9 light, 0.5 dark.

**Looks best on** mid tones and saturated fills (orange, blue, green felt). On near-black it reads as static, so lift the base to a graphite (#26241F or similar).

**Pitfalls:** too much low-frequency noise looks like water stains. Too little blur looks like TV static.
