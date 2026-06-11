// Calibrage bras FPS — torche, main vide, presets partagés. Menu admin (F8) → Calibrages.
(function () {
  'use strict';

  const PRESETS_KEY = 'zs_arm_tuner_presets';

  const ARM_FIELDS = [
    { path: 'shoulder.x', label: 'Épaule X', min: -0.6, max: 0.6, step: 0.01 },
    { path: 'shoulder.y', label: 'Épaule Y', min: -0.8, max: 0.2, step: 0.01 },
    { path: 'shoulder.z', label: 'Épaule Z', min: -0.9, max: 0.1, step: 0.01 },
    { path: 'shoulder.rx', label: 'Épaule rot X', min: -2, max: 2, step: 0.01 },
    { path: 'shoulder.ry', label: 'Épaule rot Y', min: -2, max: 2, step: 0.01 },
    { path: 'shoulder.rz', label: 'Épaule rot Z', min: -2, max: 2, step: 0.01 },
    { path: 'elbow.rx', label: 'Coude rot X', min: -0.2, max: 2.2, step: 0.01 },
    { path: 'elbow.ry', label: 'Coude rot Y', min: -1, max: 1, step: 0.01 },
    { path: 'elbow.rz', label: 'Coude rot Z', min: -1, max: 1, step: 0.01 },
    { path: 'wrist.rx', label: 'Poignet rot X', min: -2, max: 2, step: 0.01 },
    { path: 'wrist.ry', label: 'Poignet rot Y', min: -1, max: 1, step: 0.01 },
    { path: 'wrist.rz', label: 'Poignet rot Z', min: -1, max: 1, step: 0.01 },
  ];

  const ITEM_FIELDS = [
    { path: 'item.x', label: 'Item X', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'item.y', label: 'Item Y', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'item.z', label: 'Item Z', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'item.rx', label: 'Item rot X', min: -3.2, max: 3.2, step: 0.01 },
    { path: 'item.ry', label: 'Item rot Y', min: -3.2, max: 3.2, step: 0.01 },
    { path: 'item.rz', label: 'Item rot Z', min: -3.2, max: 3.2, step: 0.01 },
  ];

  const IDLE_FIELDS = [
    { path: 'idle.breatheY', label: 'Respiration Y', min: 0, max: 0.01, step: 0.0001 },
    { path: 'idle.swayZ', label: 'Balancement Z', min: 0, max: 0.01, step: 0.0001 },
    { path: 'idle.freq', label: 'Freq. repos', min: 0.5, max: 3, step: 0.05 },
  ];

  const WALK_FIELDS = [
    { path: 'walk.bobY', label: 'Bob Y', min: 0, max: 0.02, step: 0.0005 },
    { path: 'walk.bobZ', label: 'Bob Z', min: 0, max: 0.02, step: 0.0005 },
    { path: 'walk.freq', label: 'Freq. pas', min: 4, max: 14, step: 0.1 },
    { path: 'walk.shoulderRx', label: 'Épaule swing X', min: -0.3, max: 0.3, step: 0.01 },
    { path: 'walk.shoulderRy', label: 'Épaule swing Y', min: -0.3, max: 0.3, step: 0.01 },
    { path: 'walk.elbowRx', label: 'Coude swing X', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'walk.swingZ', label: 'Swing Z', min: 0, max: 0.06, step: 0.001 },
    { path: 'walk.swingY', label: 'Swing Y', min: 0, max: 0.04, step: 0.001 },
  ];

  function _chainFields(sidePrefix, sectionLabel) {
    const k = (joint) => (sidePrefix ? `${sidePrefix}${joint.charAt(0).toUpperCase()}${joint.slice(1)}` : joint);
    const sh = k('shoulder');
    const el = k('elbow');
    const wr = k('wrist');
    return [
      { section: sectionLabel, path: `${sh}.x`, label: 'Épaule X', min: -0.6, max: 0.6, step: 0.01 },
      { path: `${sh}.y`, label: 'Épaule Y', min: -0.8, max: 0.2, step: 0.01 },
      { path: `${sh}.z`, label: 'Épaule Z', min: -0.9, max: 0.1, step: 0.01 },
      { path: `${sh}.rx`, label: 'Épaule rot X', min: -2, max: 2, step: 0.01 },
      { path: `${sh}.ry`, label: 'Épaule rot Y', min: -2, max: 2, step: 0.01 },
      { path: `${sh}.rz`, label: 'Épaule rot Z', min: -2, max: 2, step: 0.01 },
      { path: `${el}.rx`, label: 'Coude rot X', min: -0.2, max: 2.2, step: 0.01 },
      { path: `${el}.ry`, label: 'Coude rot Y', min: -1, max: 1, step: 0.01 },
      { path: `${el}.rz`, label: 'Coude rot Z', min: -1, max: 1, step: 0.01 },
      { path: `${wr}.rx`, label: 'Poignet rot X', min: -2, max: 2, step: 0.01 },
      { path: `${wr}.ry`, label: 'Poignet rot Y', min: -1, max: 1, step: 0.01 },
      { path: `${wr}.rz`, label: 'Poignet rot Z', min: -1, max: 1, step: 0.01 },
    ];
  }

  const RCHAIN_FIELDS = _chainFields('', 'Bras droit — pose');
  const LCHAIN_FIELDS = _chainFields('l', 'Bras gauche — pose');

  function _fullMcFields(prefix, sectionLabel) {
    return [
      { section: sectionLabel, path: `${prefix}.mcPostX`, label: 'Post X', min: -0.2, max: 0.2, step: 0.01 },
      { path: `${prefix}.mcPostY`, label: 'Post Y', min: -0.2, max: 0.2, step: 0.01 },
      { path: `${prefix}.mcPostZ`, label: 'Post Z', min: -0.3, max: 0.1, step: 0.01 },
      { path: `${prefix}.mcRotX`, label: 'Épaule X°', min: -45, max: 45, step: 1 },
      { path: `${prefix}.mcRotY`, label: 'Épaule Y°', min: -45, max: 45, step: 1 },
      { path: `${prefix}.mcRotZ`, label: 'Épaule Z°', min: -30, max: 30, step: 1 },
      { path: `${prefix}.mcElbowX`, label: 'Coude X°', min: -30, max: 40, step: 1 },
      { path: `${prefix}.mcElbowY`, label: 'Coude Y°', min: -25, max: 25, step: 1 },
      { path: `${prefix}.mcElbowZ`, label: 'Coude Z°', min: -25, max: 25, step: 1 },
      { path: `${prefix}.mcWristX`, label: 'Poignet X°', min: -30, max: 30, step: 1 },
      { path: `${prefix}.mcWristY`, label: 'Poignet Y°', min: -45, max: 45, step: 1 },
      { path: `${prefix}.mcWristZ`, label: 'Poignet Z°', min: -30, max: 30, step: 1 },
    ];
  }

  const ROCK_ITEM_FIELDS = [
    { section: 'Caillou — position / rotation', path: 'item.x', label: 'Offset X', min: -0.25, max: 0.25, step: 0.01 },
    { path: 'item.y', label: 'Offset Y', min: -0.25, max: 0.25, step: 0.01 },
    { path: 'item.z', label: 'Offset Z', min: -0.25, max: 0.25, step: 0.01 },
    { path: 'item.rx', label: 'Rot X', min: -3.2, max: 3.2, step: 0.01 },
    { path: 'item.ry', label: 'Rot Y', min: -3.2, max: 3.2, step: 0.01 },
    { path: 'item.rz', label: 'Rot Z', min: -3.2, max: 3.2, step: 0.01 },
    { section: 'Caillou — centre (extra)', path: 'center.x', label: 'Centre X', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'center.y', label: 'Centre Y', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'center.z', label: 'Centre Z', min: -0.2, max: 0.2, step: 0.01 },
    { path: 'center.rx', label: 'Centre rot X', min: -1.5, max: 1.5, step: 0.01 },
    { path: 'center.ry', label: 'Centre rot Y', min: -1.5, max: 1.5, step: 0.01 },
    { path: 'center.rz', label: 'Centre rot Z', min: -1.5, max: 1.5, step: 0.01 },
    { section: 'Caillou — taille', path: 'itemScale', label: 'Échelle en main', min: 0.35, max: 1.0, step: 0.01 },
  ];

  const REMOTE_FIELDS = [
    { path: 'remote.rArmRot.0', label: 'Bras distant rot X', min: -2, max: 2, step: 0.01 },
    { path: 'remote.rArmRot.1', label: 'Bras distant rot Y', min: -2, max: 2, step: 0.01 },
    { path: 'remote.rArmRot.2', label: 'Bras distant rot Z', min: -2, max: 2, step: 0.01 },
    { path: 'remote.handHolder.0', label: 'Main holder X', min: -1, max: 1, step: 0.01 },
    { path: 'remote.handHolder.1', label: 'Main holder Y', min: -1.2, max: 0.2, step: 0.01 },
    { path: 'remote.handHolder.2', label: 'Main holder Z', min: -1, max: 0.2, step: 0.01 },
  ];

  function _clonePose(p) {
    return JSON.parse(JSON.stringify(p || {}));
  }

  /** Source de vérité — torche calibrée (épaule / coude / poignet / item). */
  const TORCH_POSE = {
    shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
    elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
    wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
    item: { x: -0.02, y: 0, z: 0.06, rx: 0.25, ry: 1.35, rz: -0.07 },
  };

  const VALIDATED_EMPTY_ARM = {
    shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
    elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
    wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
  };

  const PROFILES = {
    tool_torche: {
      title: 'Réglage bras FPS — torche',
      hint: 'Torche équipée · <b>Presets</b> partagés entre toutes les animations · F8 ferme',
      storageKey: 'zs_arm_tuner_torch',
      legacyStorageKey: 'zs_arm_tuner_validated',
      equip: 'tool_torche',
      freezeAnim: true,
      walkPreview: false,
      validateItem: 'tool_torche',
      presetLabel: 'Torche',
      defaultPose: _clonePose(TORCH_POSE),
      fields: () => ARM_FIELDS.concat(ITEM_FIELDS),
    },
    empty_hand: {
      title: 'Réglage bras FPS — main vide',
      hint: 'Bras dérivé de la torche · chargez un preset torche pour le bras · <b>Preview marche</b>',
      storageKey: 'zs_arm_tuner_empty',
      equip: null,
      freezeAnim: false,
      walkPreview: true,
      validateItem: 'empty_hand',
      presetLabel: 'Main vide',
      defaultPose: {
        ..._clonePose(VALIDATED_EMPTY_ARM),
        idle: { breatheY: 0.0012, swayZ: 0.0008, freq: 1.4 },
        walk: {
          bobY: 0.005, bobZ: 0.002, freq: 9.0,
          shoulderRx: -0.10, shoulderRy: 0.11, elbowRx: 0.05,
          swingZ: 0.022, swingY: 0.010,
        },
      },
      fields: () => ARM_FIELDS.concat(IDLE_FIELDS, WALK_FIELDS),
    },
    tool_caillou: {
      title: 'Réglage FPS — caillou (2 mains)',
      hint: 'Bras D/G séparés · micro-ajust MC · centre du caillou · <b>Valider</b> = live',
      storageKey: 'zs_arm_tuner_rock',
      gripType: 'tool_caillou',
      equip: 'tool_caillou',
      freezeAnim: true,
      walkPreview: false,
      validateItem: 'tool_caillou',
      presetLabel: 'Caillou',
      defaultPose: {
        shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
        elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
        wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
        lShoulder: { x: -0.47, y: -0.31, z: -0.44, rx: -0.18, ry: -0.08, rz: 0.04 },
        lElbow: { rx: 1.35, ry: 0.18, rz: 0.18 },
        lWrist: { rx: -0.77, ry: -0.11, rz: -0.11 },
        item: { x: 0, y: -0.01, z: -0.02, rx: 0.04, ry: 0, rz: 0 },
        center: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
        itemScale: 0.60,
        rArm: {
          mcPostX: -0.03, mcPostY: 0, mcPostZ: -0.02,
          mcRotX: -10, mcRotY: -10, mcRotZ: 0,
          mcElbowX: 6, mcElbowY: 0, mcElbowZ: -10,
          mcWristX: 0, mcWristY: -24, mcWristZ: 6,
        },
        lArm: {
          mcPostX: 0.03, mcPostY: 0, mcPostZ: -0.02,
          mcRotX: -10, mcRotY: 10, mcRotZ: 0,
          mcElbowX: 6, mcElbowY: 0, mcElbowZ: 10,
          mcWristX: 0, mcWristY: 24, mcWristZ: -6,
        },
      },
      fields: () => RCHAIN_FIELDS
        .concat(_fullMcFields('rArm', 'Bras droit — micro-ajust'))
        .concat(LCHAIN_FIELDS)
        .concat(_fullMcFields('lArm', 'Bras gauche — micro-ajust'))
        .concat(ROCK_ITEM_FIELDS),
    },
    tool_hachette: {
      title: 'Réglage FPS — hachette (arme/outil)',
      hint: 'Modèle référence pour outils & mêlée · presets partagés',
      storageKey: 'zs_arm_tuner_weapon',
      gripType: 'tool_hachette',
      equip: 'tool_hachette',
      freezeAnim: true,
      walkPreview: false,
      validateItem: 'tool_hachette',
      presetLabel: 'Hachette',
      defaultPose: {
        shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
        elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
        wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
        item: { x: 0.54, y: -0.78, z: 0.22, rx: 0.06, ry: 0.88, rz: -0.52 },
      },
      fields: () => ARM_FIELDS.concat(ITEM_FIELDS),
    },
    remote_view: {
      title: 'Réglage — bras joueur distant',
      hint: 'Vue 3e personne des autres joueurs · affecte tous les grips distants',
      storageKey: 'zs_arm_tuner_remote',
      equip: null,
      freezeAnim: false,
      walkPreview: false,
      validateItem: 'remote_view',
      presetLabel: 'Bras distant',
      defaultPose: {
        remote: { rArmRot: [0.85, 0, -0.62], handHolder: [0, -0.72, -0.12] },
      },
      fields: () => REMOTE_FIELDS,
    },
  };

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

  /** Copie uniquement les champs compatibles avec le profil cible. */
  function _mergePoseForProfile(sourcePose, targetProfileId) {
    const profile = PROFILES[targetProfileId];
    if (!profile || !sourcePose) return _clonePose(profile?.defaultPose);
    const out = _clonePose(profile.defaultPose);
    const paths = profile.fields().map((f) => f.path);
    for (const path of paths) {
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

    show(profileId) {
      const profile = PROFILES[profileId];
      if (!profile || !this._arms) return;
      if (this.open && this.profileId === profileId) return;
      if (this.open) this.hide();
      this._clearShowTimer();
      _ensurePresetsMigrated();
      this.profileId = profileId;
      this.pose = _clonePose(profile.defaultPose);
      try {
        let raw = localStorage.getItem(profile.storageKey);
        if (!raw && profile.legacyStorageKey) raw = localStorage.getItem(profile.legacyStorageKey);
        if (raw) this.pose = { ...this.pose, ...JSON.parse(raw) };
      } catch (_) { /* ignore */ }
      this.walkPreviewOn = false;
      this.open = true;
      window.ZS._armTunerActive = !!profile.freezeAnim;
      window.ZS._armTunerWalkPreview = !!profile.walkPreview;
      if (profile.equip) ZS.setHandItem?.(profile.equip);
      else if (profile.validateItem === 'remote_view') ZS.setHandItem?.(null);
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
      if (!profile) return;
      if (profile.validateItem === 'remote_view') {
        ZS.applyFPSRemoteTune?.(this.pose);
        return;
      }
      if (profile.gripType) {
        ZS.applyFPSGripTuneToArms?.(this._arms, profile.gripType, this.pose, { freeze: profile.freezeAnim });
        return;
      }
      if (profile.validateItem === 'empty_hand') {
        ZS.applyFPSEmptyTuneToArms?.(this._arms, this.pose);
      } else {
        ZS.applyFPSDebugPose?.(this._arms, this.pose);
      }
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

    loadPreset(id) {
      if (!id) {
        this._setStatus('Sélectionnez un preset à charger.');
        return;
      }
      const preset = _loadPresets().find((p) => p.id === id);
      if (!preset) {
        this._setStatus('Preset introuvable.');
        return;
      }
      this.pose = _mergePoseForProfile(preset.pose, this.profileId);
      this._syncInputs();
      this._apply();
      const src = _profileLabel(preset.sourceProfile);
      const same = preset.sourceProfile === this.profileId;
      this._setStatus(same
        ? `Preset « ${preset.name} » chargé.`
        : `Preset « ${preset.name} » chargé (depuis ${src}) — champs compatibles uniquement.`);
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

    _buildPanel() {
      if (this._panel?.parent) this._panel.parent.remove(this._panel);
      const profile = this._profile();
      if (!profile) return;

      const panel = document.createElement('div');
      panel.id = 'zs-arm-tuner';
      const walkRow = profile.walkPreview
        ? '<label class="walk-prev"><input type="checkbox" id="zs-arm-tuner-walk-preview"> Preview marche (balancement)</label>'
        : '';
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
        `<h2>${profile.title}</h2>`,
        `<div class="hint">${profile.hint}</div>`,
        '<div class="sec">Presets <span id="zs-arm-tuner-preset-count" style="opacity:0.7;font-weight:normal"></span></div>',
        '<div class="preset-row">',
        '  <select id="zs-arm-tuner-presets"></select>',
        '  <input type="text" id="zs-arm-tuner-preset-name" class="preset-name" placeholder="Nom du preset (ex. bras relâché v2)" maxlength="48">',
        '</div>',
        '<div class="btns">',
        '  <button type="button" data-act="preset-save">💾 Sauver preset</button>',
        '  <button type="button" data-act="preset-load">📂 Charger</button>',
        '  <button type="button" class="warn" data-act="preset-delete">🗑 Supprimer</button>',
        '</div>',
        walkRow,
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

      const fieldsEl = panel.querySelector('#zs-arm-tuner-fields');
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

      const tuner = this;
      panel.querySelector('#zs-arm-tuner-walk-preview')?.addEventListener('change', (e) => {
        tuner.walkPreviewOn = !!e.target.checked;
        tuner._setStatus(tuner.walkPreviewOn ? 'Preview marche activée.' : 'Preview repos.');
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
        if (act === 'preset-delete') tuner.deletePreset(presetSel?.value);
        if (act === 'close') {
          tuner.hide();
          ZS.AdminHub?.open?.('calibration');
        }
        if (act === 'reset') {
          const p = tuner._profile();
          tuner.pose = _clonePose(p?.defaultPose);
          tuner._syncInputs();
          tuner._apply();
          tuner._setStatus('Pose réinitialisée.');
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
      this._refreshPresetSelect(null, panel);
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
  };

  window.ZS = window.ZS || {};
  ZS.ArmTuner = ArmTuner;

  ZS.Calibration?.register?.({
    id: 'fps_arm_torch',
    title: 'Bras FPS + torche',
    icon: '🔥',
    desc: 'Épaule, coude, poignet et orientation de la torche (vue first-person).',
    tags: ['fps', 'viewmodel', 'tool_torche'],
    open: () => ArmTuner.show('tool_torche'),
    close: () => ArmTuner.hide(),
    isOpen: () => ArmTuner.open && ArmTuner.profileId === 'tool_torche',
  });

  ZS.Calibration?.register?.({
    id: 'fps_arm_empty',
    title: 'Bras FPS — main vide',
    icon: '🖐️',
    desc: 'Pose au repos et balancement marche sans item.',
    tags: ['fps', 'viewmodel', 'empty_hand'],
    open: () => ArmTuner.show('empty_hand'),
    close: () => ArmTuner.hide(),
    isOpen: () => ArmTuner.open && ArmTuner.profileId === 'empty_hand',
  });

  ZS.Calibration?.register?.({
    id: 'fps_arm_rock',
    title: 'Bras FPS — caillou (2 mains)',
    icon: '🪨',
    desc: 'Prise deux mains, offsets MC gauche/droite, taille du caillou.',
    tags: ['fps', 'tool_caillou'],
    open: () => ArmTuner.show('tool_caillou'),
    close: () => ArmTuner.hide(),
    isOpen: () => ArmTuner.open && ArmTuner.profileId === 'tool_caillou',
  });

  ZS.Calibration?.register?.({
    id: 'fps_arm_weapons',
    title: 'Bras FPS — hachette / outils',
    icon: '⚔️',
    desc: 'Référence mêlée & outils (hachette) — presets réutilisables.',
    tags: ['fps', 'tool_hachette'],
    open: () => ArmTuner.show('tool_hachette'),
    close: () => ArmTuner.hide(),
    isOpen: () => ArmTuner.open && ArmTuner.profileId === 'tool_hachette',
  });

  ZS.Calibration?.register?.({
    id: 'fps_remote_arms',
    title: 'Bras joueur distant (3e personne)',
    icon: '👥',
    desc: 'Rotation bras et position main pour les autres joueurs.',
    tags: ['fps', 'remote'],
    open: () => ArmTuner.show('remote_view'),
    close: () => ArmTuner.hide(),
    isOpen: () => ArmTuner.open && ArmTuner.profileId === 'remote_view',
  });

  _ensurePresetsMigrated();
}());
