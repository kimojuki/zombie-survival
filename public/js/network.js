// Socket.io client — multiplayer sync
(function () {
  'use strict';

  // id -> { mesh, targetX, targetY, targetZ, targetRotY, moveSpeed, animTime }
  const remotePlayers = new Map();
  let _scene, _state, _socket;

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;

    socket.on('connect', () => {
      // Clear stale meshes on every (re)connect to prevent ghost players
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      document.getElementById('connecting-screen').style.display = 'none';
    });

    socket.on('connect_error', (err) => {
      document.getElementById('connecting-screen').textContent = 'Erreur: ' + err.message;
    });

    socket.on('game-init', (data) => {
      state.selfId = data.selfId;
      if (data.spawn) {
        state.player.x   = data.spawn.x;
        state.player.z   = data.spawn.z;
        state.camera.yaw = data.spawn.rotY || 0;
        localStorage.setItem('zombie_spawn', JSON.stringify(data.spawn));
      }
      if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
      ZS.Zombies.syncAll(data.zombies);
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      for (const p of data.players) _addRemotePlayer(p);
      for (const item of (data.items || [])) ZS.Inventory.spawnWorldItem(item);
      // Restore saved inventory (hotbar + sac + équipement). Tableau vide / absent
      // = nouveau joueur → on garde les objets de test + sac par défaut.
      if (data.inventory) ZS.Inventory.loadFromSave(data.inventory);
    });

    socket.on('player-join', (p) => {
      if (remotePlayers.has(p.id)) return; // guard against double-add
      _addRemotePlayer(p);
    });

    socket.on('player-move', (d) => {
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
      const rp = remotePlayers.get(id);
      if (rp) { _scene.remove(rp.mesh); remotePlayers.delete(id); }
    });

    socket.on('zombie-tick',  (d) => {
      ZS.Zombies.syncAll(d.zombies);
      ZS.setWorldTime(d.time);
    });
    socket.on('zombie-spawn', (z)   => ZS.Zombies.spawn(z));
    socket.on('zombie-hit',   (d)   => ZS.Zombies.hit(d.id, d.health));
    socket.on('zombie-die',   (id)  => ZS.Zombies.die(id));

    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('item-add',    (d)  => ZS.Inventory.receivePickup(d.type));

    socket.on('take-damage', (d) => {
      const dmg = state.player.health - d.health;
      state.player.health = d.health;
      ZS.UI.setHealth(d.health);
      if (d.health <= 0 && !state.player.dead) {
        state.player.dead = true;
        ZS.UI.showDeath(state.player.kills);
      } else if (d.health > 0) {
        ZS.UI.flashDamage();
        if (dmg > 0) ZS.Survival.applyDamage(dmg);
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
      if (speed > 0.3) {
        rp.animTime += dt * Math.max(4, speed * 1.2);
        const swing = Math.sin(rp.animTime) * 0.65;
        limbs.lArm.rotation.x = -swing;
        limbs.rArm.rotation.x =  swing;
        limbs.lLeg.rotation.x =  swing;
        limbs.rLeg.rotation.x = -swing;
      } else {
        // Return limbs to neutral
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
    });
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY) {
    const now = Date.now();
    if (now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', { x, y, z, rotY });
  }

  function sendShoot(ox, oz, dx, dz, dmg, range, radius) {
    _socket.emit('shoot', { ox, oz, dx, dz, dmg, range, radius });
  }

  function sendRespawn() {
    _socket.emit('respawn');
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
      animTime:   0
    });
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
  ZS.Network = { init, tick, sendMove, sendShoot, sendRespawn };
}());
