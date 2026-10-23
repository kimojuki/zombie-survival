/**
 * Landing — compteur joueurs + menu mobile + barre CTA + UX interactions.
 */
(function () {
  'use strict';

  const POLL_MS = 15000;
  const COUNT_SEL = '[data-online-count]';
  const FILL_SEL = '[data-online-fill]';
  const REMAIN_SEL = '[data-slots-remaining]';
  const STATUS_DOT_SEL = '[data-server-status]';
  const STATUS_LABEL_SEL = '[data-server-status-label]';
  const LIVE_TEXT_SEL = '[data-live-text]';
  const NAV_DESKTOP_MQ = '(min-width: 900px)';

  let lastCount = null;
  let pollTimer = null;
  let scrollLockY = 0;
  let navReturnFocus = null;

  function lockBodyScroll() {
    scrollLockY = window.scrollY;
    document.body.style.top = `-${scrollLockY}px`;
    document.body.classList.add('landing-nav-open');
  }

  function unlockBodyScroll() {
    document.body.classList.remove('landing-nav-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollLockY);
  }

  function getDrawerFocusables(drawer) {
    return [...drawer.querySelectorAll('a[href], button:not([disabled])')];
  }

  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const drawer = document.querySelector('[data-nav-drawer]');
    const backdrop = document.querySelector('[data-nav-backdrop]');
    if (!toggle || !drawer) return;

    const close = () => {
      if (!drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      backdrop?.classList.remove('is-visible');
      backdrop?.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      unlockBodyScroll();
      document.querySelectorAll('[data-nav-inert]').forEach((el) => el.removeAttribute('inert'));
      if (navReturnFocus && typeof navReturnFocus.focus === 'function') {
        navReturnFocus.focus();
      }
      navReturnFocus = null;
    };

    const open = () => {
      navReturnFocus = document.activeElement;
      drawer.classList.add('is-open');
      backdrop?.classList.add('is-visible');
      backdrop?.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fermer le menu');
      lockBodyScroll();
      document.querySelectorAll('[data-nav-inert]').forEach((el) => el.setAttribute('inert', ''));
      const first = getDrawerFocusables(drawer)[0];
      if (first) window.requestAnimationFrame(() => first.focus());
    };

    toggle.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) close();
      else open();
    });
    backdrop?.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

    drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      const nodes = getDrawerFocusables(drawer);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const desktopMq = window.matchMedia(NAV_DESKTOP_MQ);
    const onDesktopChange = (e) => { if (e.matches) close(); };
    if (desktopMq.addEventListener) desktopMq.addEventListener('change', onDesktopChange);
    else desktopMq.addListener(onDesktopChange);
  }

  function setStatus(mode, label) {
    document.querySelectorAll(STATUS_DOT_SEL).forEach((el) => {
      el.dataset.status = mode;
    });
    if (label) {
      document.querySelectorAll(STATUS_LABEL_SEL).forEach((el) => {
        el.textContent = label;
      });
    }
  }

  function animateCount(el, next) {
    if (lastCount === null || lastCount === next) {
      el.textContent = String(next);
      return;
    }
    el.classList.add('is-updating');
    el.textContent = String(next);
    window.setTimeout(() => el.classList.remove('is-updating'), 400);
  }

  function formatLiveText(n) {
    if (n === 0) return 'Le monde vous attend — soyez le premier survivant en ligne';
    if (n === 1) return '1 survivant explore la carte en ce moment';
    return `${n} survivants explorent la carte en ce moment`;
  }

  async function refresh() {
    try {
      const res = await fetch('/api/public/status', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      const online = data.online | 0;
      const capacity = data.capacity || 250;
      const fill = Math.min(100, data.fillPct ?? Math.round((online / capacity) * 100));

      document.querySelectorAll(COUNT_SEL).forEach((el) => animateCount(el, online));
      document.querySelectorAll(FILL_SEL).forEach((el) => {
        el.style.width = fill + '%';
        el.setAttribute('aria-valuenow', String(fill));
      });
      document.querySelectorAll(REMAIN_SEL).forEach((el) => {
        el.textContent = String(Math.max(0, capacity - online));
      });
      document.querySelectorAll(LIVE_TEXT_SEL).forEach((el) => {
        el.textContent = formatLiveText(online);
      });

      lastCount = online;
      setStatus(data.ready ? 'online' : 'starting', data.ready ? 'En ligne' : 'Démarrage…');
    } catch {
      document.querySelectorAll(COUNT_SEL).forEach((el) => {
        if (el.textContent === '—') el.textContent = '?';
      });
      setStatus('offline', 'Hors ligne');
    }
  }

  function schedulePoll() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refresh, POLL_MS);
  }

  function initReveal() {
    const els = document.querySelectorAll('.landing-reveal');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
  }

  function initStickyHide() {
    const sticky = document.querySelector('.landing-sticky-cta');
    const target = document.querySelector('[data-sticky-cta-hide]');
    if (!sticky || !target) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const navOpen = document.body.classList.contains('landing-nav-open');
        sticky.classList.toggle('is-hidden', entry.isIntersecting && !navOpen);
      },
      { threshold: 0.25 },
    );
    io.observe(target);
  }

  function init() {
    initMobileNav();
    initReveal();
    initStickyHide();
    refresh();
    schedulePoll();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (pollTimer) window.clearInterval(pollTimer);
        pollTimer = null;
      } else {
        refresh();
        schedulePoll();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
