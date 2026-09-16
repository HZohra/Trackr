/* Trackr — inject shared partials, then wire the app shell. */
import { getUser } from './auth.js';

/* Replace a failed include slot with a visible, styled alert so a broken
   partial never silently deletes the whole shell again. */

function failSlot(slot, url, detail) {
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'margin:.5rem;padding:.75rem 1rem;border:1px solid #E1483B;background:#FBE9E6;' +
    'color:#E1483B;border-radius:.6rem;font:600 .8rem/1.45 system-ui,sans-serif';
  const hint = location.protocol === 'file:'
    ? ' — you opened this with file://, so fetch() is blocked. Serve it over http:// (Live Server).'
    : ' — check the path, folder name, and casing.';
  box.textContent = `Couldn't load partial: ${url} (${detail})${hint}`;
  slot.replaceWith(box);
}

const PARTIAL_CACHE_VERSION = 'v1';

function insertPartial(slot, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  slot.replaceWith(tpl.content);
}

async function includePartials() {
  const slots = [...document.querySelectorAll('[data-include]')];
  await Promise.all(slots.map(async (slot) => {
    const url = slot.getAttribute('data-include');
    const cacheKey = `trackr-partial:${PARTIAL_CACHE_VERSION}:${url}`;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        insertPartial(slot, cached);
        return;
      }
    } catch { }

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      try { sessionStorage.setItem(cacheKey, html); } catch { /* ignore */ }
      insertPartial(slot, html);
    } catch (e) {
      console.error('[include] failed to load', url, e);
      failSlot(slot, url, e.message || String(e));
    }
  }));
}

function initShell() {
  const body = document.body;

  function renderUserIdentity(user = getUser()) {
    if (!user) return;
    const first = String(user.first_name || '').trim();
    const last = String(user.last_name || '').trim();
    const fullName = [first, last].filter(Boolean).join(' ') || user.email || 'User';
    const initials = ((first[0] || '') + (last[0] || first[1] || '')).toUpperCase() || '?';

    document.querySelectorAll('[data-user-initials]').forEach((el) => { el.textContent = initials; });
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = fullName; });
    document.querySelectorAll('[data-user-email]').forEach((el) => { el.textContent = user.email || ''; });
    document.querySelectorAll('[data-user-role]').forEach((el) => {
      const role = String(user.role || 'student');
      el.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    });
    document.querySelectorAll('[data-profile-link]').forEach((link) => {
      link.href = user.role === 'admin' ? 'admin-settings.html' : 'settings.html';
    });
  }

  renderUserIdentity();
  body.addEventListener('profile:updated', (event) => renderUserIdentity(event.detail));

  /* active nav item from <body data-page="..."> */
  const page = body.dataset.page;
  if (page) {
    document.querySelectorAll('.app-nav__item').forEach((a) =>
      a.classList.toggle('is-active', a.dataset.page === page));
  }

  /* theme (shared key with the rest of the app) */
  try {
    const saved = localStorage.getItem('trackr-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
  } catch { /* ignore */ }

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('trackr-theme', next); } catch { /* ignore */ }
  });

  /* collapse (desktop), persisted */
  try { if (localStorage.getItem('trackr-sidebar') === 'collapsed') body.classList.add('is-collapsed'); } catch { /* ignore */ }
  document.querySelector('[data-collapse]')?.addEventListener('click', () => {
    const on = body.classList.toggle('is-collapsed');
    try { localStorage.setItem('trackr-sidebar', on ? 'collapsed' : 'open'); } catch { /* ignore */ }
  });

  /* mobile drawer + backdrop */
  let backdrop = document.querySelector('.app-backdrop');
  if (!backdrop) { backdrop = document.createElement('div'); backdrop.className = 'app-backdrop'; body.appendChild(backdrop); }
  const open = () => body.classList.add('is-drawer-open');
  const close = () => body.classList.remove('is-drawer-open');
  document.querySelector('[data-drawer]')?.addEventListener('click', open);
  backdrop.addEventListener('click', close);
  document.querySelectorAll('.app-nav__item').forEach((a) => a.addEventListener('click', close));

  /* account menu (Log out lives here) */
  const userBtn = document.querySelector('[data-user-trigger]');
  const userMenu = document.querySelector('.app-usermenu');
  if (userBtn && userMenu) {
    const closeMenu = () => { userMenu.classList.remove('is-open'); userBtn.setAttribute('aria-expanded', 'false'); };
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userMenu.classList.toggle('is-open');
      userBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => { if (!userMenu.contains(e.target) && !userBtn.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* log out — clear the session, then the link navigates to login */
  document.querySelector('[data-logout]')?.addEventListener('click', () => {
    try { localStorage.removeItem('trackr-auth'); sessionStorage.clear(); } catch { /* ignore */ }
  });

  /* press "/" to focus search */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(input|textarea|select)$/i.test(e.target.tagName) && !e.target.isContentEditable) {
      const input = document.querySelector('.app-search input');
      if (input) { e.preventDefault(); input.focus(); }
    }
  });

  body.dispatchEvent(new CustomEvent('shell:ready'));
}

async function boot() {
  // Apply the saved width before the sidebar enters the document, preventing
  // a collapsed sidebar from flashing at full width between pages.
  try {
    document.body.classList.toggle(
      'is-collapsed',
      localStorage.getItem('trackr-sidebar') === 'collapsed',
    );
  } catch { /* ignore */ }
  await includePartials();
  initShell();
}

/* run now if the DOM is already parsed, otherwise wait — same guard
   dashboard.js uses, so this can never get skipped. */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
