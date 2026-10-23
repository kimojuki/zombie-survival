// Sync décor + snap murs/plafonds — build_anchors.js
function syncRegistryFromDecor(list) {
    if (!Array.isArray(list)) return;
    for (const d of list) {
      if (!d?.id) continue;
      if (d.prefabId === 'build_floor_wood') {
        const baseY = Number.isFinite(d.baseY) ? d.baseY : (Number.isFinite(d.y) ? d.y : null);
        if (!Number.isFinite(baseY)) continue;
        const rawLevel = Number.isFinite(d.buildLevel) ? d.buildLevel : 0;
        registerFoundation(d.id, d.x, d.z, baseY, {
          hw: 1.5,
          hd: 1.5,
          level: rawLevel,
        });
      } else if (d.prefabId === 'build_ceiling_wood') {
        const baseY = Number.isFinite(d.baseY) ? d.baseY : (Number.isFinite(d.y) ? d.y : null);
        if (!Number.isFinite(baseY)) continue;
        const rawLevel = Number.isFinite(d.buildLevel) ? d.buildLevel : 0;
        registerFoundation(d.id, d.x, d.z, baseY + 0.18, {
          hw: 1.5,
          hd: 1.5,
          level: rawLevel + 1,
        });
      }
    }
    sanitizeAllFoundations();
  }

  /** Re-clamp toutes les fondations (corrige niveaux/hauteurs corrompus en mémoire). */
  function sanitizeAllFoundations() {
    for (const [id, f] of [..._floors.entries()]) {
      registerFoundation(id, f.cx, f.cz, f.baseY, { hw: f.hw, hd: f.hd, level: f.level });
    }
  }

  /** Fondation crédible (ignore les dalles « ciel » restées en mémoire). */
  function _isCoherentDeck(f) {
    if (!f || !Number.isFinite(f.baseY)) return false;
    const ground = _terrainDeckY(f.cx, f.cz, 0);
    if (ground == null) return f.baseY < 12;
    if (f.baseY < ground - 0.35) return false;
    const eff = _effectiveFloorLevel(f.cx, f.cz, f.baseY, f.level ?? 0);
    const localCeiling = ground + eff * LEVEL_H + 0.55;
    if (f.baseY <= localCeiling) return true;
    const hardCeiling = MAP_TERRAIN_MAX + eff * LEVEL_H + 0.75;
    if (f.baseY > hardCeiling) return false;
    const absurdTop = ground + Math.max(eff + 2, 3) * LEVEL_H + 1.5;
    if (f.baseY > absurdTop) return false;
    // Dalle surélevée pour joindre une voisine (pente / cluster unifié)
    for (const n of _neighborsAtRaw(f.cx, f.cz)) {
      if (Math.abs(f.baseY - n.baseY) <= 0.12) return true;
    }
    return false;
  }

  function _wallAnchorAt(f, dir) {
    const { cx, cz, hw, hd } = f;
    if (dir === 'n') return { x: cx, z: cz + hd, rotY: 0 };
    if (dir === 's') return { x: cx, z: cz - hd, rotY: 0 };
    if (dir === 'e') return { x: cx + hw, z: cz, rotY: Math.PI / 2 };
    return { x: cx - hw, z: cz, rotY: Math.PI / 2 };
  }

  /** Bord partagé avec une autre fondation au même niveau → pas de mur intérieur. */
  function _floorSharesEdge(f, g, dir) {
    if (Math.abs(f.baseY - g.baseY) > 0.2) return false;
    const eps = 0.28;
    if (dir === 'n') {
      return Math.abs((g.cz - g.hd) - (f.cz + f.hd)) < eps
        && Math.abs(g.cx - f.cx) < f.hw + g.hw - eps;
    }
    if (dir === 's') {
      return Math.abs((g.cz + g.hd) - (f.cz - f.hd)) < eps
        && Math.abs(g.cx - f.cx) < f.hw + g.hw - eps;
    }
    if (dir === 'e') {
      return Math.abs((g.cx - g.hw) - (f.cx + f.hw)) < eps
        && Math.abs(g.cz - f.cz) < f.hd + g.hd - eps;
    }
    if (dir === 'w') {
      return Math.abs((g.cx + g.hw) - (f.cx - f.hw)) < eps
        && Math.abs(g.cz - f.cz) < f.hd + g.hd - eps;
    }
    return false;
  }

  function _isExposedWallEdge(f, dir, selfId) {
    for (const [id, g] of _floors.entries()) {
      if (id === selfId) continue;
      if (!_isCoherentDeck(g)) continue;
      if (_floorSharesEdge(f, g, dir)) return false;
    }
    return true;
  }

  /** Distance perpendiculaire à un bord de fondation (plus tolérant que le centre seul). */
  function _perpDistToWallEdge(px, pz, f, dir) {
    const { cx, cz, hw, hd } = f;
    if (dir === 'n') {
      const z = cz + hd;
      if (Math.abs(px - cx) > hw + 0.45) return null;
      return { d: Math.abs(pz - z), x: cx, z, rotY: 0 };
    }
    if (dir === 's') {
      const z = cz - hd;
      if (Math.abs(px - cx) > hw + 0.45) return null;
      return { d: Math.abs(pz - z), x: cx, z, rotY: 0 };
    }
    if (dir === 'e') {
      const x = cx + hw;
      if (Math.abs(pz - cz) > hd + 0.45) return null;
      return { d: Math.abs(px - x), x, z: cz, rotY: Math.PI / 2 };
    }
    const x = cx - hw;
    if (Math.abs(pz - cz) > hd + 0.45) return null;
    return { d: Math.abs(px - x), x, z: cz, rotY: Math.PI / 2 };
  }

  function _snapWallFromPoint(px, pz, buildLevel) {
    let best = null;
    let bestD = SNAP_R_WALL;
    for (const [id, f] of _floors.entries()) {
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      for (const dir of ['n', 's', 'e', 'w']) {
        if (!_isExposedWallEdge(f, dir, id)) continue;
        const hit = _perpDistToWallEdge(px, pz, f, dir);
        if (!hit || hit.d >= bestD) continue;
        bestD = hit.d;
        best = { ...hit, baseY: f.baseY, level: f.level, dir, id };
      }
    }
    return best;
  }

  /** Visée joueur → bord de fondation le plus aligné (secours si le point devant le joueur rate). */
  function _snapWallFromView(playerX, playerZ, yaw, buildLevel) {
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    let best = null;
    let bestScore = -Infinity;
    for (const [id, f] of _floors.entries()) {
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      for (const dir of ['n', 's', 'e', 'w']) {
        if (!_isExposedWallEdge(f, dir, id)) continue;
        const a = _wallAnchorAt(f, dir);
        const toX = a.x - playerX;
        const toZ = a.z - playerZ;
        const dist = Math.hypot(toX, toZ);
        if (dist > 7.5 || dist < 0.12) continue;
        const dot = (toX * fwdX + toZ * fwdZ) / dist;
        if (dot < 0.2) continue;
        const score = dot * 3 - dist * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = { x: a.x, z: a.z, rotY: a.rotY, baseY: f.baseY, level: f.level };
        }
      }
    }
    return best;
  }

  /** Même borne anti-ciel pour murs/portes/escaliers posés sur une fondation. */
  function clampStructureBaseY(px, pz, baseY, buildLevel = 0) {
    return clampFloorDeckY(px, pz, baseY, buildLevel);
  }

  /** Hauteur dalle sous un mur/porte/escalier (fondation la plus proche). */
  function resolveStructureBaseY(px, pz, fallbackY, buildLevel = 0) {
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const deck = findFoundationDeckNear(px, pz, lvl);
    if (deck) return deck.baseY;
    let bestY = null;
    let bestD = SNAP_R_WALL;
    for (const f of _floors.values()) {
      if (!_isCoherentDeck(f)) continue;
      if (lvl > 0 && f.level !== lvl) continue;
      const d = Math.hypot(f.cx - px, f.cz - pz);
      if (d >= bestD) continue;
      bestD = d;
      bestY = f.baseY;
    }
    if (bestY != null) {
      return clampStructureBaseY(px, pz, bestY, lvl);
    }
    let y = Number.isFinite(fallbackY) ? fallbackY : (_terrainDeckY(px, pz, lvl) ?? 0);
    y = clampStructureBaseY(px, pz, y, lvl);
    const y0 = clampStructureBaseY(px, pz, y, 0);
    return y0 < y - 0.35 ? y0 : y;
  }

  function _floorMatchesBuildLevel(f, buildLevel) {
    if (!_isCoherentDeck(f)) return false;
    if (buildLevel <= 0) return true;
    return f.level === buildLevel;
  }

  /**
   * Accroche la pose au point d'ancrage le plus proche.
   * Fondations : reprend la hauteur du voisin (ignore l'étage sélectionné).
   */
  function snapPlacement(rawX, rawZ, structKind, preferredRotY, buildLevel, opts = {}) {
    const kinds = _targetKinds(structKind);
    if (!kinds.length) return null;

    if (structKind === 'floor') {
      const placed = _snapFloorPlacement(rawX, rawZ, preferredRotY, buildLevel);
      if (placed) return placed;
    }
    if (structKind === 'ceiling') {
      const placed = _snapCeilingPlacement(rawX, rawZ, preferredRotY, buildLevel);
      if (placed) return placed;
    }

    const isWallLike = structKind === 'wall' || structKind === 'door' || structKind === 'doorway';
    const snapR = structKind === 'floor' ? SNAP_R_FLOOR
      : structKind === 'ceiling' ? SNAP_R
        : isWallLike ? SNAP_R_WALL
          : SNAP_R;

    let best = null;
    let bestD = snapR;

    if (isWallLike) {
      const edgeHit = _snapWallFromPoint(rawX, rawZ, buildLevel);
      if (edgeHit) {
        best = edgeHit;
        bestD = edgeHit.d;
      }
      if (!best && Number.isFinite(opts.playerX) && Number.isFinite(opts.playerZ)) {
        const viewHit = _snapWallFromView(opts.playerX, opts.playerZ, preferredRotY, buildLevel);
        if (viewHit) best = viewHit;
      }
    }

    if (!best) {
      for (const f of _floors.values()) {
        if (structKind !== 'floor' && !_floorMatchesBuildLevel(f, buildLevel)) continue;
        for (const a of _anchorsForFloor(f)) {
          if (!kinds.includes(a.kind)) continue;
          const d = Math.hypot(a.x - rawX, a.z - rawZ);
          if (d >= bestD) continue;
          bestD = d;
          best = a;
        }
      }
    }
    if (!best) return null;

    const ax = best.x;
    const az = best.z;
    const unified = structKind === 'floor'
      ? computeUnifiedFloorHeight(ax, az, _terrainDeckY(ax, az, buildLevel) ?? best.baseY, null, buildLevel)
      : null;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const rawBaseY = unified ? unified.targetY : best.baseY;
    const baseY = (isWallLike || structKind === 'stair')
      ? resolveStructureBaseY(ax, az, rawBaseY, lvl)
      : rawBaseY;

    return {
      x: ax,
      z: az,
      rotY: (isWallLike || best.rotY != null) ? best.rotY : preferredRotY,
      baseY,
      level: lvl,
      snapped: true,
      anchorKind: best.kind || 'wall',
    };
  }

  /** Mur/porte sans ancrage exact : fondation sous la visée → reprend son baseY. */
