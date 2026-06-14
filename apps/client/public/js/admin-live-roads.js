// Admin routes live (généré — admin-live-roads/chunks + npm run bundle:admin-live-roads)
(function () {
  'use strict';

const PANEL_ID = 'zs-admin-live-roads';
  const PLACE_DIST = 120;
  const TYPE_COLORS = {
    dirt: 0x9a7a52,
    path: 0x7a9a5a,
    trail: 0x6a8a48,
    asphalt: 0x555555,
  };

  function _scene() {
    return ZS._gfxRuntime?.scene || null;
  }

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminAuth?.hasPerm?.('decor.edit')
      || ZS.AdminHub?.hasPerm?.('decor.edit')
      || localStorage.getItem('zombie_is_admin') === '1';
  }

  function _pickGround() {
    return ZS.pickAdminDecorPlacement?.(PLACE_DIST) || null;
  }

  const AdminLiveRoads = {
    active: false,
    _panel: null,
    _banner: null,
    _roads: [],
    _draftPts: [],
    _draftLabel: '',
    _draftWidth: 2.6,
    _draftType: 'dirt',
    _draftSmooth: true,
    _draftVisual: true,
    _draftBarriers: false,
    _placing: false,
    _selectedId: null,
    _editingId: null,
    _selectedPtIdx: -1,
    _previewRoot: null,
    _busy: false,

    isActive() { return this.active; },
    isPlacing() { return this.active && this._placing; },

    async enter() {
      if (!_canUse()) {
        ZS.UI?.showNotif?.('Routes admin : droit decor.edit requis');
        return;
      }
      ZS.AdminLiveDecor?.exit?.();
      this.active = true;
      window.ZS._adminLiveRoadsActive = true;
      document.body.classList.add('admin-live-roads-active');
      this._buildPanel();
      this._buildBanner();
      await this._refreshList();
      this._startPlacing();
      this._setStatus('Souris libre dans le panel · clic sur le jeu = point · molette = largeur');
    },

    exit() {
      if (!this.active) return;
      this.active = false;
      window.ZS._adminLiveRoadsActive = false;
      document.body.classList.remove('admin-live-roads-active');
      this._placing = false;
      this._draftPts = [];
      this._selectedId = null;
      this._editingId = null;
      this._selectedPtIdx = -1;
      this._clearPreview();
      if (this._panel?.parent) this._panel.parent.removeChild(this._panel);
      this._panel = null;
      document.getElementById(PANEL_ID)?.remove();
      if (this._banner?.parent) this._banner.parent.removeChild(this._banner);
      this._banner = null;
      document.getElementById('zs-alr-banner')?.remove();
      ZS.onUiPanelClose?.();
    },

    tick() {
      if (!this.active || !this._placing) return;
      this._updateLivePreview();
    },

    tryPlaceOnClick() {
      if (!this.active) return false;
      if (!this._placing) this._startPlacing();
      const pt = _pickGround();
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.z)) {
        this._setStatus('Pas de sol sous le réticule — approchez-vous', 'warn');
        return true;
      }
      const x = Math.round(pt.x * 100) / 100;
      const z = Math.round(pt.z * 100) / 100;
      this._draftPts.push([x, z]);
      this._selectedPtIdx = this._draftPts.length - 1;
      this._renderPointList();
      this._updateLivePreview(true);
      this._setStatus(`${this._draftPts.length} point(s) — Entrée = enregistrer`);
      return true;
    },

    tryCancelOnRightClick() {
      if (!this.active || !this._placing) return false;
      if (this._draftPts.length) {
        this._draftPts.pop();
        this._selectedPtIdx = this._draftPts.length - 1;
        this._renderPointList();
        this._updateLivePreview(true);
        this._setStatus(this._draftPts.length
          ? `${this._draftPts.length} point(s)`
          : 'Aucun point — clic gauche pour commencer');
        return true;
      }
      return true;
    },

    tryFinishOnEnter() {
      if (!this.isPlacing() || this._draftPts.length < 2) {
        if (this.isPlacing()) this._setStatus('Au moins 2 points requis', 'warn');
        return false;
      }
      this._saveDraft();
      return true;
    },

    tryUndoPointOnBackspace() {
      if (!this.isPlacing() || !this._draftPts.length) return false;
      this._draftPts.pop();
      this._selectedPtIdx = this._draftPts.length - 1;
      this._renderPointList();
      this._updateLivePreview(true);
      return true;
    },

    onWheel(e) {
      if (!this.isPlacing()) return false;
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      this._draftWidth = Math.max(1, Math.min(16, this._draftWidth + delta));
      const wEl = this._panel?.querySelector('#zs-alr-width');
      if (wEl) wEl.value = String(Math.round(this._draftWidth * 10) / 10);
      this._updateLivePreview(true);
      this._setStatus(`Largeur ${this._draftWidth.toFixed(1)} m`);
      return true;
    },


    _buildBanner() {
      if (this._banner?.parent) return;
      const el = document.createElement('div');
      el.id = 'zs-alr-banner';
      el.innerHTML = [
        '<span id="zs-alr-banner-main"><b>Routes admin</b></span>',
        '<span class="sub" id="zs-alr-banner-sub">Clic jeu = point · panel = souris libre · molette = largeur · Visée FPS = bouton panel</span>',
      ].join('');
      document.body.appendChild(el);
      this._banner = el;
    },

    _buildPanel() {
      if (this._panel?.parent) return;
      const panel = document.createElement('aside');
      panel.id = PANEL_ID;
      panel.innerHTML = [
        '<style>',
        `#${PANEL_ID}{position:fixed;top:0;right:0;width:min(400px,94vw);height:100vh;`,
        'background:rgba(10,14,22,0.96);color:#e8ecf4;font:12px/1.4 Consolas,Monaco,monospace;',
        'z-index:12950;overflow:auto;padding:10px 12px 24px;box-sizing:border-box;',
        'border-left:1px solid rgba(120,200,255,0.28);pointer-events:auto;}',
        `#${PANEL_ID} h2{margin:0 0 6px;font-size:15px;color:#9fd4ff;}`,
        `#${PANEL_ID} .hint{opacity:0.82;margin-bottom:8px;font-size:11px;line-height:1.4;}`,
        `#${PANEL_ID} .sec{margin:12px 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.6;}`,
        `#${PANEL_ID} label{display:block;margin:6px 0;font-size:11px;}`,
        `#${PANEL_ID} input[type=text],#${PANEL_ID} input[type=number],#${PANEL_ID} select{`,
        'width:100%;background:#1a2230;color:#fff;border:1px solid #445;padding:5px 6px;border-radius:3px;font:inherit;box-sizing:border-box;}',
        `#${PANEL_ID} input[type=range]{width:100%;margin:4px 0;}`,
        `#${PANEL_ID} .row-check{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px;}`,
        `#${PANEL_ID} .btns{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;}`,
        `#${PANEL_ID} button{background:#2a4a7a;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font:inherit;}`,
        `#${PANEL_ID} button.primary{background:#2a6a4a;}`,
        `#${PANEL_ID} button.warn{background:#7a3a2a;}`,
        `#${PANEL_ID} button.sm{padding:3px 7px;font-size:10px;}`,
        `#${PANEL_ID} .hidden{display:none!important;}`,
        `#${PANEL_ID} .status{margin-top:8px;padding:6px 8px;background:rgba(40,60,80,0.45);border-radius:4px;min-height:28px;font-size:11px;}`,
        `#${PANEL_ID} .status.err{background:rgba(90,30,30,0.5);}`,
        `#${PANEL_ID} .status.warn{background:rgba(90,70,20,0.45);}`,
        `#${PANEL_ID} .status.ok{background:rgba(30,70,40,0.45);}`,
        `#${PANEL_ID} .pt-row{display:grid;grid-template-columns:24px 1fr 1fr auto;gap:4px;align-items:center;margin:3px 0;padding:3px;`,
        `#${PANEL_ID} .pt-row.sel{background:rgba(80,140,220,0.2);border-radius:3px;}`,
        `#${PANEL_ID} .pt-row input[type=number]{width:100%;padding:2px 4px;font-size:10px;}`,
        `#${PANEL_ID} select[size]{min-height:100px;}`,
        '#zs-alr-banner{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:12940;',
        'pointer-events:none;padding:6px 14px;border-radius:6px;background:rgba(20,28,40,0.88);',
        'border:1px solid rgba(120,200,255,0.35);font:12px/1.3 Consolas,monospace;color:#cfe8ff;',
        'display:flex;flex-direction:column;align-items:center;gap:2px;}',
        '#zs-alr-banner .sub{font-size:10px;opacity:0.75;}',
        '</style>',
        '<h2>Routes admin</h2>',
        '<p class="hint">Souris libre pour le panel. Visez avec la souris sur le jeu, <b>clic</b> = point. Optionnel : <b>Visée FPS</b>.</p>',
        '<div class="sec">Nouvelle route</div>',
        '<label>Libellé<input type="text" id="zs-alr-label" maxlength="64" placeholder="ex. plage → cabane"></label>',
        '<label>Type<select id="zs-alr-type">',
        '  <option value="dirt" selected>Terre (dirt)</option>',
        '  <option value="path">Sentier (path)</option>',
        '  <option value="trail">Trail forestier</option>',
        '  <option value="asphalt">Asphalte</option>',
        '</select></label>',
        '<label>Largeur <span id="zs-alr-width-val">2.6</span> m</label>',
        '<input type="range" id="zs-alr-width" min="1" max="14" step="0.1" value="2.6">',
        '<div class="row-check"><input type="checkbox" id="zs-alr-smooth" checked> Lisser le tracé</div>',
        '<div class="row-check"><input type="checkbox" id="zs-alr-visual" checked> Mesh visible</div>',
        '<div class="row-check"><input type="checkbox" id="zs-alr-barriers"> Barrières</div>',
        '<div class="btns">',
        '  <button type="button" class="primary" id="zs-alr-new">Nouvelle trace</button>',
        '  <button type="button" id="zs-alr-aim">Visée FPS</button>',
        '  <button type="button" class="warn hidden" id="zs-alr-cancel">Annuler</button>',
        '  <button type="button" class="primary hidden" id="zs-alr-save">Enregistrer</button>',
        '</div>',
        '<div class="sec">Points (<span id="zs-alr-pt-count">0</span>)</div>',
        '<div id="zs-alr-points"></div>',
        '<div class="btns hidden" id="zs-alr-pt-nudge">',
        '  <span style="font-size:10px;opacity:0.7">Point sélectionné :</span>',
        '  <button type="button" class="sm" data-nudge="0,-0.5">Z−</button>',
        '  <button type="button" class="sm" data-nudge="0,0.5">Z+</button>',
        '  <button type="button" class="sm" data-nudge="-0.5,0">X−</button>',
        '  <button type="button" class="sm" data-nudge="0.5,0">X+</button>',
        '  <button type="button" class="sm warn" id="zs-alr-del-pt">Suppr.</button>',
        '</div>',
        '<div class="sec">Routes enregistrées</div>',
        '<select id="zs-alr-list" size="5"></select>',
        '<div class="btns">',
        '  <button type="button" id="zs-alr-edit">Éditer</button>',
        '  <button type="button" class="warn" id="zs-alr-delete">Supprimer</button>',
        '</div>',
        '<button type="button" class="warn" id="zs-alr-close" style="width:100%;margin-top:8px">Quitter (Échap)</button>',
        '<div class="status" id="zs-alr-status">Prêt.</div>',
      ].join('');
      document.body.appendChild(panel);
      this._panel = panel;
      this._bindPanelEvents();
    },

    _bindPanelEvents() {
      const p = this._panel;
      if (!p) return;
      p.querySelector('#zs-alr-new')?.addEventListener('click', () => {
        this._editingId = null;
        this._startPlacing();
      });
      p.querySelector('#zs-alr-aim')?.addEventListener('click', () => {
        ZS.requestPointerLock?.();
        this._setStatus('Visée FPS — Échap pour retrouver la souris');
      });
      p.querySelector('#zs-alr-cancel')?.addEventListener('click', () => this._stopPlacing());
      p.querySelector('#zs-alr-save')?.addEventListener('click', () => this._saveDraft());
      p.querySelector('#zs-alr-list')?.addEventListener('change', (e) => {
        this._selectedId = e.target.value || null;
      });
      p.querySelector('#zs-alr-edit')?.addEventListener('click', () => this._editSelected());
      p.querySelector('#zs-alr-delete')?.addEventListener('click', () => this._deleteSelected());
      p.querySelector('#zs-alr-close')?.addEventListener('click', () => this.exit());
      p.querySelector('#zs-alr-label')?.addEventListener('input', (e) => {
        this._draftLabel = e.target.value || '';
      });
      p.querySelector('#zs-alr-type')?.addEventListener('change', (e) => {
        this._draftType = e.target.value || 'dirt';
        this._updateLivePreview(true);
      });
      const onWidth = (v) => {
        if (!Number.isFinite(v)) return;
        this._draftWidth = Math.max(1, Math.min(16, v));
        const lbl = p.querySelector('#zs-alr-width-val');
        if (lbl) lbl.textContent = this._draftWidth.toFixed(1);
        this._updateLivePreview(true);
      };
      p.querySelector('#zs-alr-width')?.addEventListener('input', (e) => onWidth(Number(e.target.value)));
      p.querySelector('#zs-alr-smooth')?.addEventListener('change', (e) => {
        this._draftSmooth = !!e.target.checked;
      });
      p.querySelector('#zs-alr-visual')?.addEventListener('change', (e) => {
        this._draftVisual = !!e.target.checked;
      });
      p.querySelector('#zs-alr-barriers')?.addEventListener('change', (e) => {
        this._draftBarriers = !!e.target.checked;
      });
      p.querySelector('#zs-alr-pt-nudge')?.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('[data-nudge]');
        if (btn) {
          const [dx, dz] = btn.dataset.nudge.split(',').map(Number);
          this._nudgeSelectedPt(dx, dz);
          return;
        }
        if (e.target?.id === 'zs-alr-del-pt') this._deleteSelectedPt();
      });
      p.querySelector('#zs-alr-points')?.addEventListener('click', (e) => {
        const row = e.target?.closest?.('.pt-row');
        if (!row) return;
        this._selectedPtIdx = Number(row.dataset.idx);
        this._renderPointList();
      });
      p.querySelector('#zs-alr-points')?.addEventListener('change', (e) => {
        const row = e.target?.closest?.('.pt-row');
        if (!row || !e.target.classList.contains('pt-coord')) return;
        const idx = Number(row.dataset.idx);
        const axis = e.target.dataset.axis;
        const v = Number(e.target.value);
        if (!Number.isFinite(v) || idx < 0 || idx >= this._draftPts.length) return;
        if (axis === 'x') this._draftPts[idx][0] = v;
        else this._draftPts[idx][1] = v;
        this._updateLivePreview(true);
      });
    },

    _syncPlaceButtons() {
      const placing = this._placing;
      this._panel?.querySelector('#zs-alr-cancel')?.classList.toggle('hidden', !placing);
      this._panel?.querySelector('#zs-alr-save')?.classList.toggle('hidden', !placing || this._draftPts.length < 2);
      const newBtn = this._panel?.querySelector('#zs-alr-new');
      if (newBtn) newBtn.disabled = placing && this._draftPts.length > 0;
      this._panel?.querySelector('#zs-alr-pt-nudge')?.classList.toggle('hidden', !placing || this._selectedPtIdx < 0);
      const cnt = this._panel?.querySelector('#zs-alr-pt-count');
      if (cnt) cnt.textContent = String(this._draftPts.length);
    },

    _startPlacing(pts) {
      this._placing = true;
      this._draftPts = Array.isArray(pts) ? pts.map((p) => p.slice()) : [];
      this._selectedPtIdx = this._draftPts.length ? this._draftPts.length - 1 : -1;
      this._syncPlaceButtons();
      this._renderPointList();
      this._updateLivePreview(true);
      this._setStatus(this._draftPts.length
        ? `Édition — ${this._draftPts.length} point(s)`
        : 'Clic gauche sur le sol = 1er point (cliquez le jeu si besoin)');
    },

    _stopPlacing() {
      this._placing = false;
      this._draftPts = [];
      this._editingId = null;
      this._selectedPtIdx = -1;
      this._clearPreview();
      this._renderPointList();
      this._syncPlaceButtons();
      this._setStatus('Trace annulée.');
    },

    _editSelected() {
      const id = this._selectedId || this._panel?.querySelector('#zs-alr-list')?.value;
      const road = this._roads.find((r) => r.id === id);
      if (!road) {
        this._setStatus('Sélectionnez une route.', 'err');
        return;
      }
      const p = this._panel;
      p.querySelector('#zs-alr-label').value = road.label || '';
      this._draftLabel = road.label || '';
      p.querySelector('#zs-alr-type').value = road.type || 'dirt';
      this._draftType = road.type || 'dirt';
      this._draftWidth = road.width ?? 2.6;
      p.querySelector('#zs-alr-width').value = String(this._draftWidth);
      p.querySelector('#zs-alr-width-val').textContent = this._draftWidth.toFixed(1);
      p.querySelector('#zs-alr-smooth').checked = road.smooth !== false;
      this._draftSmooth = road.smooth !== false;
      p.querySelector('#zs-alr-visual').checked = road.visual !== false;
      this._draftVisual = road.visual !== false;
      p.querySelector('#zs-alr-barriers').checked = !!road.barriers;
      this._draftBarriers = !!road.barriers;
      this._editingId = road.id;
      this._startPlacing(road.pts);
    },

    _renderPointList() {
      const box = this._panel?.querySelector('#zs-alr-points');
      if (!box) return;
      if (!this._draftPts.length) {
        box.innerHTML = '<p class="hint" style="margin:4px 0">Aucun point — visez et cliquez.</p>';
        return;
      }
      box.innerHTML = this._draftPts.map((pt, i) => {
        const sel = i === this._selectedPtIdx ? ' pt-row sel' : ' pt-row';
        return [
          `<div class="${sel.trim()}" data-idx="${i}">`,
          `<span>#${i + 1}</span>`,
          `<input type="number" class="pt-coord" data-axis="x" step="0.01" value="${pt[0]}">`,
          `<input type="number" class="pt-coord" data-axis="z" step="0.01" value="${pt[1]}">`,
          `<button type="button" class="sm warn pt-del" data-idx="${i}">×</button>`,
          '</div>',
        ].join('');
      }).join('');
      box.querySelectorAll('.pt-del').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const idx = Number(btn.dataset.idx);
          if (idx >= 0 && idx < this._draftPts.length) {
            this._draftPts.splice(idx, 1);
            this._selectedPtIdx = Math.min(idx, this._draftPts.length - 1);
            this._renderPointList();
            this._updateLivePreview(true);
          }
        });
      });
      this._syncPlaceButtons();
    },

    _nudgeSelectedPt(dx, dz) {
      const i = this._selectedPtIdx;
      if (i < 0 || i >= this._draftPts.length) return;
      this._draftPts[i][0] = Math.round((this._draftPts[i][0] + dx) * 100) / 100;
      this._draftPts[i][1] = Math.round((this._draftPts[i][1] + dz) * 100) / 100;
      this._renderPointList();
      this._updateLivePreview(true);
    },

    _deleteSelectedPt() {
      const i = this._selectedPtIdx;
      if (i < 0 || i >= this._draftPts.length) return;
      this._draftPts.splice(i, 1);
      this._selectedPtIdx = Math.min(i, this._draftPts.length - 1);
      this._renderPointList();
      this._updateLivePreview(true);
    },

    _clearPreview() {
      if (this._previewRoot) {
        ZS.AdminRoads?.disposePreviewGroup?.(this._previewRoot);
        this._previewRoot = null;
      }
    },

    _previewPath(cursorPt) {
      const pts = this._draftPts.map((p) => p.slice());
      if (cursorPt && Number.isFinite(cursorPt.x) && Number.isFinite(cursorPt.z)) {
        if (!pts.length) pts.push([cursorPt.x, cursorPt.z]);
        else pts.push([cursorPt.x, cursorPt.z]);
      }
      return pts.length >= 2 ? pts : null;
    },

    _updateLivePreview() {
      const scene = _scene();
      if (!scene || !this._placing) return;
      const cursor = _pickGround();
      const pathPts = this._previewPath(cursor);
      const color = TYPE_COLORS[this._draftType] || TYPE_COLORS.dirt;

      if (this._previewRoot) {
        ZS.AdminRoads?.disposePreviewGroup?.(this._previewRoot);
        this._previewRoot = null;
      }

      const grp = new THREE.Group();
      grp.name = '__alr_preview__';

      if (this._draftPts.length) {
        ZS.AdminRoads?.addPointMarkers?.(grp, this._draftPts, 0xff8844);
      }
      if (cursor && Number.isFinite(cursor.x)) {
        ZS.AdminRoads?.addCursorMarker?.(grp, cursor.x, cursor.z);
      }
      if (pathPts) {
        ZS.AdminRoads?.addPreviewRibbon?.(grp, pathPts, this._draftWidth, color, 0.42);
        ZS.AdminRoads?.addPreviewLine?.(grp, pathPts, 0xffffff, 0.85);
      } else if (this._draftPts.length === 1 && cursor) {
        ZS.AdminRoads?.addPreviewLine?.(grp, [
          this._draftPts[0],
          [cursor.x, cursor.z],
        ], 0xffffff, 0.7);
      }

      scene.add(grp);
      this._previewRoot = grp;
    },


    async _refreshList() {
      try {
        const res = await fetch('/api/admin/roads', {
          headers: { Authorization: 'Bearer ' + _token() },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Chargement routes');
        this._roads = json.roads || [];
        const sel = this._panel?.querySelector('#zs-alr-list');
        if (!sel) return;
        sel.innerHTML = this._roads.map((r) => {
          const lbl = r.label || r.id;
          return `<option value="${r.id}">${lbl} (${r.pts?.length || 0} pts, ${r.type}, ${r.width}m)</option>`;
        }).join('') || '<option value="">— aucune route —</option>';
      } catch (err) {
        this._setStatus(err.message || 'Erreur liste', 'err');
      }
    },

    async _saveDraft() {
      if (this._busy || this._draftPts.length < 2) return;
      const body = {
        label: this._draftLabel,
        pts: this._draftPts,
        width: this._draftWidth,
        type: this._draftType,
        smooth: this._draftSmooth,
        visual: this._draftVisual,
        barriers: this._draftBarriers,
      };
      this._busy = true;
      this._setStatus('Enregistrement…');
      try {
        const editingId = this._editingId;
        const res = await fetch(
          editingId
            ? `/api/admin/roads/${encodeURIComponent(editingId)}`
            : '/api/admin/roads',
          {
            method: editingId ? 'PATCH' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + _token(),
            },
            body: JSON.stringify(body),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec enregistrement');
        this._editingId = null;
        this._draftPts = [];
        this._placing = true;
        this._selectedPtIdx = -1;
        this._clearPreview();
        this._renderPointList();
        await this._refreshList();
        await ZS.AdminRoads?.reloadAndRefresh?.();
        ZS.UI?.showNotif?.('Route visible — F5 pour aplati terrain');
        this._setStatus('Enregistré et affiché. F5 pour fusion terrain si besoin.', 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur', 'err');
      } finally {
        this._busy = false;
        this._syncPlaceButtons();
      }
    },

    async _deleteSelected() {
      const id = this._selectedId || this._panel?.querySelector('#zs-alr-list')?.value;
      if (!id) {
        this._setStatus('Sélectionnez une route.', 'err');
        return;
      }
      if (!window.confirm(`Supprimer la route ${id} ?`)) return;
      this._busy = true;
      try {
        const res = await fetch(`/api/admin/roads/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + _token() },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec suppression');
        await this._refreshList();
        await ZS.AdminRoads?.reloadAndRefresh?.();
        this._setStatus('Route supprimée — F5 pour terrain.', 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur', 'err');
      } finally {
        this._busy = false;
      }
    },

    _setStatus(msg, kind) {
      this._syncPlaceButtons();
      const el = this._panel?.querySelector('#zs-alr-status');
      if (!el) return;
      el.textContent = msg;
      el.className = 'status' + (kind ? ' ' + kind : '');
    },
  };

  window.ZS = window.ZS || {};
  ZS.AdminLiveRoads = AdminLiveRoads;

}());
