// Bake a background to an image for places CSS and JS can't run: emails, video frames, thumbnails, OG images.
// Usage: node bake.mjs <style> <width> <height> <dark|light> <out.png|.jpg|.webp> [--hue=#5BC8FF] [--seed=7] [--source=photo.jpg] [--svg]
//   style: landscape | sky | paint
//   --source  paint this image instead of the built-in scene (paint only)
//   --svg     landscape only: write the raw SVG (a few KB, scales to any size) instead of a raster
// Needs Playwright (npm i -D playwright) except for --svg. Renders at 1x: these images are soft by nature, so 2x only adds weight.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [style, w = '1600', h = '900', theme = 'dark', out = `${style}.png`] = args.filter(a => !a.startsWith('--'));
if (!['landscape', 'sky', 'paint'].includes(style)) { console.error('usage: node bake.mjs <landscape|sky|paint> <w> <h> <dark|light> <out> [--hue=#hex] [--seed=n] [--source=img] [--svg]'); process.exit(1); }
const o = { width: +w, height: +h, mode: theme, seed: flags.seed ? +flags.seed : undefined, color: flags.hue || undefined };
if (o.color && require('./backgrounds.js').toOklch(o.color)[1] > 0.15) o.chroma = 1.5;  // warm, saturated hues go muddy without a boost

if (style === 'landscape' && flags.svg) {
  writeFileSync(out, require('./backgrounds.js').landscapeSVG(o));
  console.log('wrote ' + out); process.exit(0);
}
const { chromium } = require('playwright');
const js = readFileSync(join(here, 'backgrounds.js'), 'utf8');
const source = flags.source ? 'data:image/' + (extname(flags.source).slice(1).replace('jpg', 'jpeg') || 'png') + ';base64,' + readFileSync(resolve(flags.source)).toString('base64') : null;
const type = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(out).toLowerCase()] || 'image/png';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: js });
const url = await page.evaluate(async ({ style, o, source, type }) => {
  const S = window.AfterstreamScenic, c = document.createElement('canvas');
  c.width = o.width; c.height = o.height;
  for (const k in o) if (o[k] === undefined) delete o[k];
  if (style === 'landscape') {
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(S.landscapeSVG(o));
    await im.decode(); c.getContext('2d').drawImage(im, 0, 0);
  } else if (style === 'sky') S.cloudSky(c, o);
  else {
    let src;
    if (source) { src = new Image(); src.src = source; await src.decode(); }
    else { src = document.createElement('canvas'); src.width = o.width; src.height = o.height; await S.scene(src, o); }
    S.impressionist(c, src, o);
  }
  return c.toDataURL(type, 0.85);
}, { style, o, source, type });
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
console.log('wrote ' + out);
