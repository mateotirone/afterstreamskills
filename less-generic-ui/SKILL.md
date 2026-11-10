---
name: less-generic-ui
description: Design or review a web page so it doesn't look AI-made or templated. Use when building or redesigning a landing page, streamer site, link page, pricing page or app screen, or when someone says a page looks generic. Works in light and dark.
---

# Less generic UI

Pages made by AI tend to look alike: a centered hero, three equal cards, purple gradients, "seamless" in every heading. This skill swaps those defaults for rules that make a page look like someone designed it.

Before starting, read `references/layout.md` and `references/copy-tells.md`.

## 1. Set the three dials

Pick a number from 1 to 10 for each dial, write the three numbers at the top of your plan, and build to them. If the person names a feel ("calm", "packed", "flashy"), move the dials to match.

| Dial | 1 to 3 | 4 to 7 | 8 to 10 |
|---|---|---|---|
| **Layout variety** | Symmetric grid, centered | Split layouts, mixed image ratios, text left over content right | Asymmetric grids (2fr 1fr 1fr), big empty zones |
| **Motion** | Hover and press states only | One entrance on load, small loops, staggered reveals | Scroll scenes and pinned sections |
| **Density** | Lots of air, one thing per screen | Normal app spacing | Tight padding, lines instead of boxes, every number in a mono font |

Good starting points: a **marketing page** at 7, 4, 3. An **app dashboard** at 3, 3, 7. A **streamer link page** at 6, 5, 3.

Whatever the dials say, every layout drops to one column below 768px wide with no sideways scroll.

## 2. Plan the page as screens

Write one line per section: what idea it holds, what the reader sees, and how tall it is in screens. Rules:

- **The hero has the first screen to itself.** The h1 names what's sold and who it's for. Put one hard fact under it, like a number, a time saved or a price.
- **One idea per section.** If a section needs two headings, split it.
- **Show the real thing.** Use the product's own UI built in HTML, real screenshots or real photos. Never stock "people pointing at laptops" or a generic dashboard.
- **Vary the layout between sections.** Copy on the left with UI on the right, then flip it, then go full width. Never the same layout twice in a row.
- **Real logos only.** If you name a platform, show its real mark. Never draw a letter in a circle.

## 3. Build

- **Tokens first.** Put every color in CSS variables on `:root`. Define both themes (light and dark) and follow `prefers-color-scheme` unless the person has picked one. Check both before you call it done.
- **One accent color**, under 80% saturation. No purple-to-blue "AI glow" gradients. No pure `#000`.
- **Type:** one display font with character plus one mono for numbers and labels. Body text stays under 70 characters a line.
- **Cards only when they mean something.** Group with spacing and thin lines first. Never a row of three equal cards for features.
- **Every state:** hover lifts 1 to 2px, buttons press on click, and there are loading, empty and error states.
- **Motion:** animate only `transform` and `opacity`. Respect `prefers-reduced-motion`. No custom cursors, carousels or auto-advancing tabs.

## 4. Write the copy

Write the copy before the layout. Run it against `references/copy-tells.md`, or use the checker:

```bash
node scripts/copy-lint.mjs page.html
```

Every heading has a noun in it. Every button is a verb plus an object ("Start free trial", not "Get started"). Every number on the page is real or clearly labelled as an example.

## 5. Look, fix, repeat

Render the page and screenshot it at 1440 and 390 wide, in light and dark. Check each screenshot for:

- text that's cut off or overlapping
- a section with dead space, or one that spills into the next screen
- contrast in both themes
- anything that still looks like a template

Fix what you find and look again. Do at least three rounds before showing anyone.

## Output

The page or component, then a short report: the dial values, the section plan, and what each look-and-fix round changed.

---
Rules adapted from Taste Skill by Leonxlnx (MIT, see `LICENSE-taste`). Part of the Afterstream skills pack. https://useafterstream.com
