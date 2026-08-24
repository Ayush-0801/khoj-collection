/* The catalogue: per-card photo galleries, line filters, and the inline
 * detail panels.
 *
 * Every product, price, dimension and spec is real HTML in catalogue.html —
 * this file renders nothing. With JS off you get the whole catalogue with
 * every panel open and the first photo of each card showing, which is also
 * what a crawler sees. All this does is collapse the panels, wire the chips,
 * and page the galleries.
 */
(function () {
  'use strict';

  var root = document.getElementById('catalogue');
  if (!root) return;

  /* One grid per line, each inside its own .cat-block section. Cards are
     collected across all of them; anything that has to stay within one grid
     (which row a card sits in) checks parentNode rather than assuming there
     is only the one. */
  var grids = Array.prototype.slice.call(root.querySelectorAll('[data-cat-grid]'));
  var blocks = Array.prototype.slice.call(root.querySelectorAll('[data-cat-block]'));
  if (!grids.length) return;

  var CATS = [
    ['sabai',  'Sabai grass'],
    ['dohar',  'Dohars'],
    ['runner', 'Table runners'],
    ['potli',  'Potlis'],
    ['saree',  'Sarees']
  ];

  var ANIM = 300;   // keep in step with the .card-panel transition in style.css
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cards = Array.prototype.slice.call(root.querySelectorAll('.card'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('.card-panel'));
  var open = null;

  /* Panels ship expanded and gallery controls ship hidden, so the no-JS page
     is complete and honest. This attribute is what flips both in CSS. */
  grids.forEach(function (g) { g.setAttribute('data-enhanced', ''); });
  panels.forEach(function (p) { p.hidden = true; });

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

  /* ── panels ─────────────────────────────────────────────────────────── */

  function panelFor(card) {
    return document.getElementById('panel-' + card.id);
  }

  function trigger(card) {
    return card.querySelector('.card-open');
  }

  /* A full-width panel dropped straight after its card would leave a hole in
     the row it interrupts. Move it past the last card sharing that row's top
     edge instead, so the grid closes up behind it. */
  function place(card, panel) {
    var row = cards.filter(function (c) {
      return !c.hidden && c.parentNode === card.parentNode &&
             c.offsetTop === card.offsetTop;
    });
    var last = row.length ? row[row.length - 1] : card;
    if (last.nextElementSibling !== panel) {
      last.parentNode.insertBefore(panel, last.nextElementSibling);
    }
  }

  function label(card, isOpen) {
    var btn = trigger(card);
    if (!btn) return;
    var txt = btn.querySelector('.card-open-text');
    if (txt) txt.textContent = isOpen ? 'Hide details' : 'More details';
  }

  function close(card, instant) {
    var panel = panelFor(card);
    if (!panel || panel.hidden) return;

    trigger(card).setAttribute('aria-expanded', 'false');
    label(card, false);
    card.classList.remove('is-open');
    panel.classList.remove('is-open');
    open = null;

    if (instant || still) {
      panel.hidden = true;
    } else {
      window.setTimeout(function () {
        if (!panel.classList.contains('is-open')) panel.hidden = true;
      }, ANIM);
    }
  }

  function show(card) {
    var panel = panelFor(card);
    if (!panel) return;

    if (open && open !== card) close(open, true);

    place(card, panel);
    panel.hidden = false;
    trigger(card).setAttribute('aria-expanded', 'true');
    label(card, true);
    card.classList.add('is-open');
    open = card;

    if (still) {
      panel.classList.add('is-open');
    } else {
      // Two frames: one for the unhide to take effect, one for the transition
      // to have a start value to animate from.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          panel.classList.add('is-open');
        });
      });
    }

    var head = panel.querySelector('h3, h4');
    if (head) {
      head.setAttribute('tabindex', '-1');
      head.focus({ preventScroll: true });
    }
  }

  function toggle(card) {
    if (open === card) close(card);
    else show(card);
  }

  cards.forEach(function (card) {
    var btn = trigger(card);
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    label(card, false);
    btn.addEventListener('click', function () { toggle(card); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) {
      var card = open;
      close(card);
      trigger(card).focus();
    }
  });

  /* Row breaks move when the window does, so an open panel can end up in the
     wrong place. Put it back. */
  var resizing;
  window.addEventListener('resize', function () {
    if (!open) return;
    window.clearTimeout(resizing);
    resizing = window.setTimeout(function () {
      if (open) place(open, panelFor(open));
    }, 120);
  });

  panels.forEach(function (panel) {
    var x = panel.querySelector('.panel-close');
    if (!x) return;
    x.addEventListener('click', function () {
      var card = document.getElementById(panel.id.replace(/^panel-/, ''));
      if (card) { close(card); trigger(card).focus(); }
    });
  });

  /* ── panel galleries ────────────────────────────────────────────────── */

  panels.forEach(function (panel) {
    var main = panel.querySelector('.gallery-main img');
    var thumbs = panel.querySelectorAll('.gallery-thumb');
    if (!main || !thumbs.length) return;

    Array.prototype.forEach.call(thumbs, function (t) {
      t.addEventListener('click', function () {
        var img = t.querySelector('img');
        main.src = img.getAttribute('data-full') || img.src;
        main.alt = img.alt;
        main.removeAttribute('srcset');
        Array.prototype.forEach.call(thumbs, function (o) {
          o.setAttribute('aria-current', o === t ? 'true' : 'false');
        });
      });
    });
  });

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
    if (open) close(open, true);

    var shown = 0;
    cards.forEach(function (c) {
      var hit = !active.length || on(c.getAttribute('data-cat'));
      c.hidden = !hit;
      var panel = panelFor(c);
      if (panel && !hit) panel.hidden = true;
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

  function openFromHash() {
    var id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    var card = document.getElementById(id);
    if (!card || !card.classList.contains('card')) return;
    if (card.hidden) { active = []; apply(true); }
    show(card);
    card.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
  }

  var start = new URL(window.location.href).searchParams.get('cat');
  if (start) {
    active = start.split(',').filter(present);
  }
  apply(true);

  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* ── PDF export ─────────────────────────────────────────────────────── */

  /* No library and no build step: the print stylesheet lays the catalogue out
     as a document and the browser's own "Save as PDF" writes the file. That
     also means the export follows the filters, since a filtered-out card is
     hidden in print too.
     Panels are collapsed by JS, so open every one for the duration of the
     print and put them back afterwards — print CSS alone cannot undo the
     inline `hidden` this file sets. */
  var exporter = document.getElementById('export-pdf');
  if (exporter) {
    var restore = null;

    function expandAll() {
      // window.print() fires beforeprint, so this runs twice per button
      // press. Without the guard the second pass would record an empty
      // restore list and the panels would never collapse again.
      if (restore) return;
      if (open) close(open, true);
      restore = panels.filter(function (p) { return p.hidden; });
      restore.forEach(function (p) { p.hidden = false; });
      document.body.classList.add('is-printing');
    }

    function collapseAll() {
      if (!restore) return;
      restore.forEach(function (p) { p.hidden = true; });
      restore = null;
      document.body.classList.remove('is-printing');
    }

    /* Safari and Firefox fire these around window.print() too, so hooking
       them covers Ctrl-P as well as the button. */
    window.addEventListener('beforeprint', expandAll);
    window.addEventListener('afterprint', collapseAll);

    exporter.addEventListener('click', function () {
      expandAll();
      window.print();
      // afterprint is unreliable in a few browsers; this is the safety net.
      window.setTimeout(collapseAll, 1000);
    });
  }
})();
