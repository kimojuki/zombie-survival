// Procedural beach — bande sable pleine largeur côte est + océan qui chevauche.
(function () {
  'use strict';

  // Sync packages/shared/src/beach-spawn.mjs
  const COAST = { xW: 244, xE: 295, zS: -88, zN: 88 };
  const SHORE_X = COAST.xE - 2;
  const SEA = { cx: 338, cz: -8, hw: 48, hd: 340, y: 0.28 };
  const SPAWN = { x: 248, y: 1, z: -8, rotY: Math.PI / 2 };
  const TRAIL = [
    [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
    [45, -6], [0, -6], [14, -18],
  ];

  function _inFootprint(x, z, margin) {
    const m = margin || 0;
    return x >= COAST.xW - m && x <= COAST.xE + m
      && z >= COAST.zS - m && z <= COAST.zN + m;
  }

  function _sandCoastRect(scene) {
    const w = COAST.xE - COAST.xW + 4;
    const d = COAST.zN - COAST.zS;
    const geo = new THREE.PlaneGeometry(w, d, 14, 18);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const flatY = ZS.getTerrainHeight?.(COAST.xW + 4, 0) ?? 0;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = (COAST.xW + COAST.xE) * 0.5 + lx;
      const wz = (COAST.zS + COAST.zN) * 0.5 + lz;
      const westT = Math.max(0, Math.min(1, (wx - COAST.xW) / 14));
      const raw = ZS.getTerrainHeight?.(wx, wz) ?? flatY;
      pos.setY(i, flatY + 0.05 + (raw - flatY) * (1 - westT) * 0.15);
    }
    geo.computeVertexNormals();
    const mat = ZS.BeachTextures?.getSandMaterial?.(0xf2e6cc)
      || new THREE.MeshLambertMaterial({ color: 0xd4bc94 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((COAST.xW + COAST.xE) * 0.5 + 2, 0, (COAST.zS + COAST.zN) * 0.5);
    mesh.receiveShadow = true;
    mesh.renderOrder = 3;
    scene.add(mesh);
    return mesh;
  }

  function _shoreWet(scene) {
    const w = 14;
    const d = COAST.zN - COAST.zS;
    const geo = new THREE.PlaneGeometry(w, d, 4, 8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({
      color: 0xb8a078,
      transparent: true,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(SHORE_X - w * 0.45, 0.06, (COAST.zS + COAST.zN) * 0.5);
    mesh.renderOrder = 4;
    scene.add(mesh);
  }

  function _seaSurface(scene) {
    const geo = new THREE.PlaneGeometry(SEA.hw * 2, SEA.hd * 2, 16, 20);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({
      color: 0x1a5270,
      transparent: true,
      opacity: 0.96,
      emissive: 0x082838,
      emissiveIntensity: 0.35,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(SEA.cx, SEA.y, SEA.cz);
    mesh.renderOrder = 5;
    scene.add(mesh);
    ZS.registerWaterSurface?.(mesh, 0.05, 0.85);

    const step = 14;
    const seaWest = SEA.cx - SEA.hw;
    for (let i = 0; i <= step; i++) {
      const t = i / step;
      const wx = seaWest + t * SEA.hw * 2;
      for (let j = 0; j <= step; j++) {
        const u = j / step;
        const wz = SEA.cz - SEA.hd + u * SEA.hd * 2;
        if (wx < SHORE_X - 4) continue;
        ZS.registerWaterZone?.(wx, wz, SEA.hw / step + 5, SEA.y);
      }
    }
  }

  function _beachProps(scene) {
    const drift = [
      [268, -20, 0.3], [272, 8, -0.5], [266, 22, 0.8], [270, -32, 1.1],
      [264, 40, 0.2], [268, -55, 0.9],
    ];
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    for (const [x, z, ry] of drift) {
      if (!_inFootprint(x, z, 0)) continue;
      const y = ZS.getTerrainHeight?.(x, z) ?? 0;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 1.2, 6), wood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = ry;
      log.position.set(x, y + 0.1, z);
      log.castShadow = true;
      scene.add(log);
    }
  }

  function build(scene) {
    _sandCoastRect(scene);
    _shoreWet(scene);
    _seaSurface(scene);
    _beachProps(scene);
    if (ZS.buildSpawnTrail && TRAIL.length > 1) {
      ZS.buildSpawnTrail(scene, TRAIL, ZS.B);
    }
  }

  function _registerTerrain() {
    const cx = (COAST.xW + COAST.xE) * 0.5;
    const cz = (COAST.zS + COAST.zN) * 0.5;
    const rx = (COAST.xE - COAST.xW) * 0.5 + 2;
    const rz = (COAST.zN - COAST.zS) * 0.5;
    if (ZS.registerClearingDisc) {
      ZS.registerClearingDisc(cx, cz, rx, rz, 4);
    }
    if (ZS.registerTerrainPatch) {
      ZS.registerTerrainPatch(cx, cz, rx + 2, rz, 2.5, {
        smooth: 0.96,
        level: 0.1,
        sampleRadius: 2.4,
      });
    }
  }

  ZS.isInBeachFootprint = _inFootprint;
  ZS.SpawnZone = {
    build,
    registerTerrain: _registerTerrain,
    spawn: { ...SPAWN },
    trail: TRAIL.map((p) => p.slice()),
  };
  ZS.BEACH_TRAIL_PTS = TRAIL.map((p) => p.slice());
  ZS.Buildings.registerSector({ build, roads: [], spawnOnly: true });
}());
