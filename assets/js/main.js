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
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      intro.classList.add('is-ready');
      // Start revealing the hero while the jaws are opening.
      setTimeout(revealHero, 1500);
    };
    // Wait for the wordmark font + logo so the first frames are right, but never more than 700 ms.
    var waits = [];
    if (document.fonts && document.fonts.load) waits.push(document.fonts.load('700 40px "Chakra Petch"'));
    var img = $('.intro__brand img', intro);
    if (img && img.decode) waits.push(img.decode().catch(function () {}));
    Promise.all(waits).then(start, start);
    setTimeout(start, 700);

    intro.addEventListener('animationend', function (e) {
      if (e.target === intro) endIntro();
    });
    var skip = function () {
      if (!started) start();
      intro.classList.add('is-skip');
    };
    $('.intro__skip', intro).addEventListener('click', skip);
    intro.addEventListener('click', function (e) { if (e.target === intro || e.target.closest('.jaw')) skip(); });
    document.addEventListener('keydown', function onKey(e) {
      if (!doc.classList.contains('intro-on')) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    });
    // Safety net: never trap the visitor behind the jaws.
    setTimeout(endIntro, 5000);
  } else if (intro) {
    intro.parentNode.removeChild(intro);
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
