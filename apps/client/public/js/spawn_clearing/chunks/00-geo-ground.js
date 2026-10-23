// Géométrie camp, hauteur sol, sentier spawn — extrait de spawn_clearing.js (IIFE)
function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  const SPAWN_CX = 0, SPAWN_CZ = -6;
  const CLEAR_RX = 5.8, CLEAR_RZ = 5.2;
  const _groundTex = new THREE.TextureLoader().load('/textures/camp/spawn_ground.png?v=20260606-spawn-ground-01');
  _groundTex.wrapS = _groundTex.wrapT = THREE.RepeatWrapping;
  _groundTex.repeat.set(1.2, 1.05);
  _groundTex.magFilter = THREE.NearestFilter;
  _groundTex.minFilter = THREE.NearestMipmapNearestFilter;
  _groundTex.colorSpace = THREE.SRGBColorSpace;

  function _inCamp(x, z, cx, cz) {
    const dx = (x - cx) / CLEAR_RX;
    const dz = (z - cz) / CLEAR_RZ;
    return Math.hypot(dx, dz) < 0.88;
  }

  /** Ellipse spawn : angle a → offset shape Three.js (rotateX -90° → monde XZ). */
  function _shapeEllipsePoint(a, rx, rz) {
    return new THREE.Vector2(Math.cos(a) * rx, -Math.sin(a) * rz);
  }

  function _ellipseWorld(a, rx, rz, cx, cz) {
    return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  }

  /** Tangente à l'ellipse au paramètre a (axe du rondin). */
  function _ellipseTangentYaw(a, rx, rz) {
    return Math.atan2(-rx * Math.sin(a), rz * Math.cos(a));
  }

  function _pointInTriangle(px, pz, ax, az, bx, bz, cx, cz) {
    const v0x = cx - ax; const v0z = cz - az;
    const v1x = bx - ax; const v1z = bz - az;
    const v2x = px - ax; const v2z = pz - az;
    const dot00 = v0x * v0x + v0z * v0z;
    const dot01 = v0x * v1x + v0z * v1z;
    const dot02 = v0x * v2x + v0z * v2z;
    const dot11 = v1x * v1x + v1z * v1z;
    const dot12 = v1x * v2x + v1z * v2z;
    const inv = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(inv) < 1e-8) return false;
    const u = (dot11 * dot02 - dot01 * dot12) / inv;
    const v = (dot00 * dot12 - dot01 * dot02) / inv;
    return u >= -0.02 && v >= -0.02 && (u + v) <= 1.02;
  }

  function _ellipseArcLength(rx, rz, a0, a1, steps) {
    let len = 0;
    let px = null; let pz = null;
    const n = steps || 80;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (a1 - a0);
      const x = rx * Math.cos(a);
      const z = rz * Math.sin(a);
      if (px !== null) len += Math.hypot(x - px, z - pz);
      px = x; pz = z;
    }
    return len;
  }

  function _gapTongueTip(cx, cz, rx, rz) {
    return [cx, cz + Math.sin(CAMP_GAP_CENTER) * rz * 1.05];
  }

  function _inGapTongue(x, z, cx, cz) {
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    const aL = CAMP_GAP_CENTER + CAMP_GAP_WIDTH;
    const aR = CAMP_GAP_CENTER - CAMP_GAP_WIDTH;
    const [xL, zL] = _ellipseWorld(aL, rx, rz, cx, cz);
    const [xR, zR] = _ellipseWorld(aR, rx, rz, cx, cz);
    const [xT, zT] = _gapTongueTip(cx, cz, rx, rz);
    return _pointInTriangle(x, z, xL, zL, xR, zR, xT, zT);
  }

  function _orientLogTangent(log, x, y, z, yaw) {
    log.position.set(x, y, z);
    log.rotation.order = 'YXZ';
    log.rotation.y = yaw;
    log.rotation.x = Math.PI / 2;
    log.rotation.z = 0;
  }

  const CAMP_GAP_CENTER = -Math.PI / 2;
  const CAMP_GAP_WIDTH = 0.52;
  const CAMP_GROUND_LIFT = 0.07;
  const TRAIL_SURFACE_LIFT = 0.08;

  /** Zone couverte par le mesh sol camp (ellipse + languette sud vers le sentier). */
  function _onCampGroundPatch(x, z, cx, cz) {
    if (_inGapTongue(x, z, cx, cz)) return true;
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    const dx = (x - cx) / rx;
    const dz = (z - cz) / rz;
    if (Math.hypot(dx, dz) > 1.0) return false;
    const a = Math.atan2(z - cz, x - cx);
    let da = a - CAMP_GAP_CENTER;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) >= CAMP_GAP_WIDTH;
  }

  /** Relèvement décor au-dessus du terrain brut (couche 2 camp, sentier, plage, etc.). */
  function getDecorSurfaceLift(x, z) {
    if (ZS.getBeachSurfaceHeight) {
      const sandY = ZS.getBeachSurfaceHeight(x, z);
      if (sandY !== null) {
        const base = ZS.getVisibleTerrainHeight
          ? ZS.getVisibleTerrainHeight(x, z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
        return Math.max(0, sandY - base);
      }
    }
    if (_onCampGroundPatch(x, z, SPAWN_CX, SPAWN_CZ)) return CAMP_GROUND_LIFT;
    if (ZS.Trails?.isNear && ZS.SPAWN_TRAIL_PTS
        && ZS.Trails.isNear(ZS.SPAWN_TRAIL_PTS, x, z, 0.75)) {
      return TRAIL_SURFACE_LIFT;
    }
    return 0;
  }

  /**
   * Hauteur de pose props / items / joueur : terrain (couche 1) + surface décor.
   * opts.groundLift = offset local au-dessus de la surface (ex. y serveur RCON).
   */
  function getDecorGroundHeight(x, z, opts) {
    opts = opts || {};
    const lift = Number.isFinite(opts.groundLift) ? opts.groundLift : 0;
    // Construction du mesh camp (pas encore dans la scène) — formule analytique.
    if (opts.layer === 'camp') {
      const base = ZS.getVisibleTerrainHeight
        ? ZS.getVisibleTerrainHeight(x, z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
      return base + getDecorSurfaceLift(x, z) + lift;
    }
    let h;
    if (ZS.raycastGroundHeight) {
      h = ZS.raycastGroundHeight(x, z);
    } else {
      const base = ZS.getVisibleTerrainHeight
        ? ZS.getVisibleTerrainHeight(x, z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
      const surface = opts.layer === 'terrain' ? 0 : getDecorSurfaceLift(x, z);
      h = base + surface;
    }
    if (ZS.getBeachSurfaceHeight) {
      const sandY = ZS.getBeachSurfaceHeight(x, z);
      if (sandY !== null && sandY > h) h = sandY;
    }
    return h + lift;
  }

  /** Bouche sud du sentier (languette camp) — tracé complet généré dans proc_roads.js */
  function getSpawnTrailMouth() {
    const rx = CLEAR_RX * 0.98;
    const rz = CLEAR_RZ * 0.98;
    return _gapTongueTip(SPAWN_CX, SPAWN_CZ, rx, rz);
  }

  function _spawnTrailPoints() {
    return (ZS.BEACH_TRAIL_PTS || [
      [242, -8], [215, -8], [175, -7], [130, -6], [85, -6],
      [45, -6], [0, -6], [14, -18],
    ]).map((p) => p.slice());
  }

  const SPAWN_TRAIL_PTS = _spawnTrailPoints();
