// Registre fondations + hauteurs — build_anchors.js
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
