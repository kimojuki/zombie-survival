// Catalogue + recherche + placement — extrait de admin-live-decor.js (IIFE)
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
