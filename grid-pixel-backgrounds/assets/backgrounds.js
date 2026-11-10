/* Afterstream grid + pixel backgrounds. No dependencies.
 * Each painter reads colors from CSS custom properties on the host element,
 * so the same call works in light and dark. Call repaint() after a theme change.
 */
(function (root) {
  'use strict';

  // ---------- small helpers ----------
  function cssVar(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // 2D value noise with smooth interpolation + fractal sum. Cheap and seedable.
  function makeNoise(seed) {
    var rnd = mulberry32(seed || 1), p = new Uint8Array(512), i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 256; i++) p[i + 256] = p[i];
    var g = new Float32Array(256); for (i = 0; i < 256; i++) g[i] = rnd();
    function v(x, y) { return g[p[p[x & 255] + (y & 255)]]; }
    function s(t) { return t * t * (3 - 2 * t); }
    function n2(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      var u = s(xf), w = s(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    }
    return function fbm(x, y, oct) {
      var sum = 0, amp = 0.5, f = 1, norm = 0;
      for (var o = 0; o < (oct || 4); o++) { sum += amp * n2(x * f, y * f); norm += amp; amp *= 0.5; f *= 2; }
      return sum / norm;
    };
  }
  function sizeCanvas(canvas, scale) {
    var r = canvas.getBoundingClientRect();
    var dpr = scale || Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    return { w: canvas.width, h: canvas.height, dpr: dpr, cssW: r.width, cssH: r.height };
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 3. Contour lines (SVG, scales cleanly, can be pre-built) ----------
  // Marching squares over a noise field. Returns an SVG string.
  function contourSVG(opts) {
    var w = opts.width || 1200, h = opts.height || 675, cell = opts.cell || 10;
    var levels = opts.levels || 14, seed = opts.seed || 7, scale = opts.scale || 0.0022;
    var noise = makeNoise(seed), cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
    var f = new Float32Array(cols * rows), x, y;
    for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) f[y * cols + x] = noise(x * cell * scale, y * cell * scale, 4);
    var minor = [], major = [];
    for (var L = 1; L < levels; L++) {
      var t = 0.25 + (L / levels) * 0.5, segs = (L % 4 === 0) ? major : minor;
      for (y = 0; y < rows - 1; y++) for (x = 0; x < cols - 1; x++) {
        var a = f[y * cols + x], b = f[y * cols + x + 1], c = f[(y + 1) * cols + x + 1], d = f[(y + 1) * cols + x];
        var idx = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var X = x * cell, Y = y * cell;
        var top = [X + cell * (t - a) / (b - a), Y], right = [X + cell, Y + cell * (t - b) / (c - b)];
        var bot = [X + cell * (t - d) / (c - d), Y + cell], left = [X, Y + cell * (t - a) / (d - a)];
        var map = { 1: [left, bot], 2: [bot, right], 3: [left, right], 4: [top, right], 5: [left, top, bot, right], 6: [top, bot], 7: [left, top],
          8: [left, top], 9: [top, bot], 10: [left, bot, top, right], 11: [top, right], 12: [left, right], 13: [bot, right], 14: [left, bot] }[idx];
        for (var k = 0; k < map.length; k += 2) segs.push('M' + map[k][0].toFixed(1) + ' ' + map[k][1].toFixed(1) + 'L' + map[k + 1][0].toFixed(1) + ' ' + map[k + 1][1].toFixed(1));
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<path d="' + minor.join('') + '" fill="none" stroke="var(--bg-line)" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + major.join('') + '" fill="none" stroke="var(--bg-line-strong)" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>';
  }

  // ---------- 4. Halftone (canvas; dot size follows a field) ----------
  function halftone(canvas, opts) {
    opts = opts || {};
    var s = sizeCanvas(canvas), ctx = canvas.getContext('2d');
    var ink = cssVar(canvas, '--bg-ink', '#FF5B24'), step = (opts.step || 11) * s.dpr;
    var angle = (opts.angle == null ? 45 : opts.angle) * Math.PI / 180, noise = makeNoise(opts.seed || 3);
    // field: a soft light source in one corner, broken up by noise
    var cx = (opts.cx == null ? 0.82 : opts.cx) * s.w, cy = (opts.cy == null ? 0.2 : opts.cy) * s.h, R = Math.hypot(s.w, s.h) * 0.75;
    ctx.clearRect(0, 0, s.w, s.h); ctx.fillStyle = ink; ctx.globalAlpha = opts.alpha || 0.9;
    var cos = Math.cos(angle), sin = Math.sin(angle), diag = Math.hypot(s.w, s.h);
    for (var v = -diag; v < diag; v += step) for (var u = -diag; u < diag; u += step) {
      var x = s.w / 2 + u * cos - v * sin, y = s.h / 2 + u * sin + v * cos;
      if (x < -step || y < -step || x > s.w + step || y > s.h + step) continue;
      var d = 1 - Math.min(1, Math.hypot(x - cx, y - cy) / R);
      var val = Math.pow(d, 1.6) * 0.85 + (noise(x / s.dpr * 0.004, y / s.dpr * 0.004, 3) - 0.5) * 0.35;
      var r = Math.max(0, Math.min(1, val)) * step * (opts.maxDot || 0.44);
      if (r < 0.35 * s.dpr) continue;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- 5. Dithered image (canvas; ordered Bayer 8x8, two colors) ----------
  var BAYER8 = (function () {
    var m = [[0, 2], [3, 1]];
    for (var n = 2; n < 8; n *= 2) {
      var next = [];
      for (var y = 0; y < n * 2; y++) { next[y] = []; for (var x = 0; x < n * 2; x++) next[y][x] = 4 * m[y % n][x % n] + [0, 2, 3, 1][(y >= n ? 2 : 0) + (x >= n ? 1 : 0)]; }
      m = next;
    }
    return m;
  })();
  // source: an <img>/<canvas> to dither, or omitted for a built-in light field.
  function dither(canvas, opts) {
    opts = opts || {};
    var s = sizeCanvas(canvas, 1), px = opts.pixel || 3;
    var gw = Math.ceil(s.w / px), gh = Math.ceil(s.h / px);
    var lum = new Float32Array(gw * gh), x, y;
    if (opts.source) {
      var tmp = document.createElement('canvas'); tmp.width = gw; tmp.height = gh;
      var tc = tmp.getContext('2d'), src = opts.source;
      var sr = (src.naturalWidth || src.width) / (src.naturalHeight || src.height), dr = gw / gh, sw, sh;
      if (sr > dr) { sh = gh; sw = gh * sr; } else { sw = gw; sh = gw / sr; }
      tc.drawImage(src, (gw - sw) / 2, (gh - sh) / 2, sw, sh);
      var id = tc.getImageData(0, 0, gw, gh).data;
      for (var i = 0; i < gw * gh; i++) lum[i] = (0.2126 * id[i * 4] + 0.7152 * id[i * 4 + 1] + 0.0722 * id[i * 4 + 2]) / 255;
    } else {
      // built-in: a big sun setting on a low horizon, with track lines running to it
      var noise = makeNoise(opts.seed || 11), hz = 0.7, sx = opts.sunX || 0.72, ar = gw / gh;
      for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
        var nx = x / gw, ny = y / gh, v = 0;
        if (ny < hz) {
          var d = Math.hypot((nx - sx) * ar, ny - hz);
          v = d < 0.36 ? 0.55 + (1 - d / 0.36) * 0.45 : Math.max(0, 0.42 - (d - 0.36) * 0.9) * 0.9;   // disc + glow
          if (d < 0.36 && hz - ny < 0.2 && Math.abs(((hz - ny) * 34) % 2.2 - 1.1) < 0.32 * (1 - (hz - ny) / 0.2)) v = 0;   // retro slats, lower half only
        } else {
          var gy = (ny - hz) / (1 - hz), u = (nx - sx) / Math.max(0.02, gy);      // perspective
          var line = Math.abs((u * 3 + 100) % 1 - 0.5) < 0.04 ? 0.55 : 0;
          var rung = Math.abs(((1 / (gy + 0.08)) * 1.6) % 1 - 0.5) < 0.06 ? 0.4 : 0;
          v = Math.max(line, rung) * (0.35 + gy * 0.65) + noise(nx * 8, ny * 8, 2) * 0.06;
        }
        lum[y * gw + x] = Math.min(1, v);
      }
    }
    var fg = hexToRgb(cssVar(canvas, '--bg-ink', '#FF5B24')), bgc = hexToRgb(cssVar(canvas, '--bg-base', '#0E0D0B'));
    var out = document.createElement('canvas'); out.width = gw; out.height = gh;
    var oc = out.getContext('2d'), img = oc.createImageData(gw, gh), dd = img.data, gain = opts.gain || 1;
    for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
      var on = lum[y * gw + x] * gain > (BAYER8[y & 7][x & 7] + 0.5) / 64, k = (y * gw + x) * 4, c = on ? fg : bgc;
      dd[k] = c[0]; dd[k + 1] = c[1]; dd[k + 2] = c[2]; dd[k + 3] = on ? 255 : 0;
    }
    oc.putImageData(img, 0, 0);
    var ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, s.w, s.h); ctx.drawImage(out, 0, 0, gw * px, gh * px);
  }

  // ---------- 6. Pixel mosaic (tiny canvas scaled up with image-rendering: pixelated) ----------
  function mosaic(canvas, opts) {
    opts = opts || {};
    var cell = opts.cell || 22, r = canvas.getBoundingClientRect();
    var gw = Math.ceil(r.width / cell), gh = Math.ceil(r.height / cell);
    canvas.width = gw; canvas.height = gh;   // 1 canvas pixel = 1 tile; CSS scales it
    var ctx = canvas.getContext('2d'), noise = makeNoise(opts.seed || 5), rnd = mulberry32(opts.seed || 5);
    var pal = [cssVar(canvas, '--bg-base', '#0E0D0B'), cssVar(canvas, '--bg-px1', '#1b1a15'), cssVar(canvas, '--bg-px2', '#26241F'),
      cssVar(canvas, '--bg-px3', '#2A5D78'), cssVar(canvas, '--bg-px4', '#5BC8FF')];
    var hot = cssVar(canvas, '--bg-ink', '#FF5B24');
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      // brighter toward the right edge so text on the left stays readable
      var bias = opts.vertical ? Math.pow(y / gh, 1.6) * 0.75 : Math.pow(x / gw, 2) * 0.58;
      var v = Math.pow(Math.max(0, noise(x * 0.14, y * 0.14, 3) * 0.85 + bias - 0.12 + (rnd() - 0.5) * 0.06), 1.2);
      var i = Math.max(0, Math.min(pal.length - 1, Math.floor(v * pal.length)));
      ctx.fillStyle = (i >= 3 && rnd() < 0.025) ? hot : pal[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // ---------- 7. ASCII field (canvas; optional slow drift) ----------
  function ascii(canvas, opts) {
    opts = opts || {};
    var chars = opts.chars || ' .·:-+=*#%', size = opts.size || 12, noise = makeNoise(opts.seed || 9);
    var s, ctx, cols, rows, cw, t0 = performance.now(), raf = 0, visible = true, last = 0;
    function setup() {
      s = sizeCanvas(canvas); ctx = canvas.getContext('2d');
      ctx.font = (size * s.dpr) + 'px ' + cssVar(canvas, '--mono', 'monospace'); ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width; cols = Math.ceil(s.w / cw); rows = Math.ceil(s.h / (size * s.dpr * 1.25));
    }
    function frame(time) {
      var t = (time - t0) / 1000 * (opts.speed || 0.06);
      var dim = cssVar(canvas, '--bg-ascii', 'rgba(244,239,230,.18)'), hot = cssVar(canvas, '--bg-ink', '#FF5B24');
      ctx.clearRect(0, 0, s.w, s.h);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var fx = x / cols, fy = y / rows;
        var v = (noise(x * 0.06 + t, y * 0.1 - t * 0.6, 3) - 0.42) * 2.4 + fx * 0.5 - 0.15;   // denser to the right
        if (v <= 0.05) continue;
        var ci = Math.min(chars.length - 1, Math.floor(Math.min(v, 0.999) * 0.92 * chars.length));
        var sparkle = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        ctx.fillStyle = (v > 0.8 && fx > 0.5 && sparkle % 100 < 14) ? hot : dim;
        ctx.fillText(chars[ci], x * cw, y * size * s.dpr * 1.25);
      }
    }
    function loop(time) {
      raf = requestAnimationFrame(loop);
      if (!visible || time - last < 83) return;  // ~12fps is plenty for a background
      last = time; frame(time);
    }
    setup(); frame(t0);
    if (opts.animate && !reduceMotion) {
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
      document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
      raf = requestAnimationFrame(loop);
    }
    return { repaint: function () { setup(); frame(performance.now()); }, stop: function () { cancelAnimationFrame(raf); } };
  }

  root.AfterstreamBG = { contourSVG: contourSVG, halftone: halftone, dither: dither, mosaic: mosaic, ascii: ascii, makeNoise: makeNoise };
})(window);
