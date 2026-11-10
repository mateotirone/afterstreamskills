// Bake a texture to a PNG for places CSS and JS can't run: emails, video frames, thumbnails, OG images.
// Usage: node bake.mjs <style> <width> <height> <dark|light> <out.png> [--base=#hex]
//   style: felt | speckle | grass | paper | grain | stipple
// Needs Playwright (npm i -D playwright). Renders at 2x for crisp output.
// For video, keep the result static (moving grain wastes bitrate) and check specks are >= 2 px at final size.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [style, w = '1200', h = '630', theme = 'dark', out = `${style}.png`, ...flags] = process.argv.slice(2);
if (!style) { console.error('usage: node bake.mjs <style> <w> <h> <dark|light> <out.png> [--base=#hex]'); process.exit(1); }
const base = (flags.find(f => f.startsWith('--base=')) || '').slice(7);
const css = readFileSync(join(here, 'textures.css'), 'utf8');
const js = readFileSync(join(here, 'textures.js'), 'utf8');
const layer = {
  felt: '<div class="tx-bg tx-felt"></div>', speckle: '<div class="tx-bg tx-speckle"></div>',
  paper: '<div class="tx-bg tx-paper"></div>', grain: '<div class="tx-bg tx-grain"></div>',
  grass: '<div class="tx-bg" id="g"></div>', stipple: '<canvas class="tx-bg" id="c"></canvas>',
}[style];
if (!layer) { console.error('unknown style ' + style); process.exit(1); }
const html = `<!doctype html><html data-theme="${theme}"><head><style>${css}
  html,body{margin:0} .tx-stage{width:${w}px;height:${h}px} ${base ? `.tx-stage{--bg-base:${base}}` : ''}</style></head>
  <body><div class="tx-stage${style === 'grain' ? ' tx-glow' : ''}" id="s">${layer}</div><script>${js}</script><script>
  var g = document.getElementById('g'), c = document.getElementById('c');
  if (g) AfterstreamTX.grass(g); if (c) AfterstreamTX.stipple(c);
  </script></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForTimeout(200);
await page.locator('#s').screenshot({ path: out });
await browser.close();
console.log('wrote ' + out);
