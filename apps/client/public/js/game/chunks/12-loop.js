// Boucle principale RAF — extrait de game.js (async IIFE)
  let _sceneRendered = false;

  function loop(timestamp) {
    requestAnimationFrame(loop);
    const rawDt = (timestamp - state.lastTime) / 1000;
    const spawnReady = ZS.Network?.isSpawnReady?.();
    if (!spawnReady) {
      ZS._frameId = (ZS._frameId | 0) + 1;
      state.lastTime = timestamp;
      if (_sceneRendered) renderer.render(scene, camera);
      return;
    }
    const _frameT0 = performance.now();
    let _sectT = _frameT0;
    const _sect = {};
    const _markSect = (k) => {
      _sect[k] = (_sect[k] || 0) + (performance.now() - _sectT);
      _sectT = performance.now();
    };
    ZS._frameId = (ZS._frameId | 0) + 1;
    if (_bootRenderWarmup > 0) {
      _bootRenderWarmup--;
      if (_bootRenderWarmup === 0) {
        _adaptivePrCap = null;
        _adaptivePrUntil = 0;
        _adaptivePrRestoreAfter = 0;
        _resizeToViewport(true);
      }
    }
    const dt = window.__zsBenchMove
      ? Math.min(Math.max(rawDt, 0.001), 1)
      : Math.min(rawDt, 0.05);
    state.lastTime = timestamp;

    if (!state.player.dead && !ZS.Loading?.isActive?.() && ZS.Network?.isSpawnReady?.()
        && !ZS.SpawnIntro?.isActive?.()) {
      updateMovement(dt);
      _updateWaterEffect(state.player.x, state.player.z, state.player.y);
      _updateBeachZoneUi(state.player.x, state.player.z);
      _biomeStrideAcc++;
      const biomeStride = ZS.isFrameRecovering?.()
        ? _BIOME_STRIDE * 2
        : _BIOME_STRIDE;
      if (_biomeStrideAcc >= biomeStride) {
        _biomeStrideAcc = 0;
        ZS.Audio?.updateBiomeAmbient?.(state.player.x, state.player.z, dt * biomeStride);
      }
      _tickFootsteps(dt);
      const activeType = ZS.Inventory?.getActiveItem?.()?.type;
      ZS.Audio?.tickHeldTorch?.(dt, activeType, {
        dead: false,
        inWater: _inWater && _waterDepth > 0.25,
      });
    } else {
      ZS.Audio?.tickHeldTorch?.(dt, null, { dead: !!state.player.dead });
      if (_onSafeSand !== null) {
        _onSafeSand = null;
        ZS.UI?.setZoneSafe?.(null);
      }
    }
    ZS.SpawnIntro?.tick?.(dt);
    ZS.Scenario?.tick?.(dt);
    if (!state.player.dead && !ZS.Loading?.isActive?.()) {
      if (!ZS.isFrameRecovering?.()) {
        ZS.BeachAmbientLife?.tick?.(dt, state.player.x, state.player.z);
      }
      _beachLifeStrideAcc++;
      if (_beachLifeStrideAcc >= _BIOME_STRIDE) {
        _beachLifeStrideAcc = 0;
        if (!ZS.isFrameRecovering?.()) {
          ZS.Audio?.tickBeachLife?.(state.player.x, state.player.z, dt * _BIOME_STRIDE);
        }
      }
    }
    ZS.AdminLiveDecor?.tick?.();
    ZS.AdminLiveRoads?.tick?.();
    const _tunerWalk = ZS.ArmTuner?.allowsWalkPreview?.();
    if (!ZS._armTunerActive || _tunerWalk) {
      ZS.tickFPSArms(fpsArms, dt, {
        moving: _tunerWalk ? !!ZS.ArmTuner.walkPreviewOn : !!state.player.isMoving,
        speed: _tunerWalk ? (ZS.ArmTuner.walkPreviewOn ? 4.5 : 0) : (state.player.moveSpeed || 0),
      });
    }
    if (!ZS._armTunerActive) {
      ZS.tickArmAnim(fpsArms, dt);
    }
    ZS.tickTorchFx?.(dt, {
      moving: !!state.player.isMoving,
      speed: state.player.moveSpeed || 0,
      extinguished: _inWater && _waterDepth > 0.25,
    });
    ZS.setShadowCenter(state.player.x, state.player.z);
    ZS.tickDayNight(dt);
    if (!ZS.isFrameRecovering?.()) {
      if (ZS.hasActiveTreeAnims?.()) ZS.tickTreeFalls?.(dt);
      if (ZS.hasActiveRockMines?.()) ZS.tickRockMines?.(dt);
    }
    ZS.tickDecorDoors?.(dt);
    const camPos = _cameraWorldPos();
    const camX = camPos.x, camZ = camPos.z;
    _billboardStrideAcc++;
    if (_billboardStrideAcc >= _BILLBOARD_STRIDE
        && Math.hypot(camX - _bbCamX, camZ - _bbCamZ) > 0.2
        && !ZS.Network?.isInitVisRevealBusy?.()
        && !ZS.isFrameRecovering?.()) {
      _billboardStrideAcc = 0;
      _bbCamX = camX; _bbCamZ = camZ;
      if (ZS.updateBillboards) ZS.updateBillboards(camX, camZ);
    }
    if ((!ZS._roadsPostSpawnBusy || (_roadsRenderSkip % 4 === 0))
        && !ZS.Network?.isInitVisRevealBusy?.()
        && !ZS.Network?.isSectorLoadBusy?.()
        && _bootRenderWarmup <= 4) {
      const fpsStats = ZS.PerfMonitor?.getStats?.();
      const fps = fpsStats?.fps;
      if ((fps == null || fps >= 12)
          && (fpsStats?.frameMsP95 == null || fpsStats.frameMsP95 <= 90)) {
        const streamer = ZS.Engine?.ChunkStreamer;
        const reenter = streamer?.hasHiddenNear?.(camX, camZ);
        const src = ZS.Engine?.ContentLoader?.getStreamingSource?.();
        const moving = src && ((src.vx ?? 0) ** 2 + (src.vz ?? 0) ** 2 > 1.44);
        const forceVis = reenter || moving;
        streamer?.tick?.(camX, camZ, forceVis ? 6 : 2, { force: forceVis });
        ZS.updateForestDecorVisibility?.(camX, camZ);
      }
    }
    _tickS01DevLog(state.player.x, state.player.z);
    if (!ZS.Network?.isInitVisRevealBusy?.()) {
      if (!ZS.isFrameRecovering?.() || (++_zombieRecoverSkip % 2 === 0)) {
        ZS.Zombies.tick(dt);
      }
    }
    _markSect('preNet');
    (ZS.Network?.tick || ZS.networkTick)?.(dt);
    _markSect('network');
    ZS.Inventory.tick(dt);
    if (!ZS.isFrameRecovering?.()) ZS.Craft.tick(dt);
    ZS.Survival.tick(dt);
    if (!ZS.Network?.isSectorLoadBusy?.() && !ZS.isFrameRecovering?.()) {
      ZS.Map?.tick?.(dt);
    }
    _markSect('systems');
    _updateInteractHold(dt);
    _updateDoorInteractUi();
    _cullLights();

    if (!ZS.Network?.isInitVisRevealBusy?.() && !ZS.isFrameRecovering?.()) {
      const fpsStats = ZS.PerfMonitor?.getStats?.();
      const sectorBusy = ZS.Network?.isSectorLoadBusy?.();
      const shadowEvery = (fpsStats?.fps != null && fpsStats.fps < 14) || sectorBusy
        ? Math.round(_SHADOW_INTERVAL * 2.2)
        : _SHADOW_INTERVAL;
      if (++_shadowTick >= shadowEvery) { _shadowTick = 0; renderer.shadowMap.needsUpdate = true; }
    }

    ZS.BuildingDebug?.tick?.();
    _roadsRenderSkip = 0;
    renderer.render(scene, camera);
    _sceneRendered = true;
    _markSect('render');
    ZS.PerfMonitor?.tickFrame?.();

    const frameMs = performance.now() - _frameT0;
    ZS.LoadLog?.tickPerfSample?.(frameMs, _sect);
    if (frameMs >= 68) {
      const initVisBusy = ZS.Network?.isInitVisRevealBusy?.();
      const recoverMs = initVisBusy
        ? Math.min(360, Math.max(120, Math.round(frameMs * 0.5)))
        : Math.min(280, Math.max(80, Math.round(frameMs * 0.42)));
      _frameRecoverUntil = performance.now() + recoverMs;
      if (frameMs >= 110 && ZS.LoadLog?.isEnabled?.()) {
        ZS.LoadLog.post('frame-recover', {
          ms: Math.round(frameMs),
          recoverMs,
          render: Math.round(_sect.render || 0),
          network: Math.round(_sect.network || 0),
        });
      }
    }
    _tickAdaptivePixelRatio(frameMs);
    if (ZS.LoadLog?.isEnabled?.() && frameMs >= 80) {
      ZS.LoadLog.slowFrame(frameMs, {
        preNet: Math.round(_sect.preNet || 0),
        network: Math.round(_sect.network || 0),
        systems: Math.round(_sect.systems || 0),
        render: Math.round(_sect.render || 0),
      });
    }
  }

  requestAnimationFrame((t) => {
    state.lastTime = t;
    const camPos = _cameraWorldPos();
    if (ZS.updateBillboards) ZS.updateBillboards(camPos.x, camPos.z);
    _bbCamX = camPos.x;
    _bbCamZ = camPos.z;
    requestAnimationFrame(loop);
  });
