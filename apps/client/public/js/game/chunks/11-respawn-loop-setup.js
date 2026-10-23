// Respawn + culling lumières — extrait de game.js (async IIFE)
  // ── Respawn ───────────────────────────────────────────────────────────────
  function respawn() {
    // Ne pas réveiller le joueur ici : sinon la boucle envoie encore la position
    // de mort au serveur avant `respawn-at` et annule le téléport plage.
    ZS.Network.sendRespawn();
  }
  state.onRespawn = respawn;

  // ── Game loop ─────────────────────────────────────────────────────────────
  // ── Culling des lumières : seules les N PointLights les plus proches restent
  // actives (en forward rendering chaque fragment éclairé calcule TOUTES les
  // lumières → coût majeur sur mobile). Le compte reste constant = pas de recompile.
  let MAX_ACTIVE_LIGHTS = _gfxProf.maxLights || (_isMobile ? 3 : 8);
  let _SHADOW_INTERVAL = _gfxProf.shadowInterval || (_isMobile ? 36 : 18);
  let _LIGHT_CULL_EVERY = _gfxProf.lightCullEvery || (_isMobile ? 6 : 4);
  let _BIOME_STRIDE = _gfxProf.biomeStride || (_isMobile ? 2 : 1);
  let _BILLBOARD_STRIDE = _gfxProf.billboardStride || (_isMobile ? 2 : 1);
  let _biomeStrideAcc = 0;
  let _beachLifeStrideAcc = 0;
  let _s01ZoneLog = '';
  const _S01_CABIN_XZ = { x: 165.1, z: 7.1 };
  const _S01_CLEARING_XZ = { x: 0, z: -6 };
  const _S01_ROUTE_JUNC = { x: 85, z: -6 };

  function _tickS01DevLog(px, pz) {
    if (!ZS.DevLog?.isEnabled?.()) return;
    const bed = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'bed');
    const dCab = Math.hypot(px - _S01_CABIN_XZ.x, pz - _S01_CABIN_XZ.z);
    const dRoute = Math.hypot(px - _S01_ROUTE_JUNC.x, pz - _S01_ROUTE_JUNC.z);
    const dClear = Math.hypot(px - _S01_CLEARING_XZ.x, pz - _S01_CLEARING_XZ.z);
    const onRoad = ZS.isNearRoad?.(px, pz, 1.35);
    let zone = null;
    if (bed) zone = 'lit_cabane';
    else if (dCab < 14) zone = 'cabane01_proche';
    else if (dClear < 12) zone = 'clairiere_hub';
    else if (dRoute < 10) zone = 'route_jonction';
    else if (onRoad && px > 70 && px < 175) zone = 'route_cabane';
    else if (onRoad && px < 70 && px > -15) zone = 'route_clearing';
    if (!zone || zone === _s01ZoneLog) return;
    _s01ZoneLog = zone;
    ZS.DevLog.s01(`zone:${zone}`, {
      x: Math.round(px * 10) / 10,
      z: Math.round(pz * 10) / 10,
      bedId: bed?.decorId || null,
      onRoad: !!onRoad,
    });
  }
  let _billboardStrideAcc = 0;
  ZS._gfxRuntime = {
    renderer,
    camera,
    scene,
    onProfile(p) {
      MAX_ACTIVE_LIGHTS = p.maxLights ?? MAX_ACTIVE_LIGHTS;
      _SHADOW_INTERVAL = p.shadowInterval ?? _SHADOW_INTERVAL;
      _LIGHT_CULL_EVERY = p.lightCullEvery ?? _LIGHT_CULL_EVERY;
      _BIOME_STRIDE = p.biomeStride ?? 1;
      _BILLBOARD_STRIDE = p.billboardStride ?? 1;
    },
  };
  ZS.Options?.applyRuntime?.(ZS._gfxRuntime);
  let _bbCamX = NaN, _bbCamZ = NaN;
  let _lightCullCamX = NaN, _lightCullCamZ = NaN;
  let _lightCullTick = 0;
  const _lp = new THREE.Vector3();
  function _cullLights() {
    for (let i = 0; i < _playerTorchLights.length; i++) _playerTorchLights[i].visible = true;
    const n = _worldLights.length;
    if (n <= MAX_ACTIVE_LIGHTS) {
      for (const l of _worldLights) l.visible = true;
      return;
    }
    const cx = _cameraWorldPos();
    const camMoved = Math.hypot(cx.x - _lightCullCamX, cx.z - _lightCullCamZ) > 4;
    if (!camMoved && ++_lightCullTick < _LIGHT_CULL_EVERY) return;
    _lightCullTick = 0;
    _lightCullCamX = cx.x;
    _lightCullCamZ = cx.z;
    const k = MAX_ACTIVE_LIGHTS;
    const nearest = [];
    for (const l of _worldLights) {
      l.getWorldPosition(_lp);
      const d = _lp.distanceToSquared(cx);
      l.userData._d = d;
      let ins = nearest.length;
      for (let i = 0; i < nearest.length; i++) {
        if (d < nearest[i].userData._d) { ins = i; break; }
      }
      if (nearest.length < k) {
        nearest.splice(ins, 0, l);
      } else if (ins < k) {
        nearest.splice(ins, 0, l);
        nearest.length = k;
      }
    }
    const nearSet = new Set(nearest);
    for (const l of _worldLights) l.visible = nearSet.has(l);
  }

  let _shadowTick = 0;
  let _roadsRenderSkip = 0;
