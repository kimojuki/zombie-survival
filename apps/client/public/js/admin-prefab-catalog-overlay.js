// Catalogue prefabs in-game — liste + preview 3D (charge prefab-catalog-preview à la demande).
(function () {
  'use strict';

  const OVERLAY_ID = 'zs-admin-prefab-catalog';

  let _open = false;
  let _catalog = [];
  let _categories = {};
  let _previewLoading = false;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminHub?.hasPerm?.('prefab.catalog') || ZS.AdminHub?.hasPerm?.('decor.edit');
  }

  async function _loadCatalog() {
    const res = await fetch('/api/admin/prefab-catalog', {
      headers: { Authorization: 'Bearer ' + _token() },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Catalogue indisponible');
    _catalog = (json.prefabs || []).slice().sort((a, b) => {
      const ca = a.category || '';
      const cb = b.category || '';
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.label || a.id).localeCompare(b.label || b.id);
    });
    _categories = json.categories || {};
    return _catalog;
  }

  async function _ensurePreviewLib() {
    if (window.PrefabCatalogPreview) return;
    if (_previewLoading) {
      await new Promise((r) => setTimeout(r, 200));
      return _ensurePreviewLib();
    }
    _previewLoading = true;
    const ver = ZS.clientVersion || '';
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/js/prefab-catalog-preview.js' + (ver ? `?v=${encodeURIComponent(ver)}` : '');
      s.onload = resolve;
      s.onerror = () => reject(new Error('Chargement preview impossible'));
      document.head.appendChild(s);
    });
    _previewLoading = false;
  }

  function _filtered(q, cat) {
    const query = (q || '').trim().toLowerCase();
    return _catalog.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (!query) return true;
      const hay = `${p.id} ${p.label || ''} ${p.desc || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }

  function _renderList(root) {
    const q = root.querySelector('#zs-apc-search')?.value || '';
    const cat = root.querySelector('#zs-apc-category')?.value || '';
    const list = root.querySelector('#zs-apc-list');
    if (!list) return;
    const items = _filtered(q, cat).slice(0, 200);
    list.innerHTML = items.map((p) => {
      const label = p.label || p.id;
      const c = _categories[p.category] || p.category || '';
      return `<button type="button" class="zs-apc-item" data-pid="${p.id}"><b>${label}</b><span>${c}</span></button>`;
    }).join('') || '<p class="zs-apc-empty">Aucun prefab</p>';
  }

  function _buildDom() {
    let root = document.getElementById(OVERLAY_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.innerHTML = [
      '<style>',
      `#${OVERLAY_ID}{position:fixed;inset:0;z-index:12800;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);}`,
      `#${OVERLAY_ID} .panel{width:min(520px,94vw);max-height:88vh;overflow:auto;background:#0e141e;color:#e8ecf4;`,
      'border:1px solid rgba(120,160,220,0.35);border-radius:8px;padding:14px;font:12px/1.4 Consolas,monospace;}',
      `#${OVERLAY_ID} h2{margin:0 0 8px;font-size:15px;color:#9cf;}`,
      `#${OVERLAY_ID} input,#${OVERLAY_ID} select{width:100%;box-sizing:border-box;margin:4px 0 8px;padding:6px;background:#1a2230;color:#fff;border:1px solid #445;border-radius:4px;}`,
      `#${OVERLAY_ID} .zs-apc-list{display:flex;flex-direction:column;gap:4px;max-height:50vh;overflow:auto;}`,
      `#${OVERLAY_ID} .zs-apc-item{text-align:left;padding:8px 10px;background:#1a2a40;border:1px solid #334;color:#cde;cursor:pointer;border-radius:4px;}`,
      `#${OVERLAY_ID} .zs-apc-item:hover{background:#2a4060;}`,
      `#${OVERLAY_ID} .zs-apc-item span{display:block;font-size:10px;opacity:0.7;margin-top:2px;}`,
      `#${OVERLAY_ID} .btns{display:flex;gap:8px;margin-top:10px;}`,
      `#${OVERLAY_ID} button.action{background:#2a4a7a;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;}`,
      '</style>',
      '<div class="panel">',
      '  <h2>📦 Catalogue prefabs</h2>',
      '  <input type="search" id="zs-apc-search" placeholder="Rechercher…" autocomplete="off">',
      '  <select id="zs-apc-category"><option value="">Toutes catégories</option></select>',
      '  <div class="zs-apc-list" id="zs-apc-list"></div>',
      '  <div class="btns">',
      '    <button type="button" class="action" id="zs-apc-place">Poser en décor</button>',
      '    <button type="button" class="action" id="zs-apc-close">Fermer</button>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(root);

    root.querySelector('#zs-apc-close')?.addEventListener('click', () => close());
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    root.querySelector('#zs-apc-search')?.addEventListener('input', () => _renderList(root));
    root.querySelector('#zs-apc-category')?.addEventListener('change', () => _renderList(root));
    root.querySelector('#zs-apc-list')?.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('.zs-apc-item');
      if (!btn) return;
      const pid = btn.dataset.pid;
      const entry = _catalog.find((p) => p.id === pid);
      if (!entry) return;
      try {
        await _ensurePreviewLib();
        window.PrefabCatalogPreview?.openModal?.(pid, entry);
      } catch (err) {
        ZS.UI?.showNotif?.(err.message || 'Preview indisponible');
      }
    });
    root.querySelector('#zs-apc-place')?.addEventListener('click', () => {
      const sel = root.querySelector('.zs-apc-item:focus') || root.querySelector('.zs-apc-item');
      const pid = sel?.dataset?.pid || _filtered(
        root.querySelector('#zs-apc-search')?.value,
        root.querySelector('#zs-apc-category')?.value,
      )[0]?.id;
      if (!pid) return;
      close();
      ZS.AdminHub?.close?.();
      ZS.Calibration?.openTool?.('world_decor_live');
      setTimeout(() => ZS.AdminLiveDecor?.startPlacement?.(pid), 200);
    });

    return root;
  }

  async function open() {
    if (!_canUse()) {
      ZS.UI?.showNotif?.('Catalogue : permission prefab.catalog ou decor.edit');
      return;
    }
    const root = _buildDom();
    root.style.display = 'flex';
    _open = true;
    ZS.onUiPanelOpen?.();
    try {
      await _loadCatalog();
      const catSel = root.querySelector('#zs-apc-category');
      if (catSel && catSel.options.length <= 1) {
        const cats = [...new Set(_catalog.map((p) => p.category || 'autre'))].sort();
        for (const id of cats) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = _categories[id] || id;
          catSel.appendChild(opt);
        }
      }
      _renderList(root);
    } catch (err) {
      ZS.UI?.showNotif?.(err.message || 'Erreur catalogue');
    }
  }

  function close() {
    const root = document.getElementById(OVERLAY_ID);
    if (root) root.style.display = 'none';
    if (_open) {
      _open = false;
      ZS.onUiPanelClose?.();
    }
  }

  function isOpen() {
    return _open;
  }

  window.ZS = window.ZS || {};
  ZS.AdminPrefabCatalog = { open, close, isOpen };
}());
