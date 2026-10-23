// API CRUD + export
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
