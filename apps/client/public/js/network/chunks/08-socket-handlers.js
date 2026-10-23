// Handlers Socket.io entrant — extrait de network.js (IIFE)
    socket.on('connect', () => {
      clearTimeout(_disconnectUiTimer);
      _disconnectUiTimer = null;
      if (socket.recovered && _hadSpawnReady) {
        _spawnReady = true;
        return;
      }
      const needsResync = _hadSpawnReady;
      _spawnReady = false;
      if (!needsResync) {
        _connecting(true, 'Connexion établie', 'Chargement de votre partie…', 'socket', 0.35);
        return;
      }
      _setOnlineCount(0);
      _connecting(true, 'Connexion établie', 'Resynchronisation…', 'socket', 0.35);
      // Filet : nouvelle connexion ou recovery — le serveur renvoie game-init.
      setTimeout(() => {
        if (_socket?.connected && !_spawnReady) _socket.emit('request-game-init');
      }, socket.recovered ? 0 : 1200);
    });

    socket.on('connect_error', (err) => {
      const msg = (err && err.message) || '';
      if (/auth/i.test(msg)) {
        ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_is_guest', 'zombie_guest_committed', 'zombie_spawn', 'zombie_health', 'zombie_kills']
          .forEach((k) => localStorage.removeItem(k));
        window.location.href = '/play.html';
        return;
      }
      _connecting(true, 'Serveur indisponible', msg || 'Nouvelle tentative automatique…', 'socket', 0.1);
    });

    socket.on('guest-committed', () => {
      localStorage.setItem('zombie_guest_committed', '1');
      ZS.UI?.showNotif?.('Progression invité sauvegardée — créez un compte pour personnaliser votre pseudo');
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      _spawnReady = false;
      clearTimeout(_disconnectUiTimer);
      _disconnectUiTimer = setTimeout(() => {
        _disconnectUiTimer = null;
        if (_socket?.connected) return;
        if (!_gameInitSyncing) _loading()?.reset?.();
        _connecting(true, 'Connexion perdue', 'Reconnexion en cours…', 'socket', 0.1);
      }, 480);
    });

    socket.on('zombies-snapshot', (arr) => {
      if (!Array.isArray(arr)) return;
      const list = ZS.Scenario?.filterZombies?.(arr) ?? arr;
      ZS.Zombies.syncAll(list);
    });

    socket.on('scenario-update', (d) => {
      ZS.Scenario?.onUpdate?.(d);
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
      const ps = ZS.PlayerStance;
      const eyeH = d.crouch ? (ps?.EYE_CROUCH ?? 1.05) : (ps?.EYE_STAND ?? 1.7);
      const groundY = d.y - eyeH;
      const dx = d.x - rp.targetX;
      const dz = d.z - rp.targetZ;
      rp.moveSpeed = Math.hypot(dx, dz) * 20; // speed ~0-6 for walking
      rp.targetX    = d.x;
      rp.targetY    = groundY;
      rp.targetZ    = d.z;
      rp.targetRotY = d.rotY;
      rp.crouching  = !!d.crouch;
    });

    socket.on('player-leave', (id) => {
      if (id === state.selfId) return;
      const rp = remotePlayers.get(id);
      if (rp) { _scene.remove(rp.mesh); remotePlayers.delete(id); }
    });

    socket.on('player-sleep', (s) => {
      if (!s?.playerId) return;
      // Filet de sécurité : retirer l'avatar debout si player-leave manque (déco → corps uniquement).
      if (s.username) {
        for (const [rid, rp] of remotePlayers) {
          if (rp.mesh?.userData?.username === s.username) {
            _scene.remove(rp.mesh);
            remotePlayers.delete(rid);
          }
        }
      }
      _addSleepingBody(s);
    });

    socket.on('player-wake', (d) => {
      const pid = Number(d?.playerId);
      if (!pid) return;
      _removeSleepingBody(pid);
    });

    socket.on('sleeper-death', (d) => {
      if (!d?.playerId) return;
      _removeSleepingBody(d.playerId);
      _addDeathCorpse(d);
      if (d.username) ZS.UI?.showNotif?.(`☠ ${d.username} a été tué`);
    });

    socket.on('sleeper-removed', (d) => {
      const pid = Number(d?.playerId);
      if (!pid) return;
      _removeSleepingBody(pid);
      _removeDeathCorpse(pid);
    });

    socket.on('sleeper-hit', (d) => {
      const pid = Number(d?.playerId);
      if (!pid || typeof d.health !== 'number') return;
      const sleep = sleepingBodies.get(pid);
      if (sleep) sleep.health = d.health;
    });

    socket.on('sleep-loot-update', (d) => {
      if (!d?.playerId) return;
      ZS.SleepLoot?.onInventoryUpdate?.(d.playerId, d.inventory);
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
      const weapon = d.weapon || rp.equipped;
      const grip = ZS.getGrip(weapon);
      const animDef = d.kind === 'recoil' ? grip.anim.recoil : grip.anim.melee;
      rp.attack = {
        t: 0,
        dur: animDef?.dur || (d.kind === 'recoil' ? 0.12 : 0.32),
        kind: d.kind,
      };
      if (d.kind === 'recoil') {
        const holder = rp.mesh.userData.rig?.rightItemHolder
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('itemHolder')
          || rp.mesh.userData.limbs?.rArm?.getObjectByName('handHolder');
        if (holder) ZS.muzzleFlash(holder);
      }
      const sx = Number.isFinite(d.x) ? d.x : rp.mesh.position.x;
      const sz = Number.isFinite(d.z) ? d.z : rp.mesh.position.z;
      const sp = ZS.Audio?.spatialAt?.(sx, sz) || _spatial({ x: sx, z: sz });
      if (sp && sp.vol > 0.04) {
        if (d.kind === 'recoil') ZS.Audio.gunshot(weapon, sp.vol, sp.pan);
        else ZS.Audio.melee(sp.vol * 0.8, sp.pan);
      }
    });

    socket.on('player-footstep', (d) => {
      if (!d?.id || d.id === state.selfId) return;
      const sx = Number(d.x);
      const sz = Number(d.z);
      if (!Number.isFinite(sx) || !Number.isFinite(sz)) return;
      const sp = ZS.Audio?.spatialAt?.(sx, sz);
      if (!sp || sp.vol < 0.04) return;
      const base = d.sprint ? 0.72 : 0.56;
      ZS.Audio.footstep(d.surface || 'dirt', base * sp.vol, sp.pan);
    });

    socket.on('zombie-tick',  (d) => {
      if (ZS.Scenario?.shouldDelayZombieSync?.()) return;
      if (d.zombies) {
        const list = ZS.Scenario?.filterZombies?.(d.zombies) ?? d.zombies;
        if (d.full === false) ZS.Zombies.applyDelta(list, d.removed);
        else if (list.length) ZS.Zombies.syncAll(list);
      }
      if (typeof d.time === 'number' && Math.abs(d.time - (_lastWorldTime ?? d.time)) > 0.0005) {
        _lastWorldTime = d.time;
        ZS.setWorldTime(d.time);
      }
    });

    socket.on('world-time', (d) => {
      if (typeof d?.time === 'number') ZS.setWorldTime(d.time);
    });

    socket.on('bed-sleep-end', (d) => {
      ZS.BedSleep?.onServerEnd?.(d?.reason);
      const av = window.ZS?._localAvatar;
      if (av) av.visible = true;
    });

    socket.on('player-bed-sleep', (d) => {
      if (!d?.id) return;
      const rp = remotePlayers.get(d.id);
      if (!rp?.mesh) return;
      if (d.sleeping) {
        rp.mesh.position.set(d.x, _groundYAt(d.x, d.z, d.y), d.z);
        rp.mesh.rotation.y = d.rotY || 0;
        ZS.applySleepPose?.(rp.mesh);
        rp.mesh.userData.bedSleeping = true;
      } else if (rp.mesh.userData.bedSleeping) {
        rp.mesh.userData.bedSleeping = false;
        rp.mesh.rotation.x = 0;
        rp.mesh.position.set(d.x, _groundYAt(d.x, d.z, d.y), d.z);
        rp.mesh.rotation.y = d.rotY || 0;
      }
    });

    socket.on('admin-role-update', (d) => {
      ZS.AdminAuth?.loadFromAuth?.(d);
      if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
      ZS.UI?.showNotif?.(`Rôle mis à jour : ${d.roleLabel || d.role || '?'}`);
    });

    socket.on('admin-roads-changed', () => {
      ZS.AdminRoads?.reloadAndRefresh?.().catch((err) => {
        console.warn('[roads] live refresh', err);
      });
    });

    socket.on('world-backup-restored', (d) => {
      ZS.UI?.showNotif?.('Monde restauré depuis un backup — rechargement…');
      if (d?.requiresReload) {
        setTimeout(() => { window.location.reload(); }, 1500);
      }
    });

    socket.on('server-flags', (d) => {
      if (ZS.Rcon) ZS.Rcon.onFlags(d);
    });

    socket.on('admin-tp', (d) => {
      if (!d) return;
      state.player.x = d.x;
      state.player.y = d.y;
      state.player.z = d.z;
      if (d.rotY != null) {
        state.player.rotY = d.rotY;
        state.camera.yaw = d.rotY;
      }
      state.player.velocityY = 0;
      state.player.onGround = true;
      if (ZS._camera) {
        ZS._camera.position.set(d.x, d.y, d.z);
        if (d.rotY != null) ZS._camera.rotation.y = d.rotY;
      }
      if (ZS._localAvatar) {
        ZS._localAvatar.position.set(d.x, d.y - 1.7, d.z);
        ZS._localAvatar.rotation.y = d.rotY ?? state.camera.yaw;
      }
      _syncPlayerPosToServer();
      ZS.UI?.showNotif?.(`Téléporté → (${Math.round(d.x)}, ${Math.round(d.z)})`);
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
    socket.on('zombie-spawn', (z) => {
      const list = ZS.Scenario?.filterZombies?.([z]) ?? [z];
      if (list.length) ZS.Zombies.spawn(z);
    });
    socket.on('zombie-hit', (d) => {
      if (!d?.id) return;
      const pos = (Number.isFinite(d.x) && Number.isFinite(d.z))
        ? { x: d.x, z: d.z, angle: d.angle }
        : null;
      ZS.Zombies.hit(d.id, d.health, d.maxHealth, pos);
    });
    socket.on('zombie-die',   (id)  => ZS.Zombies.die(id));

    socket.on('player-hit', (d) => {
      if (!d?.id || d.id === state.selfId) return;
      const rp = remotePlayers.get(d.id);
      if (!rp) return;
      ZS.flashRemotePlayer?.(rp.mesh);
    });

    socket.on('structure-spawn', (d) => ZS.Inventory.spawnStructure(d));
    socket.on('decor-item-spawn', (d) => _spawnDecorItem(d));
    socket.on('decor-item-remove', (id) => _removeDecorItem(id));
    socket.on('decor-door-state', (d) => {
      if (!d?.id) return;
      if (ZS.setDecorDoorState?.(d.id, !!d.open)) _syncWorldColliders();
      const entry = decorItems.get(d.id);
      if (entry) entry.data.doorOpen = !!d.open;
    });
    socket.on('door-lock-state', (d) => {
      if (!d?.id) return;
      ZS.setDecorDoorLockState?.(d.id, d);
      const entry = decorItems.get(d.id);
      if (entry?.data) {
        entry.data.locked = !!d.locked;
        entry.data.lockId = d.lockId || null;
        entry.data.lockOwner = d.lockOwner || null;
      }
    });
    socket.on('door-error', (d) => {
      if (d?.message) ZS.UI?.showNotif?.(d.message);
    });
    socket.on('storage-open', (d) => ZS.StorageUI?.open?.(d));
    socket.on('storage-update', (d) => ZS.StorageUI?.update?.(d));
    socket.on('storage-state', (d) => {
      if (!d?.id) return;
      ZS.setDecorStorageState?.(d.id, !!d.open);
      const entry = decorItems.get(d.id);
      if (entry) entry.data.storageOpen = !!d.open;
    });
    socket.on('storage-error', (d) => {
      if (d?.message) ZS.UI?.showNotif?.(d.message);
    });
    socket.on('build-damage', (d) => {
      if (!d?.id) return;
      const entry = decorItems.get(d.id);
      if (entry?.data) {
        if (d.kind === 'door') {
          entry.data.doorBreakDamage = d.damage;
          entry.data.doorBreakMaxHp = d.maxHp;
        } else {
          entry.data.buildDamage = d.damage;
          entry.data.buildMaxHp = d.maxHp;
        }
      }
      const label = d.kind === 'door' ? 'Porte endommagée' : 'Structure endommagée';
      ZS.UI?.showNotif?.(`${label} (${d.damage}/${d.maxHp})`);
    });
    socket.on('build-destroyed', (d) => {
      ZS.UI?.showNotif?.(d?.kind === 'door' ? 'Porte détruite' : 'Structure détruite');
    });
    socket.on('decor-tree-chop', (d) => {
      if (!d?.id) return;
      if (d.by !== state.selfId) {
        const entry = decorItems.get(d.id);
        const tx = entry?.data?.x;
        const tz = entry?.data?.z;
        if (Number.isFinite(tx) && Number.isFinite(tz)) {
          const sp = ZS.Audio?.spatialAt?.(tx, tz);
          if (sp && sp.vol > 0.05) ZS.Audio.chopWood(sp.vol * 0.92, sp.pan);
        }
      }
      ZS.applyRemoteTreeChop?.(d.id, d.woodRemaining, d.woodMax, d);
    });
    socket.on('decor-tree-grow', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteTreeGrow?.(d.id, d);
    });
    socket.on('decor-tree-fell', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteTreeFell?.(d.id, d.fallDirX, d.fallDirZ);
    });
    socket.on('decor-rock-mine', (d) => {
      if (!d?.id) return;
      if (d.by !== state.selfId) {
        const entry = decorItems.get(d.id);
        const tx = entry?.data?.x;
        const tz = entry?.data?.z;
        if (Number.isFinite(tx) && Number.isFinite(tz)) {
          const sp = ZS.Audio?.spatialAt?.(tx, tz);
          if (sp && sp.vol > 0.05) ZS.Audio.chopWood(sp.vol * 0.85, sp.pan);
        }
      }
      ZS.applyRemoteRockMine?.(d.id, d.stoneRemaining);
    });
    socket.on('decor-rock-depleted', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteRockDepleted?.(d.id);
    });
    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('inventory-authoritative', (inv) => {
      ZS.ConsumeDebug?.log('inventory-authoritative', {
        trace: ZS.ConsumeDebug?.traceId?.('auth'),
        serverFood: ZS.ConsumeDebug?.foodFromInv?.(inv),
        clientBefore: ZS.ConsumeDebug?.clientSnapshot?.(),
      });
      if (inv && ZS.Inventory?.applyAuthoritativeInv) {
        const prevActive = ZS.Inventory.getActiveItem?.()?.type;
        ZS.Inventory.applyAuthoritativeInv(inv);
        ZS.ConsumeDebug?.compare?.(inv, 'inventory-authoritative');
        ZS.SleepLoot?.refreshIfOpen?.();
        ZS.StorageUI?.refreshIfOpen?.();
        const next = ZS.Inventory.getActiveItem?.();
        if (prevActive && !next && prevActive !== '__fist__') {
          const def = ZS.ITEMS?.[prevActive];
          ZS.UI?.showNotif?.((def?.label || prevActive) + ' cassé(e) !');
          ZS.setHandItem?.(null);
        }
      } else if (inv && ZS.Inventory?.loadFromSave) {
        ZS.Inventory.loadFromSave(inv, { fullReset: true });
      }
    });
    socket.on('survival-update', (d) => {
      if (!d) return;
      ZS.Survival?.applyServerState?.(d);
      if (typeof d.health === 'number' && _state?.player) {
        _state.player.health = Math.max(0, d.health);
        ZS.UI.setHealth(Math.floor(_state.player.health), ZS.Inventory?.getMaxHealth?.() || 100);
        localStorage.setItem('zombie_health', String(Math.floor(_state.player.health)));
      }
    });

    socket.on('player-death', (d) => {
      if (!d) return;
      const isSelf = d.id === state.selfId;
      if (isSelf) {
        if (!_state?.player || _state.player.dead) return;
        _state.player.dead = true;
        _state.player.health = 0;
        ZS.UI.setHealth(0);
        ZS.UI.showDeath(d.recap || {
          zombieKills: d.kills ?? _state.player.kills,
          playerKills: 0,
          survivedMs: 0,
        });
        _showLocalDeathCorpse(d);
        return;
      }
      ZS.UI?.showNotif?.(`RIP ${d.username || 'Joueur'}`);
      const rp = remotePlayers.get(d.id);
      if (rp) {
        _scene.remove(rp.mesh);
        remotePlayers.delete(d.id);
      }
      _addDeathCorpse(d);
    });

    socket.on('player-respawn', (d) => {
      if (!d?.playerId) return;
      _removeDeathCorpse(d.playerId);
      if (d.id === state.selfId) return;
      const footY = (d.y || 0) - 1.7;
      if (!remotePlayers.has(d.id)) {
        _addRemotePlayer({
          id: d.id,
          username: d.username,
          x: d.x,
          y: d.y,
          z: d.z,
          rotY: d.rotY,
          equipped: d.equipped || null,
        });
        return;
      }
      const rp = remotePlayers.get(d.id);
      rp.targetX = d.x;
      rp.targetY = footY;
      rp.targetZ = d.z;
      rp.targetRotY = d.rotY || 0;
      rp.mesh.position.set(d.x, footY, d.z);
      rp.mesh.rotation.y = d.rotY || 0;
    });

    socket.on('move-correction', (d) => {
      if (!_state?.player || !d) return;
      const px = _state.player.x;
      const pz = _state.player.z;
      _state.player.x = d.x;
      _state.player.y = d.y;
      _state.player.z = d.z;
      _state.player.rotY = d.rotY;
      if (ZS._camera) {
        ZS._camera.position.set(d.x, d.y, d.z);
        ZS._camera.rotation.y = d.rotY ?? _state.camera.yaw;
      }
      const dist = Math.hypot(d.x - px, d.z - pz);
      const introActive = ZS.Scenario?.isActive?.();
      if (dist > 8 && !introActive) {
        console.warn('[sync] move-correction', { from: [px, pz], to: [d.x, d.z] });
        ZS.UI?.showNotif?.(`Position corrigée → (${Math.round(d.x)}, ${Math.round(d.z)})`);
      }
    });

    socket.on('craft-queue-state', (d) => {
      ZS.Craft?.applyServerQueue?.(d);
    });

    socket.on('craft-complete', (d) => {
      ZS.Craft?.onServerComplete?.(d);
    });

    // Respawn autoritaire : position serveur (d.spawn), pas le SpawnZone local.
    socket.on('respawn-at', (d) => {
      state.player.dead = false;
      state.player.health = 100;
      const spawn = d.spawn || ZS.SpawnZone?.spawn || null;
      if (spawn) {
        state.player.x = spawn.x;
        state.player.z = spawn.z;
        state.player.y = ((ZS.getDecorGroundHeight
          ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
          : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : 1))) + 1.7;
        state.player.velocityY = 0;
        state.player.onGround  = true;
        state.camera.yaw = spawn.rotY || 0;
        if (ZS._camera) {
          ZS._camera.position.set(state.player.x, state.player.y, state.player.z);
          ZS._camera.rotation.y = state.camera.yaw;
        }
        if (ZS._localAvatar) {
          ZS._localAvatar.position.set(state.player.x, state.player.y - 1.7, state.player.z);
          ZS._localAvatar.rotation.y = state.camera.yaw;
        }
      }
      if (d.inventory && ZS.Inventory.loadRespawnKit) {
        ZS.Inventory.loadRespawnKit(d.inventory);
      } else if (d.inventory) {
        ZS.Inventory.loadFromSave(d.inventory, { fullReset: true });
      }
      if (d.survival) ZS.Survival.loadFromSave(d.survival);
      else ZS.Survival?.reset?.();
      if (d.inventory?.scenario) {
        ZS.Scenario?.init?.(d.inventory.scenario, state, _socket);
        if (d.inventory.scenario.step === 'intro_wake') {
          ZS.SpawnIntro?.tryStart?.(state);
        }
      }
      ZS.UI.setHealth(100);
      ZS.UI.hideDeath();
      _hideLocalDeathCorpse();
      _state.player.playerKills = 0;
      ZS.UI.setPlayerKills(0);
      _syncPlayerPosToServer();
    });

    socket.on('take-damage', (d) => {
      if (!_spawnReady) return;
      if (state.player.dead) return;
      const maxHp = ZS.Inventory?.getMaxHealth?.() || 100;
      const dmg = typeof d.dmg === 'number' ? d.dmg : 0;
      if (typeof d.health === 'number') {
        state.player.health = d.health;
      } else if (dmg > 0) {
        state.player.health = Math.max(0, state.player.health - dmg);
      }
      ZS.UI.setHealth(Math.floor(state.player.health), maxHp);
      if (dmg > 0 && state.player.health > 0) ZS.UI.flashDamage();
      if (d.infected) ZS.UI?.showNotif?.('⚠ Morsure infectée !');
      /* mort UI via player-death (serveur authoritatif) */
    });

    socket.on('score-update', (d) => {
      if (typeof d.kills === 'number') state.player.kills = d.kills;
      if (typeof d.playerKills === 'number') {
        state.player.playerKills = d.playerKills;
        ZS.UI.setPlayerKills(d.playerKills);
      }
    });

    _flushPendingGameInit();
  }
