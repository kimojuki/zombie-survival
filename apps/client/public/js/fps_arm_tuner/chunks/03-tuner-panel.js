// Panneau UI + validate — extrait de fps_arm_tuner.js (IIFE)
    _buildPanel() {
      if (this._panel?.parent) this._panel.parent.remove(this._panel);
      const profile = this._profile();
      if (!profile) return;

      const panel = document.createElement('div');
      panel.id = 'zs-arm-tuner';
      panel.innerHTML = [
        '<style>',
        '#zs-arm-tuner{position:fixed;top:0;right:0;width:min(360px,92vw);height:100vh;',
        'background:rgba(12,16,24,0.94);color:#e8ecf4;font:12px/1.35 Consolas,Monaco,monospace;',
        'z-index:13000;overflow:auto;padding:10px 12px 16px;box-sizing:border-box;',
        'border-left:1px solid rgba(255,255,255,0.12);pointer-events:auto;}',
        '#zs-arm-tuner h2{margin:0 0 6px;font-size:14px;}',
        '#zs-arm-tuner .hint{opacity:0.75;margin-bottom:10px;font-size:11px;}',
        '#zs-arm-tuner .walk-prev{display:block;margin:8px 0;font-size:11px;cursor:pointer;}',
        '#zs-arm-tuner .sec{margin:10px 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;}',
        '#zs-arm-tuner .preset-row{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px;}',
        '#zs-arm-tuner select,#zs-arm-tuner .preset-name{width:100%;background:#1a2230;color:#fff;border:1px solid #445;',
        'padding:5px 6px;border-radius:4px;font:inherit;box-sizing:border-box;}',
        '#zs-arm-tuner .row{display:grid;grid-template-columns:1fr 52px;gap:6px;align-items:center;margin:5px 0;}',
        '#zs-arm-tuner label{font-size:11px;}',
        '#zs-arm-tuner input[type=range]{width:100%;}',
        '#zs-arm-tuner input[type=number]{width:52px;background:#1a2230;color:#fff;border:1px solid #445;padding:2px 4px;border-radius:3px;}',
        '#zs-arm-tuner .btns{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}',
        '#zs-arm-tuner button{background:#2a4a7a;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font:inherit;}',
        '#zs-arm-tuner button.primary{background:#2a7a4a;}',
        '#zs-arm-tuner button.warn{background:#7a3a2a;}',
        '#zs-arm-tuner textarea{width:100%;height:120px;background:#0a0e14;color:#9fe8b0;border:1px solid #354;',
        'border-radius:4px;padding:6px;font:inherit;resize:vertical;}',
        '#zs-arm-tuner .status{margin-top:8px;padding:6px 8px;background:rgba(40,80,50,0.5);border-radius:4px;min-height:32px;}',
        '</style>',
        '<h2>Calibrage FPS — bras &amp; items</h2>',
        '<div class="sec">Item à calibrer</div>',
        '<div class="preset-row"><select id="zs-arm-tuner-profile"></select></div>',
        `<div class="hint" id="zs-arm-tuner-hint">${profile.hint}</div>`,
        '<div class="btns">',
        '  <button type="button" data-act="seed-derived">Générer dérivés manquants</button>',
        '</div>',
        '<div class="sec">Presets <span id="zs-arm-tuner-preset-count" style="opacity:0.7;font-weight:normal"></span></div>',
        '<div class="preset-row">',
        '  <select id="zs-arm-tuner-presets"></select>',
        '  <input type="text" id="zs-arm-tuner-preset-name" class="preset-name" placeholder="Nom du preset (ex. bras relâché v2)" maxlength="48">',
        '</div>',
        '<div class="btns">',
        '  <button type="button" data-act="preset-save">💾 Sauver preset</button>',
        '  <button type="button" data-act="preset-load">📂 Charger</button>',
        '  <button type="button" data-act="preset-load-arms">📋 Bras du preset</button>',
        '  <button type="button" class="warn" data-act="preset-delete">🗑 Supprimer</button>',
        '</div>',
        '<div class="sec">Importer les bras</div>',
        '<div class="preset-row">',
        '  <select id="zs-arm-tuner-import-arms"></select>',
        '</div>',
        '<div class="btns">',
        '  <button type="button" data-act="import-arms-validated">📋 Copier bras validés</button>',
        '</div>',
        '<div id="zs-arm-tuner-walk-host"></div>',
        '<div class="btns">',
        '  <button type="button" data-act="read">Lire pose actuelle</button>',
        '  <button type="button" data-act="reset">Réinitialiser</button>',
        '  <button type="button" class="warn" data-act="close">Retour calibrages</button>',
        '</div>',
        '<div id="zs-arm-tuner-fields"></div>',
        '<div class="btns">',
        '  <button type="button" class="primary" data-act="validate">Valider la pose</button>',
        '</div>',
        '<textarea id="zs-arm-tuner-export" placeholder="JSON validé…"></textarea>',
        '<div class="status" id="zs-arm-tuner-status">Prêt.</div>',
      ].join('');

      const tuner = this;
      panel.querySelector('#zs-arm-tuner-profile')?.addEventListener('change', (e) => {
        const next = e.target?.value;
        if (next && next !== tuner.profileId) tuner.switchProfile(next);
      });
      panel.querySelector('#zs-arm-tuner-presets')?.addEventListener('change', (e) => {
        const p = _loadPresets().find((x) => x.id === e.target.value);
        const nameEl = panel.querySelector('#zs-arm-tuner-preset-name');
        if (nameEl && p) nameEl.value = p.name;
      });

      panel.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('[data-act]');
        const act = btn?.dataset?.act;
        if (!act) return;
        e.preventDefault();
        e.stopPropagation();
        const presetSel = panel.querySelector('#zs-arm-tuner-presets');
        const presetName = panel.querySelector('#zs-arm-tuner-preset-name');
        if (act === 'preset-save') tuner.savePreset(presetName?.value);
        if (act === 'preset-load') tuner.loadPreset(presetSel?.value);
        if (act === 'preset-load-arms') tuner.loadPreset(presetSel?.value, { armsOnly: true });
        if (act === 'preset-delete') tuner.deletePreset(presetSel?.value);
        if (act === 'import-arms-validated') {
          const importSel = panel.querySelector('#zs-arm-tuner-import-arms');
          tuner.importArmsFromProfile(importSel?.value);
        }
        if (act === 'seed-derived') tuner.rebuildDerivedDefaults();
        if (act === 'close') {
          tuner.hide();
          ZS.AdminHub?.open?.('calibration');
        }
        if (act === 'reset') {
          const p = tuner._profile();
          tuner.pose = _resolveProfileDefaultPose(p);
          tuner._syncInputs();
          tuner._apply();
          tuner._setStatus('Pose réinitialisée (dérivée des calibrages validés).');
        }
        if (act === 'read') {
          const live = _readPoseFromArms(tuner._arms, tuner._profile());
          if (live) {
            tuner.pose = live;
            tuner._syncInputs();
            tuner._apply();
            tuner._setStatus('Pose lue depuis le bras en scène.');
          }
        }
        if (act === 'validate') tuner.validate();
      });

      document.body.appendChild(panel);
      this._panel = panel;
      this._updatePanelForProfile();
      this._exportEl = panel.querySelector('#zs-arm-tuner-export');
      this._statusEl = panel.querySelector('#zs-arm-tuner-status');
    },

    _setStatus(msg) {
      if (this._statusEl) this._statusEl.textContent = msg;
      console.info('[arm-tuner]', msg);
    },

    validate() {
      const profile = this._profile();
      if (!profile) return;
      const payload = {
        savedAt: new Date().toISOString(),
        item: profile.validateItem,
        pose: _clonePose(this.pose),
      };
      const json = JSON.stringify(payload, null, 2);
      try { localStorage.setItem(profile.storageKey, JSON.stringify(this.pose)); } catch (_) { /* ignore */ }
      const presetName = this._panel?.querySelector('#zs-arm-tuner-preset-name')?.value?.trim()
        || `${profile.presetLabel} validée`;
      const presetId = _upsertPreset(presetName, this.profileId, this.pose);
      this._refreshPresetSelect(presetId);
      ZS.applyFPSValidatedPose?.(profile.validateItem, this.pose, this._arms);
      if (profile.freezeAnim) this._apply();
      const exportEl = this._exportEl || document.getElementById('zs-arm-tuner-export');
      if (exportEl) {
        exportEl.value = json;
        exportEl.readOnly = false;
        exportEl.focus();
        exportEl.select();
        exportEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      let copied = false;
      try {
        navigator.clipboard.writeText(json);
        copied = true;
      } catch (_) { /* ignore */ }
      this._setStatus(copied
        ? 'Validé — appliqué en jeu immédiatement · JSON copié.'
        : 'Validé — appliqué en jeu immédiatement · JSON ci-dessous.');
      console.info('[arm-tuner] VALIDATED_POSE\n' + json);
      window.__ZS_ARM_TUNER_LAST__ = payload;
    },

    getValidated(profileId) {
      const key = PROFILES[profileId]?.storageKey;
      if (!key) return null;
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    listPresets() {
      return _loadPresets();
    },

    listProfileIds() {
      return Object.keys(PROFILES);
    },

    rebuildDerivedDefaults() {
      _ensureDerivedCalibrationsSeeded();
      this._setStatus('Calibrages dérivés générés pour les items sans pose sauvegardée.');
    },
  };
