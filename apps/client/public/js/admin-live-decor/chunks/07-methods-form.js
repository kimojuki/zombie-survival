// Formulaire + save/delete — extrait de admin-live-decor.js (IIFE)
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
