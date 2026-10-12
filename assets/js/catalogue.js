/* The catalogue: per-card photo galleries and the line filters.
 *
 * Every product, price, dimension and spec is real HTML in catalogue.html —
 * this file renders nothing. With JS off you get the whole catalogue with the
 * first photo of each card showing, which is also what a crawler sees. All
 * this does is wire the chips and page the galleries.
 */
(function () {
  'use strict';

  var root = document.getElementById('catalogue');
  if (!root) return;

  /* One grid per line, each inside its own .cat-block section. */
  var grids = Array.prototype.slice.call(root.querySelectorAll('[data-cat-grid]'));
  var blocks = Array.prototype.slice.call(root.querySelectorAll('[data-cat-block]'));
  if (!grids.length) return;

  var CATS = [
    ['pattachitra', 'Pattachitra'],
    ['sabai',  'Sabai grass'],
    ['dohar',  'Dohars'],
    ['runner', 'Table runners'],
    ['potli',  'Potlis'],
    ['saree',  'Sarees']
  ];

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cards = Array.prototype.slice.call(root.querySelectorAll('.card'));

  /* Gallery controls ship hidden so the no-JS page is complete and honest.
     This attribute is what reveals them in CSS. */
  grids.forEach(function (g) { g.setAttribute('data-enhanced', ''); });

  /* ── per-card photo galleries ───────────────────────────────────────── */

  function gallery(card) {
    var box = card.querySelector('.card-gallery');
    if (!box) return;

    var shots = Array.prototype.slice.call(box.querySelectorAll('.card-frames img'));
    var dots = Array.prototype.slice.call(box.querySelectorAll('.shot-dot'));
    var navs = Array.prototype.slice.call(box.querySelectorAll('.shot-nav'));
    if (shots.length < 2) return;

    var at = 0;

    function go(n) {
      at = (n + shots.length) % shots.length;
      shots.forEach(function (s, i) { s.classList.toggle('is-on', i === at); });
      dots.forEach(function (d, i) {
        d.setAttribute('aria-current', i === at ? 'true' : 'false');
      });
    }

    navs.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        go(at + Number(b.getAttribute('data-dir')));
      });
    });

    dots.forEach(function (d, i) {
      d.addEventListener('click', function (e) {
        e.stopPropagation();
        go(i);
      });
    });

    /* Arrow keys page the gallery once it has focus, but only then — otherwise
       they would fight the page scroll. */
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
    });
  }

  cards.forEach(gallery);

  /* ── filters ────────────────────────────────────────────────────────── */

  /* Toggles, not radio buttons: any number of lines can be on at once, and an
     empty set means everything rather than nothing. */
  var bar = document.getElementById('filters');
  var count = document.getElementById('filter-count');
  var active = [];

  function on(cat) { return active.indexOf(cat) !== -1; }

  function present(cat) {
    return cards.some(function (c) { return c.getAttribute('data-cat') === cat; });
  }

  function apply(keepHash) {
    var shown = 0;
    cards.forEach(function (c) {
      var hit = !active.length || on(c.getAttribute('data-cat'));
      c.hidden = !hit;
      if (hit) shown++;
    });

    /* A section heading with nothing under it reads as an empty line rather
       than a filtered-out one, so hide the whole block. */
    blocks.forEach(function (b) {
      var cat = b.getAttribute('data-cat-block');
      b.hidden = !!active.length && !on(cat);
    });

    if (bar) {
      Array.prototype.forEach.call(bar.querySelectorAll('.chip'), function (chip) {
        var cat = chip.getAttribute('data-cat');
        var pressed = cat === 'all' ? !active.length : on(cat);
        chip.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      });
    }

    if (count) {
      count.textContent = shown === cards.length
        ? shown + ' pieces'
        : shown + (shown === 1 ? ' piece' : ' pieces') + ' of ' + cards.length;
    }

    var url = new URL(window.location.href);
    if (active.length) url.searchParams.set('cat', active.join(','));
    else url.searchParams.delete('cat');
    if (!keepHash) url.hash = '';
    window.history.replaceState(null, '', url);
  }

  if (bar) {
    var chips = [['all', 'All lines']].concat(
      CATS.filter(function (c) { return present(c[0]); }));

    chips.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('data-cat', c[0]);
      b.setAttribute('aria-pressed', c[0] === 'all' ? 'true' : 'false');
      b.textContent = c[1];
      b.addEventListener('click', function () {
        if (c[0] === 'all') {
          active = [];
        } else if (on(c[0])) {
          active = active.filter(function (x) { return x !== c[0]; });
        } else {
          active = active.concat([c[0]]);
        }
        apply(false);
      });
      bar.appendChild(b);
    });

    bar.hidden = false;
  }

  /* ── deep links ─────────────────────────────────────────────────────── */

  /* #product-id scrolls to that card, clearing the filters first if the card
     it names is currently filtered out. */
  function goToHash() {
    var id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    var card = document.getElementById(id);
    if (!card || !card.classList.contains('card')) return;
    if (card.hidden) { active = []; apply(true); }
    card.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  }

  var start = new URL(window.location.href).searchParams.get('cat');
  if (start) {
    active = start.split(',').filter(present);
  }
  apply(true);

  goToHash();
  window.addEventListener('hashchange', goToHash);

  /* ── PDF export ─────────────────────────────────────────────────────── */

  /* No library and no build step: the print stylesheet lays the catalogue out
     as a document and the browser's own "Save as PDF" writes the file. That
     also means the export follows the filters, since a filtered-out card is
     hidden in print too.

     Every product photo is loading="lazy", and the ones below the fold have
     never been fetched when the button is pressed — print them as they are
     and those cards come out as empty frames. So flip the whole set to eager
     and wait for the network before handing over to the browser. */
  function loadAllShots() {
    var shots = Array.prototype.slice.call(
      root.querySelectorAll('.card-frames img'));

    shots.forEach(function (img) { img.loading = 'eager'; });

    return Promise.all(shots.map(function (img) {
      if (img.complete && img.naturalWidth) return null;
      return new Promise(function (done) {
        // resolve on error too: one missing file must not block the export
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }));
  }

  var exporter = document.getElementById('export-pdf');
  if (exporter) {
    /* Ctrl-P gets the same treatment, minus the wait — beforeprint cannot be
       held open, so this is only a best effort for the keyboard route. */
    window.addEventListener('beforeprint', loadAllShots);

    exporter.addEventListener('click', function () {
      var label = exporter.textContent;
      exporter.disabled = true;
      exporter.textContent = 'Preparing the photographs…';

      loadAllShots().then(function () {
        exporter.disabled = false;
        exporter.textContent = label;
        window.print();
      });
    });
  }
})();
