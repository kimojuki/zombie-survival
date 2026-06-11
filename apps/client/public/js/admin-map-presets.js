// Presets filtres carte admin — localStorage + profils intégrés.
(function () {
  'use strict';

  const STORAGE_KEY = 'zs_admin_map_filter_presets';

  const BUILTIN = {
    ingame: {
      label: 'Standard in-game',
      layers: ['player', 'poi-live', 'gate', 'building', 'storage', 'sign', 'wreck', 'exclusion'],
    },
    buildings: {
      label: 'Bâtiments & loot',
      layers: ['player', 'poi-live', 'gate', 'building', 'storage', 'sign', 'wreck'],
    },
    nature: {
      label: 'Nature (arbres/rochers)',
      layers: ['player', 'tree', 'rock', 'palm', 'barrier', 'camp'],
    },
    all: {
      label: 'Tout afficher (lourd)',
      layers: null,
    },
  };

  function _allLayers() {
    return Object.keys(window.AdminWorldMap?.getLayerMeta?.() || {});
  }

  function _loadCustom() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function _saveCustom(custom) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(custom)); } catch (_) { /* ignore */ }
  }

  function listPresets() {
    const custom = _loadCustom();
    const out = Object.entries(BUILTIN).map(([id, p]) => ({ id, label: p.label, builtin: true }));
    for (const [id, p] of Object.entries(custom)) {
      out.push({ id: `custom:${id}`, label: p.label || id, builtin: false });
    }
    return out;
  }

  function getLayers(presetId) {
    if (presetId === 'all' || !presetId) return _allLayers();
    if (BUILTIN[presetId]) {
      return BUILTIN[presetId].layers || _allLayers();
    }
    if (presetId.startsWith('custom:')) {
      const key = presetId.slice(7);
      const layers = _loadCustom()[key]?.layers;
      if (Array.isArray(layers) && layers.length) return layers;
    }
    return BUILTIN.ingame.layers;
  }

  function apply(presetId) {
    if (!window.AdminWorldMap) return false;
    const layers = getLayers(presetId);
    AdminWorldMap.setLayers(layers);
    return true;
  }

  function saveCurrent(name) {
    const label = String(name || '').trim();
    if (!label) return { ok: false, error: 'Nom requis' };
    if (!window.AdminWorldMap) return { ok: false, error: 'Carte non initialisée' };
    const layers = [...AdminWorldMap.getLayers()];
    const custom = _loadCustom();
    const id = label.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 32) || `p_${Date.now()}`;
    custom[id] = { label, layers };
    _saveCustom(custom);
    return { ok: true, id: `custom:${id}` };
  }

  function mountSelect(container, onChange) {
    if (!container || container.querySelector('#zs-map-preset-select')) return;
    const sel = document.createElement('select');
    sel.id = 'zs-map-preset-select';
    sel.style.cssText = 'width:100%;margin:8px 0;padding:6px;background:#1a2230;color:#fff;border:1px solid #445;border-radius:4px;';
    const refresh = () => {
      const cur = sel.value;
      sel.innerHTML = listPresets().map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
      if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
    };
    refresh();
    sel.addEventListener('change', () => {
      if (apply(sel.value)) onChange?.(sel.value);
    });
    const row = document.createElement('div');
    row.style.marginTop = '8px';
    row.innerHTML = '<label style="font-size:11px;opacity:0.8">Profil filtres</label>';
    row.appendChild(sel);
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Sauver profil actuel';
    saveBtn.style.cssText = 'margin-top:6px;width:100%;padding:6px;background:#2a4a7a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;';
    saveBtn.addEventListener('click', () => {
      const name = window.prompt('Nom du profil de filtres :');
      if (!name) return;
      const res = saveCurrent(name);
      if (res.ok) {
        refresh();
        sel.value = res.id;
        ZS.UI?.showNotif?.(`Profil « ${name} » sauvé`);
      } else ZS.UI?.showNotif?.(res.error || 'Erreur');
    });
    row.appendChild(saveBtn);
    container.appendChild(row);
    return { refresh, select: sel };
  }

  window.ZS = window.ZS || {};
  ZS.AdminMapPresets = { listPresets, getLayers, apply, saveCurrent, mountSelect, BUILTIN };
}());
