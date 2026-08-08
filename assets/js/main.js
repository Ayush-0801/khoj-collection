/* Khoj Collection - the opening sequence.
 *
 * One thread, four movements, driven by a single anime.js timeline over a
 * plain state object. Nothing animates itself; every frame is drawn from
 * whatever the state happens to say.
 *
 *   1  the name writes itself, in spun yarn rather than ink
 *   2  where the circle's tail lifted, the thread keeps going
 *   3  the camera runs in along the thread and the logo slides out of frame
 *   4  the wave settles and the thread comes to rest as part of the page
 *
 * The last movement is the reason the loader has a cream ground: it is the
 * same cream as the page. When the overlay fades there is nothing to see it
 * go - the thread is simply already there, lying across the hero.
 */
(function () {
  'use strict';

  var PATH = window.KHOJ_PATH;
  var loader = document.getElementById('loader');
  var canvas = document.getElementById('ink');
  var caption = document.getElementById('loader-caption');
  var bar = document.getElementById('loader-bar');
  var skip = document.getElementById('loader-skip');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?intro=off  jump straight to the catalogue (handy when editing content)
  // ?intro=hold hold the sequence still so a frame can be inspected
  var mode = (window.location.search.match(/[?&]intro=(\w+)/) || [])[1];

  var S = {
    write: 0,       // how much of the name is on the paper
    inkSettle: 0,   // the last slivers of ink drying in
    trail: 0,       // how far the thread has run past the tail
    cam: 0,         // 0 on the logo, 0.5 in among the thread, 1 on the page
    wave: 0,        // travelling wave in the cord
    ui: 1           // loader chrome
  };

  var CAPTIONS = [
    [0.00, 'Khoj — to seek'],
    [0.52, 'One thread'],
    [0.84, 'Odisha, thread by thread']
  ];

  var ctx = canvas.getContext('2d');
  var sig = new window.KhojSignature();
  var trail = window.KhojThread.build();
  var W = 0, H = 0, dpr = 1;
  var running = true;

  // World units of cord width, set so the extension leaves the tail at
  // exactly the tail's own thickness. The circle's tail measures 13.2 units
  // across where the pen lifts, and the cord's outermost pass is drawn at
  // 1.06x, so 12.5 puts the two silhouettes on top of each other.
  // (scripts/build_assets.py regenerates the ink if the logo ever changes.)
  var CORD = 12.5;

  // Measured off the canvas rather than the window: once it stops being
  // pinned to the viewport it is laid out inside the document, and on
  // platforms with a classic scrollbar those are not the same width.
  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (!running) draw(performance.now());   // keep the resting frame correct
  }
  window.addEventListener('resize', resize);

  /* ---- camera ----------------------------------------------------------- */

  // Three framings. The last one is a contract with the stylesheet: the wave
  // has to come to rest below the hero copy, across the full width.
  function keyframes() {
    // The signature takes most of a narrow screen and is capped on a wide one.
    var logoFit = Math.min(
      Math.min(W * 0.78, 560) / PATH.width,
      H * 0.74 / PATH.height
    );
    var mid = trail.pts[Math.floor(trail.pts.length * 0.42)];
    // World units across the viewport at rest: fewer on a phone, so the
    // resting wave keeps its scale instead of turning into a hairline.
    var restW = Math.max(1150, Math.min(2100, W * 1.65));
    var restScale = W / restW;
    return [
      { s: logoFit, cx: PATH.width * 0.5, cy: PATH.height * 0.46 },
      { s: logoFit * 2.9, cx: mid[0], cy: mid[1] },
      { s: restScale, cx: 4300, cy: 900 - (0.82 - 0.5) * H / restScale }
    ];
  }

  function camera() {
    var K = keyframes();
    var t = S.cam, a, b, u;
    if (t < 0.5) { a = K[0]; b = K[1]; u = t / 0.5; }
    else { a = K[1]; b = K[2]; u = (t - 0.5) / 0.5; }
    return {
      // Zoom reads evenly only if it is interpolated geometrically.
      s: a.s * Math.pow(b.s / a.s, u),
      cx: a.cx + (b.cx - a.cx) * u,
      cy: a.cy + (b.cy - a.cy) * u
    };
  }

  /* ---- painting --------------------------------------------------------- */

  function draw(now) {
    var t = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var cam = camera();
    var k = dpr * cam.s;
    ctx.setTransform(k, 0, 0, k, dpr * (W / 2 - cam.cx * cam.s), dpr * (H / 2 - cam.cy * cam.s));

    // The thread first, so the signature sits over the join.
    var tp = null;
    if (S.trail > 0) {
      tp = window.KhojThread.points(trail, S.trail, S.wave, t);
      window.KhojThread.draw(ctx, tp, CORD, 1);
    }

    var nib = sig.setProgress(S.write);
    if (S.write > 0) {
      ctx.drawImage(sig.render(S.inkSettle), 0, 0, PATH.width, PATH.height);
    }

    // The nib, lit, while there is still writing to do.
    if (S.write > 0 && S.write < 1) {
      var r = 26 / cam.s;
      var g = ctx.createRadialGradient(nib.x, nib.y, 0, nib.x, nib.y, r);
      g.addColorStop(0, 'rgba(120,22,26,0.55)');
      g.addColorStop(0.4, 'rgba(210,65,66,0.22)');
      g.addColorStop(1, 'rgba(210,65,66,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(nib.x, nib.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // A bead of light at the running end of the thread.
    if (tp && tp.pts.length > 1 && S.trail < 1) {
      var head = tp.pts[tp.pts.length - 1];
      ctx.fillStyle = 'rgba(255,238,226,0.9)';
      ctx.beginPath();
      ctx.arc(head[0], head[1], CORD * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chrome.
    var prog = S.trail > 0 ? 0.52 + S.trail * 0.44 : S.write * 0.5;
    for (var i = CAPTIONS.length - 1; i >= 0; i--) {
      if (prog >= CAPTIONS[i][0]) {
        if (caption.textContent !== CAPTIONS[i][1]) caption.textContent = CAPTIONS[i][1];
        break;
      }
    }
    bar.style.transform = 'scaleX(' + Math.min(1, prog).toFixed(4) + ')';
    loader.style.setProperty('--ui', S.ui.toFixed(3));

    if (running) requestAnimationFrame(draw);
  }

  /* ---- the timeline ----------------------------------------------------- */

  function buildTimeline() {
    var tl = anime.timeline({ autoplay: false, easing: 'linear' });

    // The name is written in one unbroken movement. The pen samples are
    // spaced by distance, so the hand keeps an even pace through the letters
    // and flicks quickly across the two places it genuinely lifts - rather
    // than stopping dead at each one, which is what made it look choppy.
    var WRITE_MS = 2650;
    var at = 260;
    tl.add({ targets: S, write: 1, duration: WRITE_MS, easing: 'easeInOutSine' }, at);
    at += WRITE_MS;
    tl.add({ targets: S, inkSettle: 1, duration: 380, easing: 'easeOutQuad' }, at - 300);

    // The thread picks up the instant the circle closes, at the speed the pen
    // was already travelling - no gap and no easing back in, so the extension
    // reads as the same movement carrying on rather than a new one starting.
    tl.add({ targets: S, trail: 1, duration: 3200, easing: 'easeOutSine' }, at);
    tl.add({ targets: S, wave: 1, duration: 900, easing: 'easeOutSine' }, at + 150);
    tl.add({ targets: S, cam: 1, duration: 3300, easing: 'easeInOutCubic' }, at + 300);
    // The wave has to be gone by the time the cord comes to rest, or the
    // handover to the page would show a jump.
    tl.add({ targets: S, wave: 0, duration: 1300, easing: 'easeInOutSine' }, at + 2300);
    tl.add({ targets: S, ui: 0, duration: 500, easing: 'easeOutQuad' }, at + 2700);
    return tl;
  }

  /* Hand the thread over to the page. The canvas is not redrawn or replaced -
   * it stops where it is and becomes an ordinary element of the hero. */
  function land() {
    running = false;
    canvas.classList.add('is-resting');
    resize();               // re-measure in the new layout, then hold still
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-revealed');
    window.setTimeout(function () { loader.style.display = 'none'; }, 700);
  }

  function start() {
    resize();

    if (mode === 'off' || reduced) {
      S.write = 1; S.inkSettle = 1; S.trail = 1; S.cam = 1; S.wave = 0;
      draw(performance.now());
      land();
      return;
    }

    var tl = buildTimeline();
    window.KHOJ_TIMELINE = tl;   // scrub it by hand alongside ?intro=hold
    window.KHOJ_STATE = S;
    tl.finished.then(land);
    if (mode !== 'hold') tl.play();

    skip.addEventListener('click', function () {
      tl.seek(tl.duration);
      tl.pause();
      land();
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && running) skip.click();
    });

    requestAnimationFrame(draw);
  }

  // Wait for the real ink before starting, so the first stroke is never blank.
  (function whenReady() {
    if (sig.ready) return start();
    window.setTimeout(whenReady, 30);
  })();
})();
