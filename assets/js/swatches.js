/* Catalogue cards.
 *
 * Each swatch is woven on a 2D canvas with the same grammar the loader's
 * shader uses - plain-weave interlacing, a chequer field, bandha diamonds
 * and a temple border - so the whole site is cut from one cloth.
 */
(function () {
  'use strict';

  var WEAVES = [
    {
      name: 'Sambalpuri Bandha',
      place: 'Bargarh · Sonepur',
      note: 'Double ikat. Warp and weft both tied, so the motif has to meet itself on the loom.',
      price: '₹ 9,400',
      pal: { body: '#7a1f24', ink: '#4a1013', ecru: '#e8d9bf', gold: '#d99b3c', border: '#26324f' },
      motif: 'diamond'
    },
    {
      name: 'Pasapalli',
      place: 'Bargarh',
      note: 'Named for pasa, the dice game — a chessboard worked in fine bandha squares.',
      price: '₹ 11,200',
      pal: { body: '#1d1d1f', ink: '#000000', ecru: '#efe6d4', gold: '#c9a227', border: '#7a1f24' },
      motif: 'check'
    },
    {
      name: 'Khandua Silk',
      place: 'Nuapatna · Cuttack',
      note: 'The temple cloth. Verses and lotus borders, dyed in the old maroon.',
      price: '₹ 18,600',
      pal: { body: '#8d2f16', ink: '#5a1a0c', ecru: '#f2e2c2', gold: '#e0b355', border: '#3d2a12' },
      motif: 'lotus'
    },
    {
      name: 'Kotpad Tussar',
      place: 'Koraput',
      note: 'Dyed only with aal root and iron. No two lengths take the colour the same way.',
      price: '₹ 7,300',
      pal: { body: '#8a4a2e', ink: '#5c2f1c', ecru: '#e9dcc0', gold: '#b9793f', border: '#2f1d13' },
      motif: 'stripe'
    },
    {
      name: 'Bomkai',
      place: 'Ganjam · Subarnapur',
      note: 'Ikat body, discontinuous extra-weft border. The threadwork sits proud of the cloth.',
      price: '₹ 13,900',
      pal: { body: '#123a33', ink: '#0a221e', ecru: '#ecdcbb', gold: '#d9a441', border: '#7a1f24' },
      motif: 'diamond'
    },
    {
      name: 'Habaspuri',
      place: 'Kalahandi',
      note: 'Kandha motifs — temple, fish, flower — in a cotton once nearly lost entirely.',
      price: '₹ 6,800',
      pal: { body: '#2b2f56', ink: '#171a33', ecru: '#eadfc6', gold: '#cfa03c', border: '#8d2f16' },
      motif: 'temple'
    }
  ];

  function hash(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function weave(canvas, pal, motif) {
    var w = canvas.width, h = canvas.height;
    var img = canvas.getContext('2d').createImageData(w, h);
    var d = img.data;

    var BODY = rgb(pal.body), INK = rgb(pal.ink), ECRU = rgb(pal.ecru);
    var GOLD = rgb(pal.gold), BORDER = rgb(pal.border);
    var WARP = 78, WEFT = Math.round(78 * h / w);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var fx = (x / w) * WARP, fy = (y / h) * WEFT;
        var ix = Math.floor(fx), iy = Math.floor(fy);
        var px = fx - ix, py = fy - iy;

        // Ikat feathering: the dye edge strays a thread either way.
        var u = x / w + (hash(ix * 1.7) - 0.5) * 0.016;
        var v = y / h + (hash(iy * 2.3 + 11) - 0.5) * 0.020;

        var c = BODY;
        var gx = u * 7, gy = v * 7;
        var chk = (Math.floor(gx) + Math.floor(gy)) % 2;

        if (motif === 'check') {
          c = chk ? ECRU : INK;
        } else if (motif === 'stripe') {
          c = mix(BODY, ECRU, Math.floor(v * 16) % 4 === 0 ? 0.75 : 0);
          c = mix(c, GOLD, Math.floor(v * 16) % 8 === 4 ? 0.5 : 0);
        } else {
          if (chk) c = mix(c, INK, 0.35);
          var fxx = gx - Math.floor(gx) - 0.5, fyy = gy - Math.floor(gy) - 0.5;
          var dia = Math.abs(fxx) + Math.abs(fyy);
          if (motif === 'lotus') dia = Math.hypot(fxx, fyy) * 1.25;
          if (dia < 0.34) c = ECRU;
          if (dia < 0.15) c = GOLD;
          if (motif === 'temple' && dia < 0.26 && dia > 0.20) c = INK;
        }

        // Lengthwise border with kumbha teeth.
        var side = Math.min(u, 1 - u) / 0.13;
        var teeth = Math.abs((v * 11) % 1 - 0.5) * 2;
        if (side < 0.7 || side < 0.7 + (1 - teeth) * 0.6) {
          c = BORDER;
          if (Math.abs(side - 0.78) < 0.06) c = GOLD;
        }
        if (Math.min(u, 1 - u) < 0.012) c = GOLD;

        // Plain weave: alternate which thread rides over the crossing.
        var warpOver = (ix + iy) % 2 === 0;
        var pTop = warpOver ? px : py;
        var dd = Math.abs(pTop * 2 - 1);
        var prof = Math.sqrt(Math.max(0, 1 - dd * dd));
        var yarn = warpOver ? 0.88 + hash(ix * 3.1) * 0.16 : 1.0 + hash(iy * 7.7) * 0.12;
        var shade = (0.52 + 0.62 * prof) * yarn;

        var i = (y * w + x) * 4;
        d[i] = Math.min(255, c[0] * shade);
        d[i + 1] = Math.min(255, c[1] * shade);
        d[i + 2] = Math.min(255, c[2] * shade);
        d[i + 3] = 255;
      }
    }
    canvas.getContext('2d').putImageData(img, 0, 0);
  }

  var grid = document.getElementById('weave-grid');
  if (!grid) return;

  WEAVES.forEach(function (wv) {
    var card = document.createElement('article');
    card.className = 'card';
    card.innerHTML =
      '<div class="card-swatch"><canvas width="300" height="380"></canvas></div>' +
      '<div class="card-body">' +
      '<h3>' + wv.name + '</h3>' +
      '<p class="card-place">' + wv.place + '</p>' +
      '<p class="card-note">' + wv.note + '</p>' +
      '<p class="card-foot"><b>' + wv.price + '</b><span>Handwoven · 5.5 m</span></p>' +
      '</div>';
    grid.appendChild(card);
    weave(card.querySelector('canvas'), wv.pal, wv.motif);
  });
})();
