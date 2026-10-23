// Constantes + PROFILES — extrait de fps_arm_tuner.js (IIFE)
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

  const ARM_CHAIN_KEYS = ['shoulder', 'elbow', 'wrist', 'lShoulder', 'lElbow', 'lWrist'];

  function _copyArmChainSections(src, dst) {
    if (!src || !dst) return;
    for (const key of ARM_CHAIN_KEYS) {
      if (src[key] && typeof src[key] === 'object') {
        dst[key] = { ...(dst[key] || {}), ...JSON.parse(JSON.stringify(src[key])) };
      }
    }
  }

  function _readValidatedPose(profileId) {
    const prof = PROFILES[profileId];
    if (!prof) return null;
    try {
      let raw = localStorage.getItem(prof.storageKey);
      if (!raw && prof.legacyStorageKey) raw = localStorage.getItem(prof.legacyStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function _listValidatedArmSources(excludeProfileId) {
    const out = [];
    for (const [id, prof] of Object.entries(PROFILES)) {
      if (id === excludeProfileId) continue;
      const pose = _readValidatedPose(id);
      if (!pose?.shoulder && !pose?.lShoulder) continue;
      out.push({ id, label: prof.presetLabel || id, pose });
    }
    return out;
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
      hint: 'Référence outils & mêlée 1 main · presets partagés',
      storageKey: 'zs_arm_tuner_weapon',
      gripType: 'tool_hachette',
      equip: 'tool_hachette',
      freezeAnim: true,
      walkPreview: false,
      validateItem: 'tool_hachette',
      presetLabel: 'Hachette',
      dynamicBase: true,
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
