// Multi-sélection + batch — extrait de admin-live-decor.js (IIFE)
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
