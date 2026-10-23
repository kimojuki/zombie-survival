// GRIPS, poses, getGrip — extrait de player.js (IIFE)
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
      emptyHand: !!partial.emptyHand,
      absolutePose: !!partial.absolutePose,
      twoHanded: !!partial.twoHanded,
      sharedItem: !!partial.sharedItem,
      item: partial.item || null,
      center: partial.center || null,
      itemScale: partial.itemScale ?? null,
      rArm: partial.rArm,
      lArm: partial.lArm ?? null,
      anim: _mergeAnim(_ANIM_BASE, partial.anim),
      remote: partial.remote || null,
      glbOffset: partial.glbOffset || null,
    };
  }

  /** Poses deux mains validées (caillou…) — chaînes directes + MC. */
  const _FPS_TWO_HAND_POSES = {};
  /** Bras D calibré — outils / mêlée une main (hachette…). */
  const _FPS_GRIP_CHAIN_POSES = {};

  const GRIP_EMPTY = _grip({
    emptyHand: true,
    absolutePose: true,
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
    food_sandwich: _grip({
      item: { x: 0, y: 0.03, z: -0.05, rx: 0.04, ry: 0.06, rz: 0.04 },
      anim: { use: { style: 'bite', dur: 0.55 } },
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
    med_pilules_anti_infection: _grip({
      item: { x: 0, y: 0.02, z: -0.05, rx: 0.18, ry: 0.12, rz: 0.06 },
      anim: { use: { style: 'bite', dur: 0.85 } },
    }),
    med_seringue_anti_infection: _grip({
      item: { x: 0, y: 0.04, z: -0.05, rx: 0.12, ry: 0.06, rz: 0.02 },
      anim: { use: { style: 'inject', thrustZ: 0.06, dur: 1.2 } },
    }),
    tool_torche: _grip({
      absolutePose: true,
      item: { x: -0.02, y: 0, z: 0.06, rx: 0.25, ry: 1.35, rz: -0.07 },
      rArm: { style: 'grip' },
    }),
    tool_marteau: _grip({
      item: { x: 0, y: -0.05, z: -0.21, rx: 0.24, ry: 0.05, rz: 0.01 },
      anim: { melee: { style: 'swing_down', swingX: 0.58, swingZ: 0.30, dur: 0.34 } },
    }),
    tool_caillou: _grip({
      twoHanded: true,
      sharedItem: true,
      itemScale: 0.60,
      center: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
      item: { x: 0, y: -0.01, z: -0.02, rx: 0.04, ry: 0, rz: 0 },
      rArm: {
        style: 'grip', mcRotX: -10, mcRotY: -10, mcRotZ: 0,
        mcPostX: -0.03, mcPostY: 0, mcPostZ: -0.02,
        mcElbowX: 6, mcElbowY: 0, mcElbowZ: -10,
        mcWristX: 0, mcWristY: -24, mcWristZ: 6,
      },
      lArm: {
        style: 'grip', mcRotX: -10, mcRotY: 10, mcRotZ: 0,
        mcPostX: 0.03, mcPostY: 0, mcPostZ: -0.02,
        mcElbowX: 6, mcElbowY: 0, mcElbowZ: 10,
        mcWristX: 0, mcWristY: 24, mcWristZ: -6,
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

  function _fpsArmAim(style, side) {
    const bank = _FPS_ARM_AIM[side === 'left' ? 'left' : 'right'];
    return bank[style === 'hold' ? 'hold' : 'grip'];
  }

  function _applyFPSArmChain(chain, side, grip, opts) {
    if (!chain) return;
    opts = opts || {};
    const i = side === 'left' ? -1 : 1;
    const empty = !!(grip?.emptyHand && side === 'right');
    const relaxed = side === 'left' ? _FPS_LEFT_RELAXED : _FPS_RIGHT_RELAXED;
    const ra = grip?.rArm || {};
    const style = ra.style || 'grip';
    const aim = empty ? null : _fpsArmAim(style, side);
    const swing = Math.max(0, Math.min(1, opts.swing || 0));
    const swingSin = Math.sin(swing * Math.PI);
    const swingEase = Math.sin(Math.sqrt(swing) * Math.PI);
    const useT = opts.useT != null ? Math.max(0, Math.min(1, opts.useT)) : 0;
    const useEase = 1 - Math.pow(1 - useT, 4);

    chain.shoulder.position.set(
      relaxed.x + (aim?.dx || 0) + (opts.dx || 0),
      relaxed.y + (aim?.dy || 0) + (opts.dy || 0),
      relaxed.z + (aim?.dz || 0) + (opts.dz || 0),
    );

    let sx = relaxed.rx + (aim?.shoulderRx || 0) + (ra.mcRotX || 0) * _DEG;
    let sy = relaxed.ry + (aim?.shoulderRy || 0) + i * (ra.mcRotY || 0) * _DEG;
    let sz = relaxed.rz + (aim?.shoulderRz || 0) + i * (ra.mcRotZ || 0) * _DEG;
    const ch = _FPS_CHAIN_RELAXED;
    let ex = ch.ex + (aim?.elbowRx || 0);
    let ey = ch.ey + (aim?.elbowEy || 0);
    let ez = ch.ez + (aim?.elbowEz || 0);
    let wx = ch.wx + (aim?.wristRx || 0);
    let wy = ch.wy + (aim?.wristWy || 0);
    let wz = ch.wz + (aim?.wristWz || 0);
    ex += (ra.mcElbowX || 0) * _DEG;
    ey += i * (ra.mcElbowY || 0) * _DEG;
    ez += i * (ra.mcElbowZ || 0) * _DEG;
    wx += (ra.mcWristX || 0) * _DEG;
    wy += i * (ra.mcWristY || 0) * _DEG;
    wz += i * (ra.mcWristZ || 0) * _DEG;
    sx += opts.shoulderRx || 0;
    sy += opts.shoulderRy || 0;
    sz += opts.shoulderRz || 0;
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
    const cen = grip.center || {};
    center.position.set(
      _TMP_HAND_M.x + (grip.item.x || 0) + (io.x || 0) + (cen.x || 0),
      _TMP_HAND_M.y + (grip.item.y || 0) + (io.y || 0) + (cen.y || 0),
      _TMP_HAND_M.z + (grip.item.z || 0) + (io.z || 0) + (cen.z || 0),
    );
    const pivot = _getItemPivot(center);
    pivot.position.set(_ITEM_HAND.x, _ITEM_HAND.y, _ITEM_HAND.z);
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(
      _MC_ITEM_HOLD.x + (grip.item.rx || 0) + (io.rx || 0) + (cen.rx || 0),
      _MC_ITEM_HOLD.y + (grip.item.ry || 0) + (io.ry || 0) + (cen.ry || 0),
      _MC_ITEM_HOLD.z + (grip.item.rz || 0) + (io.rz || 0) + (cen.rz || 0));
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
      absolutePose: over.absolutePose ?? base.absolutePose,
      twoHanded: over.twoHanded ?? base.twoHanded,
      sharedItem: over.sharedItem ?? base.sharedItem,
      item: over.item ? { ...(base.item || {}), ...over.item } : base.item,
      rArm: over.rArm ? { ...base.rArm, ...over.rArm } : base.rArm,
      lArm: over.lArm !== undefined ? over.lArm : base.lArm,
      remote: over.remote || base.remote,
      glbOffset: over.glbOffset || base.glbOffset,
      center: over.center ? { ...(base.center || {}), ...over.center } : base.center,
      itemScale: over.itemScale ?? base.itemScale,
    });
    g.anim = _mergeAnim(base.anim, over.anim);
    return g;
  }

  // ── Rig FPS articulé (épaules / coudes / poignets / mains) ────────────────

  const _FPS_SHIRT_DARK = 0x2a5a9a;
  const _FPS_SKIN_SHADOW = 0xe8b894;
  const _fpsMatCache = new Map();
