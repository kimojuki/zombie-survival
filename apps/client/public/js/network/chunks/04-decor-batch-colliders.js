// Batch spawn + colliders décor — extrait de network.js (IIFE)
async function _spawnDecorBatch(list, onProgress, opts = {}) {
    if (!list.length) return;
    const LL = ZS.LoadLog;
    const sliceMs = opts.sliceMs ?? (ZS._isMobile ? 18 : 22);
    const yieldEvery = opts.yieldEvery ?? 8;
    const maxMs = opts.maxMs ?? 90000;
    const simpleLodTrees = !!opts.simpleLodTrees;
    const initFullLodTrees = !!opts.initFullLodTrees;
    const fastGround = !!opts.fastGround;
    const spawnPx = opts.spawnX;
    const spawnPz = opts.spawnZ;
    const slowMs = opts.slowMs ?? 25;
    const t0 = performance.now();
    let sliceStart = performance.now();
    let totalSpawnMs = 0;
    let maxItemMs = 0;
    let maxItemPrefab = '';
    let yieldCount = 0;
    let spawned = 0;
    LL?.stepStart?.('decor-batch', { count: list.length, sliceMs, simpleLodTrees, fastGround });
    _decorBatchDepth++;
    try {
    if (simpleLodTrees && Number.isFinite(spawnPx) && Number.isFinite(spawnPz)) {
      list.sort((a, b) => {
        const ax = Number.isFinite(a.x) ? a.x : spawnPx;
        const az = Number.isFinite(a.z) ? a.z : spawnPz;
        const bx = Number.isFinite(b.x) ? b.x : spawnPx;
        const bz = Number.isFinite(b.z) ? b.z : spawnPz;
        const ad2 = (ax - spawnPx) ** 2 + (az - spawnPz) ** 2;
        const bd2 = (bx - spawnPx) ** 2 + (bz - spawnPz) ** 2;
        const au = ad2 > TREE_LOD_URGENT_R2 ? 1 : 0;
        const bu = bd2 > TREE_LOD_URGENT_R2 ? 1 : 0;
        return au - bu || ad2 - bd2;
      });
    }
    for (let i = 0; i < list.length; i++) {
      if (maxMs > 0 && performance.now() - t0 > maxMs) {
        const rest = list.slice(i);
        if (rest.length) {
          _decorSpawnDefer.pending.push(...rest);
          console.warn('[sync] decor batch — limite temps, différé:', rest.length);
          LL?.mark?.('decor-batch-timeout', { spawned, rest: rest.length, maxMs });
        }
        if (onProgress) onProgress(i, list.length);
        break;
      }
      const d = list[i];
      const ti = performance.now();
      const refX = Number.isFinite(spawnPx) ? spawnPx : (ZS.Network?.getLocalXZ?.()?.x ?? 0);
      const refZ = Number.isFinite(spawnPz) ? spawnPz : (ZS.Network?.getLocalXZ?.()?.z ?? 0);
      _spawnDecorItem(d, {
        simpleLod: simpleLodTrees && (initFullLodTrees
          ? _treeSpawnSimpleLodForInit(d, refX, refZ)
          : _treeSpawnSimpleLod(d, refX, refZ)),
        fastGround,
      });
      const itemMs = performance.now() - ti;
      totalSpawnMs += itemMs;
      spawned++;
      if (itemMs > maxItemMs) {
        maxItemMs = itemMs;
        maxItemPrefab = d.prefabId || '?';
      }
      if (LL?.isEnabled?.() && itemMs >= slowMs) {
        LL.mark('decor-slow', {
          i,
          prefabId: d.prefabId,
          ms: Math.round(itemMs),
          key: String(d.placementKey || '').slice(0, 48),
        });
      }
      const n = i + 1;
      if (onProgress && (n % yieldEvery === 0 || n === list.length)) {
        onProgress(n, list.length);
      }
      if (LL?.isEnabled?.() && (n % 64 === 0 || n === list.length)) {
        LL.mark('decor-progress', {
          done: n,
          total: list.length,
          avgMs: Math.round(totalSpawnMs / n),
          maxMs: Math.round(maxItemMs),
          maxPrefab: maxItemPrefab,
          yields: yieldCount,
        });
      }
      if (performance.now() - sliceStart >= sliceMs) {
        await _yieldToMainLight();
        yieldCount++;
        sliceStart = performance.now();
      }
    }
    const batchMs = Math.round(performance.now() - t0);
    LL?.stepEnd?.('decor-batch', {
      count: spawned,
      total: list.length,
      ms: batchMs,
      avgMs: spawned ? Math.round(totalSpawnMs / spawned) : 0,
      maxMs: Math.round(maxItemMs),
      maxPrefab: maxItemPrefab,
      yields: yieldCount,
    });
    } finally {
      _decorBatchDepth = Math.max(0, _decorBatchDepth - 1);
      if (_decorBatchDepth === 0) {
        _markLodQueueDirty();
        _invalidateDecorVisRing();
      }
    }
  }

  function _prefabResnapGround(prefabId, data) {
    if (!prefabId || data?.grounded === false || data?.shackAnchor) return false;
    if (prefabId.startsWith('build_') || prefabId.startsWith('wreck_')) return false;
    if (prefabId === 'building_survivor_shack' || prefabId === 'storage_chest') return false;
    if (prefabId.startsWith('tree_')) return true;
    if (prefabId.startsWith('rock_') || prefabId === 'spawn_stone') return true;
    if (prefabId.startsWith('spawn_') && !prefabId.includes('offshore')) return true;
    return false;
  }

  function _resnapGroundedWorldDecorNear(px, pz, radius, maxItems) {
    if (!ZS.getDecorGroundHeight) return 0;
    const r2 = (radius ?? 72) ** 2;
    let n = 0;
    for (const entry of decorItems.values()) {
      if (maxItems != null && n >= maxItems) break;
      const { root, data } = entry;
      if (!root) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      if (_resnapOneGroundedDecor(entry)) n++;
    }
    return n;
  }

  function _resnapGroundedWorldDecor() {
    if (!ZS.getDecorGroundHeight) return 0;
    let n = 0;
    for (const entry of decorItems.values()) {
      if (_resnapOneGroundedDecor(entry)) n++;
    }
    return n;
  }

  function _refineFastGroundDecorNear(px, pz, radius, maxItems) {
    if (!ZS.getDecorGroundHeight) return 0;
    const r2 = radius * radius;
    let n = 0;
    for (const { root, data } of decorItems.values()) {
      if (maxItems != null && n >= maxItems) break;
      if (!root?.userData?.fastGroundSpawn) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      const gy = _s01DecorGroundY(data, tx, tz, data.rotY ?? root.rotation?.y ?? 0)
        ?? ZS.getDecorGroundHeight(tx, tz);
      if (!Number.isFinite(gy)) continue;
      root.position.y = gy;
      data.baseY = gy;
      root.userData.fastGroundSpawn = false;
      ZS.refreshDecorCollision?.(root);
      n++;
    }
    return n;
  }


  function _loadDeferredScript(src) {
    return ZS.loadScript?.(src) ?? Promise.reject(new Error('ZS.loadScript missing'));
  }

  function _s01DecorGroundY(data, px, pz, rotY) {
    if (data?.shackAnchor && ZS.sampleShackPadHeight && Number.isFinite(data.shackFloorY)) {
      const a = data.shackAnchor;
      return ZS.sampleShackPadHeight(a.x, a.z, a.rotY || 0) + data.shackFloorY;
    }
    if (data?.prefabId === 'building_survivor_shack' && ZS.sampleShackPadHeight) {
      return ZS.sampleShackPadHeight(px, pz, rotY);
    }
    return ZS.getDecorGroundHeight?.(px, pz);
  }

  function _resnapS01DecorNear(px, pz, radius) {
    if (!ZS.getDecorGroundHeight && !ZS.sampleShackPadHeight) return 0;
    const r2 = (radius ?? 80) ** 2;
    let n = 0;
    for (const { root, data } of decorItems.values()) {
      const pk = String(data?.placementKey || '');
      if (!pk.startsWith('s01:') || !root) continue;
      const tx = root.position.x;
      const tz = root.position.z;
      const dx = tx - px;
      const dz = tz - pz;
      if (dx * dx + dz * dz > r2) continue;
      const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
      const gy = _s01DecorGroundY(data, tx, tz, rotY);
      if (!Number.isFinite(gy)) continue;
      if (Math.abs(root.position.y - gy) < 0.02) continue;
      root.position.y = gy;
      data.baseY = gy;
      ZS.refreshDecorCollision?.(root);
      n++;
    }
    return n;
  }

  function _resnapS01Decor() {
    if (!ZS.getDecorGroundHeight && !ZS.sampleShackPadHeight) return;
    for (const { root, data } of decorItems.values()) {
      const pk = String(data?.placementKey || '');
      if (!pk.startsWith('s01:') || !root) continue;
      const rotY = data.rotY ?? root.userData?.decorSpec?.rotY ?? root.rotation?.y ?? 0;
      const px = root.position.x;
      const pz = root.position.z;
      const gy = _s01DecorGroundY(data, px, pz, rotY);
      if (!Number.isFinite(gy)) continue;
      root.position.y = gy;
      data.baseY = gy;
      ZS.refreshDecorCollision?.(root);
    }
  }

  function _rebuildAllDecorColliders() {
    for (const { root } of decorItems.values()) {
      if (root?.userData?.decorSpec && root.userData.collide !== false) {
        ZS.refreshDecorCollision?.(root);
      }
    }
  }

  function _prefabNeedsCollider(prefabId) {
    if (!prefabId) return true;
    if (prefabId.startsWith('tree_') || prefabId.startsWith('rock_')
      || prefabId.startsWith('build_') || prefabId.startsWith('wreck_')) return true;
    const defs = ZS.DECOR_PREFAB_COLLIDERS?.[prefabId];
    return !!(defs && defs.length);
  }

  function _entryNeedsCollider(entry, px, pz, simpleLodMaxR2) {
    const root = entry?.root;
    if (!root?.userData?.decorSpec || root.userData.collide === false) return false;
    const spec = root.userData.decorSpec;
    if (!_prefabNeedsCollider(spec.prefabId)) return false;
    if (root.userData.simpleLod) {
      const dx = (root.position.x || 0) - px;
      const dz = (root.position.z || 0) - pz;
      if (dx * dx + dz * dz > simpleLodMaxR2) return false;
    }
    return true;
  }

  function _colliderRebuildPriority(entry) {
    const pid = entry?.root?.userData?.decorSpec?.prefabId || entry?.data?.prefabId || '';
    if (pid.startsWith('build_') || pid.startsWith('wreck_')) return 0;
    if (pid === 'storage_chest' || pid === 'building_survivor_shack') return 0;
    if (pid.includes('door')) return 0;
    if (pid.startsWith('rock_')) return 1;
    if (pid.startsWith('tree_')) return 3;
    return 2;
  }

  function _partitionDecorColliderEntries(px, pz, nearRadius) {
    const nearR2 = nearRadius * nearRadius;
    const simpleLodMaxR2 = (ZS._isMobile ? 38 : 48) ** 2;
    const near = [];
    const far = [];
    for (const entry of decorItems.values()) {
      const root = entry?.root;
      if (!root?.userData?.decorSpec || root.userData.collide === false) continue;
      const dx = (root.position.x || 0) - px;
      const dz = (root.position.z || 0) - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 <= nearR2) {
        if (_entryNeedsCollider(entry, px, pz, simpleLodMaxR2)) near.push(entry);
        continue;
      }
      if (_entryNeedsCollider(entry, px, pz, simpleLodMaxR2)) far.push(entry);
    }
    return { near, far };
  }

  async function _rebuildDecorCollidersChunked(entries, opts = {}) {
    if (!entries?.length) return { done: 0, deferred: 0 };
    const chunk = opts.chunk ?? (ZS._isMobile ? 12 : 16);
    const rafEvery = opts.rafEvery ?? 1;
    const maxMs = opts.maxMs ?? 0;
    const t0 = performance.now();
    let chunks = 0;
    let done = 0;
    for (let i = 0; i < entries.length; i += chunk) {
      if (maxMs > 0 && performance.now() - t0 > maxMs) {
        const deferred = entries.length - i;
        if (deferred > 0) {
          console.warn('[sync] colliders — limite temps, différé:', deferred);
        }
        if (opts.onProgress) opts.onProgress(done, entries.length);
        return { done, deferred };
      }
      const end = Math.min(i + chunk, entries.length);
      for (let j = i; j < end; j++) {
        const { root } = entries[j];
        if (root?.userData?.decorSpec && root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(root);
        }
        done++;
      }
      if (opts.onProgress) opts.onProgress(done, entries.length);
      chunks++;
      if (opts.rafEvery === 0) continue;
      if (chunks % rafEvery === 0) {
        await new Promise((r) => setTimeout(r, 0));
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    return { done, deferred: 0 };
  }

  async function _rebuildAllDecorCollidersAsync(opts = {}) {
    const px = opts.playerX ?? _state?.player?.x ?? 0;
    const pz = opts.playerZ ?? _state?.player?.z ?? 0;
    const nearRadius = opts.nearRadius ?? (ZS._isMobile ? 58 : 72);
    const { near, far } = _partitionDecorColliderEntries(px, pz, nearRadius);
    ZS.DevLog?.sync?.('colliders-split', { near: near.length, far: far.length, nearRadius });

    const maxSync = opts.maxSync ?? (ZS._isMobile ? 100 : 180);
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const syncNow = near.slice(0, maxSync);
    const deferNear = near.slice(maxSync);
    const idleRest = deferNear.concat(far);

    const syncResult = await _rebuildDecorCollidersChunked(syncNow, opts);
    if (idleRest.length > 0 || syncResult.deferred > 0) {
      const rest = syncResult.deferred > 0
        ? syncNow.slice(syncResult.done).concat(idleRest)
        : idleRest;
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));
      idle(() => {
        _rebuildDecorCollidersChunked(rest, {
          chunk: opts.chunk ?? (ZS._isMobile ? 16 : 24),
          rafEvery: 2,
          maxMs: 0,
        }).catch(() => {});
      });
      if (rest.length) {
        console.info('[sync] colliders différés (idle):', rest.length);
      }
    }
  }

  let _decorColliderBgPromise = null;
  let _colliderFarQueue = [];
  let _colliderFarAcc = 0;

  function _markSpawnColliderReady(root) {
    if (root) root.userData.spawnColliderReady = true;
  }

  /** Colliders immédiats autour du spawn — avant init-vis / builds lourds. */
  function _registerSpawnZoneCollidersSync(px, pz, opts = {}) {
    const radius = opts.radius ?? (ZS._isMobile ? 58 : 72);
    const maxMs = opts.maxMs ?? (ZS._isMobile ? 180 : 260);
    const { near } = _partitionDecorColliderEntries(px, pz, radius);
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const t0 = performance.now();
    let registered = 0;
    for (const entry of near) {
      if (performance.now() - t0 >= maxMs) break;
      const root = entry?.root;
      if (!root || root.userData.spawnColliderReady) continue;
      try {
        if (root.userData?.decorSpec && root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(root);
          _markSpawnColliderReady(root);
          registered++;
        }
      } catch (_) { /* skip */ }
    }
    _spawnZoneCollidersRegistered = registered;
    return {
      registered,
      total: near.length,
      ms: Math.round(performance.now() - t0),
      partial: registered < near.length,
    };
  }

  function _nearColliderWorkAllowed() {
    if (ZS.isFrameRecovering?.()) return false;
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsMax != null && s.frameMsMax > 200) return false;
    return true;
  }

  function _yieldToMainLight() {
    return new Promise((r) => setTimeout(r, 0));
  }

  function _yieldToMain() {
    return new Promise((r) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(r, 0));
      else setTimeout(r, 0);
    });
  }

  /** Colliders proches en arrière-plan — le reste via _tickFarColliderDefer. */
  function _runDecorCollidersBackground(opts = {}) {
    if (_decorColliderBgPromise) return _decorColliderBgPromise;
    const px = opts.playerX ?? _state?.player?.x ?? 0;
    const pz = opts.playerZ ?? _state?.player?.z ?? 0;
    const nearRadius = opts.nearRadius ?? (ZS._isMobile ? 58 : 72);
    const { near, far } = _partitionDecorColliderEntries(px, pz, nearRadius);
    _colliderFarQueue = far;
    near.sort((a, b) => _colliderRebuildPriority(a) - _colliderRebuildPriority(b));
    const all = near.filter((entry) => !entry?.root?.userData?.spawnColliderReady);
    const total = all.length;
    if (!total) {
      ZS.endDecorColliderRegisterBatch?.();
      _decorColliderBgPromise = null;
      return Promise.resolve({ total: 0, ms: 0, deferred: far.length });
    }
    let idx = 0;
    const t0 = performance.now();
    const budgetMs = opts.budgetMs ?? 6;
    const onProgress = opts.onProgress;

    _decorColliderBgPromise = new Promise((resolve) => {
      const step = () => {
        const sectorBlock = _isSectorLoadBusy() && !_inBootGrace();
        if (sectorBlock || !_nearColliderWorkAllowed()) {
          const schedPause = typeof requestAnimationFrame === 'function'
            ? (fn) => requestAnimationFrame(fn)
            : (fn) => setTimeout(fn, 16);
          schedPause(step);
          return;
        }
        const sliceStart = performance.now();
        while (idx < all.length && performance.now() - sliceStart < budgetMs) {
          const entry = all[idx++];
          try {
            const { root } = entry;
            if (root?.userData?.spawnColliderReady) continue;
            if (root?.userData?.decorSpec && root.userData.collide !== false) {
              ZS.refreshDecorCollision?.(root);
              _markSpawnColliderReady(root);
            }
          } catch (err) {
            const pid = entry?.data?.prefabId || entry?.root?.userData?.decorSpec?.prefabId;
            console.warn('[sync] collider skip', pid || '?', err?.message || err);
          }
        }
        if (onProgress) onProgress(idx, total);
        if (idx >= all.length) {
          const ms = Math.round(performance.now() - t0);
          console.info('[sync] colliders near', total, ms, 'ms',
            _colliderFarQueue.length ? `(+${_colliderFarQueue.length} lointains différés)` : '');
          ZS.endDecorColliderRegisterBatch?.();
          _decorColliderBgPromise = null;
          resolve({ total, ms, deferred: _colliderFarQueue.length });
          return;
        }
        const sched = typeof requestAnimationFrame === 'function'
          ? (fn) => requestAnimationFrame(fn)
          : (fn) => setTimeout(fn, 0);
        sched(step);
      };
      setTimeout(step, 0);
    });
    return _decorColliderBgPromise;
  }

  function _tickFarColliderDefer(dt) {
    if (!_colliderFarQueue.length) return;
    const plan = _lastBacklogPlan;
    if (plan && !plan.allow.colliderFar && !_inSpawnZoneBoost()) return;
    if (_isSectorLoadBusy() && !_inSpawnZoneBoost()) return;
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsMax != null && fpsStats.frameMsMax > 140) return;
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 110) return;
    _colliderFarAcc += dt;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const interval = fps != null && fps < 14 ? 0.32 : 0.14;
    if (_colliderFarAcc < interval) return;
    _colliderFarAcc = 0;
    const budget = fps != null && fps < 16 ? 1 : (ZS._isMobile ? 1 : 2);
    const before = _colliderFarQueue.length;
    _beginColliderBatch();
    for (let i = 0; i < budget && _colliderFarQueue.length; i++) {
      const entry = _colliderFarQueue.shift();
      try {
        if (entry?.root?.userData?.decorSpec && entry.root.userData.collide !== false) {
          ZS.refreshDecorCollision?.(entry.root);
        }
      } catch (_) { /* skip */ }
    }
    _endColliderBatch();
    if (before > 0 && !_colliderFarQueue.length && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('collider-defer-done', { processed: before });
    }
  }
