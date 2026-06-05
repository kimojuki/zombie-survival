// Socket.io client — multiplayer sync
(function () {
  'use strict';

  // id -> { mesh, targetX, targetY, targetZ, targetRotY, moveSpeed, animTime }
  const remotePlayers = new Map();
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

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;

    _connecting(true, 'Connexion au serveur…', 'Authentification en cours');

    socket.on('connect', () => {
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      _lastEquip = undefined;
      _connecting(true, 'Connexion établie', 'Chargement de votre partie…');
    });

    socket.on('connect_error', () => {
      _connecting(true, 'Serveur indisponible', 'Nouvelle tentative automatique…');
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
      if (data.spawn) {
        state.player.x   = data.spawn.x;
        state.player.z   = data.spawn.z;
        state.camera.yaw = data.spawn.rotY || 0;
        localStorage.setItem('zombie_spawn', JSON.stringify(data.spawn));
      }
      if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
      if (ZS.Rcon) ZS.Rcon.init(socket, data);
      ZS.Zombies.syncAll(data.zombies);
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      for (const p of data.players) _addRemotePlayer(p);
      for (const item of (data.items || [])) ZS.Inventory.spawnWorldItem(item);
      for (const st of (data.structures || [])) ZS.Inventory.spawnStructure(st);
      // Restore saved inventory (hotbar + sac + équipement). Tableau vide / absent
      // = nouveau joueur → on garde les objets de test + sac par défaut.
      if (data.inventory) ZS.Inventory.loadFromSave(data.inventory);
      if (data.survival)  ZS.Survival.loadFromSave(data.survival);
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

    // Un autre joueur change/retire son item en main
    socket.on('player-equip', (d) => {
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      rp.equipped = d.type || null;
      ZS.setRemoteHandItem(rp.mesh, rp.equipped);
    });

    // Un autre joueur attaque (tir ou mêlée) → on rejoue le geste du bras
    socket.on('player-attack', (d) => {
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      rp.attack = { t: 0, dur: d.kind === 'recoil' ? 0.12 : 0.32, kind: d.kind };
      // Tir → éclair + lumière au bout de l'arme tenue par ce joueur
      if (d.kind === 'recoil') {
        const holder = rp.mesh.userData.limbs?.rArm?.getObjectByName('handHolder');
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
    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('item-add',    (d)  => ZS.Inventory.receivePickup(d.type, d.qty));
    socket.on('bag-collect', (d)  => ZS.Inventory.collectBag(d.items));

    // Respawn autoritaire : position (Start Forest) + kit + survie remis à neuf.
    socket.on('respawn-at', (d) => {
      if (d.spawn) {
        state.player.x = d.spawn.x;
        state.player.z = d.spawn.z;
        state.player.y = (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.spawn.x, d.spawn.z) : 1) + 1.7;
        state.player.velocityY = 0;
        state.player.onGround  = true;
        state.camera.yaw = d.spawn.rotY || 0;
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
      const twoH  = mesh.userData.twoHandedFirearm;
      if (twoH) {
        // Tenue d'arme à feu à deux mains, position de visée :
        //  1) le bras droit ramène l'arme AU CENTRE de la poitrine (roulis vers
        //     l'intérieur) — elle devient ainsi atteignable par la main gauche ;
        //  2) le porte-arme est contre-pivoté (quaternion inverse du bras) pour
        //     que l'arme pointe toujours droit devant (là où le joueur regarde) ;
        //  3) le bras gauche est orienté DYNAMIQUEMENT vers la main droite (=
        //     l'arme), donc les deux mains se rejoignent toujours sur l'arme.
        limbs.rArm.rotation.set(0.85, 0.0, -0.62);
        const hh = limbs.rArm.getObjectByName('handHolder');
        if (hh) hh.quaternion.copy(limbs.rArm.quaternion).invert();
        // Position de la main droite (= centre de l'arme) dans le repère du modèle
        const rHand = new THREE.Vector3(0, -0.72, -0.12)
          .applyQuaternion(limbs.rArm.quaternion)
          .add(limbs.rArm.position);
        // Oriente le bras gauche pour que sa main (axe -Y) pointe vers l'arme
        const dir = rHand.sub(limbs.lArm.position).normalize();
        limbs.lArm.quaternion.setFromUnitVectors(_DOWN, dir);
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
        if (hh) hh.rotation.set(0, 0, 0);   // annule le contre-pivot des armes à feu
        // annule le roulis de la pose à deux mains
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
        if (hh) hh.rotation.set(0, 0, 0);   // annule le contre-pivot des armes à feu
        limbs.lArm.rotation.y = limbs.lArm.rotation.z = 0;   // annule le roulis
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
          // rotation.x positif = la main va vers l'avant (le perso fait face à -z).
          // recoil (arme à feu) : léger sursaut autour de la pose de tir à deux
          // mains ; mêlée : grand coup vers l'avant.
          if (rp.attack.kind === 'recoil') {
            const base = mesh.userData.twoHandedFirearm ? 0.85 : 0.25;
            limbs.rArm.rotation.x = base + s * 0.22;   // léger sursaut de recul
          } else {
            limbs.rArm.rotation.x = s * 1.7;
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
