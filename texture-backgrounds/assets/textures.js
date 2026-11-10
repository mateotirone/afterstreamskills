/* Afterstream texture backgrounds: the two canvas textures (grass, stipple). No dependencies.
 * Both read colors from CSS custom properties on the host element, so the same call works
 * in light and dark. Call them again after a theme change or resize (debounce ~150 ms).
 */
(function (root) {
  'use strict';
  function cssVar(el, name, fallback) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fallback; }
  function rng(seed) { var s = seed || 7; return function () { return (s = (s * 16807) % 2147483647) / 2147483647; }; }

  /* Grass: about 3,000 short tapered blades drawn into a seamless tile, set as the element's
   * repeating background. ~15 ms. opts: size, density, seed, base, light, dark. */
  function grass(el, o) {
    o = o || {};
    var size = o.size || 256, r = rng(o.seed || 5);
    var base = o.base || cssVar(el, '--tx-grass-base', '#1F4A61');
    var light = o.light || cssVar(el, '--tx-grass-light', '#5BC8FF');
    var dark = o.dark || cssVar(el, '--tx-grass-dark', '#0E0D0B');
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var c = cv.getContext('2d'); c.fillStyle = base; c.fillRect(0, 0, size, size);
    var n = Math.round(size * size / 22 * (o.density || 1));
    for (var k = 0; k < n; k++) {
      var x = r() * size, y = r() * size, L = 10 + r() * 14, a = -Math.PI / 2 + (r() - .5) * .7, w = .35 + r() * .55, bend = (r() - .5) * 6;
      c.globalAlpha = .12 + r() * .3; c.fillStyle = r() < .5 ? dark : light;
      var tx = Math.cos(a) * L, ty = Math.sin(a) * L, px = -Math.sin(a) * w, py = Math.cos(a) * w;
      for (var ox = -size; ox <= size; ox += size) for (var oy = -size; oy <= size; oy += size) { // wrap: seamless tile
        var X = x + ox, Y = y + oy; if (X < -25 || X > size + 25 || Y < -25 || Y > size + 25) continue;
        c.beginPath(); c.moveTo(X - px, Y - py); c.quadraticCurveTo(X + tx / 2 + bend, Y + ty / 2, X + tx, Y + ty);
        c.quadraticCurveTo(X + tx / 2 + bend, Y + ty / 2, X + px, Y + py); c.closePath(); c.fill();
      }
    }
    var url = cv.toDataURL('image/png');
    if (el) { el.style.backgroundImage = 'url(' + url + ')'; el.style.backgroundRepeat = 'repeat'; }
    return url;
  }

  /* Stippled gradient: round dots on a jittered grid, switched on by a 4x4 Bayer threshold so the
   * density reads as an even tone. opts: color, angle (degrees, points at the dense side),
   * from/to (density at each end; start below 0 to keep text areas clean), dot, gap, jitter (0 grid .. 1 organic), seed. */
  function stipple(canvas, o) {
    o = o || {};
    var dpr = Math.min(root.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    c.fillStyle = o.color || cssVar(canvas, '--bg-ink', '#FF5B24');
    var B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], r = rng(o.seed || 7);
    var gap = o.gap || 4, dot = o.dot || 1.1, jit = o.jitter == null ? 1 : o.jitter;
    var from = o.from == null ? -.9 : o.from, to = o.to == null ? 1.05 : o.to;
    var a = (o.angle == null ? 45 : o.angle) * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(w * dx) + Math.abs(h * dy);
    for (var j = 0, y = 0; y < h + gap; y += gap, j++) for (var i = 0, x = 0; x < w + gap; x += gap, i++) {
      var t = ((x - w / 2) * dx + (y - h / 2) * dy) / len + .5; t = from + (to - from) * Math.min(1, Math.max(0, t));
      if (t > (B[(j % 4) * 4 + (i % 4)] + r()) / 17) {
        c.beginPath(); c.arc(x + (r() - .5) * gap * jit, y + (r() - .5) * gap * jit, dot, 0, 7); c.fill();
      }
    }
  }
  root.AfterstreamTX = { grass: grass, stipple: stipple };
})(typeof window !== 'undefined' ? window : this);
