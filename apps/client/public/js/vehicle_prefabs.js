// Épaves véhicules — prefabs décor RCON + textures procédurales.
(function () {
  'use strict';

  const WHEEL_SLOTS = [[-0.97, -1.38], [0.97, -1.38], [-0.97, 1.38], [0.97, 1.38]];

  const BODY = {
    wreck_sedan:  { w: 1.78, h: 0.72, d: 4.1,  cw: 1.48, ch: 0.62, cd: 2.15, cz: -0.18 },
    wreck_pickup: { w: 1.85, h: 0.78, d: 4.55, cw: 1.52, ch: 0.68, cd: 1.85, cz: -0.35 },
  };
  // Miroir decor_colliders.js — source visuelle épaves

  function _add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function _buildCarcass(root, opts, bodyKey) {
    opts = opts || {};
    const spec = BODY[bodyKey] || BODY.wreck_sedan;
    const burnt = !!opts.wreckBurnt || opts.wreckVariant === 'burnt';
    const variant = burnt ? 'burnt' : (opts.wreckVariant || 'rust');
    const tilt = Number.isFinite(opts.wreckTilt) ? opts.wreckTilt : (opts.rotZ || 0);
    const sink = Number.isFinite(opts.wreckSink) ? opts.wreckSink : 0;
    const x = root.position.x;
    const z = root.position.z;
    const ground = ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
    const baseY = ground - sink;
    root.position.y = baseY;
    root.rotation.z = tilt;

    const VT = ZS.VehicleTextures;
    const bodyM = VT ? VT.material(variant, { burnt, repeatX: 1.4, repeatY: 1.1 })
      : new THREE.MeshLambertMaterial({ color: burnt ? 0x1a1510 : 0x5a3015 });
    const darkM = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const flatM = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const glassM = new THREE.MeshLambertMaterial({
      color: burnt ? 0x1a2020 : 0x334444,
      transparent: true,
      opacity: burnt ? 0.22 : 0.42,
    });
    const charM = new THREE.MeshLambertMaterial({ color: 0x0a0806 });

    _add(root, new THREE.BoxGeometry(spec.w, spec.h, spec.d), bodyM, 0, 0.62, 0);
    _add(root, new THREE.BoxGeometry(spec.cw, spec.ch, spec.cd), bodyM, 0, 1.25, spec.cz);
    const windshield = _add(root, new THREE.BoxGeometry(spec.cw * 0.88, 0.5, 0.06), glassM, 0, 1.3, spec.cz - 1.02);
    if (burnt) windshield.rotation.x = 0.22;

    const wheelCount = opts.wreckWheels == null ? 4 : Math.max(0, Math.min(4, opts.wreckWheels | 0));
    const skipFrom = wheelCount >= 4 ? 0 : 4 - wheelCount;
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      if (i < skipFrom) continue;
      const [ox, oz] = WHEEL_SLOTS[i];
      const flat = i >= 2 && (Math.abs(tilt) > 0.12 || wheelCount <= 2);
      _add(root,
        new THREE.CylinderGeometry(flat ? 0.36 : 0.34, flat ? 0.36 : 0.34, flat ? 0.12 : 0.22, 9),
        flat ? flatM : darkM, ox, flat ? 0.28 : 0.37, oz, 0, 0, Math.PI / 2);
    }

    if (Math.abs(tilt) > 0.1 || burnt) {
      const hood = _add(root, new THREE.BoxGeometry(spec.w * 0.84, 0.18, 1.1), bodyM, 0, 0.92, spec.d * 0.38);
      hood.rotation.x = burnt ? -0.55 : -0.35;
    }

    if (burnt) {
      _add(root, new THREE.BoxGeometry(spec.w * 0.9, 0.04, 2.2), charM, 0, 0.78, 0.2);
    }
  }

  const WRECK_PREFABS = {
    wreck_sedan: {
      build(root, opts) { _buildCarcass(root, opts, 'wreck_sedan'); },
    },
    wreck_pickup: {
      build(root, opts) { _buildCarcass(root, opts, 'wreck_pickup'); },
    },
  };

  function register() {
    if (!ZS.registerDecorPrefab) return;
    for (const [id, def] of Object.entries(WRECK_PREFABS)) {
      ZS.registerDecorPrefab(id, def);
    }
  }

  window.ZS = window.ZS || {};
  ZS.VehiclePrefabs = { register, ids: () => Object.keys(WRECK_PREFABS) };
  ZS.WRECK_BODY = BODY;
  if (ZS.registerDecorPrefab) register();
}());
