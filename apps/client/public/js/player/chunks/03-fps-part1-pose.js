// FPS bras creation + poses
function _fpsMat(color) {
    let mat = _fpsMatCache.get(color);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({ color });
      _fpsMatCache.set(color, mat);
    }
    return mat;
  }

  /** Bras viewmodel stylisé (cylindres + main) — même squelette que l’ancien rig cubes. */
  function _buildFPSArmVisuals(shoulder, elbow, hand, side, prefix) {
    const shirt = _fpsMat(SHIRT);
    const shirtDark = _fpsMat(_FPS_SHIRT_DARK);
    const skin = _fpsMat(SKIN);
    const skinHi = _fpsMat(SKIN);
    const skinLo = _fpsMat(_FPS_SKIN_SHADOW);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.044, 0.22, 12), shirt);
    upper.rotation.x = Math.PI / 2;
    upper.position.set(0, 0, -0.11);
    upper.userData.skinSlot = prefix + 'UpperArm';
    shoulder.add(upper);

    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.054, 10, 8), shirt);
    delt.position.set(side * 0.01, 0.01, 0.01);
    shoulder.add(delt);

    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.18, 12), shirt);
    fore.rotation.x = Math.PI / 2;
    fore.position.set(0, 0, -0.09);
    fore.userData.skinSlot = prefix + 'Forearm';
    elbow.add(fore);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.007, 6, 14), shirtDark);
    cuff.rotation.y = Math.PI / 2;
    cuff.position.set(0, 0, -0.015);
    elbow.add(cuff);

    const handMesh = new THREE.Group();
    handMesh.name = prefix + 'HandMesh';
    handMesh.userData.skinSlot = prefix + 'Hand';

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.052, 0.10), skin);
    palm.position.set(0, -0.012, -0.048);
    handMesh.add(palm);

    const palmBack = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.028, 0.078), skinLo);
    palmBack.position.set(0, 0.018, -0.042);
    handMesh.add(palmBack);

    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.030, 0.038), skinHi);
    thumb.position.set(side * 0.052, -0.008, -0.022);
    thumb.rotation.z = side * -0.42;
    thumb.rotation.x = 0.12;
    handMesh.add(thumb);

    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.034, 0.032), skinHi);
    fingers.position.set(0, -0.018, -0.098);
    handMesh.add(fingers);

    const wristCuff = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 12), shirtDark);
    wristCuff.rotation.y = Math.PI / 2;
    wristCuff.position.set(0, 0, 0.008);
    handMesh.add(wristCuff);

    hand.add(handMesh);
  }

  function _createFPSArmChain(parent, side) {
    const prefix = side < 0 ? 'left' : 'right';
    const shoulder = new THREE.Group();
    shoulder.name = side > 0 ? 'rArm' : 'lArm';
    parent.add(shoulder);

    const elbow = _bone(prefix + 'Elbow', shoulder, 0, 0, -0.24);
    const wrist = _bone(prefix + 'Wrist', elbow, 0, 0, -0.20);
    const hand = _bone(prefix + 'Hand', wrist, 0, 0, 0);
    _buildFPSArmVisuals(shoulder, elbow, hand, side, prefix);

    const holder = new THREE.Group();
    holder.name = side > 0 ? 'itemHolder' : 'offhandHolder';
    holder.position.set(side * 0.012, -0.012, -0.12);
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
    g.userData.skinSlots = _collectSkinSlots(g);

    _applyGripPose(g, GRIP_EMPTY);
    _saveBasePose(g, GRIP_EMPTY, null);
    return g;
  }

  function _mergeAbsolutePose(base, offsets) {
    const pose = JSON.parse(JSON.stringify(base));
    const ro = offsets?.rArm || {};
    const io = offsets?.item || {};
    const sh = pose.shoulder;
    sh.x += ro.x || 0;
    sh.y += ro.y || 0;
    sh.z += ro.z || 0;
    sh.rx += ro.shoulderRx || 0;
    sh.ry += ro.shoulderRy || 0;
    sh.rz += ro.shoulderRz || 0;
    pose.elbow.rx += ro.elbowRx || 0;
    pose.wrist.rx += ro.wristRx || 0;
    if (pose.item) {
      pose.item.x += io.x || 0;
      pose.item.y += io.y || 0;
      pose.item.z += io.z || 0;
      pose.item.rx += io.rx || 0;
      pose.item.ry += io.ry || 0;
      pose.item.rz += io.rz || 0;
    }
    return pose;
  }

  function _applyFPSDirectPose(fpsGroup, pose) {
    if (!fpsGroup || !pose) return;
    const parts = _getRigParts(fpsGroup);
    const chain = parts.rArm?.userData?.chain;
    if (!chain) return;
    if (parts.lArm) parts.lArm.visible = false;

    const sh = pose.shoulder || {};
    chain.shoulder.position.set(sh.x ?? 0.14, sh.y ?? -0.47, sh.z ?? -0.48);
    _setEuler(chain.shoulder, sh.rx ?? 0, sh.ry ?? 0, sh.rz ?? 0);

    const el = pose.elbow || {};
    _setEuler(chain.elbow, el.rx ?? 0.98, el.ry ?? 0, el.rz ?? 0);

    const wr = pose.wrist || {};
    _setEuler(chain.wrist, wr.rx ?? -0.30, wr.ry ?? 0.05, wr.rz ?? -0.03);

    const holder = parts.rightHolder || parts.rArm?.userData?.itemHolder
      || parts.rArm?.getObjectByName?.('itemHolder');
    if (holder && pose.item) {
      const it = pose.item;
      holder.position.set(0.01, -0.01, -0.06);
      holder.rotation.set(0, 0, 0);
      const pivot = _getItemPivot(holder);
      pivot.visible = true;
      pivot.position.set(
        _ITEM_HAND.x + (it.x || 0),
        _ITEM_HAND.y + (it.y || 0),
        _ITEM_HAND.z + (it.z || 0),
      );
      pivot.rotation.order = 'YXZ';
      pivot.rotation.set(
        _MC_ITEM_HOLD.x + (it.rx || 0),
        _MC_ITEM_HOLD.y + (it.ry || 0),
        _MC_ITEM_HOLD.z + (it.rz || 0),
      );
    }
  }

  function _applyGripPose(fpsGroup, grip, offsets) {
    offsets = offsets || {};
    const gripType = fpsGroup.userData.gripType;
    let absKey = gripType;
    if (!absKey && grip?.emptyHand && grip?.absolutePose) absKey = 'empty_hand';
    const abs = (grip?.absolutePose && absKey && _FPS_ABSOLUTE_POSES[absKey])
      ? _FPS_ABSOLUTE_POSES[absKey] : null;
    if (abs) {
      _applyFPSDirectPose(fpsGroup, _mergeAbsolutePose(abs, offsets));
      return;
    }

    const twoHandStored = gripType && grip?.twoHanded
      ? _FPS_TWO_HAND_POSES[gripType] : null;
    if (twoHandStored) {
      _applyTwoHandGripVisual(fpsGroup, grip, twoHandStored, offsets);
      return;
    }

    const tunedChain = gripType && !grip?.twoHanded
      ? _FPS_GRIP_CHAIN_POSES[gripType] : null;
    if (tunedChain?.shoulder) {
      const parts = _getRigParts(fpsGroup);
      const rChain = parts.rArm?.userData?.chain;
      _applyArmChainPose(rChain, tunedChain);
      _applyChainAnimOffset(rChain, offsets.rArm || {});
      if (parts.lArm) parts.lArm.visible = false;
      const io = offsets.item || {};
      const holder = parts.rightHolder || parts.rArm?.userData?.itemHolder
        || parts.rArm?.getObjectByName?.('itemHolder');
      if (holder && grip.item) {
        const palm = _palmOffset(_resolveRArmPose(grip).style);
        holder.position.set(palm.x, palm.y, palm.z);
        holder.rotation.set(0, 0, 0);
        const pivot = _getItemPivot(holder);
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
      }
      const center = fpsGroup.getObjectByName('centerItemHolder');
      if (center) center.visible = false;
      return;
    }

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
      shoulderRy: ro.shoulderRy || 0,
      shoulderRz: ro.shoulderRz || 0,
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
        shoulderRy: lo.shoulderRy || 0,
        shoulderRz: lo.shoulderRz || 0,
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

  /** Pose absolue (tuner dev) — épaule / coude / poignet / pivot item. */
  function applyFPSDebugPose(fpsGroup, pose) {
    _applyFPSDirectPose(fpsGroup, pose);
    fpsGroup.userData.tunerFreeze = true;
    fpsGroup.userData.anim = { kind: 'debug_freeze' };
    fpsGroup.userData.debugPoseId = pose.id || null;
  }

  function _syncRelaxedChainFromArmPose(pose) {
    if (!pose) return;
    if (pose.shoulder) {
      _FPS_RIGHT_RELAXED.x = pose.shoulder.x;
      _FPS_RIGHT_RELAXED.y = pose.shoulder.y;
      _FPS_RIGHT_RELAXED.z = pose.shoulder.z;
      _FPS_RIGHT_RELAXED.rx = pose.shoulder.rx;
      _FPS_RIGHT_RELAXED.ry = pose.shoulder.ry;
      _FPS_RIGHT_RELAXED.rz = pose.shoulder.rz;
      _FPS_LEFT_RELAXED.x = -pose.shoulder.x;
      _FPS_LEFT_RELAXED.y = pose.shoulder.y;
      _FPS_LEFT_RELAXED.z = pose.shoulder.z;
      _FPS_LEFT_RELAXED.rx = pose.shoulder.rx;
      _FPS_LEFT_RELAXED.ry = -pose.shoulder.ry;
      _FPS_LEFT_RELAXED.rz = -pose.shoulder.rz;
    }
    if (pose.elbow) {
      _FPS_CHAIN_RELAXED.ex = pose.elbow.rx;
      _FPS_CHAIN_RELAXED.ey = pose.elbow.ry;
      _FPS_CHAIN_RELAXED.ez = pose.elbow.rz;
    }
    if (pose.wrist) {
      _FPS_CHAIN_RELAXED.wx = pose.wrist.rx;
      _FPS_CHAIN_RELAXED.wy = pose.wrist.ry;
      _FPS_CHAIN_RELAXED.wz = pose.wrist.rz;
    }
  }

  function applyFPSTorchTune(pose) {
    if (!pose) return;
    const cur = _FPS_ABSOLUTE_POSES.tool_torche || {};
    if (pose.shoulder) cur.shoulder = { ...pose.shoulder };
    if (pose.elbow) cur.elbow = { ...pose.elbow };
    if (pose.wrist) cur.wrist = { ...pose.wrist };
    if (pose.item) cur.item = { ...pose.item };
    _FPS_ABSOLUTE_POSES.tool_torche = cur;
    const grip = GRIP_TYPES.tool_torche;
    if (grip?.item && pose.item) Object.assign(grip.item, pose.item);
  }

  function applyFPSEmptyTune(pose) {
    if (!pose) return;
    const cur = _FPS_ABSOLUTE_POSES.empty_hand || {};
    if (pose.shoulder) cur.shoulder = { ...pose.shoulder };
    if (pose.elbow) cur.elbow = { ...pose.elbow };
    if (pose.wrist) cur.wrist = { ...pose.wrist };
    _FPS_ABSOLUTE_POSES.empty_hand = cur;
    if (pose.idle) Object.assign(_FPS_EMPTY_ANIM.idle, pose.idle);
    if (pose.walk) Object.assign(_FPS_EMPTY_ANIM.walk, pose.walk);
    _syncRelaxedChainFromArmPose(pose);
  }

  /** Applique une pose validée en mémoire (+ bras FPS si fourni). */
  function _applyArmChainPose(chain, pose) {
    if (!chain || !pose?.shoulder) return;
    const sh = pose.shoulder;
    chain.shoulder.position.set(sh.x ?? 0, sh.y ?? 0, sh.z ?? 0);
    _setEuler(chain.shoulder, sh.rx ?? 0, sh.ry ?? 0, sh.rz ?? 0);
    const el = pose.elbow || {};
    _setEuler(chain.elbow, el.rx ?? 0, el.ry ?? 0, el.rz ?? 0);
    const wr = pose.wrist || {};
    _setEuler(chain.wrist, wr.rx ?? 0, wr.ry ?? 0, wr.rz ?? 0);
  }

  function _storeGripChainPose(gripType, pose) {
    if (!gripType || !pose?.shoulder) return;
    const out = {};
    for (const k of ['shoulder', 'elbow', 'wrist']) {
      if (pose[k]) out[k] = JSON.parse(JSON.stringify(pose[k]));
    }
    _FPS_GRIP_CHAIN_POSES[gripType] = out;
  }

  function _storeTwoHandPose(gripType, pose) {
    if (!pose) return;
    const out = {};
    for (const k of ['shoulder', 'elbow', 'wrist', 'lShoulder', 'lElbow', 'lWrist', 'item', 'center', 'rArm', 'lArm']) {
      if (pose[k]) out[k] = JSON.parse(JSON.stringify(pose[k]));
    }
    if (Number.isFinite(pose.itemScale)) out.itemScale = pose.itemScale;
    _FPS_TWO_HAND_POSES[gripType] = out;
  }

  function _applyMcDeltaOnChain(chain, side, mc) {
    if (!chain || !mc) return;
    const i = side === 'left' ? -1 : 1;
    chain.shoulder.position.x += mc.mcPostX || 0;
    chain.shoulder.position.y += mc.mcPostY || 0;
    chain.shoulder.position.z += mc.mcPostZ || 0;
    chain.shoulder.rotation.x += (mc.mcRotX || 0) * _DEG;
    chain.shoulder.rotation.y += i * (mc.mcRotY || 0) * _DEG;
    chain.shoulder.rotation.z += i * (mc.mcRotZ || 0) * _DEG;
    chain.elbow.rotation.x += (mc.mcElbowX || 0) * _DEG;
    chain.elbow.rotation.y += i * (mc.mcElbowY || 0) * _DEG;
    chain.elbow.rotation.z += i * (mc.mcElbowZ || 0) * _DEG;
    chain.wrist.rotation.x += (mc.mcWristX || 0) * _DEG;
    chain.wrist.rotation.y += i * (mc.mcWristY || 0) * _DEG;
    chain.wrist.rotation.z += i * (mc.mcWristZ || 0) * _DEG;
  }

  /** Offsets d'animation (frappe, marche…) par-dessus une pose calibrée. */
  function _applyChainAnimOffset(chain, off) {
    if (!chain || !off) return;
    const sh = chain.shoulder;
    const el = chain.elbow;
    const wr = chain.wrist;
    if (off.x) sh.position.x += off.x;
    if (off.y) sh.position.y += off.y;
    if (off.z) sh.position.z += off.z;
    if (off.shoulderRx) sh.rotation.x += off.shoulderRx;
    if (off.shoulderRy) sh.rotation.y += off.shoulderRy;
    if (off.shoulderRz) sh.rotation.z += off.shoulderRz;
    if (off.elbowRx) el.rotation.x += off.elbowRx;
    if (off.elbowRy) el.rotation.y += off.elbowRy;
    if (off.elbowRz) el.rotation.z += off.elbowRz;
    if (off.wristRx) wr.rotation.x += off.wristRx;
    if (off.wristRy) wr.rotation.y += off.wristRy;
    if (off.wristRz) wr.rotation.z += off.wristRz;
  }

  function _applyTwoHandGripVisual(fpsGroup, grip, stored, offsets) {
    offsets = offsets || {};
    _applyTwoHandArmChains(fpsGroup, grip, stored);
    const parts = _getRigParts(fpsGroup);
    const rChain = parts.rArm?.userData?.chain;
    const lChain = parts.lArm?.userData?.chain;
    _applyChainAnimOffset(rChain, offsets.rArm);
    _applyChainAnimOffset(lChain, offsets.lArm);
    if (parts.lArm) parts.lArm.visible = true;

    const swing = offsets.swing || 0;
    if (swing > 0 && rChain) {
      const swingSin = Math.sin(swing * Math.PI);
      const swingEase = Math.sin(Math.sqrt(swing) * Math.PI);
      rChain.shoulder.rotation.x += -0.68 * swingEase;
      rChain.shoulder.rotation.z += -0.03 * swingEase;
      rChain.elbow.rotation.x += -0.42 * swingSin;
      rChain.wrist.rotation.x += 0.26 * swingSin;
      if (lChain) {
        lChain.shoulder.rotation.x += -0.68 * swingEase;
        lChain.shoulder.rotation.z += -0.03 * swingEase;
        lChain.elbow.rotation.x += -0.42 * swingSin;
        lChain.wrist.rotation.x += 0.26 * swingSin;
      }
    }

    const io = offsets.item || {};
    if (grip.sharedItem && grip.item) {
      parts.rArm?.userData?.chain?.hand?.updateWorldMatrix?.(true, false);
      parts.lArm?.userData?.chain?.hand?.updateWorldMatrix?.(true, false);
      _syncSharedItemHolder(fpsGroup, parts, grip, io);
      const rh = parts.rightHolder || parts.rArm?.userData?.itemHolder;
      if (rh) {
        rh.visible = true;
        _getItemPivot(rh).visible = false;
      }
    }
    const gripType = fpsGroup.userData.gripType;
    _applyHandItemScale(fpsGroup, gripType, stored.itemScale ?? grip.itemScale);
  }

  function _applyTwoHandArmChains(fpsGroup, grip, stored) {
    const parts = _getRigParts(fpsGroup);
    const rChain = parts.rArm?.userData?.chain;
    const lChain = parts.lArm?.userData?.chain;
    if (!rChain || !lChain) return;

    const useDirectR = !!(stored?.shoulder || stored?.elbow || stored?.wrist);
    const useDirectL = !!(stored?.lShoulder || stored?.lElbow || stored?.lWrist);

    if (useDirectR) {
      _applyArmChainPose(rChain, {
        shoulder: stored.shoulder,
        elbow: stored.elbow,
        wrist: stored.wrist,
      });
      _applyMcDeltaOnChain(rChain, 'right', stored.rArm || grip.rArm);
    } else {
      _applyFPSArmChain(rChain, 'right', grip, {
        dx: grip.rArm?.mcPostX || 0,
        dy: grip.rArm?.mcPostY || 0,
        dz: grip.rArm?.mcPostZ || 0,
      });
    }

    parts.lArm.visible = true;
    if (useDirectL) {
      _applyArmChainPose(lChain, {
        shoulder: stored.lShoulder,
        elbow: stored.lElbow,
        wrist: stored.lWrist,
      });
      _applyMcDeltaOnChain(lChain, 'left', stored.lArm || grip.lArm);
    } else if (grip.lArm) {
      _applyFPSArmChain(lChain, 'left', { rArm: grip.lArm }, {
        dx: grip.lArm.mcPostX || 0,
        dy: grip.lArm.mcPostY || 0,
        dz: grip.lArm.mcPostZ || 0,
      });
    }
  }

  function _applyHandItemScale(fpsGroup, gripType, scale) {
    const grip = getGrip(gripType);
    const s = Number.isFinite(scale) ? scale : grip.itemScale;
    if (!Number.isFinite(s)) return;
    const holder = grip.sharedItem && grip.twoHanded
      ? _getCenterItemHolder(fpsGroup)
      : null;
    if (!holder) return;
    const pivot = _getItemPivot(holder);
    const base = gripType === 'tool_caillou' ? 0.60 : 1;
    const mul = s / base;
    pivot.scale.set(mul, mul, mul);
  }

  function applyFPSGripTune(gripType, pose) {
    const entry = GRIP_TYPES[gripType];
    if (!entry || !pose) return;
    if (pose.item && entry.item) Object.assign(entry.item, pose.item);
    if (pose.rArm && entry.rArm) Object.assign(entry.rArm, pose.rArm);
    if (pose.lArm && entry.lArm) Object.assign(entry.lArm, pose.lArm);
    if (pose.center) entry.center = { ...(entry.center || {}), ...pose.center };
    if (Number.isFinite(pose.itemScale)) entry.itemScale = pose.itemScale;
    if (entry.twoHanded) _storeTwoHandPose(gripType, pose);
    else if (pose.shoulder) _storeGripChainPose(gripType, pose);
  }

  function applyFPSGripTuneToArms(fpsGroup, gripType, pose, opts) {
    if (!fpsGroup || !pose) return;
    applyFPSGripTune(gripType, pose);
    const grip = getGrip(gripType);
    if (opts?.freeze) {
      fpsGroup.userData.tunerFreeze = true;
      fpsGroup.userData.anim = { kind: 'debug_freeze' };
    } else {
      fpsGroup.userData.tunerFreeze = false;
      fpsGroup.userData.anim = null;
    }
    fpsGroup.userData.gripType = gripType;
    if (grip.twoHanded) {
      _applyTwoHandGripVisual(fpsGroup, grip, _FPS_TWO_HAND_POSES[gripType] || pose, {});
      fpsGroup.userData.basePose = {
        grip,
        item: grip.item ? { pos: [grip.item.x, grip.item.y, grip.item.z], rot: [grip.item.rx, grip.item.ry, grip.item.rz] } : null,
        rArm: grip.rArm ? { ...grip.rArm } : null,
        lArm: grip.lArm ? { ...grip.lArm, visible: true } : null,
      };
      return;
    }
    if (pose.shoulder) _storeGripChainPose(gripType, pose);
    _applyFPSDirectPose(fpsGroup, pose);
    fpsGroup.userData.basePose = {
      grip,
      item: grip.item ? {
        pos: [grip.item.x, grip.item.y, grip.item.z],
        rot: [grip.item.rx, grip.item.ry, grip.item.rz],
      } : null,
      rArm: grip.rArm ? { ...grip.rArm } : null,
      lArm: null,
    };
  }

  function applyFPSRemoteTune(pose) {
    if (!pose?.remote) return;
    const r = pose.remote;
    if (Array.isArray(r.rArmRot)) _REMOTE_AIM.rArmRot = r.rArmRot.slice();
    if (Array.isArray(r.handHolder)) _REMOTE_AIM.handHolder = r.handHolder.slice();
    for (const key of Object.keys(GRIP_TYPES)) {
      const g = GRIP_TYPES[key];
      if (!g.remote) continue;
      if (Array.isArray(r.rArmRot)) g.remote.rArmRot = r.rArmRot.slice();
      if (Array.isArray(r.handHolder)) g.remote.handHolder = r.handHolder.slice();
    }
  }

  function applyFPSValidatedPose(itemKey, pose, fpsArms) {
    if (!pose) return;
    if (itemKey === 'tool_torche') {
      applyFPSTorchTune(pose);
      if (fpsArms) {
        const type = fpsArms.userData.gripType;
        if (type === 'tool_torche') {
          fpsArms.userData.tunerFreeze = false;
          fpsArms.userData.anim = null;
          _saveBasePose(fpsArms, getGrip('tool_torche'), 'tool_torche');
        }
      }
      return;
    }
    if (itemKey === 'empty_hand') {
      applyFPSEmptyTune(pose);
      if (fpsArms) applyFPSEmptyTuneToArms(fpsArms, pose);
      return;
    }
    if (itemKey === 'remote_view') {
      applyFPSRemoteTune(pose);
      return;
    }
    if (!GRIP_TYPES[itemKey]) return;
    applyFPSGripTune(itemKey, pose);
    if (fpsArms && fpsArms.userData.gripType === itemKey) {
      applyFPSGripTuneToArms(fpsArms, itemKey, pose, { freeze: true });
    }
  }

  function _readValidatedGripPose(gripType) {
    const key = ZS.FpsGripCalibration?.storageKey?.(gripType);
    if (!key) return null;
    try {
      let raw = localStorage.getItem(key);
      if (!raw && gripType === 'tool_torche') raw = localStorage.getItem('zs_arm_tuner_validated');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function loadFPSValidatedPoses(fpsArms) {
    const entries = ZS.FpsGripCalibration?.listAll?.() || [];
    for (const entry of entries) {
      try {
        const pose = _readValidatedGripPose(entry.id);
        if (!pose) continue;
        if (!pose?.shoulder && !pose?.lShoulder && !pose?.remote && !pose?.item) continue;
        applyFPSValidatedPose(entry.id, pose, null);
      } catch (_) { /* ignore */ }
    }
    if (fpsArms) {
      const type = fpsArms.userData.gripType;
      if (!type) {
        applyFPSEmptyTuneToArms(fpsArms, _FPS_ABSOLUTE_POSES.empty_hand);
        return;
      }
      const pose = _readValidatedGripPose(type);
      if (pose) {
        applyFPSValidatedPose(type, pose, fpsArms);
        return;
      }
      if (type === 'tool_torche') _saveBasePose(fpsArms, getGrip(type), type);
      else if (GRIP_TYPES[type]) _saveBasePose(fpsArms, getGrip(type), type);
    }
  }

  /** Main vide : pose repos + idle/marche live (pas de freeze anim). */
  function applyFPSEmptyTuneToArms(fpsGroup, pose) {
    if (!fpsGroup || !pose) return;
    applyFPSEmptyTune(pose);
    fpsGroup.userData.tunerFreeze = false;
    fpsGroup.userData.anim = null;
    fpsGroup.userData.debugPoseId = 'empty_hand';
    const grip = getGrip(null);
    _saveBasePose(fpsGroup, grip, null);
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
