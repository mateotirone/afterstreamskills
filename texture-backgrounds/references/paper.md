# Paper

Fiber relief lit from the top left, like watercolor or cotton paper.

**Build:** `assets/paper.svg`. Fractal noise (`0.09 0.11`, 5 octaves; slightly different x and y gives a fiber direction) used as a height map for `feDiffuseLighting` with a distant light (azimuth 45, elevation 55). Class `tx-paper`. Light mode: `multiply` at 0.4. Dark mode: `soft-light` at 0.7 reads as dark cardstock (tokens `--tx-paper` and `--tx-paper-blend`).

**Tuning**
- Relief depth: `surfaceScale`. 0.75 is paper; above 1.2 looks like stucco or crumpled foil.
- Grain size: `baseFrequency`. Lower means bigger, rougher fibers.

**Looks best on** warm off-whites (#F4EFE6). Ideal behind article headers, letters, notes and quotes.

**Pitfalls:** big relief behind body text hurts reading. Use it on headers and margins, or keep it very faint behind paragraphs.
