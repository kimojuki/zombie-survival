// Socket.io client — multiplayer sync
(function () {
  'use strict';

  // id -> { mesh, targetX, targetY, targetZ, targetRotY, moveSpeed, animTime }
  const remotePlayers = new Map();
  const decorItems = new Map();
  let _scene, _state, _socket;
  const _DOWN = (typeof THREE !== 'undefined') ? new THREE.Vector3(0, -1, 0) : null;

  function _connecting(show, msg, detail) {
    const screen = document.getElementById('connecting-screen');
    const m = document.getElementById('connecting-msg');
    const d = document.getElementById('connecting-detail');
    if (!screen) return;
    if (show) {
      screen.style.display = 'flex';
      if (m && msg) m.textContent = msg;
      if (d) d.textContent = detail || '';
    } else {
      screen.style.display = 'none';
    }
  }

  function _setOnlineCount(n) {
    if (typeof n === 'number' && ZS.UI?.setOnlineCount) ZS.UI.setOnlineCount(n);
  }

  function _removeDecorItem(id) {
    const entry = decorItems.get(id);
    if (!entry) return;
    if (entry.root?.parent) entry.root.parent.remove(entry.root);
    decorItems.delete(id);
    ZS.removeDecorColliders?.(id);
  }

  function _spawnDecorItem(d) {
    if (!d?.id || !_scene) return;
    _removeDecorItem(d.id);
    const commonOpts = {
      decorId: d.id,
      rotX: d.rotX || 0,
      rotY: d.rotY || 0,
      rotZ: d.rotZ || 0,
      scale: Number.isFinite(d.scale) ? d.scale : 1,
      grounded: true,
      groundLift: Number.isFinite(d.y) ? d.y : 0,
      layFlat: !!d.layFlat,
      offsetX: d.offsetX || 0,
      offsetY: d.offsetY || 0,
      offsetZ: d.offsetZ || 0,
    };
    const onRoot = (root) => {
      if (!root) return;
      root.userData.decorId = d.id;
      decorItems.set(d.id, { root, data: d });
    };
    if (d.kind === 'prefab') {
      if (!d.prefabId || !ZS.spawnDecorPrefab) return;
      onRoot(ZS.spawnDecorPrefab(_scene, d.prefabId, d.x, d.y, d.z, commonOpts));
      return;
    }
    if (!d.type || !ZS.spawnDecorItem) return;
    ZS.spawnDecorItem(_scene, d.type, d.x, d.y, d.z, commonOpts).then(onRoot);
  }

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;

    _connecting(true, 'Connexion au serveur…', 'Authentification en cours');

    socket.on('connect', () => {
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      decorItems.forEach(({ root }) => { if (root?.parent) root.parent.remove(root); });
      decorItems.clear();
      ZS.clearDecorColliders?.();
      _lastEquip = undefined;
      _setOnlineCount(0);
      _connecting(true, 'Connexion établie', 'Chargement de votre partie…');
    });

    socket.on('connect_error', (err) => {
      const msg = (err && err.message) || '';
      if (/auth/i.test(msg)) {
        ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_spawn', 'zombie_health', 'zombie_kills']
          .forEach((k) => localStorage.removeItem(k));
        window.location.href = '/';
        return;
      }
      _connecting(true, 'Serveur indisponible', msg || 'Nouvelle tentative automatique…');
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      _connecting(true, 'Connexion perdue', 'Reconnexion en cours…');
    });

    socket.on('game-init', (data) => {
      _connecting(false);
      if (data.isAdmin || data.rconEnabled) {
        localStorage.setItem('zombie_is_admin', '1');
      } else {
        localStorage.setItem('zombie_is_admin', '0');
      }
      if (data.username) localStorage.setItem('zombie_username', data.username);
      if (ZS.Chat?.setUsername) ZS.Chat.setUsername(data.username);
      if (ZS.Chat?.setSelfId) ZS.Chat.setSelfId(data.selfId);
      if (ZS.Chat?.setServerReady) ZS.Chat.setServerReady(data.features?.chat !== false);
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      state.selfId = data.selfId;
      const spawn = ZS.SpawnZone?.spawn || data.spawn || null;
      if (spawn) {
        state.player.x   = spawn.x;
        state.player.z   = spawn.z;
        state.camera.yaw = spawn.rotY || 0;
        state.player.y   = ((ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : state.player.y - 1.7))) + 1.7;
        localStorage.setItem('zombie_spawn', JSON.stringify(spawn));
      }
      if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
      if (ZS.Rcon) ZS.Rcon.init(socket, data);
      ZS.Zombies.syncAll(data.zombies);
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      for (const p of data.players) {
        if (p.id === state.selfId) continue;
        _addRemotePlayer(p);
      }
      for (const item of (data.items || [])) ZS.Inventory.spawnWorldItem(item);
      for (const decor of (data.decorItems || [])) _spawnDecorItem(decor);
      for (const st of (data.structures || [])) ZS.Inventory.spawnStructure(st);
      // Restore saved inventory (hotbar + sac + équipement). Tableau vide / absent
      // = nouveau joueur → on garde les objets de test + sac par défaut.
      if (data.inventory) ZS.Inventory.loadFromSave(data.inventory);
      if (data.survival)  ZS.Survival.loadFromSave(data.survival);
      if (typeof data.onlineCount === 'number') _setOnlineCount(data.onlineCount);
      else _setOnlineCount(remotePlayers.size + 1);
    });

    socket.on('players-online', (d) => {
      if (typeof d?.count === 'number') _setOnlineCount(d.count);
    });

    socket.on('player-join', (p) => {
      if (p.id === state.selfId) return;
      if (remotePlayers.has(p.id)) return; // guard against double-add
      _addRemotePlayer(p);
    });

    socket.on('player-move', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      // d.y is the sender's eye height (terrain + 1.7); convert to foot level
      const groundY = d.y - 1.7;
      const dx = d.x - rp.targetX;
      const dz = d.z - rp.targetZ;
      rp.moveSpeed = Math.hypot(dx, dz) * 20; // speed ~0-6 for walking
      rp.targetX    = d.x;
      rp.targetY    = groundY;
      rp.targetZ    = d.z;
      rp.targetRotY = d.rotY;
    });

    socket.on('player-leave', (id) => {
      if (id === state.selfId) return;
      const rp = remotePlayers.get(id);
      if (rp) { _scene.remove(rp.mesh); remotePlayers.delete(id); }
    });

    // Un autre joueur change/retire son item en main
    socket.on('player-equip', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      rp.equipped = d.type || null;
      ZS.setRemoteHandItem(rp.mesh, rp.equipped);
    });

    // Un autre joueur attaque (tir ou mêlée) → on rejoue le geste du bras
    socket.on('player-attack', (d) => {
      if (d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      const grip = ZS.getGrip(rp.equipped);
      const animDef = d.kind === 'recoil' ? grip.anim.recoil : grip.anim.melee;
      rp.attack = {
        t: 0,
        dur: animDef?.dur || (d.kind === 'recoil' ? 0.12 : 0.32),
        kind: d.kind,
      };
      // Tir → éclair + lumière au bout de l'arme tenue par ce joueur
      if (d.kind === 'recoil') {
        const holder = rp.mesh.userData.rig?.rightItemHolder
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('itemHolder')
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('handHolder');
        if (holder) ZS.muzzleFlash(holder);
      }
      // Son spatialisé (volume selon distance, panoramique gauche/droite)
      const sp = _spatial(rp.mesh.position);
      if (sp) {
        if (d.kind === 'recoil') ZS.Audio.gunshot(rp.equipped, sp.vol, sp.pan);
        else if (sp.vol > 0.05)  ZS.Audio.melee(sp.vol * 0.8, sp.pan);
      }
    });

    socket.on('zombie-tick',  (d) => {
      ZS.Zombies.syncAll(d.zombies);
      ZS.setWorldTime(d.time);
    });

    socket.on('world-time', (d) => {
      if (typeof d?.time === 'number') ZS.setWorldTime(d.time);
    });

    socket.on('server-flags', (d) => {
      if (ZS.Rcon) ZS.Rcon.onFlags(d);
    });

    socket.on('admin-tp', (d) => {
      if (!d) return;
      state.player.x = d.x;
      state.player.y = d.y;
      state.player.z = d.z;
      if (d.rotY != null) state.camera.yaw = d.rotY;
      state.player.velocityY = 0;
      state.player.onGround = true;
    });

    socket.on('server-announce', (d) => {
      if (!d?.message) return;
      let el = document.getElementById('server-announce');
      if (!el) {
        el = document.createElement('div');
        el.id = 'server-announce';
        document.body.appendChild(el);
      }
      const from = d.from ? `[${d.from}] ` : '';
      el.textContent = from + d.message;
      el.style.opacity = '1';
      clearTimeout(el._hideT);
      el._hideT = setTimeout(() => { el.style.opacity = '0'; }, 6000);
    });
    socket.on('zombie-spawn', (z)   => ZS.Zombies.spawn(z));
    socket.on('zombie-hit',   (d)   => ZS.Zombies.hit(d.id, d.health));
    socket.on('zombie-die',   (id)  => ZS.Zombies.die(id));

    socket.on('structure-spawn', (d) => ZS.Inventory.spawnStructure(d));
    socket.on('decor-item-spawn', (d) => _spawnDecorItem(d));
    socket.on('decor-item-remove', (id) => _removeDecorItem(id));
    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('item-add',    (d)  => ZS.Inventory.receivePickup(d.type, d.qty));
    socket.on('bag-collect', (d)  => ZS.Inventory.collectBag(d.items));

    // Respawn autoritaire : on force le spawn procédural actif si disponible.
    socket.on('respawn-at', (d) => {
      const spawn = ZS.SpawnZone?.spawn || d.spawn || null;
      if (spawn) {
        state.player.x = spawn.x;
        state.player.z = spawn.z;
        state.player.y = ((ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : 1))) + 1.7;
        state.player.velocityY = 0;
        state.player.onGround  = true;
        state.camera.yaw = spawn.rotY || 0;
      }
      // loadFromSave remplace entièrement hotbar/sac/équipement → kit de départ.
      if (d.inventory) ZS.Inventory.loadFromSave(d.inventory);
      if (d.survival)  ZS.Survival.loadFromSave(d.survival);
    });

    socket.on('take-damage', (d) => {
      const maxHp = ZS.Inventory?.getMaxHealth?.() || 100;
      let dmg;
      if (typeof d.dmg === 'number') {
        // Dégâts zombie (montant) → appliqués sur la vie client (armure incluse)
        if (state.player.dead) return;
        dmg = d.dmg;
        state.player.health = Math.max(0, state.player.health - dmg);
      } else {
        // Valeur absolue (respawn / compat)
        dmg = state.player.health - d.health;
        state.player.health = d.health;
      }
      ZS.UI.setHealth(Math.floor(state.player.health), maxHp);
      if (state.player.health <= 0 && !state.player.dead) {
        state.player.dead = true;
        sendDied();
        ZS.UI.showDeath(state.player.kills);
      } else if (state.player.health > 0 && dmg > 0) {
        ZS.UI.flashDamage();
        ZS.Survival.applyDamage(dmg);
      }
    });

    socket.on('score-update', (d) => {
      state.player.kills = d.kills;
      ZS.UI.setKills(d.kills);
    });
  }

  // Called every frame from game loop — smooth movement + walk animation
  function tick(dt) {
    const LERP = 12;
    remotePlayers.forEach((rp) => {
      const mesh = rp.mesh;

      // Interpolate position
      mesh.position.x += (rp.targetX - mesh.position.x) * Math.min(1, LERP * dt);
      mesh.position.y += (rp.targetY - mesh.position.y) * Math.min(1, LERP * dt);
      mesh.position.z += (rp.targetZ - mesh.position.z) * Math.min(1, LERP * dt);

      // Interpolate rotation (shortest arc)
      let rotDiff = rp.targetRotY - mesh.rotation.y;
      while (rotDiff >  Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      mesh.rotation.y += rotDiff * Math.min(1, LERP * dt);

      // Walk animation
      const limbs = mesh.userData.limbs;
      if (!limbs) return;

      const speed = rp.moveSpeed || 0;
      const grip  = mesh.userData.grip || ZS.getGrip(rp.equipped);
      const rem   = grip.remote;
      const twoH  = grip.twoHanded && rem;
      if (twoH) {
        // Tenue à deux mains (armes à feu, barre, lance…) — params depuis GRIPS
        limbs.rArm.rotation.set(rem.rArmRot[0], rem.rArmRot[1], rem.rArmRot[2]);
        const hh = limbs.rArm.getObjectByName('handHolder');
        if (hh) hh.quaternion.copy(limbs.rArm.quaternion).invert();
        const hOff = rem.handHolder || [0, -0.72, -0.12];
        const rHand = new THREE.Vector3(hOff[0], hOff[1], hOff[2])
          .applyQuaternion(limbs.rArm.quaternion)
          .add(limbs.rArm.position);
        if (rem.lArmMode === 'aimAtHand') {
          const dir = rHand.sub(limbs.lArm.position).normalize();
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
        const hh = limbs.rArm.getObjectByName('handHolder');
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
        const hh = limbs.rArm.getObjectByName('handHolder');
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
            limbs.rArm.rotation.x = s * ((a.swingX || 0.95) * 1.75);
          }
        }
      }
    });
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY) {
    const now = Date.now();
    if (now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', { x, y, z, rotY });
  }

  function sendShoot(ox, oz, dx, dz, dmg, range, radius, kb) {
    _socket.emit('shoot', { ox, oz, dx, dz, dmg, range, radius, kb: kb || 0 });
  }

  // Item en main — diffusé aux autres joueurs (dédupliqué : envoi au changement).
  let _lastEquip = undefined;
  function sendEquip(type) {
    type = type || null;
    if (type === _lastEquip) return;
    _lastEquip = type;
    if (_socket) _socket.emit('equip', { type });
  }

  // Geste d'attaque — diffusé pour rejouer l'animation chez les autres.
  function sendAttack(kind) {
    if (_socket) _socket.emit('attack', { kind: kind === 'recoil' ? 'recoil' : 'melee' });
  }

  let _diedSent = false;
  function sendDied() {
    if (_diedSent || !_socket) return;
    _diedSent = true;
    _socket.emit('player-died');
  }
  function sendRespawn() {
    _diedSent = false;
    if (_socket) _socket.emit('respawn');
  }
  function sendSurvival(sv) {
    if (_socket) _socket.emit('survival-sync', sv);
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
      attack:     null
    });

    // Item déjà tenu en main par ce joueur (rejoint déjà équipé)
    if (p.equipped) ZS.setRemoteHandItem(mesh, p.equipped);
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
    sprite.scale.set(1.6, 0.4, 1);
    sprite.position.set(0, 2.55, 0); // above head
    return sprite;
  }

  window.ZS = window.ZS || {};
  ZS.Network = { init, tick, sendMove, sendShoot, sendRespawn, sendDied, sendSurvival, sendEquip, sendAttack };
}());
