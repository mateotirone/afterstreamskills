---
name: glass-light-backgrounds
description: Add glass and light backgrounds (fluted glass, lens distortion, iridescent shapes, thermal gradient, water ripples, blurred photo) to a web page, app, email, thumbnail or video frame, in both light and dark mode. Use when a design looks flat, or someone asks for one of these effects by name.
---

# Glass and light backgrounds

Six backgrounds that make a flat design feel like it has depth and light in it. Five are small WebGL shaders that share one runtime; the blurred photo is plain CSS. Every color comes from CSS tokens, so they work in light and dark mode, and every effect can be baked to a PNG for places that can't run WebGL.

Files in `assets/`:
- `glass.css`: theme tokens, the stage and glass card classes, the blurred photo, and CSS fallbacks for when WebGL is missing.
- `glass.js`: the runtime plus all five shaders. No dependencies, about 15 KB unminified (about 6 KB gzipped). Exposes `window.AfterstreamGlass`.
- `demo.html`: all six side by side with a theme switch. Open it first.
- `bake.mjs`: renders any effect to a PNG with Playwright, for emails, thumbnails, OG images and video frames.

The token names (`--bg-base`, `--bg-ink`) and the `.gp-stage` / `.gp-bg` layer pattern match the other Afterstream background skills, so they can be mixed on one page.

## Pick the right one

| Effect | Built with | GPU cost | Loudness | Best for |
|---|---|---|---|---|
| Thermal gradient | WebGL: warped noise through a color ramp | Light | Medium | Heroes, report headers, anything about "heat" or hype. Can be driven by real data |
| Blurred photo | CSS: the image, blurred and saturated, plus a scrim | Almost none | Quiet | Behind a sharp thumbnail or video. Album-art style detail pages |
| Fluted glass | WebGL: per-flute refraction and lighting | Light | Medium | Sign-in screens, pricing heroes, "starting soon" screens over a webcam |
| Lens distortion | WebGL: barrel magnify + color split at the rim | Light | Loud | "We found it" moments, how-it-works sections, zoom transitions |
| Iridescent shapes | WebGL: soft 3D shapes with thin-film color | Light | Loud | Badges, rewards, premium plan cards, welcome screens |
| Water ripples | WebGL: ring waves that refract and catch light | Medium | Medium | Waiting and loading screens, drop zones, playful empty pages |

Rules of thumb:
- One live effect per screen. A second one doubles GPU work and the two fight for attention.
- Never behind dense data (tables, queues, calendars). Use these for moments, not workspaces.
- Text goes on a `.gl-card` or over the calmest part of the effect. Water ripples and lens distortion are too busy for body text.
- If a still image would look the same, bake it and ship the image. Live only when the motion or pointer adds something.

## How to add one (web)

1. Copy `glass.css` and `glass.js` into the project. Change the token values in `glass.css` to the brand's colors. Keep the light block and the `prefers-color-scheme: light` block identical.
2. Put the canvas first inside a stage, then the content:
   ```html
   <section class="gp-stage">
     <canvas class="gp-bg" id="hero-bg" aria-hidden="true"></canvas>
     <div class="gl-card">...content...</div>
   </section>
   <script src="glass.js"></script>
   <script>
     AfterstreamGlass.mount(document.getElementById('hero-bg'), 'thermal');
     // interactive effects need pointer events on the canvas or a host element:
     AfterstreamGlass.mount(lensCanvas, 'lens', { interactive: true, pointerTarget: lensCanvas.parentElement });
   </script>
   ```
   Effect names: `fluted`, `lens`, `iridescent`, `thermal`, `ripples`. Add `gl-interactive` to the canvas class for `lens` and `ripples` so it receives the pointer.
   Options: `interactive`, `pointerTarget`, `fixedTime` (seconds; freezes the frame), `maxDpr` (default 1.5), `timeOffset`.
3. Blurred photo needs no JS:
   ```html
   <section class="gp-stage gl-photo" style="--gl-photo:url(frame.jpg)">
     <img src="frame.jpg" alt="..."> ...
   </section>
   ```
   For lists of cards, have the server send a tiny (32 to 64 px wide) version of the image as the backdrop. The browser upscales it and the blur hides it, so the backdrop costs about 1 KB.
4. In React or other frameworks, call `mount` in an effect after the canvas is in the DOM and call `destroy()` on unmount. Theme changes are picked up on their own: the runtime watches `data-theme`, `class` and `style` on `<html>` and the system color scheme, and re-reads the tokens.
5. For Remotion, three.js or any other WebGL setup, `AfterstreamGlass.source('thermal')` returns the full fragment shader. Feed it the same uniforms (see the top of `glass.js`).

## How each one works

