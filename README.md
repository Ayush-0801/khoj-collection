# Khoj Collection

A static site for Khoj Collection — a social enterprise working with women
artisans in Odisha. Sabai grass craft designed with a self-help group in
Balasore, and handloom dohars, table runners, potlis and Sambalpuri sarees
curated from the clusters.

Two pages. No build step. Plain HTML, one stylesheet, two small scripts.

The catalogue carries **21 products in three lines** — 12 sabai grass, 6 table
runners, 3 dohars. Prices are not settled and every card prints `₹ TBD`.

## Running it

```sh
python3 -m http.server 8000
```

`vercel.json` sets `cleanUrls`, so production serves `/catalogue`. `http.server`
does not, so local links use the `.html` extension — which is what the pages
carry. Run `vercel dev` to check production routing.

## Layout

```
index.html      hero · founder's quote · catalogue glimpse · stories ·
                business model · contact (the footer)
catalogue.html  every product in three sections, filter toggles, expandable
                detail panels, and the print/PDF export

assets/css/style.css      one file, sectioned by comment rule
assets/js/catalogue.js    card galleries, filters, panels (catalogue only)
assets/js/rail.js         glimpse rail arrows (front page only)

assets/img/products/<category>/<slug>/    hero, hero@2x, detail-scale
                                          (+ detail-alt on dohars)
assets/img/people/ · stories/             placeholders; real photographs pending
assets/docs/                              trade lookbook

_source/        raw photos, specs, mails and image prompts.
                Gitignored and vercelignored — never deployed.

vercel.json     clean URLs, cache and security headers
.vercelignore   keeps Logo.png and _source/ out of the bundle
```

## How the catalogue works

**All product content is real HTML in `catalogue.html`.** Nothing is rendered
from JavaScript. Each product is an `<article class="card">` carrying `data-cat`
and `data-price`, immediately followed by its `<div class="card-panel">`.

The catalogue is split into **one `.cat-block` section per line** — Sabai
Grass, Table Runners, Dohars — each with its own heading and its own
`.grid[data-cat-grid]`. Cards are identical in structure across all three.

Each card holds **two or three photographs stacked in `.card-frames`**, with
arrows and dots to page them: the hero, the dimension diagram, and for dohars
the original photograph the rest was worked up from. Price, size and unit sit
on the card face in `.card-meta`; a `More details` button opens the panel with
materials, care, lead time and the enquiry link.

`catalogue.js` renders nothing — it collapses the panels, builds the filter
chips, and pages the galleries. **With JavaScript off you get the whole
catalogue with every panel open and the first photo of each card showing**,
which is also what a crawler sees. That is deliberate: the site's main
distribution is a link pasted into an outreach mail, so the content has to be
in the HTML.

Three things to know before editing:

- Panels ship **without** `hidden`, and gallery arrows/dots ship hidden.
  `catalogue.js` sets `data-enhanced` on **each** grid, and that attribute is
  what flips both in CSS. Adding `hidden` to a panel in source would break the
  no-JS baseline.
- Exactly one `.card-frames img` carries `class="is-on"` in source. Without JS
  that is the photo you see; with JS it moves.
- A full-width panel dropped straight after its card would leave a hole in the
  row it interrupts, so `place()` moves it past the last card sharing that row.
  With three grids on the page, "that row" means same `parentNode` **and** same
  `offsetTop` — comparing `offsetTop` alone would match cards in another line.

**Filters are toggles, not radio buttons.** Any number of lines can be on at
once, an empty selection means everything, and the state syncs to
`?cat=sabai,runner` so a filtered view can be mailed to a buyer. A section
whose line is filtered out is hidden whole, heading included.

## Exporting a PDF

The button at the foot of the catalogue calls `window.print()`. There is no
library and no build step: the `@media print` block at the end of `style.css`
is what turns the page into a document — a page break before each line, cards
that will not split across pages, and the hero forced on regardless of which
carousel frame was showing.

Two things make it work that are easy to break:

- **`catalogue.js` unhides every panel before printing and re-collapses after.**
  Print CSS cannot override the inline `hidden` the script sets, so the specs
  would otherwise be missing from the PDF.
- `window.print()` fires `beforeprint`, so the expand runs twice per press. The
  guard in `expandAll()` is what stops the second pass recording an empty
  restore list and leaving every panel stuck open.

The export **follows the filters** — a filtered-out card is hidden in print too,
so a single line can be sent to a buyer without the other two.

## Adding a product

1. Add images to `assets/img/products/<category>/<slug>/` — see
   `_source/prompts/house-style.md` for the shoot spec and sizes.
2. Copy an existing `<article class="card">` + `<div class="card-panel">` pair.
   The card `id`, the panel's `panel-<id>`, the trigger's `aria-controls` and
   the image folder must all agree.
3. `data-cat` must be one of `sabai`, `dohar`, `runner` — and the card must go
   inside the matching `.cat-block`. Chips build themselves from whichever
   categories are actually present, so `potli` and `saree` remain wired in
   `catalogue.js` and will reappear as chips the day a card carries them.

## Known sync points

- **The footer is duplicated across both pages.** With no build step the
  alternative is injecting it with JavaScript, which would hide the phone number
  from crawlers — wrong for a site that trades on being findable. Keep the two
  copies identical.
- `ANIM` in `catalogue.js` must match the `.card-panel` transition duration in
  `style.css`.

## Still to do

- **The founder's quote on the home page is drawn near-verbatim from Malini's
  own outreach mail, but it was assembled by me, not written for the site.**
  She should approve or replace it before this goes live — it is attributed to
  her by name.
- `hello@khojcollection.in` is **unverified**; every `mailto:` points at it.
- **Every price on the catalogue reads `₹ TBD`.** No price list existed, so
  none was invented. This is the one thing blocking the catalogue going live.
- **Product names are descriptive, not trade names** — written from what is
  visible in each photograph. Replace them if real names exist.
- **No card claims a cluster of origin** for the runners and dohars, because
  nothing tied a product to one. The home page still names the clusters.
- Product images are **generated**, and every hero carries a visible
  generative watermark, kept deliberately. The products themselves are real:
  the dimension diagrams are built from photographs, and the three dohars ship
  the original photograph as a third frame. Story and people images are still
  "image pending" placeholders.
- **Potlis and sarees were dropped** — no photographs exist for either line.
  Restore their placeholder images from git history if the lines come back.
- Artisan photographs need **consent** before publishing — the Balasore women
  are identifiable individuals.
- `SITE` is assumed to be `https://khojcollection.in` in canonical and OG tags.

## Deploying

Static, so Vercel serves it as-is: no build command, no output directory.
`vercel.json` sets clean URLs and cache/security headers. `.vercelignore` keeps
`Logo.png` and `_source/` out of the bundle.

```sh
npm i -g vercel   # once
vercel            # preview
vercel --prod     # production
```

`cleanUrls` is why the catalogue's canonical and `og:url` are
`https://khojcollection.in/catalogue` with no `.html`, while the links between
the two pages keep the extension so the site also works over `http.server`.
