// Queries + export BuildAnchors — build_anchors.js
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
