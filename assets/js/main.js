(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ------------------------------------------------------------------ i18n */
  var dict = { en: {}, fr: (window.BS_I18N && window.BS_I18N.fr) || {} };
  var textNodes = $$('[data-i18n]');
  var attrNodes = $$('[data-i18n-attr]');

  // English is the HTML itself: capture it once.
  textNodes.forEach(function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in dict.en)) dict.en[k] = el.tagName === 'TITLE' ? el.textContent : el.innerHTML.trim();
  });
  attrNodes.forEach(function (el) {
    parseAttr(el).forEach(function (p) {
      if (!(p.key in dict.en)) dict.en[p.key] = el.getAttribute(p.attr);
    });
  });

  function parseAttr(el) {
    return el.getAttribute('data-i18n-attr').split(';').map(function (pair) {
      var i = pair.indexOf(':');
      return { attr: pair.slice(0, i).trim(), key: pair.slice(i + 1).trim() };
    });
  }

  function setLang(lang) {
    if (!dict[lang]) lang = 'en';
    var t = dict[lang];
    textNodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = t[k] != null ? t[k] : dict.en[k];
      if (el.tagName === 'TITLE') el.textContent = v; else el.innerHTML = v;
    });
    attrNodes.forEach(function (el) {
      parseAttr(el).forEach(function (p) {
        var v = t[p.key] != null ? t[p.key] : dict.en[p.key];
        if (v != null) el.setAttribute(p.attr, v);
      });
    });
    doc.setAttribute('lang', lang);
    doc.setAttribute('data-lang', lang);
    $$('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    doc.classList.remove('i18n-pending');
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-lang');
      store.set('bs-lang', l);
      setLang(l);
    });
  });
  setLang(doc.getAttribute('data-lang') || 'en');

  /* ----------------------------------------------------------------- intro */
  var intro = $('#intro');
  function endIntro() {
    if (!doc.classList.contains('intro-on')) return;
    doc.classList.remove('intro-on');
    doc.classList.add('intro-done');
    try { sessionStorage.setItem('bs-intro', '1'); } catch (e) {}
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    revealHero();
  }

  if (doc.classList.contains('intro-on') && intro) {
    runIntro();
  } else if (intro) {
    intro.parentNode.removeChild(intro);
  }

  /*
   * Inside the shark's mouth, facing the way out (viewBox 1600×1000, centre 800,500).
   * The opening is an ellipse of half-width RX and half-height `ry`; the lips are its
   * upper and lower halves. Closing the mouth = driving `ry` down until the lips are
   * about one front tooth apart, so the two rows of teeth interlock tip past tip.
   *
   * Two rows per jaw: the front row lines the opening; an inner row sits closer to the
   * camera, larger, darker and out of focus. Blur is driven per frame: depth of field
   * at rest, vertical motion blur on the teeth while the jaws snap, and a whole-scene
   * blur proportional to camera speed.
   */
  function runIntro() {
    var NS = 'http://www.w3.org/2000/svg';
    var CX = 800, CY = 500, RX = 900;
    var RY_OPEN = 300, RY_SHUT = 58;
    var T = { fade: 260, snap: 1080, shut: 1260, bim: 1560 };
    var N_UP = 17;

    var byId = function (id) { return document.getElementById(id); };
    var scene = $('.intro__scene', intro);
    var cam = byId('intro-cam'), glow = byId('intro-glow'), dark = byId('intro-dark');
    var fleshUp = byId('intro-flesh-up'), fleshLo = byId('intro-flesh-lo');
    var lipUp = byId('intro-lip-up'), lipLo = byId('intro-lip-lo');
    var blurFrontUp = byId('if-front-up-b'), blurFrontLo = byId('if-front-lo-b');
    var blurInnerUp = byId('if-inner-up-b'), blurInnerLo = byId('if-inner-lo-b');
    var fade = $('.intro__fade', intro);
    var flash = byId('flash');

    // Deterministic irregularity so teeth don't look stamped.
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function jitter(a) { return (rnd() * 2 - 1) * a; }

    var span = RX * 0.86, step = (2 * span) / (N_UP - 1);
    function makeRow(gid, up, n, offset, opts) {
      var g = byId(gid), row = [];
      for (var i = 0; i < n; i++) {
        var p = document.createElementNS(NS, 'path');
        g.appendChild(p);
        row.push({
          x: CX - span + offset + i * step + jitter(step * 0.12),
          h: 1 + jitter(0.16), w: 1 + jitter(0.12), lean: jitter(0.14), up: up, el: p, o: opts
        });
      }
      return row;
    }
    var FRONT = { back: 10, size: 1, inset: 0 };
    var INNER = { back: 0, size: 1.2, inset: 95 };     // pushed toward the screen edge = closer to camera
    var rows = [
      makeRow('intro-teeth-up', true, N_UP, 0, FRONT),
      makeRow('intro-teeth-lo', false, N_UP - 1, step / 2, FRONT),
      makeRow('intro-inner-up', true, N_UP - 2, step * 0.75, INNER),
      makeRow('intro-inner-lo', false, N_UP - 2, step * 0.25, INNER)
    ];

    function shape(x) { var u = (x - CX) / RX; return Math.sqrt(Math.max(0, 1 - u * u)); }
    function lipY(x, ry, up) { return up ? CY - ry * shape(x) : CY + ry * shape(x); }
    function f(n) { return Math.round(n * 10) / 10; }
    function lipPoints(ry, up) {
      var pts = [];
      for (var x = -460; x <= 2060; x += 40) pts.push(f(x) + ',' + f(lipY(x, ry, up)));
      return pts;
    }

    // A shark tooth: narrow blade, convex leading edge, slightly concave trailing edge.
    function tooth(t, ry) {
      var up = t.up, o = t.o, x = t.x, y = lipY(x, ry, up);
      var dy = (lipY(x + 1, ry, up) - lipY(x - 1, ry, up)) / 2;
      var tl = Math.sqrt(1 + dy * dy), tx = 1 / tl, ty = dy / tl;   // tangent
      var nx = -ty, ny = tx;                                         // normal, pointing down
      if (!up) { nx = -nx; ny = -ny; }
      // Inner row sits further from the opening (toward the screen edge).
      x -= nx * o.inset; y -= ny * o.inset;
      var k = shape(t.x);
      var h = (40 + 82 * k) * t.h * o.size;
      var w = Math.min(h * 0.6, step * 0.92 * o.size) * t.w;
      // Lean the blade sideways, toward the mouth corners like real teeth.
      var lx = nx + tx * t.lean * (up ? 1 : -1) + tx * ((t.x - CX) / RX) * 0.25;
      var ly = ny + ty * t.lean * (up ? 1 : -1) + ty * ((t.x - CX) / RX) * 0.25;
      var ll = Math.sqrt(lx * lx + ly * ly); lx /= ll; ly /= ll;
      var bx = x - nx * o.back, by = y - ny * o.back;
      var p1x = bx - tx * w / 2, p1y = by - ty * w / 2;
      var p2x = bx + tx * w / 2, p2y = by + ty * w / 2;
      var tipx = x + lx * h, tipy = y + ly * h;
      var c1x = bx - tx * w * 0.42 + lx * h * 0.62, c1y = by - ty * w * 0.42 + ly * h * 0.62;
      var c2x = bx + tx * w * 0.12 + lx * h * 0.42, c2y = by + ty * w * 0.12 + ly * h * 0.42;
      t.el.setAttribute('d', 'M' + f(p1x) + ' ' + f(p1y) + 'Q' + f(c1x) + ' ' + f(c1y) + ' ' + f(tipx) + ' ' + f(tipy) +
        'Q' + f(c2x) + ' ' + f(c2y) + ' ' + f(p2x) + ' ' + f(p2y) + 'Z');
    }

    function drawMouth(ry) {
      var up = lipPoints(ry, true), lo = lipPoints(ry, false);
      fleshUp.setAttribute('d', 'M-460,-900 L2060,-900 L' + up.slice().reverse().join(' L') + ' Z');
      fleshLo.setAttribute('d', 'M-460,1900 L2060,1900 L' + lo.slice().reverse().join(' L') + ' Z');
      lipUp.setAttribute('d', 'M' + up.join(' L'));
      lipLo.setAttribute('d', 'M' + lo.join(' L'));
      rows.forEach(function (row) { row.forEach(function (t) { tooth(t, ry); }); });
    }

    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var inQuad = function (p) { return p * p; };
    var inCubic = function (p) { return p * p * p; };
    var outQuad = function (p) { return 1 - (1 - p) * (1 - p); };

    function zoomAt(t) {
      return 1 + 0.9 * inQuad(clamp01(t / T.shut)) + 0.25 * outQuad(clamp01((t - T.shut) / (T.bim - T.shut)));
    }
    function ryAt(t) {
      if (t < T.snap) return RY_OPEN + 34 * Math.sin(Math.PI * clamp01(t / T.snap));
      if (t < T.shut) return RY_OPEN + (RY_SHUT - RY_OPEN) * inCubic(clamp01((t - T.snap) / (T.shut - T.snap)));
      var q = (t - T.shut) / 1000;
      return RY_SHUT + 22 * Math.exp(-q * 12) * Math.abs(Math.sin(q * 55));
    }
    function setBlur(el, sx, sy) { el.setAttribute('stdDeviation', f(sx) + ' ' + f(sy)); }

    function frame(t) {
      var zoom = zoomAt(t), ry = ryAt(t);
      var dt = 16;
      var zoomSpeed = Math.abs(zoom - zoomAt(t - dt)) / dt * 1000;   // zoom units / s
      var jawSpeed = Math.abs(ry - ryAt(t - dt)) / dt * 1000;        // svg units / s

      var bobX = 0, bobY = 0, shake = 0;
      if (t < T.snap) {
        bobX = 7 * Math.sin(t / 170);
        bobY = 9 * Math.sin(t / 120);
      } else if (t >= T.shut) {
        shake = 1 - clamp01((t - T.shut) / (T.bim - T.shut));
        bobX = (Math.random() * 2 - 1) * 26 * shake;
        bobY = (Math.random() * 2 - 1) * 26 * shake;
      }

      cam.setAttribute('transform',
        'translate(' + f(CX + bobX) + ' ' + f(CY + bobY) + ') scale(' + zoom.toFixed(4) + ') translate(' + (-CX) + ' ' + (-CY) + ')');
      glow.setAttribute('opacity', (0.35 + 0.65 * clamp01(t / T.snap)).toFixed(3));
      dark.setAttribute('opacity', (0.94 * inQuad(clamp01((t - T.snap) / (T.shut - T.snap)))).toFixed(3));
      fade.style.opacity = String(1 - clamp01(t / T.fade));

      // Depth of field: front row a touch soft, inner row (closer to camera) very soft.
      // Motion blur: teeth smear vertically with jaw speed (the snap reaches ~2000 units/s).
      var smear = Math.min(16, jawSpeed / 140);
      setBlur(blurFrontUp, 0.9, 0.9 + smear);
      setBlur(blurFrontLo, 0.9, 0.9 + smear);
      setBlur(blurInnerUp, 6, 6 + smear * 1.3);
      setBlur(blurInnerLo, 6, 6 + smear * 1.3);
      // Camera blur: from forward speed and from the impact shake.
      var camBlur = Math.min(5, zoomSpeed * 2.2) + shake * 3;
      scene.style.filter = camBlur > 0.15 ? 'blur(' + camBlur.toFixed(2) + 'px)' : 'none';

      drawMouth(ry);
    }

    var t0 = null, done = false, skipped = false;
    function bim() {
      if (done) return;
      done = true;
      flash.classList.add('is-on');
      doc.classList.add('bim');
      endIntro();
      flash.addEventListener('animationend', function () { flash.classList.remove('is-on'); }, { once: true });
      setTimeout(function () { doc.classList.remove('bim'); }, 700);
    }
    function loop(now) {
      if (done) return;
      if (t0 === null) t0 = now;
      var t = now - t0;
      if (skipped || t >= T.bim) return bim();
      frame(t);
      requestAnimationFrame(loop);
    }
    frame(0);
    requestAnimationFrame(loop);

    var skip = function () { skipped = true; bim(); };
    $('.intro__skip', intro).addEventListener('click', function (e) { e.stopPropagation(); skip(); });
    intro.addEventListener('click', skip);
    document.addEventListener('keydown', function onKey(e) {
      if (done) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    });
    // Safety net (e.g. tab opened in background, where rAF is throttled).
    setTimeout(bim, 4000);
  }

  /* ---------------------------------------------------------------- reveal */
  var reveals = $$('.reveal');
  var heroReveals = $$('.hero .reveal');
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;

  function revealHero() {
    heroReveals.forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, 60 + i * 90);
    });
  }

  reveals.forEach(function (el) {
    if (heroReveals.indexOf(el) !== -1) return;
    if (io) io.observe(el); else el.classList.add('is-in');
  });
  // Stagger siblings inside grids for a nicer cascade.
  $$('.features, .hosts, .road').forEach(function (g) {
    $$('.reveal', g).forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; });
  });
  if (!doc.classList.contains('intro-on')) revealHero();

  /* ------------------------------------------------------------------- nav */
  var nav = $('.nav');
  var burger = $('.nav__burger');
  var links = $('#nav-links');
  var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    links.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', function () {
    var open = !links.classList.contains('is-open');
    links.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  // Highlight the section in view.
  if ('IntersectionObserver' in window) {
    var map = {};
    $$('a', links).forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          $$('a', links).forEach(function (x) { x.classList.remove('is-active'); });
          a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ------------------------------------------------------------ term tabs */
  var tabs = $$('.term__tabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(n, true);
      }
    });
  });

  /* ------------------------------------------------------------------ copy */
  var copyBtn = $('.term__copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var pane = $$('.term__pane').filter(function (p) { return !p.hidden; })[0];
      if (!pane) return;
      // Copy commands only: drop comments and the "$ " prompt.
      var text = pane.textContent.split('\n')
        .filter(function (l) { return l.trim() && l.trim().charAt(0) !== '#'; })
        .map(function (l) { return l.replace(/^\$ /, ''); })
        .join('\n');
      var done = function () {
        copyBtn.classList.add('is-done');
        $('use', copyBtn).setAttribute('href', '#i-check');
        setTimeout(function () {
          copyBtn.classList.remove('is-done');
          $('use', copyBtn).setAttribute('href', '#i-copy');
        }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) && done(); });
      } else if (legacyCopy(text)) { done(); }
    });
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
})();
