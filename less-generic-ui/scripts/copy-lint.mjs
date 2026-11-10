#!/usr/bin/env node
// Flags copy that reads as AI-written (see ../references/copy-tells.md). No dependencies, no network.
// Usage: node copy-lint.mjs page.html [more files...]   Exit code 1 when anything is flagged.
import { readFileSync } from 'node:fs';

const WORDS = ['delve', 'tapestry', 'testament to', 'realm', 'embark', 'beacon', 'multifaceted', 'paradigm', 'myriad', 'plethora',
  'meticulous', 'intricate', 'elevate', 'unlock', 'unleash', 'empower', 'harness', 'supercharge', 'seamless', 'effortless',
  'cutting-edge', 'revolutionary', 'transformative', 'holistic', 'next-level', 'world-class', 'best-in-class', 'game-changer',
  'game-changing', 'state-of-the-art', 'bespoke', 'synergy', 'leverage', 'reimagine', 'powerful', 'robust', 'unparalleled'];
const PHRASES = ["in today's fast-paced world", 'unlock the power of', 'is here', 'say goodbye to', "whether you're", 'join thousands of',
  'trusted by teams', 'ready to transform', 'look no further', 'made simple', 'at your fingertips', 'in just a few clicks',
  "it's not just", 'serves as', 'stands as', 'plays a key role', 'landscape', 'ecosystem', 'where .{2,30} meets'];
const RESIDUE = ['lorem ipsum', 'john doe', 'jane smith', '[company name]', 'certainly!', '99.99%'];

const toText = (html) => html
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ');

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node copy-lint.mjs page.html [...]'); process.exit(2); }
let hits = 0;
for (const f of files) {
  const text = toText(readFileSync(f, 'utf8'));
  const low = text.toLowerCase();
  const report = (kind, what) => {
    const i = low.search(new RegExp(what, 'i'));
    const ctx = text.slice(Math.max(0, i - 40), i + 60).trim();
    console.log(`${f}  ${kind}  "${what}"  ...${ctx}...`);
    hits++;
  };
  for (const w of WORDS) if (new RegExp(`\\b${w.replace(/[-]/g, '[- ]')}\\b`, 'i').test(low)) report('word', w);
  for (const p of PHRASES) if (new RegExp(p, 'i').test(low)) report('phrase', p);
  for (const r of RESIDUE) if (low.includes(r)) report('placeholder', r.replace(/[[\]!.%]/g, (c) => '\\' + c));
  const dashes = (text.match(/—/g) || []).length;
  if (dashes > 2) { console.log(`${f}  punctuation  ${dashes} em dashes (use commas or periods)`); hits++; }
  const bangs = (text.match(/[a-z]!(\s|$)/gi) || []).length;
  if (bangs > 1) { console.log(`${f}  punctuation  ${bangs} exclamation marks`); hits++; }
}
console.log(hits ? `\n${hits} thing(s) to rewrite. Replace each with the fact it stands in for.` : 'Copy is clean.');
process.exit(hits ? 1 : 0);
