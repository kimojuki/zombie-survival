// ArmTuner init/show/hide/apply — extrait de fps_arm_tuner.js (IIFE)
const ArmTuner = {
    open: false,
    profileId: null,
    walkPreviewOn: false,
    pose: {},
    _arms: null,
    _panel: null,
    _exportEl: null,
    _statusEl: null,
    _showTimer: null,

    init(mainArms) {
      this._arms = mainArms;
    },

    _profile() {
      return this.profileId ? PROFILES[this.profileId] : null;
    },

    allowsWalkPreview() {
      return !!(this.open && this._profile()?.walkPreview);
    },

    _loadProfilePose(profileId) {
      const profile = PROFILES[profileId];
      if (!profile) return {};
      let pose = _resolveProfileDefaultPose(profile);
      try {
        let raw = localStorage.getItem(profile.storageKey);
        if (!raw && profile.legacyStorageKey) raw = localStorage.getItem(profile.legacyStorageKey);
        if (raw) pose = { ..._resolveProfileDefaultPose(profile), ...JSON.parse(raw) };
      } catch (_) { /* ignore */ }
      return pose;
    },

    _resolveEquipType(profileId, profile) {
      if (!profileId || profileId === 'empty_hand' || profileId === 'remote_view') return null;
      if (profile?.equip) return profile.equip;
      if (profile?.gripType) return profile.gripType;
      if (profile?.validateItem && profile.validateItem !== 'empty_hand' && profile.validateItem !== 'remote_view') {
        return profile.validateItem;
      }
      return ZS.getGrip?.(profileId) ? profileId : null;
    },

    _applyProfileRuntime(profile) {
      if (!profile) return;
      window.ZS._armTunerActive = !!profile.freezeAnim;
      window.ZS._armTunerWalkPreview = !!profile.walkPreview;
    },

    _equipForProfile(profileId, profile) {
      if (!this._arms) return;
      this._arms.userData.debugPoseId = null;
      const type = this._resolveEquipType(profileId, profile);
      ZS.updateHandItem?.(this._arms, type, { force: true });
    },

    switchProfile(profileId) {
      const profile = PROFILES[profileId];
      if (!profile || !this._arms) return;
      if (this.profileId === profileId) return;
      this.profileId = profileId;
      this.pose = this._loadProfilePose(profileId);
      this.walkPreviewOn = false;
      this._applyProfileRuntime(profile);
      this._equipForProfile(profileId, profile);
      this._apply();
      if (this._panel) this._updatePanelForProfile();
    },

    show(profileId) {
      const pid = profileId || DEFAULT_PROFILE_ID;
      const profile = PROFILES[pid];
      if (!profile || !this._arms) return;
      if (this.open && this.profileId === pid) return;
      if (this.open) {
        this.switchProfile(pid);
        return;
      }
      this._clearShowTimer();
      _ensurePresetsMigrated();
      this.profileId = pid;
      this.pose = this._loadProfilePose(pid);
      this.walkPreviewOn = false;
      this.open = true;
      this._applyProfileRuntime(profile);
      this._equipForProfile(pid, profile);
      this._showTimer = setTimeout(() => {
        this._showTimer = null;
        if (!this.open) return;
        this._apply();
        this._buildPanel();
      }, 80);
    },

    _clearShowTimer() {
      if (this._showTimer != null) {
        clearTimeout(this._showTimer);
        this._showTimer = null;
      }
    },

    _removePanel() {
      this._clearShowTimer();
      if (this._panel?.parent) this._panel.parent.removeChild(this._panel);
      this._panel = null;
      this._exportEl = null;
      this._statusEl = null;
      document.getElementById('zs-arm-tuner')?.remove();
    },

    hide() {
      this._removePanel();
      this.open = false;
      this.profileId = null;
      this.walkPreviewOn = false;
      window.ZS._armTunerActive = false;
      window.ZS._armTunerWalkPreview = false;
      if (this._arms) {
        this._arms.userData.tunerFreeze = false;
        this._arms.userData.anim = null;
        this._arms.userData.debugPoseId = null;
        const type = ZS.Inventory?.getActiveItem?.()?.type || null;
        ZS.updateHandItem?.(this._arms, type);
        ZS.Network?.sendEquip?.(type || null);
      }
    },

    _apply() {
      if (!this._arms) return;
      const profile = this._profile();
      const pid = this.profileId;
      if (!profile || !pid) return;
      if (pid === 'remote_view') {
        ZS.applyFPSRemoteTune?.(this.pose);
        return;
      }
      if (pid === 'empty_hand') {
        ZS.applyFPSEmptyTuneToArms?.(this._arms, this.pose);
        return;
      }
      if (pid === 'tool_torche') {
        ZS.applyFPSTorchTune?.(this.pose);
        ZS.applyFPSDebugPose?.(this._arms, this.pose);
        return;
      }
      if (ZS.getGrip?.(pid)) {
        ZS.applyFPSGripTuneToArms?.(this._arms, pid, this.pose, { freeze: profile.freezeAnim });
        return;
      }
      ZS.applyFPSDebugPose?.(this._arms, this.pose);
    },

    _syncInputs() {
      if (!this._panel) return;
      const fields = this._profile()?.fields?.() || [];
      for (const f of fields) {
        const { parent, key } = _getPath(this.pose, f.path);
        const v = parent[key];
        const num = this._panel.querySelector(`input[type=number][data-path="${f.path}"]`);
        const slider = this._panel.querySelector(`input[type=range][data-path="${f.path}"]`);
        if (num) num.value = String(v);
        if (slider) slider.value = String(v);
      }
      const walkCb = this._panel.querySelector('#zs-arm-tuner-walk-preview');
      if (walkCb) walkCb.checked = this.walkPreviewOn;
    },

    _refreshImportArmsSelect(rootEl) {
      const root = rootEl || this._panel;
      const sel = root?.querySelector('#zs-arm-tuner-import-arms');
      if (!sel) return;
      const sources = _listValidatedArmSources(this.profileId);
      sel.innerHTML = sources.length
        ? '<option value="">— Bras validés d\'un autre profil —</option>'
        : '<option value="">— Aucune pose validée ailleurs —</option>';
      for (const s of sources) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.label;
        sel.appendChild(opt);
      }
    },

    _refreshProfileSelect(rootEl) {
      const root = rootEl || this._panel;
      const sel = root?.querySelector('#zs-arm-tuner-profile');
      if (!sel) return;
      const groups = ZS.FpsGripCalibration?.listByCategory?.() || [];
      sel.innerHTML = '';
      for (const g of groups) {
        const og = document.createElement('optgroup');
        og.label = g.label || g.id;
        for (const entry of g.items) {
          if (!PROFILES[entry.id]) continue;
          const opt = document.createElement('option');
          opt.value = entry.id;
          opt.textContent = entry.icon ? `${entry.icon} ${entry.label}` : entry.label;
          og.appendChild(opt);
        }
        if (og.children.length) sel.appendChild(og);
      }
      if (this.profileId) sel.value = this.profileId;
    },

    _refreshPresetSelect(selectedId, rootEl) {
      const root = rootEl || this._panel;
      const sel = root?.querySelector('#zs-arm-tuner-presets');
      if (!sel) return;
      const presets = _loadPresets().slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      const placeholder = presets.length
        ? '— Choisir un preset —'
        : '— Aucun preset (sauvegardez ou validez) —';
      sel.innerHTML = `<option value="">${placeholder}</option>`;
      for (const p of presets) {
        const opt = document.createElement('option');
        opt.value = p.id;
        const src = _profileLabel(p.sourceProfile);
        opt.textContent = `${p.name} (depuis ${src})`;
        sel.appendChild(opt);
      }
      if (selectedId) sel.value = selectedId;
      const countEl = root?.querySelector('#zs-arm-tuner-preset-count');
      if (countEl) countEl.textContent = `${presets.length} preset${presets.length !== 1 ? 's' : ''} (toutes animations)`;
      this._refreshImportArmsSelect(root);
    },

    savePreset(name) {
      const label = String(name || '').trim();
      if (!label) {
        this._setStatus('Indiquez un nom pour le preset.');
        return;
      }
      const profile = this._profile();
      if (!profile) return;
      const presets = _loadPresets();
      const now = new Date().toISOString();
      const existing = presets.find((p) => p.name === label);
      const entry = {
        id: existing?.id || `p_${Date.now()}`,
        name: label,
        sourceProfile: this.profileId,
        sourceLabel: profile.presetLabel || profile.validateItem,
        updatedAt: now,
        pose: _clonePose(this.pose),
      };
      if (existing) {
        const idx = presets.indexOf(existing);
        presets[idx] = entry;
      } else {
        presets.push(entry);
      }
      _writePresets(presets);
      this._refreshPresetSelect(entry.id);
      const nameEl = this._panel?.querySelector('#zs-arm-tuner-preset-name');
      if (nameEl) nameEl.value = label;
      this._setStatus(`Preset « ${label} » sauvegardé.`);
    },

    loadPreset(id, opts = {}) {
      if (!id) {
        this._setStatus('Sélectionnez un preset à charger.');
        return;
      }
      const preset = _loadPresets().find((p) => p.id === id);
      if (!preset) {
        this._setStatus('Preset introuvable.');
        return;
      }
      if (opts.armsOnly) {
        const out = _clonePose(this.pose);
        _copyArmChainSections(preset.pose, out);
        this.pose = out;
      } else {
        this.pose = _mergePoseForProfile(preset.pose, this.profileId);
      }
      this._syncInputs();
      this._apply();
      const src = _profileLabel(preset.sourceProfile);
      const same = preset.sourceProfile === this.profileId;
      const mode = opts.armsOnly ? ' (bras seulement)' : '';
      this._setStatus(same
        ? `Preset « ${preset.name} » chargé${mode}.`
        : `Preset « ${preset.name} » chargé${mode} (depuis ${src}).`);
    },

    importArmsFromProfile(sourceProfileId) {
      if (!sourceProfileId) {
        this._setStatus('Choisissez un profil source.');
        return;
      }
      const pose = _readValidatedPose(sourceProfileId);
      if (!pose?.shoulder && !pose?.lShoulder) {
        this._setStatus(`Aucune pose bras validée pour ${_profileLabel(sourceProfileId)}.`);
        return;
      }
      const out = _clonePose(this.pose);
      _copyArmChainSections(pose, out);
      this.pose = out;
      this._syncInputs();
      this._apply();
      this._setStatus(`Bras copiés depuis ${_profileLabel(sourceProfileId)} validée.`);
    },

    deletePreset(id) {
      if (!id) {
        this._setStatus('Sélectionnez un preset à supprimer.');
        return;
      }
      const presets = _loadPresets();
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      _writePresets(presets.filter((p) => p.id !== id));
      this._refreshPresetSelect();
      const nameEl = this._panel?.querySelector('#zs-arm-tuner-preset-name');
      if (nameEl) nameEl.value = '';
      this._setStatus(`Preset « ${preset.name} » supprimé.`);
    },

    _updatePanelForProfile() {
      const profile = this._profile();
      if (!profile || !this._panel) return;
      const hint = this._panel.querySelector('#zs-arm-tuner-hint');
      if (hint) hint.innerHTML = profile.hint || '';
      const walkHost = this._panel.querySelector('#zs-arm-tuner-walk-host');
      if (walkHost) {
        walkHost.innerHTML = profile.walkPreview
          ? '<label class="walk-prev"><input type="checkbox" id="zs-arm-tuner-walk-preview"> Preview marche (balancement)</label>'
          : '';
        walkHost.querySelector('#zs-arm-tuner-walk-preview')?.addEventListener('change', (e) => {
          this.walkPreviewOn = !!e.target.checked;
          this._setStatus(this.walkPreviewOn ? 'Preview marche activée.' : 'Preview repos.');
        });
        if (profile.walkPreview) {
          const walkCb = walkHost.querySelector('#zs-arm-tuner-walk-preview');
          if (walkCb) walkCb.checked = this.walkPreviewOn;
        }
      }
      this._rebuildFields();
      this._refreshProfileSelect(this._panel);
      this._refreshPresetSelect(null, this._panel);
    },

    _rebuildFields() {
      const profile = this._profile();
      const fieldsEl = this._panel?.querySelector('#zs-arm-tuner-fields');
      if (!profile || !fieldsEl) return;
      fieldsEl.innerHTML = '';
      const allFields = profile.fields();
      let lastSection = '';
      for (const f of allFields) {
        const sectionLabel = f.section || null;
        if (sectionLabel && sectionLabel !== lastSection) {
          const sec = document.createElement('div');
          sec.className = 'sec';
          sec.textContent = sectionLabel;
          fieldsEl.appendChild(sec);
          lastSection = sectionLabel;
        } else if (!sectionLabel) {
          const section = f.path.split('.')[0];
          if (section !== lastSection && section !== 'shoulder' && section !== 'elbow' && section !== 'wrist' && section !== 'item') {
            const sec = document.createElement('div');
            sec.className = 'sec';
            sec.textContent = section === 'idle' ? 'Repos' : section === 'walk' ? 'Marche' : section;
            fieldsEl.appendChild(sec);
            lastSection = section;
          }
          if (section === 'elbow' && lastSection !== 'arm') {
            const sec = document.createElement('div');
            sec.className = 'sec';
            sec.textContent = 'Bras';
            fieldsEl.appendChild(sec);
            lastSection = 'arm';
          }
        }
        const row = document.createElement('div');
        row.className = 'row';
        const { parent, key } = _getPath(this.pose, f.path);
        const val = parent[key];
        row.innerHTML = [
          `<label>${f.label}</label>`,
          `<input type="number" data-path="${f.path}" step="${f.step}" min="${f.min}" max="${f.max}" value="${val}">`,
        ].join('');
        const num = row.querySelector('input[type=number]');
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(f.min);
        slider.max = String(f.max);
        slider.step = String(f.step);
        slider.value = String(val);
        slider.dataset.path = f.path;
        slider.style.gridColumn = '1 / -1';
        row.appendChild(slider);
        fieldsEl.appendChild(row);

        const tuner = this;
        const onChange = (v) => {
          let n = parseFloat(v);
          if (!Number.isFinite(n)) return;
          n = Math.max(f.min, Math.min(f.max, n));
          const slot = _getPath(tuner.pose, f.path);
          slot.parent[slot.key] = n;
          num.value = String(n);
          slider.value = String(n);
          tuner._apply();
        };
        num.addEventListener('input', () => onChange(num.value));
        num.addEventListener('change', () => onChange(num.value));
        slider.addEventListener('input', () => onChange(slider.value));
      }
    },
