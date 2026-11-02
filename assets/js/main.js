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
   * Inside the shark's mouth, facing the way out. Drawn on a canvas in a virtual
   * 1600×1000 space (centre 800,500), cropped to cover the screen.
   *
   * The opening is an ellipse of half-width RX and half-height `ry`; the lips are its
   * upper and lower halves with an organic wobble. Closing = driving `ry` down until
   * the lips are about one front tooth apart, so the two rows of teeth interlock.
   *
   * Cheap cinematic blur, no filters: the inner (out-of-focus) row is drawn at low
   * resolution and scaled up; teeth motion blur stacks vertically offset copies;
   * camera speed adds a radial zoom trail. Tissue texture and grain are painted once.
   */
  function runIntro() {
    var VW = 1600, VH = 1000, CX = 800, CY = 500, RX = 900;
    var RY_OPEN = 300, RY_SHUT = 58;
    var T = { fade: 260, snap: 1080, shut: 1260, bim: 1560 };
    var N_UP = 17;
    var RES = 0.75;                                   // canvas px per CSS px (soft by design)

    var cvs = $('.intro__scene', intro);
    var ctx = cvs.getContext('2d');
    var grain = $('.intro__grain', intro);
    var fade = $('.intro__fade', intro);
    var flash = document.getElementById('flash');
    if (!ctx) return finishNow();

    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function jitter(a) { return (rnd() * 2 - 1) * a; }
    function layer(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }

    /* ---- One-off textures */
    function fleshTexture() {
      var S = 512, c = layer(S, S), g = c.getContext('2d');
      g.fillStyle = '#081124'; g.fillRect(0, 0, S, S);
      function wrap(draw) { for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) draw(ox, oy); }
      for (var i = 0; i < 240; i++) {
        var x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 70, light = rnd() > 0.45;
        var a = light ? 0.08 + rnd() * 0.16 : 0.12 + rnd() * 0.2;
        wrap(function (ox, oy) {
          var gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, light ? 'rgba(40,74,124,' + a + ')' : 'rgba(0,0,0,' + a + ')');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        });
      }
      for (var k = 0; k < 9; k++) {   // palatal ridges with a faint wet sheen
        var y0 = (k + 0.5) * S / 9 + jitter(12), amp = 6 + rnd() * 12, ph = rnd() * 6.28, fr = 1 + Math.floor(rnd() * 3);
        for (var pass = 0; pass < 2; pass++) {
          g.beginPath();
          for (var xx = -10; xx <= S + 10; xx += 8) {
            var yy = y0 + (pass ? -5 : 0) + amp * Math.sin(2 * Math.PI * fr * xx / S + ph);
            if (xx === -10) g.moveTo(xx, yy); else g.lineTo(xx, yy);
          }
          g.strokeStyle = pass ? 'rgba(110,150,200,.07)' : 'rgba(0,0,0,.3)';
          g.lineWidth = pass ? 2 : 9; g.stroke();
          if (!pass) { g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke(); }
        }
      }
      for (var s = 0; s < 1400; s++) {
        g.fillStyle = 'rgba(160,200,240,' + (0.03 + rnd() * 0.09).toFixed(3) + ')';
        g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 1.5, 1);
      }
      return c;
    }
    function grainTexture() {
      var S = 220, c = layer(S, S), g = c.getContext('2d');
      var img = g.createImageData(S, S), d = img.data;
      for (var p = 0; p < d.length; p += 4) { var v = Math.random() * 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 26; }
      g.putImageData(img, 0, 0);
      return c;
    }
    // The water outside: gradient + god rays, drawn tiny and scaled up (= free blur).
    function outsideTexture() {
      var w = 240, h = 180, c = layer(w, h), g = c.getContext('2d');
      g.scale(w / 2400, h / 1800); g.translate(400, 400);
      var gr = g.createRadialGradient(CX, CY - 40, 0, CX, CY - 40, 1100);
      gr.addColorStop(0, '#16325a'); gr.addColorStop(0.3, '#0c1d3a'); gr.addColorStop(0.65, '#071226'); gr.addColorStop(1, '#04080f');
      g.fillStyle = gr; g.fillRect(-400, -400, 2400, 1800);
      g.fillStyle = 'rgba(160,210,255,.05)';
      [[760, 840, 1050, 900], [700, 740, 640, 520], [860, 900, 1320, 1220], [640, 670, 300, 220]].forEach(function (r) {
        g.beginPath(); g.moveTo(r[0], -200); g.lineTo(r[1], -200); g.lineTo(r[2], 1200); g.lineTo(r[3], 1200); g.fill();
      });
      return c;
    }
    function bokehSprite() {
      var c = layer(64, 64), g = c.getContext('2d');
      var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(170,215,245,.9)'); gr.addColorStop(0.55, 'rgba(170,215,245,.35)'); gr.addColorStop(1, 'rgba(170,215,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return c;
    }
    var texFlesh = fleshTexture(), texOut = outsideTexture(), sprite = bokehSprite();
    grain.style.backgroundImage = 'url(' + grainTexture().toDataURL() + ')';
    var fleshPattern = ctx.createPattern(texFlesh, 'repeat');

    /* ---- Canvas sizing: cover-crop of the 1600×1000 space */
    var W, H, sc, ox, oy, teethL, teethX, innerL, innerX, compL, compX, vignette;
    function resize() {
      var r = intro.getBoundingClientRect();
      W = cvs.width = Math.max(1, Math.round(r.width * RES));
      H = cvs.height = Math.max(1, Math.round(r.height * RES));
      sc = Math.max(W / VW, H / VH); ox = (W - VW * sc) / 2; oy = (H - VH * sc) / 2;
      teethL = layer(W, H); teethX = teethL.getContext('2d');
      innerL = layer(W / 5, H / 5); innerX = innerL.getContext('2d');
      compL = layer(W, H); compX = compL.getContext('2d');
      vignette = layer(W, H);
      var v = vignette.getContext('2d'), R = Math.max(W, H) * 0.75;
      var gr = v.createRadialGradient(W / 2, H / 2, R * 0.45, W / 2, H / 2, R);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)');
      v.fillStyle = gr; v.fillRect(0, 0, W, H);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---- Geometry */
    function shape(x) { var u = (x - CX) / RX; return Math.sqrt(Math.max(0, 1 - u * u)); }
    function wobble(x, up) {
      var p = up ? 0 : 2.1;
      return 7 * Math.sin(x * 0.011 + 1.3 + p) + 4 * Math.sin(x * 0.029 + 0.4 + p) + 1.8 * Math.sin(x * 0.083 + p);
    }
    function lipY(x, ry, up) {
      var k = shape(x), w = wobble(x, up) * (0.4 + 0.6 * k);
      return up ? CY - ry * k + w : CY + ry * k + w;
    }

    var span = RX * 0.86, step = (2 * span) / (N_UP - 1);
    function makeRow(up, n, offset, opts) {
      var row = [];
      for (var i = 0; i < n; i++) {
        var chipped = rnd() < 0.12, t = {
          x: CX - span + offset + i * step + jitter(step * 0.14),
          h: (1 + jitter(0.18)) * (chipped ? 0.72 : 1), w: 1 + jitter(0.14), lean: jitter(0.16),
          op: 0.7 + rnd() * 0.3, hl: 0.08 + rnd() * 0.1, serr: [], up: up, o: opts
        };
        for (var s = 0; s < 22; s++) t.serr.push(jitter(1));
        row.push(t);
      }
      return row;
    }
    var FRONT = { back: 10, size: 1, inset: 0, dark: false };
    var INNER = { back: 0, size: 1.2, inset: 95, dark: true };
    var front = makeRow(true, N_UP, 0, FRONT).concat(makeRow(false, N_UP - 1, step / 2, FRONT));
    var inner = makeRow(true, N_UP - 2, step * 0.75, INNER).concat(makeRow(false, N_UP - 2, step * 0.25, INNER));

    function qpt(ax, ay, bx, by, cx, cy, u) {
      var v = 1 - u;
      return [v * v * ax + 2 * v * u * bx + u * u * cx, v * v * ay + 2 * v * u * by + u * u * cy];
    }
    // Shark tooth: narrow blade, convex leading edge, slightly concave trailing edge,
    // finely serrated, with an enamel highlight on the leading edge.
    function drawTooth(g, t, ry) {
      var up = t.up, o = t.o, x = t.x, y = lipY(x, ry, up);
      var dy = (lipY(x + 1, ry, up) - lipY(x - 1, ry, up)) / 2;
      var tl = Math.sqrt(1 + dy * dy), tx = 1 / tl, ty = dy / tl;
      var nx = -ty, ny = tx;
      if (!up) { nx = -nx; ny = -ny; }
      x -= nx * o.inset; y -= ny * o.inset;
      var k = shape(t.x);
      var h = (40 + 82 * k) * t.h * o.size;
      var w = Math.min(h * 0.6, step * 0.92 * o.size) * t.w;
      var lx = nx + tx * t.lean * (up ? 1 : -1) + tx * ((t.x - CX) / RX) * 0.25;
      var ly = ny + ty * t.lean * (up ? 1 : -1) + ty * ((t.x - CX) / RX) * 0.25;
      var ll = Math.sqrt(lx * lx + ly * ly); lx /= ll; ly /= ll;
      var bx = x - nx * o.back, by = y - ny * o.back;
      var p1x = bx - tx * w / 2, p1y = by - ty * w / 2, p2x = bx + tx * w / 2, p2y = by + ty * w / 2;
      var tipx = x + lx * h, tipy = y + ly * h;
      var c1x = bx - tx * w * 0.42 + lx * h * 0.62, c1y = by - ty * w * 0.42 + ly * h * 0.62;
      var c2x = bx + tx * w * 0.12 + lx * h * 0.42, c2y = by + ty * w * 0.12 + ly * h * 0.42;
      var N = 10, serr = Math.max(0.35, h * 0.0045), i, q, s;

      var gr = g.createLinearGradient(bx, by, tipx, tipy);
      if (o.dark) { gr.addColorStop(0, '#05090f'); gr.addColorStop(0.6, '#1f2c3d'); gr.addColorStop(1, '#3e5066'); }
      else { gr.addColorStop(0, '#0e141d'); gr.addColorStop(0.35, '#3a4757'); gr.addColorStop(0.8, '#76869a'); gr.addColorStop(1, '#9aabbd'); }
      g.globalAlpha = t.op;
      g.fillStyle = gr;
      g.beginPath();
      for (i = 0; i <= N; i++) {
        q = qpt(p1x, p1y, c1x, c1y, tipx, tipy, i / N);
        s = (i > 0 && i < N) ? ((i % 2 ? 1 : -1) * serr + t.serr[i] * serr) : 0;
        if (i === 0) g.moveTo(q[0] - tx * s, q[1] - ty * s); else g.lineTo(q[0] - tx * s, q[1] - ty * s);
      }
      for (i = 1; i <= N; i++) {
        q = qpt(tipx, tipy, c2x, c2y, p2x, p2y, i / N);
        s = (i < N) ? ((i % 2 ? 1 : -1) * serr + t.serr[N + i] * serr) : 0;
        g.lineTo(q[0] + tx * s, q[1] + ty * s);
      }
      g.closePath(); g.fill();
      if (!o.dark) {
        g.globalAlpha = t.hl; g.fillStyle = '#dce9f6';
        g.beginPath();
        var back = [];
        for (i = 2; i <= 8; i++) {
          q = qpt(p1x, p1y, c1x, c1y, tipx, tipy, i / N);
          if (i === 2) g.moveTo(q[0] + tx * w * 0.05, q[1] + ty * w * 0.05); else g.lineTo(q[0] + tx * w * 0.05, q[1] + ty * w * 0.05);
          back.push([q[0] + tx * w * (0.16 - i * 0.012), q[1] + ty * w * (0.16 - i * 0.012)]);
        }
        for (i = back.length - 1; i >= 0; i--) g.lineTo(back[i][0], back[i][1]);
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    }

    function lipPath(g, ry, up, outer) {
      g.beginPath();
      g.moveTo(-460, lipY(-460, ry, up));
      for (var x = -440; x <= 2060; x += 20) g.lineTo(x, lipY(x, ry, up));
      if (outer) { g.lineTo(2060, up ? -900 : 1900); g.lineTo(-460, up ? -900 : 1900); g.closePath(); }
    }

    /* ---- Particles */
    function makeDust(n, rMin, rMax, oMin, oMax, sx, sy) {
      var list = [];
      for (var i = 0; i < n; i++) list.push({ r: rMin + rnd() * (rMax - rMin), a: oMin + rnd() * (oMax - oMin), x: CX + jitter(sx), y: CY + jitter(sy), vx: jitter(14), vy: -6 - rnd() * 16 });
      return list;
    }
    var far = makeDust(70, 1, 3.2, 0.12, 0.45, 760, 300);
    var near = makeDust(12, 8, 24, 0.05, 0.14, 900, 560);

    /* ---- Timeline */
    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var inQuad = function (p) { return p * p; };
    var inCubic = function (p) { return p * p * p; };
    var outQuad = function (p) { return 1 - (1 - p) * (1 - p); };
    function zoomAt(t) { return 1 + 0.9 * inQuad(clamp01(t / T.shut)) + 0.25 * outQuad(clamp01((t - T.shut) / (T.bim - T.shut))); }
    function ryAt(t) {
      if (t < T.snap) return RY_OPEN + 34 * Math.sin(Math.PI * clamp01(t / T.snap));
      if (t < T.shut) return RY_OPEN + (RY_SHUT - RY_OPEN) * inCubic(clamp01((t - T.snap) / (T.shut - T.snap)));
      var q = (t - T.shut) / 1000;
      return RY_SHUT + 22 * Math.exp(-q * 12) * Math.abs(Math.sin(q * 55));
    }
    // World → canvas transform for a camera at (cx, cy) with roll and zoom.
    function setCam(g, s, cx, cy, roll, zoom) {
      g.setTransform(sc * s, 0, 0, sc * s, ox * s, oy * s);
      g.translate(cx, cy); g.rotate(roll * Math.PI / 180); g.scale(zoom, zoom); g.translate(-CX, -CY);
    }

    function frame(t) {
      var zoom = zoomAt(t), ry = ryAt(t);
      var zoomSpeed = Math.abs(zoom - zoomAt(t - 16)) / 16 * 1000;
      var jawSpeed = Math.abs(ry - ryAt(t - 16)) / 16 * 1000;
      var bobX = 0, bobY = 0, shake = 0, roll = -1.4 + 1.6 * Math.sin(t / 420);
      if (t < T.snap) { bobX = 7 * Math.sin(t / 170); bobY = 9 * Math.sin(t / 120); }
      else if (t >= T.shut) {
        shake = 1 - clamp01((t - T.shut) / (T.bim - T.shut));
        bobX = (Math.random() * 2 - 1) * 26 * shake; bobY = (Math.random() * 2 - 1) * 26 * shake;
        roll += (Math.random() * 2 - 1) * 2 * shake;
      }
      var cx = CX + bobX, cy = CY + bobY;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#04080f'; ctx.fillRect(0, 0, W, H);

      // Outside water + light.
      setCam(ctx, 1, cx, cy, roll, zoom);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(texOut, -400, -400, 2400, 1800);
      var glowA = 0.35 + 0.65 * clamp01(t / T.snap);
      var gl = ctx.createRadialGradient(CX, CY, 0, CX, CY, 520);
      gl.addColorStop(0, 'rgba(69,227,242,' + (0.2 * glowA).toFixed(3) + ')');
      gl.addColorStop(0.5, 'rgba(42,120,200,' + (0.07 * glowA).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(42,120,200,0)');
      ctx.fillStyle = gl; ctx.fillRect(CX - 520, CY - 520, 1040, 1040);

      // Far plankton: barely grows with the zoom (it is far away).
      setCam(ctx, 1, cx, cy, roll, Math.pow(zoom, 0.4));
      ctx.fillStyle = '#8fc4e8';
      far.forEach(function (p) {
        ctx.globalAlpha = p.a;
        ctx.beginPath(); ctx.arc(p.x + p.vx * t / 1000, p.y + p.vy * t / 1000, p.r, 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Light cut as the jaws snap.
      var darkA = 0.94 * inQuad(clamp01((t - T.snap) / (T.shut - T.snap)));
      if (darkA > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(4,8,15,' + darkA.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }

      // Flesh: wet texture + depth shading + soft gum ridge.
      setCam(ctx, 1, cx, cy, roll, zoom);
      [true, false].forEach(function (up) {
        lipPath(ctx, ry, up, true);
        ctx.fillStyle = fleshPattern; ctx.fill();
        var sh = ctx.createLinearGradient(0, up ? -300 : 1300, 0, up ? CY + 20 : CY - 20);
        sh.addColorStop(0, 'rgba(0,0,0,.88)'); sh.addColorStop(0.6, 'rgba(1,3,10,.42)'); sh.addColorStop(1, 'rgba(11,24,48,.05)');
        ctx.fillStyle = sh; ctx.fill();
        lipPath(ctx, ry, up, false);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(13,28,54,.28)'; ctx.lineWidth = 46; ctx.stroke();
        ctx.strokeStyle = 'rgba(13,28,54,.3)'; ctx.lineWidth = 24; ctx.stroke();
      });

      // Front teeth on their own layer, then stacked with a vertical smear (motion blur).
      var smear = Math.min(60, jawSpeed / 40) * sc * zoom;      // canvas px
      teethX.setTransform(1, 0, 0, 1, 0, 0); teethX.clearRect(0, 0, W, H);
      setCam(teethX, 1, cx, cy, roll, zoom);
      front.forEach(function (tt) { drawTooth(teethX, tt, ry); });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      stack(ctx, teethL, W, H, smear);

      // Inner row: drawn at 1/5 resolution and scaled up = out of focus.
      innerX.setTransform(1, 0, 0, 1, 0, 0); innerX.clearRect(0, 0, innerL.width, innerL.height);
      setCam(innerX, innerL.width / W, cx + bobX * 0.6, cy + bobY * 0.6, roll * 1.2, zoom);
      inner.forEach(function (tt) { drawTooth(innerX, tt, ry); });
      ctx.globalAlpha = 0.85;
      stack(ctx, innerL, W, H, smear * 1.3);
      ctx.globalAlpha = 1;

      // Near bokeh rushing past the camera.
      setCam(ctx, 1, cx + bobX * 1.6, cy + bobY * 1.6, roll * 1.5, Math.pow(zoom, 1.9));
      near.forEach(function (p) {
        ctx.globalAlpha = p.a;
        var px = p.x + p.vx * t / 1000, py = p.y + p.vy * t / 1000;
        ctx.drawImage(sprite, px - p.r * 2, py - p.r * 2, p.r * 4, p.r * 4);
      });
      ctx.globalAlpha = 1;

      // Radial zoom trail from camera speed + impact.
      var trail = Math.min(0.06, zoomSpeed * 0.03) + shake * 0.025;
      if (trail > 0.004) {
        compX.setTransform(1, 0, 0, 1, 0, 0); compX.clearRect(0, 0, W, H); compX.drawImage(cvs, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (var i = 1; i <= 3; i++) {
          var s = 1 + trail * i;
          ctx.globalAlpha = 0.22 / i;
          ctx.drawImage(compL, W / 2 * (1 - s), H / 2 * (1 - s), W * s, H * s);
        }
        ctx.globalAlpha = 1;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(vignette, 0, 0);

      fade.style.opacity = String(1 - clamp01(t / T.fade));
      grain.style.backgroundPosition = Math.floor(Math.random() * 220) + 'px ' + Math.floor(Math.random() * 220) + 'px';
    }
    // Draw a layer stretched to the canvas, with vertical offset copies when smearing.
    function stack(g, src, w, h, smear) {
      var base = g.globalAlpha;
      if (smear < 1.5) { g.drawImage(src, 0, 0, w, h); return; }
      var n = 5;
      for (var i = 0; i < n; i++) {
        var off = (i / (n - 1) - 0.5) * smear;
        g.globalAlpha = base * (i === (n >> 1) ? 0.7 : 0.28);
        g.drawImage(src, 0, off, w, h);
      }
      g.globalAlpha = base;
    }

    var t0 = null, done = false, skipped = false;
    function bim() {
      if (done) return;
      done = true;
      window.removeEventListener('resize', resize);
      flash.classList.add('is-on');
      doc.classList.add('bim');
      endIntro();
      flash.addEventListener('animationend', function () { flash.classList.remove('is-on'); }, { once: true });
      setTimeout(function () { doc.classList.remove('bim'); }, 700);
    }
    function finishNow() { endIntro(); }
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
