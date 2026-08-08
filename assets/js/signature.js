/* Khoj signature writer.
 *
 * The logo is not redrawn as vectors - the real ink from Logo.png is uncovered
 * a brush-stamp at a time along the path a pen would take. Every pixel that
 * appears is the artwork itself, so the finished frame is the logo exactly.
 */
(function (global) {
  'use strict';

  var PATH = global.KHOJ_PATH;

  // How far the reveal brush reaches from the pen's centre, in ink-image
  // pixels. Wide enough to clear the thickest stroke, tight enough that it
  // never uncovers the neighbouring letter early.
  var BRUSH = 42;
  var STEP_DOWN = 2.4;   // sample spacing while the pen is on the paper
  var STEP_UP = 26;      // coarser between strokes, so lifts read as quick

  function catmullRom(pts, step) {
    // Smooth the sparse waypoints into an even stream of pen positions.
    if (pts.length < 2) return pts.slice();
    var p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    var out = [];
    for (var i = 1; i < p.length - 2; i++) {
      var p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
      var seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var n = Math.max(2, Math.ceil(seg / step));
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  function buildTimeline() {
    // One flat list of pen samples. `down` marks paper contact; the gaps
    // between strokes are travelled too, just faster and without ink.
    var frames = [];
    for (var s = 0; s < PATH.strokes.length; s++) {
      var pts = catmullRom(PATH.strokes[s], STEP_DOWN);
      if (s > 0) {
        var from = frames[frames.length - 1];
        var to = pts[0];
        var d = Math.hypot(to[0] - from.x, to[1] - from.y);
        var n = Math.max(1, Math.round(d / STEP_UP));
        for (var k = 1; k <= n; k++) {
          frames.push({
            x: from.x + (to[0] - from.x) * (k / n),
            y: from.y + (to[1] - from.y) * (k / n),
            down: false
          });
        }
      }
      for (var i = 0; i < pts.length; i++) {
        frames.push({ x: pts[i][0], y: pts[i][1], down: true });
      }
    }
    return frames;
  }

  function Signature() {
    this.frames = buildTimeline();
    this.drawn = 0;          // how many frames have been stamped
    this.ready = false;
    this.tip = { x: PATH.tip[0], y: PATH.tip[1] };

    this.reveal = document.createElement('canvas');
    this.reveal.width = PATH.width;
    this.reveal.height = PATH.height;
    this.rctx = this.reveal.getContext('2d');
    this.rctx.lineCap = 'round';
    this.rctx.lineJoin = 'round';
    this.rctx.strokeStyle = '#fff';
    this.rctx.fillStyle = '#fff';
    this.rctx.lineWidth = BRUSH * 2;

    // The twist is stamped on its own layer as the pen travels, then clipped
    // to the ink, so the letterforms read as spun yarn and not as flat ink.
    this.fiber = document.createElement('canvas');
    this.fiber.width = PATH.width;
    this.fiber.height = PATH.height;
    this.fctx = this.fiber.getContext('2d');
    this.fctx.lineCap = 'round';
    this.fibreAcc = 0;
    this.fibreN = 0;

    this.layer = document.createElement('canvas');
    this.layer.width = PATH.width;
    this.layer.height = PATH.height;
    this.lctx = this.layer.getContext('2d');

    var self = this;
    this.img = new Image();
    this.img.onload = function () { self.ready = true; };
    this.img.src = 'assets/img/khoj-ink.png';
  }

  /* Advance the reveal to `progress` (0..1) and report where the nib is. */
  Signature.prototype.setProgress = function (progress) {
    var target = Math.round(this.frames.length * Math.min(1, Math.max(0, progress)));

    if (target < this.drawn) {          // scrubbed backwards - start over
      this.rctx.clearRect(0, 0, this.reveal.width, this.reveal.height);
      this.fctx.clearRect(0, 0, this.fiber.width, this.fiber.height);
      this.fibreAcc = 0;
      this.drawn = 0;
    }
    for (var i = this.drawn; i < target; i++) {
      var f = this.frames[i];
      if (!f.down) continue;
      var prev = i > 0 ? this.frames[i - 1] : null;
      if (prev && prev.down) {
        this.rctx.beginPath();
        this.rctx.moveTo(prev.x, prev.y);
        this.rctx.lineTo(f.x, f.y);
        this.rctx.stroke();
        this.spin(prev, f);
      } else {
        this.rctx.beginPath();
        this.rctx.arc(f.x, f.y, BRUSH, 0, Math.PI * 2);
        this.rctx.fill();
      }
    }
    this.drawn = target;

    var idx = Math.min(this.frames.length - 1, Math.max(0, target - 1));
    var nib = this.frames[idx] || { x: this.tip.x, y: this.tip.y, down: false };
    return { x: nib.x, y: nib.y, down: nib.down, done: progress >= 1 };
  };

  /* Lay the twist across the stroke the pen has just made. The strands sit at
   * a fixed angle to the direction of travel, so they turn with the letter. */
  var TWIST = 0.95;
  var FIBRE_GAP = 5.5;
  var FIBRE_LEN = 30;

  Signature.prototype.spin = function (a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    this.fibreAcc += Math.hypot(dx, dy);
    if (this.fibreAcc < FIBRE_GAP) return;
    this.fibreAcc = 0;

    var ang = Math.atan2(dy, dx) + TWIST;
    var cx = Math.cos(ang) * FIBRE_LEN * 0.5;
    var cy = Math.sin(ang) * FIBRE_LEN * 0.5;
    var c = this.fctx;
    // Kept low-contrast on purpose: enough to read as spun fibre at a glance,
    // not so much that the letters turn into barber poles.
    c.lineWidth = 4.5;
    c.strokeStyle = (this.fibreN++ % 2)
      ? 'rgba(255,214,203,0.26)'
      : 'rgba(108,17,21,0.24)';
    c.beginPath();
    c.moveTo(b.x - cx, b.y - cy);
    c.lineTo(b.x + cx, b.y + cy);
    c.stroke();
  };

  /* The revealed ink, as a canvas ready to be blitted. `settle` (0..1) fades
   * in whatever slivers of ink the brush never quite covered. */
  Signature.prototype.render = function (settle) {
    var c = this.lctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.layer.width, this.layer.height);
    if (!this.ready) return this.layer;

    c.drawImage(this.reveal, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.drawImage(this.img, 0, 0);
    c.globalCompositeOperation = 'source-over';

    if (settle > 0) {
      c.globalAlpha = settle;
      c.drawImage(this.img, 0, 0);
      c.globalAlpha = 1;
    }

    // `source-atop` keeps the twist strictly inside the ink that is showing.
    c.globalCompositeOperation = 'source-atop';
    c.drawImage(this.fiber, 0, 0);
    c.globalCompositeOperation = 'source-over';
    return this.layer;
  };

  global.KhojSignature = Signature;
})(window);
