// Rig humanoïde joueur / zombie — extrait de player.js (IIFE)
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
    idle:   { breatheY: 0.0012, swayZ: 0.0008, freq: 1.4 },
    walk:   {
      bobY: 0.005, bobZ: 0.002, freq: 9.0,
      shoulderRx: -0.10, shoulderRy: 0.11, elbowRx: 0.05,
      swingZ: 0.022, swingY: 0.010,
    },
    punch:  { style: 'punch', swingX: 0.65, swingZ: 0.10, dur: 0.24 },
    use:    { style: 'eat', liftY: 0.18, liftZ: 0.14, tiltX: 0.42, rArmLift: 0.26, dur: 0.5 },
  };

  // ── Transform FPS Minecraft (ItemInHandRenderer / ItemRenderer 1.20) ─────
  const _DEG = Math.PI / 180;

  // Chaîne osseuse le long de −Z : rx≈0 = bras horizontal vers l'avant ; rx≈π/2 = vers le haut (à éviter).
  // Bras repos — aligné sur main vide validée (sync aussi via loadFPSValidatedPoses).
  const _FPS_RIGHT_RELAXED = { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 };
  const _FPS_LEFT_RELAXED  = { x: -0.47, y: -0.31, z: -0.44, rx: -0.18, ry: -0.08, rz: 0.04 };
  const _FPS_CHAIN_RELAXED = { ex: 1.35, ey: -0.18, ez: -0.18, wx: -0.77, wy: 0.11, wz: 0.11 };

  /** Overlay grip/hold : main devant soi, avant-bras plié, objet orienté depuis la paume. */
  const _FPS_ARM_AIM = {
    right: {
      grip: {
        dx: -0.20, dy: -0.01, dz: -0.18,
        shoulderRx: 0.14, shoulderRy: 0.40, shoulderRz: 0.18,
        elbowRx: 0.28, elbowEy: -0.02, elbowEz: -0.04,
        wristRx: -0.32, wristWy: 0.08, wristWz: -0.05,
      },
      hold: {
        dx: -0.20, dy: -0.01, dz: -0.14,
        shoulderRx: 0.18, shoulderRy: 0.28, shoulderRz: 0.14,
        elbowRx: 0.35, elbowEy: -0.06, elbowEz: 0.14,
        wristRx: -0.46, wristWy: 0.08, wristWz: -0.05,
      },
    },
    left: {
      grip: {
        dx: 0.18, dy: 0.04, dz: -0.22,
        shoulderRx: 0.12, shoulderRy: -0.22, shoulderRz: -0.22,
        elbowRx: 0.28, elbowEy: 0.02, elbowEz: 0.04,
        wristRx: -0.32, wristWy: -0.08, wristWz: 0.05,
      },
      hold: {
        dx: 0.18, dy: 0.04, dz: -0.18,
        shoulderRx: 0.16, shoulderRy: -0.16, shoulderRz: -0.16,
        elbowRx: 0.35, elbowEy: 0.06, elbowEz: -0.10,
        wristRx: -0.46, wristWy: -0.08, wristWz: 0.05,
      },
    },
  };

  // Rotation objet en main. Les overrides par type restent dans GRIP_TYPES.
  const _MC_ITEM_HOLD = { x: -18 * _DEG, y: 18 * _DEG, z: 6 * _DEG };
  const _ITEM_HAND  = { x: 0.01, y: 0.01, z: -0.04 };

  const _PALM = { grip: [0.01, -0.01, -0.06], hold: [0.015, -0.005, -0.07] };

  /** Poses FPS calibrées in-game (tuner) — valeurs absolues épaule/coude/poignet/pivot. */
  const _FPS_ABSOLUTE_POSES = {
    tool_torche: {
      shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
      elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
      wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
      item: { x: -0.02, y: 0, z: 0.06, rx: 0.25, ry: 1.35, rz: -0.07 },
    },
    empty_hand: {
      shoulder: { x: 0.47, y: -0.31, z: -0.44, rx: -0.18, ry: 0.08, rz: -0.04 },
      elbow: { rx: 1.35, ry: -0.18, rz: -0.18 },
      wrist: { rx: -0.77, ry: 0.11, rz: 0.11 },
    },
  };

  /** Idle / marche main vide — calibrage tuner (fusionné dans tickFPSArms). */
  const _FPS_EMPTY_ANIM = {
    idle: { breatheY: 0.0012, swayZ: 0.0008, freq: 1.4 },
    walk: {
      bobY: 0.005, bobZ: 0.002, freq: 9.0,
      shoulderRx: -0.10, shoulderRy: 0.11, elbowRx: 0.05,
      swingZ: 0.022, swingY: 0.010,
    },
  };

  const _REMOTE_AIM = {
    rArmRot: [0.85, 0, -0.62],
    handHolder: [0, -0.72, -0.12],
    lArmMode: 'aimAtHand',
  };
