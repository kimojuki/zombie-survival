// Presets + merge poses — extrait de fps_arm_tuner.js (IIFE)
function _getPath(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    return { parent: cur, key: parts[parts.length - 1] };
  }

  function _loadPresets() {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function _writePresets(list) {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    } catch (_) { /* ignore */ }
  }

  function _upsertPreset(name, profileId, pose) {
    const label = String(name || '').trim();
    if (!label || !pose) return null;
    const profile = PROFILES[profileId];
    const presets = _loadPresets();
    const now = new Date().toISOString();
    const existing = presets.find((p) => p.name === label);
    const entry = {
      id: existing?.id || `p_${Date.now()}`,
      name: label,
      sourceProfile: profileId,
      sourceLabel: profile?.presetLabel || profileId,
      updatedAt: now,
      pose: _clonePose(pose),
    };
    if (existing) presets[presets.indexOf(existing)] = entry;
    else presets.push(entry);
    _writePresets(presets);
    return entry.id;
  }

  /** Importe les poses validées (localStorage profil) dans la liste presets globale. */
  function _ensurePresetsMigrated() {
    const presets = _loadPresets();
    let changed = false;
    for (const [profileId, prof] of Object.entries(PROFILES)) {
      try {
        let raw = localStorage.getItem(prof.storageKey);
        if (!raw && prof.legacyStorageKey) raw = localStorage.getItem(prof.legacyStorageKey);
        if (!raw) continue;
        const pose = JSON.parse(raw);
        if (!pose?.shoulder && !pose?.remote && !pose?.item) continue;
        const migName = `${prof.presetLabel} (validée)`;
        if (presets.some((p) => p.id === `p_mig_${profileId}` || (p.sourceProfile === profileId && p.name === migName))) continue;
        presets.push({
          id: `p_mig_${profileId}`,
          name: migName,
          sourceProfile: profileId,
          sourceLabel: prof.presetLabel,
          updatedAt: new Date().toISOString(),
          pose: _clonePose(pose),
        });
        changed = true;
      } catch (_) { /* ignore */ }
    }
    if (changed) _writePresets(presets);
  }

  /** Copie les champs compatibles ; sections bras toujours transférées si présentes. */
  function _mergePoseForProfile(sourcePose, targetProfileId, opts = {}) {
    const profile = PROFILES[targetProfileId];
    if (!profile || !sourcePose) return _clonePose(profile?.defaultPose);
    const out = _clonePose(profile.defaultPose);
    if (!opts.skipArmChain) _copyArmChainSections(sourcePose, out);
    const paths = profile.fields().map((f) => f.path);
    for (const path of paths) {
      const top = path.split('.')[0];
      if (!opts.skipArmChain && ARM_CHAIN_KEYS.includes(top)) continue;
      const src = _getPath(sourcePose, path);
      if (!Number.isFinite(src.parent[src.key])) continue;
      const dst = _getPath(out, path);
      dst.parent[dst.key] = src.parent[src.key];
    }
    return out;
  }

  function _profileLabel(id) {
    return PROFILES[id]?.presetLabel || PROFILES[id]?.validateItem || id || '?';
  }

  function _resolveProfileDefaultPose(profile) {
    if (!profile) return {};
    if (profile.dynamicBase && profile.gripType) {
      return _buildDefaultPoseForGrip(profile.gripType);
    }
    const raw = profile.defaultPose;
    return _clonePose(typeof raw === 'function' ? raw() : raw);
  }

  function _resolveItemPoseForGrip(gripType, entry) {
    if (entry?.itemFrom) {
      const fromPose = _readValidatedPose(entry.itemFrom);
      if (fromPose?.item) return _clonePose(fromPose.item);
    }
    const grip = ZS.getGrip?.(gripType);
    if (grip?.item) return _clonePose(grip.item);
    return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  }

  function _resolveBaseOneHandArms() {
    for (const id of ['tool_hachette', 'empty_hand', 'tool_torche']) {
      const p = _readValidatedPose(id);
      if (p?.shoulder) {
        return {
          shoulder: { ...p.shoulder },
          elbow: { ...(p.elbow || {}) },
          wrist: { ...(p.wrist || {}) },
        };
      }
    }
    return _clonePose(VALIDATED_EMPTY_ARM);
  }

  function _resolveBaseTwoHandArms() {
    const from = _readValidatedPose('tool_caillou');
    if (from?.shoulder) {
      const out = {};
      for (const key of ARM_CHAIN_KEYS) {
        if (from[key]) out[key] = JSON.parse(JSON.stringify(from[key]));
      }
      if (from.rArm) out.rArm = { ...from.rArm };
      if (from.lArm) out.lArm = { ...from.lArm };
      return out;
    }
    return _clonePose(PROFILES.tool_caillou.defaultPose);
  }

  function _buildDefaultPoseForGrip(gripType) {
    const entry = ZS.FpsGripCalibration?.getEntry?.(gripType);
    const grip = ZS.getGrip?.(gripType);
    const twoHanded = entry?.twoHanded || grip?.twoHanded;
    const out = twoHanded ? _resolveBaseTwoHandArms() : _resolveBaseOneHandArms();
    out.item = _resolveItemPoseForGrip(gripType, entry);
    if (twoHanded && grip?.sharedItem) {
      out.center = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
      out.itemScale = grip.itemScale ?? 0.60;
    }
    if (twoHanded && grip?.rArm) out.rArm = { ...(out.rArm || {}), ..._clonePose(grip.rArm) };
    if (twoHanded && grip?.lArm) out.lArm = { ...(out.lArm || {}), ..._clonePose(grip.lArm) };
    return out;
  }

  function _twoHandTunerFields(gripType) {
    const grip = ZS.getGrip?.(gripType);
    const fields = RCHAIN_FIELDS
      .concat(_fullMcFields('rArm', 'Bras droit — micro-ajust'))
      .concat(LCHAIN_FIELDS)
      .concat(_fullMcFields('lArm', 'Bras gauche — micro-ajust'))
      .concat(ITEM_FIELDS);
    if (grip?.sharedItem) {
      fields.push(
        ...ROCK_ITEM_FIELDS.filter((f) => f.path.startsWith('center') || f.path === 'itemScale'),
      );
    }
    return fields;
  }

  function _registerCatalogProfiles() {
    for (const entry of (ZS.FpsGripCalibration?.listAuto?.() || [])) {
      if (PROFILES[entry.id]) continue;
      const grip = ZS.getGrip?.(entry.id);
      const twoHanded = entry.twoHanded || grip?.twoHanded;
      PROFILES[entry.id] = {
        title: `FPS — ${entry.label}`,
        hint: 'Bras dérivés des calibrages validés · presets partagés · <b>Valider</b> = live',
        storageKey: ZS.FpsGripCalibration.storageKey(entry.id),
        gripType: entry.id,
        equip: entry.id,
        freezeAnim: true,
        walkPreview: false,
        validateItem: entry.id,
        presetLabel: entry.label,
        dynamicBase: true,
        fields: () => (twoHanded ? _twoHandTunerFields(entry.id) : ARM_FIELDS.concat(ITEM_FIELDS)),
      };
    }
  }

  function _ensureDerivedCalibrationsSeeded() {
    _registerCatalogProfiles();
    for (const entry of (ZS.FpsGripCalibration?.listAuto?.() || [])) {
      const key = ZS.FpsGripCalibration.storageKey(entry.id);
      try {
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, JSON.stringify(_buildDefaultPoseForGrip(entry.id)));
      } catch (_) { /* ignore */ }
    }
  }

  const DEFAULT_PROFILE_ID = 'empty_hand';

  function _registerCalibrationTools() {
    ZS.Calibration?.register?.({
      id: 'fps_arm_tuner',
      title: 'Calibrage FPS — bras & items',
      icon: '🎯',
      desc: 'Pose bras et position des objets en main. Choisir l\'item dans le menu du panneau.',
      tags: ['fps', 'viewmodel', 'arms'],
      open: () => ArmTuner.show(DEFAULT_PROFILE_ID),
      close: () => ArmTuner.hide(),
      isOpen: () => !!ArmTuner.open,
    });
  }

  function _readChainIntoPose(pose, prefix, chain) {
    if (!chain) return;
    const shKey = prefix ? `${prefix}Shoulder` : 'shoulder';
    const elKey = prefix ? `${prefix}Elbow` : 'elbow';
    const wrKey = prefix ? `${prefix}Wrist` : 'wrist';
    const sh = chain.shoulder;
    const el = chain.elbow;
    const wr = chain.wrist;
    pose[shKey] = pose[shKey] || {};
    pose[elKey] = pose[elKey] || {};
    pose[wrKey] = pose[wrKey] || {};
    pose[shKey].x = sh.position.x;
    pose[shKey].y = sh.position.y;
    pose[shKey].z = sh.position.z;
    pose[shKey].rx = sh.rotation.x;
    pose[shKey].ry = sh.rotation.y;
    pose[shKey].rz = sh.rotation.z;
    pose[elKey].rx = el.rotation.x;
    pose[elKey].ry = el.rotation.y;
    pose[elKey].rz = el.rotation.z;
    pose[wrKey].rx = wr.rotation.x;
    pose[wrKey].ry = wr.rotation.y;
    pose[wrKey].rz = wr.rotation.z;
  }

  function _readPoseFromArms(arms, profile) {
    const rArm = arms.getObjectByName?.('rArm');
    const lArm = arms.getObjectByName?.('lArm');
    const chain = rArm?.userData?.chain;
    if (!chain) return null;
    const pose = _clonePose(profile.defaultPose);
    _readChainIntoPose(pose, '', chain);
    if (profile.gripType === 'tool_caillou' && lArm?.userData?.chain) {
      _readChainIntoPose(pose, 'l', lArm.userData.chain);
      const center = arms.getObjectByName?.('centerItemHolder');
      const pivot = center?.getObjectByName?.('itemPivot');
      if (center && pivot && pose.item) {
        const holdX = -18 * Math.PI / 180;
        const holdY = 18 * Math.PI / 180;
        const holdZ = 6 * Math.PI / 180;
        pose.item.x = pivot.position.x - 0.01;
        pose.item.y = pivot.position.y - 0.01;
        pose.item.z = pivot.position.z + 0.04;
        pose.item.rx = pivot.rotation.x - holdX;
        pose.item.ry = pivot.rotation.y - holdY;
        pose.item.rz = pivot.rotation.z - holdZ;
        pose.center = pose.center || {};
        pose.center.rx = 0;
        pose.center.ry = 0;
        pose.center.rz = 0;
      }
      const grip = ZS.getGrip?.('tool_caillou');
      if (grip?.rArm) pose.rArm = { ...pose.rArm, ...grip.rArm };
      if (grip?.lArm) pose.lArm = { ...pose.lArm, ...grip.lArm };
      if (grip?.itemScale) pose.itemScale = grip.itemScale;
    }
    if (profile.validateItem === 'tool_torche') {
      const holder = rArm.userData?.itemHolder || rArm.getObjectByName?.('itemHolder');
      const pivot = holder?.getObjectByName?.('itemPivot');
      if (pivot) {
        const holdX = -18 * Math.PI / 180;
        const holdY = 18 * Math.PI / 180;
        const holdZ = 6 * Math.PI / 180;
        const handX = 0.01;
        const handY = 0.01;
        const handZ = -0.04;
        pose.item = pose.item || {};
        pose.item.x = pivot.position.x - handX;
        pose.item.y = pivot.position.y - handY;
        pose.item.z = pivot.position.z - handZ;
        pose.item.rx = pivot.rotation.x - holdX;
        pose.item.ry = pivot.rotation.y - holdY;
        pose.item.rz = pivot.rotation.z - holdZ;
      }
    }
    return pose;
  }
