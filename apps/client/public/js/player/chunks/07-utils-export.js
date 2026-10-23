// Helpers mesh + exports ZS — extrait de player.js (IIFE)
function _boxGeo(w, h, d) {
    const key = `${w}|${h}|${d}`;
    let geo = _boxGeoCache.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(w, h, d);
      _boxGeoCache.set(key, geo);
    }
    return geo;
  }

  function addBox(parent, material, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(_boxGeo(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function m(color) {
    let mat = _matCache.get(color);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({ color });
      _matCache.set(color, mat);
    }
    return mat;
  }

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
  ZS.tickTorchFx       = tickTorchFx;
  ZS.tickHumanoidRig   = tickHumanoidRig;
  ZS.isArmAnimActive   = isArmAnimActive;
  ZS.applyHumanoidPalette = applyHumanoidPalette;
  ZS.applyFPSDebugPose = applyFPSDebugPose;
  ZS.applyFPSTorchTune = applyFPSTorchTune;
  ZS.applyFPSEmptyTune = applyFPSEmptyTune;
  ZS.applyFPSEmptyTuneToArms = applyFPSEmptyTuneToArms;
  ZS.applyFPSValidatedPose = applyFPSValidatedPose;
  ZS.applyFPSGripTuneToArms = applyFPSGripTuneToArms;
  ZS.applyFPSRemoteTune = applyFPSRemoteTune;
  ZS.loadFPSValidatedPoses = loadFPSValidatedPoses;
