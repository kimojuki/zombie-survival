'use strict';

/** Décor, portes, storage, build, sleep — extrait de register-sockets.js (with deps) */
const DECOR_HANDLERS = `
  socket.on('decor-chop', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!item?.prefabId?.startsWith('tree_')) return;
    if (item.falling) return;
    if (Math.hypot(item.x - p.x, item.z - p.z) > 6) return;

    import(TREE_WOOD_URL).then(async ({ TREE_FALL_LINGER_MS, getChopWoodYield }) => {
      const woodMax = item.woodMax ?? _treeWoodForPhase(item.prefabId, item.growthPhase ?? 4);
      item.woodMax = woodMax;
      if (item.woodRemaining == null) item.woodRemaining = woodMax;

      const toolType = String(d.toolType || p.equipped || 'tool_caillou').slice(0, 60);
      const yieldReq = Math.max(1, Math.min(4, getChopWoodYield(toolType) || 1));
      const woodTaken = Math.min(yieldReq, item.woodRemaining);
      item.woodRemaining -= woodTaken;

      let invDirty = false;
      if (woodTaken > 0) {
        const res = _addStackToInv(p.inv, { type: 'res_bois_brut', qty: woodTaken });
        invDirty = true;
        if (res.leftover > 0) {
          _dropWorldItem('res_bois_brut', res.leftover, p.x, p.z);
        }
      }
      const wmod = _weaponStatsMod || await weaponStatsModPromise;
      const wearRes = _wearPlayerToolInv(p, toolType, wmod);
      if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);

      const base = {
        id,
        woodTaken,
        woodRemaining: item.woodRemaining,
        woodMax,
        growthPhase: item.growthPhase ?? 4,
        by: p.id,
      };

      if (item.woodRemaining <= 0) {
        item.falling = true;
        item.fellAt = Date.now();
        item.woodRemaining = 0;
        // Persistance immédiate : évite la résurrection au reload pendant le linger 90 s.
        worldPersist?.scheduleDeleteDecor(id, item, { markRemoved: true });
        io.emit('decor-tree-fell', {
          ...base,
          fallDirX: Number(d.dirX) || 0,
          fallDirZ: Number(d.dirZ) || 1,
        });
        setTimeout(() => {
          _removeDecorItem(id, { emit: true, force: true, markRemoved: false, keepInMemory: false });
        }, TREE_FALL_LINGER_MS);
      } else {
        _touchDecorItem(item);
        io.emit('decor-tree-chop', base);
      }
      log.debug('world', 'tree chop', {
        player: p.username,
        decorId: id,
        woodTaken,
        woodRemaining: item.woodRemaining,
      });
    });
  });

  // Récolte pierre sur rocher prefab — sync multijoueur
  socket.on('decor-mine', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!_isMinableRockPrefab(item?.prefabId)) return;
    if (Math.hypot(item.x - p.x, item.z - p.z) > 6) return;

    import(ROCK_STONE_URL).then(async ({ getRockStoneMax, getMineStoneYield }) => {
      const stoneMax = item.stoneMax ?? getRockStoneMax(item.prefabId);
      item.stoneMax = stoneMax;
      if (item.stoneRemaining == null) item.stoneRemaining = stoneMax;

      const toolType = String(d.toolType || p.equipped || 'tool_caillou').slice(0, 60);
      const yieldReq = Math.max(1, Math.min(6, getMineStoneYield(toolType) || 1));
      const stoneTaken = Math.min(yieldReq, item.stoneRemaining);
      item.stoneRemaining -= stoneTaken;

      let invDirty = false;
      if (stoneTaken > 0) {
        const res = _addStackToInv(p.inv, { type: 'res_pierre', qty: stoneTaken });
        invDirty = true;
        if (res.leftover > 0) {
          _dropWorldItem('res_pierre', res.leftover, p.x, p.z);
        }
      }
      const wmod = _weaponStatsMod || await weaponStatsModPromise;
      const wearRes = _wearPlayerToolInv(p, toolType, wmod);
      if (invDirty || wearRes.worn) _scheduleInvAuth(socket, p);

      const base = {
        id,
        stoneTaken,
        stoneRemaining: item.stoneRemaining,
        stoneMax,
        by: p.id,
      };

      if (item.stoneRemaining <= 0) {
        _removeDecorItem(id);
        io.emit('decor-rock-depleted', base);
      } else {
        _touchDecorItem(item);
        socket.broadcast.emit('decor-rock-mine', base);
      }
      log.debug('world', 'rock mine', {
        player: p.username,
        decorId: id,
        stoneTaken,
        stoneRemaining: item.stoneRemaining,
      });
    });
  });

  socket.on('decor-door-toggle', (d) => {
    const id = d?.id;
    if (!id || typeof id !== 'string') return;
    const item = decorItems.get(id);
    if (!item || !DOOR_PREFABS.has(item.prefabId)) return;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 6) return;
    if (item.locked && !_playerHasDoorKey(p.inv, item.lockId)) {
      socket.emit('door-error', { message: 'Porte verrouillée — clé requise' });
      return;
    }
    item.doorOpen = !item.doorOpen;
    _touchDecorItem(item);
    io.emit('decor-door-state', { id, open: !!item.doorOpen });
    log.debug('world', 'door toggled', {
      player: p.username,
      decorId: id,
      open: !!item.doorOpen,
    });
  });

  socket.on('decor-door-lock', (d, cb) => {
    const reply = (payload) => {
      socket.emit('door-lock-result', { ...payload, id: d?.id || null });
      if (typeof cb === 'function') cb(payload);
    };
    const item = _getNearbyDoor(d?.id, p.x, p.z);
    if (!item) {
      reply({ ok: false, error: 'Porte introuvable' });
      return;
    }
    if (item.locked) {
      reply({ ok: false, error: 'Déjà verrouillée' });
      return;
    }
    if (!_consumeInvType(p.inv, 'tool_verrou', 1)) {
      reply({ ok: false, error: 'Pas de verrou dans l\\'inventaire' });
      return;
    }
    const lockId = \`lock_\${Date.now()}_\${++doorLockSeq}\`;
    item.locked = true;
    item.lockId = lockId;
    item.lockOwner = p.username;
    p.dirty = true;
    const key = { type: 'struct_cle', qty: 1, lockId };
    const addResult = _addStackToInv(p.inv, key);
    let keyDropped = false;
    if (addResult.leftover > 0) {
      const ang = Math.random() * Math.PI * 2;
      _dropWorldItem(
        'struct_cle',
        addResult.leftover,
        item.x + Math.cos(ang) * 0.65,
        item.z + Math.sin(ang) * 0.65,
        { lockId },
      );
      keyDropped = true;
    }
    io.emit('door-lock-state', {
      id: item.id,
      locked: true,
      lockId,
      lockOwner: p.username,
    });
    _touchDecorItem(item);
    log.info('world', 'door locked', {
      player: p.username,
      decorId: item.id,
      lockId,
      keyDropped,
    });
    const invSnap = _cloneInv(p.inv);
    socket.emit('inventory-authoritative', invSnap);
    reply({ ok: true, lockId, keyDropped, inventory: invSnap });
  });

  socket.on('decor-door-unlock', (d, cb) => {
    const item = _getNearbyDoor(d?.id, p.x, p.z);
    if (!item || !item.locked) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Pas verrouillée' });
      return;
    }
    if (!_playerHasDoorKey(p.inv, item.lockId)) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Clé requise pour retirer le verrou' });
      return;
    }
    const oldLockId = item.lockId;
    item.locked = false;
    item.lockId = null;
    item.lockOwner = null;
    _consumeDoorKey(p.inv, oldLockId);
    p.dirty = true;
    const verrou = { type: 'tool_verrou', qty: 1 };
    const vres = _addStackToInv(p.inv, verrou);
    if (vres.leftover > 0) {
      _dropWorldItem('tool_verrou', vres.leftover, p.x + 0.3, p.z);
    }
    _emitInvAuth(socket, p);
    io.emit('door-lock-state', { id: item.id, locked: false, lockId: null, lockOwner: null });
    _touchDecorItem(item);
    log.info('world', 'door unlocked', { player: p.username, decorId: item.id });
    if (typeof cb === 'function') cb({ ok: true, lockId: oldLockId, inventory: _cloneInv(p.inv) });
  });

  async function _checkIntroSuitcaseEmptied(item) {
    if (!item?.introPersonal || item.prefabId !== 'spawn_beach_starter_suitcase') return;
    const capacity = _storageCapacity(item);
    const grid = _ensureChestGrid(item.storage, capacity);
    if (_chestFilledCount(grid) > 0) return;
    const lootMod = await _getIntroBeachBeats();
    lootMod.onSuitcaseEmptied(p, socket, item);
  }

  async function _getNearbyStorage(id) {
    const sid = id != null ? String(id) : '';
    if (!sid) return null;
    const item = decorItems.get(sid);
    if (!item || !STORAGE_PREFABS.has(item.prefabId)) return null;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 5) return null;
    if (item.introPersonal) {
      const lootMod = await _getIntroBeachBeats();
      if (!lootMod.canOpenStorage(p, item)) return null;
    }
    if (!Array.isArray(item.storage)) item.storage = [];
    return item;
  }

  socket.on('storage-open', async (d) => {
    const item = await _getNearbyStorage(d?.id);
    if (!item) return;
    item.storageOpen = true;
    io.emit('storage-state', { id: item.id, open: true });
    socket.emit('storage-open', _storagePayload(item));
  });

  socket.on('storage-close', async (d) => {
    const item = await _getNearbyStorage(d?.id);
    if (!item) return;
    item.storageOpen = false;
    io.emit('storage-state', { id: item.id, open: false });
  });

  socket.on('storage-deposit', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = await _getNearbyStorage(d?.id);
    const zone = d?.zone === 'bag' || d?.zone === 'hotbar' ? d.zone : null;
    const idx = Number(d?.index);
    const qty = Math.max(1, Math.min(999, Number(d?.qty) || 1));
    if (!item || zone == null || !Number.isFinite(idx)) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const stack = _removeFromSlot(p.inv, zone, idx, qty);
    if (!stack?.type) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const capacity = _storageCapacity(item);
    const grid = _ensureChestGrid(item.storage, capacity);
    if (_chestFilledCount(grid) >= capacity) {
      _addStackToInv(p.inv, stack);
      _emitInvAuth(socket, p);
      socket.emit('storage-error', { message: 'Coffre plein' });
      reply({ ok: false, err: 'full' });
      return;
    }
    const toIdx = Number.isFinite(Number(d?.toIndex))
      ? Number(d.toIndex)
      : grid.findIndex((s) => !s?.type);
    if (toIdx < 0 || toIdx >= capacity || grid[toIdx]?.type) {
      _addStackToInv(p.inv, stack);
      _emitInvAuth(socket, p);
      reply({ ok: false, err: 'full' });
      return;
    }
    grid[toIdx] = { type: stack.type, qty: stack.qty || 1 };
    item.storage = grid;
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    p.dirty = true;
    _emitInvAuth(socket, p);
    log.debug('storage', 'deposit', { player: p.username, decorId: item.id, type: stack.type, qty: stack.qty });
    reply({ ok: true });
  });

  socket.on('storage-withdraw', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = await _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, err: 'not_found' });
      return;
    }
    const capacity = _storageCapacity(item);
    const slot = Math.max(0, Math.floor(Number(d?.slot) || 0));
    const grid = _ensureChestGrid(item.storage, capacity);
    const stack = grid[slot];
    if (!stack?.type) {
      reply({ ok: false, err: 'empty' });
      return;
    }
    grid[slot] = null;
    item.storage = grid;
    const res = _addStackToInv(p.inv, { type: stack.type, qty: stack.qty || 1 });
    p.dirty = true;
    _emitInvAuth(socket, p);
    if (res.leftover > 0) {
      const backIdx = grid.findIndex((s) => !s?.type);
      if (backIdx >= 0) grid[backIdx] = { type: stack.type, qty: res.leftover };
      else {
        const fi = grid.findIndex((s) => !s?.type);
        if (fi >= 0) grid[fi] = { type: stack.type, qty: res.leftover };
      }
      item.storage = grid;
    }
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    await _checkIntroSuitcaseEmptied(item);
    log.debug('storage', 'withdraw', { player: p.username, decorId: item.id, type: stack.type });
    reply({ ok: true, leftover: res.leftover });
  });

  socket.on('storage-take-all', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = await _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, err: 'not_found' });
      return;
    }
    const capacity = _storageCapacity(item);
    const grid = _ensureChestGrid(item.storage, capacity);
    const overflow = [];
    for (let i = 0; i < capacity; i++) {
      const stack = grid[i];
      if (!stack?.type) continue;
      grid[i] = null;
      const res = _addStackToInv(p.inv, { type: stack.type, qty: stack.qty || 1 });
      if (res.leftover > 0) overflow.push({ type: stack.type, qty: res.leftover });
    }
    item.storage = grid;
    p.dirty = true;
    _emitInvAuth(socket, p);
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    for (let j = 0; j < overflow.length; j++) {
      const o = overflow[j];
      const ang = (j / Math.max(1, overflow.length)) * Math.PI * 2 + Math.random() * 0.4;
      _dropWorldItem(o.type, o.qty, p.x + Math.cos(ang) * 0.9, p.z + Math.sin(ang) * 0.9);
    }
    await _checkIntroSuitcaseEmptied(item);
    log.debug('storage', 'take-all', { player: p.username, decorId: item.id, overflow: overflow.length });
    reply({ ok: true, overflow: overflow.length });
  });

  socket.on('storage-move', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = await _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, err: 'not_found' });
      return;
    }
    const from = d?.from;
    const to = d?.to;
    if (!from?.zone || !to?.zone) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    const capacity = _storageCapacity(item);
    const result = _moveStorageTransfer(
      p.inv,
      item.storage,
      capacity,
      { zone: from.zone, index: from.index },
      { zone: to.zone, index: to.index },
    );
    if (!result.ok) {
      reply(result);
      return;
    }
    item.storage = result.grid;
    p.dirty = true;
    _emitInvAuth(socket, p);
    _emitStorageUpdate(item);
    _touchDecorItem(item);
    await _checkIntroSuitcaseEmptied(item);
    reply({ ok: true });
  });

  socket.on('storage-hit', async (d) => {
    const item = await _getNearbyStorage(d?.id);
    if (!item) return;
    if (item.introPersonal) {
      socket.emit('storage-error', { message: 'Impossible de casser cet objet' });
      return;
    }
    if (_isDecorImmutable(item)) {
      socket.emit('storage-error', { message: 'Coffre fixe — ne peut pas être cassé' });
      return;
    }
    item.breakHits = Math.max(0, Number(item.breakHits) || 0) + 1;
    if (item.breakHits < STORAGE_CHEST_BREAK_HITS) {
      _touchDecorItem(item);
      socket.emit('storage-error', { message: \`Coffre endommagé (\${item.breakHits}/\${STORAGE_CHEST_BREAK_HITS})\` });
      return;
    }
    const decorId = item.id;
    const baseX = Number(item.x) || p.x;
    const baseZ = Number(item.z) || p.z;
    const drops = [...(item.storage || []), { type: 'struct_storage_chest', qty: 1 }];
    _removeDecorItem(decorId);
    drops.forEach((stack, idx) => {
      const a = (idx / Math.max(1, drops.length)) * Math.PI * 2;
      const r = 0.45 + (idx % 3) * 0.18;
      _spawnWorldDrop(stack.type, stack.qty || 1, baseX + Math.cos(a) * r, baseZ + Math.sin(a) * r);
    });
    item.storage = [];
    socket.emit('storage-error', { message: 'Coffre cassé' });
    log.info('storage', 'break chest', {
      player: p.username,
      decorId: item.id,
      drops: drops.length,
      pos: { x: +(item.x || 0).toFixed(1), z: +(item.z || 0).toFixed(1) },
    });
  });

  socket.on('storage-pickup', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const item = await _getNearbyStorage(d?.id);
    if (!item) {
      reply({ ok: false, error: 'Coffre introuvable' });
      return;
    }
    if (item.introPersonal) {
      reply({ ok: false, error: 'Objet fixe' });
      return;
    }
    if (_isDecorImmutable(item)) {
      reply({ ok: false, error: 'Coffre fixe — ne peut pas être déplacé' });
      return;
    }
    const baseX = Number(item.x) || p.x;
    const baseZ = Number(item.z) || p.z;
    const stored = (Array.isArray(item.storage) ? item.storage : []).filter((s) => s?.type);
    let dropIdx = 0;
    let droppedStacks = 0;

    const chestRes = _addStackToInv(p.inv, { type: 'struct_storage_chest', qty: 1 });
    if (chestRes.leftover > 0) {
      _spawnChestOverflowDrop('struct_storage_chest', chestRes.leftover, baseX, baseZ, {}, dropIdx++);
      droppedStacks++;
    }

    for (const stack of stored) {
      const copy = {
        type: stack.type,
        qty: stack.qty || 1,
        ...(stack.lockId ? { lockId: stack.lockId } : {}),
        ...(stack.durability != null ? { durability: stack.durability } : {}),
        ...(stack.ammo != null ? { ammo: stack.ammo } : {}),
      };
      const res = _addStackToInv(p.inv, copy);
      if (res.leftover > 0) {
        const extra = {};
        if (copy.lockId) extra.lockId = copy.lockId;
        if (copy.durability != null) extra.durability = copy.durability;
        if (copy.ammo != null) extra.ammo = copy.ammo;
        _spawnChestOverflowDrop(copy.type, res.leftover, baseX, baseZ, extra, dropIdx++);
        droppedStacks++;
      }
    }

    item.storage = [];
    _removeDecorItem(item.id);
    io.emit('storage-state', { id: item.id, open: false });
    p.dirty = true;
    const invOut = _cloneInv(p.inv);
    socket.emit('inventory-authoritative', invOut);
    log.info('storage', 'pickup chest', {
      player: p.username,
      decorId: item.id,
      stored: stored.length,
      droppedStacks,
      pos: { x: +baseX.toFixed(1), z: +baseZ.toFixed(1) },
    });
    reply({ ok: true, dropped: droppedStacks, inventory: invOut });
  });

  socket.on('campfire-cook', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const decorId = String(d?.decorId || '');
    const item = decorItems.get(decorId);
    if (!item || item.prefabId !== 'spawn_campfire') {
      reply({ ok: false, error: 'Feu introuvable' });
      return;
    }
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 3.2) {
      reply({ ok: false, error: 'Trop loin du feu' });
      return;
    }
    if (!_consumeInvType(p.inv, 'food_viande_crue', 1)) {
      reply({ ok: false, error: 'Il te faut de la viande crue' });
      return;
    }
    const res = _addStackToInv(p.inv, { type: 'food_viande_cuite', qty: 1 });
    if (res.leftover > 0) {
      _addStackToInv(p.inv, { type: 'food_viande_crue', qty: 1 });
      reply({ ok: false, error: 'Inventaire plein' });
      return;
    }
    p.dirty = true;
    _emitInvAuth(socket, p);
    reply({ ok: true });
  });

  socket.on('camp-rest', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    const decorId = String(d?.decorId || '');
    const item = decorItems.get(decorId);
    if (!item || (item.prefabId !== 'spawn_bedroll' && item.prefabId !== 'spawn_lean_to')) {
      reply({ ok: false, error: 'Aucun couchage léger à proximité' });
      return;
    }
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 3.5) {
      reply({ ok: false, error: 'Trop loin' });
      return;
    }
    p.survival = p.survival || { ...DEFAULT_SURVIVAL };
    p.survival.endurance = Math.min(100, (p.survival.endurance || 0) + 10);
    p.dirty = true;
    _emitSurvivalUpdate(socket, p);
    reply({ ok: true, rested: true });
  });

  socket.on('bed-sleep-start', async (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (p.bedSleep) {
      reply({ ok: false, error: 'Déjà en train de dormir' });
      return;
    }
    if (p.health <= 0 || p._deathHandled) {
      reply({ ok: false, error: 'Impossible' });
      return;
    }
    const decorId = String(d?.decorId || '');
    const item = decorItems.get(decorId);
    const bedMod = await bedSleepModPromise;
    if (!item || !bedMod.isBedSleepPrefab(item.prefabId)) {
      reply({ ok: false, error: 'Aucun lit à proximité' });
      return;
    }
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 3.5) {
      reply({ ok: false, error: 'Trop loin du lit' });
      return;
    }
    const pose = _bedSleepPoseFromDecor(item, bedMod.BED_SLEEP_BODY_LIFT);
    p.bedSleep = { decorId, since: Date.now() };
    p.x = pose.x;
    p.y = pose.y;
    p.z = pose.z;
    p.rotY = pose.rotY;
    p.lastX = pose.x;
    p.lastZ = pose.z;
    p.dirty = true;
    _emitSurvivalUpdate(socket, p);
    socket.broadcast.emit('player-bed-sleep', {
      id: socket.id,
      username: p.username,
      sleeping: true,
      x: pose.x,
      y: pose.y,
      z: pose.z,
      rotY: pose.rotY,
    });
    reply({
      ok: true,
      decorId,
      x: pose.x,
      y: pose.y,
      z: pose.z,
      rotY: pose.rotY,
    });
  });

  socket.on('bed-sleep-wake', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (!p.bedSleep) {
      reply({ ok: false, error: 'Pas endormi' });
      return;
    }
    _wakeFromBedSleep(p, 'wake');
    reply({ ok: true, x: p.x, y: p.y, z: p.z, rotY: p.rotY });
  });

  socket.on('build-hit', async (d) => {
    const {
      getBuildDamage, getBuildMaxHp, isBuildPrefab,
      getDoorBreakDamage, getLockedDoorBreakMaxHp, isLockableDoorPrefab,
    } = await buildDamageModPromise;
    const id = String(d?.id || '').slice(0, 80);
    const toolType = String(d?.toolType || '').slice(0, 80);
    if (!id) return;
    const item = decorItems.get(id);
    if (!item) return;
    if (_isDecorImmutable(item)) return;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 4.5) return;

    const lockedDoor = !!item.locked && isLockableDoorPrefab(item.prefabId);
    let dmg;
    let maxHp;
    if (lockedDoor) {
      dmg = getDoorBreakDamage(toolType);
      maxHp = Number(item.doorBreakMaxHp) || getLockedDoorBreakMaxHp(item.prefabId);
    } else if (isBuildPrefab(item.prefabId)) {
      dmg = getBuildDamage(toolType);
      maxHp = Number(item.buildMaxHp) || getBuildMaxHp(item.prefabId);
    } else {
      return;
    }
    if (dmg <= 0 || maxHp <= 0) return;
    _wearPlayerTool(socket, p, toolType);

    const field = lockedDoor ? 'doorBreakDamage' : 'buildDamage';
    item[field] = Math.min(maxHp, (Number(item[field]) || 0) + dmg);
    if (item[field] < maxHp) {
      io.emit('build-damage', {
        id: item.id,
        damage: item[field],
        maxHp,
        toolType,
        kind: lockedDoor ? 'door' : 'build',
      });
      _touchDecorItem(item);
      return;
    }
    _removeDecorItem(item.id);
    io.emit('build-destroyed', { id: item.id, prefabId: item.prefabId, kind: lockedDoor ? 'door' : 'build' });
    log.info('build', lockedDoor ? 'locked door destroyed' : 'wood structure destroyed', {
      player: p.username,
      decorId: item.id,
      prefabId: item.prefabId,
      toolType,
      pos: { x: +(item.x || 0).toFixed(1), z: +(item.z || 0).toFixed(1) },
    });
  });

  socket.on('place-structure', (d, cb) => {
    const reply = (payload) => { if (typeof cb === 'function') cb(payload); };
    if (!d || typeof d.type !== 'string' || !d.type.startsWith('struct_')) {
      reply({ ok: false, err: 'invalid' });
      return;
    }
    if (!_removeStackFromInv(p.inv, d.type, 1)) {
      reply({ ok: false, err: 'no_item' });
      return;
    }
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    if (!isFinite(x) || !isFinite(z)) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'invalid_pos' });
      return;
    }
    if (Math.hypot(x - p.x, z - p.z) > 16) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'too_far' });
      return;
    }
    if (_isBuildBlockedOnBeach(x, z)) {
      _addStackToInv(p.inv, { type: d.type, qty: 1 });
      reply({ ok: false, err: 'beach_protected' });
      return;
    }
    const colliders = Array.isArray(d.colliders)
      ? d.colliders.filter(c => c && c.type === 'box' &&
          isFinite(c.cx) && isFinite(c.cz) && isFinite(c.hw) && isFinite(c.hd)).slice(0, 4)
      : [];
    const id = ++structureIdCounter;
    const st = { id, type: d.type, x, z, rotY, owner: p.id };
    if (isFinite(y)) st.y = y;
    st.colliders = colliders;
    structures.set(id, st);
    worldPersist.scheduleUpsertStructure(st);
    for (const c of colliders) if (c.minY === undefined) structureColliders.push(c);
    io.emit('structure-spawn', st);
    p.dirty = true;
    _emitInvAuth(socket, p);
    log.info('build', 'structure placed', { player: p.username, type: d.type });
    reply({ ok: true, id });
  });

  socket.on('place-decor-prefab', (d, cb) => {
    const itemType = String(d?.itemType || '').slice(0, 80);
    const prefabId = String(d?.prefabId || '').slice(0, 80);
    const reject = (error) => {
      if (typeof cb === 'function') cb({ ok: false, error });
    };
    if (!itemType || DECOR_PREFAB_BY_ITEM[itemType] !== prefabId) {
      reject('Prefab invalide');
      return;
    }
    const x = Number(d.x), z = Number(d.z), rotY = Number(d.rotY) || 0;
    const y = Number(d.y);
    const baseY = Number(d.baseY);
    const buildLevel = Number(d.buildLevel);
    const supportGroundY = Number(d.supportGroundY);
    if (!isFinite(x) || !isFinite(z)) {
      reject('Position invalide');
      return;
    }
    if (Math.hypot(x - p.x, z - p.z) > 16) {
      reject('Trop loin');
      return;
    }
    if (_isBuildBlockedOnBeach(x, z)) {
      reject(BEACH_BUILD_BLOCKED_MSG);
      return;
    }
    if (!_removeStackFromInv(p.inv, itemType, 1)) {
      reject('Objet manquant');
      return;
    }
    const item = _makeDecorItem({
      kind: 'prefab',
      prefabId,
      x,
      y: Number.isFinite(baseY) ? Math.max(-1, Math.min(30, baseY))
        : (Number.isFinite(y) ? Math.max(-1, Math.min(30, y)) : 0),
      z,
      rotX: 0,
      rotY,
      rotZ: 0,
      scale: 1,
      createdBy: p.username,
      createdAt: Date.now(),
      persist: true,
      ...(Number.isFinite(baseY) ? { baseY: Math.max(-1, Math.min(30, baseY)) } : {}),
      ...(Number.isFinite(buildLevel) ? { buildLevel: Math.max(0, Math.min(8, buildLevel)) } : {}),
      ...(Number.isFinite(supportGroundY) ? { supportGroundY: Math.max(-1, Math.min(30, supportGroundY)) } : {}),
    });
    io.emit('decor-item-spawn', item);
    p.dirty = true;
    _emitInvAuth(socket, p);
    log.info('build', 'decor prefab placed', {
      player: p.username,
      prefabId: item.prefabId,
      decorId: item.id,
      pos: { x: +x.toFixed(1), z: +z.toFixed(1) },
    });
    if (typeof cb === 'function') cb({ ok: true, id: item.id });
  });

  socket.on('decor-floor-height', (d) => {
    const item = decorItems.get(String(d?.id || ''));
    const pid = item?.prefabId || '';
    const isBuildWood = pid.startsWith('build_') && pid.endsWith('_wood');
    if (!item || (!isBuildWood && pid !== 'storage_chest')) return;
    if (Math.hypot((item.x || 0) - p.x, (item.z || 0) - p.z) > 8) return;
    const y = Number(d.y);
    if (!Number.isFinite(y)) return;
    item.y = Math.max(-1, Math.min(30, y));
    item.baseY = item.y;
    _touchDecorItem(item);
  });
`;

module.exports = { DECOR_HANDLERS };
