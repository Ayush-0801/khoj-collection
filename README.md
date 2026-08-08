# Khoj Collection

A catalogue site for Odisha handlooms, opening on an intro built around a
single thread.

## The intro

Four movements, about seven seconds, driven by one `anime.js` timeline over a
plain state object. Nothing animates itself — every frame is drawn from
whatever the state currently says.

1. **The name writes itself.** Not a redrawn approximation of the logo: the
   real ink of `Logo.png` is uncovered a brush-stamp at a time along the path
   a pen would take, so the finished frame *is* the logo, pixel for pixel. As
   the pen travels it lays short strands at a fixed angle across the direction
   of travel, clipped to the ink, which is what makes the letters read as spun
   yarn rather than flat ink.
2. **The thread keeps going.** The enclosing circle is the last stroke, and
   where it lifts — the tip of its tail at the bottom left — the cord carries
   on, at the tail's own thickness and on the same heading. The tail measures
   13.2 world units across at that point, so `CORD` in `main.js` is 12.5 (the
   outermost pass is drawn at 1.06×). The lead-out and the wave are smoothed
   as a single spline, so there is no join anywhere along it.
3. **The camera runs in along the thread** and the logo slides out of frame.
4. **The wave settles** and the thread comes to rest lying across the hero.

The last movement is why the intro has a cream ground: it is the *same* cream
as the page. When the overlay fades there is nothing to see it go — the thread
is already exactly where it belongs, and the canvas simply stops being pinned
to the viewport and becomes an ordinary element of the hero.

### Flags

- `?intro=off` — skip straight to the catalogue. Useful while editing content.
- `?intro=hold` — hold the sequence still. `window.KHOJ_TIMELINE.seek(ms)`
  scrubs it and `window.KHOJ_STATE` shows what the frame is being drawn from.
- `prefers-reduced-motion: reduce` is honoured: same destination, no motion.

## Regenerating the artwork

`assets/img/khoj-ink.png` and `assets/js/khoj-path.js` are both generated from
`Logo.png`. The ink image is the red lifted onto transparency; the path file is
the stroke order a hand would use, held in `scripts/penpath.py`.

The waypoints have to be checked against the ink, not just eyeballed: the pen
uncovers a 42-unit radius around itself, and anywhere the path cuts a corner
the ink underneath stays blank until the very end. The h is the awkward one —
its ascender runs well below the shoulder and ends in a foot, so the pen goes
up through it from the baseline first. The current path covers 100% of the
ink.

```sh
python3 scripts/build_assets.py     # needs pillow, numpy
```

If the logo is ever redrawn, the waypoints in `scripts/penpath.py` are the only
thing that needs re-authoring.

## Running it

Any static server — the scripts are plain `<script>` tags, no build step.

```sh
python3 -m http.server 8000
```

## Deploying

The site is static, so Vercel serves it as-is: no build command, no output
directory. `vercel.json` sets clean URLs and cache/security headers;
`.vercelignore` keeps the generators and the source `Logo.png` out of the
deployed bundle (only the generated `assets/img/khoj-ink.png` ships).

```sh
npm i -g vercel   # once
vercel            # preview deploy
vercel --prod     # production
```

Or point a Vercel project at the repo — framework preset **Other**, build
command and output directory left empty — and every push deploys.

## Layout

```
index.html
assets/css/style.css
assets/js/khoj-path.js    generated: pen path + the tip the thread leaves from
assets/js/signature.js    uncovers the real ink, and spins the twist into it
assets/js/thread.js       the cord: geometry, taper, shading, fibre
assets/js/main.js         the timeline, the camera, the handover to the page
assets/js/swatches.js     catalogue cards, woven on a 2D canvas
assets/js/vendor/         anime.js
scripts/                  the generators
```

Catalogue swatches are woven procedurally with the same grammar the intro uses
— plain-weave interlacing, a pasapalli chequer, bandha diamonds and kumbha
temple borders — so the whole site is cut from one cloth. Prices and copy are
placeholders.
