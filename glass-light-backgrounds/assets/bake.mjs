// Bake an effect to a PNG for places WebGL and CSS can't run: emails, video frames, thumbnails, OG images.
// Usage: node bake.mjs <effect> <width> <height> <dark|light> <out.png> [--time=9] [--photo=URL] [--base=#26241F]
//   effect: fluted | lens | iridescent | thermal | ripples | photo
//   --time picks the moment of the animation (seconds). Same time = same image, so bakes are repeatable.
//   --base sets the background color (--bg-base), so the bake blends into the card or email it sits on.
// Needs Playwright (npm i -D playwright). Renders at 2x. Uses the software GPU so it works on servers.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [effect, w = '1200', h = '630', theme = 'dark', out = `${effect}.png`] = args.filter(a => !a.startsWith('--'));
const known = ['fluted', 'lens', 'iridescent', 'thermal', 'ripples', 'photo'];
if (!known.includes(effect)) { console.error('usage: node bake.mjs <' + known.join('|') + '> <w> <h> <dark|light> <out.png> [--time=9] [--photo=URL] [--base=#hex]'); process.exit(1); }
const css = readFileSync(join(here, 'glass.css'), 'utf8');
const js = readFileSync(join(here, 'glass.js'), 'utf8');
const base = (flags.base || '').replace(/[^#a-zA-Z0-9(),.% -]/g, '');
const photo = (flags.photo || '').replace(/['"()]/g, '');
const layer = effect === 'photo'
  ? `<div class="gp-stage gl-photo" id="s" style="--gl-photo:url('${photo}')"></div>`
  : `<div class="gp-stage" id="s"><canvas class="gp-bg" id="c"></canvas></div>`;
const html = `<!doctype html><html data-theme="${theme}"><head><style>${css}
  html,body{margin:0} .gp-stage{width:${w}px;height:${h}px}${base ? `:root,[data-theme]{--bg-base:${base}}` : ''}</style></head>
  <body>${layer}<script>${js}</script><script>
  var c = document.getElementById('c');
  if (c) AfterstreamGlass.mount(c, '${effect}', { fixedTime: ${parseFloat(flags.time || '9')}, maxDpr: 2 });
  </script></body></html>`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.setContent(html, { waitUntil: 'load' });
if (effect === 'photo') await page.waitForLoadState('networkidle');
await page.waitForTimeout(400);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
await page.locator('#s').screenshot({ path: out });
await browser.close();
console.log('wrote ' + out);
