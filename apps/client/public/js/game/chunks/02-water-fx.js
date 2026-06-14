// Effets eau / pas / zone plage — extrait de game.js (async IIFE)
function _updateWaterEffect(px, pz, py) {
    const waterY = ZS.getWaterSurface(px, pz);
    const feetY = (py || 0) - 1.7;
    const nowIn  = waterY !== null && waterY > feetY - 0.05;
    const depth = nowIn ? Math.max(0, waterY - feetY) : 0;
    _waterDepth = depth;

    const opacity = nowIn ? Math.min(0.68, 0.1 + depth * 0.52) : 0;
    _waterOverlay.style.opacity = String(opacity);
    // Pas de filter:blur — coûteux sur GPU mobile/tablette.
    _waterOverlay.style.filter = '';

    ZS.Audio?.setWaterDepth?.(depth, nowIn);

    if (nowIn !== _inWater) {
      if (nowIn) ZS.Audio?.splash?.(Math.min(1, depth * 1.4 + 0.32));
      _inWater = nowIn;
      state.player.inWater = nowIn;
      ZS.Survival?.setWaterContact?.(nowIn);
    }
  }

  function _tickFootsteps(dt) {
    if (ZS.Options?.isFeature?.('footsteps') === false) return;
    const p = state.player;
    if (!p.onGround || p.dead) return;
    const speed = p.moveSpeed || 0;
    if (speed < 0.4) { _footstepAcc = 0; return; }
    if (_inWater && _waterDepth > 0.38) return;

    _footstepAcc += dt;
    const interval = p.sprinting ? 0.28 : 0.41;
    if (_footstepAcc < interval) return;
    _footstepAcc = 0;

    const feetY = p.y - 1.7;
    let surface = ZS.Audio?.footstepSurface?.(p.x, p.z, feetY) || 'dirt';
    if (_inWater && _waterDepth > 0.02) surface = 'water';
    const stepVol = p.sprinting ? 0.72 : 0.56;
    ZS.Audio?.footstep?.(surface, stepVol);
    ZS.Network?.sendFootstep?.(surface, p.sprinting);
  }

  let _onSafeSand = null;
  function _updateBeachZoneUi(px, pz) {
    const safe = !!(ZS.isOnBeachSafeSand?.(px, pz));
    if (safe === _onSafeSand) return;
    _onSafeSand = safe;
    ZS.UI?.setZoneSafe?.(safe);
  }
