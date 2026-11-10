// Bake a background to a PNG for places CSS and JS can't run: emails, video frames, thumbnails, OG images.
// Usage: node bake.mjs <style> <width> <height> <dark|light> <out.png> [--transparent]
//   style: blueprint | dots | contour | halftone | dither | mosaic | ascii
// Needs Playwright (npm i -D playwright). Renders at 2x for crisp output.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const [style, w = '1200', h = '630', theme = 'dark', out = `${style}.png`, flag] = process.argv.slice(2);
if (!style) { console.error('usage: node bake.mjs <style> <w> <h> <dark|light> <out.png> [--transparent]'); process.exit(1); }
const transparent = flag === '--transparent';
const css = readFileSync(join(here, 'patterns.css'), 'utf8');
const js = readFileSync(join(here, 'backgrounds.js'), 'utf8');
const layer = {
  blueprint: '<div class="gp-bg gp-blueprint"></div>',
  dots: '<div class="gp-bg gp-dots"></div>',
  contour: '',
  halftone: '<canvas class="gp-bg" id="c"></canvas>',
  dither: '<canvas class="gp-bg gp-pixelated" id="c"></canvas>',
  mosaic: '<canvas class="gp-bg gp-pixelated" id="c"></canvas>',
  ascii: '<canvas class="gp-bg" id="c"></canvas>',
}[style];
if (layer === undefined) { console.error('unknown style ' + style); process.exit(1); }
const html = `<!doctype html><html data-theme="${theme}"><head><style>${css}
  html,body{margin:0} .gp-stage{width:${w}px;height:${h}px} ${transparent ? '.gp-stage{background:transparent}' : ''}</style></head>
  <body><div class="gp-stage" id="s">${layer}</div><script>${js}</script><script>
  var B = AfterstreamBG, c = document.getElementById('c'), s = document.getElementById('s');
  if ('${style}' === 'contour') s.insertAdjacentHTML('afterbegin', B.contourSVG({ width: ${w}, height: ${h} }));
  if (c) B['${style}'](c, {});
  </script></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForTimeout(200);
await page.locator('#s').screenshot({ path: out, omitBackground: transparent });
await browser.close();
console.log('wrote ' + out);
