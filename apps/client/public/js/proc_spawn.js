// Procedural beach spawn zone (Rust-style east coast).
(function () {
  'use strict';

  // Sync with packages/shared/src/beach-spawn.mjs
  const BEACH_CX = 252;
  const BEACH_CZ = 8;
  const BEACH_RX = 32;
  const BEACH_RZ = 58;
  const SEA = { cx: 278, cz: 8, hw: 18, hd: 62, y: 0.35 };
  const SPAWN = { x: 234, y: 1, z: 8, rotY: Math.PI / 2 };

  function _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function _smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function _sandPatch(scene, cx, cz, rx, rz) {
    const shape = new THREE.Shape();
    const sides = 48;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const wob = 1 + Math.sin(a * 3 + 0.4) * 0.04;
      const px = Math.cos(a) * rx * wob;
      const pz = Math.sin(a) * rz * wob;
      if (i === 0) shape.moveTo(px, pz);
      else shape.lineTo(px, pz);
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape, 6);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = cx + lx;
      const wz = cz + lz;
      const d = Math.hypot(lx / rx, lz / rz);
      const edge = _smoothstep(Math.max(0, Math.min(1, (d - 0.55) / 0.45)));
      const raw = ZS.getTerrainHeight(wx, wz);
      const flat = ZS.getTerrainHeight(cx, cz);
      pos.setY(i, _lerp(flat + 0.04, raw, edge));
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({
      color: 0xc9b48a,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0, cz);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    scene.add(mesh);
    return mesh;
  }

  function _seaSurface(scene) {
    const geo = new THREE.PlaneGeometry(SEA.hw * 2, SEA.hd * 2, 24, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({
      color: 0x2a6a8a,
      transparent: true,
      opacity: 0.88,
      emissive: 0x0a2840,
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(SEA.cx, SEA.y, SEA.cz);
    mesh.renderOrder = 4;
    scene.add(mesh);
    ZS.registerWaterSurface?.(mesh, 0.06, 0.9);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wx = SEA.cx - SEA.hw + t * SEA.hw * 2;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        const wz = SEA.cz - SEA.hd + u * SEA.hd * 2;
        ZS.registerWaterZone?.(wx, wz, SEA.hw / steps + 2, SEA.y);
      }
    }
    return mesh;
  }

  function build(scene) {
    _sandPatch(scene, BEACH_CX, BEACH_CZ, BEACH_RX, BEACH_RZ);
    _seaSurface(scene);
  }

  function _registerTerrain() {
    if (ZS.registerClearingDisc) {
      ZS.registerClearingDisc(BEACH_CX, BEACH_CZ, BEACH_RX, BEACH_RZ, 4.5);
    }
    if (ZS.registerTerrainPatch) {
      ZS.registerTerrainPatch(BEACH_CX, BEACH_CZ, BEACH_RX + 2, BEACH_RZ + 2, 2.2, {
        smooth: 0.92,
        level: 0.05,
        sampleRadius: 2.0,
      });
    }
  }

  ZS.SpawnZone = {
    build,
    registerTerrain: _registerTerrain,
    spawn: { ...SPAWN },
  };
  ZS.Buildings.registerSector({ build, roads: [], spawnOnly: true });
}());
