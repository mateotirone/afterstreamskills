/* Afterstream scenic + painterly backgrounds: single-hue landscape, cloud sky, impressionist painting.
 * No dependencies. Colors come from the same CSS tokens as grid-pixel-backgrounds (--bg-base, --bg-ink)
 * plus --sc-hue (the one colour landscapes and skies are built from). Light or dark is read from --bg-base,
 * so one call works in both themes. Call the painter again after a theme change.
 * landscapeSVG() is pure (no DOM) and also runs in Node: require('./backgrounds.js').landscapeSVG(opts).
 */
(function (root) {
  'use strict';
  // ---------- helpers: seeded random, value noise, OKLCH colour ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise2(seed) {
  const rnd = mulberry32(seed);
  const P = new Uint8Array(512), G = new Float32Array(256);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) G[i] = rnd();
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    const u = fade(xf), v = fade(yf);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v; // 0..1
  };
}
function fbm(noise, x, y, oct = 5, lac = 2, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
  return s / norm;
}
function hexToOklch(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
function oklchToRgb(L, C, H) {
  const h = H * Math.PI / 180, A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const enc = (c) => { c = Math.max(0, Math.min(1, c)); return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
  return [enc(r), enc(g), enc(b)];
}
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// Film grain so gradients don't band in 8-bit JPG/WebP exports.
function addGrain(ctx, w, h, amount, seed) {
  if (!amount) return;
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount * 255;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Single-hue landscape: layered ridges in one hue, lighter with distance (aerial perspective).
// Returns an SVG string. Pure vector, so it scales to any size and weighs a few KB.
function landscapeSVG(o = {}) {
  const w = o.width || 1600, h = o.height || 900, seed = o.seed ?? 7;
  const mode = o.mode || 'dark';
  const hue = o.hue != null ? o.hue : hexToOklch(o.color || '#5BC8FF')[2];
  const layers = o.layers || 6;
  const horizon = o.horizon ?? 0.52;          // where the farthest ridge sits (0 top, 1 bottom)
  const ground = o.ground ?? 0.9;             // where the nearest ridge sits
  const rough = o.roughness ?? 1.25;            // 0.5 rolling hills, 1 hills, 1.6 jagged peaks
  const sun = o.sun ?? true;
  const sunX = o.sunX ?? 0.7, sunY = o.sunY ?? (horizon - 0.1);
  const noise = makeNoise2(seed);
  const rnd = mulberry32(seed + 11);
  const P = mode === 'dark'
    ? { skyTop: [0.14, 0.025], skyLow: [0.30, 0.07], far: [0.33, 0.075], near: [0.12, 0.035], sun: [0.86, 0.09], glow: 0.45 }
    : { skyTop: [0.93, 0.03], skyLow: [0.975, 0.012], far: [0.87, 0.04], near: [0.58, 0.085], sun: [0.995, 0.01], glow: 0.9 };
  const chroma = o.chroma ?? 1;               // >1 for warm hues, which look muddy at low chroma
  const col = (lc, hh = hue) => rgbHex(oklchToRgb(lc[0], lc[1] * chroma, hh));
  const id = 'l' + seed;
  let defs = `<linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${col(P.skyTop)}"/><stop offset="${horizon + 0.05}" stop-color="${col(P.skyLow)}"/><stop offset="1" stop-color="${col(P.skyLow)}"/></linearGradient>`;
  let body = o.sky === false ? '' : `<rect width="${w}" height="${h}" fill="url(#${id}sky)"/>`;
  if (sun) {
    const sr = Math.min(w, h) * (o.sunSize ?? 0.07);
    defs += `<radialGradient id="${id}glow"><stop offset="0" stop-color="${col(P.sun)}" stop-opacity="${P.glow}"/><stop offset="0.35" stop-color="${col(P.sun)}" stop-opacity="${P.glow * 0.35}"/><stop offset="0.7" stop-color="${col(P.sun)}" stop-opacity="${P.glow * 0.08}"/><stop offset="1" stop-color="${col(P.sun)}" stop-opacity="0"/></radialGradient>`;
    body += `<circle cx="${sunX * w}" cy="${sunY * h}" r="${sr * 6}" fill="url(#${id}glow)"/>`;
    body += `<circle cx="${sunX * w}" cy="${sunY * h}" r="${sr}" fill="${col(P.sun)}"/>`;
  }
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 1 : i / (layers - 1);               // 0 far .. 1 near
    const base = lerp(horizon, ground, Math.pow(t, 1.15)) * h;
    const amp = lerp(0.06, 0.19, t) * h * rough;
    const freq = lerp(2.6, 0.9, t) * (0.8 + rough * 0.3) / w;
    const L = lerp(P.far[0], P.near[0], t), C = lerp(P.far[1], P.near[1], t);
    const c = col([L, C]);
    const off = rnd() * 1000;
    const step = Math.max(2, w / 320);
    let d = `M0 ${h} `;
    let peak = h;
    for (let x = 0; x <= w + step; x += step) {
      // far ridges get sharper peaks (ridged noise), near ones roll
      const n0 = fbm(noise, x * freq + off, i * 3.7, 6, 2, 0.5);
      const ridged = 1 - Math.abs(n0 * 2 - 1);
      const sharp = Math.min(1, (1 - t) * 0.8 * rough);
      const n = lerp(n0, ridged * 0.9, sharp);
      const y = base - (n - 0.3) * amp * 2.4;
      peak = Math.min(peak, y);
      d += `L${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    d += `L${w} ${h} Z`;
    // mist gathers in the valleys: each ridge fades toward the sky colour at its foot (not the nearest one)
    const gid = `${id}r${i}`;
    const foot = i === layers - 1 ? c : rgbHex(mixRgb(oklchToRgb(L, C * chroma, hue), oklchToRgb(P.skyLow[0], P.skyLow[1] * chroma, hue), 0.45).map(Math.round));
    defs += `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${peak.toFixed(1)}" x2="0" y2="${Math.min(h, base + amp).toFixed(1)}"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${foot}"/></linearGradient>`;
    body += `<path d="${d}" fill="url(#${gid})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
}

// Cloud sky: procedural clouds on a perspective sky plane, lit from one side.
// Draws onto a canvas (browser canvas or OffscreenCanvas). No images, no network.
function cloudSky(canvas, o = {}) {
  const w = canvas.width, h = canvas.height, seed = o.seed ?? 3;
  const mode = o.mode || 'light';
  const hue = o.hue != null ? o.hue : hexToOklch(o.color || '#5BC8FF')[2];
  const accentHue = o.accent ? hexToOklch(o.accent)[2] : hexToOklch('#FF5B24')[2];
  const cover = o.cover ?? 0.5;           // 0 clear .. 1 overcast
  const scale = o.scale ?? 1;             // bigger = bigger clouds
  const horizon = o.horizon ?? 1.0;       // 1 = horizon at the bottom edge; >1 pushes it below the frame
  const calm = o.calm ?? 0;               // 0..1, thins clouds in the top-left where headlines usually go
  const noise = makeNoise2(seed), noise2 = makeNoise2(seed + 101);
  const P = mode === 'dark'
    ? { top: [0.12, 0.025, hue], mid2: [0.20, 0.045, hue], low: [0.52, 0.14, accentHue], lit: [0.74, 0.16, accentHue], mid: [0.36, 0.08, 20], shade: [0.2, 0.035, hue], up: -1 }
    : { top: [0.68, 0.11, hue], mid2: [0.80, 0.075, hue], low: [0.95, 0.025, hue], lit: [0.995, 0.008, 85], mid: [0.94, 0.02, hue], shade: [0.83, 0.045, hue], up: 1 };
  const top = oklchToRgb(...P.top), mid2 = oklchToRgb(...P.mid2), low = oklchToRgb(...P.low);
  const lit = oklchToRgb(...P.lit), mid = oklchToRgb(...P.mid), shade = oklchToRgb(...P.shade);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h), d = img.data;
  const s = 1.6 / scale;
  const th = lerp(0.62, 0.36, cover);
  for (let y = 0; y < h; y++) {
    const py = y / h;
    const Z = 1 / (horizon - py + 0.1);
    const skyT = Math.min(1, py / horizon);
    // three-stop sky: top, middle, a brighter band at the horizon
    const sky = skyT < 0.6 ? mixRgb(top, mid2, skyT / 0.6) : mixRgb(mid2, low, Math.pow((skyT - 0.6) / 0.4, 1.4));
    for (let x = 0; x < w; x++) {
      const X = (x / w - 0.5) * Z * (w / h);
      const u = X * s, v = Z * s * 1.5;
      const q = fbm(noise2, u * 0.7, v * 0.7, 3);
      const n = fbm(noise, u + q * 0.6, v + q * 0.4, 7, 2.05, 0.52);
      let thx = th;
      if (calm) { const cx = x / w, cy = py; thx += calm * 0.18 * Math.max(0, 1 - Math.hypot(cx * 0.9, cy * 1.6)); }
      let a = Math.min(1, Math.max(0, (n - thx) / 0.09));
      a = a * a * (3 - 2 * a);
      // fade into haze near the horizon
      a *= 1 - Math.min(1, Math.max(0, (py / horizon - 0.78) / 0.22)) * 0.85;
      let col = sky;
      if (a > 0.001) {
        // light from above (day) or from the horizon below (dusk): compare density a little toward the light
        const n2 = fbm(noise, u + q * 0.6 - 0.04, v + q * 0.4 - 0.08 * P.up, 7, 2.05, 0.52);
        let lightT;
        if (P.up > 0) lightT = Math.min(1, Math.max(0, 0.62 + (n - n2) * 10 - (n - thx) * 1.6));
        else {
          // dusk: thin edges and undersides catch the glow from the horizon, thick cores stay dark
          const thin = 1 - Math.min(1, (n - thx) * 7);
          lightT = Math.min(1, Math.max(0, thin * (0.45 + 0.55 * skyT) + (n2 - n) * 8));
        }
        const c = P.up > 0
          ? (lightT > 0.5 ? mixRgb(mid, lit, (lightT - 0.5) * 2) : mixRgb(shade, mid, lightT * 2))
          : mixRgb(shade, lit, Math.pow(lightT, 1.8));
        // clouds pick up the sky colour toward the horizon
        const cc = mixRgb(c, sky, Math.pow(skyT, 2) * 0.35);
        col = mixRgb(sky, cc, a);
      }
      const i = (y * w + x) * 4;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  addGrain(ctx, w, h, o.grain ?? 0.025, seed);
  return canvas;
}

// Impressionist painting: repaints any source picture with layered, curved brush strokes
// (big strokes first, smaller ones only where detail is missing), broken colour and a canvas weave.
// Source can be one of our generated scenes, a game screenshot, or a public-domain photo.
function impressionist(canvas, source, o = {}) {
  const w = canvas.width, h = canvas.height, seed = o.seed ?? 5;
  const rnd = mulberry32(seed);
  const ctx = canvas.getContext('2d');
  const base = Math.max(w, h);
  const brushes = (o.brushes || [1 / 22, 1 / 44, 1 / 88]).map((f) => Math.max(2, f * base));
  const jitter = o.jitter ?? 0.05;           // colour wobble per stroke (broken colour)
  const maxLen = o.strokeLength ?? 11;        // control points per stroke
  const threshold = o.threshold ?? 20;       // how different a spot must be to get more detail
  const palette = (o.palette || []).map((hx) => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  const pStrength = o.paletteStrength ?? 0.25;
  const flow = o.flow ?? 0.6;               // 0 = every stroke on the main angle, 1 = strokes hug every edge
  // source pixels at canvas size
  const src = document.createElement('canvas'); src.width = w; src.height = h;
  const sctx = src.getContext('2d');
  sctx.filter = `blur(${o.soften ?? Math.round(base / 600)}px)`; // drop pixel-level detail a painter would ignore
  sctx.drawImage(source, 0, 0, w, h); sctx.filter = 'none';
  // underpainting: a soft blurred wash so no bare canvas shows between strokes
  const pad = Math.round(brushes[0] * 2);
  ctx.filter = `blur(${Math.round(brushes[0])}px)`; ctx.drawImage(src, -pad, -pad, w + pad * 2, h + pad * 2); ctx.filter = 'none';
  const blurC = document.createElement('canvas'); blurC.width = w; blurC.height = h;
  const bctx = blurC.getContext('2d');
  const snap = (c) => {
    if (!palette.length) return c;
    let best = palette[0], bd = 1e9;
    for (const p of palette) { const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = p; } }
    return mixRgb(c, best, pStrength);
  };
  const trace = (p, ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(p[0][0] + ox, p[0][1] + oy);
    if (p.length === 1) ctx.lineTo(p[0][0] + ox + 0.1, p[0][1] + oy);
    for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0] + ox, p[i][1] + oy, (p[i][0] + p[i + 1][0]) / 2 + ox, (p[i][1] + p[i + 1][1]) / 2 + oy);
    if (p.length > 1) ctx.lineTo(p[p.length - 1][0] + ox, p[p.length - 1][1] + oy);
  };
  brushes.forEach((R, layer) => {
    bctx.filter = `blur(${Math.max(1, R / 2)}px)`;
    bctx.drawImage(src, 0, 0);
    bctx.filter = 'none';
    const B = bctx.getImageData(0, 0, w, h).data;
    const cur = ctx.getImageData(0, 0, w, h).data;
    const px = (D, x, y) => { x = Math.max(0, Math.min(w - 1, x | 0)); y = Math.max(0, Math.min(h - 1, y | 0)); const i = (y * w + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
    const lum = (x, y) => { const c = px(B, x, y); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
    const strokes = [];
    const step = Math.max(2, R * 0.9);
    for (let gy = -step / 2; gy < h + step; gy += step) for (let gx = -step; gx < w + step; gx += step) {
      const x0 = gx + (rnd() - 0.5) * step, y0 = gy + (rnd() - 0.5) * step;
      const want = px(B, x0, y0);
      if (layer > 0) {
        const have = px(cur, x0, y0);
        const err = Math.hypot(want[0] - have[0], want[1] - have[1], want[2] - have[2]);
        if (err < threshold) continue;
      }
      // stroke follows the edges (perpendicular to the brightness gradient)
      const pts = [[x0, y0]];
      const strokeTilt = (rnd() - 0.5) * 0.5;
      let x = x0, y = y0, pdx = 0, pdy = 0;
      for (let k = 1; k < maxLen; k++) {
        // direction: follow edges where there are edges, otherwise sweep along the painting's main angle
        const ga = (o.angle ?? -0.08) + strokeTilt;
        const gdx = Math.cos(ga), gdy = Math.sin(ga);
        const e = Math.max(1, R / 3);
        const gxv = lum(x + e, y) - lum(x - e, y), gyv = lum(x, y + e) - lum(x, y - e);
        const gm = Math.hypot(gxv, gyv);
        let dx = gdx, dy = gdy;
        if (gm > 1.5) {
          let ex = -gyv / gm, ey = gxv / gm;
          if (ex * gdx + ey * gdy < 0) { ex = -ex; ey = -ey; }
          const f = flow * Math.min(1, gm / 12);
          dx = lerp(gdx, ex, f); dy = lerp(gdy, ey, f);
        }
        if (k > 1) { if (dx * pdx + dy * pdy < 0) { dx = -dx; dy = -dy; } dx = 0.5 * dx + 0.5 * pdx; dy = 0.5 * dy + 0.5 * pdy; }
        const mm = Math.hypot(dx, dy) || 1; pdx = dx / mm; pdy = dy / mm;
        x += pdx * R; y += pdy * R;
        const c = px(B, x, y);
        if (k > 2 && Math.hypot(c[0] - want[0], c[1] - want[1], c[2] - want[2]) > threshold * 2.2) break;
        pts.push([x, y]);
      }
      // broken colour: nudge lightness and hue a little per stroke
      const [L, C, H] = hexToOklch(rgbHex(want.map((v) => Math.round(Math.max(0, Math.min(255, v))))));
      const fleck = rnd() < (o.flecks ?? 0.015) ? 150 + rnd() * 60 : 0;   // the odd complementary dab, like Monet
      const fc = fleck ? Math.min(0.05, Math.max(C * 0.5, 0.02)) : C;  // complementary dabs stay muted so they read as light, not confetti
      const col = snap(oklchToRgb(L * (1 + (rnd() - 0.5) * jitter * 2), fc * (1 + (rnd() - 0.3) * jitter * 4), H + fleck + (rnd() - 0.5) * jitter * 220));
      strokes.push({ pts, R: R * (0.75 + rnd() * 0.5), col, L, C, H });
    }
    for (let i = strokes.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [strokes[i], strokes[j]] = [strokes[j], strokes[i]]; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strokes) {
      ctx.globalAlpha = layer === 0 ? 1 : 0.92;
      ctx.strokeStyle = `rgb(${s.col.map(Math.round).join(',')})`;
      ctx.lineWidth = s.R;
      trace(s.pts, 0, 0);
      ctx.stroke();
      // a thin lighter ridge on one side of the stroke reads as paint thickness
      const { L, C, H } = s;
      if (o.impasto !== false && s.R > 9) {
        const hi = oklchToRgb(Math.min(1, L * 1.12 + 0.03), C, H);
        ctx.globalAlpha = 0.35; ctx.strokeStyle = `rgb(${hi.join(',')})`; ctx.lineWidth = Math.max(1, s.R * 0.18);
        trace(s.pts, -s.R * 0.22, -s.R * 0.22);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
  // canvas weave
  const weave = o.weave ?? 0.05;
  if (weave) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const nz = makeNoise2(seed + 7);
    const period = Math.max(3, base / 480);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = (Math.sin(x / period * Math.PI) * Math.sin(y / period * Math.PI)) * 0.5 + (nz(x / 3, y / 3) - 0.5);
      const v = t * weave * 255, i = (y * w + x) * 4;
      d[i] += v; d[i + 1] += v; d[i + 2] += v;
    }
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}


  // ---------- token-aware wrappers ----------
  function cssVar(el, name, fallback) {
    if (typeof getComputedStyle === 'undefined') return fallback;
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }
  function themeOf(el) {
    var base = cssVar(el, '--bg-base', '#0E0D0B');
    return hexToOklch(base.length === 4 ? '#' + base.slice(1).split('').map(function (c) { return c + c; }).join('') : base)[0] > 0.6 ? 'light' : 'dark';
  }
  function opts(el, o) {
    o = Object.assign({}, o || {});
    if (!o.mode) o.mode = themeOf(el);
    if (o.hue == null && !o.color) o.color = cssVar(el, '--sc-hue', '#5BC8FF');
    if (!o.accent) o.accent = cssVar(el, '--bg-ink', '#FF5B24');
    return o;
  }
  function sizeCanvas(c, maxScale) {
    var r = c.getBoundingClientRect(), s = Math.min(maxScale, root.devicePixelRatio || 1);
    c.width = Math.max(2, Math.round(r.width * s)); c.height = Math.max(2, Math.round(r.height * s));
    return c;
  }
  function scene(c, o) {
    cloudSky(c, Object.assign({ cover: 0.45, grain: 0 }, o));
    var im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(landscapeSVG(Object.assign({ layers: 4, horizon: 0.7, ground: 0.95, sunX: 0.32, sunY: 0.56, sunSize: 0.06 }, o, { width: c.width, height: c.height, sky: false })));
    return im.decode().then(function () { c.getContext('2d').drawImage(im, 0, 0); return c; });
  }
  var API = {
    landscapeSVG: landscapeSVG,
    // Inserts an SVG landscape as the first child of a .sc-stage (or any positioned element).
    landscape: function (el, o) {
      o = opts(el, o);
      var r = el.getBoundingClientRect();
      o.width = o.width || Math.round(r.width) || 1600; o.height = o.height || Math.round(r.height) || 900;
      var old = el.querySelector(':scope > svg.sc-bg'); if (old) old.remove();
      el.insertAdjacentHTML('afterbegin', landscapeSVG(o).replace('<svg ', '<svg class="sc-bg" aria-hidden="true" '));
      return el.firstElementChild;
    },
    // Paints clouds onto a canvas. Per-pixel, so it renders at up to 1.5x and the browser scales it (clouds are soft anyway).
    sky: function (c, o) { return cloudSky(sizeCanvas(c, 1.5), opts(c, o)); },
    // Repaints o.source (img, canvas or video frame) as brush strokes. With no source it paints the built-in sky + ridges scene.
    // Returns a Promise because the built-in scene loads an SVG first.
    paint: function (c, o) {
      o = opts(c, o); sizeCanvas(c, 2);
      if (o.source) return Promise.resolve(impressionist(c, o.source, o));
      var src = document.createElement('canvas'); src.width = c.width; src.height = c.height;
      return scene(src, o).then(function () { return impressionist(c, src, o); });
    },
    scene: function (c, o) { return scene(c, opts(c, o)); },
    // low-level, for custom pipelines
    cloudSky: cloudSky, impressionist: impressionist, oklch: oklchToRgb, toOklch: hexToOklch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.AfterstreamScenic = API;
})(typeof window !== 'undefined' ? window : globalThis);
