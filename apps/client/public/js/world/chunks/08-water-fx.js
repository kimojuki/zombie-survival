// Eau, feux, billboards — extrait de world.js (IIFE)
function registerBillboards(meshes) {
    for (const m of meshes) if (m) _billboards.push(m);
  }

  function updateBillboards(camX, camZ) {
    for (const m of _billboards) {
      if (!m.parent) continue;
      m.getWorldPosition(_billboardVec);
      // Plans verticaux face à la caméra (flammes, fumée)
      m.rotation.set(0, Math.atan2(camX - _billboardVec.x, camZ - _billboardVec.z), 0);
    }
  }

  function registerFireLight(light, mesh, opts) {
    _fireLights.push({
      light,
      mesh: mesh || null,
      baseIntensity: opts?.baseIntensity,
      onTick: opts?.onTick || null,
    });
  }

  function registerWallClock(clock) {
    if (clock?.hourHand) _wallClocks.push(clock);
  }
  function registerWaterMaterial(mat)     { _waterMats.push(mat); }
  function registerWaterSurface(mesh, amp, speed) {
    const arr = mesh.geometry.attributes.position.array;
    _waterSurfaces.push({
      mesh,
      base: new Float32Array(arr),
      amp: amp || 0.08,
      speed: speed || 1.2,
    });
  }

  // ── Zones d'eau (rivière) ────────────────────────────────────────────────────
  const _waterZones = []; // { x, z, r, y }

  function registerWaterZone(x, z, r, y) { _waterZones.push({ x, z, r, y }); }

  function getWaterSurface(px, pz) {
    let bestY = null, bestDist = Infinity;
    for (const wz of _waterZones) {
      const d = Math.hypot(px - wz.x, pz - wz.z);
      if (d < wz.r && d < bestDist) { bestDist = d; bestY = wz.y; }
    }
    return bestY;
  }

  function isInWaterZone(px, pz) {
    return _waterZones.some(wz => Math.hypot(px - wz.x, pz - wz.z) < wz.r);
  }
  function getWaterZones() { return _waterZones.slice(); }

  window.ZS = window.ZS || {};
  ZS.buildWorld             = buildWorld;
  ZS.buildWorldAsync        = buildWorldAsync;
  ZS.runPostSpawnVisualBuilds = runPostSpawnVisualBuilds;
  ZS.applyGraphicsOptions   = applyGraphicsOptions;
  ZS.World                  = { applyGraphicsOptions };
  ZS.registerGroundMesh      = registerGroundMesh;
  ZS.getVisibleTerrainHeight = getVisibleTerrainHeight;
  ZS.raycastTerrainHeight    = raycastTerrainHeight;
  ZS.raycastGroundHeight     = raycastGroundHeight;
  ZS.raycastViewToGround     = raycastViewToGround;
  ZS.tickDayNight         = tickDayNight;
  ZS.setWorldTime         = setWorldTime;
  ZS.getWorldTime         = getWorldTime;
  ZS.setBeachIntroGoldenHour = setBeachIntroGoldenHour;
  ZS.isBeachIntroGoldenHour  = isBeachIntroGoldenHour;
  ZS.registerWallClock    = registerWallClock;
  ZS.getFoliageDayBlend   = getFoliageDayBlend;
  ZS.setShadowCenter   = setShadowCenter;
  let _decorColliderRegisterBatch = 0;
