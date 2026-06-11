// Édition décor monde en live — admin vise (E) un prefab, panneau latéral, sync tous joueurs.
(function () {
  'use strict';

  const PANEL_ID = 'zs-admin-live-decor';
  const PICK_DIST = 80;
  const SAVE_DEBOUNCE_MS = 400;

  const NUM_FIELDS = [
    ['x', 'X', 0.01],
    ['z', 'Z', 0.01],
    ['y', 'Y', 0.01],
    ['baseY', 'baseY', 0.01],
    ['rotY', 'rotY', 0.001],
    ['rotX', 'rotX', 0.001],
    ['rotZ', 'rotZ', 0.001],
    ['scale', 'échelle', 0.01],
    ['groundLift', 'groundLift', 0.01],
    ['buildLevel', 'niveau build', 1],
    ['wreckTilt', 'épave tilt', 0.01],
    ['wreckWheels', 'épave roues', 1],
    ['wreckSink', 'épave enfoncement', 0.01],
    ['railLen', 'long. rail', 0.1],
    ['shackFloorY', 'shack floor Y', 0.01],
  ];

  const AdminLiveDecor = {
    active: false,
    _panel: null,
    _banner: null,
    _helper: null,
    _selectedId: null,
    _item: null,
    _saveTimer: null,
    _saving: false,
    _statusMsg: '',

    _token() {
      return localStorage.getItem('zombie_token') || '';
    },

    _isAdmin() {
      if (ZS.AdminAuth?.hasPerm?.('decor.edit')) return true;
      if (ZS.AdminHub?.hasPerm?.('decor.edit')) return true;
      return false;
    },

    isActive() {
      return !!this.active;
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
      this._setStatus('Mode actif — visez un décor et appuyez sur E.');
      ZS.requestPointerLock?.();
    },

    exit() {
      if (!this.active) return;
      this.active = false;
      window.ZS._adminLiveDecorActive = false;
      this._clearSaveTimer();
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
      const hit = ZS.pickAdminDecorRay?.(PICK_DIST);
      if (!hit?.decorId) {
        this._setStatus('Aucun décor sous le réticule.');
        return true;
      }
      this._selectDecor(hit.decorId);
      return true;
    },

    async _selectDecor(id) {
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
        this._renderForm();
        this._setStatus(`Cible : ${item.prefabId || '—'} (${id.slice(0, 10)}…)`);
      } catch (err) {
        const local = ZS.Network?.getDecorData?.(id);
        if (local) {
          this._item = { ...local, id };
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
      return json.item;
    },

    _buildBanner() {
      if (this._banner?.parent) return;
      const el = document.createElement('div');
      el.id = 'zs-admin-live-banner';
      el.innerHTML = '<span>🎯 Édition décor</span><span class="sub">E cibler · F8 quitter · sync live</span>';
      document.body.appendChild(el);
      this._banner = el;
    },

    _buildPanel() {
      if (this._panel?.parent) return;
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML = [
        '<style>',
        `#${PANEL_ID}{position:fixed;top:0;right:0;width:min(360px,92vw);height:100vh;`,
        'background:rgba(10,14,22,0.95);color:#e8ecf4;font:12px/1.4 Consolas,Monaco,monospace;',
        'z-index:12950;overflow:auto;padding:10px 12px 20px;box-sizing:border-box;',
        'border-left:1px solid rgba(255,200,80,0.25);pointer-events:auto;}',
        `#${PANEL_ID} h2{margin:0 0 4px;font-size:14px;color:#ffd080;}`,
        `#${PANEL_ID} .hint{opacity:0.8;margin-bottom:10px;font-size:11px;}`,
        `#${PANEL_ID} .meta{font-size:11px;opacity:0.85;margin-bottom:10px;padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px;}`,
        `#${PANEL_ID} .sec{margin:10px 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.65;}`,
        `#${PANEL_ID} .row{display:grid;grid-template-columns:72px 1fr 58px;gap:6px;align-items:center;margin:4px 0;}`,
        `#${PANEL_ID} label{font-size:11px;}`,
        `#${PANEL_ID} input[type=range]{width:100%;}`,
        `#${PANEL_ID} input[type=number]{width:58px;background:#1a2230;color:#fff;border:1px solid #445;padding:3px 4px;border-radius:3px;}`,
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
        '<p class="hint">Visez un prefab avec le réticule puis <b>E</b>. Les changements sont envoyés au serveur et visibles par tous.</p>',
        '<div class="meta" id="zs-ald-meta">Aucune cible — appuyez sur E</div>',
        '<div id="zs-ald-fields"></div>',
        '<div class="btns">',
        '  <button type="button" class="primary" id="zs-ald-save">Enregistrer maintenant</button>',
        '  <button type="button" id="zs-ald-deselect">Désélectionner</button>',
        '  <button type="button" class="warn" id="zs-ald-close">Quitter le mode</button>',
        '</div>',
        '<div class="status" id="zs-ald-status">Prêt.</div>',
      ].join('');
      document.body.appendChild(panel);
      this._panel = panel;
      panel.querySelector('#zs-ald-save')?.addEventListener('click', () => this._saveNow());
      panel.querySelector('#zs-ald-deselect')?.addEventListener('click', () => this._deselect());
      panel.querySelector('#zs-ald-close')?.addEventListener('click', () => {
        ZS.Calibration?.get?.('world_decor_live')?.close?.() || this.exit();
      });
    },

    _deselect() {
      this._selectedId = null;
      this._item = null;
      this._clearHelper();
      const meta = this._panel?.querySelector('#zs-ald-meta');
      const fields = this._panel?.querySelector('#zs-ald-fields');
      if (meta) meta.textContent = 'Aucune cible — appuyez sur E';
      if (fields) fields.innerHTML = '';
      this._setStatus('Cible effacée — visez un autre décor.');
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
      if (!meta || !fields || !item) return;

      meta.innerHTML = [
        `<div><b>prefab</b> ${item.prefabId || '—'}</div>`,
        `<div><b>id</b> ${item.id || this._selectedId || '—'}</div>`,
        item.placementKey ? `<div><b>seed</b> ${item.placementKey}</div>` : '',
        localOnly ? '<div><b>note</b> données client uniquement</div>' : '',
      ].filter(Boolean).join('');

      const pid = item.prefabId || '';
      let html = '<div class="sec">Position</div>';
      for (const [key, label, step] of NUM_FIELDS.slice(0, 4)) {
        html += this._fieldRow(key, label, item[key], step);
      }
      html += '<div class="sec">Orientation & taille</div>';
      for (const [key, label, step] of NUM_FIELDS.slice(4, 8)) {
        html += this._fieldRow(key, label, item[key], step);
      }

      if (pid.startsWith('wreck_')) {
        html += '<div class="sec">Épave</div>';
        for (const [key, label, step] of NUM_FIELDS.filter(([k]) => k.startsWith('wreck'))) {
          html += this._fieldRow(key, label, item[key], step);
        }
      }
      if (pid.startsWith('build_') || pid === 'storage_chest') {
        html += '<div class="sec">Construction</div>';
        html += this._fieldRow('buildLevel', 'niveau build', item.buildLevel, 1);
        html += this._fieldRow('groundLift', 'groundLift', item.groundLift, 0.01);
      }
      if (pid.startsWith('road_barrier_rail')) {
        html += '<div class="sec">Barrière</div>';
        html += this._fieldRow('railLen', 'long. rail', item.railLen, 0.1);
      }

      fields.innerHTML = html;
      fields.querySelectorAll('.row[data-field]').forEach((row) => {
        const key = row.dataset.field;
        const slider = row.querySelector('input[type=range]');
        const num = row.querySelector('input[type=number]');
        const apply = (raw) => {
          const v = Number(raw);
          if (!Number.isFinite(v) || !this._item) return;
          this._item[key] = v;
          if (slider) slider.value = String(v);
          if (num) num.value = String(v);
          this._applyLocalPreview(this._item);
          this._scheduleSave();
        };
        slider?.addEventListener('input', () => apply(slider.value));
        num?.addEventListener('input', () => apply(num.value));
        num?.addEventListener('change', () => apply(num.value));
      });
    },

    _fieldRow(key, label, value, step) {
      const v = Number.isFinite(value) ? value : 0;
      const min = key.startsWith('rot') ? -6.28 : (key === 'scale' ? 0.05 : -500);
      const max = key.startsWith('rot') ? 6.28 : (key === 'scale' ? 12 : 500);
      return [
        `<div class="row" data-field="${key}">`,
        `<label>${label}</label>`,
        `<input type="range" min="${min}" max="${max}" step="${step}" value="${v}">`,
        `<input type="number" step="${step}" value="${v}">`,
        '</div>',
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
        if (slider) slider.value = String(v);
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

    _clearHelper() {
      if (this._helper?.parent) this._helper.parent.remove(this._helper);
      this._helper = null;
    },

    _setStatus(msg, kind) {
      this._statusMsg = msg;
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
    desc: 'E pour cibler un prefab sous le réticule — panneau latéral, corrections live pour tous.',
    tags: ['world', 'prefab', 'admin'],
    open: () => AdminLiveDecor.enter(),
    close: () => AdminLiveDecor.exit(),
    isOpen: () => AdminLiveDecor.isActive(),
  });
}());
