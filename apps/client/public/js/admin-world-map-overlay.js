// Carte admin in-game — overlay F8, filtres stricts, TP + édition décor.
(function () {
  'use strict';

  const OVERLAY_ID = 'zs-admin-map-overlay';

  let _root = null;
  let _open = false;
  let _hitPanel = null;
  let _lastHit = null;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _hasPerm() {
    if (ZS.AdminAuth?.hasPerm?.('world.map')) return true;
    if (ZS.AdminHub?.hasPerm?.('world.map')) return true;
    if (ZS.AdminAuth?.hasPerm?.('decor.edit')) return true;
    if (ZS.AdminHub?.hasPerm?.('decor.edit')) return true;
    return false;
  }

  function _decorIdFromHit(hit) {
    if (!hit) return null;
    if (hit.source === 'decor') return hit.meta?.id || hit.id;
    if (hit.source === 'poi') return hit.meta?.decorId || null;
    return null;
  }

  function _closeHitPanel() {
    _lastHit = null;
    if (_hitPanel) _hitPanel.classList.add('hidden');
  }

  function _showHitPanel(hit) {
    if (!_hitPanel || !hit) return;
    _lastHit = hit;
    const title = _hitPanel.querySelector('.zs-map-hit-title');
    const sub = _hitPanel.querySelector('.zs-map-hit-sub');
    if (title) title.textContent = hit.label || hit.id || 'Point';
    if (sub) {
      const m = hit.meta || {};
      sub.textContent = [
        LAYER_META_LABEL(hit.layer),
        Number.isFinite(m.x) ? `x=${m.x.toFixed(1)} z=${m.z.toFixed(1)}` : '',
      ].filter(Boolean).join(' · ');
    }
    _hitPanel.classList.remove('hidden');
  }

  function LAYER_META_LABEL(layer) {
    return window.AdminWorldMap?.getLayerMeta?.()?.[layer]?.label || layer;
  }

  function _renderFilters(container, stats) {
    if (!container || !window.AdminWorldMap) return;
    const meta = AdminWorldMap.getLayerMeta();
    const active = AdminWorldMap.getLayers();
    const byLayer = stats?.byLayer || {};
    const noiseOff = new Set(AdminWorldMap.DEFAULT_LAYERS_OFF || []);
    container.innerHTML = '';
    const sorted = Object.keys(meta).sort((a, b) => {
      const ao = noiseOff.has(a) ? 1 : 0;
      const bo = noiseOff.has(b) ? 1 : 0;
      if (ao !== bo) return ao - bo;
      return (meta[a].label || a).localeCompare(meta[b].label || b);
    });
    for (const id of sorted) {
      const m = meta[id];
      const count = byLayer[id] || 0;
      const row = document.createElement('label');
      row.className = 'zs-map-filter' + (noiseOff.has(id) ? ' is-noise' : '');
      const checked = active.has(id);
      row.innerHTML = [
        `<input type="checkbox" data-layer="${id}"${checked ? ' checked' : ''}>`,
        `<span class="sw" style="--c:${m.color}"></span>`,
        `<span class="lbl">${m.label}</span>`,
        `<span class="cnt">${count || '—'}</span>`,
      ].join('');
      row.querySelector('input')?.addEventListener('change', (e) => {
        AdminWorldMap.toggleLayer(id, e.target.checked);
        _updateFilterStats(container);
      });
      container.appendChild(row);
    }
  }

  function _updateFilterStats(container) {
    const el = _root?.querySelector('#zs-map-visible-count');
    if (!el || !window.AdminWorldMap) return;
    const n = AdminWorldMap.getMarkerCount();
    const cap = 4000;
    el.textContent = n > cap
      ? `${n} visibles (cap affichage ${cap} — désactivez des filtres)`
      : `${n} point${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}`;
    el.classList.toggle('is-warn', n > cap);
  }

  async function _tpTo(x, z) {
    const ok = await ZS.AdminGoHere?.teleportTo?.(x, z);
    if (ok) close();
    return ok;
  }

  function _editDecor(decorId) {
    close();
    ZS.AdminLiveDecor?.enter?.();
    if (decorId) {
      setTimeout(() => ZS.AdminLiveDecor?._selectDecor?.(decorId), 120);
    }
  }

  const AdminWorldMapOverlay = {
    isOpen() {
      return _open;
    },

    async open() {
      if (_open) return;
      if (!_hasPerm()) {
        ZS.UI?.showNotif?.('Carte admin : permission world.map ou decor.edit requise');
        return;
      }
      if (!window.AdminWorldMap) {
        ZS.UI?.showNotif?.('Carte admin indisponible (script manquant)');
        return;
      }

      const root = document.createElement('div');
      root.id = OVERLAY_ID;
      root.innerHTML = [
        '<style>',
        `#${OVERLAY_ID}{position:fixed;inset:0;z-index:13000;display:flex;flex-direction:column;`,
        'background:rgba(6,10,14,0.94);color:#e8ecf4;font:12px/1.35 Consolas,Monaco,monospace;}',
        `#${OVERLAY_ID} .top{display:flex;align-items:center;gap:8px;padding:8px 12px;`,
        'border-bottom:1px solid rgba(255,200,80,0.2);flex-shrink:0;}',
        `#${OVERLAY_ID} .top h2{margin:0;font-size:14px;color:#ffd080;flex:1;}`,
        `#${OVERLAY_ID} .top .hint{opacity:0.75;font-size:11px;}`,
        `#${OVERLAY_ID} button{background:#2a4a7a;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font:inherit;}`,
        `#${OVERLAY_ID} button.primary{background:#3a6a3a;}`,
        `#${OVERLAY_ID} button.warn{background:#7a3a2a;}`,
        `#${OVERLAY_ID} .body{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 200px;min-height:0;}`,
        `#${OVERLAY_ID} .map-wrap{position:relative;min-height:0;}`,
        `#${OVERLAY_ID} canvas{display:block;width:100%;height:100%;cursor:grab;}`,
        `#${OVERLAY_ID} .side{border-left:1px solid rgba(255,255,255,0.08);padding:10px;overflow:auto;}`,
        `#${OVERLAY_ID} .side h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;opacity:0.65;}`,
        `#${OVERLAY_ID} .zs-map-filter{display:flex;align-items:center;gap:6px;margin:4px 0;font-size:11px;cursor:pointer;}`,
        `#${OVERLAY_ID} .zs-map-filter.is-noise{opacity:0.72;}`,
        `#${OVERLAY_ID} .zs-map-filter .sw{width:8px;height:8px;border-radius:50%;background:var(--c);flex-shrink:0;}`,
        `#${OVERLAY_ID} .zs-map-filter .lbl{flex:1;}`,
        `#${OVERLAY_ID} .zs-map-filter .cnt{opacity:0.55;font-size:10px;min-width:28px;text-align:right;}`,
        `#${OVERLAY_ID} #zs-map-visible-count{margin:8px 0;font-size:10px;opacity:0.8;}`,
        `#${OVERLAY_ID} #zs-map-visible-count.is-warn{color:#ffaa66;}`,
        `#${OVERLAY_ID} .map-tooltip{position:absolute;pointer-events:none;max-width:260px;padding:8px 10px;`,
        'background:rgba(12,18,26,0.95);border:1px solid rgba(255,255,255,0.12);border-radius:6px;font-size:11px;z-index:2;}',
        `#${OVERLAY_ID} .map-tooltip.hidden{display:none;}`,
        `#${OVERLAY_ID} .map-tooltip .dim{opacity:0.65;}`,
        `#${OVERLAY_ID} .map-tooltip .tag{display:inline-block;margin-top:4px;padding:1px 5px;border-radius:3px;font-size:10px;}`,
        `#${OVERLAY_ID} .map-tooltip .tag.ok{background:rgba(60,120,60,0.5);}`,
        `#${OVERLAY_ID} .map-tooltip .tag.warn{background:rgba(120,90,30,0.5);}`,
        `#${OVERLAY_ID} .zs-map-hit{position:absolute;bottom:12px;left:12px;right:212px;padding:10px 12px;`,
        'background:rgba(14,22,32,0.92);border:1px solid rgba(255,200,80,0.35);border-radius:8px;z-index:3;}',
        `#${OVERLAY_ID} .zs-map-hit.hidden{display:none;}`,
        `#${OVERLAY_ID} .zs-map-hit-title{font-weight:bold;color:#ffe8b0;}`,
        `#${OVERLAY_ID} .zs-map-hit-sub{font-size:10px;opacity:0.75;margin:4px 0 8px;}`,
        `#${OVERLAY_ID} .zs-map-hit-btns{display:flex;flex-wrap:wrap;gap:6px;}`,
        `#${OVERLAY_ID} .foot{font-size:10px;opacity:0.6;margin-top:12px;line-height:1.4;}`,
        '</style>',
        '<div class="top">',
        '  <h2>🗺️ Carte monde admin</h2>',
        '  <span class="hint">dbl-clic vide = TP · filtres à droite</span>',
        '  <button type="button" class="primary" id="zs-map-center-me">Centrer sur moi</button>',
        '  <button type="button" id="zs-map-tp-center">TP centre carte</button>',
        '  <button type="button" id="zs-map-refresh">Rafraîchir</button>',
        '  <button type="button" class="warn" id="zs-map-close">Fermer (Échap)</button>',
        '</div>',
        '<div class="body">',
        '  <div class="map-wrap">',
        '    <canvas id="zs-map-canvas"></canvas>',
        '    <div class="map-tooltip hidden" id="zs-map-tooltip"></div>',
        '    <div class="zs-map-hit hidden" id="zs-map-hit">',
        '      <div class="zs-map-hit-title"></div>',
        '      <div class="zs-map-hit-sub"></div>',
        '      <div class="zs-map-hit-btns">',
        '        <button type="button" class="primary" id="zs-map-hit-tp">📍 Y aller</button>',
        '        <button type="button" id="zs-map-hit-edit">✏️ Éditer décor</button>',
        '        <button type="button" id="zs-map-hit-dismiss">Fermer</button>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="side">',
        '    <h3>Filtres couches</h3>',
        '    <p class="foot">Arbres, rochers, barrières et camp masqués par défaut.</p>',
        '    <div id="zs-map-visible-count">Chargement…</div>',
        '    <div id="zs-map-filters"></div>',
        '    <button type="button" id="zs-map-reset-filters" style="margin-top:10px;width:100%">Filtres par défaut</button>',
        '  </div>',
        '</div>',
      ].join('');
      document.body.appendChild(root);
      _root = root;
      _open = true;
      _hitPanel = root.querySelector('#zs-map-hit');
      ZS.onUiPanelOpen?.();

      const onKey = (e) => {
        if (!_open) return;
        if (e.code === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (!_hitPanel?.classList.contains('hidden')) _closeHitPanel();
          else AdminWorldMapOverlay.close();
        }
      };
      root._keyHandler = onKey;
      document.addEventListener('keydown', onKey, true);

      root.querySelector('#zs-map-close')?.addEventListener('click', () => close());
      root.querySelector('#zs-map-center-me')?.addEventListener('click', () => {
        if (!AdminWorldMap.centerOnPlayer(3.5)) ZS.UI?.showNotif?.('Position joueur inconnue');
      });
      root.querySelector('#zs-map-tp-center')?.addEventListener('click', () => {
        const c = AdminWorldMap.screenCenterWorld();
        _tpTo(c.x, c.z);
      });
      root.querySelector('#zs-map-refresh')?.addEventListener('click', async () => {
        const d = await AdminWorldMap.refresh();
        _renderFilters(root.querySelector('#zs-map-filters'), d?.stats);
        _updateFilterStats(root.querySelector('#zs-map-filters')?.parentElement);
      });
      root.querySelector('#zs-map-reset-filters')?.addEventListener('click', () => {
        AdminWorldMap.setLayers(AdminWorldMap.INGAME_DEFAULT_ON);
        const filters = root.querySelectorAll('#zs-map-filters input[type=checkbox]');
        const active = AdminWorldMap.getLayers();
        filters.forEach((inp) => { inp.checked = active.has(inp.dataset.layer); });
        _updateFilterStats(root.querySelector('.side'));
      });
      root.querySelector('#zs-map-hit-tp')?.addEventListener('click', () => {
        if (!_lastHit) return;
        _tpTo(_lastHit.x, _lastHit.z);
      });
      root.querySelector('#zs-map-hit-edit')?.addEventListener('click', () => {
        const id = _decorIdFromHit(_lastHit);
        if (!id) {
          ZS.UI?.showNotif?.('Pas de décor serveur sur ce point');
          return;
        }
        _editDecor(id);
      });
      root.querySelector('#zs-map-hit-dismiss')?.addEventListener('click', () => _closeHitPanel());

      try {
        const data = await AdminWorldMap.init({
          canvas: root.querySelector('#zs-map-canvas'),
          tooltip: root.querySelector('#zs-map-tooltip'),
          token: _token(),
          mode: 'ingame',
          defaultLayers: AdminWorldMap.INGAME_DEFAULT_ON,
          onMarkerClick: (hit) => _showHitPanel(hit),
          onMapDblClick: (x, z) => _tpTo(x, z),
          onStats: (d) => {
            _renderFilters(root.querySelector('#zs-map-filters'), d?.stats);
            _updateFilterStats(root.querySelector('.side'));
          },
        });
        if (!AdminWorldMap.centerOnPlayer(2.8)) AdminWorldMap.fitView();
        const side = root.querySelector('.side');
        _renderFilters(root.querySelector('#zs-map-filters'), data?.stats);
        ZS.AdminMapPresets?.mountSelect?.(side, () => {
          const filters = root.querySelectorAll('#zs-map-filters input[type=checkbox]');
          const active = AdminWorldMap.getLayers();
          filters.forEach((inp) => { inp.checked = active.has(inp.dataset.layer); });
          _updateFilterStats(side);
        });
        _updateFilterStats(side);
      } catch (err) {
        ZS.UI?.showNotif?.(err.message || 'Carte indisponible');
        close();
      }
    },

    close() {
      if (!_open) return;
      _open = false;
      _closeHitPanel();
      if (_root?._keyHandler) {
        document.removeEventListener('keydown', _root._keyHandler, true);
      }
      window.AdminWorldMap?.destroy?.();
      _root?.remove();
      _root = null;
      _hitPanel = null;
      ZS.onUiPanelClose?.();
    },
  };

  function close() {
    AdminWorldMapOverlay.close();
  }

  function pulseAt(x, z, ms) {
    if (_open) window.AdminWorldMap?.pulseAt?.(x, z, ms);
  }

  window.ZS = window.ZS || {};
  ZS.AdminWorldMapOverlay = { ...AdminWorldMapOverlay, pulseAt };
}());
