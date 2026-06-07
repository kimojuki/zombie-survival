// Points d'ancrage fondations — 4 bords (murs) + 4 extensions (fondations voisines)
(function () {
  'use strict';

  const CELL = 3.0;
  const SNAP_R = 1.75;
  const LEVEL_H = 2.6;
  /** Épaisseur dalle fondation (spawn_clearing build_floor_wood). */
  const FLOOR_DECK_H = 0.18;
  /** Extensions fondation voisine à ±CELL — rayon plus large que les murs. */
  const SNAP_R_FLOOR = CELL + 1.5;
  /** Murs/portes : même portée que les ancrages fondation. */
  const SNAP_R_WALL = SNAP_R_FLOOR;

  /** Hauteur dalle au sol brut (pas raycast décor/toits). */
  function _terrainDeckY(cx, cz, level = 0) {
    if (ZS.getTerrainHeight) {
      return ZS.getTerrainHeight(cx, cz) + Math.max(0, level) * LEVEL_H;
    }
    return null;
  }

  /** Niveau réel = delta baseY/terrain, pas un buildLevel inféré depuis Y absolu. */
  function _effectiveFloorLevel(cx, cz, baseY, storedLevel = 0) {
    const ground = _terrainDeckY(cx, cz, 0);
    if (ground == null || !Number.isFinite(baseY)) {
      return Math.max(0, Math.min(8, Math.floor(Number(storedLevel) || 0)));
    }
    const delta = baseY - ground;
    if (delta < 0.35) return 0;
    const maybeTier = Math.max(0, Math.min(8, Math.round(delta / LEVEL_H)));
    if (delta > LEVEL_H + 0.5 && Math.abs(delta - maybeTier * LEVEL_H) > 0.35) return 0;
    const stored = Math.max(0, Math.min(8, Math.floor(Number(storedLevel) || 0)));
    if (Math.abs(delta - stored * LEVEL_H) > 1.25) return maybeTier;
    return stored;
  }

  /** Anti bug ciel — plafond absolu basé sur le relief max connu (~7,5 m). */
  const MAP_TERRAIN_MAX = 7.5;

  /** Anti bug ciel uniquement — ne ramène pas une dalle unifiée (pente / voisin). */
  function clampFloorDeckY(cx, cz, deckY, buildLevel = 0) {
    const terrain = _terrainDeckY(cx, cz, 0);
    if (terrain == null || !Number.isFinite(deckY)) {
      return Number.isFinite(deckY) ? deckY : (terrain ?? 0);
    }
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const legitTop = terrain + lvl * LEVEL_H + 0.45;
    const hardCeiling = MAP_TERRAIN_MAX + lvl * LEVEL_H + 0.75;
    if (deckY > hardCeiling) return legitTop;
    const absurdTop = terrain + Math.max(lvl + 2, 3) * LEVEL_H + 1.5;
    if (deckY > absurdTop) return legitTop;
    if (deckY < terrain - 0.25 && lvl === 0) return terrain;
    return deckY;
  }

  /** Cible groupe = max du terrain sous chaque cellule (pas des baseY stockés erronés). */
  function _clusterTargetY(cluster, px, pz, fallbackY, buildLevel = 0) {
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    let targetY = _terrainDeckY(px, pz, lvl);
    if (targetY == null) targetY = Number.isFinite(fallbackY) ? fallbackY : 0;
    let usedTerrain = targetY != null && ZS.getTerrainHeight;
    for (const f of cluster.values()) {
      if (!_isCoherentDeck(f)) continue;
      const t = _terrainDeckY(f.cx, f.cz, lvl);
      if (t != null) {
        usedTerrain = true;
        if (t > targetY) targetY = t;
      }
      const ground = _terrainDeckY(f.cx, f.cz, 0);
      if (ground != null && f.baseY > targetY && f.baseY <= ground + lvl * LEVEL_H + 0.65) {
        targetY = f.baseY;
      }
    }
    if (!usedTerrain) {
      for (const f of cluster.values()) {
        if (!_isCoherentDeck(f)) continue;
        if (f.baseY > targetY) targetY = f.baseY;
      }
    }
    return targetY;
  }

  /** @type {Map<string, { cx:number, cz:number, baseY:number, level:number, hw:number, hd:number }>} */
  const _floors = new Map();

  function registerFoundation(id, cx, cz, baseY, opts = {}) {
    if (!id) return;
    const cxN = Number(cx) || 0;
    const czN = Number(cz) || 0;
    const rawLevel = Math.max(0, Math.min(8, Number(opts.level) || 0));
    const yRaw = Number.isFinite(Number(baseY)) ? Number(baseY) : (_terrainDeckY(cxN, czN, 0) ?? 0);
    let y = clampFloorDeckY(cxN, czN, yRaw, rawLevel);
    const yGround = clampFloorDeckY(cxN, czN, yRaw, 0);
    if (yGround < y - 0.35) y = yGround;
    const level = _effectiveFloorLevel(cxN, czN, y, 0);
    _floors.set(String(id), {
      cx: cxN,
      cz: czN,
      baseY: y,
      level,
      hw: Number.isFinite(opts.hw) ? opts.hw : 1.5,
      hd: Number.isFinite(opts.hd) ? opts.hd : 1.5,
    });
  }

  function unregisterFoundation(id) {
    if (id) _floors.delete(String(id));
  }

  function clear() {
    _floors.clear();
  }

  function _anchorsForFloor(f) {
    const { cx, cz, baseY, level, hw, hd } = f;
    return [
      { kind: 'wall', x: cx, z: cz + hd, rotY: 0, baseY, level, dir: 'n' },
      { kind: 'wall', x: cx, z: cz - hd, rotY: 0, baseY, level, dir: 's' },
      { kind: 'wall', x: cx + hw, z: cz, rotY: Math.PI / 2, baseY, level, dir: 'e' },
      { kind: 'wall', x: cx - hw, z: cz, rotY: Math.PI / 2, baseY, level, dir: 'w' },
      { kind: 'floor', x: cx, z: cz + CELL, rotY: 0, baseY, level, dir: 'n' },
      { kind: 'floor', x: cx, z: cz - CELL, rotY: 0, baseY, level, dir: 's' },
      { kind: 'floor', x: cx + CELL, z: cz, rotY: 0, baseY, level, dir: 'e' },
      { kind: 'floor', x: cx - CELL, z: cz, rotY: 0, baseY, level, dir: 'w' },
      { kind: 'ceiling', x: cx, z: cz, rotY: 0, baseY: baseY + LEVEL_H, level, dir: 'center' },
    ];
  }

  function _targetKinds(structKind) {
    if (structKind === 'floor') return ['floor'];
    if (structKind === 'ceiling') return ['ceiling'];
    if (structKind === 'wall' || structKind === 'door' || structKind === 'doorway') return ['wall'];
    if (structKind === 'stair') return ['floor', 'wall'];
    return [];
  }

  /**
   * Fondation voisine : ancrage extension le plus proche de la visée.
   */
  function _snapFloorPlacement(rawX, rawZ, preferredRotY, buildLevel = 0) {
    let best = null;
    let bestD = SNAP_R_FLOOR;
    for (const f of _floors.values()) {
      if (!_isCoherentDeck(f)) continue;
      for (const a of _anchorsForFloor(f)) {
        if (a.kind !== 'floor') continue;
        const d = Math.hypot(a.x - rawX, a.z - rawZ);
        if (d >= bestD) continue;
        bestD = d;
        best = a;
      }
    }
    if (!best) return null;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const unified = computeUnifiedFloorHeight(
      best.x, best.z, _terrainDeckY(best.x, best.z, lvl) ?? best.baseY, null, lvl,
    );
    return {
      x: best.x,
      z: best.z,
      rotY: preferredRotY,
      baseY: unified.targetY,
      level: lvl,
      snapped: true,
      anchorKind: 'floor',
    };
  }

  /** Fondation sous une cellule (centre ou intérieur de dalle). */
  function findFoundationUnderCell(px, pz, buildLevel = 0) {
    let best = null;
    let bestD = Infinity;
    for (const [id, f] of _floors.entries()) {
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      if (!_isCoherentDeck(f)) continue;
      const onDeck = Math.abs(px - f.cx) <= f.hw + 0.35 && Math.abs(pz - f.cz) <= f.hd + 0.35;
      if (!onDeck) continue;
      const d = Math.hypot(px - f.cx, pz - f.cz);
      if (d >= bestD) continue;
      bestD = d;
      best = { id, cx: f.cx, cz: f.cz, baseY: f.baseY, level: f.level, hw: f.hw, hd: f.hd };
    }
    return best;
  }

  /**
   * Plafond : centre de fondation, baseY = sommet du mur (dalle + LEVEL_H).
   */
  function _snapCeilingPlacement(rawX, rawZ, preferredRotY, buildLevel = 0) {
    let best = null;
    let bestD = SNAP_R;
    for (const f of _floors.values()) {
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      if (!_isCoherentDeck(f)) continue;
      for (const a of _anchorsForFloor(f)) {
        if (a.kind !== 'ceiling') continue;
        const d = Math.hypot(a.x - rawX, a.z - rawZ);
        if (d >= bestD) continue;
        bestD = d;
        best = a;
      }
    }
    if (!best) return null;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    return {
      x: best.x,
      z: best.z,
      rotY: preferredRotY,
      baseY: best.baseY,
      level: lvl,
      snapped: true,
      anchorKind: 'ceiling',
    };
  }

  /** Hauteur de pose plafond (bas de dalle = sommet mur). */
  function resolveCeilingDeckY(px, pz, buildLevel = 0) {
    const under = findFoundationUnderCell(px, pz, buildLevel);
    if (under) return under.baseY + LEVEL_H;
    const deck = findFoundationDeckNear(px, pz, buildLevel);
    if (deck) return deck.baseY + LEVEL_H;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const terrain = _terrainDeckY(px, pz, lvl);
    if (terrain != null) return terrain + (lvl + 1) * LEVEL_H;
    return null;
  }

  /** Repères plafond (centre haut de chaque fondation). */
  function listCeilingAnchors(maxDist, px, pz, buildLevel = 0) {
    const out = [];
    for (const [id, f] of _floors.entries()) {
      if (maxDist > 0 && Math.hypot(f.cx - px, f.cz - pz) > maxDist) continue;
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      if (!_isCoherentDeck(f)) continue;
      out.push({ x: f.cx, z: f.cz, baseY: f.baseY + LEVEL_H, level: f.level, id });
    }
    return out;
  }

  function _isNeighborCell(px, pz, f) {
    const dx = px - f.cx;
    const dz = pz - f.cz;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.35) return false;
    if (dist < 0.55) return true;
    if (dist < CELL * 0.45 || dist > CELL * 1.55) return false;
    return Math.min(Math.abs(dx), Math.abs(dz)) <= Math.max(f.hw, f.hd) + 1.05;
  }

  /** Voisins géométriques sans filtre cohérence (évite récursion avec _isCoherentDeck). */
  function _neighborsAtRaw(px, pz, excludeId) {
    const out = [];
    for (const [id, f] of _floors.entries()) {
      if (excludeId && id === excludeId) continue;
      if (!_isNeighborCell(px, pz, f)) continue;
      out.push({ id, cx: f.cx, cz: f.cz, baseY: f.baseY, level: f.level, hw: f.hw, hd: f.hd });
    }
    return out;
  }

  function listAdjacentFoundations(px, pz, excludeId) {
    const out = [];
    for (const n of _neighborsAtRaw(px, pz, excludeId)) {
      const f = _floors.get(n.id);
      if (!f || !_isCoherentDeck(f)) continue;
      out.push(n);
    }
    return out;
  }

  /** Groupe connexe de fondations touchant (px,pz), sans la cellule excludeId. */
  function _connectedCluster(px, pz, excludeId) {
    const cluster = new Map();
    const queue = listAdjacentFoundations(px, pz, excludeId);
    for (const n of queue) cluster.set(n.id, n);
    let qi = 0;
    while (qi < queue.length) {
      const f = queue[qi++];
      for (const [id, g] of _floors.entries()) {
        if (excludeId && id === excludeId) continue;
        if (cluster.has(id)) continue;
        if (!_isCoherentDeck(g)) continue;
        if (!_isNeighborCell(f.cx, f.cz, g)) continue;
        const entry = { id, cx: g.cx, cz: g.cz, baseY: g.baseY, level: g.level, hw: g.hw, hd: g.hd };
        cluster.set(id, entry);
        queue.push(entry);
      }
    }
    return cluster;
  }

  /**
   * Hauteur unifiée = max(terrain/fallback, toutes les fondations voisines connectées).
   * Retourne aussi les voisines plus basses à remonter.
   */
  function computeUnifiedFloorHeight(px, pz, fallbackY, excludeId, buildLevel = 0) {
    const fb = Number.isFinite(fallbackY) ? fallbackY : (_terrainDeckY(px, pz) ?? 0);
    const cluster = _connectedCluster(px, pz, excludeId);
    if (!cluster.size) {
      return {
        targetY: clampFloorDeckY(px, pz, fb, buildLevel),
        level: Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0))),
        toLift: [],
      };
    }

    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const targetY = clampFloorDeckY(
      px, pz, _clusterTargetY(cluster, px, pz, fb, lvl), lvl,
    );
    const toLift = [];
    for (const f of cluster.values()) {
      if (!_isCoherentDeck(f)) continue;
      if (Math.abs(f.baseY - targetY) > 0.02) toLift.push(f);
    }
    return { targetY, level: lvl, toLift };
  }

  /**
   * Cellule voisine → hauteur unifiée du groupe (max terrain du groupe).
   */
  function findAdjacentFloorHeight(px, pz, buildLevel = 0) {
    const neighbors = listAdjacentFoundations(px, pz);
    if (!neighbors.length) return null;
    const fb = _terrainDeckY(px, pz, buildLevel) ?? 0;
    const u = computeUnifiedFloorHeight(px, pz, fb, null, buildLevel);
    return { baseY: u.targetY, level: u.level };
  }

  /** Hauteur dalle pour pose/spawn — source unique. */
  function resolveFloorDeckY(px, pz, fallbackY, excludeId, buildLevel = 0) {
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const terrain = _terrainDeckY(px, pz, lvl);
    const hasNeighbors = listAdjacentFoundations(px, pz, excludeId).length > 0;
    let y;
    if (hasNeighbors) {
      y = computeUnifiedFloorHeight(px, pz, fallbackY, excludeId, lvl).targetY;
    } else if (terrain != null) {
      y = terrain;
    } else {
      y = Number.isFinite(fallbackY) ? fallbackY : 0;
    }
    y = clampFloorDeckY(px, pz, y, lvl);
    const y0 = clampFloorDeckY(px, pz, y, 0);
    if (y0 < y - 0.35) y = y0;
    return y;
  }

  function _floorEntry(id, f) {
    return { id, cx: f.cx, cz: f.cz, baseY: f.baseY, level: f.level, hw: f.hw, hd: f.hd };
  }

  function _areNeighborFloors(a, b) {
    return _isNeighborCell(a.cx, a.cz, b) || _isNeighborCell(b.cx, b.cz, a);
  }

  /** Tous les groupes connexes de fondations (cellules qui se touchent). */
  function _allConnectedComponents() {
    const seen = new Set();
    const components = [];
    for (const [id, f] of _floors.entries()) {
      if (seen.has(id)) continue;
      const cluster = new Map();
      const queue = [_floorEntry(id, f)];
      seen.add(id);
      cluster.set(id, queue[0]);
      let qi = 0;
      while (qi < queue.length) {
        const cur = queue[qi++];
        for (const [oid, g] of _floors.entries()) {
          if (seen.has(oid)) continue;
          if (!_areNeighborFloors(cur, g)) continue;
          seen.add(oid);
          const entry = _floorEntry(oid, g);
          cluster.set(oid, entry);
          queue.push(entry);
        }
      }
      components.push(cluster);
    }
    return components;
  }

  /**
   * Aligne toutes les fondations existantes : chaque groupe connexe → hauteur max du groupe.
   * Retourne les dalles à remonter visuellement [{ id, targetY }, …].
   */
  function reconcileAllFoundationHeights() {
    const lifts = [];
    for (const cluster of _allConnectedComponents()) {
      if (cluster.size < 2) continue;
      const first = cluster.values().next().value;
      const targetY = _clusterTargetY(cluster, first.cx, first.cz, first.baseY, 0);
      if (!Number.isFinite(targetY)) continue;
      for (const f of cluster.values()) {
        if (Math.abs(f.baseY - targetY) <= 0.02) continue;
        lifts.push({ id: f.id, targetY });
        registerFoundation(f.id, f.cx, f.cz, targetY, {
          hw: f.hw,
          hd: f.hd,
          level: f.level,
        });
      }
    }
    return lifts;
  }

  /** Reconstruit le registre depuis les decors serveur (init ou resync). */
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
  function findFoundationDeckNear(px, pz, buildLevel = 0, maxDist = SNAP_R_WALL) {
    let best = null;
    let bestD = maxDist;
    for (const f of _floors.values()) {
      if (!_floorMatchesBuildLevel(f, buildLevel)) continue;
      const onDeck = Math.abs(px - f.cx) <= f.hw + 0.35 && Math.abs(pz - f.cz) <= f.hd + 0.35;
      const onEdge = (
        (Math.abs(Math.abs(px - f.cx) - f.hw) < 0.5 && Math.abs(pz - f.cz) <= f.hd + 0.35)
        || (Math.abs(Math.abs(pz - f.cz) - f.hd) < 0.5 && Math.abs(px - f.cx) <= f.hw + 0.35)
      );
      if (!onDeck && !onEdge) continue;
      const d = Math.hypot(px - f.cx, pz - f.cz);
      if (d >= bestD) continue;
      bestD = d;
      best = f;
    }
    if (!best) return null;
    return {
      baseY: clampStructureBaseY(best.cx, best.cz, best.baseY, buildLevel),
      level: Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0))),
      cx: best.cx,
      cz: best.cz,
    };
  }

  /** Ancrage fondation voisine le plus proche (position + hauteur). */
  function getNearestFloorAnchor(x, z, maxDist = SNAP_R_FLOOR, buildLevel = 0) {
    let best = null;
    let bestD = maxDist;
    for (const f of _floors.values()) {
      if (!_isCoherentDeck(f)) continue;
      for (const a of _anchorsForFloor(f)) {
        if (a.kind !== 'floor') continue;
        const d = Math.hypot(a.x - x, a.z - z);
        if (d >= bestD) continue;
        bestD = d;
        best = a;
      }
    }
    if (!best) return null;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const unified = computeUnifiedFloorHeight(
      best.x, best.z, _terrainDeckY(best.x, best.z, lvl) ?? best.baseY, null, lvl,
    );
    const baseY = unified.targetY;
    return { x: best.x, z: best.z, baseY, level: lvl };
  }

  function getNearestFloorBaseY(x, z, maxDist = SNAP_R_FLOOR, buildLevel = 0) {
    const anchor = getNearestFloorAnchor(x, z, maxDist, buildLevel);
    if (anchor) return anchor;
    let best = null;
    let bestD = maxDist;
    for (const f of _floors.values()) {
      if (!_isCoherentDeck(f)) continue;
      const d = Math.hypot(f.cx - x, f.cz - z);
      if (d >= bestD) continue;
      bestD = d;
      best = f;
    }
    if (!best) return null;
    const lvl = Math.max(0, Math.min(8, Math.floor(Number(buildLevel) || 0)));
    const unified = computeUnifiedFloorHeight(
      best.cx, best.cz, _terrainDeckY(best.cx, best.cz, lvl) ?? best.baseY, null, lvl,
    );
    return { baseY: unified.targetY, level: lvl, x: best.cx, z: best.cz };
  }

  /** Fondations proches du joueur (repères de construction). */
  function listFoundations(maxDist, px, pz) {
    const out = [];
    for (const [id, f] of _floors.entries()) {
      if (maxDist > 0 && Math.hypot(f.cx - px, f.cz - pz) > maxDist) continue;
      if (!_isCoherentDeck(f)) continue;
      out.push({ ...f, id });
    }
    return out;
  }

  /** Bords mur exposés (repères verts + snap). */
  function listExposedWallEdges(maxDist, px, pz) {
    const out = [];
    for (const [id, f] of _floors.entries()) {
      if (maxDist > 0 && Math.hypot(f.cx - px, f.cz - pz) > maxDist) continue;
      if (!_isCoherentDeck(f)) continue;
      for (const dir of ['n', 's', 'e', 'w']) {
        if (!_isExposedWallEdge(f, dir, id)) continue;
        const a = _wallAnchorAt(f, dir);
        out.push({ ...a, baseY: f.baseY, dir, id });
      }
    }
    return out;
  }

  /** Joueur debout sur une dalle de fondation (tous niveaux). */
  function isStandingOnFoundation(px, pz, feetY) {
    if (!Number.isFinite(feetY)) return false;
    for (const f of _floors.values()) {
      if (!_isCoherentDeck(f)) continue;
      const margin = 0.12;
      if (Math.abs(px - f.cx) > f.hw - margin || Math.abs(pz - f.cz) > f.hd - margin) continue;
      const deckTop = f.baseY + FLOOR_DECK_H;
      if (feetY >= deckTop - 0.42 && feetY <= deckTop + 0.55) return true;
    }
    return false;
  }

  window.ZS = window.ZS || {};
  ZS.BuildAnchors = {
    registerFoundation, unregisterFoundation, snapPlacement,
    isStandingOnFoundation,
    getNearestFloorAnchor, getNearestFloorBaseY, findAdjacentFloorHeight,
    findFoundationDeckNear, findFoundationUnderCell,
    listAdjacentFoundations, computeUnifiedFloorHeight,
    resolveFloorDeckY, resolveCeilingDeckY, clampFloorDeckY, clampStructureBaseY, resolveStructureBaseY,
    syncRegistryFromDecor,
    sanitizeAllFoundations, reconcileAllFoundationHeights,
    listFoundations, listExposedWallEdges, listCeilingAnchors, clear, CELL, SNAP_R, SNAP_R_FLOOR, SNAP_R_WALL,
  };
}());
