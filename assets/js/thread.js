/* The thread.
 *
 * One continuous cord: it is the ink of the signature while the name is being
 * written, and it keeps going where the pen lifted. Everything here works in
 * "world" units - the coordinate space of the ink image - and a camera in
 * main.js decides how much of that world the viewport shows.
 */
(function (global) {
  'use strict';

  var PATH = global.KHOJ_PATH;

  /* ---- geometry --------------------------------------------------------- */

  // The circle's tail lifts heading down and to the right. These waypoints
  // leave on exactly that heading and ease the descent off until the cord is
  // running level, where the wave takes over. Both halves are smoothed as one
  // curve below, so there is no join to see.
  var LEAD = [
    [269, 753], [310, 780], [355, 800], [405, 816], [460, 832],
    [515, 850], [570, 868], [625, 884], [665, 894]
  ];
  var WAVE_X0 = 700;
  var WAVE_X1 = 6000;
  var WAVE_Y = 900;
  var WAVE_LEN = 620;      // world units per full wave
  var WAVE_AMP = 96;
  var WAY_STEP = 78;       // spacing of the waypoints sampled off the wave
  var RES = 7;             // world units between finished points

  function catmullRom(way, step) {
    var out = [];
    for (var i = 0; i < way.length - 1; i++) {
      var p0 = way[Math.max(0, i - 1)], p1 = way[i];
      var p2 = way[i + 1], p3 = way[Math.min(way.length - 1, i + 2)];
      var n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push(way[way.length - 1].slice());
    return out;
  }

  function buildTrail() {
    // One waypoint list - the lead out of the tail, then the wave - run
    // through a single spline. Sampling the wave as waypoints rather than
    // splicing a formula onto the end is what keeps the curve unbroken.
    var way = LEAD.slice();
    for (var x = WAVE_X0; x <= WAVE_X1; x += WAY_STEP) {
      var s = (x - WAVE_X0) / WAVE_LEN;
      var open = Math.min(1, s / 1.2);     // the wave opens up gradually
      way.push([x, WAVE_Y + Math.sin(s * Math.PI * 2) * WAVE_AMP * open]);
    }

    var pts = catmullRom(way, RES);

    // Arc length, measured once on the resting curve. Everything that needs
    // a position along the thread uses these, never the live displaced
    // points - otherwise the twist crawls about as the wave moves.
    var len = [0];
    for (var i = 1; i < pts.length; i++) {
      len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    return { pts: pts, len: len, total: len[len.length - 1] };
  }

  /* The thread as it stands right now: the resting curve up to `progress`,
   * with a slow wave running along it. The wave damps to nothing, so the cord
   * ends up exactly on its resting path - which is what makes the handover to
   * the page invisible. */
  function trailPoints(trail, progress, wave, time) {
    var upto = trail.total * progress;
    var pts = [], len = [];
    for (var i = 0; i < trail.pts.length; i++) {
      if (trail.len[i] > upto) break;
      len.push(trail.len[i]);
      var p = trail.pts[i];
      if (wave <= 0.001) { pts.push(p); continue; }
      var j = Math.min(trail.pts.length - 1, i + 1);
      var k = Math.max(0, i - 1);
      var tx = trail.pts[j][0] - trail.pts[k][0];
      var ty = trail.pts[j][1] - trail.pts[k][1];
      var m = Math.hypot(tx, ty) || 1;
      // Anchored where the pen lifted: the wave has to die away to nothing at
      // the root, or the cord tears off the signature.
      var hold = Math.min(1, trail.len[i] / 300);
      var d = Math.sin(trail.len[i] / 260 - time * 1.6) * 22 * wave * hold;
      pts.push([p[0] - (ty / m) * d, p[1] + (tx / m) * d]);
    }
    // A single point is deliberately left as-is rather than padded into a
    // two-point path: a tween that has only just begun leaves a value like
    // 1e-16 behind, and padding would stamp a full-width round cap on the
    // tail tip before any thread exists.
    return { pts: pts, len: len };
  }

  /* ---- drawing ---------------------------------------------------------- */

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }

  function strokeCord(ctx, pts, style, width) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    trace(ctx, pts);
    ctx.stroke();
  }

  /* Short strands laid at an angle across the line of travel. This is the
   * whole trick behind reading as spun yarn rather than as a drawn curve.
   * They are placed by arc length along the resting curve, so each strand
   * stays on its own bit of thread instead of shimmering. */
  function fibers(ctx, pts, len, width, alpha) {
    // Pitch and weight are matched to the strands the pen lays into the
    // signature, so the twist carries across the join unchanged.
    var TWIST = 0.95;
    var spacing = width * 0.44;
    var L = width * 1.15;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.6, width * 0.36);
    var next = 0;
    for (var i = 1; i < pts.length; i++) {
      if (len[i] < next) continue;
      next += spacing;
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      var a = Math.atan2(dy, dx) + TWIST;
      var cx = Math.cos(a) * L * 0.5, cy = Math.sin(a) * L * 0.5;
      ctx.strokeStyle = (Math.round(len[i] / spacing) % 2)
        ? 'rgba(255,214,203,' + (0.28 * alpha).toFixed(3) + ')'
        : 'rgba(108,17,21,' + (0.26 * alpha).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(pts[i][0] - cx, pts[i][1] - cy);
      ctx.lineTo(pts[i][0] + cx, pts[i][1] + cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* The cord itself: a shaded body, a lit edge, then the twist. */
  function drawCord(ctx, tp, width, alpha) {
    var pts = tp.pts, len = tp.len;
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Concentric passes stand in for a cross-section: dark at the silhouette,
    // lifting towards the crown. Without this the cord reads as a flat ribbon
    // once the camera is in close.
    strokeCord(ctx, pts, '#8e2325', width * 1.06);
    strokeCord(ctx, pts, PATH.ink, width * 0.86);
    strokeCord(ctx, pts, '#dd5b57', width * 0.46);

    // Highlight riding along the upper side of the cord.
    ctx.strokeStyle = 'rgba(255,214,198,0.42)';
    ctx.lineWidth = width * 0.22;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var j = Math.min(pts.length - 1, i + 1), k = Math.max(0, i - 1);
      var tx = pts[j][0] - pts[k][0], ty = pts[j][1] - pts[k][1];
      var m = Math.hypot(tx, ty) || 1;
      var x = pts[i][0] + (ty / m) * width * 0.24;
      var y = pts[i][1] - (tx / m) * width * 0.24;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    fibers(ctx, pts, len, width, alpha);
    ctx.restore();
  }

  global.KhojThread = {
    build: buildTrail,
    points: trailPoints,
    draw: drawCord
  };
})(window);