- **Thermal gradient.** Fractal noise, warped by more noise so the shapes flow, plus a few slow hot spots. The value goes through a six-stop ramp: base, deep, cool, warm, ink (hot), hot. A light isotherm banding (18%) gives the thermal-camera look. To drive it from data, replace the hot spots with your values (for example a stream's chat activity over time) before the ramp.
- **Fluted glass.** The screen is cut into vertical flutes (26 px by default). Each flute samples the scene behind it flipped and squeezed around its own center, which is what real reeded glass does, then adds a highlight on one shoulder and a shadow in the groove. It needs some crisp shapes behind it, or it just looks like stripes, so the built-in scene has a sharp disc, a pill and a thin line over the soft blobs.
- **Lens distortion.** Inside a circle the scene is magnified with a barrel curve (strong in the middle, none at the rim), and red, green and blue are sampled at slightly different scales so color splits toward the edge. A rim light and a soft contact shadow sell the glass. It follows the pointer and drifts when idle.
- **Iridescent shapes.** Shapes are a signed distance field (blobs merged with a smooth minimum, plus a ring). The distance becomes a dome height and the normals come from that height, which avoids creases where shapes merge. Color is a thin-film palette indexed by viewing angle and position, pulled 25% toward the brand's cool and hot colors.
- **Water ripples.** Each drop is an expanding ring wave that fades with age. Four drops loop on their own; clicks add more (the last four are kept). The wave's slope refracts the scene below, shades it, and adds a tight specular highlight.
- **Blurred photo.** The same image as a background layer, oversized by 80 px so the blurred edge never shows, blurred 40 px, saturation boosted (blur greys colors out) and covered with a theme scrim.

### Browser support
All five shaders use WebGL 1, which works in every current browser. If it's missing, `glass.js` adds a `gl-fallback-<effect>` class and `glass.css` paints a CSS gradient instead.
Applying the lens or fluted effect to *live page content behind it* (`backdrop-filter: url(#svg-filter)`) only works in Chromium browsers. Safari and Firefox ignore it or apply only the blur. That's why these effects draw their own scene. If you need real refraction over real UI, treat it as Chrome-only progressive enhancement over a plain `backdrop-filter: blur()`.

## Light and dark

- Every color is a token in `glass.css`. The runtime reads them from the canvas, so you can also override tokens on one section.
- The runtime decides "dark" from the luminance of `--bg-base` and uses it to tune shading: deeper shadows and softer highlights in dark, softer shadows and stronger white highlights in light.
- Light mode needs a darker version of the cool accent for crisp shapes and lines (`--gl-cool-ink`), or they wash out. The thermal hottest point flips too: it glows near-white in dark and burns deep orange in light.
- The blurred photo's scrim must be much stronger in light mode (45 to 80% paper) than in dark (15 to 62% ink). Dark photos under a light scrim look muddy otherwise.
- Check both themes at full size every time.

## Phones

- Effects keep their layout in units of the stage height, so a 16:10 stage looks the same on a phone; anything you lay over it gets relatively bigger. Shrink cards and hide secondary lines below about 520 px.
- Very wide or very tall stages (3:1 banners, 9:16 video) move shapes around. Bake or screenshot at the real size and check where the hot spots and shapes land.
- Pointer effects work with touch: the lens jumps to the finger, a tap drops a ripple.

## Performance and accessibility

- Device pixel ratio is capped at 1.5 (these are soft images, extra pixels add nothing). Each effect is one draw call per frame.
- Rendering pauses when the canvas is off screen or the tab is hidden, and draws a single still frame when `prefers-reduced-motion` is on. Keep that behavior if you change the runtime.
- Water ripples is the heaviest (it evaluates the wave field three times per pixel). On low-end phones prefer a baked still.
- Backgrounds are decoration: keep `aria-hidden` on canvases and `pointer-events: none` unless the effect is interactive.
- Re-check text contrast over the busiest part of the effect, not the calm part.

## Emails, thumbnails and video

Email clients don't run WebGL, and most ignore `backdrop-filter`. Bake an image:
```
node assets/bake.mjs thermal 600 200 dark header-dark.png --time=9
node assets/bake.mjs fluted 600 200 light header-light.png --time=4
node assets/bake.mjs photo 1280 720 dark thumb-bg.png --photo=https://example.com/frame.jpg
```
- The same `--time` gives the same image, so bakes are repeatable. Try a few times and keep the best frame.
- Always set a solid `bgcolor` behind the image so the email still looks right when images are blocked.
- For dark mode email, bake two images and swap them with `@media (prefers-color-scheme: dark)` for the clients that support it.
- For video, either bake frames at the final size, or run the shader inside the video renderer (Remotion renders in Chromium, so `glass.js` works there with `fixedTime` set from the current frame).
- For thumbnails, keep the face and title over the calm area and the loud part of the effect behind empty space.

## Quality check before shipping

Make it, look at it, fix it, at least three times. Each look means screenshots of light, dark, desktop and phone at full size. Check:
- Can every line of text be read without effort over the background?
- Does the effect read as what it is (glass, heat, water) or just as a gradient? If it's just a gradient, it needs more contrast or crisper shapes behind it.
- Is anything loud landing on a button, a face or a headline?
- Does it look intentional in both themes, or just faint or muddy in one?
- Does it still look right at a different width (resize, don't just reload) and with reduced motion on?

---
Part of the Afterstream skills pack. https://useafterstream.com
