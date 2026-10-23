// tick, emit, joueurs distants — extrait de network.js (IIFE)
function getLocalXZ() {
    return { x: _state?.player?.x ?? 0, z: _state?.player?.z ?? 0 };
  }

  const REMOTE_ANIM_R2 = 72 * 72;

  let _netTickSlowAcc = 0;
  let _prevStreamX = NaN;
  let _prevStreamZ = NaN;

  // Called every frame from game loop — smooth movement + walk animation
  function tick(dt) {
    const t0 = performance.now();
    const lp = getLocalXZ();
    let vx = 0;
    let vz = 0;
    if (Number.isFinite(_prevStreamX) && dt > 0.001) {
      vx = (lp.x - _prevStreamX) / dt;
      vz = (lp.z - _prevStreamZ) / dt;
    }
    _prevStreamX = lp.x;
    _prevStreamZ = lp.z;
    ZS.Engine?.ContentLoader?.setStreamingSource?.(lp.x, lp.z, { vx, vz });
    ZS.Engine?.ChunkStreamer?.setStreamingSource?.(lp.x, lp.z);
    _updateExplorationBoost(lp.x, lp.z);
    _updateApproachPrefetch(lp.x, lp.z, vx, vz);
    _updateCriticalSurge(lp.x, lp.z, vx, vz);
    _updateLodTextureSurge(lp.x, lp.z);
    const gov = ZS.Engine?.BudgetGovernor;
    const criticalSurge = _criticalSurgeActive?.() ?? false;
    const lodTextureSurge = _lodTextureSurgeActive?.() ?? false;
    let decorBudget = gov?.getDecorBudget?.({
      isMobile: ZS._isMobile,
      frameRecovering: ZS.isFrameRecovering?.(),
      postSpawnVisualBusy: _postSpawnVisualBusy?.(),
      initVisActive: _initVisRevealBusy?.(),
      fps: ZS.PerfMonitor?.getStats?.()?.fps,
      bootWarmup: ZS.getBootRenderWarmup?.() ?? 0,
      criticalSurge,
      lodTextureSurge,
      decorGapActive: !!ZS.Engine?.DecorGapMonitor?.hasActiveGap?.(),
      lodGapActive: !!ZS.Engine?.LodGapMonitor?.hasActiveGap?.(),
      decorGapEmergency: !!ZS.Engine?.DecorGapMonitor?.hasEmergencyGap?.(),
    }) ?? _decorTickBudgetMs();
    const plan = _buildBacklogPlan(lp.x, lp.z);
    _tickDecorStreamFetch(lp.x, lp.z, dt, vx, vz);
    _maybePeriodicDeferPrune(lp.x, lp.z, dt);
    const gapSample = _sampleDecorGap(lp.x, lp.z);
    ZS.Engine?.DecorGapMonitor?.tick?.(dt, {
      px: lp.x,
      pz: lp.z,
      vx,
      vz,
      ...gapSample,
      initVisActive: _initVisRevealBusy?.(),
      postSpawnBusy: _postSpawnVisualBusy?.(),
      approachPrefetch: _approachPrefetchActive?.() ?? false,
      explorationBoost: _explorationBoostActive?.() ?? false,
      criticalSurge: _criticalSurgeActive?.() ?? false,
      forestHiddenNear: !!ZS.Engine?.ChunkStreamer?.hasHiddenNear?.(lp.x, lp.z),
      streamGate: _streamGate?.reason || null,
    });
    const lodSample = _sampleLodGap(lp.x, lp.z);
    ZS.Engine?.LodGapMonitor?.tick?.(dt, {
      px: lp.x,
      pz: lp.z,
      vx,
      vz,
      ...lodSample,
      initVisActive: _initVisRevealBusy?.(),
      postSpawnBusy: _postSpawnVisualBusy?.(),
    });
    if (decorBudget > 0) {
      const runLod = () => { if (performance.now() - t0 < decorBudget) _tickLodUpgrades(lp.x, lp.z); };
      const runDefer = () => { _tickDecorSpawnDefer(lp.x, lp.z, decorBudget - (performance.now() - t0)); };
      const runVis = () => { if (performance.now() - t0 < decorBudget) _tickDecorVisibility(lp.x, lp.z); };
      const runLoaders = () => {
        if (performance.now() - t0 < decorBudget) _tickDeferredTreeLoader();
        if (performance.now() - t0 < decorBudget) _tickDeferredPropLoader();
      };
      const frameRunner = ZS.Engine?.FrameRunner;
      if (frameRunner?.runDecorWorkers) {
        frameRunner.runDecorWorkers({
          budgetMs: decorBudget,
          t0,
          plan,
          workers: { lod: runLod, defer: runDefer, vis: runVis, loaders: runLoaders },
        });
      } else {
        const deferN = plan?.pressure.defer ?? _decorSpawnDefer.pending.length;
        const priority = plan?.priority ?? 'balanced';
        if (priority === 'lod') {
          runLod();
          if (deferN > 120 && performance.now() - t0 < decorBudget) runDefer();
          if (performance.now() - t0 < decorBudget) runVis();
          if (performance.now() - t0 < decorBudget) runLoaders();
        } else if (priority === 'defer') {
          runDefer();
          if (performance.now() - t0 < decorBudget) runVis();
          if (performance.now() - t0 < decorBudget) runLoaders();
        } else {
          const phase = (_netTickSlowAcc++ % 3);
          if (phase === 0) { runLod(); runDefer(); runVis(); runLoaders(); }
          else if (phase === 1) { runDefer(); runLod(); runVis(); runLoaders(); }
          else { runVis(); runLod(); runDefer(); runLoaders(); }
        }
      }
    }
    _tickFarColliderDefer(dt);
    const tAfterDecor = performance.now();
    const cam = ZS._camera;
    if (cam) _tickNameTagOcclusion(cam.position.x, cam.position.z, cam.position.y);

    const LERP = 12;
    const skipRemoteAnim = ZS.isFrameRecovering?.();
    remotePlayers.forEach((rp) => {
      const mesh = rp.mesh;

      // Interpolate position
      mesh.position.x += (rp.targetX - mesh.position.x) * Math.min(1, LERP * dt);
      mesh.position.y += (rp.targetY - mesh.position.y) * Math.min(1, LERP * dt);
      mesh.position.z += (rp.targetZ - mesh.position.z) * Math.min(1, LERP * dt);

      const crouchScale = ZS.PlayerStance?.CROUCH_MESH_SCALE ?? 0.72;
      const targetScaleY = rp.crouching ? crouchScale : 1;
      mesh.scale.y += (targetScaleY - mesh.scale.y) * Math.min(1, LERP * dt);

      // Interpolate rotation (shortest arc)
      let rotDiff = rp.targetRotY - mesh.rotation.y;
      while (rotDiff >  Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      mesh.rotation.y += rotDiff * Math.min(1, LERP * dt);

      const dist2 = (mesh.position.x - lp.x) ** 2 + (mesh.position.z - lp.z) ** 2;
      mesh.visible = dist2 <= 110 * 110;

      // Walk animation
      const limbs = mesh.userData.limbs;
      if (!limbs) return;
      if (skipRemoteAnim && dist2 > REMOTE_ANIM_R2 * 0.36) return;
      if (dist2 > REMOTE_ANIM_R2) {
        rp.moveSpeed *= 0.85;
        return;
      }

      const speed = rp.moveSpeed || 0;
      const grip  = mesh.userData.grip || ZS.getGrip(rp.equipped);
      const rem   = grip.remote;
      const twoH  = grip.twoHanded && rem;
      if (twoH) {
        // Tenue à deux mains (armes à feu, barre, lance…) — params depuis GRIPS
        limbs.rArm.rotation.set(rem.rArmRot[0], rem.rArmRot[1], rem.rArmRot[2]);
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) hh.quaternion.copy(limbs.rArm.quaternion).invert();
        const hOff = rem.handHolder || [0, -0.72, -0.12];
        const rHand = _rHandVec.set(hOff[0], hOff[1], hOff[2])
          .applyQuaternion(limbs.rArm.quaternion)
          .add(limbs.rArm.position);
        if (rem.lArmMode === 'aimAtHand') {
          const dir = _rHandVec.copy(rHand).sub(limbs.lArm.position).normalize();
          limbs.lArm.quaternion.setFromUnitVectors(_DOWN, dir);
        }
        if (speed > 0.3) {
          rp.animTime += dt * Math.max(4, speed * 1.2);
          const swing = Math.sin(rp.animTime) * 0.65;
          limbs.lLeg.rotation.x =  swing;
          limbs.rLeg.rotation.x = -swing;
        } else {
          limbs.lLeg.rotation.x *= 0.8;
          limbs.rLeg.rotation.x *= 0.8;
          if (Math.abs(limbs.lLeg.rotation.x) < 0.001) {
            limbs.lLeg.rotation.x = limbs.rLeg.rotation.x = 0;
            rp.animTime = 0;
          }
        }
      } else if (speed > 0.3) {
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) { hh.rotation.set(0, 0, 0); hh.quaternion.set(0, 0, 0, 1); }
        limbs.lArm.quaternion.set(0, 0, 0, 1);
        limbs.lArm.rotation.y = limbs.lArm.rotation.z = 0;
        limbs.rArm.rotation.y = limbs.rArm.rotation.z = 0;
        rp.animTime += dt * Math.max(4, speed * 1.2);
        const swing = Math.sin(rp.animTime) * 0.65;
        limbs.lArm.rotation.x = -swing;
        limbs.rArm.rotation.x =  swing;
        limbs.lLeg.rotation.x =  swing;
        limbs.rLeg.rotation.x = -swing;
      } else {
        // Return limbs to neutral
        if (!rp._handHolder) rp._handHolder = limbs.rArm.getObjectByName('handHolder');
        const hh = rp._handHolder;
        if (hh) { hh.rotation.set(0, 0, 0); hh.quaternion.set(0, 0, 0, 1); }
        limbs.lArm.quaternion.set(0, 0, 0, 1);
        limbs.lArm.rotation.y = limbs.lArm.rotation.z = 0;
        limbs.rArm.rotation.y = limbs.rArm.rotation.z = 0;
        limbs.lArm.rotation.x *= 0.8;
        limbs.rArm.rotation.x *= 0.8;
        limbs.lLeg.rotation.x *= 0.8;
        limbs.rLeg.rotation.x *= 0.8;
        if (Math.abs(limbs.lArm.rotation.x) < 0.001) {
          limbs.lArm.rotation.x = limbs.rArm.rotation.x = 0;
          limbs.lLeg.rotation.x = limbs.rLeg.rotation.x = 0;
          rp.animTime = 0;
        }
      }
      rp.moveSpeed *= 0.85;

      // Geste d'attaque — surcharge le bras droit (porte l'item) le temps de l'anim
      if (rp.attack) {
        rp.attack.t += dt;
        const e = rp.attack.t / rp.attack.dur;
        if (e >= 1) {
          rp.attack = null;
        } else {
          const s = Math.sin(e * Math.PI);
          const atkGrip = mesh.userData.grip || ZS.getGrip(rp.equipped);
          if (rp.attack.kind === 'recoil') {
            const base = atkGrip.remote?.rArmRot?.[0] ?? (atkGrip.twoHanded ? 0.85 : 0.25);
            const a = atkGrip.anim.recoil;
            limbs.rArm.rotation.x = base + s * ((a.rArmX || 0.08) * 2.5);
          } else {
            const a = atkGrip.anim.melee;
            if (a.style === 'rock_slam' && atkGrip.twoHanded) {
              const base = atkGrip.remote?.rArmRot?.[0] ?? 0.58;
              const windEnd = 0.20;
              let ext = 0;
              if (e <= windEnd) {
                ext = Math.sin((e / windEnd) * Math.PI * 0.5) * 0.18;
              } else {
                const t = (e - windEnd) / (1 - windEnd);
                ext = -Math.sin(t * Math.PI) * 0.95;
              }
              limbs.rArm.rotation.x = base + ext;
              limbs.lArm.rotation.x = base + ext * 0.94;
            } else if (a.style === 'thrust_forward' && atkGrip.twoHanded) {
              const base = atkGrip.remote?.rArmRot?.[0] ?? 0.58;
              const ext = s * ((a.rArmX || 0.10) * 1.5);
              limbs.rArm.rotation.x = base + ext;
              limbs.lArm.rotation.x = base + ext * 0.92;
            } else {
              limbs.rArm.rotation.x = s * ((a.swingX || 0.95) * 1.75);
            }
          }
        }
      }
    });
    const decorMs = tAfterDecor - t0;
    const totalMs = performance.now() - t0;
    if (totalMs >= 20 && ZS.LoadLog?.isEnabled?.()) {
      _netTickSlowAcc++;
      if (_netTickSlowAcc % 20 === 1) {
        ZS.LoadLog.post('network-tick-slow', {
          totalMs: Math.round(totalMs),
          decorMs: Math.round(decorMs),
          remoteMs: Math.round(totalMs - decorMs),
          decorBudget,
          pendingDecor: _decorSpawnDefer.pending.length,
          lodPending: _lodPendingCount(),
          treeQueue: _treeDefer.queue.length,
          streamGate: _streamGate.reason || null,
          treeGate: _treeFetchGate.reason || null,
          colliderFar: _colliderFarQueue.length,
          n: _netTickSlowAcc,
        });
      }
    }
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY, force) {
    if (!_spawnReady || !_socket) return;
    if (!force && _state?.player?.dead) return;
    const now = Date.now();
    if (!force && now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', {
      x, y, z, rotY,
      crouch: !!_state?.player?.crouching,
    });
  }

  function _syncPlayerPosToServer() {
    if (!_state?.player) return;
    const p = _state.player;
    sendMove(p.x, p.y, p.z, p.rotY ?? _state.camera?.yaw ?? 0, true);
  }

  /** Repousse le joueur local hors des autres joueurs (collision cylindrique XZ). */
  function resolveRemotePlayerCollision(px, pz, playerR) {
    let x = px;
    let z = pz;
    const minDist = playerR * 2;
    const minDist2 = minDist * minDist;
    const push = (zx, zz) => {
      const dx = x - zx;
      const dz = z - zz;
      const dist2 = dx * dx + dz * dz;
      if (dist2 >= minDist2 || dist2 <= 0.000001) return;
      const dist = Math.sqrt(dist2);
      const scale = minDist / dist;
      x = zx + dx * scale;
      z = zz + dz * scale;
    };
    remotePlayers.forEach((rp) => {
      push(rp.mesh.position.x, rp.mesh.position.z);
    });
    sleepingBodies.forEach((entry) => {
      if (entry?.mesh) push(entry.mesh.position.x, entry.mesh.position.z);
    });
    deathCorpses.forEach((entry) => {
      if (entry?.mesh) push(entry.mesh.position.x, entry.mesh.position.z);
    });
    return { x, z };
  }

  function sendShoot(ox, oz, dx, dz, weaponType) {
    if (!_spawnReady || !_socket) return;
    _socket.emit('shoot', { ox, oz, dx, dz, weaponType: weaponType || ZS.Inventory?.getActiveItem?.()?.type || '__fist__' });
  }

  // Item en main — diffusé aux autres joueurs (dédupliqué : envoi au changement).
  function sendEquip(type) {
    type = type || null;
    if (type === _lastEquip) return;
    _lastEquip = type;
    if (_socket) _socket.emit('equip', { type });
  }

  // Geste d'attaque — diffusé pour rejouer l'animation chez les autres.
  function sendAttack(kind, weapon) {
    if (!_socket) return;
    _socket.emit('attack', {
      kind: kind === 'recoil' ? 'recoil' : 'melee',
      weapon: weapon || ZS.Inventory?.getActiveItem?.()?.type || null,
    });
  }

  function sendFootstep(surface, sprint) {
    if (!_socket || !surface) return;
    _socket.emit('footstep', { surface, sprint: !!sprint });
  }

  function sendDied() {
    /* mort déclenchée par le serveur (player-death) */
  }
  function sendRespawn() {
    if (_socket) _socket.emit('respawn');
  }
  function sendSurvival() {
    /* survie authoritaire serveur */
  }

  // Volume (0–1) selon la distance à la caméra + panoramique stéréo (-1 G … +1 D)
  const AUDIO_RANGE = 60;
  const _sFwd = new THREE.Vector3(), _sRight = new THREE.Vector3(),
        _sTo = new THREE.Vector3(), _sUp = new THREE.Vector3(0, 1, 0);
  function _spatial(pos) {
    const cam = ZS._camera;
    if (!cam) return null;
    const dx = pos.x - cam.position.x, dz = pos.z - cam.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > AUDIO_RANGE) return { vol: 0, pan: 0 };
    const vol = (1 - dist / AUDIO_RANGE) ** 2;
    cam.getWorldDirection(_sFwd); _sFwd.y = 0; _sFwd.normalize();
    _sRight.crossVectors(_sFwd, _sUp).normalize();
    _sTo.set(dx, 0, dz).normalize();
    return { vol, pan: Math.max(-1, Math.min(1, _sTo.dot(_sRight))) };
  }

  function _addRemotePlayer(p) {
    const mesh = ZS.createPlayerModel();
    // p.y is eye height; place model at foot level
    const groundY = typeof ZS.getTerrainHeight === 'function'
      ? ZS.getTerrainHeight(p.x, p.z)
      : (p.y || 0) - 1.7;
    mesh.position.set(p.x, groundY, p.z);
    mesh.rotation.y = p.rotY || 0;
    mesh.userData.username = p.username;
    _scene.add(mesh);

    // Name tag sprite
    const tag = _makeNameTag(p.username);
    mesh.userData.nameTag = tag;
    mesh.add(tag);

    remotePlayers.set(p.id, {
      mesh,
      targetX:    p.x,
      targetY:    groundY,
      targetZ:    p.z,
      targetRotY: p.rotY || 0,
      moveSpeed:  0,
      animTime:   0,
      equipped:   p.equipped || null,
      attack:     null,
      crouching:  !!p.crouch,
    });

    // Item déjà tenu en main par ce joueur (rejoint déjà équipé)
    if (p.equipped) ZS.setRemoteHandItem(mesh, p.equipped);
  }

  function _groundYAt(x, z, eyeY) {
    if (ZS.getDecorGroundHeight) return ZS.getDecorGroundHeight(x, z);
    if (typeof ZS.getTerrainHeight === 'function') return ZS.getTerrainHeight(x, z);
    return (eyeY || 0) - 1.7;
  }

  function _addDeathCorpse(s) {
    const playerId = Number(s.playerId);
    if (!playerId || !_scene) return;
    _removeDeathCorpse(playerId);
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(s.x, s.z, s.y);
    mesh.position.set(s.x, groundY, s.z);
    mesh.rotation.y = s.rotY || 0;
    ZS.applySleepPose?.(mesh);
    mesh.userData.username = s.username;
    mesh.userData.deathCorpse = true;
    _scene.add(mesh);
    const tag = _makeNameTag(`☠ ${s.username || ''}`);
    tag.position.set(0, 0.55, 0);
    mesh.userData.nameTag = tag;
    mesh.add(tag);
    if (s.equipped) ZS.setRemoteHandItem(mesh, s.equipped);
    deathCorpses.set(playerId, {
      mesh,
      playerId,
      username: s.username,
      x: s.x,
      z: s.z,
    });
  }

  function _removeDeathCorpse(playerId) {
    const entry = deathCorpses.get(Number(playerId));
    if (!entry) return;
    _scene.remove(entry.mesh);
    deathCorpses.delete(Number(playerId));
  }

  function _showLocalDeathCorpse(d) {
    _hideLocalDeathCorpse();
    if (!_scene || !_state?.player) return;
    const x = d.x ?? _state.player.x;
    const z = d.z ?? _state.player.z;
    const y = d.y ?? _state.player.y;
    const rotY = d.rotY ?? _state.camera?.yaw ?? 0;
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(x, z, y);
    mesh.position.set(x, groundY, z);
    mesh.rotation.y = rotY;
    ZS.applySleepPose?.(mesh);
    mesh.userData.deathCorpse = true;
    _scene.add(mesh);
    const username = d.username || _localUsername || '';
    const tag = _makeNameTag(`☠ ${username}`);
    tag.position.set(0, 0.55, 0);
    mesh.add(tag);
    if (d.equipped) ZS.setRemoteHandItem(mesh, d.equipped);
    if (ZS._fpsArms) ZS._fpsArms.visible = false;
    _localDeathCorpse = mesh;
  }

  function _hideLocalDeathCorpse() {
    if (_localDeathCorpse && _scene) {
      _scene.remove(_localDeathCorpse);
      _localDeathCorpse = null;
    }
    if (ZS._fpsArms) ZS._fpsArms.visible = true;
  }

  function _addSleepingBody(s) {
    const playerId = Number(s.playerId);
    if (!playerId || !_scene) return;
    _removeSleepingBody(playerId);
    const mesh = ZS.createPlayerModel();
    const groundY = _groundYAt(s.x, s.z, s.y);
    mesh.position.set(s.x, groundY, s.z);
    mesh.rotation.y = s.rotY || 0;
    ZS.applySleepPose?.(mesh);
    mesh.userData.username = s.username;
    mesh.userData.sleeping = true;
    _scene.add(mesh);
    const tag = _makeNameTag(`💤 ${s.username || ''}`);
    tag.position.set(0, 0.55, 0);
    mesh.userData.nameTag = tag;
    mesh.add(tag);
    if (s.equipped) ZS.setRemoteHandItem(mesh, s.equipped);
    sleepingBodies.set(playerId, {
      mesh,
      playerId,
      username: s.username,
      x: s.x,
      z: s.z,
    });
  }

  function _removeSleepingBody(playerId) {
    const entry = sleepingBodies.get(Number(playerId));
    if (!entry) return;
    _scene.remove(entry.mesh);
    sleepingBodies.delete(Number(playerId));
  }

  function findNearestSleeping(px, pz, maxDist) {
    let best = null;
    let bestD = maxDist;
    sleepingBodies.forEach((body) => {
      const d = Math.hypot(body.x - px, body.z - pz);
      if (d < bestD) { bestD = d; best = body; }
    });
    return best;
  }

  /** Corps endormi ou mort au sol — le plus proche dans le rayon. */
  function findNearestLootable(px, pz, maxDist) {
    let best = null;
    let bestD = maxDist;
    const consider = (body) => {
      if (!body?.playerId) return;
      const d = Math.hypot(body.x - px, body.z - pz);
      if (d < bestD) { bestD = d; best = body; }
    };
    sleepingBodies.forEach(consider);
    deathCorpses.forEach(consider);
    return best;
  }

  function _makeNameTag(username) {
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((username || '').substring(0, 14), 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.userData.isNameTag = true;
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.set(0, 2.55, 0); // above head
    return sprite;
  }
