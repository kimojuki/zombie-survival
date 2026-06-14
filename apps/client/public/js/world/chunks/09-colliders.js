// Colliders décor + collision joueur — extrait de world.js (IIFE)
function registerDecorColliders(id, colliders) {
    if (!id) return;
    if (!colliders || !colliders.length) {
      _decorColliders.delete(id);
      if (_decorColliderRegisterBatch === 0) invalidateColliderCache();
      return;
    }
    _decorColliders.set(id, colliders);
    if (_decorColliderRegisterBatch === 0) invalidateColliderCache();
  }

  function beginDecorColliderRegisterBatch() {
    _decorColliderRegisterBatch++;
  }

  function endDecorColliderRegisterBatch() {
    _decorColliderRegisterBatch = Math.max(0, _decorColliderRegisterBatch - 1);
    if (_decorColliderRegisterBatch === 0) invalidateColliderCache();
  }

  function removeDecorColliders(id) {
    if (id) _decorColliders.delete(id);
    invalidateColliderCache();
  }

  function clearDecorColliders() {
    _decorColliders.clear();
    invalidateColliderCache();
  }

  const _COLLIDER_CELL = 16;
  let _colliderGrid = null;
  let _standCacheX = NaN;
  let _standCacheZ = NaN;
  let _standCacheEye = NaN;
  let _standCacheVal = 0;

  function _colliderRefXZ(col) {
    const x = col.cx ?? col.x ?? ((col.x0 ?? 0) + (col.x1 ?? 0)) * 0.5;
    const z = col.cz ?? col.z ?? ((col.z0 ?? 0) + (col.z1 ?? 0)) * 0.5;
    return { x, z };
  }

  function _rebuildColliderGrid(list) {
    const grid = new Map();
    for (let i = 0; i < list.length; i++) {
      const col = list[i];
      const { x, z } = _colliderRefXZ(col);
      const cx = Math.floor(x / _COLLIDER_CELL);
      const cz = Math.floor(z / _COLLIDER_CELL);
      const key = cx + ',' + cz;
      let bucket = grid.get(key);
      if (!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(col);
    }
    _colliderGrid = grid;
  }

  function _buildColliderList() {
    const out = _colliders.slice();
    const barriers = ZS.getBarrierColliders?.();
    if (barriers?.length) out.push(...barriers);
    if (_decorColliders.size) {
      for (const cols of _decorColliders.values()) {
        for (const c of cols) out.push(c);
      }
    }
    return out;
  }

  function getColliders() {
    const frame = ZS._frameId ?? -1;
    if (_colliderCache && _colliderCacheFrame === frame) return _colliderCache;
    const out = _buildColliderList();
    _colliderCache = out;
    _colliderCacheFrame = frame;
    _rebuildColliderGrid(out);
    return out;
  }

  /** Colliders terrain statiques pour le serveur (sans décor dynamique). */
  function getCollidersForServer() {
    const out = _colliders.slice();
    const barriers = ZS.getBarrierColliders?.();
    if (barriers?.length) {
      for (let i = 0; i < barriers.length; i++) {
        const c = barriers[i];
        if (c && c.minY === undefined && !c.decorId) out.push(c);
      }
    }
    return out;
  }

  /** Colliders proches (mouvement) — évite de scanner toute la carte chaque frame. */
  function getCollidersNear(px, pz, radius) {
    const r = radius ?? 32;
    getColliders();
    if (!_colliderGrid) return _colliderCache || [];
    const r2 = r * r;
    const minCx = Math.floor((px - r) / _COLLIDER_CELL);
    const maxCx = Math.floor((px + r) / _COLLIDER_CELL);
    const minCz = Math.floor((pz - r) / _COLLIDER_CELL);
    const maxCz = Math.floor((pz + r) / _COLLIDER_CELL);
    const out = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = _colliderGrid.get(cx + ',' + cz);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const col = bucket[i];
          const ref = _colliderRefXZ(col);
          const dx = ref.x - px;
          const dz = ref.z - pz;
          if (dx * dx + dz * dz <= r2 + 64) out.push(col);
        }
      }
    }
    return out;
  }

  function invalidateColliderCache() {
    _colliderCache = null;
    _colliderCacheFrame = -1;
    _colliderGrid = null;
    _standCacheX = NaN;
    _standCacheZ = NaN;
  }

  /** Murs secteur — enregistrés après Buildings.buildAll (voir sector_walls.js). */
  function registerSectorCollider(c) {
    if (!c) return;
    _colliders.push(c);
    invalidateColliderCache();
  }

  // Hauteur max montable d'un bond (JUMP_V=8, GRAVITY=22 → ~1.45 m)
  const MAX_STAND_STEP = 1.55;
  const _dcE = new THREE.Euler(0, 0, 0, 'XYZ');
  const _dcQ = new THREE.Quaternion();
  const _dcV = new THREE.Vector3();

  /** Monde → espace local décor (rotY + rotZ inclinaison épaves). */
  function decorWorldToLocal(px, py, pz, col) {
    _dcV.set(px - col.cx, py - (col.baseY ?? 0), pz - col.cz);
    if (col.rotX || col.rotZ) {
      _dcE.set(col.rotX || 0, col.rotY || 0, col.rotZ || 0);
      _dcQ.setFromEuler(_dcE).invert();
      _dcV.applyQuaternion(_dcQ);
    } else if (col.rotY) {
      const c = Math.cos(col.rotY);
      const s = Math.sin(col.rotY);
      const dx = _dcV.x;
      const dz = _dcV.z;
      _dcV.x = dx * c - dz * s;
      _dcV.z = dx * s + dz * c;
    }
    return { lx: _dcV.x, ly: _dcV.y, lz: _dcV.z };
  }

  function decorLocalToWorld(lx, ly, lz, col) {
    _dcV.set(lx, ly, lz);
    if (col.rotX || col.rotZ) {
      _dcE.set(col.rotX || 0, col.rotY || 0, col.rotZ || 0);
      _dcQ.setFromEuler(_dcE);
      _dcV.applyQuaternion(_dcQ);
    } else if (col.rotY) {
      const c = Math.cos(col.rotY);
      const s = Math.sin(col.rotY);
      const x = _dcV.x;
      const z = _dcV.z;
      _dcV.x = x * c + z * s;
      _dcV.z = -x * s + z * c;
    }
    return { x: col.cx + _dcV.x, y: (col.baseY ?? 0) + _dcV.y, z: col.cz + _dcV.z };
  }

  function _doorLeafLocalXZ(bx, bz, localRotY) {
    if (!localRotY) return { bx, bz };
    const c = Math.cos(localRotY);
    const s = Math.sin(localRotY);
    return { bx: bx * c - bz * s, bz: bx * s + bz * c };
  }

  function _doorLeafWorldXZ(bx, bz, localRotY) {
    if (!localRotY) return { bx, bz };
    const c = Math.cos(localRotY);
    const s = Math.sin(localRotY);
    return { bx: bx * c + bz * s, bz: -bx * s + bz * c };
  }

  function overBoxFootprint(px, pz, margin, col) {
    const { lx, lz } = decorWorldToLocal(px, col.baseY ?? 0, pz, col);
    let bx = lx - (col.lx || 0);
    let bz = lz - (col.lz || 0);
    if (col.localRotY) ({ bx, bz } = _doorLeafLocalXZ(bx, bz, col.localRotY));
    return Math.abs(bx) <= col.hw + margin && Math.abs(bz) <= col.hd + margin;
  }

  function resolveDecorBoxCollision(col, px, pz, feetY, playerR) {
    if (col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
    // Bande verticale haute seulement — sinon murs/portes sur pente ignorés si pieds < baseY.
    if (col.maxY != null && col.decorId && col.baseY != null && feetY < col.baseY - 0.35) return null;
    if (col.minY !== undefined && feetY < col.minY - 0.05) return null;

    const local = decorWorldToLocal(px, feetY, pz, col);
    const relX = local.lx - (col.lx || 0);
    const relZ = local.lz - (col.lz || 0);
    let bx = relX;
    let bz = relZ;
    if (col.localRotY) ({ bx, bz } = _doorLeafLocalXZ(bx, bz, col.localRotY));
    const clampBX = Math.max(-col.hw, Math.min(col.hw, bx));
    const clampBZ = Math.max(-col.hd, Math.min(col.hd, bz));
    const wdxL = bx - clampBX;
    const wdzL = bz - clampBZ;
    let wdx = wdxL;
    let wdz = wdzL;
    if (col.localRotY) ({ bx: wdx, bz: wdz } = _doorLeafWorldXZ(wdxL, wdzL, col.localRotY));
    const dist = Math.hypot(wdx, wdz);
    if (dist >= playerR) return null;

    const toDecorRel = (leafX, leafZ) => {
      if (!col.localRotY) return { x: leafX, z: leafZ };
      const w = _doorLeafWorldXZ(leafX, leafZ, col.localRotY);
      return { x: w.bx, z: w.bz };
    };

    if (dist <= 0.001) {
      const penL = bx + col.hw;
      const penR = col.hw - bx;
      const penF = bz + col.hd;
      const penB = col.hd - bz;
      const m = Math.min(penL, penR, penF, penB);
      let outBX = bx;
      let outBZ = bz;
      if (m === penL) outBX = -col.hw - playerR;
      else if (m === penR) outBX = col.hw + playerR;
      else if (m === penF) outBZ = -col.hd - playerR;
      else outBZ = col.hd + playerR;
      const outRel = toDecorRel(outBX, outBZ);
      return decorLocalToWorld(outRel.x + (col.lx || 0), local.ly, outRel.z + (col.lz || 0), col);
    }

    const pen = playerR - dist;
    const outRel = toDecorRel(bx + (wdxL / dist) * pen, bz + (wdzL / dist) * pen);
    return decorLocalToWorld(outRel.x + (col.lx || 0), local.ly, outRel.z + (col.lz || 0), col);
  }

  function _distPointToSegment(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return { dist: Math.hypot(px - x0, pz - z0), cx: x0, cz: z0, ux: 0, uz: 1 };
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
    const cx = x0 + dx * t;
    const cz = z0 + dz * t;
    const dist = Math.hypot(px - cx, pz - cz);
    const len = Math.sqrt(len2);
    return { dist, cx, cz, ux: dx / len, uz: dz / len };
  }

  function resolveDecorSegmentCollision(col, px, pz, feetY, playerR) {
    if (col.maxY !== undefined && feetY >= col.maxY - 0.05) return null;
    if (col.baseY != null && feetY < col.baseY - 0.35) return null;
    const hit = _distPointToSegment(px, pz, col.x0, col.z0, col.x1, col.z1);
    const min = playerR + (col.r || 0.1);
    if (hit.dist >= min) return null;
    if (hit.dist < 0.001) {
      return { x: px + hit.ux * min, z: pz + hit.uz * min };
    }
    const scale = min / hit.dist;
    return { x: hit.cx + (px - hit.cx) * scale, z: hit.cz + (pz - hit.cz) * scale };
  }

  function overSegmentFootprint(px, pz, margin, col) {
    const hit = _distPointToSegment(px, pz, col.x0, col.z0, col.x1, col.z1);
    return hit.dist <= (col.r || 0.1) + margin;
  }

  function overColliderFootprint(px, pz, margin, col) {
    if (col.type === 'seg') return overSegmentFootprint(px, pz, margin, col);
    if (col.type === 'box' || col.cx !== undefined) {
      if (col.lx != null || col.rotX || col.rotZ) return overBoxFootprint(px, pz, margin, col);
      const dx = px - col.cx;
      const dz = pz - col.cz;
      let lx, lz;
      if (col.rotY) {
        const c = Math.cos(col.rotY);
        const s = Math.sin(col.rotY);
        lx = dx * c - dz * s;
        lz = dx * s + dz * c;
      } else {
        lx = dx;
        lz = dz;
      }
      return Math.abs(lx) <= col.hw + margin && Math.abs(lz) <= col.hd + margin;
    }
    return Math.hypot(px - col.x, pz - col.z) <= (col.r || 0) + margin;
  }

  function decorStandTop(col) {
    if (!col?.decorId) return null;
    return col.maxY ?? col.topY ?? null;
  }

  /** Sol sous les pieds : terrain + étages + dessus des décors (caisses, souches…). */
  function getStandHeight(x, z, playerEyeY) {
    if (Math.hypot(x - _standCacheX, z - _standCacheZ) < 0.2
      && Math.abs(playerEyeY - _standCacheEye) < 0.4) {
      return _standCacheVal;
    }
    let best = ZS.getEffectiveFloorHeight(x, z, playerEyeY);
    const baseFloor = best;
    const nearby = getCollidersNear(x, z, 24);

    for (let i = 0; i < nearby.length; i++) {
      const col = nearby[i];
      const top = decorStandTop(col);
      if (top == null) continue;
      if (!overColliderFootprint(x, z, 0.02, col)) continue;
      if (top - baseFloor > MAX_STAND_STEP) continue;
      if (top <= playerEyeY - 0.45 && top > best) best = top;
    }
    _standCacheX = x;
    _standCacheZ = z;
    _standCacheEye = playerEyeY;
    _standCacheVal = best;
    return best;
  }

  function shouldSkipDecorSideCollision(col, feetY, eyeY, velY, px, pz, margin) {
    const top = decorStandTop(col);
    if (top == null) return false;
    if (!overColliderFootprint(px, pz, margin, col)) return false;
    if (feetY >= top - 0.08) return true;
    if (velY <= 0 && eyeY >= top + 1.7 - 0.35) return true;
    return false;
  }

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
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i][0];
      const q = planes[i][1];
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

  function _colliderBlocksHeadLos(col, headY) {
    if (!col) return false;
    if (col.maxY !== undefined && headY > col.maxY + 0.06) return false;
    if (col.minY !== undefined && headY < col.minY - 0.05) return false;
    if (col.baseY != null && headY < col.baseY - 0.35) return false;
    return true;
  }

  function _segmentIntersectsOrientedBox(col, x0, z0, x1, z1, headY) {
    if (!_colliderBlocksHeadLos(col, headY)) return false;
    const p0 = decorWorldToLocal(x0, headY, z0, col);
    const p1 = decorWorldToLocal(x1, headY, z1, col);
    const lx0 = p0.lx - (col.lx || 0);
    const lz0 = p0.lz - (col.lz || 0);
    const lx1 = p1.lx - (col.lx || 0);
    const lz1 = p1.lz - (col.lz || 0);
    return _segmentIntersectsAABB2D(lx0, lz0, lx1, lz1, -col.hw, col.hw, -col.hd, col.hd);
  }

  function _segmentIntersectsSimpleBox(col, x0, z0, x1, z1, headY) {
    if (!_colliderBlocksHeadLos(col, headY)) return false;
    return _segmentIntersectsAABB2D(
      x0, z0, x1, z1,
      col.cx - col.hw, col.cx + col.hw,
      col.cz - col.hd, col.cz + col.hd,
    );
  }

  function _segmentHitsCollider(col, x0, z0, x1, z1, headY) {
    if (!col || !Number.isFinite(x0) || !Number.isFinite(z0)) return false;
    if (col.type === 'seg') {
      if (!_colliderBlocksHeadLos(col, headY)) return false;
      const hitA = _distPointToSegment(col.x0, col.z0, x0, z0, x1, z1);
      const hitB = _distPointToSegment(col.x1, col.z1, x0, z0, x1, z1);
      const r = (col.r || 0.1) + 0.05;
      return hitA.dist <= r || hitB.dist <= r;
    }
    if (col.type === 'box' || col.cx !== undefined) {
      if (col.lx != null || col.rotX || col.rotZ || (col.rotY && col.baseY != null)) {
        return _segmentIntersectsOrientedBox(col, x0, z0, x1, z1, headY);
      }
      if (col.rotY) {
        return _segmentIntersectsOrientedBox(
          { ...col, lx: 0, lz: 0, baseY: col.baseY ?? 0 },
          x0, z0, x1, z1, headY,
        );
      }
      return _segmentIntersectsSimpleBox(col, x0, z0, x1, z1, headY);
    }
    if (col.x !== undefined) {
      const hit = _distPointToSegment(col.x, col.z, x0, z0, x1, z1);
      return hit.dist <= (col.r || 0.3) + 0.05;
    }
    return false;
  }

  /** LOS tête → tête (nametags) — ignore sol / obstacles sous headY. */
  function hasHeadLineOfSight(x0, z0, x1, z1, colliders, headY, opts = {}) {
    if (!Array.isArray(colliders) || !colliders.length) return true;
    const shrink = Number.isFinite(opts.endpointShrink) ? opts.endpointShrink : 0.4;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return true;
    const ux = dx / len;
    const uz = dz / len;
    const pad = Math.min(shrink, len * 0.12);
    const ax = x0 + ux * pad;
    const az = z0 + uz * pad;
    const bx = x1 - ux * pad;
    const bz = z1 - uz * pad;
    for (let i = 0; i < colliders.length; i++) {
      if (_segmentHitsCollider(colliders[i], ax, az, bx, bz, headY)) return false;
    }
    return true;
  }
