// Sélection décor + fetch — extrait de admin-live-decor.js (IIFE)
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
