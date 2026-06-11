// Édition décor monde en live — admin : catalogue, pose preview, calibrage, sync live.
(function () {
  'use strict';

  const PANEL_ID = 'zs-admin-live-decor';
  const PICK_DIST = 80;
  const PLACE_DIST = 80;
  const SAVE_DEBOUNCE_MS = 400;
  const PREVIEW_ID = '__ald_preview__';
  const ROT_WHEEL_STEP = Math.PI / 12;
  const ROT_KEY_STEP = Math.PI / 36;
  const SEARCH_DEBOUNCE_MS = 280;
  const SNAP_STEP = Math.PI / 12;
  const COPY_KEYS = [
    'prefabId', 'rotX', 'rotZ', 'rotY', 'scale', 'groundLift', 'baseY', 'buildLevel',
    'wreckTilt', 'wreckWheels', 'wreckSink', 'wreckVariant', 'wreckBurnt',
    'railLen', 'shackFloorY', 'treeSeed',
  ];

  const NUM_FIELDS = [
    ['x', 'X'],
    ['z', 'Z'],
    ['y', 'Y'],
    ['baseY', 'baseY'],
    ['rotY', 'rotY'],
    ['rotX', 'rotX'],
    ['rotZ', 'rotZ'],
    ['scale', 'échelle'],
    ['groundLift', 'groundLift'],
    ['buildLevel', 'niveau build'],
    ['wreckTilt', 'épave tilt'],
    ['wreckWheels', 'épave roues'],
    ['wreckSink', 'épave enfoncement'],
    ['railLen', 'long. rail'],
    ['shackFloorY', 'shack floor Y'],
  ];

  const SLIDER_CFG = {
    x: { span: 8, step: 0.02, numStep: 0.01, absMin: -2500, absMax: 2500 },
    z: { span: 8, step: 0.02, numStep: 0.01, absMin: -2500, absMax: 2500 },
    y: { span: 4, step: 0.01, numStep: 0.001, absMin: -500, absMax: 500 },
    baseY: { span: 4, step: 0.01, numStep: 0.001, absMin: -500, absMax: 500 },
    rotY: { span: 1.4, step: 0.005, numStep: 0.001, absMin: -6.29, absMax: 6.29 },
    rotX: { span: 0.8, step: 0.005, numStep: 0.001, absMin: -3.15, absMax: 3.15 },
    rotZ: { span: 0.8, step: 0.005, numStep: 0.001, absMin: -3.15, absMax: 3.15 },
    scale: { span: 2, step: 0.01, numStep: 0.001, absMin: 0.02, absMax: 24 },
    groundLift: { span: 1.2, step: 0.01, numStep: 0.001, absMin: -8, absMax: 8 },
    buildLevel: { span: 3, step: 1, numStep: 1, absMin: 0, absMax: 8 },
    wreckTilt: { span: 0.6, step: 0.01, numStep: 0.001, absMin: -2, absMax: 2 },
    wreckWheels: { span: 4, step: 1, numStep: 1, absMin: 0, absMax: 8 },
    wreckSink: { span: 0.8, step: 0.01, numStep: 0.001, absMin: -3, absMax: 3 },
    railLen: { span: 6, step: 0.05, numStep: 0.01, absMin: 0.5, absMax: 80 },
    shackFloorY: { span: 2, step: 0.01, numStep: 0.001, absMin: -20, absMax: 20 },
  };

  function _sliderBounds(key, value) {
    const cfg = SLIDER_CFG[key] || { span: 4, step: 0.01, absMin: -500, absMax: 500 };
    const v = Number.isFinite(value) ? value : 0;
    const half = cfg.span * 0.5;
    let min = Math.max(cfg.absMin, v - half);
    let max = Math.min(cfg.absMax, v + half);
    if (max - min < cfg.step * 4) {
      min = cfg.absMin;
      max = cfg.absMax;
    }
    return { min, max, step: cfg.step, numStep: cfg.numStep ?? cfg.step, absMin: cfg.absMin, absMax: cfg.absMax, span: cfg.span };
  }

  function _clampField(key, value) {
    const cfg = SLIDER_CFG[key];
    if (!Number.isFinite(value)) return 0;
    if (!cfg) return value;
    return Math.max(cfg.absMin, Math.min(cfg.absMax, value));
  }

  function _defaultScale(prefabId) {
    if (prefabId === 'spawn_border_log') return 2;
    return 1;
  }

  function _scene() {
    return ZS._gfxRuntime?.scene || null;
  }

  const AdminLiveDecor = {
    active: false,
    _panel: null,
    _banner: null,
    _helper: null,
    _selectedId: null,
    _item: null,
    _immutable: false,
    _saveTimer: null,
    _saving: false,
    _tab: 'place',
    _catalog: [],
    _categories: {},
    _catalogLoaded: false,
    _placePrefabId: null,
    _placeRotY: 0,
    _placeScale: 1,
    _placeMode: null,
    _duplicateSource: null,
    _moveDecorId: null,
    _moveHiddenRoot: null,
    _patchUndoBefore: null,
    _searchTimer: null,
    _searchBusy: false,
    _previewRoot: null,
    _previewPrefabId: null,
    _placeBusy: false,
    _clipboard: null,
    _multiIds: null,
    _angleSnap: true,
    _batchMoveSnapshots: null,
    _batchMoveOrigin: null,
    _batchHiddenRoots: null,

    _token() {
      return localStorage.getItem('zombie_token') || '';
    },

    _isAdmin() {
      if (ZS.AdminAuth?.hasPerm?.('decor.edit')) return true;
      if (ZS.AdminHub?.hasPerm?.('decor.edit')) return true;
      return false;
    },

    _canDelete() {
      if (ZS.AdminAuth?.hasPerm?.('decor.delete')) return true;
      if (ZS.AdminHub?.hasPerm?.('decor.delete')) return true;
      return false;
    },

    isActive() {
      return !!this.active;
    },

    isPlacing() {
      return this._placeMode === 'create' || this._placeMode === 'move'
        || this._placeMode === 'duplicate' || this._placeMode === 'batch-move';
    },

    isMoving() {
      return this._placeMode === 'move';
    },

    startPlacement(prefabId) {
      this._startPlacement(prefabId);
    },

    _snapRotY(rotY) {
      if (!this._angleSnap) return rotY;
      return Math.round(rotY / SNAP_STEP) * SNAP_STEP;
    },

    tryRotateOnKey(code) {
      if (!this.isPlacing()) return false;
      if (code === 'KeyQ') {
        this._placeRotY = this._snapRotY(this._placeRotY - ROT_KEY_STEP);
        this._updatePreview(true);
        return true;
      }
      if (code === 'KeyE') {
        this._placeRotY = this._snapRotY(this._placeRotY + ROT_KEY_STEP);
        this._updatePreview(true);
        return true;
      }
      return false;
    },

    tryCopyOnKey() {
      if (!this.active || !this._item?.prefabId) return false;
      this._clipboard = this._copyDecorSnapshot(this._item);
      ZS.AdminDecorHistory?.push?.('copy', this._item.prefabId);
      this._setStatus(`Copié : ${this._item.prefabId} (Ctrl+V coller)`, 'ok');
      return true;
    },

    tryPasteOnKey() {
      if (!this.active || this.isPlacing()) return false;
      if (!this._clipboard?.prefabId) {
        this._setStatus('Presse-papiers vide — Ctrl+C sur un décor', 'warn');
        return true;
      }
      this._startPaste();
      return true;
    },

    _copyDecorSnapshot(item) {
      const snap = {};
      for (const k of COPY_KEYS) {
        if (item[k] != null && item[k] !== '') snap[k] = item[k];
      }
      return snap;
    },

    _startPaste() {
      const prefabId = this._clipboard.prefabId;
      if (!ZS.listDecorPrefabs?.().includes(prefabId)) {
        this._setStatus(`Prefab inconnu : ${prefabId}`, 'err');
        return;
      }
      this._cancelPlacement();
      this._placeMode = 'duplicate';
      this._duplicateSource = { ...this._clipboard };
      this._moveDecorId = null;
      this._placePrefabId = prefabId;
      this._placeRotY = Number.isFinite(this._clipboard.rotY) ? this._clipboard.rotY : 0;
      this._placeScale = Number.isFinite(this._clipboard.scale) ? this._clipboard.scale : 1;
      this._switchTab('place');
      this._clearHelper();
      this._updatePreview(true);
      this._updateBannerPlace();
      ZS.AdminDecorHistory?.push?.('paste', prefabId);
      this._setStatus(`Collage : ${prefabId} — clic gauche poser`);
    },

    async tryUndo() {
      if (!ZS.AdminDecorUndo?.hasUndo?.()) {
        this._setStatus('Rien à annuler.', 'warn');
        return true;
      }
      this._setStatus('Annulation…');
      const res = await ZS.AdminDecorUndo.undo();
      if (!res.ok) {
        this._setStatus(res.error || 'Undo impossible', 'err');
        return true;
      }
      if (res.item?.id) await this._selectDecor(res.item.id);
      else this._deselect();
      const rest = res.remaining != null ? ` · ${res.remaining} restant(s)` : '';
      this._setStatus((res.message || 'Annulé') + rest, 'ok');
      return true;
    },

    async tryRedo() {
      if (!ZS.AdminDecorUndo?.hasRedo?.()) {
        this._setStatus('Rien à refaire.', 'warn');
        return true;
      }
      this._setStatus('Refaire…');
      const res = await ZS.AdminDecorUndo.redo();
      if (!res.ok) {
        this._setStatus(res.error || 'Redo impossible', 'err');
        return true;
      }
      if (res.item?.id) await this._selectDecor(res.item.id);
      const rest = res.redoRemaining != null ? ` · redo×${res.redoRemaining}` : '';
      this._setStatus((res.message || 'Refait') + rest, 'ok');
      return true;
    },

    enter() {
      if (!this._isAdmin()) {
        ZS.UI?.showNotif?.('Édition monde : droits admin requis');
        return;
      }
      if (this.active) return;
      this.active = true;
      this._multiIds = new Set();
      this._multiHelpers = [];
      window.ZS._adminLiveDecorActive = true;
      this._buildBanner();
      this._buildPanel();
      this._loadCatalog();
      this._setStatus('Mode actif — choisissez un prefab ou visez un décor (E).');
      ZS.requestPointerLock?.();
    },

    exit() {
      if (!this.active) return;
      this.active = false;
      window.ZS._adminLiveDecorActive = false;
      this._clearSaveTimer();
      this._cancelPlacement();
      this._clearHelper();
      this._clearMultiHelpers();
      this._multiIds = null;
      this._selectedId = null;
      this._item = null;
      if (this._panel?.parent) this._panel.parent.removeChild(this._panel);
      this._panel = null;
      document.getElementById(PANEL_ID)?.remove();
      if (this._banner?.parent) this._banner.parent.removeChild(this._banner);
      this._banner = null;
      document.getElementById('zs-admin-live-banner')?.remove();
      ZS.onUiPanelClose?.();
    },

    tryPickOnE(opts) {
      if (!this.active || !this._isAdmin()) return false;
      const hit = ZS.pickAdminDecorRay?.(PICK_DIST);
      const hitId = hit?.decorId;
      if (!hitId || hitId === PREVIEW_ID) {
        if (this.isPlacing()) return false;
        this._setStatus('Aucun décor sous le réticule.');
        return true;
      }
      if (this.isPlacing()) this._cancelPlacement();
      if (opts?.shiftKey) {
        this._toggleMultiSelect(hitId);
        return true;
      }
      this._clearMultiSelection();
      this._selectDecor(hitId);
      return true;
    },

    _toggleMultiSelect(id) {
      if (!this._multiIds) this._multiIds = new Set();
      if (this._multiIds.has(id)) this._multiIds.delete(id);
      else this._multiIds.add(id);
      if (!this._selectedId) this._selectDecor(id);
      else this._syncMultiHelpers();
      const n = this._multiIds.size;
      this._setStatus(n > 1 ? `Sélection multiple : ${n} décors (Shift+E)` : 'Sélection multiple effacée');
      this._syncBatchButtons();
    },

    _clearMultiSelection() {
      if (!this._multiIds) return;
      this._multiIds.clear();
      this._clearMultiHelpers();
      this._syncBatchButtons();
    },

    _clearMultiHelpers() {
      for (const h of this._multiHelpers || []) {
        if (h?.parent) h.parent.remove(h);
      }
      this._multiHelpers = [];
    },

    _syncMultiHelpers() {
      this._clearMultiHelpers();
      if (!this._multiIds || this._multiIds.size < 2) return;
      this._multiHelpers = [];
      for (const id of this._multiIds) {
        if (id === this._selectedId) continue;
        const root = ZS.Network?.getDecorRoot?.(id);
        if (!root?.parent) continue;
        try {
          const h = new THREE.BoxHelper(root, 0x66aaff);
          root.parent.add(h);
          this._multiHelpers.push(h);
        } catch (_) { /* ignore */ }
      }
    },

    _syncBatchButtons() {
      const n = this._multiIds?.size || 0;
      const multi = n >= 2;
      const btn = this._panel?.querySelector('#zs-ald-batch-delete');
      if (btn) {
        btn.classList.toggle('hidden', !multi);
        btn.textContent = `Supprimer ${n} décors`;
      }
      const moveBtn = this._panel?.querySelector('#zs-ald-batch-move');
      if (moveBtn) moveBtn.classList.toggle('hidden', !multi);
      const nudge = this._panel?.querySelector('#zs-ald-batch-nudge');
      if (nudge) nudge.classList.toggle('hidden', !multi);
      const meta = this._panel?.querySelector('#zs-ald-meta');
      if (meta && n >= 2) {
        const extra = document.getElementById('zs-ald-multi-hint');
        if (!extra) {
          const el = document.createElement('div');
          el.id = 'zs-ald-multi-hint';
          el.style.cssText = 'color:#8cf;margin-top:4px;font-size:11px;';
          meta.appendChild(el);
        }
        const hint = document.getElementById('zs-ald-multi-hint');
        if (hint) hint.textContent = `+ ${n} en sélection multiple (Shift+E)`;
      } else {
        document.getElementById('zs-ald-multi-hint')?.remove();
      }
    },

    _snapshotDecor(id) {
      if (id === this._selectedId && this._item) return { ...this._item };
      const local = ZS.Network?.getDecorData?.(id);
      return local ? { ...local, id } : null;
    },

    async _batchNudge(dx, dz) {
      const ids = this._multiIds ? [...this._multiIds] : [];
      if (ids.length < 2) return;
      const moves = [];
      for (const id of ids) {
        const snap = this._snapshotDecor(id);
        if (!snap || !Number.isFinite(snap.x) || !Number.isFinite(snap.z)) continue;
        const before = this._collectPatchFromItem(snap);
        const nx = snap.x + dx;
        const nz = snap.z + dz;
        const lift = Number.isFinite(snap.groundLift) ? snap.groundLift : 0;
        const gy = ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(nx, nz, { groundLift: lift })
          : snap.y;
        const after = {
          ...before,
          x: nx,
          z: nz,
          y: Number.isFinite(gy) ? gy : snap.y,
          baseY: Number.isFinite(gy) ? gy : snap.baseY,
        };
        moves.push({ id, before, after });
      }
      if (!moves.length) return;
      this._setStatus(`Décalage lot (${moves.length})…`);
      try {
        for (const m of moves) {
          const res = await fetch(`/api/admin/decor/${encodeURIComponent(m.id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + this._token(),
            },
            body: JSON.stringify({ patch: m.after }),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Échec lot');
        }
        ZS.AdminDecorUndo?.pushBatchPatch?.(moves);
        this._logHistory('patch', `lot Δ${dx},${dz} ×${moves.length}`);
        if (this._selectedId) await this._selectDecor(this._selectedId);
        this._syncMultiHelpers();
        this._setStatus(`Lot décalé de ${dx} m / ${dz} m`, 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur lot', 'err');
      }
    },

    _collectPatchFromItem(item) {
      const patch = {};
      for (const [key] of NUM_FIELDS) {
        const v = item[key];
        if (Number.isFinite(v)) patch[key] = v;
      }
      return patch;
    },

    _hideBatchSources() {
      this._batchHiddenRoots = [];
      const ids = this._batchMoveSnapshots ? [...this._batchMoveSnapshots.keys()] : [];
      for (const id of ids) {
        if (id === this._moveDecorId) continue;
        const root = ZS.Network?.getDecorRoot?.(id);
        if (root) {
          root.visible = false;
          this._batchHiddenRoots.push(root);
        }
      }
    },

    _restoreBatchSources() {
      for (const root of this._batchHiddenRoots || []) {
        if (root) root.visible = true;
      }
      this._batchHiddenRoots = null;
    },

    _startBatchMoveVisual() {
      const ids = this._multiIds ? [...this._multiIds] : [];
      if (ids.length < 2 || !this._item?.prefabId) {
        this._setStatus('Sélectionnez 2+ décors (Shift+E).', 'warn');
        return;
      }
      this._batchMoveSnapshots = new Map();
      for (const id of ids) {
        const snap = this._snapshotDecor(id);
        if (snap) this._batchMoveSnapshots.set(id, this._collectPatchFromItem(snap));
      }
      this._batchMoveOrigin = { x: this._item.x, z: this._item.z };
      this._clearPreview();
      this._placeMode = 'batch-move';
      this._moveDecorId = this._selectedId;
      this._placePrefabId = this._item.prefabId;
      this._placeRotY = Number.isFinite(this._item.rotY) ? this._item.rotY : 0;
      this._placeScale = Number.isFinite(this._item.scale) ? this._item.scale : 1;
      this._hideMoveSource();
      this._hideBatchSources();
      this._clearHelper();
      this._updatePreview(true);
      this._updateBannerPlace();
      this._setStatus('Déplacement lot — visez la nouvelle position du décor principal · clic gauche');
    },

    async _confirmBatchMove() {
      if (this._placeMode !== 'batch-move' || !this._batchMoveSnapshots || !this._batchMoveOrigin) return;
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST);
      if (!pt) return;
      const dx = pt.x - this._batchMoveOrigin.x;
      const dz = pt.z - this._batchMoveOrigin.z;
      if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) {
        this._setStatus('Déplacement négligeable.', 'warn');
        return;
      }
      this._placeBusy = true;
      const moves = [];
      try {
        for (const [id, before] of this._batchMoveSnapshots) {
          const nx = before.x + dx;
          const nz = before.z + dz;
          const lift = Number.isFinite(before.groundLift) ? before.groundLift : 0;
          const gy = ZS.getDecorGroundHeight
            ? ZS.getDecorGroundHeight(nx, nz, { groundLift: lift })
            : before.y;
          const after = {
            ...before,
            x: nx,
            z: nz,
            rotY: id === this._moveDecorId ? this._placeRotY : before.rotY,
            y: Number.isFinite(gy) ? gy : before.y,
            baseY: Number.isFinite(gy) ? gy : before.baseY,
          };
          moves.push({ id, before, after });
        }
        for (const m of moves) {
          const res = await fetch(`/api/admin/decor/${encodeURIComponent(m.id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + this._token(),
            },
            body: JSON.stringify({ patch: m.after }),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Échec lot');
        }
        ZS.AdminDecorUndo?.pushBatchPatch?.(moves);
        this._logHistory('patch', `lot move ×${moves.length}`);
        this._restoreMoveSource();
        this._restoreBatchSources();
        this._placeMode = null;
        this._batchMoveSnapshots = null;
        this._batchMoveOrigin = null;
        this._clearPreview();
        if (this._selectedId) await this._selectDecor(this._selectedId);
        this._syncMultiHelpers();
        this._setStatus(`Lot déplacé (${moves.length} décors)`, 'ok');
      } catch (err) {
        this._restoreMoveSource();
        this._restoreBatchSources();
        this._setStatus(err.message || 'Erreur déplacement lot', 'err');
      } finally {
        this._placeBusy = false;
        this._updateBannerPlace();
      }
    },

    async _batchDeleteSelected() {
      const ids = this._multiIds ? [...this._multiIds] : [];
      if (ids.length < 2) return;
      if (!window.confirm(`Supprimer ${ids.length} décors ?`)) return;
      this._setStatus(`Suppression ${ids.length}…`);
      let ok = 0;
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + this._token() },
          });
          if (res.ok) ok += 1;
        } catch (_) { /* ignore */ }
      }
      ZS.AdminDecorHistory?.push?.('multi_delete', `${ok}/${ids.length}`);
      this._clearMultiSelection();
      this._deselect();
      this._setStatus(`${ok} décor(s) supprimé(s).`, ok ? 'ok' : 'err');
    },

    async _pulseSearchResult(x, z) {
      const pulse = () => {
        window.AdminWorldMap?.centerOnWorld?.(x, z, 3.8);
        (ZS.AdminWorldMapOverlay?.pulseAt || window.AdminWorldMap?.pulseAt)?.(x, z);
      };
      if (ZS.AdminWorldMapOverlay?.isOpen?.()) {
        pulse();
        return;
      }
      try {
        await ZS.AdminWorldMapOverlay?.open?.();
        setTimeout(pulse, 350);
      } catch (_) {
        ZS.UI?.showNotif?.(`Position : ${x.toFixed(1)}, ${z.toFixed(1)}`);
      }
    },

    tryPlaceOnClick() {
      if (!this.isPlacing() || this._placeBusy) return false;
      if (this._placeMode === 'batch-move') this._confirmBatchMove();
      else if (this._placeMode === 'move') this._confirmMove();
      else this._confirmPlacement();
      return true;
    },

    tryCancelOnRightClick() {
      if (!this.isPlacing()) return false;
      const wasMove = this._placeMode === 'move';
      this._cancelPlacement();
      this._setStatus(wasMove ? 'Déplacement annulé.' : 'Pose annulée.');
      return true;
    },

    onWheel(e) {
      if (!this.isPlacing()) return false;
      const delta = e.deltaY > 0 ? -1 : 1;
      this._placeRotY = this._snapRotY(this._placeRotY + delta * ROT_WHEEL_STEP);
      this._updatePreview(true);
      return true;
    },

    tick() {
      if (!this.active || !this.isPlacing()) return;
      this._updatePreview(false);
    },

    async _loadCatalog() {
      if (this._catalogLoaded) return;
      try {
        const res = await fetch('/api/admin/prefab-catalog', {
          headers: { Authorization: 'Bearer ' + this._token() },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Catalogue indisponible');
        this._catalog = (json.prefabs || []).slice().sort((a, b) => {
          const ca = a.category || 'autre';
          const cb = b.category || 'autre';
          if (ca !== cb) return ca.localeCompare(cb);
          return (a.label || a.id).localeCompare(b.label || b.id);
        });
        this._categories = json.categories || {};
        this._catalogLoaded = true;
        this._renderCatalogOptions();
      } catch (err) {
        this._setStatus(err.message || 'Catalogue introuvable', 'err');
      }
    },

    _filteredCatalog() {
      const panel = this._panel;
      const q = (panel?.querySelector('#zs-ald-cat-search')?.value || '').trim().toLowerCase();
      const cat = panel?.querySelector('#zs-ald-cat-category')?.value || '';
      return this._catalog.filter((p) => {
        if (cat && p.category !== cat) return false;
        if (!q) return true;
        const hay = `${p.id} ${p.label || ''} ${p.desc || ''}`.toLowerCase();
        return hay.includes(q);
      });
    },

    _renderCatalogOptions() {
      const sel = this._panel?.querySelector('#zs-ald-cat-prefab');
      const catSel = this._panel?.querySelector('#zs-ald-cat-category');
      if (!sel) return;

      if (catSel && !catSel.dataset.bound) {
        catSel.dataset.bound = '1';
        const cats = new Set(this._catalog.map((p) => p.category || 'autre'));
        for (const id of [...cats].sort()) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = this._categories[id] || id;
          catSel.appendChild(opt);
        }
        catSel.addEventListener('change', () => this._renderCatalogOptions());
      }

      const list = this._filteredCatalog();
      const prev = sel.value;
      sel.innerHTML = list.map((p) => {
        const label = p.label || p.id;
        const cat = this._categories[p.category] || p.category || '';
        return `<option value="${p.id}">${label} (${cat})</option>`;
      }).join('');
      if (prev && list.some((p) => p.id === prev)) sel.value = prev;
      else if (list.length) sel.value = list[0].id;
      this._updateCatalogDesc();
    },

    _updateCatalogDesc() {
      const sel = this._panel?.querySelector('#zs-ald-cat-prefab');
      const desc = this._panel?.querySelector('#zs-ald-cat-desc');
      if (!sel || !desc) return;
      const entry = this._catalog.find((p) => p.id === sel.value);
      if (!entry) {
        desc.textContent = '';
        return;
      }
      const parts = [entry.desc || ''];
      if (entry.orientation) parts.push(`Orientation : ${entry.orientation}`);
      if (entry.notes) parts.push(entry.notes);
      desc.innerHTML = `<b>${entry.label || entry.id}</b><br>${parts.filter(Boolean).join(' · ')}`;
    },

    _switchTab(tab) {
      this._tab = ['edit', 'search', 'history'].includes(tab) ? tab : 'place';
      const panel = this._panel;
      if (!panel) return;
      panel.querySelector('#zs-ald-tab-place')?.classList.toggle('active', this._tab === 'place');
      panel.querySelector('#zs-ald-tab-edit')?.classList.toggle('active', this._tab === 'edit');
      panel.querySelector('#zs-ald-tab-search')?.classList.toggle('active', this._tab === 'search');
      panel.querySelector('#zs-ald-tab-history')?.classList.toggle('active', this._tab === 'history');
      panel.querySelector('#zs-ald-place-pane')?.classList.toggle('hidden', this._tab !== 'place');
      panel.querySelector('#zs-ald-edit-pane')?.classList.toggle('hidden', this._tab !== 'edit');
      panel.querySelector('#zs-ald-search-pane')?.classList.toggle('hidden', this._tab !== 'search');
      panel.querySelector('#zs-ald-history-pane')?.classList.toggle('hidden', this._tab !== 'history');
      if (this._tab === 'search') this._scheduleSearch();
      if (this._tab === 'history') ZS.AdminDecorHistory?.render?.(panel.querySelector('#zs-ald-history-list'));
    },

    _logHistory(type, detail) {
      ZS.AdminDecorHistory?.push?.(type, detail);
    },

    _scheduleSearch() {
      if (this._searchTimer != null) clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this._runSearch(), SEARCH_DEBOUNCE_MS);
    },

    async _runSearch() {
      const panel = this._panel;
      const list = panel?.querySelector('#zs-ald-search-results');
      if (!list || this._searchBusy) return;
      const q = (panel.querySelector('#zs-ald-search-q')?.value || '').trim();
      const layer = panel.querySelector('#zs-ald-search-layer')?.value || '';
      this._searchBusy = true;
      list.innerHTML = '<div class="hint">Recherche…</div>';
      try {
        const params = new URLSearchParams({ limit: '40' });
        if (q) params.set('q', q);
        if (layer) params.set('layer', layer);
        const res = await fetch(`/api/admin/decor/search?${params}`, {
          headers: { Authorization: 'Bearer ' + this._token() },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Recherche impossible');
        const rows = json.results || [];
        if (!rows.length) {
          list.innerHTML = '<div class="hint">Aucun résultat.</div>';
          return;
        }
        list.innerHTML = rows.map((r) => {
          const label = r.prefabId || r.type || r.id;
          return [
            `<div class="search-row" data-id="${r.id}">`,
            `<div><b>${label}</b><br><span class="search-meta">${r.layer || '—'} · ${r.x?.toFixed?.(1) ?? r.x}, ${r.z?.toFixed?.(1) ?? r.z}</span></div>`,
            '<div class="search-btns">',
            `<button type="button" class="search-tp" data-id="${r.id}" data-x="${r.x}" data-z="${r.z}">TP</button>`,
            `<button type="button" class="search-edit" data-id="${r.id}" data-x="${r.x}" data-z="${r.z}">Éditer</button>`,
            '</div></div>',
          ].join('');
        }).join('');
        if (json.truncated) {
          list.innerHTML += '<div class="hint">Liste tronquée — affinez la recherche.</div>';
        }
      } catch (err) {
        list.innerHTML = `<div class="hint" style="color:#f88">${err.message || 'Erreur'}</div>`;
      } finally {
        this._searchBusy = false;
      }
    },

    _startPlacement(prefabId) {
      if (!prefabId || !ZS.spawnDecorPrefab) return;
      if (!ZS.listDecorPrefabs?.().includes(prefabId)) {
        this._setStatus(`Prefab inconnu côté client : ${prefabId}`, 'err');
        return;
      }
      this._cancelPlacement();
      this._placeMode = 'create';
      this._moveDecorId = null;
      this._placePrefabId = prefabId;
      this._placeScale = _defaultScale(prefabId);
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST) || { rotY: 0 };
      this._placeRotY = pt.rotY || 0;
      this._switchTab('place');
      this._clearHelper();
      this._selectedId = null;
      this._item = null;
      this._renderEditEmpty();
      this._updatePreview(true);
      this._updateBannerPlace();
      this._setStatus(`Preview : ${prefabId} — clic gauche poser · molette tourner · clic droit annuler`);
    },

    _startDuplicate() {
      if (!this._selectedId || !this._item?.prefabId || this._immutable) {
        this._setStatus('Sélectionnez d\'abord un décor (E).', 'warn');
        return;
      }
      const prefabId = this._item.prefabId;
      if (!ZS.listDecorPrefabs?.().includes(prefabId)) {
        this._setStatus(`Prefab non prévisualisable : ${prefabId}`, 'err');
        return;
      }
      this._cancelPlacement();
      this._placeMode = 'duplicate';
      this._duplicateSource = { ...this._item };
      this._moveDecorId = null;
      this._placePrefabId = prefabId;
      this._placeRotY = Number.isFinite(this._item.rotY) ? this._item.rotY : 0;
      this._placeScale = Number.isFinite(this._item.scale) ? this._item.scale : 1;
      this._switchTab('place');
      this._clearHelper();
      this._updatePreview(true);
      this._updateBannerPlace();
      this._setStatus('Duplication — clic gauche poser la copie · Q/E ou molette tourner');
    },

    _startMoveVisual() {
      if (!this._selectedId || !this._item?.prefabId || this._immutable) {
        this._setStatus('Sélectionnez d\'abord un décor (E).', 'warn');
        return;
      }
      const prefabId = this._item.prefabId;
      if (!ZS.listDecorPrefabs?.().includes(prefabId)) {
        this._setStatus(`Prefab non prévisualisable : ${prefabId}`, 'err');
        return;
      }
      this._cancelPlacement();
      this._placeMode = 'move';
      this._moveDecorId = this._selectedId;
      this._placePrefabId = prefabId;
      this._placeRotY = Number.isFinite(this._item.rotY) ? this._item.rotY : 0;
      this._placeScale = Number.isFinite(this._item.scale) ? this._item.scale : 1;
      this._hideMoveSource();
      this._clearHelper();
      this._updatePreview(true);
      this._updateBannerPlace();
      this._setStatus('Déplacement visuel — marchez, visez la nouvelle position, clic gauche valider.');
    },

    _hideMoveSource() {
      const root = ZS.Network?.getDecorRoot?.(this._moveDecorId);
      if (root) {
        root.visible = false;
        this._moveHiddenRoot = root;
      }
    },

    _restoreMoveSource() {
      if (this._moveHiddenRoot) {
        this._moveHiddenRoot.visible = true;
        this._moveHiddenRoot = null;
      }
    },

    _cancelPlacement() {
      this._restoreMoveSource();
      this._restoreBatchSources();
      this._batchMoveSnapshots = null;
      this._batchMoveOrigin = null;
      this._placeMode = null;
      this._duplicateSource = null;
      this._moveDecorId = null;
      this._placePrefabId = null;
      this._clearPreview();
      if (this._selectedId && !this._helper) {
        const root = ZS.Network?.getDecorRoot?.(this._selectedId);
        if (root?.parent) {
          try {
            this._helper = new THREE.BoxHelper(root, 0xffcc44);
            root.parent.add(this._helper);
          } catch (_) { /* ignore */ }
        }
      }
      this._syncMoveButton();
      this._updateBannerPlace();
    },

    _clearPreview() {
      if (this._previewRoot?.parent) this._previewRoot.parent.remove(this._previewRoot);
      this._previewRoot = null;
      this._previewPrefabId = null;
    },

    _applyPreviewGhost(root, mode) {
      if (!root) return;
      const emissive = mode === 'move' ? 0x4488ff : mode === 'duplicate' ? 0xcc88ff : 0x44cc66;
      const opacity = mode === 'move' ? 0.55 : mode === 'duplicate' ? 0.5 : 0.48;
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (!o.material.userData?._aldGhost) {
          o.material = o.material.clone();
          o.material.userData = { ...(o.material.userData || {}), _aldGhost: true };
        }
        o.material.transparent = true;
        o.material.opacity = opacity;
        o.material.depthWrite = false;
        if (o.material.emissive) {
          o.material.emissive.setHex(emissive);
          o.material.emissiveIntensity = 0.35;
        }
        o.castShadow = false;
      });
    },

    _updatePreview(forceRebuild) {
      const prefabId = this._placePrefabId;
      if (!prefabId || !this.isPlacing()) return;
      const scene = _scene();
      if (!scene) return;
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST);
      if (!pt) return;

      const rebuild = forceRebuild || this._previewPrefabId !== prefabId || !this._previewRoot?.parent;
      if (rebuild) {
        this._clearPreview();
        const root = ZS.spawnDecorPrefab(scene, prefabId, pt.x, 0, pt.z, {
          rotY: this._placeRotY,
          scale: this._placeScale,
          decorId: PREVIEW_ID,
          collide: false,
        });
        if (!root) {
          this._setStatus(`Impossible de prévisualiser ${prefabId}`, 'err');
          this._cancelPlacement();
          return;
        }
        const ghostMode = this._placeMode === 'batch-move' ? 'move' : this._placeMode;
        this._applyPreviewGhost(root, ghostMode);
        this._previewRoot = root;
        this._previewPrefabId = prefabId;
      }

      const root = this._previewRoot;
      if (!root) return;
      const src = this._placeMode === 'move' ? this._item : this._duplicateSource;
      const lift = src && Number.isFinite(src.groundLift) ? src.groundLift : 0;
      const gy = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(pt.x, pt.z, { groundLift: lift })
        : pt.y;
      root.position.set(pt.x, Number.isFinite(gy) ? gy : pt.y, pt.z);
      root.rotation.order = 'YXZ';
      const rotX = src && Number.isFinite(src.rotX) ? src.rotX : 0;
      const rotZ = src && Number.isFinite(src.rotZ) ? src.rotZ : 0;
      root.rotation.set(rotX, this._placeRotY, rotZ);
      root.scale.setScalar(this._placeScale);
    },

    _buildPlacementBody(pt) {
      const body = {
        prefabId: this._placePrefabId,
        x: pt.x,
        z: pt.z,
        rotY: this._placeRotY,
        scale: this._placeScale,
      };
      const src = this._duplicateSource;
      if (this._placeMode === 'duplicate' && src) {
        const copyKeys = [
          'rotX', 'rotZ', 'groundLift', 'baseY', 'buildLevel',
          'wreckTilt', 'wreckWheels', 'wreckSink', 'wreckVariant', 'wreckBurnt',
          'railLen', 'shackFloorY', 'treeSeed',
        ];
        for (const k of copyKeys) {
          if (src[k] != null && src[k] !== '') body[k] = src[k];
        }
      }
      return body;
    },

    _capturePatchUndo() {
      if (!this._patchUndoBefore && this._item) {
        this._patchUndoBefore = this._collectPatch();
      }
    },

    async _confirmMove() {
      if (this._placeMode !== 'move' || !this._moveDecorId || !this._item || this._placeBusy) return;
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST);
      if (!pt) return;
      this._placeBusy = true;
      const id = this._moveDecorId;
      const undoBefore = this._collectPatch();
      const lift = Number.isFinite(this._item.groundLift) ? this._item.groundLift : 0;
      const gy = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(pt.x, pt.z, { groundLift: lift })
        : pt.y;
      const patch = {
        x: pt.x,
        z: pt.z,
        rotY: this._placeRotY,
        baseY: Number.isFinite(gy) ? gy : pt.y,
        y: Number.isFinite(gy) ? gy : pt.y,
      };
      if (Number.isFinite(this._placeScale)) patch.scale = this._placeScale;
      this._setStatus('Enregistrement déplacement…');
      try {
        this._restoreMoveSource();
        Object.assign(this._item, patch);
        this._applyLocalPreview(this._item);
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this._token(),
          },
          body: JSON.stringify({ patch }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec déplacement');
        ZS.AdminDecorUndo?.pushPatch?.(id, undoBefore, this._collectPatch());
        this._placeMode = null;
        this._moveDecorId = null;
        this._placePrefabId = null;
        this._clearPreview();
        if (json.item) this._item = json.item;
        this._switchTab('edit');
        this._syncMoveButton();
        this._renderForm();
        const root = ZS.Network?.getDecorRoot?.(id);
        if (root?.parent && !this._helper) {
          try {
            this._helper = new THREE.BoxHelper(root, 0xffcc44);
            root.parent.add(this._helper);
          } catch (_) { /* ignore */ }
        }
        if (this._helper) this._helper.update();
        const changed = (json.changed || []).join(', ') || 'position';
        this._setStatus(`Déplacé — affinez dans le panneau (${changed})`, 'ok');
      } catch (err) {
        this._restoreMoveSource();
        this._setStatus(err.message || 'Erreur déplacement', 'err');
      } finally {
        this._placeBusy = false;
        this._updateBannerPlace();
      }
    },

    async _confirmPlacement() {
      if (!this._placePrefabId || this._placeBusy) return;
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST);
      if (!pt) return;
      this._placeBusy = true;
      this._setStatus(this._placeMode === 'duplicate' ? 'Duplication serveur…' : 'Création serveur…');
      const prefabId = this._placePrefabId;
      const body = this._buildPlacementBody(pt);
      try {
        const res = await fetch('/api/admin/decor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this._token(),
          },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec création');
        const wasDuplicate = this._placeMode === 'duplicate';
        const id = json.item?.id;
        if (id) ZS.AdminDecorUndo?.pushCreate?.(id);
        if (id) this._logHistory('create', `${prefabId} ${id.slice(0, 10)}…`);
        this._cancelPlacement();
        if (id) {
          await this._selectDecor(id);
          const verb = wasDuplicate ? 'Dupliqué' : 'Posé';
          this._setStatus(`${verb} : ${prefabId} (${id.slice(0, 10)}…)`, 'ok');
        } else {
          this._setStatus('Décor créé — resélectionnez avec E.', 'ok');
        }
      } catch (err) {
        this._setStatus(err.message || 'Erreur création', 'err');
      } finally {
        this._placeBusy = false;
      }
    },

    async _selectDecor(id) {
      this._cancelPlacement();
      this._patchUndoBefore = null;
      this._switchTab('edit');
      this._selectedId = id;
      this._clearHelper();
      const root = ZS.Network?.getDecorRoot?.(id);
      if (root?.parent) {
        try {
          this._helper = new THREE.BoxHelper(root, 0xffcc44);
          root.parent.add(this._helper);
        } catch (_) { /* ignore */ }
      }
      this._setStatus('Chargement…');
      try {
        const item = await this._fetchDecor(id);
        this._item = item;
        this._immutable = false;
        this._renderForm();
        this._syncMultiHelpers();
        this._syncBatchButtons();
        this._setStatus(`Cible : ${item.prefabId || '—'} (${id.slice(0, 10)}…)`);
      } catch (err) {
        const local = ZS.Network?.getDecorData?.(id);
        if (local) {
          this._item = { ...local, id };
          this._immutable = false;
          this._renderForm(true);
          this._setStatus('Données locales — sauvegarde serveur peut échouer.', 'warn');
        } else {
          this._item = null;
          this._renderEmpty(id, err?.message || 'Chargement impossible');
          this._setStatus(err?.message || 'Erreur chargement', 'err');
        }
      }
    },

    async _fetchDecor(id) {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
        headers: { Authorization: 'Bearer ' + this._token() },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Décor introuvable');
      this._immutable = !!json.immutable;
      return json.item;
    },

    _buildBanner() {
      if (this._banner?.parent) return;
      const el = document.createElement('div');
      el.id = 'zs-admin-live-banner';
      el.innerHTML = '<span id="zs-ald-banner-main">🎯 Édition décor</span><span class="sub" id="zs-ald-banner-sub">E cibler · F8 quitter · sync live</span>';
      document.body.appendChild(el);
      this._banner = el;
    },

    _updateBannerPlace() {
      const sub = document.getElementById('zs-ald-banner-sub');
      if (!sub) return;
      if (this._placeMode === 'batch-move') {
        sub.textContent = 'Déplacement lot — clic gauche valider · le groupe suit le décor principal';
      } else if (this._placeMode === 'move') {
        sub.textContent = 'Déplacement — clic gauche valider · Q/E ou molette rotation · clic droit annuler';
      } else if (this._placeMode === 'duplicate') {
        sub.textContent = 'Duplication — clic gauche poser copie · Q/E ou molette · clic droit annuler';
      } else if (this._placeMode === 'create') {
        sub.textContent = 'Pose — clic gauche poser · Q/E ou molette · clic droit annuler';
      } else {
        sub.textContent = 'Shift+E multi · Ctrl+C/V · Ctrl+Z/Y · T TP · F8 quitter';
      }
    },

    _buildPanel() {
      if (this._panel?.parent) return;
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML = [
        '<style>',
        `#${PANEL_ID}{position:fixed;top:0;right:0;width:min(380px,92vw);height:100vh;`,
        'background:rgba(10,14,22,0.95);color:#e8ecf4;font:12px/1.4 Consolas,Monaco,monospace;',
        'z-index:12950;overflow:auto;padding:10px 12px 20px;box-sizing:border-box;',
        'border-left:1px solid rgba(255,200,80,0.25);pointer-events:auto;}',
        `#${PANEL_ID} h2{margin:0 0 4px;font-size:14px;color:#ffd080;}`,
        `#${PANEL_ID} .hint{opacity:0.8;margin-bottom:8px;font-size:11px;line-height:1.35;}`,
        `#${PANEL_ID} .meta{font-size:11px;opacity:0.85;margin-bottom:10px;padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px;}`,
        `#${PANEL_ID} .sec{margin:10px 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.65;}`,
        `#${PANEL_ID} .row{display:grid;grid-template-columns:72px 1fr 58px;gap:6px;align-items:center;margin:4px 0;}`,
        `#${PANEL_ID} .row-fine{font-size:10px;opacity:0.55;margin:-2px 0 6px 78px;}`,
        `#${PANEL_ID} label{font-size:11px;}`,
        `#${PANEL_ID} input[type=range]{width:100%;}`,
        `#${PANEL_ID} input[type=number]{width:58px;background:#1a2230;color:#fff;border:1px solid #445;padding:3px 4px;border-radius:3px;}`,
        `#${PANEL_ID} input[type=search],#${PANEL_ID} select{width:100%;background:#1a2230;color:#fff;border:1px solid #445;padding:5px 6px;border-radius:3px;font:inherit;box-sizing:border-box;}`,
        `#${PANEL_ID} select[multiple],#${PANEL_ID} select[size]{min-height:120px;}`,
        `#${PANEL_ID} .tabs{display:flex;gap:4px;margin:0 0 10px;}`,
        `#${PANEL_ID} .tab{flex:1;padding:6px 8px;border:none;border-radius:4px;cursor:pointer;font:inherit;background:#1a2a40;color:#aac;}`,
        `#${PANEL_ID} .tab.active{background:#3a5a8a;color:#fff;}`,
        `#${PANEL_ID} .hidden{display:none!important;}`,
        `#${PANEL_ID} .cat-desc{font-size:10px;opacity:0.75;margin:6px 0 8px;line-height:1.35;}`,
        `#${PANEL_ID} .btns{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;}`,
        `#${PANEL_ID} button{background:#2a4a7a;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font:inherit;}`,
        `#${PANEL_ID} button.primary{background:#3a6a3a;}`,
        `#${PANEL_ID} button.warn{background:#7a3a2a;}`,
        `#${PANEL_ID} .status{margin-top:8px;padding:6px 8px;background:rgba(40,60,80,0.45);border-radius:4px;min-height:28px;font-size:11px;}`,
        `#${PANEL_ID} .status.err{background:rgba(90,30,30,0.5);}`,
        `#${PANEL_ID} .status.warn{background:rgba(90,70,20,0.45);}`,
        `#${PANEL_ID} .status.ok{background:rgba(30,70,40,0.45);}`,
        `#${PANEL_ID} .search-row{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);}`,
        `#${PANEL_ID} .search-meta{font-size:10px;opacity:0.7;}`,
        `#${PANEL_ID} .search-btns{display:flex;gap:4px;flex-shrink:0;}`,
        `#${PANEL_ID} .search-btns button{padding:4px 8px;font-size:10px;}`,
        `#${PANEL_ID} .chest-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0;}`,
        `#${PANEL_ID} .chest-slot{font-size:10px;padding:4px;background:rgba(255,255,255,0.06);border-radius:3px;min-height:28px;}`,
        `#${PANEL_ID} .chest-meta{font-size:11px;margin:4px 0;}`,
        `#${PANEL_ID} .hist-row{font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);}`,
        `#${PANEL_ID} .hist-time{opacity:0.55;margin-right:6px;}`,
        `#${PANEL_ID} .snap-row{margin:8px 0;font-size:11px;}`,
        '#zs-admin-live-banner{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:12940;',
        'pointer-events:none;padding:6px 14px;border-radius:6px;background:rgba(20,28,40,0.88);',
        'border:1px solid rgba(255,200,80,0.35);font:12px/1.3 Consolas,monospace;color:#ffe8b0;',
        'display:flex;flex-direction:column;align-items:center;gap:2px;}',
        '#zs-admin-live-banner .sub{font-size:10px;opacity:0.75;}',
        '</style>',
        '<h2>Édition décor monde</h2>',
        '<div class="tabs">',
        '  <button type="button" class="tab active" id="zs-ald-tab-place">Poser</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-edit">Modifier</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-search">Chercher</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-history">Historique</button>',
        '</div>',
        '<div id="zs-ald-place-pane">',
        '  <p class="hint">Choisissez un prefab — preview sous le réticule — <b>clic gauche</b> pour poser, puis calibrez dans Modifier.</p>',
        '  <div class="sec">Catalogue</div>',
        '  <input type="search" id="zs-ald-cat-search" placeholder="Rechercher un prefab…" autocomplete="off">',
        '  <div style="margin:6px 0"><select id="zs-ald-cat-category"><option value="">Toutes catégories</option></select></div>',
        '  <select id="zs-ald-cat-prefab" size="8"></select>',
        '  <div class="cat-desc" id="zs-ald-cat-desc"></div>',
        '  <label class="snap-row"><input type="checkbox" id="zs-ald-angle-snap" checked> Snap rotation 15° (Q/E / molette)</label>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-start-place">Prévisualiser</button>',
        '    <button type="button" class="warn hidden" id="zs-ald-cancel-place">Annuler pose</button>',
        '  </div>',
        '</div>',
        '<div id="zs-ald-edit-pane" class="hidden">',
        '  <p class="hint"><b>E</b> cibler · <b>Shift+E</b> ajouter à la sélection · <b>Ctrl+C/V</b> copier/coller.</p>',
        '  <div class="meta" id="zs-ald-meta">Aucune cible — appuyez sur E</div>',
        '  <div id="zs-ald-fields"></div>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-move-visual">Déplacer visuellement</button>',
        '    <button type="button" class="primary" id="zs-ald-duplicate">Dupliquer</button>',
        '    <button type="button" class="primary" id="zs-ald-save">Enregistrer maintenant</button>',
        '    <button type="button" id="zs-ald-deselect">Désélectionner</button>',
        '    <button type="button" class="warn" id="zs-ald-delete">Supprimer</button>',
        '    <button type="button" class="warn hidden" id="zs-ald-batch-delete">Supprimer sélection</button>',
        '    <button type="button" class="primary hidden" id="zs-ald-batch-move">Déplacer lot</button>',
        '  </div>',
        '  <div class="btns hidden" id="zs-ald-batch-nudge">',
        '    <span style="font-size:10px;opacity:0.7;align-self:center">Nudge lot :</span>',
        '    <button type="button" data-nudge="0,-0.5">Z−</button>',
        '    <button type="button" data-nudge="0,0.5">Z+</button>',
        '    <button type="button" data-nudge="-0.5,0">X−</button>',
        '    <button type="button" data-nudge="0.5,0">X+</button>',
        '  </div>',
        '</div>',
        '<div id="zs-ald-search-pane" class="hidden">',
        '  <p class="hint">Recherche serveur (id, prefab, type). TP ou ouvrir dans Modifier.</p>',
        '  <input type="search" id="zs-ald-search-q" placeholder="Rechercher un décor…" autocomplete="off">',
        '  <select id="zs-ald-search-layer">',
        '    <option value="">Toutes couches</option>',
        '    <option value="building">Bâtiments</option>',
        '    <option value="storage">Coffres</option>',
        '    <option value="sign">Panneaux</option>',
        '    <option value="wreck">Épaves</option>',
        '    <option value="camp">Camp</option>',
        '    <option value="gate">Portes</option>',
        '  </select>',
        '  <div id="zs-ald-search-results"></div>',
        '</div>',
        '<div id="zs-ald-history-pane" class="hidden">',
        '  <p class="hint">Actions de cette session (mémoire locale).</p>',
        '  <div id="zs-ald-history-list"></div>',
        '</div>',
        '<div class="btns">',
        '  <button type="button" id="zs-ald-go-here">Aller ici (T)</button>',
        '  <button type="button" id="zs-ald-save-bm">Signet position</button>',
        '  <button type="button" id="zs-ald-undo">Annuler (Ctrl+Z)</button>',
        '  <button type="button" id="zs-ald-redo">Refaire (Ctrl+Y)</button>',
        '  <button type="button" class="warn" id="zs-ald-close">Quitter le mode</button>',
        '</div>',
        '<div class="status" id="zs-ald-status">Prêt.</div>',
      ].join('');
      document.body.appendChild(panel);
      this._panel = panel;
      this._tab = 'place';
      panel.querySelector('#zs-ald-tab-place')?.addEventListener('click', () => this._switchTab('place'));
      panel.querySelector('#zs-ald-tab-edit')?.addEventListener('click', () => this._switchTab('edit'));
      panel.querySelector('#zs-ald-tab-search')?.addEventListener('click', () => this._switchTab('search'));
      panel.querySelector('#zs-ald-tab-history')?.addEventListener('click', () => this._switchTab('history'));
      panel.querySelector('#zs-ald-angle-snap')?.addEventListener('change', (e) => {
        this._angleSnap = !!e.target.checked;
      });
      panel.querySelector('#zs-ald-search-q')?.addEventListener('input', () => this._scheduleSearch());
      panel.querySelector('#zs-ald-search-layer')?.addEventListener('change', () => this._scheduleSearch());
      panel.querySelector('#zs-ald-search-results')?.addEventListener('click', (e) => {
        const tp = e.target?.closest?.('.search-tp');
        if (tp) {
          const x = Number(tp.dataset.x);
          const z = Number(tp.dataset.z);
          if (Number.isFinite(x) && Number.isFinite(z)) {
            this._pulseSearchResult(x, z);
            ZS.AdminGoHere?.teleportTo?.(x, z);
          }
          return;
        }
        const edit = e.target?.closest?.('.search-edit');
        if (edit?.dataset?.id) {
          const x = Number(edit.dataset.x);
          const z = Number(edit.dataset.z);
          if (Number.isFinite(x) && Number.isFinite(z)) this._pulseSearchResult(x, z);
          this._selectDecor(edit.dataset.id);
        }
      });
      panel.querySelector('#zs-ald-cat-search')?.addEventListener('input', () => this._renderCatalogOptions());
      panel.querySelector('#zs-ald-cat-prefab')?.addEventListener('change', () => this._updateCatalogDesc());
      panel.querySelector('#zs-ald-start-place')?.addEventListener('click', () => {
        const id = panel.querySelector('#zs-ald-cat-prefab')?.value;
        if (id) this._startPlacement(id);
      });
      panel.querySelector('#zs-ald-cancel-place')?.addEventListener('click', () => {
        this._cancelPlacement();
        this._setStatus('Pose annulée.');
      });
      panel.querySelector('#zs-ald-save')?.addEventListener('click', () => this._saveNow());
      panel.querySelector('#zs-ald-move-visual')?.addEventListener('click', () => this._startMoveVisual());
      panel.querySelector('#zs-ald-duplicate')?.addEventListener('click', () => this._startDuplicate());
      panel.querySelector('#zs-ald-undo')?.addEventListener('click', () => this.tryUndo());
      panel.querySelector('#zs-ald-deselect')?.addEventListener('click', () => this._deselect());
      panel.querySelector('#zs-ald-delete')?.addEventListener('click', () => this._deleteSelected());
      panel.querySelector('#zs-ald-batch-delete')?.addEventListener('click', () => this._batchDeleteSelected());
      panel.querySelector('#zs-ald-batch-move')?.addEventListener('click', () => this._startBatchMoveVisual());
      panel.querySelector('#zs-ald-batch-nudge')?.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('[data-nudge]');
        if (!btn) return;
        const [dx, dz] = btn.dataset.nudge.split(',').map(Number);
        if (Number.isFinite(dx) && Number.isFinite(dz)) this._batchNudge(dx, dz);
      });
      panel.querySelector('#zs-ald-redo')?.addEventListener('click', () => this.tryRedo());
      panel.querySelector('#zs-ald-go-here')?.addEventListener('click', () => {
        ZS.AdminGoHere?.teleportToReticle?.();
      });
      panel.querySelector('#zs-ald-save-bm')?.addEventListener('click', () => {
        const name = window.prompt('Nom du signet :');
        if (!name) return;
        const res = ZS.AdminTpBookmarks?.addFromPlayer?.(name);
        if (res?.ok) this._setStatus(`Signet « ${res.bookmark.name} » sauvé`, 'ok');
        else this._setStatus(res?.error || 'Erreur signet', 'err');
      });
      panel.querySelector('#zs-ald-close')?.addEventListener('click', () => {
        this.exit();
      });
    },

    _syncPlaceButtons() {
      const cancel = this._panel?.querySelector('#zs-ald-cancel-place');
      if (cancel) {
        cancel.classList.toggle('hidden', !this.isPlacing());
        const labels = {
          move: 'Annuler déplacement',
          'batch-move': 'Annuler déplacement lot',
          duplicate: 'Annuler duplication',
          create: 'Annuler pose',
        };
        cancel.textContent = labels[this._placeMode] || 'Annuler pose';
      }
      this._syncMoveButton();
    },

    _syncMoveButton() {
      const btn = this._panel?.querySelector('#zs-ald-move-visual');
      if (!btn) return;
      const canMove = !!this._selectedId && !!this._item?.prefabId && !this._immutable && !this.isPlacing();
      btn.disabled = !canMove;
      const dupBtn = this._panel?.querySelector('#zs-ald-duplicate');
      if (dupBtn) dupBtn.disabled = !canMove;
    },

    _renderChestInspector(item) {
      const cap = Array.isArray(item.storage) ? item.storage.length : (item.storageSummary?.capacity || 0);
      const filled = item.storageSummary?.filled
        ?? (Array.isArray(item.storage) ? item.storage.filter(Boolean).length : 0);
      let slots = '';
      if (Array.isArray(item.storage) && cap) {
        const show = Math.min(cap, 20);
        for (let i = 0; i < show; i++) {
          const s = item.storage[i];
          slots += `<div class="chest-slot">${s ? `${s.type || '?'}×${s.qty || 1}` : '—'}</div>`;
        }
        if (cap > show) slots += `<div class="chest-slot">+${cap - show}</div>`;
      } else {
        slots = '<div class="hint">Contenu non chargé — rouvrez avec E.</div>';
      }
      return [
        `<div class="chest-meta">${filled}/${cap || '?'} slots occupés</div>`,
        `<div class="chest-grid">${slots}</div>`,
        '<div class="btns">',
        '  <button type="button" id="zs-ald-open-chest">Ouvrir en jeu</button>',
        '  <button type="button" class="warn" id="zs-ald-chest-clear">Vider</button>',
        '  <button type="button" id="zs-ald-chest-loot">Loot test</button>',
        '</div>',
      ].join('');
    },

    async _patchChestStorage(patch, label) {
      if (!this._selectedId || !this._item || this._saving) return;
      const id = this._selectedId;
      const before = Array.isArray(this._item.storage)
        ? JSON.parse(JSON.stringify(this._item.storage))
        : [];
      this._saving = true;
      this._setStatus(label || 'Mise à jour coffre…');
      try {
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this._token(),
          },
          body: JSON.stringify({ patch }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec coffre');
        if (json.changed?.includes('storage')) {
          ZS.AdminDecorUndo?.pushStorage?.(id, before, json.item?.storage || []);
        }
        if (json.item) {
          this._item = json.item;
          this._renderForm();
        }
        this._setStatus('Coffre synchronisé.', 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur coffre', 'err');
      } finally {
        this._saving = false;
      }
    },

    _buildTestLootGrid(cap) {
      const samples = [
        { type: 'food_eau_bouteille', qty: 2 },
        { type: 'food_sandwich', qty: 1 },
        { type: 'med_bandage', qty: 1 },
        { type: 'ammo_pistolet', qty: 12 },
        { type: 'res_bois_brut', qty: 5 },
      ];
      const grid = Array.from({ length: cap }, () => null);
      for (let i = 0; i < Math.min(samples.length, cap); i++) {
        grid[i] = { ...samples[i] };
      }
      return grid;
    },

    _deselect() {
      this._cancelPlacement();
      this._clearMultiSelection();
      this._patchUndoBefore = null;
      this._selectedId = null;
      this._item = null;
      this._immutable = false;
      this._clearHelper();
      this._renderEditEmpty();
      this._setStatus('Cible effacée — visez un autre décor (E) ou posez depuis le catalogue.');
    },

    _renderEditEmpty() {
      const meta = this._panel?.querySelector('#zs-ald-meta');
      const fields = this._panel?.querySelector('#zs-ald-fields');
      const delBtn = this._panel?.querySelector('#zs-ald-delete');
      if (meta) meta.textContent = 'Aucune cible — appuyez sur E';
      if (fields) fields.innerHTML = '';
      if (delBtn) delBtn.disabled = true;
      const moveBtn = this._panel?.querySelector('#zs-ald-move-visual');
      if (moveBtn) moveBtn.disabled = true;
    },

    _renderEmpty(id, msg) {
      const meta = this._panel?.querySelector('#zs-ald-meta');
      const fields = this._panel?.querySelector('#zs-ald-fields');
      if (meta) meta.innerHTML = `<b>id</b> ${id}<br><span style="color:#f88">${msg}</span>`;
      if (fields) fields.innerHTML = '';
    },

    _renderForm(localOnly) {
      const item = this._item;
      const meta = this._panel?.querySelector('#zs-ald-meta');
      const fields = this._panel?.querySelector('#zs-ald-fields');
      const delBtn = this._panel?.querySelector('#zs-ald-delete');
      if (!meta || !fields || !item) return;

      meta.innerHTML = [
        `<div><b>prefab</b> ${item.prefabId || '—'}</div>`,
        `<div><b>id</b> ${item.id || this._selectedId || '—'}</div>`,
        item.placementKey ? `<div><b>seed</b> ${item.placementKey}</div>` : '',
        localOnly ? '<div><b>note</b> données client uniquement</div>' : '',
        this._immutable ? '<div><b>note</b> décor seed — suppression limitée</div>' : '',
      ].filter(Boolean).join('');

      if (delBtn) delBtn.disabled = !this._selectedId || !this._canDelete() || this._immutable;
      this._syncMoveButton();

      const pid = item.prefabId || '';
      let html = '<div class="sec">Position</div>';
      for (const [key, label] of NUM_FIELDS.slice(0, 4)) {
        html += this._fieldRow(key, label, item[key]);
      }
      html += '<div class="sec">Orientation & taille</div>';
      for (const [key, label] of NUM_FIELDS.slice(4, 8)) {
        html += this._fieldRow(key, label, item[key]);
      }

      if (pid.startsWith('wreck_')) {
        html += '<div class="sec">Épave</div>';
        for (const [key, label] of NUM_FIELDS.filter(([k]) => k.startsWith('wreck'))) {
          html += this._fieldRow(key, label, item[key]);
        }
      }
      if (pid.startsWith('build_') || pid === 'storage_chest') {
        html += '<div class="sec">Construction</div>';
        html += this._fieldRow('buildLevel', 'niveau build', item.buildLevel);
        html += this._fieldRow('groundLift', 'groundLift', item.groundLift);
      }
      if (pid.startsWith('road_barrier_rail')) {
        html += '<div class="sec">Barrière</div>';
        html += this._fieldRow('railLen', 'long. rail', item.railLen);
      }
      if (pid === 'storage_chest' || pid === 'spawn_beach_starter_suitcase') {
        html += '<div class="sec">Coffre (lecture seule)</div>';
        html += this._renderChestInspector(item);
      }

      fields.innerHTML = html;
      fields.querySelector('#zs-ald-open-chest')?.addEventListener('click', () => {
        const id = item.id || this._selectedId;
        if (!id) return;
        ZS.Network?.requestStorageOpen?.(id);
        ZS.setDecorStorageState?.(id, true);
        this._setStatus('Coffre ouvert en jeu.', 'ok');
      });
      fields.querySelector('#zs-ald-chest-clear')?.addEventListener('click', () => {
        if (!window.confirm('Vider tout le coffre ?')) return;
        this._patchChestStorage({ clearStorage: true }, 'Vidage coffre…');
      });
      fields.querySelector('#zs-ald-chest-loot')?.addEventListener('click', () => {
        const cap = Array.isArray(item.storage) ? item.storage.length : 27;
        this._patchChestStorage({ storage: this._buildTestLootGrid(cap) }, 'Remplissage test…');
      });
      fields.querySelectorAll('.row[data-field]').forEach((row) => {
        const key = row.dataset.field;
        const slider = row.querySelector('input[type=range]');
        const num = row.querySelector('input[type=number]');
        const apply = (raw, opts) => {
          let v = Number(raw);
          if (!Number.isFinite(v) || !this._item) return;
          v = _clampField(key, v);
          this._capturePatchUndo();
          this._item[key] = v;
          if (slider) {
            this._recenterSlider(slider, key, v);
            slider.value = String(v);
          }
          if (num) num.value = String(v);
          this._applyLocalPreview(this._item);
          this._scheduleSave();
          if (opts?.fromNum) this._updateFineHint(row, key, v);
        };
        slider?.addEventListener('input', () => apply(slider.value));
        num?.addEventListener('input', () => apply(num.value, { fromNum: true }));
        num?.addEventListener('change', () => apply(num.value, { fromNum: true }));
      });
    },

    _recenterSlider(slider, key, value) {
      if (!slider) return;
      const b = _sliderBounds(key, value);
      slider.min = String(b.min);
      slider.max = String(b.max);
      slider.step = String(b.step);
    },

    _updateFineHint(row, key, value) {
      const hint = row.nextElementSibling;
      if (!hint?.classList?.contains('row-fine')) return;
      const b = _sliderBounds(key, value);
      hint.textContent = `curseur ±${(b.span * 0.5).toFixed(1)} autour de ${Number(value).toFixed(3)}`;
    },

    _fieldRow(key, label, value) {
      const v = _clampField(key, Number.isFinite(value) ? value : 0);
      const b = _sliderBounds(key, v);
      const spanHalf = (b.span * 0.5).toFixed(1);
      return [
        `<div class="row" data-field="${key}">`,
        `<label>${label}</label>`,
        `<input type="range" min="${b.min}" max="${b.max}" step="${b.step}" value="${v}">`,
        `<input type="number" step="${b.numStep}" value="${v}">`,
        '</div>',
        `<div class="row-fine">curseur ±${spanHalf} · num = exact</div>`,
      ].join('');
    },

    _syncInputsFromItem() {
      if (!this._panel || !this._item) return;
      const fields = this._panel.querySelector('#zs-ald-fields');
      if (!fields) return;
      fields.querySelectorAll('.row[data-field]').forEach((row) => {
        const key = row.dataset.field;
        const v = this._item[key];
        if (!Number.isFinite(v)) return;
        const slider = row.querySelector('input[type=range]');
        const num = row.querySelector('input[type=number]');
        if (slider) {
          this._recenterSlider(slider, key, v);
          slider.value = String(v);
        }
        if (num) num.value = String(v);
      });
    },

    _applyLocalPreview(item) {
      const id = item?.id || this._selectedId;
      if (!id) return;
      const entry = ZS.Network?.getDecorEntry?.(id);
      if (!entry?.root) return;
      Object.assign(entry.data, item);
      const root = entry.root;
      const y = Number.isFinite(item.y) ? item.y
        : (Number.isFinite(item.baseY) ? item.baseY : root.position.y);
      if (Number.isFinite(item.x)) root.position.x = item.x;
      if (Number.isFinite(item.z)) root.position.z = item.z;
      root.position.y = y;
      root.rotation.order = 'YXZ';
      root.rotation.set(item.rotX || 0, item.rotY || 0, item.rotZ || 0);
      const sc = Number.isFinite(item.scale) ? item.scale : 1;
      root.scale.setScalar(sc);
      if (root.userData.decorSpec) {
        root.userData.decorSpec.x = root.position.x;
        root.userData.decorSpec.z = root.position.z;
        root.userData.decorSpec.baseY = root.position.y;
        if (Number.isFinite(item.rotY)) root.userData.decorSpec.rotY = item.rotY;
      }
      if (this._helper) this._helper.update();
    },

    _collectPatch() {
      if (!this._item) return {};
      const patch = {};
      for (const [key] of NUM_FIELDS) {
        const v = this._item[key];
        if (Number.isFinite(v)) patch[key] = v;
      }
      return patch;
    },

    _clearSaveTimer() {
      if (this._saveTimer != null) {
        clearTimeout(this._saveTimer);
        this._saveTimer = null;
      }
    },

    _scheduleSave() {
      this._clearSaveTimer();
      this._saveTimer = setTimeout(() => this._saveNow(), SAVE_DEBOUNCE_MS);
      this._setStatus('Modification locale… envoi auto', 'warn');
    },

    async _saveNow() {
      this._clearSaveTimer();
      if (!this._selectedId || !this._item || this._saving) return;
      const patch = this._collectPatch();
      if (!Object.keys(patch).length) return;
      const undoBefore = this._patchUndoBefore;
      this._saving = true;
      this._setStatus('Envoi serveur…');
      try {
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(this._selectedId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this._token(),
          },
          body: JSON.stringify({ patch }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec sauvegarde');
        if (undoBefore && json.changed?.length) {
          ZS.AdminDecorUndo?.pushPatch?.(this._selectedId, undoBefore, this._collectPatch());
        }
        this._patchUndoBefore = null;
        if (json.item) {
          this._item = json.item;
          this._syncInputsFromItem();
        }
        const changed = (json.changed || []).join(', ') || 'ok';
        this._logHistory('patch', `${this._selectedId?.slice(0, 10)}… ${changed}`);
        this._setStatus(`Sync live — ${changed}`, 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur sauvegarde', 'err');
      } finally {
        this._saving = false;
      }
    },

    async _deleteSelected() {
      if (!this._selectedId || this._immutable) return;
      const id = this._selectedId;
      if (!window.confirm(`Supprimer le décor ${id} ?`)) return;
      const snapshot = JSON.parse(JSON.stringify(this._item || {}));
      this._setStatus('Suppression…');
      try {
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this._token() },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec suppression');
        ZS.AdminDecorUndo?.pushDelete?.(snapshot);
        this._logHistory('delete', id.slice(0, 12));
        this._deselect();
        this._setStatus('Décor supprimé.', 'ok');
      } catch (err) {
        this._setStatus(err.message || 'Erreur suppression', 'err');
      }
    },

    _clearHelper() {
      if (this._helper?.parent) this._helper.parent.remove(this._helper);
      this._helper = null;
    },

    _setStatus(msg, kind) {
      this._syncPlaceButtons();
      this._updateBannerPlace();
      const el = this._panel?.querySelector('#zs-ald-status');
      if (!el) return;
      const undoN = ZS.AdminDecorUndo?.count?.() || 0;
      const redoN = ZS.AdminDecorUndo?.redoCount?.() || 0;
      const suffix = (undoN > 0 ? ` · undo×${undoN}` : '') + (redoN > 0 ? ` · redo×${redoN}` : '');
      el.textContent = msg + suffix;
      el.className = 'status' + (kind ? ' ' + kind : '');
      const undoBtn = this._panel?.querySelector('#zs-ald-undo');
      if (undoBtn) undoBtn.disabled = undoN === 0;
      const redoBtn = this._panel?.querySelector('#zs-ald-redo');
      if (redoBtn) redoBtn.disabled = redoN === 0;
    },
  };

  window.ZS = window.ZS || {};
  ZS.AdminLiveDecor = AdminLiveDecor;
}());
