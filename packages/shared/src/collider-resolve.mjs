/** Collision agent (joueur / zombie) contre colliders monde — sans dépendance Three.js. */

function _quatFromEulerXYZ(x, y, z) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return {
    w: c1 * c2 * c3 - s1 * s2 * s3,
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
  };
}

function _quatConjugate(q) {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

function _quatApply(q, vx, vy, vz) {
  const ix = q.w * vx + q.y * vz - q.z * vy;
  const iy = q.w * vy + q.z * vx - q.x * vz;
  const iz = q.w * vz + q.x * vy - q.y * vx;
  const iw = -q.x * vx - q.y * vy - q.z * vz;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

/** Monde → local décor (rotY + rotZ inclinaison épaves, même convention que world.js). */
export function decorWorldToLocal(px, py, pz, col) {
  let lx = px - col.cx;
  let ly = py - (col.baseY ?? 0);
  let lz = pz - col.cz;
  if (col.rotX || col.rotZ) {
    const q = _quatConjugate(_quatFromEulerXYZ(col.rotX || 0, col.rotY || 0, col.rotZ || 0));
    const v = _quatApply(q, lx, ly, lz);
    lx = v.x;
    ly = v.y;
    lz = v.z;
  } else if (col.rotY) {
    const c = Math.cos(-col.rotY);
    const s = Math.sin(-col.rotY);
    const x = lx;
    const z = lz;
    lx = x * c - z * s;
    lz = x * s + z * c;
  }
  return { lx, ly, lz };
}

export function decorLocalToWorld(lx, ly, lz, col) {
  let wx = lx;
  let wy = ly;
  let wz = lz;
  if (col.rotX || col.rotZ) {
    const q = _quatFromEulerXYZ(col.rotX || 0, col.rotY || 0, col.rotZ || 0);
    const v = _quatApply(q, lx, ly, lz);
    wx = v.x;
    wy = v.y;
    wz = v.z;
  } else if (col.rotY) {
    const c = Math.cos(col.rotY);
    const s = Math.sin(col.rotY);
    const x = wx;
    const z = wz;
    wx = x * c - z * s;
    wz = x * s + z * c;
  }
  return { x: col.cx + wx, z: col.cz + wz };
}

function _distPointToSegment(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-8) {
    return { dist: Math.hypot(px - x0, pz - z0), cx: x0, cz: z0, ux: 0, uz: 1 };
  }
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
  const cx = x0 + dx * t;
  const cz = z0 + dz * t;
  const dist = Math.hypot(px - cx, pz - cz);
  const len = Math.sqrt(len2);
  return { dist, cx, cz, ux: dx / len, uz: dz / len };
}

function _resolveSegment(col, px, pz, agentR, feetY, { skipJumpable = false } = {}) {
  if (skipJumpable && col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
  if (col.baseY != null && feetY < col.baseY - 0.35) return null;
  const hit = _distPointToSegment(px, pz, col.x0, col.z0, col.x1, col.z1);
  const min = agentR + (col.r || 0.1);
  if (hit.dist >= min) return null;
  if (hit.dist < 0.001) {
    return { x: px + hit.ux * min, z: pz + hit.uz * min };
  }
  const scale = min / hit.dist;
  return { x: hit.cx + (px - hit.cx) * scale, z: hit.cz + (pz - hit.cz) * scale };
}

function _resolveOrientedBox(col, px, pz, agentR, feetY, { skipJumpable = false } = {}) {
  if (skipJumpable && col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
  if (col.decorId && col.baseY != null && feetY < col.baseY - 0.35) return null;
  if (col.minY !== undefined && feetY < col.minY - 0.05) return null;

  const local = decorWorldToLocal(px, feetY, pz, col);
  const bx = local.lx - (col.lx || 0);
  const bz = local.lz - (col.lz || 0);
  const clampBX = Math.max(-col.hw, Math.min(col.hw, bx));
  const clampBZ = Math.max(-col.hd, Math.min(col.hd, bz));
  const wdx = bx - clampBX;
  const wdz = bz - clampBZ;
  const dist = Math.hypot(wdx, wdz);
  if (dist >= agentR || dist <= 0.001) return null;

  const pen = agentR - dist;
  const outLX = bx + (wdx / dist) * pen + (col.lx || 0);
  const outLZ = bz + (wdz / dist) * pen + (col.lz || 0);
  return decorLocalToWorld(outLX, local.ly, outLZ, col);
}

function _resolveSimpleBox(col, px, pz, agentR) {
  const clampX = Math.max(col.cx - col.hw, Math.min(col.cx + col.hw, px));
  const clampZ = Math.max(col.cz - col.hd, Math.min(col.cz + col.hd, pz));
  const dx = px - clampX;
  const dz = pz - clampZ;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.0001) {
    if (dist < agentR) {
      const pen = agentR - dist;
      return { x: px + (dx / dist) * pen, z: pz + (dz / dist) * pen };
    }
    return null;
  }
  const l = px - (col.cx - col.hw);
  const r = (col.cx + col.hw) - px;
  const t = pz - (col.cz - col.hd);
  const b = (col.cz + col.hd) - pz;
  const m = Math.min(l, r, t, b);
  if (m === l) return { x: col.cx - col.hw - agentR, z: pz };
  if (m === r) return { x: col.cx + col.hw + agentR, z: pz };
  if (m === t) return { x: px, z: col.cz - col.hd - agentR };
  return { x: px, z: col.cz + col.hd + agentR };
}

function _resolveCylinder(col, px, pz, agentR, feetY, { skipJumpable = false } = {}) {
  if (skipJumpable && col.topY !== undefined && feetY >= col.topY - 0.05) return null;
  const dx = px - col.x;
  const dz = pz - col.z;
  const dist = Math.hypot(dx, dz);
  const min = agentR + (col.r || 0.3);
  if (dist < min && dist > 0.0001) {
    const scale = min / dist;
    return { x: col.x + dx * scale, z: col.z + dz * scale };
  }
  return null;
}

/**
 * Repousse un agent (px, pz) hors d'un collider. Retourne { x, z } ou null si pas de contact.
 * @param {object} col
 * @param {number} px
 * @param {number} pz
 * @param {number} agentR
 * @param {number} [feetY=0]
 * @param {{ skipJumpable?: boolean }} [opts]
 */
export function resolveAgentAgainstCollider(col, px, pz, agentR, feetY = 0, opts = {}) {
  if (!col || !Number.isFinite(px) || !Number.isFinite(pz)) return null;
  if (col.type === 'seg') {
    return _resolveSegment(col, px, pz, agentR, feetY, opts);
  }
  if (col.type === 'box' || col.cx !== undefined) {
    if (col.lx != null || col.rotX || col.rotZ || (col.rotY && col.baseY != null)) {
      return _resolveOrientedBox(col, px, pz, agentR, feetY, opts);
    }
    if (col.rotY) {
      return _resolveOrientedBox(
        { ...col, lx: 0, lz: 0, baseY: col.baseY ?? 0 },
        px,
        pz,
        agentR,
        feetY,
        opts,
      );
    }
    return _resolveSimpleBox(col, px, pz, agentR);
  }
  if (col.x !== undefined) {
    return _resolveCylinder(col, px, pz, agentR, feetY, opts);
  }
  return null;
}

/**
 * Résout les collisions contre une liste de colliders (ordre stable, plusieurs passes légères).
 */
export function resolveAgentCollision(nx, nz, colliders, agentR, feetY = 0, opts = {}) {
  let x = nx;
  let z = nz;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      const out = resolveAgentAgainstCollider(c, x, z, agentR, feetY, opts);
      if (out) {
        x = out.x;
        z = out.z;
      }
    }
  }
  return [x, z];
}

