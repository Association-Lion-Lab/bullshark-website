/* Runs synchronously in <head>: decides language + intro before first paint
   to avoid a flash of the wrong language or of the page behind the jaws. */
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');

  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = null; }

  // --- Language: ?lang= > saved choice > browser language > English
  var lang = params && params.get('lang');
  if (!lang) { try { lang = localStorage.getItem('bs-lang'); } catch (e) {} }
  if (!lang) { lang = (navigator.language || '').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en'; }
  if (lang !== 'fr') lang = 'en';
  d.setAttribute('lang', lang);
  d.setAttribute('data-lang', lang);
  if (lang !== 'en') d.classList.add('i18n-pending');

  // --- Intro: once per browser session, never with reduced motion. ?intro=1 forces it.
  var force = params && params.get('intro') === '1';
  var off = params && params.get('intro') === '0';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('bs-intro') === '1'; } catch (e) {}
  if (!off && (force || (!reduce && !seen))) d.classList.add('intro-on');
})();
