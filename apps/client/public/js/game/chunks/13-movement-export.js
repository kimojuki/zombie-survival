// Mouvement FPS + export ZS.Game — extrait de game.js (async IIFE)
  // ── Movement ──────────────────────────────────────────────────────────────
  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up    = new THREE.Vector3(0, 1, 0);

  const PLAYER_R  = 0.45;
  const GRAVITY   = 22;
  const JUMP_V    = 8;
  const WALK_SPEED = 5;
  const SPRINT_MULT = 1.62;
  const PS = () => ZS.PlayerStance || { EYE_STAND: 1.7, EYE_CROUCH: 1.05, CROUCH_SPEED_MULT: 0.52, eyeHeight: (t) => 1.7, isCrouched: () => false };

  function _playerEyeH(p) {
    return PS().eyeHeight(p._crouchT ?? 0);
  }

  function updateMovement(dt) {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (ZS.AdminFly?.applyMovement?.(dt, state, camera)) {
      const p = state.player;
      const eyeH = PS().EYE_STAND;
      localAvatar.position.set(p.x, p.y - eyeH, p.z);
      localAvatar.rotation.y = state.camera.yaw;
      camera.position.set(p.x, p.y, p.z);
      camera.rotation.y = state.camera.yaw;
      camera.rotation.x = state.camera.pitch;
      p.rotY = state.camera.yaw;
      ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
      return;
    }
    const keys  = state.keys;

    if (ZS.BedSleep?.isActive?.()) {
      state.input.moveX = 0;
      state.input.moveZ = 0;
      state.input.sprintHeld = false;
      return;
    }

    let mx = state.input.moveX;
    let mz = state.input.moveZ;

    if (keys['KeyW'] || keys['ArrowUp'])    mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const benchMove = window.__zsBenchMove;
    if (benchMove && typeof benchMove === 'object') {
      if (benchMove.worldDir && typeof benchMove.worldDir === 'object') {
        mx = benchMove.worldDir.x ?? 0;
        mz = benchMove.worldDir.z ?? 0;
      } else {
        if (Number.isFinite(benchMove.mx)) mx = benchMove.mx;
        if (Number.isFinite(benchMove.mz)) mz = benchMove.mz;
      }
    }

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const moving = len > 0.08;

    const p = state.player;
    const wantsCrouch = !!state.input.crouchToggle;
    const canCrouch = !_inWater && p.onGround;
    const crouchTarget = wantsCrouch && canCrouch ? 1 : 0;
    if (!Number.isFinite(p._crouchT)) p._crouchT = 0;
    if (!p.onGround && !wantsCrouch) p._crouchT = Math.max(0, p._crouchT - dt * 10);
    else p._crouchT += (crouchTarget - p._crouchT) * Math.min(1, dt * 14);
    const eyeH = _playerEyeH(p);
    p.crouching = PS().isCrouched(p._crouchT);

    const sprintKey = keys['ShiftLeft'] || keys['ShiftRight'];
    const wantsSprint = (sprintKey || state.input.sprintHeld) && moving && !p.crouching;
    const canSprint = !_inWater && ZS.Survival?.canSprint?.();
    const sprinting = wantsSprint && canSprint;
    state.player.sprinting = sprinting;
    const baseSpeed = _inWater ? 2.8 : WALK_SPEED;
    let speedMult = sprinting ? SPRINT_MULT : 1;
    if (benchMove?.sprint && moving) speedMult = Math.max(speedMult, SPRINT_MULT);
    if (p.crouching) speedMult *= PS().CROUCH_SPEED_MULT;
    const SPEED = baseSpeed * speedMult;
    state.player.isMoving = moving;
    state.player.moveSpeed = len * SPEED;
    ZS.Survival?.tickEndurance?.(dt, { sprinting, moving });

    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    // Horizontal movement
    let newX;
    let newZ;
    if (benchMove?.worldDir && typeof benchMove.worldDir === 'object') {
      const wx = benchMove.worldDir.x ?? 0;
      const wz = benchMove.worldDir.z ?? 0;
      const wlen = Math.hypot(wx, wz) || 1;
      newX = p.x + (wx / wlen) * SPEED * dt;
      newZ = p.z + (wz / wlen) * SPEED * dt;
    } else {
      newX = p.x + (_fwd.x * (-mz) + _right.x * mx) * SPEED * dt;
      newZ = p.z + (_fwd.z * (-mz) + _right.z * mx) * SPEED * dt;
    }

    if (ZS.SectorBounds?.clamp) {
      const bc = ZS.SectorBounds.clamp(newX, newZ);
      if (Math.abs(bc.x - newX) > 0.04 || Math.abs(bc.z - newZ) > 0.04) {
        ZS.SectorBounds.onBlocked?.();
      }
      newX = bc.x;
      newZ = bc.z;
    } else {
      newX = Math.max(-295, Math.min(295, newX));
      newZ = Math.max(-295, Math.min(295, newZ));
    }

    // Collision avec arbres, rochers, murs — respecte la hauteur pour sauter par-dessus
    const benchNoclip = !!(benchMove && benchMove.noclip);
    const feetY = p.y - eyeH;
    const playerR = p.crouching ? PLAYER_R * 0.88 : PLAYER_R;
    if (!benchNoclip) {
    const colliders = ZS.getCollidersNear?.(newX, newZ, 30) || ZS.getColliders();

    for (const col of colliders) {
      if (col.type === 'seg') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        const resolved = ZS.resolveDecorSegmentCollision?.(col, newX, newZ, feetY, playerR);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else if (col.type === 'box') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        const resolved = ZS.resolveDecorBoxCollision?.(col, newX, newZ, feetY, playerR);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        // Cylindrique (arbres, rochers) — sautable si topY défini
        if (col.topY !== undefined && feetY >= col.topY - 0.05) continue;
        const dx   = newX - col.x;
        const dz   = newZ - col.z;
        const dist = Math.hypot(dx, dz);
        const min  = playerR + col.r;
        if (dist < min && dist > 0.001) {
          const scale = min / dist;
          newX = col.x + dx * scale;
          newZ = col.z + dz * scale;
        }
      }
    }

    if (ZS.Zombies.resolvePlayerCollision) {
      const out = ZS.Zombies.resolvePlayerCollision(newX, newZ, PLAYER_R);
      newX = out.x;
      newZ = out.z;
    }
    if (ZS.Network.resolveRemotePlayerCollision) {
      const out = ZS.Network.resolveRemotePlayerCollision(newX, newZ, PLAYER_R);
      newX = out.x;
      newZ = out.z;
    }
    }

    p.x = newX;
    p.z = newZ;

    const waterY   = ZS.getWaterSurface(p.x, p.z);
    const inRiver  = waterY !== null;
    const groundY  = (ZS.getStandHeight?.(p.x, p.z, p.y) ?? ZS.getEffectiveFloorHeight(p.x, p.z, p.y)) + eyeH;
    const swimEyeY = inRiver ? waterY - 0.10 : null;
    const minEyeY  = inRiver ? waterY - 0.40 : null;
    const submerged = inRiver && feetY < waterY - 0.06;

    // Saut / nage vers la surface
    const jumpReq = keys['Space'] || state.jumpPressed;
    if (jumpReq) {
      if (inRiver && (submerged || p.y < waterY + 0.2)) {
        p.velocityY = Math.max(p.velocityY, 5.8);
        p.onGround = false;
      } else if (p.onGround) {
        p.velocityY = JUMP_V;
        p.onGround = false;
      }
      state.jumpPressed = false;
    } else {
      state.jumpPressed = false;
    }

    // Physique verticale
    if (inRiver && (submerged || p.y < waterY + 0.18)) {
      // Dans la colonne d'eau — flottabilité, pas de chute sous la surface
      p.onGround = false;
      p.velocityY -= GRAVITY * 0.12 * dt;
      p.velocityY += (swimEyeY - p.y) * 3.5 * dt;
      p.y += p.velocityY * dt;

      if (p.y < minEyeY) {
        p.y = minEyeY;
        p.velocityY = Math.max(p.velocityY, 3.0);
      }
      if (p.y > waterY + 0.12) {
        p.y = waterY + 0.12;
        p.velocityY = 0;
      }
      // Wade : le fond est assez haut pour marcher
      if (groundY >= waterY - 0.18 && p.y <= groundY + 0.08 && p.velocityY <= 0) {
        p.y = groundY;
        p.velocityY = 0;
        p.onGround = true;
      }
    } else if (!p.onGround) {
      p.velocityY -= GRAVITY * dt;
      p.y += p.velocityY * dt;
      if (p.y <= groundY) {
        p.y = groundY;
        p.velocityY = 0;
        p.onGround = true;
      }
    } else {
      if (groundY < p.y - 0.4) {
        p.onGround = false;
        p.velocityY = 0;
      } else {
        p.y = groundY;
      }
    }

    // Filet de sécurité — impossible de rester sous le plan d'eau
    if (inRiver && p.y < minEyeY) {
      p.y = minEyeY;
      p.velocityY = Math.max(p.velocityY, 3.5);
      p.onGround = false;
    }

    const bobAmp = (ZS.Options?.isFeature?.('headBob') !== false && moving && p.onGround && !_inWater && !p.crouching)
      ? 0.016 * Math.min(1, (p.moveSpeed || 0) / 5) * (sprinting ? 1.15 : 1)
      : 0;
    if (bobAmp > 0) _walkBobPhase += dt * (sprinting ? 11 : 9);
    const headBob = bobAmp > 0 ? Math.sin(_walkBobPhase) * bobAmp : 0;

    const targetFov = (sprinting && ZS.Options?.isFeature?.('sprintFov') !== false) ? 81 : 75;
    _camFov += (targetFov - _camFov) * Math.min(1, dt * 9);
    if (Math.abs(camera.fov - _camFov) > 0.05) {
      camera.fov = _camFov;
      camera.updateProjectionMatrix();
    }

    localAvatar.position.set(p.x, p.y - eyeH, p.z);
    localAvatar.rotation.y = state.camera.yaw;
    camera.position.set(p.x, p.y + headBob, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
  // ── Items de test — un exemplaire de chaque item ─────────────────────────
  function _addTestItems() {
    // Inventaire de départ vide — les joueurs ne commencent avec rien.
  }

  ZS.Game = { tryInstallDoorLock };
