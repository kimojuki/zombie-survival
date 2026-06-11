// Édition décor monde en live — admin : catalogue, pose preview, calibrage, sync live.
(function () {
  'use strict';

  const PANEL_ID = 'zs-admin-live-decor';
  const PICK_DIST = 80;
  const PLACE_DIST = 80;
  const SAVE_DEBOUNCE_MS = 400;
  const PREVIEW_ID = '__ald_preview__';
  const ROT_WHEEL_STEP = Math.PI / 12;

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
    _previewRoot: null,
    _previewPrefabId: null,
    _placing: false,
    _placeBusy: false,

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
      return !!this._placing && !!this._placePrefabId;
    },

    enter() {
      if (!this._isAdmin()) {
        ZS.UI?.showNotif?.('Édition monde : droits admin requis');
        return;
      }
      if (this.active) return;
      this.active = true;
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

    tryPickOnE() {
      if (!this.active || !this._isAdmin()) return false;
      if (this.isPlacing()) this._cancelPlacement();
      const hit = ZS.pickAdminDecorRay?.(PICK_DIST);
      if (!hit?.decorId) {
        this._setStatus('Aucun décor sous le réticule.');
        return true;
      }
      this._selectDecor(hit.decorId);
      return true;
    },

    tryPlaceOnClick() {
      if (!this.isPlacing() || this._placeBusy) return false;
      this._confirmPlacement();
      return true;
    },

    tryCancelOnRightClick() {
      if (!this.isPlacing()) return false;
      this._cancelPlacement();
      this._setStatus('Pose annulée.');
      return true;
    },

    onWheel(e) {
      if (!this.isPlacing()) return false;
      const delta = e.deltaY > 0 ? -1 : 1;
      this._placeRotY += delta * ROT_WHEEL_STEP;
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
      this._tab = tab === 'edit' ? 'edit' : 'place';
      const panel = this._panel;
      if (!panel) return;
      panel.querySelector('#zs-ald-tab-place')?.classList.toggle('active', this._tab === 'place');
      panel.querySelector('#zs-ald-tab-edit')?.classList.toggle('active', this._tab === 'edit');
      panel.querySelector('#zs-ald-place-pane')?.classList.toggle('hidden', this._tab !== 'place');
      panel.querySelector('#zs-ald-edit-pane')?.classList.toggle('hidden', this._tab !== 'edit');
    },

    _startPlacement(prefabId) {
      if (!prefabId || !ZS.spawnDecorPrefab) return;
      if (!ZS.listDecorPrefabs?.().includes(prefabId)) {
        this._setStatus(`Prefab inconnu côté client : ${prefabId}`, 'err');
        return;
      }
      this._placePrefabId = prefabId;
      this._placeScale = _defaultScale(prefabId);
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST) || { rotY: 0 };
      this._placeRotY = pt.rotY || 0;
      this._placing = true;
      this._switchTab('place');
      this._clearHelper();
      this._selectedId = null;
      this._item = null;
      this._renderEditEmpty();
      this._updatePreview(true);
      this._updateBannerPlace();
      this._setStatus(`Preview : ${prefabId} — clic gauche poser · molette tourner · clic droit annuler`);
    },

    _cancelPlacement() {
      this._placing = false;
      this._placePrefabId = null;
      this._clearPreview();
      this._updateBannerPlace();
    },

    _clearPreview() {
      if (this._previewRoot?.parent) this._previewRoot.parent.remove(this._previewRoot);
      this._previewRoot = null;
      this._previewPrefabId = null;
    },

    _applyPreviewGhost(root) {
      if (!root) return;
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (!o.material.userData?._aldGhost) {
          o.material = o.material.clone();
          o.material.userData = { ...(o.material.userData || {}), _aldGhost: true };
        }
        o.material.transparent = true;
        o.material.opacity = 0.48;
        o.material.depthWrite = false;
        if (o.material.emissive) {
          o.material.emissive.setHex(0x44cc66);
          o.material.emissiveIntensity = 0.35;
        }
        o.castShadow = false;
      });
    },

    _updatePreview(forceRebuild) {
      const prefabId = this._placePrefabId;
      if (!prefabId || !this._placing) return;
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
        this._applyPreviewGhost(root);
        this._previewRoot = root;
        this._previewPrefabId = prefabId;
      }

      const root = this._previewRoot;
      if (!root) return;
      const gy = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(pt.x, pt.z, { groundLift: 0 })
        : pt.y;
      root.position.set(pt.x, Number.isFinite(gy) ? gy : pt.y, pt.z);
      root.rotation.order = 'YXZ';
      root.rotation.set(0, this._placeRotY, 0);
      root.scale.setScalar(this._placeScale);
    },

    async _confirmPlacement() {
      if (!this._placePrefabId || this._placeBusy) return;
      const pt = ZS.pickAdminDecorPlacement?.(PLACE_DIST);
      if (!pt) return;
      this._placeBusy = true;
      this._setStatus('Création serveur…');
      const prefabId = this._placePrefabId;
      try {
        const res = await fetch('/api/admin/decor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this._token(),
          },
          body: JSON.stringify({
            prefabId,
            x: pt.x,
            z: pt.z,
            rotY: this._placeRotY,
            scale: this._placeScale,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec création');
        this._cancelPlacement();
        const id = json.item?.id;
        if (id) {
          await this._selectDecor(id);
          this._setStatus(`Posé : ${prefabId} (${id.slice(0, 10)}…)`, 'ok');
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
      if (this.isPlacing()) {
        sub.textContent = 'Clic gauche = poser · molette = rotation · clic droit = annuler · E = cibler existant';
      } else {
        sub.textContent = 'E cibler · catalogue = poser · F8 quitter · sync live';
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
        '</div>',
        '<div id="zs-ald-place-pane">',
        '  <p class="hint">Choisissez un prefab — preview sous le réticule — <b>clic gauche</b> pour poser, puis calibrez dans Modifier.</p>',
        '  <div class="sec">Catalogue</div>',
        '  <input type="search" id="zs-ald-cat-search" placeholder="Rechercher un prefab…" autocomplete="off">',
        '  <div style="margin:6px 0"><select id="zs-ald-cat-category"><option value="">Toutes catégories</option></select></div>',
        '  <select id="zs-ald-cat-prefab" size="8"></select>',
        '  <div class="cat-desc" id="zs-ald-cat-desc"></div>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-start-place">Prévisualiser</button>',
        '    <button type="button" class="warn hidden" id="zs-ald-cancel-place">Annuler pose</button>',
        '  </div>',
        '</div>',
        '<div id="zs-ald-edit-pane" class="hidden">',
        '  <p class="hint">Visez un décor et <b>E</b>. Curseur = réglage fin · champ num = coord exacte.</p>',
        '  <div class="meta" id="zs-ald-meta">Aucune cible — appuyez sur E</div>',
        '  <div id="zs-ald-fields"></div>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-save">Enregistrer maintenant</button>',
        '    <button type="button" id="zs-ald-deselect">Désélectionner</button>',
        '    <button type="button" class="warn" id="zs-ald-delete">Supprimer</button>',
        '  </div>',
        '</div>',
        '<div class="btns">',
        '  <button type="button" class="warn" id="zs-ald-close">Quitter le mode</button>',
        '</div>',
        '<div class="status" id="zs-ald-status">Prêt.</div>',
      ].join('');
      document.body.appendChild(panel);
      this._panel = panel;
      this._tab = 'place';
      panel.querySelector('#zs-ald-tab-place')?.addEventListener('click', () => this._switchTab('place'));
      panel.querySelector('#zs-ald-tab-edit')?.addEventListener('click', () => this._switchTab('edit'));
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
      panel.querySelector('#zs-ald-deselect')?.addEventListener('click', () => this._deselect());
      panel.querySelector('#zs-ald-delete')?.addEventListener('click', () => this._deleteSelected());
      panel.querySelector('#zs-ald-close')?.addEventListener('click', () => {
        ZS.Calibration?.get?.('world_decor_live')?.close?.() || this.exit();
      });
    },

    _syncPlaceButtons() {
      const cancel = this._panel?.querySelector('#zs-ald-cancel-place');
      if (cancel) cancel.classList.toggle('hidden', !this.isPlacing());
    },

    _deselect() {
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

      fields.innerHTML = html;
      fields.querySelectorAll('.row[data-field]').forEach((row) => {
        const key = row.dataset.field;
        const slider = row.querySelector('input[type=range]');
        const num = row.querySelector('input[type=number]');
        const apply = (raw, opts) => {
          let v = Number(raw);
          if (!Number.isFinite(v) || !this._item) return;
          v = _clampField(key, v);
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
        if (json.item) {
          this._item = json.item;
          this._syncInputsFromItem();
        }
        const changed = (json.changed || []).join(', ') || 'ok';
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
      this._setStatus('Suppression…');
      try {
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this._token() },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Échec suppression');
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
      el.textContent = msg;
      el.className = 'status' + (kind ? ' ' + kind : '');
    },
  };

  window.ZS = window.ZS || {};
  ZS.AdminLiveDecor = AdminLiveDecor;

  ZS.Calibration?.register?.({
    id: 'world_decor_live',
    title: 'Édition décor monde',
    icon: '🏗️',
    desc: 'Catalogue prefabs, preview in-game, pose clic gauche, calibrage live (E).',
    tags: ['world', 'prefab', 'admin'],
    open: () => AdminLiveDecor.enter(),
    close: () => AdminLiveDecor.exit(),
    isOpen: () => AdminLiveDecor.isActive(),
  });
}());
