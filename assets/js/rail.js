/* The glimpse rail on the front page.
 *
 * Cards are static HTML now, so there is nothing to render — this only wires
 * the arrows. They page the rail by one card and grey out at either end so the
 * control never lies about there being more to see.
 */
(function () {
  'use strict';

  var rail = document.getElementById('glimpse-rail');
  if (!rail) return;

  var btns = document.querySelectorAll('.rail-btn');
  if (!btns.length) return;

  // Matches the `gap` on .rail in style.css. Read it rather than hardcoding 18,
  // so the two can't drift apart.
  function gap() {
    var g = parseFloat(window.getComputedStyle(rail).columnGap);
    return isNaN(g) ? 18 : g;
  }

  function step() {
    var card = rail.querySelector('.rail-card');
    return card ? card.offsetWidth + gap() : rail.clientWidth * 0.8;
  }

  function sync() {
    var max = rail.scrollWidth - rail.clientWidth - 2;
    Array.prototype.forEach.call(btns, function (b) {
      var back = b.getAttribute('data-dir') === '-1';
      b.disabled = back ? rail.scrollLeft <= 2 : rail.scrollLeft >= max;
    });
  }

  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function () {
      rail.scrollBy({
        left: step() * Number(b.getAttribute('data-dir')),
        behavior: 'smooth'
      });
    });
  });

  rail.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
