# Speckled graphite

Sparse dark and light flecks, like a stone countertop or a graphite notebook cover.

**Build:** `assets/speckle.svg`. Two noise layers with different seeds. Each is thresholded hard through the alpha row of a color matrix (`-40` slope) so only the extreme values survive as flecks: one layer black, one white. Class `tx-speckle`, normal blending.

**Tuning**
- Fleck count: the offset in each alpha row (`10.8` dark, `-29.4` light). Small changes matter: 0.5 doubles or halves the count.
- Fleck size: `baseFrequency`. 0.55 to 0.6 gives 1 to 2 px flecks.
- Strength: the `--tx-speckle` token. 0.7 light, 0.8 dark.

**Looks best on** graphite and stone tones: #26241F dark, #F0ECE4 light. Great for premium plan cards and footers.

**Pitfalls:** a soft threshold gives TV static instead of flecks. Light flecks at full opacity on dark wash the surface gray; keep them sparser than the dark ones.
