// Signets téléportation admin — localStorage, F8 Monde + éditeur décor.
(function () {
  'use strict';

  const STORAGE_KEY = 'zs_admin_tp_bookmarks';
  const MAX = 24;

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function _save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) { /* ignore */ }
  }

  function list() {
    return _load().slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  function add(name, x, z, rotY) {
    const label = String(name || '').trim();
    if (!label) return { ok: false, error: 'Nom requis' };
    if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, error: 'Coordonnées invalides' };
    const items = _load();
    if (items.some((b) => b.name.toLowerCase() === label.toLowerCase())) {
      return { ok: false, error: 'Nom déjà utilisé' };
    }
    if (items.length >= MAX) {
      return { ok: false, error: `Maximum ${MAX} signets` };
    }
    const entry = {
      id: `bm_${Date.now().toString(36)}`,
      name: label,
      x: +x.toFixed(2),
      z: +z.toFixed(2),
      rotY: Number.isFinite(rotY) ? rotY : undefined,
      createdAt: Date.now(),
    };
    items.push(entry);
    _save(items);
    return { ok: true, bookmark: entry };
  }

  function remove(id) {
    const items = _load().filter((b) => b.id !== id);
    _save(items);
    return { ok: true };
  }

  function addFromPlayer(name) {
    const p = ZS._state?.player;
    if (!p) return { ok: false, error: 'Joueur non initialisé' };
    return add(name, p.x, p.z, ZS._camera?.rotation?.y);
  }

  function addFromReticle(name) {
    const pt = ZS.AdminGoHere?.pickTarget?.();
    if (!pt) return { ok: false, error: 'Visez le sol sous le réticule' };
    return add(name, pt.x, pt.z, pt.rotY);
  }

  async function teleport(id) {
    const bm = _load().find((b) => b.id === id);
    if (!bm) return { ok: false, error: 'Signet introuvable' };
    const ok = await ZS.AdminGoHere?.teleportTo?.(bm.x, bm.z, bm.rotY);
    return ok ? { ok: true, bookmark: bm } : { ok: false, error: 'Téléportation échouée' };
  }

  function renderList(container) {
    if (!container) return;
    const items = list();
    if (!items.length) {
      container.innerHTML = '<p class="admin-hub-empty">Aucun signet — sauvez une position ci-dessous.</p>';
      return;
    }
    container.innerHTML = items.map((b) => [
      '<div class="admin-bm-row">',
      `<span class="admin-bm-name">${b.name}</span>`,
      `<span class="admin-bm-coords">${b.x}, ${b.z}</span>`,
      `<button type="button" class="admin-bm-go" data-bm-id="${b.id}">Y aller</button>`,
      `<button type="button" class="admin-bm-del" data-bm-id="${b.id}">✕</button>`,
      '</div>',
    ].join('')).join('');
    container.querySelectorAll('.admin-bm-go').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const res = await teleport(btn.dataset.bmId);
        if (res.ok) ZS.UI?.showNotif?.(`TP : ${res.bookmark.name}`);
        else ZS.UI?.showNotif?.(res.error || 'Erreur');
      });
    });
    container.querySelectorAll('.admin-bm-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        remove(btn.dataset.bmId);
        renderList(container);
      });
    });
  }

  function mountHubSection(parent) {
    if (!parent || parent.dataset.bmBuilt === '1') return;
    parent.dataset.bmBuilt = '1';
    parent.innerHTML = [
      '<style>',
      '.admin-bm-row{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;margin:4px 0;font-size:11px;}',
      '.admin-bm-coords{opacity:0.65;font-size:10px;}',
      '.admin-bm-go,.admin-bm-del{padding:4px 8px;font-size:10px;cursor:pointer;border:none;border-radius:4px;}',
      '.admin-bm-go{background:#2a5a4a;color:#fff;}',
      '.admin-bm-del{background:#5a2a2a;color:#fff;}',
      '.admin-bm-add{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}',
      '.admin-bm-add input{flex:1;min-width:120px;padding:6px;background:#1a2230;color:#fff;border:1px solid #445;border-radius:4px;}',
      '.admin-bm-add button{padding:6px 10px;background:#2a4a7a;color:#fff;border:none;border-radius:4px;cursor:pointer;}',
      '</style>',
      '<p class="admin-hub-section">Signets téléportation</p>',
      '<div id="admin-bm-list"></div>',
      '<div class="admin-bm-add">',
      '  <input type="text" id="admin-bm-name" placeholder="Nom du signet…" maxlength="32">',
      '  <button type="button" id="admin-bm-here">Position actuelle</button>',
      '  <button type="button" id="admin-bm-reticle">Sous réticule</button>',
      '</div>',
    ].join('');
    const listEl = parent.querySelector('#admin-bm-list');
    renderList(listEl);
    parent.querySelector('#admin-bm-here')?.addEventListener('click', () => {
      const name = parent.querySelector('#admin-bm-name')?.value;
      const res = addFromPlayer(name);
      if (res.ok) {
        parent.querySelector('#admin-bm-name').value = '';
        renderList(listEl);
        ZS.UI?.showNotif?.(`Signet « ${res.bookmark.name} » sauvé`);
      } else ZS.UI?.showNotif?.(res.error || 'Erreur');
    });
    parent.querySelector('#admin-bm-reticle')?.addEventListener('click', () => {
      const name = parent.querySelector('#admin-bm-name')?.value;
      const res = addFromReticle(name);
      if (res.ok) {
        parent.querySelector('#admin-bm-name').value = '';
        renderList(listEl);
        ZS.UI?.showNotif?.(`Signet « ${res.bookmark.name} » sauvé`);
      } else ZS.UI?.showNotif?.(res.error || 'Erreur');
    });
  }

  window.ZS = window.ZS || {};
  ZS.AdminTpBookmarks = { list, add, remove, addFromPlayer, addFromReticle, teleport, renderList, mountHubSection };
}());
