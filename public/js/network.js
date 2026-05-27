// Socket.io client — multiplayer sync
(function () {
  'use strict';

  const remotePlayers = new Map(); // socketId -> THREE.Group
  let _scene, _state, _socket;

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;

    socket.on('connect', () => {
      document.getElementById('connecting-screen').style.display = 'none';
    });

    socket.on('connect_error', (err) => {
      document.getElementById('connecting-screen').textContent = 'Erreur: ' + err.message;
    });

    socket.on('game-init', (data) => {
      state.selfId = data.selfId;
      // Apply authoritative spawn position from server (overrides stale localStorage)
      if (data.spawn) {
        state.player.x    = data.spawn.x;
        state.player.z    = data.spawn.z;
        state.camera.yaw  = data.spawn.rotY || 0;
        localStorage.setItem('zombie_spawn', JSON.stringify(data.spawn));
      }
      ZS.Zombies.syncAll(data.zombies);
      for (const p of data.players) _addRemotePlayer(p);
    });

    socket.on('player-join', (p) => _addRemotePlayer(p));

    socket.on('player-move', (d) => {
      const mesh = remotePlayers.get(d.id);
      if (!mesh) return;
      mesh.position.set(d.x, d.y, d.z);
      mesh.rotation.y = d.rotY;
    });

    socket.on('player-leave', (id) => {
      const mesh = remotePlayers.get(id);
      if (mesh) { _scene.remove(mesh); remotePlayers.delete(id); }
    });

    socket.on('zombie-tick',  (arr)      => ZS.Zombies.syncAll(arr));
    socket.on('zombie-spawn', (z)        => ZS.Zombies.spawn(z));
    socket.on('zombie-hit',   (d)        => ZS.Zombies.hit(d.id, d.health));
    socket.on('zombie-die',   (id)       => ZS.Zombies.die(id));

    socket.on('take-damage', (d) => {
      state.player.health = d.health;
      ZS.UI.setHealth(d.health);
      if (d.health <= 0 && !state.player.dead) {
        state.player.dead = true;
        ZS.UI.showDeath(state.player.kills);
      } else if (d.health > 0) {
        ZS.UI.flashDamage();
      }
    });

    socket.on('score-update', (d) => {
      state.player.kills = d.kills;
      ZS.UI.setKills(d.kills);
    });
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY) {
    const now = Date.now();
    if (now - _lastSent < 50) return; // 20 updates/s max
    _lastSent = now;
    _socket.emit('move', { x, y, z, rotY });
  }

  function sendShoot(ox, oz, dx, dz) {
    _socket.emit('shoot', { ox, oz, dx, dz });
  }

  function sendRespawn() {
    _socket.emit('respawn');
  }

  function _addRemotePlayer(p) {
    const model = ZS.createPlayerModel();
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = p.rotY;
    model.userData.username = p.username;

    // Name tag
    _scene.add(model);
    remotePlayers.set(p.id, model);
  }

  window.ZS = window.ZS || {};
  ZS.Network = { init, sendMove, sendShoot, sendRespawn };
}());
