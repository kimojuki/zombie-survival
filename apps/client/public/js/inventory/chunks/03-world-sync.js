// Spawn items monde + stacks — extrait de inventory.js (IIFE)
function spawnStructure(d) {
    const s = STRUCT[d.type];
    if (!s) return;
    const rotY  = d.rotY || 0;
    const baseY = (typeof d.y === 'number')
      ? d.y
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0);
    const mesh  = _buildStructureMesh(d.type);
    mesh.position.set(d.x, baseY, d.z);
    mesh.rotation.y = rotY;
    _scene.add(mesh);

    const structureColliderId = `structure_${d.id}`;
    const cols = ((d.colliders && d.colliders.length) ? d.colliders : _structureColliders(d.type, d.x, d.z, rotY, baseY, 0))
      .map((c) => ({ ...c, decorId: c.decorId || structureColliderId }));
    ZS.registerDecorColliders?.(structureColliderId, cols);
    ZS.Network?.syncWorldColliders?.();

    if (s.kind === 'floor') {
      ZS.registerUpperFloor?.(d.x, d.z, s.w / 2, s.t / 2, baseY + s.h);
      const level = Math.max(0, Math.round((baseY - (ZS.getTerrainHeight?.(d.x, d.z) ?? baseY)) / LEVEL_H));
      ZS.BuildAnchors?.registerFoundation(structureColliderId, d.x, d.z, baseY, {
        hw: s.w / 2,
        hd: s.t / 2,
        level: Number.isFinite(d.level) ? d.level : level,
      });
    } else if (s.kind === 'stair') {
      // La marche monte le long du +Z local. Selon rotY, ce +Z pointe vers ±Z ou ±X
      // dans le monde : on suit ce SENS pour que la rampe monte comme l'escalier visuel.
      const alongZ = Math.abs(Math.cos(rotY)) > 0.5;
      const sign   = alongZ ? Math.cos(rotY) : Math.sin(rotY);  // direction de montée
      const lo = sign >= 0 ? baseY : baseY + s.h;
      const hi = sign >= 0 ? baseY + s.h : baseY;
      ZS.registerRamp?.(d.x, d.z,
        alongZ ? s.w / 2 : s.t / 2,
        alongZ ? s.t / 2 : s.w / 2,
        lo, hi, alongZ ? 'z' : 'x');
    }
  }

  // ── World items ────────────────────────────────────────────────────────────

  function spawnWorldItem(d) {
    if (!_scene) {
      console.warn('[inventory] spawnWorldItem ignoré — scène non initialisée', d?.id);
      return;
    }
    if (_worldItems.has(d.id)) return;
    if (d?.introPersonal && d.ownerPlayerId != null && !_isPersonalLootOwner(d)) return;
    if (d.bag) {                                  // butin de mort (caisse)
      const mesh  = _makeBagMesh();
      const baseY = (ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(d.x, d.z)
        : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0)) + 0.45;
      mesh.position.set(d.x, baseY, d.z);
      mesh.userData.baseY = baseY;
      _scene.add(mesh);
      _worldItems.set(d.id, { mesh, type: 'death_bag', x: d.x, z: d.z, bag: true });
      return;
    }
    const def = _def(d.type);
    if (!def) return;
    const introWake = !!d.introPersonal && d.introBeat === 'wake' && d.type === 'tool_caillou';
    const mesh = _makePickupMesh(def, d.type, { introWake });
    const baseY = (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(d.x, d.z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(d.x, d.z) : 0)) + (introWake ? 0.42 : 0.55);
    mesh.position.set(d.x, baseY, d.z);
    mesh.userData.baseY = baseY;
    _scene.add(mesh);
    _worldItems.set(d.id, {
      mesh, type: d.type, x: d.x, z: d.z,
      lockId: d.lockId || null,
      ownerPlayerId: d.ownerPlayerId != null ? Number(d.ownerPlayerId) : null,
      introWake,
    });
  }

  function removeWorldItem(id) {
    const item = _worldItems.get(id);
    if (!item) return;
    _scene.remove(item.mesh);
    _worldItems.delete(id);
  }

  // ── Server pickup callback ─────────────────────────────────────────────────

  function receivePickup(type, qty) {
    if (type === 'map') return;
    if (_placePending && type === _placePendingType) {
      const placed = _fallbackBuildPlacement(_placePendingType, _placePendingTransform, _placePendingSpec);
      if (!placed) {
        _clearPlacePending();
        ZS.UI?.showNotif?.('Placement refusé');
      }
      return;
    }
    const n = Math.max(1, qty || 1);
    const added = addItem(type, n);
    const def = _def(type);
    if (def) ZS.UI.showNotif(added ? ('+' + n + ' ' + def.label) : 'Inventaire plein !');
  }

  // ── Inventory API (utilisé par Craft + Survival) ───────────────────────────

  function findItemSlot(type) {
    for (let i = 0; i < _hotbar.length; i++) {
      if (_hotbar[i]?.type === type) return { zone: 'hotbar', idx: i };
    }
    for (let i = 0; i < _bag.length; i++) {
      if (_bag[i]?.type === type) return { zone: 'bag', idx: i };
    }
    return null;
  }

  function countItem(type) {
    return [..._hotbar, ..._bag].reduce((n, s) => n + (s && s.type === type ? s.qty : 0), 0);
  }

  function removeItem(type, qty) {
    let left = qty;
    for (const arr of [_hotbar, _bag]) {
      for (let i = 0; i < arr.length && left > 0; i++) {
        if (!arr[i] || arr[i].type !== type) continue;
        const take = Math.min(arr[i].qty, left);
        arr[i].qty -= take;
        left -= take;
        if (arr[i].qty <= 0) arr[i] = null;
      }
    }
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    _syncToServer();
  }

  function getInvSnapshot() {
    return {
      hotbar: JSON.parse(JSON.stringify(_hotbar)),
      bag: JSON.parse(JSON.stringify(_bag)),
      equip: JSON.parse(JSON.stringify(_equip)),
    };
  }

  function syncToServer() {
    _syncToServer();
  }

  function getStorageStacks() {
    const out = [];
    const scan = (zone, arr) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s?.type) out.push({ zone, idx: i, type: s.type, qty: s.qty || 1 });
      }
    };
    scan('hotbar', _hotbar);
    scan('bag', _bag);
    return out;
  }

  function getStorageSlots() {
    const out = [];
    const scan = (zone, arr) => {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        out.push({
          zone,
          idx: i,
          type: s?.type || null,
          qty: s?.qty || 0,
        });
      }
    };
    scan('bag', _bag);
    scan('hotbar', _hotbar);
    return out;
  }

  function removeStack(zone, idx, qty) {
    const arr = zone === 'hotbar' ? _hotbar : zone === 'bag' ? _bag : null;
    if (!arr || idx < 0 || idx >= arr.length) return null;
    const s = arr[idx];
    if (!s?.type) return null;
    const take = Math.max(1, Math.min(s.qty || 1, qty || s.qty || 1));
    const out = { type: s.type, qty: take };
    s.qty = (s.qty || 1) - take;
    if (s.qty <= 0) arr[idx] = null;
    _renderHotbar();
    if (_panelOpen) _renderInvPanel();
    _syncToServer();
    return out;
  }

  function consumeOne(type) { removeItem(type, 1); }

  function placeActiveStructure() {
    const item = _hotbar[_active];
    const def = item ? _def(item.type) : null;
    if (!def || def.category !== 'structure') return false;
    _placeStructure();
    return true;
  }
