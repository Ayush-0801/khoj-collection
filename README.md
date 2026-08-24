# Khoj Collection

A static site for Khoj Collection — a social enterprise working with women
artisans in Odisha. Sabai grass craft designed with a self-help group in
Balasore, and handloom dohars, table runners, potlis and Sambalpuri sarees
curated from the clusters.

Two pages. No build step. Plain HTML, one stylesheet, three small scripts.

## Running it

```sh
python3 -m http.server 8000
```

Every path in the pages is **relative** — `assets/css/style.css`, not
`/assets/css/style.css` — and cross-page links carry the `.html` extension. That
is what lets the same files serve correctly from a domain root and from the
GitHub Pages subpath `/khoj-collection/` without a rewrite. Keep it that way: a
leading slash anywhere would break the Pages deploy.

To rehearse the subpath locally, serve the directory from a parent named
`khoj-collection` and open `http://localhost:8000/khoj-collection/`.

## Layout

```
index.html      hero · founder's quote · catalogue glimpse · stories ·
                business model · contact (the footer)
catalogue.html  every product, filter toggles, expandable detail panels

assets/css/style.css      one file, sectioned by comment rule
assets/js/catalogue.js    card galleries, filters, panels (catalogue only)
assets/js/rail.js         glimpse rail arrows (front page only)

assets/img/products/<category>/<slug>/    hero, hero@2x and three details
assets/img/people/ · stories/             placeholders; real photographs pending
assets/docs/                              trade lookbook

_source/        raw photos, specs, mails and image prompts.
                Gitignored — never committed, never deployed.

.github/workflows/pages.yml   builds and publishes the GitHub Pages deploy
.nojekyll                     serve files verbatim, no Jekyll processing
vercel.json · .vercelignore   retained so Vercel stays deployable
```

## How the catalogue works

**All product content is real HTML in `catalogue.html`.** Nothing is rendered
from JavaScript. Each product is an `<article class="card">` carrying `data-cat`
and `data-price`, immediately followed by its `<div class="card-panel">`.

Each card holds **four photographs stacked in `.card-frames`**, with arrows and
dots to page them; price, size and unit sit on the card face in `.card-meta`;
and a `More details` button opens the panel with materials, care, lead time and
the enquiry link.

`catalogue.js` renders nothing — it collapses the panels, builds the filter
chips, and pages the galleries. **With JavaScript off you get the whole
catalogue with every panel open and the first photo of each card showing**,
which is also what a crawler sees. That is deliberate: the site's main
distribution is a link pasted into an outreach mail, so the content has to be
in the HTML.

Three things to know before editing:

- Panels ship **without** `hidden`, and gallery arrows/dots ship hidden.
  `catalogue.js` sets `data-enhanced` on the grid, and that attribute is what
  flips both in CSS. Adding `hidden` to a panel in source would break the no-JS
  baseline.
- Exactly one `.card-frames img` carries `class="is-on"` in source. Without JS
  that is the photo you see; with JS it moves.
- A full-width panel dropped straight after its card would leave a hole in the
  row it interrupts, so `place()` moves it past the last card sharing that row.

**Filters are toggles, not radio buttons.** Any number of lines can be on at
once, an empty selection means everything, and the state syncs to
`?cat=sabai,potli` so a filtered view can be mailed to a buyer.

## Adding a product

1. Add images to `assets/img/products/<category>/<slug>/` — see
   `_source/prompts/house-style.md` for the shoot spec and sizes.
2. Copy an existing `<article class="card">` + `<div class="card-panel">` pair.
   The card `id`, the panel's `panel-<id>`, the trigger's `aria-controls` and
   the image folder must all agree.
3. `data-cat` must be one of `sabai`, `dohar`, `runner`, `potli`, `saree`. Chips
   build themselves from whichever categories are actually present.

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
- Catalogue products are **placeholders**. Real names, prices and dimensions go
  in `_source/specs/products.md`, then into `catalogue.html`.
- Product images are **generated placeholders** ("image pending" is printed on
  each). Story and people photographs likewise.
- Artisan photographs need **consent** before publishing — the Balasore women
  are identifiable individuals.
- Canonical and OG tags name the **github.io** origin, not `khojcollection.in`.
  See "Moving to khojcollection.in" below for the switch.

## Deploying

### GitHub Pages (primary)

Live at **https://ayush-0801.github.io/khoj-collection/**.

`.github/workflows/pages.yml` publishes on every push to `main`, and can be run
by hand from the Actions tab. There is no build step; the workflow only stages
the files that should be public and hands them to `deploy-pages`.

One-time setup: **Settings → Pages → Source → GitHub Actions**. Without that the
workflow will fail at the `configure-pages` step.

The staging step is the Pages equivalent of `.vercelignore`, because
`upload-pages-artifact` accepts a single path and no exclude list. It withholds
`Logo.png` (379 KB of source artwork, unused by the site), `README.md` (this
file, which lists unverified copy and outstanding consents), `_source/`,
`.claude/` and the Vercel config. **Anything not excluded there is publicly
fetchable**, whether or not a page links to it — so add a new exclude when you
add anything private to the repo.

Two things Pages cannot do that Vercel did:

- **No custom headers.** The cache and security headers in `vercel.json`
  (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, the
  `Cache-Control` rules) are silently dropped. Pages sets its own caching and
  offers no way to override it. This capability is simply lost on Pages; the
  only fix is a CDN in front, or moving back to a host that supports headers.
- **No clean URLs.** `vercel.json` sets `cleanUrls`, so Vercel serves
  `/catalogue`; Pages does not, and serves only `/catalogue.html`. The pages
  already link to `catalogue.html`, so nothing breaks — but the catalogue's
  canonical and `og:url` now end in `.html`, and any `/catalogue` link already
  pasted into an outreach mail will 404 on Pages.

### Vercel (still available)

`vercel.json` and `.vercelignore` are retained, so the site remains deployable
to Vercel unchanged — with the headers and clean URLs that Pages cannot offer.
Note that the canonical, `og:url` and JSON-LD tags now name the github.io
origin, so they would need rewriting before a Vercel deploy is served to the
public.

```sh
npm i -g vercel   # once
vercel            # preview
vercel --prod     # production
```

### Moving to khojcollection.in

The absolute URLs in the two pages currently name the github.io origin. To point
the site at the real domain: add a `CNAME` file containing `khojcollection.in`,
set the domain under Settings → Pages, point DNS at GitHub's apex addresses, and
rewrite the absolute URLs back —

```sh
sed -i '' 's|https://ayush-0801.github.io/khoj-collection/|https://khojcollection.in/|g' index.html catalogue.html
```

The `mailto:` addresses share the domain name but not the `https://` prefix, so
that substitution leaves them alone.
