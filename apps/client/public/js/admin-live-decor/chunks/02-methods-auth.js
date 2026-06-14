// Auth, undo, enter/exit — extrait de admin-live-decor.js (IIFE)
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
