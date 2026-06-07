// Modèles personnages + bras FPS + items en main (modèles .glb + fallback procédural)
(function () {
  'use strict';

  const SKIN  = 0xFFCBA4;
  const SHIRT = 0x3B82F6;
  const PANTS = 0x1E3A8A;
  const SHOES = 0x333333;

  // ── Personnages ────────────────────────────────────────────────────────────

  function createPlayerModel(opts = {}) {
    return _createHumanoidRig({ name: 'playerRig', local: !!opts.local });
  }

  function createZombieModel(prefabId) {
    if (ZS.ZombiePrefabs?.build) {
      const built = ZS.ZombiePrefabs.build(prefabId || 'zombie_walker');
      if (built) return built;
    }
    const g = _createHumanoidRig({
      name: 'zombieRig',
      skin: 0x6daf6d,
      shirt: 0x3a3a2a,
      pants: 0x2a2a1a,
      eyes: 0xff2222,
    });
    const r = g.userData.rig;
    r.leftShoulder.rotation.x = r.rightShoulder.rotation.x = Math.PI / 2.5;
    g.userData.prefabId = 'zombie_walker';
    g.userData.healthBarY = 2.4;
    return g;
  }

  function _createHumanoidRig(opts = {}) {
    const skinMat = m(opts.skin || SKIN);
    const shirtMat = m(opts.shirt || SHIRT);
    const pantsMat = m(opts.pants || PANTS);
    const shoeMat = m(SHOES);
    const eyeMat = m(opts.eyes || 0x222222);

    const root = new THREE.Group();
    root.name = opts.name || 'humanoidRig';

    const hips = _bone('hips', root, 0, 0.94, 0);
    const spine = _bone('spine', hips, 0, 0.26, 0);
    const chest = _bone('chest', spine, 0, 0.30, 0);
    const neck = _bone('neck', chest, 0, 0.36, 0);
    const head = _bone('head', neck, 0, 0.12, 0);
    const cameraAnchor = _bone('cameraAnchor', head, 0, 0.06, -0.06);

    const body = new THREE.Group();
    body.name = 'bodyMesh';
    addBox(body, shirtMat, 0.62, 0.78, 0.32, 0, -0.08, 0);
    body.userData.skinSlot = 'torso';
    chest.add(body);

    const headMesh = new THREE.Group();
    headMesh.name = 'headMesh';
    addBox(headMesh, skinMat, 0.72, 0.72, 0.72, 0, 0.16, 0);
    addBox(headMesh, eyeMat, 0.12, 0.075, 0.035, -0.16, 0.21, -0.37);
    addBox(headMesh, eyeMat, 0.12, 0.075, 0.035,  0.16, 0.21, -0.37);
    headMesh.userData.skinSlot = 'head';
    if (opts.local) {
      headMesh.visible = false;
      body.visible = false;
    }
    head.add(headMesh);

    const leftArm = _createArm(chest, -1, skinMat, shirtMat);
    const rightArm = _createArm(chest, 1, skinMat, shirtMat);
    const leftLeg = _createLeg(hips, -1, pantsMat, shoeMat);
    const rightLeg = _createLeg(hips, 1, pantsMat, shoeMat);
    if (opts.local) {
      leftArm.shoulder.visible = false;
      leftLeg.hip.visible = false;
      rightLeg.hip.visible = false;
      hips.visible = true;
    }

    root.userData.rig = {
      hips, spine, chest, neck, head, cameraAnchor,
      leftShoulder: leftArm.shoulder, leftElbow: leftArm.elbow, leftWrist: leftArm.wrist, leftHand: leftArm.hand, leftItemHolder: leftArm.holder,
      rightShoulder: rightArm.shoulder, rightElbow: rightArm.elbow, rightWrist: rightArm.wrist, rightHand: rightArm.hand, rightItemHolder: rightArm.holder,
      leftHip: leftLeg.hip, leftKnee: leftLeg.knee, leftAnkle: leftLeg.ankle,
      rightHip: rightLeg.hip, rightKnee: rightLeg.knee, rightAnkle: rightLeg.ankle,
      body,
    };
    root.userData.limbs = {
      lArm: leftArm.shoulder,
      rArm: rightArm.shoulder,
      lLeg: leftLeg.hip,
      rLeg: rightLeg.hip,
    };
    root.userData.skinSlots = _collectSkinSlots(root);
    return root;
  }

  /** Pose couchée (joueur endormi / déconnecté). */
  function applySleepPose(root) {
    const rig = root.userData.rig;
    const limbs = root.userData.limbs;
    if (!rig || !limbs) return;
    root.rotation.x = -Math.PI / 2;
    root.position.y += 0.22;
    rig.hips.rotation.z = 0.08;
    limbs.lArm.rotation.x = 0.35;
    limbs.lArm.rotation.z = 0.45;
    limbs.rArm.rotation.x = -0.15;
    limbs.rArm.rotation.z = -0.35;
    limbs.lLeg.rotation.x = 0.12;
    limbs.rLeg.rotation.x = -0.08;
  }

  function _bone(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  function _createArm(parent, side, skinMat, shirtMat) {
    const prefix = side < 0 ? 'left' : 'right';
    const shoulder = _bone(prefix + 'Shoulder', parent, side * 0.43, 0.14, 0);
    const upper = new THREE.Group();
    upper.name = prefix + 'UpperArmMesh';
    addBox(upper, shirtMat, 0.24, 0.34, 0.24, 0, -0.17, 0);
    upper.userData.skinSlot = prefix + 'UpperArm';
    shoulder.add(upper);

    const elbow = _bone(prefix + 'Elbow', shoulder, 0, -0.34, 0);
    const fore = new THREE.Group();
    fore.name = prefix + 'ForearmMesh';
    addBox(fore, shirtMat, 0.23, 0.28, 0.23, 0, -0.14, 0);
    fore.userData.skinSlot = prefix + 'Forearm';
    elbow.add(fore);

    const wrist = _bone(prefix + 'Wrist', elbow, 0, -0.28, 0);
    const hand = _bone(prefix + 'Hand', wrist, 0, 0, 0);
    const handMesh = new THREE.Group();
    handMesh.name = prefix + 'HandMesh';
    addBox(handMesh, skinMat, 0.22, 0.18, 0.22, 0, -0.09, 0);
    handMesh.userData.skinSlot = prefix + 'Hand';
    hand.add(handMesh);

    const holder = new THREE.Group();
    holder.name = side > 0 ? 'itemHolder' : 'offhandHolder';
    holder.position.set(side * 0.03, -0.13, -0.13);
    hand.add(holder);
    _getItemPivot(holder);

    return { shoulder, elbow, wrist, hand, holder };
  }

  function _createLeg(parent, side, pantsMat, shoeMat) {
    const prefix = side < 0 ? 'left' : 'right';
    const hip = _bone(prefix + 'Hip', parent, side * 0.16, -0.16, 0);
    const thigh = new THREE.Group();
    thigh.name = prefix + 'ThighMesh';
    addBox(thigh, pantsMat, 0.24, 0.36, 0.24, 0, -0.18, 0);
    thigh.userData.skinSlot = prefix + 'Thigh';
    hip.add(thigh);

    const knee = _bone(prefix + 'Knee', hip, 0, -0.36, 0);
    const shin = new THREE.Group();
    shin.name = prefix + 'ShinMesh';
    addBox(shin, pantsMat, 0.23, 0.34, 0.23, 0, -0.17, 0);
    addBox(shin, shoeMat, 0.25, 0.10, 0.30, 0, -0.37, 0.03);
    shin.userData.skinSlot = prefix + 'Shin';
    knee.add(shin);

    const ankle = _bone(prefix + 'Ankle', knee, 0, -0.36, 0);
    return { hip, knee, ankle };
  }

  function _collectSkinSlots(root) {
    const slots = {};
    root.traverse((o) => {
      if (o.userData?.skinSlot) slots[o.userData.skinSlot] = o;
    });
    return slots;
  }

  // ── GRIPS — poses + animations par objet (source de vérité FPS + 3e personne) ─

  const _ANIM_BASE = {
    recoil: { kickZ: 0.04, pitchX: 0.10, rArmX: 0.05, lArmZ: 0.02, dur: 0.12 },
    melee:  { style: 'swing_side', swingX: 0.55, swingZ: 0.18, swingY: 0.0, dur: 0.28 },
    reload: { dropY: 0.12, tiltX: 0.32, magPull: 0.10, raiseY: 0.06 },
    idle:   { breatheY: 0.002, swayZ: 0.0015, freq: 1.6 },
    walk:   { bobY: 0.008, bobZ: 0.004, freq: 9.0 },
    punch:  { style: 'punch', swingX: 0.65, swingZ: 0.10, dur: 0.24 },
    use:    { style: 'eat', liftY: 0.18, liftZ: 0.14, tiltX: 0.42, rArmLift: 0.26, dur: 0.5 },
  };

  // ── Transform FPS Minecraft (ItemInHandRenderer / ItemRenderer 1.20) ─────
  const _DEG = Math.PI / 180;

  // Ancrage épaule : bas-droite écran, collé à la caméra (viewmodel). z était -1.22 → trop loin.
  const _FPS_RIGHT = { x: 0.14, y: -0.47, z: -0.48, rx: 0.74, ry: 0.26, rz: -0.14 };
  const _FPS_LEFT  = { x: -0.16, y: -0.42, z: -0.52, rx: 0.70, ry: -0.16, rz: 0.10 };

  // Rotation objet en main. Les overrides par type restent dans GRIP_TYPES.
  const _MC_ITEM_HOLD = { x: -18 * _DEG, y: 18 * _DEG, z: 6 * _DEG };
  const _ITEM_HAND  = { x: 0.01, y: 0.01, z: -0.04 };

  const _PALM = { grip: [0.01, -0.01, -0.06], hold: [0.015, -0.005, -0.07] };

  const _REMOTE_AIM = {
    rArmRot: [0.85, 0, -0.62],
    handHolder: [0, -0.72, -0.12],
    lArmMode: 'aimAtHand',
  };

  function _mergeAnim(base, over) {
    if (!over) return base;
    const out = {};
    for (const k of Object.keys(base)) {
      out[k] = (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]))
        ? { ...base[k], ...over[k] } : (over[k] ?? base[k]);
    }
    return out;
  }

  const _TMP_HAND_A = new THREE.Vector3();
  const _TMP_HAND_B = new THREE.Vector3();
  const _TMP_HAND_M = new THREE.Vector3();

  function _grip(partial) {
    return {
      twoHanded: !!partial.twoHanded,
      sharedItem: !!partial.sharedItem,
      item: partial.item || null,
      rArm: partial.rArm,
      lArm: partial.lArm ?? null,
      anim: _mergeAnim(_ANIM_BASE, partial.anim),
      remote: partial.remote || null,
      glbOffset: partial.glbOffset || null,
    };
  }

  const GRIP_EMPTY = _grip({
    twoHanded: false,
    rArm: { style: 'grip' },
    lArm: null,
  });

  const GRIP_CATEGORIES = {
    firearm: _grip({
      twoHanded: true,
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.10, rz: 0 },
      rArm: { style: 'grip', mcRotX: -8, mcRotY: -4 },
      lArm: { mcPostZ: -0.14, mcPostY: 0.02 },
      remote: _REMOTE_AIM,
      anim: { recoil: { kickZ: 0.05, pitchX: 0.12, rArmX: 0.07, dur: 0.12 } },
    }),
    melee: _grip({
      item: { x: 0, y: -0.06, z: 0.02, rx: 0.12, ry: 0.04, rz: 0 },
      rArm: { style: 'grip' },
      anim: { melee: { style: 'swing_side', swingX: 0.50, swingZ: 0.16, dur: 0.26 } },
    }),
    tool: _grip({
      item: { x: 0, y: -0.10, z: 0.02, rx: 0.10, ry: 0.05, rz: 0 },
      rArm: { style: 'grip' },
      anim: { melee: { style: 'swing_down', swingX: 0.55, swingZ: 0.28, dur: 0.32 } },
    }),
    food: _grip({
      item: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
      rArm: { style: 'hold' },
      anim: { use: { style: 'eat', dur: 0.5 } },
    }),
    medical: _grip({
      item: { x: 0, y: 0, z: 0.02, rx: 0.05, ry: 0.05, rz: 0 },
      rArm: { style: 'hold' },
      anim: { use: { style: 'apply', dur: 1.5 } },
    }),
    ammo: _grip({
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.10, rz: 0 },
      rArm: { style: 'hold' },
    }),
    resource: _grip({
      item: { x: 0, y: 0, z: 0.02, rx: 0.04, ry: 0.06, rz: 0 },
      rArm: { style: 'hold' },
    }),
    equipment: _grip({
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.12, rz: 0 },
      rArm: { style: 'hold' },
    }),
    structure: _grip({
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.08, rz: 0 },
      rArm: { style: 'hold' },
    }),
  };

  const GRIP_TYPES = {
    wpn_pistolet: _grip({
      twoHanded: false,
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.08, rz: 0 },
      rArm: { style: 'grip', mcRotX: -10, mcRotY: -3 },
      lArm: null,
      remote: _REMOTE_AIM,
      anim: { recoil: { kickZ: 0.03, pitchX: 0.07, rArmX: 0.04, dur: 0.10 } },
    }),
    pistol: _grip({
      twoHanded: false,
      item: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0.08, rz: 0 },
      rArm: { style: 'grip', mcRotX: -10, mcRotY: -3 },
      lArm: null,
      remote: _REMOTE_AIM,
      anim: { recoil: { kickZ: 0.03, pitchX: 0.07, rArmX: 0.04, dur: 0.10 } },
    }),
    wpn_fusil_pompe: _grip({
      twoHanded: true,
      item: { x: 0, y: 0, z: 0.06, rx: 0, ry: 0.12, rz: 0 },
      rArm: { style: 'grip', mcRotX: -12, mcRotY: -5 },
      lArm: { mcPostZ: -0.20, mcPostY: 0.03 },
      remote: _REMOTE_AIM,
      anim: { recoil: { kickZ: 0.08, pitchX: 0.18, rArmX: 0.10, dur: 0.14 } },
    }),
    wpn_fusil_chasse: _grip({
      twoHanded: true,
      item: { x: 0, y: 0, z: 0.08, rx: 0, ry: 0.11, rz: 0 },
      rArm: { style: 'grip', mcRotX: -12, mcRotY: -5 },
      lArm: { mcPostZ: -0.22, mcPostY: 0.03 },
      remote: _REMOTE_AIM,
      anim: { recoil: { kickZ: 0.10, pitchX: 0.22, rArmX: 0.12, dur: 0.16 } },
    }),
    wpn_barre_fer: _grip({
      twoHanded: true,
      item: { x: 0, y: 0, z: 0.04, rx: 0.06, ry: 0, rz: 0 },
      rArm: { style: 'grip', mcRotX: -6 },
      lArm: { mcPostZ: -0.16, mcPostY: 0.03 },
      remote: { rArmRot: [0.75, 0, -0.45], handHolder: [0, -0.72, -0.12], lArmMode: 'aimAtHand' },
      anim: { melee: { style: 'swing_side', swingX: 0.48, swingZ: 0.12, dur: 0.34 } },
    }),
    wpn_arc_artisanal: _grip({
      twoHanded: true,
      item: { x: 0.02, y: 0.04, z: 0.08, rx: 0.12, ry: 0, rz: 0 },
      rArm: { style: 'grip', mcRotX: -8 },
      lArm: { mcPostZ: -0.14, mcPostY: 0.04 },
      remote: { rArmRot: [0.65, 0, -0.35], handHolder: [0, -0.68, -0.10], lArmMode: 'aimAtHand' },
      anim: { melee: { style: 'swing_side', swingX: 0.32, swingZ: 0.08, dur: 0.28 } },
    }),
    wpn_lance_artisanale: _grip({
      twoHanded: true,
      item: { x: 0, y: 0, z: 0.06, rx: 0.05, ry: 0, rz: 0 },
      rArm: { style: 'grip', mcRotX: -5 },
      lArm: { mcPostZ: -0.18, mcPostY: 0.02 },
      remote: { rArmRot: [0.72, 0, -0.40], handHolder: [0, -0.72, -0.14], lArmMode: 'aimAtHand' },
      anim: { melee: { style: 'thrust', swingX: 0.35, swingZ: 0.02, dur: 0.30 } },
    }),
    wpn_couteau: _grip({
      item: { x: 0, y: -0.02, z: -0.16, rx: 0.22, ry: 0.04, rz: 0.04 },
      anim: { melee: { style: 'stab', swingX: 0.42, swingZ: 0.08, swingY: 0.22, dur: 0.22 } },
    }),
    wpn_hache_combat: _grip({
      item: { x: -0.03, y: -0.30, z: -0.24, rx: 0.34, ry: 0.04, rz: 0.02 },
      anim: { melee: { style: 'swing_down', swingX: 0.52, swingZ: 0.32, dur: 0.36 } },
    }),
    wpn_machette: _grip({
      item: { x: 0, y: -0.08, z: -0.18, rx: 0.20, ry: 0.04, rz: 0.03 },
      anim: { melee: { style: 'swing_side', swingX: 0.48, swingZ: 0.14, swingY: 0.18, dur: 0.26 } },
    }),
    wpn_batte_cloutee: _grip({
      item: { x: 0, y: -0.04, z: -0.24, rx: 0.24, ry: 0.04, rz: 0.01 },
      anim: { melee: { style: 'swing_overhead', swingX: 0.70, swingZ: 0.22, dur: 0.34 } },
    }),
    food_eau_bouteille: _grip({
      item: { x: 0, y: 0.02, z: -0.02, rx: 0, ry: 0, rz: 0 },
      anim: { use: { style: 'drink', dur: 0.6 } },
      glbOffset: { x: 0, y: 0.02, z: -0.02 },
    }),
    food_conserves: _grip({
      item: { x: 0, y: 0.04, z: -0.05, rx: 0.06, ry: 0.08, rz: 0 },
      anim: { use: { style: 'eat', dur: 0.55 } },
    }),
    food_haricots_boite: _grip({
      anim: { use: { style: 'eat', dur: 0.55 } },
    }),
    food_soupe_conserve: _grip({
      anim: { use: { style: 'drink', dur: 0.55 } },
    }),
    food_pain: _grip({
      item: { x: 0, y: 0.03, z: -0.05, rx: 0.04, ry: 0.06, rz: 0.04 },
      anim: { use: { style: 'bite', dur: 0.45 } },
    }),
    food_fruits: _grip({
      item: { x: 0, y: 0.04, z: -0.04, rx: 0.04, ry: 0.05, rz: 0 },
      anim: { use: { style: 'bite', dur: 0.4 } },
    }),
    food_boisson_energisante: _grip({
      anim: { use: { style: 'drink', dur: 0.55 } },
    }),
    med_bandage: _grip({
      item: { x: 0, y: 0.03, z: -0.05, rx: 0.10, ry: 0.08, rz: 0.04 },
      anim: { use: { style: 'bandage', wrapRy: 0.45, dur: 2.0 } },
    }),
    med_kit_soin: _grip({
      item: { x: 0, y: 0.02, z: -0.06, rx: 0.04, ry: 0.08, rz: 0 },
      anim: { use: { style: 'apply', dur: 3.0 } },
    }),
    med_seringue_anti_infection: _grip({
      item: { x: 0, y: 0.04, z: -0.05, rx: 0.12, ry: 0.06, rz: 0.02 },
      anim: { use: { style: 'inject', thrustZ: 0.06, dur: 1.2 } },
    }),
    tool_torche: _grip({
      item: { x: 0, y: 0, z: 0.03, rx: 0.22, ry: 0.04, rz: 0.02 },
      rArm: { style: 'grip', mcRotX: -5 },
    }),
    tool_marteau: _grip({
      item: { x: 0, y: -0.05, z: -0.21, rx: 0.24, ry: 0.05, rz: 0.01 },
      anim: { melee: { style: 'swing_down', swingX: 0.58, swingZ: 0.30, dur: 0.34 } },
    }),
    tool_caillou: _grip({
      twoHanded: true,
      sharedItem: true,
      item: { x: 0, y: 0.01, z: -0.03, rx: 0.06, ry: 0, rz: 0.02 },
      rArm: {
        style: 'grip', mcRotX: -16, mcRotY: -18,
        mcPostX: 0.06, mcPostZ: -0.04,
        mcElbowZ: -12, mcWristY: -18,
      },
      lArm: {
        style: 'grip', mcRotX: -16, mcRotY: 18,
        mcPostX: -0.06, mcPostY: 0.01, mcPostZ: -0.06,
        mcElbowZ: 12, mcWristY: 18,
      },
      remote: { rArmRot: [0.58, 0, -0.28], handHolder: [0, -0.66, -0.10], lArmMode: 'aimAtHand' },
      anim: {
        melee: {
          style: 'rock_slam',
          swingX: 0.58,
          swingZ: 0.14,
          dur: 0.34,
        },
      },
    }),
    tool_hachette: _grip({
      item: { x: 0.54, y: -0.78, z: 0.22, rx: 0.06, ry: 0.88, rz: -0.52 },
      anim: { melee: { style: 'swing_down', swingX: 0.54, swingZ: 0.28, dur: 0.30 } },
    }),
    tool_pioche: _grip({
      item: { x: 0, y: -0.14, z: -0.22, rx: 0.28, ry: 0.04, rz: 0.01 },
      anim: { melee: { style: 'swing_down', swingX: 0.56, swingZ: 0.32, dur: 0.36 } },
    }),
    tool_hache_pierre: _grip({
      item: { x: 0.54, y: -0.78, z: 0.22, rx: 0.06, ry: 0.88, rz: -0.52 },
      anim: { melee: { style: 'swing_down', swingX: 0.54, swingZ: 0.28, dur: 0.30 } },
    }),
    tool_pioche_pierre: _grip({
      item: { x: 0, y: -0.14, z: -0.22, rx: 0.28, ry: 0.04, rz: 0.01 },
      anim: { melee: { style: 'swing_down', swingX: 0.56, swingZ: 0.32, dur: 0.36 } },
    }),
    wpn_lance_bois: _grip({
      item: { x: 0, y: -0.02, z: -0.34, rx: 0.12, ry: 0.02, rz: 0.01 },
      anim: { melee: { style: 'thrust', thrustZ: 0.42, dur: 0.28 } },
    }),
    wpn_lance_pierre: _grip({
      item: { x: 0, y: -0.02, z: -0.34, rx: 0.12, ry: 0.02, rz: 0.01 },
      anim: { melee: { style: 'thrust', thrustZ: 0.42, dur: 0.28 } },
    }),
  };

  function _palmOffset(style) {
    const p = _PALM[style === 'hold' ? 'hold' : 'grip'];
    return { x: p[0], y: p[1], z: p[2] };
  }

  function _resolveRArmPose(grip) {
    const ra = grip.rArm || {};
    return {
      style: ra.style || 'grip',
      mcRotX: ra.mcRotX || 0,
      mcRotY: ra.mcRotY || 0,
      mcRotZ: ra.mcRotZ || 0,
    };
  }

  function _getRigParts(root) {
    const rig = root?.userData?.rig || {};
    const limbs = root?.userData?.limbs || {};
    return {
      rArm: root?.getObjectByName?.('rArm') || limbs.rArm || rig.rightShoulder || null,
      lArm: root?.getObjectByName?.('lArm') || limbs.lArm || rig.leftShoulder || null,
      rightHolder: rig.rightItemHolder || root?.getObjectByName?.('itemHolder') || null,
      leftHolder: rig.leftItemHolder || root?.getObjectByName?.('offhandHolder') || null,
      head: rig.head || root?.getObjectByName?.('head') || null,
      neck: rig.neck || root?.getObjectByName?.('neck') || null,
    };
  }

  function _setEuler(obj, x, y, z) {
    obj.rotation.order = 'YXZ';
    obj.rotation.set(x || 0, y || 0, z || 0);
  }

  function _resetChain(chain) {
    if (!chain) return;
    _setEuler(chain.shoulder, 0, 0, 0);
    _setEuler(chain.elbow, 0, 0, 0);
    _setEuler(chain.wrist, 0, 0, 0);
    if (chain.hand) _setEuler(chain.hand, 0, 0, 0);
  }

  function _applyFPSArmChain(chain, side, grip, opts) {
    if (!chain) return;
    opts = opts || {};
    const i = side === 'left' ? -1 : 1;
    const base = side === 'left' ? _FPS_LEFT : _FPS_RIGHT;
    const ra = grip?.rArm || {};
    const style = ra.style || 'grip';
    const swing = Math.max(0, Math.min(1, opts.swing || 0));
    const swingSin = Math.sin(swing * Math.PI);
    const swingEase = Math.sin(Math.sqrt(swing) * Math.PI);
    const useT = opts.useT != null ? Math.max(0, Math.min(1, opts.useT)) : 0;
    const useEase = 1 - Math.pow(1 - useT, 4);

    chain.shoulder.position.set(
      base.x + (opts.dx || 0),
      base.y + (opts.dy || 0),
      base.z + (opts.dz || 0),
    );

    let sx = base.rx + (ra.mcRotX || 0) * _DEG;
    let sy = base.ry + i * (ra.mcRotY || 0) * _DEG;
    let sz = base.rz + i * (ra.mcRotZ || 0) * _DEG;
    let ex = style === 'hold' ? 1.22 : 1.08;
    let ey = i * (style === 'hold' ? -0.10 : -0.04);
    let ez = i * (style === 'hold' ? 0.12 : -0.08);
    let wx = style === 'hold' ? -0.44 : -0.34;
    let wy = i * 0.05;
    let wz = i * -0.03;
    ex += (ra.mcElbowX || 0) * _DEG;
    ey += i * (ra.mcElbowY || 0) * _DEG;
    ez += i * (ra.mcElbowZ || 0) * _DEG;
    wx += (ra.mcWristX || 0) * _DEG;
    wy += i * (ra.mcWristY || 0) * _DEG;
    wz += i * (ra.mcWristZ || 0) * _DEG;
    sx += opts.shoulderRx || 0;
    ex += opts.elbowRx || 0;
    wx += opts.wristRx || 0;

    if (swing > 0) {
      sx += -0.68 * swingEase;
      sy += i * 0.20 * swingSin;
      sz += i * 0.36 * swingSin;
      ex += -0.42 * swingSin;
      wx += 0.26 * swingSin;
      chain.shoulder.position.z += -0.03 * swingEase;
    }

    if (useT > 0) {
      chain.shoulder.position.x += i * -0.10 * useEase;
      chain.shoulder.position.y += 0.10 * useEase;
      chain.shoulder.position.z += -0.04 * useEase;
      sx += -0.46 * useEase;
      sy += i * -0.18 * useEase;
      sz += i * 0.14 * useEase;
      ex += -0.34 * useEase;
      wx += 0.36 * useEase;
    }

    _setEuler(chain.shoulder, sx, sy, sz);
    _setEuler(chain.elbow, ex, ey, ez);
    _setEuler(chain.wrist, wx, wy, wz);
  }

  function _getItemPivot(holder) {
    let pivot = holder.getObjectByName('itemPivot');
    if (!pivot) {
      pivot = new THREE.Group();
      pivot.name = 'itemPivot';
      holder.add(pivot);
    }
    return pivot;
  }

  function _getCenterItemHolder(fpsGroup) {
    let h = fpsGroup.getObjectByName('centerItemHolder');
    if (!h) {
      h = new THREE.Group();
      h.name = 'centerItemHolder';
      fpsGroup.add(h);
      _getItemPivot(h);
    }
    return h;
  }

  /** Pivot item au milieu des deux mains FPS (caillou two-hand). */
  function _syncSharedItemHolder(fpsGroup, parts, grip, io) {
    const rHand = parts.rArm?.userData?.chain?.hand;
    const lHand = parts.lArm?.userData?.chain?.hand;
    if (!rHand || !lHand || !grip?.item) return null;
    rHand.updateWorldMatrix(true, false);
    lHand.updateWorldMatrix(true, false);
    rHand.getWorldPosition(_TMP_HAND_A);
    lHand.getWorldPosition(_TMP_HAND_B);
    _TMP_HAND_M.addVectors(_TMP_HAND_A, _TMP_HAND_B).multiplyScalar(0.5);
    fpsGroup.updateWorldMatrix(true, false);
    fpsGroup.worldToLocal(_TMP_HAND_M);
    const center = _getCenterItemHolder(fpsGroup);
    center.position.set(
      _TMP_HAND_M.x + (grip.item.x || 0) + (io.x || 0),
      _TMP_HAND_M.y + (grip.item.y || 0) + (io.y || 0),
      _TMP_HAND_M.z + (grip.item.z || 0) + (io.z || 0),
    );
    const pivot = _getItemPivot(center);
    pivot.position.set(_ITEM_HAND.x, _ITEM_HAND.y, _ITEM_HAND.z);
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(
      _MC_ITEM_HOLD.x + (grip.item.rx || 0) + (io.rx || 0),
      _MC_ITEM_HOLD.y + (grip.item.ry || 0) + (io.ry || 0),
      _MC_ITEM_HOLD.z + (grip.item.rz || 0) + (io.rz || 0));
    center.visible = true;
    return center;
  }

  function getGrip(type) {
    if (!type) return GRIP_EMPTY;
    const cat = ZS.ITEMS?.[type]?.category || '';
    const base = GRIP_CATEGORIES[cat] || GRIP_EMPTY;
    const over = GRIP_TYPES[type];
    if (!over) return base;
    const g = _grip({
      twoHanded: over.twoHanded ?? base.twoHanded,
      sharedItem: over.sharedItem ?? base.sharedItem,
      item: over.item ? { ...(base.item || {}), ...over.item } : base.item,
      rArm: over.rArm ? { ...base.rArm, ...over.rArm } : base.rArm,
      lArm: over.lArm !== undefined ? over.lArm : base.lArm,
      remote: over.remote || base.remote,
      glbOffset: over.glbOffset || base.glbOffset,
    });
    g.anim = _mergeAnim(base.anim, over.anim);
    return g;
  }

  // ── Rig FPS articulé (épaules / coudes / poignets / mains) ────────────────

  function _mcMat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  function _createFPSArmChain(parent, side) {
    const prefix = side < 0 ? 'left' : 'right';
    const shoulder = new THREE.Group();
    shoulder.name = side > 0 ? 'rArm' : 'lArm';
    parent.add(shoulder);

    addBox(shoulder, _mcMat(SHIRT), 0.10, 0.10, 0.18, 0, 0, -0.09);
    const elbow = _bone(prefix + 'Elbow', shoulder, 0, 0, -0.24);
    addBox(elbow, _mcMat(SHIRT), 0.09, 0.09, 0.16, 0, 0, -0.08);
    const wrist = _bone(prefix + 'Wrist', elbow, 0, 0, -0.20);
    const hand = _bone(prefix + 'Hand', wrist, 0, 0, 0);
    addBox(hand, _mcMat(SKIN), 0.11, 0.11, 0.11, 0, 0, -0.055);

    const holder = new THREE.Group();
    holder.name = side > 0 ? 'itemHolder' : 'offhandHolder';
    holder.position.set(side * 0.01, -0.01, -0.13);
    hand.add(holder);
    _getItemPivot(holder);

    const chain = { shoulder, elbow, wrist, hand, holder };
    shoulder.userData.chain = chain;
    shoulder.userData.itemHolder = holder;
    return chain;
  }

  function createFPSArms() {
    const g = new THREE.Group();
    g.name = 'fpsSkeleton';
    g.userData.isFPS = true;
    g.userData.gripType = null;
    g.userData.basePose = null;
    g.userData.anim = null;
    g.userData.idleTime = 0;
    g.userData.walkPhase = 0;

    const right = _createFPSArmChain(g, 1);
    const left = _createFPSArmChain(g, -1);
    left.shoulder.visible = false;
    g.userData.rig = {
      rightShoulder: right.shoulder, rightElbow: right.elbow, rightWrist: right.wrist, rightHand: right.hand, rightItemHolder: right.holder,
      leftShoulder: left.shoulder, leftElbow: left.elbow, leftWrist: left.wrist, leftHand: left.hand, leftItemHolder: left.holder,
    };
    g.userData.limbs = { rArm: right.shoulder, lArm: left.shoulder };

    _applyGripPose(g, GRIP_EMPTY);
    _saveBasePose(g, GRIP_EMPTY, null);
    return g;
  }

  function _applyGripPose(fpsGroup, grip, offsets) {
    offsets = offsets || {};
    const parts  = _getRigParts(fpsGroup);
    const rArm   = parts.rArm;
    const lArm   = parts.lArm;
    if (!rArm || !lArm) return;

    const io = offsets.item || {};
    const ro = offsets.rArm || {};
    const lo = offsets.lArm || {};
    const rp = _resolveRArmPose(grip);

    const ra = grip.rArm || {};
    const mcOpts = {
      equip: offsets.equip || 0,
      swing: offsets.swing || 0,
      useT: offsets.useT,
      dx: (ro.x || 0) + (ra.mcPostX || 0),
      dy: (ro.y || 0) + (ra.mcPostY || 0),
      dz: (ro.z || 0) + (ra.mcPostZ || 0),
      shoulderRx: ro.shoulderRx || 0,
      elbowRx: ro.elbowRx || 0,
      wristRx: ro.wristRx || 0,
    };
    _applyFPSArmChain(rArm.userData.chain, 'right', grip, mcOpts);

    if (grip.twoHanded && grip.lArm) {
      lArm.visible = true;
      const la = grip.lArm;
      _applyFPSArmChain(lArm.userData.chain, 'left', { rArm: la }, {
        equip: offsets.equip || 0,
        swing: offsets.swing || 0,
        useT: offsets.useT,
        dx: (lo.x || 0) + (la.mcPostX || 0),
        dy: (lo.y || 0) + (la.mcPostY || 0),
        dz: (lo.z || 0) + (la.mcPostZ || 0),
        shoulderRx: lo.shoulderRx || 0,
        elbowRx: lo.elbowRx || 0,
        wristRx: lo.wristRx || 0,
      });
    } else {
      lArm.visible = false;
    }

    const holder = parts.rightHolder || rArm.userData.itemHolder || rArm.getObjectByName('itemHolder');
    if (grip.sharedItem && grip.twoHanded && grip.item) {
      _syncSharedItemHolder(fpsGroup, parts, grip, io);
      if (holder) {
        holder.visible = true;
        _getItemPivot(holder).visible = false;
      }
    } else if (holder) {
      const palm = _palmOffset(rp.style);
      holder.position.set(palm.x, palm.y, palm.z);
      holder.rotation.set(0, 0, 0);

      const pivot = _getItemPivot(holder);
      if (grip.item) {
        holder.visible = true;
        pivot.visible = true;
        pivot.position.set(
          _ITEM_HAND.x + (grip.item.x || 0) + (io.x || 0),
          _ITEM_HAND.y + (grip.item.y || 0) + (io.y || 0),
          _ITEM_HAND.z + (grip.item.z || 0) + (io.z || 0));
        pivot.rotation.order = 'YXZ';
        pivot.rotation.set(
          _MC_ITEM_HOLD.x + (grip.item.rx || 0) + (io.rx || 0),
          _MC_ITEM_HOLD.y + (grip.item.ry || 0) + (io.ry || 0),
          _MC_ITEM_HOLD.z + (grip.item.rz || 0) + (io.rz || 0));
      } else {
        holder.visible = true;
        pivot.visible = false;
      }
      const center = fpsGroup.getObjectByName('centerItemHolder');
      if (center) center.visible = false;
    }
  }

  function _saveBasePose(fpsGroup, grip, type) {
    const rp = _resolveRArmPose(grip);
    fpsGroup.userData.gripType = type || null;
    fpsGroup.userData.basePose = {
      grip,
      item: grip.item ? {
        pos: [grip.item.x, grip.item.y, grip.item.z],
        rot: [grip.item.rx, grip.item.ry, grip.item.rz],
      } : null,
      rArm: { style: rp.style, mcRotX: rp.mcRotX, mcRotY: rp.mcRotY, mcRotZ: rp.mcRotZ },
      lArm: (grip.twoHanded && grip.lArm) ? { ...grip.lArm, visible: true } : null,
    };
    _applyGripPose(fpsGroup, grip);
  }

  // ── Animations FPS ────────────────────────────────────────────────────────

  function triggerArmAnim(fpsGroup, kind, type, opts) {
    opts = opts || {};
    const grip = getGrip(type || fpsGroup.userData.gripType);
    const animDef = grip.anim[kind] || _ANIM_BASE[kind] || _ANIM_BASE.melee;
    let dur = opts.dur ?? animDef.dur ?? 0.32;
    if (kind === 'reload' && opts.dur) dur = opts.dur;
    fpsGroup.userData.anim = { kind, start: performance.now() / 1000, dur, type: type || fpsGroup.userData.gripType };
  }

  function isArmAnimActive(fpsGroup) {
    return !!fpsGroup.userData.anim;
  }

  function tickArmAnim(fpsGroup, dt) {
    const anim = fpsGroup.userData.anim;
    const base = fpsGroup.userData.basePose;
    if (!anim || !base) return false;
    const now = performance.now() / 1000;
    const e = (now - anim.start) / anim.dur;
    if (e >= 1) {
      fpsGroup.userData.anim = null;
      _applyGripPose(fpsGroup, base.grip);
      return false;
    }
    const grip = getGrip(anim.type || fpsGroup.userData.gripType);
    const s = Math.sin(e * Math.PI);
    const io = {}, ro = {}, lo = {};
    const mcOff = { swing: 0, useT: null };

    if (anim.kind === 'melee' || anim.kind === 'punch') {
      const a = anim.kind === 'punch' ? grip.anim.punch : grip.anim.melee;
      if (a.style === 'rock_slam') {
        const windEnd = 0.20;
        let shoulderRx = 0;
        let elbowRx = 0;
        let wristRx = 0;
        if (e <= windEnd) {
          const u = Math.sin((e / windEnd) * Math.PI * 0.5);
          shoulderRx = u * 0.28;
          elbowRx = u * 0.12;
          io.y = u * 0.04;
          io.rx = u * 0.06;
        } else {
          const t = (e - windEnd) / (1 - windEnd);
          const hit = Math.sin(t * Math.PI);
          const ease = Math.sin(Math.sqrt(t) * Math.PI);
          shoulderRx = -0.82 * ease;
          elbowRx = -0.52 * hit;
          wristRx = 0.30 * hit;
          io.rx = -hit * (a.swingX || 0.55) * 0.18;
          io.rz = hit * (a.swingZ || 0.12) * 0.22;
        }
        ro.shoulderRx = shoulderRx;
        ro.elbowRx = elbowRx;
        ro.wristRx = wristRx;
        lo.shoulderRx = shoulderRx;
        lo.elbowRx = elbowRx;
        lo.wristRx = wristRx;
      } else if (a.style === 'thrust_forward') {
        const thrust = s * (a.thrustZ || 0.20);
        io.z = -thrust;
        ro.z = -thrust;
        lo.z = -thrust;
        const ext = s * (a.rArmX || 0.10);
        ro.x = -ext;
        lo.x = -ext;
        io.rx = -s * (a.swingX || 0.10) * 0.2;
      } else {
        mcOff.swing = e;
        io.rx = -s * (a.swingX || 0.5) * 0.12;
        io.rz =  s * (a.swingZ || 0.18) * 0.25;
        io.ry =  s * (a.swingY || 0);
      }
    } else if (anim.kind === 'use') {
      mcOff.useT = e;
    } else if (anim.kind === 'recoil') {
      const a = grip.anim.recoil;
      io.z = s * (a.kickZ || 0.05);
      io.rx = -s * (a.pitchX || 0.12);
      ro.z = s * (a.rArmX || 0.06) * 0.5;
      if (grip.twoHanded) lo.rz = s * (a.lArmZ || 0.03);
    } else if (anim.kind === 'reload') {
      const a = grip.anim.reload;
      const phase = e < 0.35 ? e / 0.35 : (e < 0.70 ? 1 : (1 - e) / 0.30);
      io.y  = -phase * (a.dropY || 0.12);
      io.rx =  phase * (a.tiltX || 0.32);
      if (grip.twoHanded) lo.y = Math.sin(Math.max(0, e - 0.35) / 0.35 * Math.PI) * (a.magPull || 0.10);
    }

    _applyGripPose(fpsGroup, base.grip, { item: io, rArm: ro, lArm: lo, swing: mcOff.swing, useT: mcOff.useT });
    return true;
  }

  function tickFPSArms(fpsGroup, dt, opts) {
    opts = opts || {};
    if (fpsGroup.userData.anim) return;
    const base = fpsGroup.userData.basePose;
    if (!base) return;

    fpsGroup.userData.idleTime += dt;
    const grip = base.grip;
    const idle = grip.anim.idle;
    const walk = grip.anim.walk;
    const t = fpsGroup.userData.idleTime;

    const breathe = Math.sin(t * (idle.freq || 1.6) * Math.PI * 2) * (idle.breatheY || 0.002);
    const sway    = Math.sin(t * (idle.freq || 1.6) * 0.7 * Math.PI * 2) * (idle.swayZ || 0.0015);

    let bobY = 0, bobZ = 0;
    if (opts.moving && opts.speed > 0.5) {
      fpsGroup.userData.walkPhase += dt * (walk.freq || 9.0);
      const w = Math.sin(fpsGroup.userData.walkPhase);
      bobY = w * (walk.bobY || 0.008) * Math.min(1, opts.speed / 5);
      bobZ = Math.abs(w) * (walk.bobZ || 0.004) * Math.min(1, opts.speed / 5);
    }

    _applyGripPose(fpsGroup, base.grip, {
      item: { y: breathe - bobY, z: sway + bobZ },
      rArm: { y: breathe * 0.4 - bobY * 0.5 },
      lArm: grip.twoHanded ? { y: breathe * 0.35 - bobY * 0.45 } : {},
    });
  }

  // ── Modèles .glb (libres de droits, Quaternius CC0) ─────────────────────────
  // type → fichier dans /models + rotation d'orientation [x, y, z] (radians).
  // La taille est gérée par _fit(). Les types absents → modèle procédural.
  const GLB = {
    // Armes à feu
    wpn_pistolet:        { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    pistol:              { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    wpn_fusil_pompe:     { file: 'shotgun',       rot: [0, Math.PI / 2, 0] },
    wpn_fusil_chasse:    { file: 'sniper_rifle',  rot: [0, Math.PI / 2, 0] },
    // Mêlée / outils
    wpn_couteau:         { file: 'knife',         rot: [0, 0, 0] },
    wpn_hache_combat:    { file: 'axe',           rot: [0, 0, 0] },
    tool_hachette:       { file: 'axe',           rot: [0, 0, 0] },
    tool_pioche:         { file: 'shovel',        rot: [0, 0, 0] },
    tool_torche:         { file: 'wooden_torch',  rot: [0, 0, 0] },
    // Nourriture / médical / ressources
    food_eau_bouteille:  { file: 'water_bottle',  rot: [0, 0, 0] },
    food_conserves:      { file: 'can',           rot: [0, 0, 0] },
    food_haricots_boite: { file: 'can_red',       rot: [0, 0, 0] },
    food_soupe_conserve: { file: 'can_broken',    rot: [0, 0, 0] },
    med_kit_soin:        { file: 'first_aid_kit', rot: [0, 0, 0] },
    res_bois_brut:       { file: 'wood_log',      rot: [0, 0, 0] },
    // Équipement (sac à dos, 3 tailles → même modèle)
    eq_petit_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_sac_moyen:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_grand_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
  };

  // Taille cible (plus grande dimension, en m) de l'item en main — volontairement
  // généreuse pour que l'objet équipé soit bien visible.
  function tickHumanoidRig(root, dt, opts) {
    opts = opts || {};
    const limbs = root?.userData?.limbs;
    const rig = root?.userData?.rig;
    if (!root || !limbs || !rig) return;

    if (Number.isFinite(opts.x) && Number.isFinite(opts.y) && Number.isFinite(opts.z)) {
      root.position.set(opts.x, opts.y, opts.z);
    }
    if (Number.isFinite(opts.yaw)) {
      root.rotation.y = opts.yaw;
    }

    const moving = !!opts.moving && (Number(opts.speed) || 0) > 0.1;
    const speed = Math.max(0, Number(opts.speed) || 0);
    const t = (root.userData._avatarTime || 0) + dt;
    root.userData._avatarTime = t;

    const breathe = Math.sin(t * 2.1) * 0.025;
    const sway = Math.sin(t * 1.25) * 0.018;
    const walk = moving ? Math.sin(t * Math.max(4, speed * 1.5)) * 0.6 : 0;

    if (limbs.lLeg) limbs.lLeg.rotation.x = -walk;
    if (limbs.rLeg) limbs.rLeg.rotation.x = walk;
    if (limbs.lArm) {
      limbs.lArm.rotation.x = -walk * 0.75 + breathe;
      limbs.lArm.rotation.z = 0.02 + sway;
    }
    if (limbs.rArm) {
      limbs.rArm.rotation.x = walk * 0.75 + breathe;
      limbs.rArm.rotation.z = -0.02 - sway;
    }
    if (rig.neck) rig.neck.rotation.x = breathe * 0.2;
    if (rig.head && Number.isFinite(opts.pitch)) {
      rig.head.rotation.x = Math.max(-0.35, Math.min(0.35, opts.pitch * 0.35));
    }

    if (!moving) {
      if (limbs.lLeg) limbs.lLeg.rotation.x *= 0.9;
      if (limbs.rLeg) limbs.rLeg.rotation.x *= 0.9;
      if (limbs.lArm) limbs.lArm.rotation.x *= 0.9;
      if (limbs.rArm) limbs.rArm.rotation.x *= 0.9;
    }
  }

  function _fit(type) {
    if (type === 'tool_caillou') return 1.35;
    if (type === 'wpn_pistolet' || type === 'pistol') return 0.52;
    if (type === 'wpn_fusil_chasse')                  return 1.20;
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale' || type === 'wpn_arc_artisanal') return 1.15;
    const cat = ZS.ITEMS?.[type]?.category || '';
    const byCat = {
      firearm: 1.00, melee: 0.92, tool: 0.86,
      food: 0.42, medical: 0.42, ammo: 0.32, resource: 0.34,
      equipment: 0.44, structure: 0.46, key: 0.52,
    };
    return byCat[cat] || 0.36;
  }

  const _loader = (typeof THREE !== 'undefined' && THREE.GLTFLoader) ? new THREE.GLTFLoader() : null;
  const _cache  = {};   // file → Promise<THREE.Object3D> (template chargé)

  function _loadGLB(file) {
    if (_cache[file]) return _cache[file];
    _cache[file] = new Promise((resolve, reject) => {
      if (!_loader) { reject(new Error('GLTFLoader indisponible')); return; }
      _loader.load('/models/' + file + '.glb',
        (g) => {
          g.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          resolve(g.scene);
        },
        undefined,
        reject);
    });
    return _cache[file];
  }

  // Recentre l'objet, l'ajuste à `fit` (m) et applique l'orientation `rot`.
  function _normalize(obj, fit, rot) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const s = fit / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(s);
    obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    const centered = new THREE.Group(); centered.add(obj);     // géométrie centrée à l'origine
    const pivot = new THREE.Group(); pivot.add(centered);      // pivot pour l'orientation
    if (rot) pivot.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return pivot;
  }

  // Comme _normalize, mais le modèle est ancré sur son point de prise.
  function _normalizeHeld(obj, fit, rot, gripPoint) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = fit / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(s);
    if (gripPoint) {
      obj.position.set(
        -(gripPoint.x || 0) * s,
        -(gripPoint.y || 0) * s,
        -(gripPoint.z || 0) * s,
      );
    } else {
      const center = new THREE.Vector3(); box.getCenter(center);
      obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    }
    const centered = new THREE.Group(); centered.add(obj);
    const pivot = new THREE.Group(); pivot.add(centered);
    if (rot) pivot.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return pivot;
  }

  function _defaultGripPoint(type, cat) {
    if (cat === 'firearm') return { x: 0, y: -0.10, z: 0.08 };
    if (cat === 'melee' || cat === 'tool') return { x: 0, y: -0.10, z: 0.00 };
    if (cat === 'food' || cat === 'medical') return { x: 0, y: 0.00, z: 0.00 };
    if (cat === 'ammo' || cat === 'resource') return { x: 0, y: 0.00, z: 0.00 };
    if (cat === 'equipment') return { x: 0, y: -0.02, z: 0.03 };
    if (cat === 'structure') return { x: 0, y: 0.00, z: 0.00 };
    return { x: 0, y: 0, z: 0 };
  }

  function _deriveGripPoint(obj, type, cat) {
    if (!obj) return null;
    const box = new THREE.Box3().setFromObject(obj);
    if (!isFinite(box.min.x) || !isFinite(box.max.x)) return null;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (cat === 'firearm') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.28,
        z: box.min.z + size.z * 0.58,
      };
    }
    if (cat === 'melee' || cat === 'tool') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.18,
        z: center.z,
      };
    }
    if (cat === 'food' || cat === 'medical') {
      return { x: center.x, y: center.y, z: center.z };
    }
    if (cat === 'ammo' || cat === 'resource' || cat === 'equipment' || cat === 'structure') {
      return {
        x: center.x,
        y: box.min.y + size.y * 0.35,
        z: center.z,
      };
    }
    return { x: center.x, y: center.y, z: center.z };
  }

  function _getGripPoint(type, obj) {
    const cat = ZS.ITEMS?.[type]?.category || '';
    return obj?.userData?.gripPoint || _deriveGripPoint(obj, type, cat) || _defaultGripPoint(type, cat);
  }

  function _setGripPoint(obj, x, y, z) {
    obj.userData = obj.userData || {};
    obj.userData.gripPoint = { x, y, z };
    return obj;
  }

  // Renvoie une Promesse du modèle d'affichage normalisé (GLB sinon procédural).
  // Utilisé par l'item en main ET le générateur d'icônes (ZS.Icons).
  function getItemModel(type) {
    const fit  = _fit(type);
    const spec = GLB[type];
    if (spec && _loader) {
      return _loadGLB(spec.file)
        .then((t) => _normalize(t.clone(true), fit, spec.rot))
        .catch(() => _normalize(_buildModel(type), fit, null));
    }
    return Promise.resolve(_normalize(_buildModel(type), fit, null));
  }

  function _registerDecorCollision(decorId, spec) {
    if (!decorId || !ZS.registerDecorColliders || !ZS.buildDecorColliders) return;
    ZS.registerDecorColliders(decorId, ZS.buildDecorColliders(spec));
  }

  function spawnDecorItem(scene, type, x, y, z, opts = {}) {
    if (!scene || !type) return Promise.resolve(null);
    const groundedY = opts.grounded !== false
      ? (ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(x || 0, z || 0, { groundLift: opts.groundLift })
          : (ZS.getTerrainHeight
              ? ZS.getTerrainHeight(x || 0, z || 0) + (Number.isFinite(opts.groundLift) ? opts.groundLift : 0)
              : (y || 0)))
      : (y || 0);
    const root = new THREE.Group();
    root.position.set(x || 0, groundedY, z || 0);
    root.rotation.set(opts.rotX || 0, opts.rotY || 0, opts.rotZ || 0);
    const s = Number.isFinite(opts.scale) ? opts.scale : 1;
    root.scale.setScalar(s);
    root.userData.type = type;
    scene.add(root);

    const decorId = opts.decorId;
    if (decorId && opts.collide !== false) {
      _registerDecorCollision(decorId, {
        decorId,
        kind: 'item',
        type,
        x: x || 0,
        z: z || 0,
        baseY: groundedY,
        rotY: opts.rotY || 0,
        scale: s,
        layFlat: !!opts.layFlat,
      });
    }

    if (type === 'tool_caillou' && ZS.RockPrefab?.buildGroundRock) {
      const wrap = new THREE.Group();
      ZS.RockPrefab.buildGroundRock(wrap, { rockSeed: opts.rockSeed, decorId });
      root.add(wrap);
      return Promise.resolve(root);
    }

    return getItemModel(type).then((model) => {
      if (!root.parent) return null;
      const wrap = new THREE.Group();
      wrap.add(model);
      if (opts.layFlat) wrap.rotation.x = -Math.PI / 2;
      wrap.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(wrap);
      const baseOffsetY = isFinite(box.min.y) ? -box.min.y : 0;
      wrap.position.set(
        opts.offsetX || 0,
        (opts.offsetY || 0) + baseOffsetY,
        opts.offsetZ || 0,
      );
      root.add(wrap);
      return root;
    }).catch(() => root);
  }

  // ── Mise à jour de l'item en main ─────────────────────────────────────────

  function updateHandItem(fpsGroup, type) {
    // Re-render hotbar (ex. stack +1 bois) ne doit pas annuler une anim de frappe en cours.
    if (type === fpsGroup.userData.gripType) return;

    const parts = _getRigParts(fpsGroup);
    const rArm = parts.rArm;
    const grip = getGrip(type);
    const holder = (grip.sharedItem && grip.twoHanded)
      ? _getCenterItemHolder(fpsGroup)
      : (parts.rightHolder || rArm?.userData.itemHolder || rArm?.getObjectByName('itemHolder'));
    if (!holder) return;
    const pivot = _getItemPivot(holder);
    while (pivot.children.length) pivot.remove(pivot.children[0]);
    holder.userData.type = type || null;
    const rightPivot = parts.rightHolder && _getItemPivot(parts.rightHolder);
    if (rightPivot && holder !== parts.rightHolder) rightPivot.visible = false;
    if (grip.glbOffset && grip.item) {
      const g = grip.glbOffset;
      grip.item = {
        ...grip.item,
        x: grip.item.x + (g.x || 0),
        y: grip.item.y + (g.y || 0),
        z: grip.item.z + (g.z || 0),
      };
    }
    fpsGroup.userData.anim = null;
    _saveBasePose(fpsGroup, grip, type);

    if (!type) return;

    // 1) Modèle procédural normalisé immédiat (affichage instantané)
    const cat = ZS.ITEMS?.[type]?.category || '';
    const viewScale = fpsGroup.userData?.isFPS
      ? (cat === 'firearm' ? 0.70
        : (type === 'tool_hachette' ? 0.88
          : (type === 'tool_caillou' ? 0.62
            : (cat === 'melee' || cat === 'tool' ? 0.58 : 0.82))))
      : 1;
    const procModel = _buildModel(type);
    const procGrip  = _getGripPoint(type, procModel);
    const proc = _normalizeHeld(procModel, _fit(type) * viewScale, null, procGrip);
    pivot.add(proc);
    if (type === 'tool_torche') _addTorchFx(pivot, proc);

    // 2) Si un .glb existe, on le charge et on remplace une fois prêt
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;
        while (pivot.children.length) pivot.remove(pivot.children[0]);
        const m = _normalizeHeld(t.clone(true), _fit(type) * viewScale, spec.rot, _getGripPoint(type, t));
        pivot.add(m);
        if (type === 'tool_torche') _addTorchFx(pivot, m);
      }).catch(() => { /* on garde le fallback procédural */ });
    }
  }

  // ── Item en main d'un joueur DISTANT (vue 3e personne) ─────────────────────
  // Attache le modèle de l'item à la main droite (rArm) du modèle distant, avec
  // la torche enflammée + sa lumière. Réutilise le même pipeline que la vue FPS.
  function setRemoteHandItem(playerMesh, type) {
    const limbs = playerMesh.userData.limbs;
    if (!limbs || !limbs.rArm) return;
    const rig = playerMesh.userData.rig;
    let holder = rig?.rightItemHolder || limbs.rArm.getObjectByName('itemHolder') || limbs.rArm.getObjectByName('handHolder');
    if (!holder) {
      holder = new THREE.Group();
      holder.name = 'itemHolder';
      holder.position.set(0.03, -0.13, -0.13);
      const hand = rig?.rightHand || limbs.rArm;
      hand.add(holder);
    }
    while (holder.children.length) holder.remove(holder.children[0]);
    holder.userData.type = type || null;

    const grip = getGrip(type);
    playerMesh.userData.grip = grip;
    playerMesh.userData.twoHandedFirearm = grip.twoHanded && !!type &&
      (ZS.ITEMS?.[type]?.category === 'firearm');

    if (!type) return;

    const remote = grip.remote || _REMOTE_AIM;
    if (remote.handHolder && !rig?.rightItemHolder) holder.position.set(...remote.handHolder);

    const isFirearm = ZS.ITEMS?.[type]?.category === 'firearm';
    const fit = _fit(type) * (type === 'tool_hachette' ? 1.22 : (isFirearm ? 1.35 : 1));

    // 1) Modèle procédural immédiat
    const procModel = _buildModel(type);
    const proc = _normalizeHeld(procModel, fit, null, _getGripPoint(type, procModel));
    holder.add(proc);
    if (type === 'tool_torche') _addTorchFx(holder, proc);

    // 2) Remplacement par le .glb une fois chargé
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;
        while (holder.children.length) holder.remove(holder.children[0]);
        const mm = _normalizeHeld(t.clone(true), fit, spec.rot, _getGripPoint(type, t));
        holder.add(mm);
        if (type === 'tool_torche') _addTorchFx(holder, mm);
      }).catch(() => {});
    }
  }

  // ── Torche enflammée : flamme + faisceau directionnel + halo ───────────────
  function _addTorchFx(holder, model) {
    const old = holder.getObjectByName('torchFx');
    if (old) holder.remove(old);

    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    box.applyMatrix4(new THREE.Matrix4().copy(holder.matrixWorld).invert());
    const cx   = isFinite(box.min.x) ? (box.min.x + box.max.x) / 2 : 0;
    const cz   = isFinite(box.min.z) ? (box.min.z + box.max.z) / 2 : 0;
    const topY = isFinite(box.max.y) ? box.max.y : 0.3;

    const fx = new THREE.Group();
    fx.name = 'torchFx';
    fx.position.set(cx, topY + 0.02, cz);

    const flameMat = (color, op) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), flameMat(0xff5512, 0.82));
    outer.position.y = 0.11;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 8), flameMat(0xffdd55, 0.98));
    inner.position.y = 0.08;
    fx.add(outer, inner);

    const spot = new THREE.SpotLight(0xff9520, 68, 32, Math.PI / 5.2, 0.44, 1.1);
    spot.position.set(0, 0.05, 0);
    const spotTgt = new THREE.Object3D();
    spotTgt.position.set(0, -0.03, -10);
    fx.add(spotTgt);
    spot.target = spotTgt;
    spot.userData.playerTorch = true;
    fx.add(spot);

    const core = new THREE.PointLight(0xffb040, 18, 18, 1.2);
    core.position.y = 0.06;
    core.userData.playerTorch = true;
    fx.add(core);

    const pool = new THREE.PointLight(0xffa868, 3.2, 44, 1.55);
    pool.position.y = -0.12;
    pool.userData.playerTorch = true;
    fx.add(pool);

    const base = { spot: 68, core: 18, pool: 3.2 };
    let t = Math.random() * 10;
    outer.onBeforeRender = () => {
      t += 0.08;
      const f = 0.9 + Math.sin(t * 7.3) * 0.07 + Math.sin(t * 13.1) * 0.04;
      const sway = Math.sin(t * 5.5) * 0.025;
      spot.intensity = base.spot * f;
      spot.angle = Math.PI / 5.2 + sway;
      core.intensity = base.core * f;
      pool.intensity = base.pool * (0.94 + Math.sin(t * 4.2) * 0.06);
      const sy = 0.88 + Math.sin(t * 9.0) * 0.12;
      outer.scale.set(1, sy, 1);
      inner.scale.set(1, 1.82 - sy, 1);
    };

    holder.add(fx);
  }

  // ── Muzzle flash : éclair + lumière au bout du canon lors d'un tir ──────────
  // `holder` = groupe contenant l'arme (itemHolder en FPS, handHolder distant).
  // L'arme pointe vers -z, donc le canon est à la face avant (min z) de la boîte.
  function muzzleFlash(holder) {
    if (!holder) return;
    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(holder);
    let cx = 0, cy = 0, frontZ = -0.30;
    if (isFinite(box.min.z)) {
      box.applyMatrix4(new THREE.Matrix4().copy(holder.matrixWorld).invert());
      cx = (box.min.x + box.max.x) / 2;
      cy = (box.min.y + box.max.y) / 2;
      frontZ = box.min.z;   // bout du canon (avant = -z)
    }

    // Blending NORMAL + depthTest désactivé : bien visible de jour comme de nuit,
    // et toujours dessiné par-dessus l'arme (jamais masqué).
    const flashMat = (color, op) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });

    const fx = new THREE.Group();
    fx.position.set(cx, cy, frontZ - 0.05);
    fx.rotation.z = Math.random() * Math.PI;        // variation d'orientation
    fx.scale.setScalar(0.9 + Math.random() * 0.5);  // variation de taille
    fx.renderOrder = 999;

    // Boule de feu centrale, étirée vers l'avant
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), flashMat(0xfff2b0, 1));
    core.scale.z = 1.6;
    // Cône de flamme vers l'avant (-z)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.32, 10), flashMat(0xffb030, 0.95));
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = -0.17;
    // Étoile d'éclat (deux plans croisés)
    const star1 = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.11), flashMat(0xffd070, 0.9));
    const star2 = star1.clone(); star2.rotation.z = Math.PI / 2;
    fx.add(core, cone, star1, star2);
    fx.children.forEach((c) => { c.renderOrder = 999; });

    const light = new THREE.PointLight(0xffcc66, 12, 18, 2);
    fx.add(light);
    holder.add(fx);

    // Éclat bref qui grossit légèrement en s'estompant (~90 ms).
    const start = performance.now();
    const DUR = 90;
    const base = fx.scale.x;
    core.onBeforeRender = () => {
      const k = Math.max(0, 1 - (performance.now() - start) / DUR);
      fx.scale.setScalar(base * (1 + (1 - k) * 0.5));
      core.material.opacity  = k;
      cone.material.opacity  = 0.95 * k;
      star1.material.opacity = star2.material.opacity = 0.9 * k;
      light.intensity = 12 * k;
    };
    setTimeout(() => { try { holder.remove(fx); } catch (_) {} }, 160);
  }

  // ── Constructeur principal ────────────────────────────────────────────────

  function _buildModel(type) {
    switch (type) {
      // ── Armes à feu ──────────────────────────────────────────────────────
      case 'pistol': case 'wpn_pistolet':   return _pistol();
      case 'wpn_fusil_pompe':               return _shotgun();
      case 'wpn_fusil_chasse':              return _rifle();
      // ── Mêlée ────────────────────────────────────────────────────────────
      case 'wpn_couteau':                   return _knife();
      case 'wpn_hache_combat':              return _axe(0x887733);
      case 'wpn_barre_fer':                 return _ironBar();
      case 'wpn_machette':                  return _machette();
      case 'wpn_arc_artisanal':             return _bow();
      case 'wpn_lance_artisanale':          return _spear();
      case 'wpn_lance_bois':                return _spear(0x886633);
      case 'wpn_lance_pierre':              return _spear(0x777766, true);
      case 'wpn_batte_cloutee':             return _bat();
      // ── Outils ───────────────────────────────────────────────────────────
      case 'tool_marteau':                  return _hammer();
      case 'tool_caillou':                  return _rock();
      case 'tool_hachette':                 return _axe(0x775522);
      case 'tool_hache_pierre':             return _axe(0x665544, true);
      case 'tool_pioche':                   return _pickaxe();
      case 'tool_pioche_pierre':            return _pickaxe(0x666666, true);
      case 'tool_torche':                   return _lighter();
      // ── Nourriture ───────────────────────────────────────────────────────
      case 'food_eau_bouteille':            return _bottle(0x88bbff, 0.85);
      case 'food_boisson_energisante':      return _tallCan(0xeecc00);
      case 'food_conserves':               return _can(0xaaaaaa);
      case 'food_haricots_boite':           return _can(0xcc7733);
      case 'food_soupe_conserve':           return _can(0xdd9933);
      case 'food_pain':                     return _bread();
      case 'food_fruits':                   return _apple();
      case 'food_viande_crue':              return _meat(0xcc4444);
      case 'food_viande_cuite':             return _meat(0x884422);
      case 'food': case 'medkit':           return _can(0xcc8844);
      // ── Médical ──────────────────────────────────────────────────────────
      case 'med_bandage':                   return _bandage();
      case 'med_kit_soin':                  return _medkit();
      case 'med_seringue_anti_infection':   return _syringe();
      // ── Munitions ────────────────────────────────────────────────────────
      case 'ammo': case 'ammo_pistolet':    return _ammoBox(0xddcc44);
      case 'ammo_fusil_pompe':              return _ammoBox(0xcc4422);
      case 'ammo_fusil_chasse':             return _ammoBox(0xdd8822);
      // ── Ressources ───────────────────────────────────────────────────────
      case 'res_bois_brut':                 return _log();
      case 'res_planche':                   return _plank();
      case 'res_ferraille': case 'res_metal': return _ingot(ZS.ITEMS?.[type]?.color||0x888888);
      case 'res_clous':                     return _nails();
      case 'res_corde':                     return _coil(0xbb9944);
      case 'res_ruban_adhesif':             return _coil(0xffcc00);
      case 'res_chiffon':                   return _cloth();
      // ── Équipement ───────────────────────────────────────────────────────
      case 'eq_casque':                     return _helmet();
      case 'eq_gilet_protection':           return _vest();
      case 'eq_petit_sac': case 'eq_sac_moyen': case 'eq_grand_sac':
                                            return _backpack(ZS.ITEMS?.[type]?.color||0x886633);
      // ── Structures ───────────────────────────────────────────────────────
      case 'struct_mur_bois':
      case 'struct_mur_embrasure_porte':
      case 'struct_mur_embrasure_grande_porte':
      case 'struct_porte_bois':
      case 'struct_grande_porte_bois': case 'struct_plancher_bois':
      case 'struct_plafond_bois':
      case 'struct_escalier_bois':          return _plank();
      case 'tool_verrou':                   return _lockItem();
      case 'struct_cle':                    return _keyItem();
      default: {
        const c = ZS.ITEMS?.[type]?.color || 0x888888;
        const g = new THREE.Group();
        addBox(g, m(c), 0.12, 0.10, 0.06, 0, 0, 0);
        return g;
      }
    }
  }

  // ── Armes à feu ───────────────────────────────────────────────────────────

  function _pistol() {
    const g = new THREE.Group();
    addBox(g, m(0x222233), 0.055, 0.055, 0.38,  0,     0,      0);      // canon
    addBox(g, m(0x333344), 0.10,  0.11,  0.19,  0,    -0.055,  0.07);   // corps
    addBox(g, m(0x333344), 0.072, 0.16,  0.072, 0,    -0.148,  0.10);   // poignée
    addBox(g, m(0x222233), 0.03,  0.03,  0.10,  0,     0.022, -0.16);   // guidon
    addBox(g, m(0x555566), 0.092, 0.022, 0.12,  0,    -0.055,  0.04);   // chargeur
    return _setGripPoint(g, 0, -0.14, 0.10);
  }

  function _shotgun() {
    const g = new THREE.Group();
    addBox(g, m(0x553311), 0.065, 0.065, 0.55,  0,     0,      0);
    addBox(g, m(0x885533), 0.11,  0.095, 0.34,  0,    -0.06,   0.09);
    addBox(g, m(0x885533), 0.08,  0.16,  0.08,  0,    -0.17,   0.11);
    addBox(g, m(0x664422), 0.10,  0.038, 0.44,  0,     0.055,  0.02);   // pompe
    return _setGripPoint(g, 0, -0.17, 0.10);
  }

  function _rifle() {
    const g = new THREE.Group();
    addBox(g, m(0x332211), 0.040, 0.040, 0.75,  0,     0,      0);
    addBox(g, m(0x885533), 0.076, 0.095, 0.46,  0,    -0.046,  0.12);
    addBox(g, m(0x332211), 0.055, 0.13,  0.055, 0,    -0.14,   0.12);
    addBox(g, m(0x444444), 0.044, 0.036, 0.22, -0.054, 0.022, -0.04);   // lunette
    addBox(g, m(0x333333), 0.040, 0.040, 0.10, -0.054, 0.046, -0.10);   // support lunette
    return _setGripPoint(g, 0, -0.14, 0.12);
  }

  // ── Mêlée ─────────────────────────────────────────────────────────────────

  function _knife() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.018, 0.26, 0.052, 0,  0.09,  0);           // lame
    addBox(g, m(0xaaaaaa), 0.024, 0.018, 0.072, 0,  -0.04, 0);          // garde
    addBox(g, m(0x553322), 0.038, 0.12,  0.042, 0, -0.115, 0);          // manche
    return _setGripPoint(g, 0, -0.05, 0);
  }

  function _axe(woodColor, stoneHead) {
    const g = new THREE.Group();
    addBox(g, m(woodColor || 0x887733), 0.040, 0.76, 0.040, 0,    0.00, 0);         // manche
    addBox(g, m(0x8b8877),  0.065, 0.12, 0.085, 0.04, 0.28, 0.00);      // collet
    const headColor = stoneHead ? 0x7a7468 : 0x999988;
    addBox(g, m(headColor),   0.11,  0.22, 0.11,  0.12, 0.40, 0.01);     // tête
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.18, 0.04),
      m(stoneHead ? 0x8a8578 : 0xdddddd)
    );
    blade.rotation.z = -0.92;
    blade.position.set(0.32, 0.46, 0.08);
    g.add(blade);
    addBox(g, m(stoneHead ? 0x6e6a60 : 0x666655),   0.07,  0.07, 0.09,  0.08, 0.36, -0.05);
    return _setGripPoint(g, 0, -0.03, 0);
  }

  function _ironBar() {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8), m(0x777788));
    g.add(bar);
    return g;
  }

  function _machette() {
    const g = new THREE.Group();
    addBox(g, m(0xccccbb), 0.018, 0.44, 0.115, 0,  0.09, 0);
    addBox(g, m(0xaaaaaa), 0.022, 0.016, 0.13,  0, -0.14, 0);           // garde
    addBox(g, m(0x553322), 0.040, 0.14,  0.044, 0, -0.19, 0);
    return _setGripPoint(g, 0, -0.05, 0);
  }

  function _spear(woodColor, stoneTip) {
    const g = new THREE.Group();
    addBox(g, m(woodColor || 0x885533), 0.036, 0.78, 0.036, 0, 0, 0);
    addBox(g, m(stoneTip ? 0x7a7468 : 0xccccaa), 0.026, 0.16, 0.058, 0, 0.43, 0);
    return _setGripPoint(g, 0, -0.18, 0);
  }

  function _bow() {
    const g = new THREE.Group();
    addBox(g, m(0x886633), 0.04, 0.62, 0.04, 0, 0.08, 0);
    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), m(0x775522));
    limb.rotation.z = 0.55; limb.position.set(-0.12, 0.34, 0); g.add(limb);
    const limb2 = limb.clone(); limb2.rotation.z = -0.55; limb2.position.set(0.12, 0.34, 0); g.add(limb2);
    addBox(g, m(0xddddcc), 0.008, 0.52, 0.008, 0, 0.10, -0.02);
    return _setGripPoint(g, 0, -0.12, 0.04);
  }

  function _bat() {
    const g = new THREE.Group();
    addBox(g, m(0x886644), 0.058, 0.56, 0.058, 0, 0.04, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(0x999999), 0.008, 0.008, 0.076, i * 0.022, 0.22, 0);  // clous
    return _setGripPoint(g, 0, -0.04, 0);
  }

  // ── Outils ────────────────────────────────────────────────────────────────

  function _hammer() {
    const g = new THREE.Group();
    addBox(g, m(0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(0x555555), 0.18,  0.075, 0.058, 0,  0.19, 0);
    addBox(g, m(0x777777), 0.032, 0.032, 0.08,  0.10, 0.16, 0.06);      // panne
    return _setGripPoint(g, 0, -0.04, 0);
  }

  function _rock() {
    const g = new THREE.Group();
    if (ZS.RockPrefab?.buildHandRock) {
      ZS.RockPrefab.buildHandRock(g, { rockSeed: 1337 });
    } else {
      addBox(g, m(0x9a9588), 0.10, 0.08, 0.12, 0, 0, 0);
    }
    return _setGripPoint(g, 0, 0, 0);
  }

  function _pickaxe(handleColor, stoneHead) {
    const g = new THREE.Group();
    addBox(g, m(handleColor || 0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(stoneHead ? 0x7a7468 : 0x888888), 0.28,  0.048, 0.048, 0,  0.20, 0);
    addBox(g, m(stoneHead ? 0x6e6a60 : 0x777777), 0.048, 0.052, 0.11,  0.14, 0.17, 0.062);
    return _setGripPoint(g, 0, -0.04, 0);
  }

  function _lighter() {
    const g = new THREE.Group();
    addBox(g, m(0xcc3311), 0.055, 0.095, 0.028, 0, 0,     0);
    addBox(g, m(0x888888), 0.038, 0.016, 0.022, 0, 0.056, 0);           // roue
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.042, 6), m(0xff8800));
    flame.position.set(0, 0.082, 0); g.add(flame);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.026, 6), m(0xffff44));
    tip.position.set(0, 0.094, 0); g.add(tip);
    return _setGripPoint(g, 0, -0.02, 0);
  }

  // ── Nourriture ────────────────────────────────────────────────────────────

  function _bottle(color, opacity = 1) {
    const g = new THREE.Group();
    const mat_ = opacity < 1
      ? new THREE.MeshLambertMaterial({ color, transparent: true, opacity })
      : m(color);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.19, 10), mat_);
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.034, 0.06, 8), mat_);
    neck.position.y = 0.125; g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.018, 8), m(0x555555));
    cap.position.y = 0.160; g.add(cap);
    return _setGripPoint(g, 0, -0.03, 0);
  }

  function _tallCan(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.17, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.058, 0.011, 0.058, 0,  0.092, 0);
    addBox(g, m(0x666666), 0.036, 0.008, 0.036, 0,  0.102, 0);
    return _setGripPoint(g, 0, -0.03, 0);
  }

  function _can(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.092, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.082, 0.009, 0.082, 0,  0.051, 0);
    return _setGripPoint(g, 0, -0.02, 0);
  }

  function _bread() {
    const g = new THREE.Group();
    addBox(g, m(0xcc9944), 0.18, 0.082, 0.12,  0,  0,     0);
    addBox(g, m(0xddbb66), 0.10, 0.042, 0.10,  0,  0.062, 0);           // top doré
    addBox(g, m(0xbb8833), 0.18, 0.016, 0.12,  0, -0.049, 0);           // dessous
    return _setGripPoint(g, 0, 0, 0);
  }

  function _apple() {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), m(0xdd2222));
    g.add(sphere);
    addBox(g, m(0x553322), 0.010, 0.044, 0.010, 0, 0.078, 0);           // tige
    return _setGripPoint(g, 0, 0, 0);
  }

  function _meat(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.062, 0.12,  0,       0,    0);
    addBox(g, m(0xffeedd),  0.09, 0.030, 0.07,  0.020,  0.046, 0);      // gras
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Médical ───────────────────────────────────────────────────────────────

  function _bandage() {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.076, 10), m(0xffffff));
    roll.rotation.z = Math.PI / 2; g.add(roll);
    const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.014, 10),
      new THREE.MeshLambertMaterial({ color: 0xffeeee, transparent: true, opacity: 0.7 }));
    strip.rotation.z = Math.PI / 2; strip.position.x = -0.045; g.add(strip);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _medkit() {
    const g = new THREE.Group();
    addBox(g, m(0xcc2222), 0.19, 0.125, 0.082, 0,  0,     0);
    addBox(g, m(0xffffff), 0.018, 0.085, 0.01, 0,  0,    -0.046);       // croix
    addBox(g, m(0xffffff), 0.085, 0.018, 0.01, 0,  0,    -0.046);
    addBox(g, m(0x881111), 0.19,  0.012, 0.082, 0,  0.068, 0);          // couvercle
    return _setGripPoint(g, 0, 0, 0);
  }

  function _syringe() {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.20, 8),
      new THREE.MeshLambertMaterial({ color: 0x88bbff, transparent: true, opacity: 0.70 })
    );
    g.add(barrel);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.066, 6), m(0xcccccc));
    needle.position.y = 0.133; g.add(needle);
    addBox(g, m(0xff4444), 0.030, 0.048, 0.030, 0, -0.122, 0);          // piston
    addBox(g, m(0xddddee), 0.036, 0.010, 0.036, 0, -0.148, 0);
    return _setGripPoint(g, 0, -0.07, 0);
  }

  // ── Munitions ─────────────────────────────────────────────────────────────

  function _ammoBox(color) {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.13, 0.068, 0.092, 0,  0,     0);
    addBox(g, m(color),    0.11, 0.012, 0.078, 0,  0.040, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(color), 0.010, 0.030, 0.010, i * 0.036, 0.042, 0);
    return _setGripPoint(g, 0, -0.01, 0);
  }

  // ── Ressources ────────────────────────────────────────────────────────────

  function _log() {
    const g = new THREE.Group();
    const log_ = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.22, 8), m(0x885533));
    log_.rotation.z = Math.PI / 2; g.add(log_);
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.040, 8), m(0xaa7744));
    end.rotation.y = Math.PI / 2; end.position.x = 0.11; g.add(end);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _plank() {
    const g = new THREE.Group();
    addBox(g, m(0xbb8844), 0.22, 0.030, 0.088, 0, 0,  0);
    addBox(g, m(0x997733), 0.22, 0.008, 0.088, 0, 0.019, 0);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _lockItem() {
    const g = new THREE.Group();
    addBox(g, m(0x555566), 0.08, 0.10, 0.04, 0, 0, 0);
    addBox(g, m(0x777788), 0.05, 0.05, 0.02, 0, 0.06, 0.02);
    return _setGripPoint(g, 0, -0.02, 0.04);
  }

  function _keyItem() {
    const g = new THREE.Group();
    addBox(g, m(0xccaa44), 0.06, 0.02, 0.02, 0.04, 0, 0);
    addBox(g, m(0xccaa44), 0.025, 0.025, 0.015, -0.02, 0, 0);
    addBox(g, m(0xaa8822), 0.012, 0.012, 0.012, -0.05, 0, 0);
    return _setGripPoint(g, 0, -0.02, 0.02);
  }

  function _ingot(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.052, 0.076, 0,  0,     0);
    addBox(g, m(0xffffff), 0.025, 0.010, 0.050, 0.044, 0.032, 0);      // reflet
    return _setGripPoint(g, 0, 0, 0);
  }

  function _nails() {
    const g = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.10, 5), m(0x888888));
      nail.position.set(i * 0.020, 0, 0); g.add(nail);
    }
    addBox(g, m(0x333333), 0.11, 0.014, 0.014, 0, -0.056, 0);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _coil(color) {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 14), m(color));
    torus.rotation.x = Math.PI / 2; g.add(torus);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _cloth() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.18, 0.012, 0.14, 0, 0,  0);
    addBox(g, m(0xccccbb), 0.18, 0.012, 0.14, 0.018, 0.022, 0.018);
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Équipement ────────────────────────────────────────────────────────────

  function _helmet() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), m(0x556644));
    dome.position.y = 0.01; g.add(dome);
    addBox(g, m(0x445533), 0.17, 0.026, 0.016, 0, -0.06, -0.09);        // visière
    return _setGripPoint(g, 0, 0, 0);
  }

  function _vest() {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.19, 0.22, 0.072, 0,  0,    0);
    addBox(g, m(0x444433), 0.06, 0.19, 0.076, 0.13,  0, 0);             // côté
    addBox(g, m(0x555544), 0.04, 0.06, 0.080, 0.068, 0.095, 0);         // poche
    return _setGripPoint(g, 0, 0, 0);
  }

  function _backpack(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.20, 0.080, 0,  0,     0);
    addBox(g, m(0xddcc88),  0.12, 0.012, 0.084, 0,  0.072, 0);          // sangle
    addBox(g, m(0x222222),  0.04, 0.04,  0.010, 0.028,  0.008, -0.046); // fermoir
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addBox(parent, material, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function m(color) { return new THREE.MeshLambertMaterial({ color }); }

  function applyHumanoidPalette(root, palette) {
    const slots = root?.userData?.skinSlots;
    if (!slots || !palette) return;
    const apply = (slot, color) => {
      const g = slots[slot];
      if (!g || color == null) return;
      g.traverse((o) => {
        if (o.isMesh && o.material?.color) o.material.color.set(color);
      });
    };
    apply('head', palette.skin);
    apply('torso', palette.shirt);
    for (const side of ['left', 'right']) {
      apply(side + 'UpperArm', palette.shirt);
      apply(side + 'Forearm', palette.shirt);
      apply(side + 'Hand', palette.skin);
      apply(side + 'Thigh', palette.pants);
      apply(side + 'Shin', palette.pants);
    }
  }

  /** Flash rouge court — une seule restauration par material (évite le rouge permanent si meshes partagés). */
  function flashMeshMaterials(group, flashHex = 0xff4444, ms = 120) {
    if (!group) return;
    if (group.userData._flashTimer) clearTimeout(group.userData._flashTimer);
    const mats = new Set();
    group.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const list = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of list) {
        if (mat.color) mats.add(mat);
      }
    });
    for (const mat of mats) {
      if (mat.userData._flashOrigColor == null) {
        mat.userData._flashOrigColor = mat.color.getHex();
      }
      mat.color.setHex(flashHex);
    }
    group.userData._flashTimer = setTimeout(() => {
      delete group.userData._flashTimer;
      for (const mat of mats) {
        if (mat.userData._flashOrigColor != null) {
          mat.color.setHex(mat.userData._flashOrigColor);
        }
      }
    }, ms);
  }

  function flashRemotePlayer(group) {
    flashMeshMaterials(group);
  }

  window.ZS = window.ZS || {};
  ZS.createPlayerModel = createPlayerModel;
  ZS.flashRemotePlayer = flashRemotePlayer;
  ZS.flashMeshMaterials = flashMeshMaterials;
  ZS.applySleepPose = applySleepPose;
  ZS.createZombieModel = createZombieModel;
  ZS.createHumanoidRig = _createHumanoidRig;
  ZS.createFPSArms     = createFPSArms;
  ZS.updateHandItem    = updateHandItem;
  ZS.setRemoteHandItem = setRemoteHandItem;
  ZS.muzzleFlash       = muzzleFlash;
  ZS.getItemModel      = getItemModel;
  ZS.spawnDecorItem    = spawnDecorItem;
  ZS.getGrip           = getGrip;
  ZS.triggerArmAnim    = triggerArmAnim;
  ZS.tickArmAnim       = tickArmAnim;
  ZS.tickFPSArms       = tickFPSArms;
  ZS.tickHumanoidRig   = tickHumanoidRig;
  ZS.isArmAnimActive   = isArmAnimActive;
  ZS.applyHumanoidPalette = applyHumanoidPalette;
}());
