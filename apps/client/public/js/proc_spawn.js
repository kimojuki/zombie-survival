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

  function _coastWeight(x, z) {
    return ZS.beachCoastWeight ? ZS.beachCoastWeight(x, z) : 0;
  }

  function _terrainY(x, z) {
    return ZS.getVisibleTerrainHeight
      ? ZS.getVisibleTerrainHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
  }

  function _sandTopY(x, z) {
    const y = ZS.getBeachSurfaceHeight?.(x, z);
    if (y !== null) return y;
    return _terrainY(x, z) + (ZS.BEACH_CAP_LIFT || 0.05);
  }

  const _sandUvTile = () => ZS.BeachTextures?.SAND_UV_TILE || 3.2;

  function _pushTri(pos, uvs, idx, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const base = pos.length / 3;
    const t = _sandUvTile();
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(ax / t, az / t, bx / t, bz / t, cx / t, cz / t);
    idx.push(base, base + 1, base + 2);
  }

  /** Couverture sable — surface supérieure seule (pas de faces inférieures = pas de z-fight). */
  function _buildSlabGeo(xMin, zMin, w, d, segX, segZ, minBw) {
    const pos = [];
    const uvs = [];
    const idx = [];

    function corner(ix, iz) {
      const wx = xMin + (ix / segX) * w;
      const wz = zMin + (iz / segZ) * d;
      const bw = _coastWeight(wx, wz);
      const top = bw >= minBw ? _sandTopY(wx, wz) : _terrainY(wx, wz);
      return { wx, wz, bw, top };
    }

    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const p00 = corner(ix, iz);
        const p10 = corner(ix + 1, iz);
        const p01 = corner(ix, iz + 1);
        const p11 = corner(ix + 1, iz + 1);
        const bwMax = Math.max(p00.bw, p10.bw, p01.bw, p11.bw);
        if (bwMax < minBw) continue;

        _pushTri(pos, uvs, idx,
          p00.wx, p00.top, p00.wz,
          p11.wx, p11.top, p11.wz,
          p10.wx, p10.top, p10.wz);
        _pushTri(pos, uvs, idx,
          p00.wx, p00.top, p00.wz,
          p01.wx, p01.top, p01.wz,
          p11.wx, p11.top, p11.wz);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
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
    const geo = _buildSlabGeo(xMin, zMin, xMax - xMin, zMax - zMin, mobile ? 12 : 16, mobile ? 14 : 20, 0.08);
    if (!geo.attributes.position?.count) {
      console.warn('[beach] sand cap empty — footprint check');
      return null;
    }
    const mat = ZS.BeachTextures?.getSandMaterial?.(0xffffff)
      || new THREE.MeshLambertMaterial({ color: 0xd4bc94 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 3;
    mesh.userData.groundKind = 'beach_sand';
    scene.add(mesh);
    ZS.registerGroundMesh?.(mesh);

    const shoreGeo = _buildSlabGeo(MAP_EAST_X - 18, zMin, 26, zMax - zMin, 5, mobile ? 10 : 14, 0.06);
    if (shoreGeo.attributes.position?.count) {
      const wetMat = ZS.BeachTextures?.getSandMaterial?.(0xe8e0d0, { wet: true })
        || mat;
      const shore = new THREE.Mesh(shoreGeo, wetMat);
      shore.receiveShadow = true;
      shore.renderOrder = 3;
      shore.userData.groundKind = 'beach_shore';
      scene.add(shore);
      ZS.registerGroundMesh?.(shore);
    }
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

  let _decorScene = null;

  function build(scene, opts) {
    opts = opts || {};
    _sandSlabMesh(scene);
    _seaSurface(scene);
    if (!opts.deferBeachDecor) {
      ZS.buildBeachDecor?.(scene);
    } else {
      _decorScene = scene;
    }
    if (ZS.buildSpawnTrail && TRAIL.length > 1) {
      ZS.buildSpawnTrail(scene, TRAIL, ZS.B);
    }
  }

  function finishBeachDecorAsync() {
    if (!_decorScene) return;
    const scene = _decorScene;
    _decorScene = null;
    const run = () => {
      try {
        const p = ZS.buildBeachDecorAsync?.(scene) ?? ZS.buildBeachDecor?.(scene);
        if (p?.catch) p.catch((e) => console.warn('[beach] decor deferred', e));
      } catch (e) { console.warn('[beach] decor deferred', e); }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 16);
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
    finishBeachDecorAsync,
    registerTerrain: _registerTerrain,
    spawn: { ...SPAWN },
    trail: TRAIL.map((p) => p.slice()),
  };
  ZS.BEACH_TRAIL_PTS = TRAIL.map((p) => p.slice());
  ZS.Buildings.registerSector({ build, roads: [], spawnOnly: true });
}());
