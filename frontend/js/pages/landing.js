/* Trackr — landing page behaviour (ES module). No dependencies. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- theme: respect saved choice, else system; persist if possible ---- */
function getStoredTheme() { try { return localStorage.getItem('trackr-theme'); } catch { return null; } }
function storeTheme(t) { try { localStorage.setItem('trackr-theme', t); } catch { /* private/sandbox */ } }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); }

(function initTheme() {
  const saved = getStoredTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.lp-nav');
  const themeBtn = document.querySelector('.lp-theme');
  const burger = document.querySelector('.lp-burger');
  const mobile = document.querySelector('.lp-nav__mobile');

  const onScroll = () => nav?.classList.toggle('lp-nav--scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  themeBtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next); storeTheme(next);
  });

  burger?.addEventListener('click', () => {
    const open = mobile?.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(!!open));
  });
  mobile?.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => { mobile.classList.remove('is-open'); burger?.setAttribute('aria-expanded', 'false'); })
  );

  const revealEls = document.querySelectorAll('.lp-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  initCountUps();
});

/* ---- count-up on numbers when they enter view ---- */
function initCountUps() {
  const els = document.querySelectorAll('[data-countup]');
  if (!els.length) return;
  const run = (el) => {
    const target = parseFloat(el.dataset.countup);
    const suffix = el.dataset.suffix || '';
    const decimals = (String(el.dataset.countup).split('.')[1] || '').length;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = target.toFixed(decimals) + suffix; return;
    }
    const dur = 900, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}