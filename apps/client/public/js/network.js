// Socket.io client — multiplayer sync
(function () {
  'use strict';

  // id -> { mesh, targetX, targetY, targetZ, targetRotY, moveSpeed, animTime }
  const remotePlayers = new Map();
  const sleepingBodies = new Map(); // playerId -> { mesh, x, z, username, playerId }
  let _spawnReady = false; // false jusqu'à sync complète (game-init + décor rendu)
  const decorItems = new Map();
  let _scene, _state, _socket, _localUsername = '';
  const _DOWN = (typeof THREE !== 'undefined') ? new THREE.Vector3(0, -1, 0) : null;

  function _loading() {
    return window.ZS?.Loading || window.__zsLoading || null;
  }

  function _connecting(show, msg, detail, phaseKey, local01) {
    const L = _loading();
    if (show) {
      if (L?.setPhase && phaseKey != null && local01 != null) {
        L.setPhase(phaseKey, local01, msg, detail);
      } else if (L?.show) {
        L.show(msg, detail);
      } else {
        const screen = document.getElementById('connecting-screen');
        const m = document.getElementById('connecting-msg');
        const d = document.getElementById('connecting-detail');
        if (screen) screen.style.display = 'flex';
        if (m && msg) m.textContent = msg;
        if (d) d.textContent = detail || '';
      }
    } else if (L?.hide) {
      L.hide();
    } else {
      const screen = document.getElementById('connecting-screen');
      if (screen) screen.style.display = 'none';
    }
  }

  function _setOnlineCount(n) {
    if (typeof n === 'number' && ZS.UI?.setOnlineCount) ZS.UI.setOnlineCount(n);
  }

  let _colliderSyncDepth = 0;
  let _colliderSyncTimer = null;

  function _syncWorldColliders(force = false) {
    if (!_socket || !ZS.getColliders) return;
    if (_colliderSyncDepth > 0 && !force) return;
    if (force) {
      clearTimeout(_colliderSyncTimer);
      _colliderSyncTimer = null;
      _socket.emit('world-colliders', ZS.getColliders());
      return;
    }
    if (_colliderSyncTimer) return;
    _colliderSyncTimer = setTimeout(() => {
      _colliderSyncTimer = null;
      if (_socket) _socket.emit('world-colliders', ZS.getColliders());
    }, 150);
  }

  function _beginColliderBatch() {
    _colliderSyncDepth++;
  }

  function _endColliderBatch() {
    _colliderSyncDepth = Math.max(0, _colliderSyncDepth - 1);
    if (_colliderSyncDepth === 0) _syncWorldColliders(true);
  }

  function _removeDecorItem(id) {
    const entry = decorItems.get(id);
    if (!entry) return;
    if (entry.root?.parent) entry.root.parent.remove(entry.root);
    decorItems.delete(id);
    ZS.StorageUI?.closeIf?.(id);
    ZS.removeDecorColliders?.(id);
    ZS.unregisterDecorDoor?.(id);
    ZS.unregisterDecorStorage?.(id);
    ZS.unregisterDecorBuild?.(id);
    ZS.BuildAnchors?.unregisterFoundation?.(id);
    ZS.removeChoppableTree?.(id);
    ZS.removeMinableRock?.(id);
    if (_colliderSyncDepth === 0) _syncWorldColliders();
  }

  function _countSpawnedWorldRocks() {
    let n = 0;
    decorItems.forEach(({ data }) => {
      if (data?.prefabId?.startsWith('rock_') && !data?.anchorId) n++;
    });
    return n;
  }

  async function _resyncWorldRocksFromApi() {
    try {
      const res = await fetch('/api/world/decor-rocks');
      if (!res.ok) return 0;
      const json = await res.json();
      let added = 0;
      for (const decor of (json.items || [])) {
        if (decorItems.has(decor.id)) continue;
        await _spawnDecorItem(decor);
        added++;
      }
      return added;
    } catch (_) {
      return 0;
    }
  }

  function _spawnDecorItem(d) {
    if (!d?.id || !_scene) return Promise.resolve(null);
    // Glissières posées localement au build RN (road_network + barrier_prefabs).
    if (d.prefabId?.startsWith('road_barrier_')) return Promise.resolve(null);
    _removeDecorItem(d.id);
    const isPrefab = d.kind === 'prefab' || (d.prefabId && !d.type);
    const isBuildWood = d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood');
    const commonOpts = {
      decorId: d.id,
      rotY: d.rotY || 0,
      rotZ: d.rotZ || 0,
      scale: Number.isFinite(d.scale) ? d.scale : 1,
      grounded: !d.prefabId?.startsWith('wreck_'),
      groundLift: Number.isFinite(d.groundLift) ? d.groundLift : undefined,
      layFlat: !!d.layFlat,
      offsetX: d.offsetX || 0,
      offsetY: d.offsetY || 0,
      offsetZ: d.offsetZ || 0,
      wreckVariant: d.wreckVariant,
      wreckBurnt: !!d.wreckBurnt,
      wreckTilt: Number.isFinite(d.wreckTilt) ? d.wreckTilt : (Number.isFinite(d.rotZ) ? d.rotZ : 0),
      wreckWheels: Number.isFinite(d.wreckWheels) ? d.wreckWheels : undefined,
        wreckSink: Number.isFinite(d.wreckSink) ? d.wreckSink : 0,
      treeSeed: Number.isFinite(d.treeSeed) ? d.treeSeed : undefined,
      doorOpen: !!d.doorOpen,
      locked: !!d.locked,
      lockId: d.lockId || undefined,
      lockOwner: d.lockOwner || undefined,
      storageOpen: !!d.storageOpen,
      woodMax: Number.isFinite(d.woodMax) ? d.woodMax : undefined,
      woodRemaining: Number.isFinite(d.woodRemaining) ? d.woodRemaining : undefined,
      stoneMax: Number.isFinite(d.stoneMax) ? d.stoneMax : undefined,
      stoneRemaining: Number.isFinite(d.stoneRemaining) ? d.stoneRemaining : undefined,
      rockSeed: Number.isFinite(d.rockSeed) ? d.rockSeed : undefined,
      growthPhase: Number.isFinite(d.growthPhase) ? d.growthPhase : undefined,
      plantedAt: Number.isFinite(d.plantedAt) ? d.plantedAt : undefined,
      railLen: Number.isFinite(d.railLen) ? d.railLen : undefined,
      rotX: Number.isFinite(d.rotX) ? d.rotX : undefined,
      baseY: Number.isFinite(d.baseY) ? d.baseY
        : ((isBuildWood || d.prefabId === 'storage_chest') && Number.isFinite(d.y) ? d.y : undefined),
      buildLevel: Number.isFinite(d.buildLevel) ? Math.max(0, Math.min(8, d.buildLevel)) : 0,
      supportGroundY: Number.isFinite(d.supportGroundY) ? d.supportGroundY : undefined,
      buildDamage: Number.isFinite(d.buildDamage) ? d.buildDamage : undefined,
      buildMaxHp: Number.isFinite(d.buildMaxHp) ? d.buildMaxHp : undefined,
    };
    if (d.prefabId?.startsWith('build_') && d.prefabId.endsWith('_wood')) {
      if (!Number.isFinite(commonOpts.buildDamage)) commonOpts.buildDamage = 0;
      if (!Number.isFinite(commonOpts.buildMaxHp)) commonOpts.buildMaxHp = 100;
      d.buildDamage = commonOpts.buildDamage;
      d.buildMaxHp = commonOpts.buildMaxHp;
    }
    const onRoot = (root) => {
      if (!root) return;
      root.userData.decorId = d.id;
      decorItems.set(d.id, { root, data: d });
      if (_colliderSyncDepth === 0) _syncWorldColliders();
    };
    if (isPrefab) {
      if (!d.prefabId || !ZS.spawnDecorPrefab) return Promise.resolve(null);
      const root = ZS.spawnDecorPrefab(_scene, d.prefabId, d.x, d.y, d.z, commonOpts);
      onRoot(root);
      return Promise.resolve(root);
    }
    if (!d.type || !ZS.spawnDecorItem) return Promise.resolve(null);
    return ZS.spawnDecorItem(_scene, d.type, d.x, d.y, d.z, commonOpts).then((root) => {
      onRoot(root);
      return root;
    });
  }

  async function _spawnDecorBatch(list, onProgress) {
    const CHUNK = 64;
    const pending = [];
    for (let i = 0; i < list.length; i++) {
      pending.push(_spawnDecorItem(list[i]));
      const flush = pending.length >= CHUNK || i === list.length - 1;
      if (!flush) continue;
      await Promise.all(pending);
      pending.length = 0;
      if (onProgress) onProgress(i + 1, list.length);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  async function _finalizeGameInit(data) {
    const L = _loading();
    L?.setPhase?.('sync', 0.05, 'Synchronisation…', 'Préparation de la partie');

    if (data.isAdmin || data.rconEnabled) {
      localStorage.setItem('zombie_is_admin', '1');
    } else {
      localStorage.setItem('zombie_is_admin', '0');
    }
    if (data.username) {
      localStorage.setItem('zombie_username', data.username);
      _localUsername = data.username;
    }
    if (ZS.Chat?.setUsername) ZS.Chat.setUsername(data.username);
    if (ZS.Chat?.setSelfId) ZS.Chat.setSelfId(data.selfId);
    if (ZS.Chat?.setServerReady) ZS.Chat.setServerReady(data.features?.chat !== false);
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    _state.selfId = data.selfId;
    const spawn = data.spawn || ZS.SpawnZone?.spawn || null;
    if (spawn) {
      _state.player.x   = spawn.x;
      _state.player.z   = spawn.z;
      _state.camera.yaw = spawn.rotY || 0;
      _state.player.y   = ((ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(spawn.x, spawn.z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(spawn.x, spawn.z) : _state.player.y - 1.7))) + 1.7;
      if (ZS._camera) {
        ZS._camera.position.set(_state.player.x, _state.player.y, _state.player.z);
        ZS._camera.rotation.y = _state.camera.yaw;
      }
      if (ZS._localAvatar) {
        ZS._localAvatar.position.set(_state.player.x, _state.player.y - 1.7, _state.player.z);
        ZS._localAvatar.rotation.y = _state.camera.yaw;
      }
      localStorage.setItem('zombie_spawn', JSON.stringify(spawn));
    }
    if (typeof data.worldTime === 'number') ZS.setWorldTime(data.worldTime);
    if (ZS.Rcon) ZS.Rcon.init(_socket, data);
    ZS.Zombies.syncAll(data.zombies);
    remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
    remotePlayers.clear();
    for (const p of data.players) {
      if (p.id === _state.selfId) continue;
      _addRemotePlayer(p);
    }
    sleepingBodies.forEach(({ mesh }) => _scene.remove(mesh));
    sleepingBodies.clear();
    for (const s of (data.sleeping || [])) _addSleepingBody(s);

    const decorList = (data.decorItems || []).filter(
      (d) => !d.prefabId?.startsWith('road_barrier_'),
    );
    const itemList = data.items || [];
    const structList = data.structures || [];
    const syncTotal = decorList.length + itemList.length + structList.length + 2;

    for (const item of itemList) {
      ZS.Inventory.spawnWorldItem(item);
    }

    ZS.setDeferRockSnap?.(true);
    _beginColliderBatch();
    await _spawnDecorBatch(decorList, (n, total) => {
      const done = itemList.length + n;
      const t = syncTotal > 0 ? done / syncTotal : 1;
      L?.setPhase?.('sync', t, 'Synchronisation…', `${done} / ${syncTotal} objets`);
    });
    ZS.setDeferRockSnap?.(false);
    ZS.resnapAllMinableRocks?.(_scene);
    ZS.BuildAnchors?.syncRegistryFromDecor?.(decorList);
    ZS.reconcileAllBuildFloors?.();
    _endColliderBatch();

    L?.setPhase?.('sync', 0.95, 'Synchronisation…', 'Rochers ancrés');

    const worldRockCount = decorList.filter(
      (d) => d.prefabId?.startsWith('rock_') && !d.anchorId,
    ).length;
    const spawnedRocks = _countSpawnedWorldRocks();
    if (worldRockCount > 0 && spawnedRocks === 0) {
      _beginColliderBatch();
      const n = await _resyncWorldRocksFromApi();
      ZS.resnapAllMinableRocks?.(_scene);
      _endColliderBatch();
      if (n > 0) console.info('[decor] rochers resync API:', n);
    }

    for (const st of structList) ZS.Inventory.spawnStructure(st);

    if (data.inventory) {
      ZS.Inventory.loadFromSave(data.inventory);
      ZS.Inventory.ensureStarterCaillou?.();
    }
    if (data.survival) ZS.Survival.loadFromSave(data.survival);
    if (typeof data.onlineCount === 'number') _setOnlineCount(data.onlineCount);
    else _setOnlineCount(remotePlayers.size + 1);

    L?.setPhase?.('finalize', 0.5, 'Finalisation…', 'Envoi des collisions');
    _syncWorldColliders(true);
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    L?.setPhase?.('finalize', 0.85, 'Finalisation…', 'Préparation du combat');
    _syncPlayerPosToServer();
    _spawnReady = true;
    if (_socket) _socket.emit('request-zombie-sync');

    L?.setPhase?.('finalize', 1, 'Prêt', '');
    _connecting(false);
  }

  function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;

    _connecting(true, 'Connexion au serveur…', 'Authentification en cours', 'socket', 0);

    socket.on('connect', () => {
      _spawnReady = false;
      remotePlayers.forEach(({ mesh }) => _scene.remove(mesh));
      remotePlayers.clear();
      sleepingBodies.forEach(({ mesh }) => _scene.remove(mesh));
      sleepingBodies.clear();
      decorItems.forEach(({ root }) => { if (root?.parent) root.parent.remove(root); });
      decorItems.clear();
      ZS.clearDecorColliders?.();
      _lastEquip = undefined;
      _setOnlineCount(0);
      _connecting(true, 'Connexion établie', 'Chargement de votre partie…', 'socket', 0.35);
    });

    socket.on('connect_error', (err) => {
      const msg = (err && err.message) || '';
      if (/auth/i.test(msg)) {
        ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_spawn', 'zombie_health', 'zombie_kills']
          .forEach((k) => localStorage.removeItem(k));
        window.location.href = '/';
        return;
      }
      _connecting(true, 'Serveur indisponible', msg || 'Nouvelle tentative automatique…', 'socket', 0.1);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      _spawnReady = false;
      _loading()?.reset?.();
      _connecting(true, 'Connexion perdue', 'Reconnexion en cours…', 'socket', 0.1);
    });

    socket.on('game-init', (data) => {
      _connecting(true, 'Synchronisation…', 'Réception des données serveur', 'sync', 0);
      _finalizeGameInit(data).catch((err) => {
        console.error('[network] game-init failed', err);
        _spawnReady = true;
        _syncPlayerPosToServer();
        _connecting(false);
      });
    });

    socket.on('zombies-snapshot', (arr) => {
      if (Array.isArray(arr)) ZS.Zombies.syncAll(arr);
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
    socket.on('zombie-hit',   (d)   => ZS.Zombies.hit(d.id, d.health, d.maxHealth));
    socket.on('zombie-die',   (id)  => ZS.Zombies.die(id));

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
      ZS.applyRemoteTreeChop?.(d.id, d.woodRemaining, d.woodMax);
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
      ZS.applyRemoteRockMine?.(d.id, d.stoneRemaining);
    });
    socket.on('decor-rock-depleted', (d) => {
      if (!d?.id) return;
      ZS.applyRemoteRockDepleted?.(d.id);
    });
    socket.on('item-spawn',  (d)  => ZS.Inventory.spawnWorldItem(d));
    socket.on('item-remove', (id) => ZS.Inventory.removeWorldItem(id));
    socket.on('inventory-authoritative', (inv) => {
      if (inv && ZS.Inventory?.applyAuthoritativeInv) {
        const prevActive = ZS.Inventory.getActiveItem?.()?.type;
        ZS.Inventory.applyAuthoritativeInv(inv);
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
      const prevInf = ZS.Survival?.get?.()?.infection ?? 0;
      ZS.Survival?.applyServerState?.(d);
      if (typeof d.infection === 'number' && d.infection > prevInf + 5) {
        ZS.UI?.showNotif?.('⚠ Morsure infectée !');
      }
      if (typeof d.health === 'number' && _state?.player) {
        _state.player.health = d.health;
        ZS.UI.setHealth(Math.floor(d.health), ZS.Inventory?.getMaxHealth?.() || 100);
      }
    });

    socket.on('player-death', (d) => {
      if (!_state?.player || _state.player.dead) return;
      _state.player.dead = true;
      _state.player.health = 0;
      ZS.UI.setHealth(0);
      ZS.UI.showDeath(d?.kills ?? _state.player.kills);
    });

    socket.on('move-correction', (d) => {
      if (!_state?.player || !d) return;
      _state.player.x = d.x;
      _state.player.y = d.y;
      _state.player.z = d.z;
      _state.player.rotY = d.rotY;
      if (ZS._camera) {
        ZS._camera.position.set(d.x, d.y, d.z);
        ZS._camera.rotation.y = d.rotY ?? _state.camera.yaw;
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
      ZS.UI.setHealth(100);
      ZS.UI.hideDeath();
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
      /* mort UI via player-death (serveur authoritatif) */
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
  }

  let _lastSent = 0;
  function sendMove(x, y, z, rotY, force) {
    if (!_spawnReady || !_socket) return;
    const now = Date.now();
    if (!force && now - _lastSent < 50) return; // 20 Hz max
    _lastSent = now;
    _socket.emit('move', { x, y, z, rotY });
  }

  function _syncPlayerPosToServer() {
    if (!_state?.player) return;
    const p = _state.player;
    sendMove(p.x, p.y, p.z, p.rotY ?? _state.camera?.yaw ?? 0, true);
  }

  function sendShoot(ox, oz, dx, dz, weaponType) {
    if (!_spawnReady || !_socket) return;
    _socket.emit('shoot', { ox, oz, dx, dz, weaponType: weaponType || ZS.Inventory?.getActiveItem?.()?.type || '__fist__' });
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

  function _groundYAt(x, z, eyeY) {
    if (ZS.getDecorGroundHeight) return ZS.getDecorGroundHeight(x, z);
    if (typeof ZS.getTerrainHeight === 'function') return ZS.getTerrainHeight(x, z);
    return (eyeY || 0) - 1.7;
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

  function notifyDecorChop(decorId, dirX, dirZ) {
    if (!_socket || !decorId) return;
    const toolType = ZS.Inventory?.getActiveItem?.()?.type || 'tool_caillou';
    _socket.emit('decor-chop', { id: decorId, toolType, dirX, dirZ });
  }

  function notifyDecorMine(decorId) {
    if (!_socket || !decorId) return;
    const toolType = ZS.Inventory?.getActiveItem?.()?.type || 'tool_caillou';
    _socket.emit('decor-mine', { id: decorId, toolType });
  }

  function requestDecorDoorToggle(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-toggle', { id: decorId });
  }

  function requestDecorDoorLock(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-lock', { id: decorId }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        if (res.keyDropped) {
          ZS.UI?.showNotif?.('Porte verrouillée — clé au sol (inventaire plein)');
        } else {
          ZS.UI?.showNotif?.('Porte verrouillée — clé reçue');
        }
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Verrouillage impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestDecorDoorUnlock(decorId, cb) {
    if (!_socket || !decorId) return;
    _socket.emit('decor-door-unlock', { id: decorId }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        ZS.UI?.showNotif?.('Verrou retiré');
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Retrait du verrou impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestUseItem(zone, index) {
    if (!_socket) return;
    _socket.emit('use-item', { zone, index });
  }

  function requestCraftQueue(recipeId) {
    if (!_socket) return Promise.resolve({ ok: false });
    return new Promise((resolve) => {
      _socket.emit('craft-queue', { recipeId }, (res) => resolve(res || { ok: false }));
    });
  }

  function requestCraftCancel(jobId) {
    if (!_socket) return;
    _socket.emit('craft-cancel', { jobId });
  }

  function getLocalUsername() {
    return _localUsername || localStorage.getItem('zombie_username') || '';
  }

  function requestStorageOpen(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-open', { id: decorId });
  }

  function requestStorageClose(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-close', { id: decorId });
  }

  function requestStorageDeposit(decorId, stack) {
    if (!_socket || !decorId || !stack?.type) return;
    _socket.emit('storage-deposit', {
      id: decorId,
      zone: stack.zone,
      index: stack.idx,
      qty: stack.qty || 1,
    });
  }

  function requestStorageWithdraw(decorId, slot) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-withdraw', { id: decorId, slot });
  }

  function requestStorageHit(decorId) {
    if (!_socket || !decorId) return;
    _socket.emit('storage-hit', { id: decorId });
  }

  function requestStoragePickup(decorId, cb) {
    if (!_socket || !decorId) return;
    const inv = ZS.Inventory?.getInvSnapshot?.();
    _socket.emit('storage-pickup', { id: decorId, inv }, (res) => {
      if (res?.ok) {
        if (res.inventory && ZS.Inventory?.applyAuthoritativeInv) {
          ZS.Inventory.applyAuthoritativeInv(res.inventory);
        }
        ZS.StorageUI?.closeIf?.(decorId);
        if (res.dropped > 0) {
          ZS.UI?.showNotif?.(`Coffre récupéré — ${res.dropped} pile(s) au sol (inventaire plein)`);
        } else {
          ZS.UI?.showNotif?.('Coffre récupéré');
        }
      } else {
        ZS.UI?.showNotif?.(res?.error || 'Récupération impossible');
      }
      if (typeof cb === 'function') cb(res);
    });
  }

  function requestBuildHit(decorId, toolType) {
    if (!_socket || !decorId || !toolType) return;
    _socket.emit('build-hit', { id: decorId, toolType });
  }

  function _patchDecorFloorHeight(id, y) {
    const entry = decorItems.get(id);
    if (!entry?.data) return;
    entry.data.y = y;
    entry.data.baseY = y;
    if (entry.root) {
      entry.root.position.y = y;
      if (entry.root.userData.decorSpec) entry.root.userData.decorSpec.baseY = y;
    }
  }

  function syncDecorFloorHeight(id, y) {
    if (!_socket || !id || !Number.isFinite(y)) return;
    _socket.emit('decor-floor-height', { id, y });
  }

  function _getDecorRoot(id) {
    return decorItems.get(id)?.root || null;
  }

  window.ZS = window.ZS || {};
  ZS.Network = {
    init, tick, sendMove, sendShoot, sendRespawn, sendDied, sendSurvival, sendEquip, sendAttack,
    notifyDecorChop, notifyDecorMine, requestDecorDoorToggle, requestDecorDoorLock, requestDecorDoorUnlock,
    getLocalUsername, syncWorldColliders: _syncWorldColliders,
    findNearestSleeping,
    getSocket: () => _socket,
    isSpawnReady: () => _spawnReady,
    requestStorageOpen, requestStorageClose, requestStorageDeposit, requestStorageWithdraw, requestStorageHit,
    requestStoragePickup,
    requestUseItem, requestCraftQueue, requestCraftCancel,
    requestBuildHit,
    getDecorRoot: _getDecorRoot,
    patchDecorFloorHeight: _patchDecorFloorHeight,
    syncDecorFloorHeight,
  };
}());