function _colliderBlocksLos(col, feetY = 0) {
  if (!col) return false;
  if (col.minY !== undefined && feetY < col.minY - 0.05) return false;
  if (col.baseY != null && feetY < col.baseY - 0.35) return false;
  return true;
}

/** Segment 2D vs AABB axis-aligned (local ou monde). */
function _segmentIntersectsAABB2D(x0, z0, x1, z1, minX, maxX, minZ, maxZ) {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const planes = [
    [-dx, x0 - minX],
    [dx, maxX - x0],
    [-dz, z0 - minZ],
    [dz, maxZ - z0],
  ];
  for (const [p, q] of planes) {
    if (Math.abs(p) < 1e-8) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
}

function _segmentIntersectsOrientedBox(col, x0, z0, x1, z1, feetY) {
  if (!_colliderBlocksLos(col, feetY)) return false;
  const p0 = decorWorldToLocal(x0, feetY, z0, col);
  const p1 = decorWorldToLocal(x1, feetY, z1, col);
  const lx0 = p0.lx - (col.lx || 0);
  const lz0 = p0.lz - (col.lz || 0);
  const lx1 = p1.lx - (col.lx || 0);
  const lz1 = p1.lz - (col.lz || 0);
  return _segmentIntersectsAABB2D(
    lx0, lz0, lx1, lz1,
    -col.hw, col.hw, -col.hd, col.hd,
  );
}

function _segmentIntersectsSimpleBox(col, x0, z0, x1, z1, feetY) {
  if (!_colliderBlocksLos(col, feetY)) return false;
  return _segmentIntersectsAABB2D(
    x0, z0, x1, z1,
    col.cx - col.hw, col.cx + col.hw,
    col.cz - col.hd, col.cz + col.hd,
  );
}

function _segmentIntersectsCylinder(col, x0, z0, x1, z1) {
  const hit = _distPointToSegment(col.x, col.z, x0, z0, x1, z1);
  const r = (col.r || 0.3) + 0.05;
  return hit.dist <= r;
}

function _segmentIntersectsSeg(col, x0, z0, x1, z1, feetY) {
  if (!_colliderBlocksLos(col, feetY)) return false;
  const hitA = _distPointToSegment(col.x0, col.z0, x0, z0, x1, z1);
  const hitB = _distPointToSegment(col.x1, col.z1, x0, z0, x1, z1);
  const r = (col.r || 0.1) + 0.05;
  return hitA.dist <= r || hitB.dist <= r;
}

function _segmentHitsCollider(col, x0, z0, x1, z1, feetY = 0) {
  if (!col || !Number.isFinite(x0) || !Number.isFinite(z0)) return false;
  if (col.type === 'seg') {
    return _segmentIntersectsSeg(col, x0, z0, x1, z1, feetY);
  }
  if (col.type === 'box' || col.cx !== undefined) {
    if (col.lx != null || col.rotX || col.rotZ || (col.rotY && col.baseY != null)) {
      return _segmentIntersectsOrientedBox(col, x0, z0, x1, z1, feetY);
    }
    if (col.rotY) {
      return _segmentIntersectsOrientedBox(
        { ...col, lx: 0, lz: 0, baseY: col.baseY ?? 0 },
        x0, z0, x1, z1, feetY,
      );
    }
    return _segmentIntersectsSimpleBox(col, x0, z0, x1, z1, feetY);
  }
  if (col.x !== undefined) {
    return _segmentIntersectsCylinder(col, x0, z0, x1, z1);
  }
  return false;
}

/**
 * True si un segment XZ est bloqué par un collider (LOS combat / zombie).
 * @param {number} x0
 * @param {number} z0
 * @param {number} x1
 * @param {number} z1
 * @param {object[]} colliders
 * @param {number} [feetY=0]
 * @param {{ endpointShrink?: number }} [opts]
 */
export function segmentBlockedByColliders(x0, z0, x1, z1, colliders, feetY = 0, opts = {}) {
  if (!Array.isArray(colliders) || !colliders.length) return false;
  const shrink = Number.isFinite(opts.endpointShrink) ? opts.endpointShrink : 0.45;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return false;
  const ux = dx / len;
  const uz = dz / len;
  const pad = Math.min(shrink, len * 0.12);
  const ax = x0 + ux * pad;
  const az = z0 + uz * pad;
  const bx = x1 - ux * pad;
  const bz = z1 - uz * pad;
  for (const c of colliders) {
    if (_segmentHitsCollider(c, ax, az, bx, bz, feetY)) return true;
  }
  return false;
}

/** True si la vue/combat n'est pas obstruée entre deux points XZ. */
export function hasLineOfSight(x0, z0, x1, z1, colliders, feetY = 0, opts = {}) {
  return !segmentBlockedByColliders(x0, z0, x1, z1, colliders, feetY, opts);
}
