// Procedural beach — dalle sable épaisse (couche 2) + océan.
(function () {
  'use strict';

  const MAP_EAST_X = 295;
  const SHORE_X = MAP_EAST_X - 1;
  const SEA = { cx: 338, cz: -8, hw: 48, hd: 340, y: 0.28 };
  const SPAWN = { x: 248, y: 1, z: -8, rotY: Math.PI / 2 };
  const TRAIL = [
    [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
    [45, -6], [0, -6], [14, -18],
  ];

  function _thick() {
    return ZS.BEACH_SAND_THICKNESS || 0.35;
  }

  function _coastWeight(x, z) {
    return ZS.beachCoastWeight ? ZS.beachCoastWeight(x, z) : 0;
  }

  function _inFootprint(x, z, margin) {
    return ZS.isInBeachFootprint ? ZS.isInBeachFootprint(x, z, margin || 0) : false;
  }

  function _terrainY(x, z) {
    const base = ZS.getVisibleTerrainHeight
      ? ZS.getVisibleTerrainHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
    const bw = _coastWeight(x, z);
    const sink = ZS.beachTerrainSink ? ZS.beachTerrainSink(bw) : 0;
    return base - sink;
  }

  function _sandTopY(x, z) {
    if (ZS.getBeachSurfaceHeight) {
      const y = ZS.getBeachSurfaceHeight(x, z);
      if (y !== null) return y;
    }
    return _terrainY(x, z) + _thick();
  }

  function _pushTri(pos, idx, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const base = pos.length / 3;
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    idx.push(base, base + 1, base + 2);
  }

  function _buildSlabGeo(xMin, zMin, w, d, segX, segZ, minBw) {
    const thick = _thick();
    const pos = [];
    const idx = [];

    function corner(ix, iz) {
      const wx = xMin + (ix / segX) * w;
      const wz = zMin + (iz / segZ) * d;
      const bw = _coastWeight(wx, wz);
      const top = bw >= minBw ? _sandTopY(wx, wz) : _terrainY(wx, wz);
      return { wx, wz, bw, top, bot: top - thick };
    }

    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const p00 = corner(ix, iz);
        const p10 = corner(ix + 1, iz);
        const p01 = corner(ix, iz + 1);
        const p11 = corner(ix + 1, iz + 1);
        const bwMax = Math.max(p00.bw, p10.bw, p01.bw, p11.bw);
        if (bwMax < minBw) continue;

        const { wx: x0, wz: z0, top: t00, bot: b00 } = p00;
        const { wx: x1, top: t10, bot: b10 } = p10;
        const { wz: z1, top: t01, bot: b01 } = p01;
        const { top: t11, bot: b11 } = p11;

        _pushTri(pos, idx, x0, t00, z0, x1, t10, z0, x1, t11, z1);
        _pushTri(pos, idx, x0, t00, z0, x1, t11, z1, x0, t01, z1);

        _pushTri(pos, idx, x0, b00, z0, x1, b11, z1, x1, b10, z0);
        _pushTri(pos, idx, x0, b00, z0, x0, b01, z1, x1, b11, z1);

        _pushTri(pos, idx, x0, b00, z0, x0, t00, z0, x1, t10, z0);
        _pushTri(pos, idx, x0, b00, z0, x1, t10, z0, x1, b10, z0);

        _pushTri(pos, idx, x1, b10, z0, x1, t10, z0, x1, t11, z1);
        _pushTri(pos, idx, x1, b10, z0, x1, t11, z1, x1, b11, z1);

        _pushTri(pos, idx, x0, b01, z1, x0, t01, z1, x1, t11, z1);
        _pushTri(pos, idx, x0, b01, z1, x1, t11, z1, x1, b11, z1);

        _pushTri(pos, idx, x0, b00, z0, x0, b01, z1, x0, t01, z1);
        _pushTri(pos, idx, x0, b00, z0, x0, t01, z1, x0, t00, z0);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function _sandSlabMesh(scene) {
    const xMin = 222;
    const xMax = MAP_EAST_X + 8;
    const zMin = -102;
    const zMax = 86;
    const mobile = !!(window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
    const geo = _buildSlabGeo(xMin, zMin, xMax - xMin, zMax - zMin, mobile ? 14 : 22, mobile ? 18 : 28, 0.12);
    const mat = ZS.BeachTextures?.getSandMaterial?.(0xf2e6cc)
      || new THREE.MeshLambertMaterial({ color: 0xd4bc94 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 8;
    mesh.userData.groundKind = 'beach_sand';
    scene.add(mesh);
    ZS.registerGroundMesh?.(mesh);
    return mesh;
  }

  function _shoreSlabMesh(scene) {
    const w = 18;
    const d = 168;
    const originX = SHORE_X - w * 0.42;
    const geo = _buildSlabGeo(originX, -8 - d * 0.5, w, d, 4, 10, 0.08);
    const mat = ZS.BeachTextures?.getSandMaterial?.(0xb8a078)
      || new THREE.MeshLambertMaterial({ color: 0xb8a078 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 9;
    mesh.userData.groundKind = 'beach_shore';
    scene.add(mesh);
    ZS.registerGroundMesh?.(mesh);
    return mesh;
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
        if (wx < SHORE_X - 6) continue;
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
      const y = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(x, z)
        : _sandTopY(x, z);
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
    _sandSlabMesh(scene);
    _shoreSlabMesh(scene);
    _seaSurface(scene);
    _beachProps(scene);
    if (ZS.buildSpawnTrail && TRAIL.length > 1) {
      ZS.buildSpawnTrail(scene, TRAIL, ZS.B);
    }
  }

  function _registerTerrain() {
    if (ZS.registerTerrainPatch) {
      ZS.registerTerrainPatch(268, -8, 42, 94, 10, {
        smooth: 0.96,
        level: 0.1,
        sampleRadius: 2.4,
      });
    }
  }

  ZS.SpawnZone = {
    build,
    registerTerrain: _registerTerrain,
    spawn: { ...SPAWN },
    trail: TRAIL.map((p) => p.slice()),
  };
  ZS.BEACH_TRAIL_PTS = TRAIL.map((p) => p.slice());
  ZS.Buildings.registerSector({ build, roads: [], spawnOnly: true });
}());
