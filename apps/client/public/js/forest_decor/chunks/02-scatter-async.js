// Scatter + build async — forest_decor.js
function _pickBuilder(rng, x) {
    const deep = x < 80;
    const roll = rng() * 175;
    let acc = 0;
    for (const b of _BUILDERS) {
      let w = b.w;
      if (deep && (b.fn === _fernPatch || b.fn === _mossRock || b.fn === _mossCarpet
          || b.fn === _fallenLog || b.fn === _mushroomCluster)) w *= 1.45;
      if (!deep && x > 170 && (b.fn === _grassTuft || b.fn === _branchScatter)) w *= 1.3;
      acc += w;
      if (roll < acc) return b;
    }
    return _BUILDERS[0];
  }

  function _scatterInstanced(parent, opts) {
    const { geo, mat, count, rng, placed, tracker, scaleFn, forestSector } = opts;
    if (!geo || !mat || count < 1) return;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placedN = 0;
    let tries = 0;
    const maxTries = count * (forestSector ? 36 : 28);
    while (placedN < count && tries < maxTries) {
      tries++;
      let x;
      let z;
      if (forestSector) {
        const sample = _sampleInForest(rng);
        if (!sample) continue;
        x = sample.x;
        z = sample.z;
        if (!_canPlaceForestDecor(x, z, tracker, 0.1, true)) continue;
      } else {
        x = FOREST_CX + (rng() * 2 - 1) * FOREST_RX;
        z = FOREST_CZ + (rng() * 2 - 1) * FOREST_RZ;
        if (!_canPlace(x, z, placed, 0.1, true)) continue;
      }
      const y = _groundY(x, z);
      const s = scaleFn ? scaleFn(rng) : 0.75 + rng() * 0.55;
      dummy.position.set(x, y + 0.005 * s, z);
      dummy.rotation.set(
        (rng() - 0.5) * 0.4,
        rng() * Math.PI * 2,
        (rng() - 0.5) * 0.35);
      dummy.scale.set(s, s * (0.65 + rng() * 0.35), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placedN, dummy.matrix);
      if (tracker) tracker.add(x, z, true);
      placedN++;
    }
    mesh.count = placedN;
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
  }

  function _yieldFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  function _buildYieldBatch(mobile) {
    let batch = mobile ? 8 : 14;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    if (fps != null && fps < 12) batch = Math.max(2, Math.floor(batch * 0.35));
    else if (fps != null && fps < 16) batch = Math.max(3, Math.floor(batch * 0.5));
    else if (fps != null && fps < 20) batch = Math.max(4, Math.floor(batch * 0.72));
    if (ZS._sectorDecorBusy || ZS.Network?.isSectorLoadBusy?.()) {
      batch = Math.max(2, Math.floor(batch * 0.5));
    }
    return batch;
  }

  async function _buildYieldFrame() {
    await _yieldFrame();
    const s = ZS.PerfMonitor?.getStats?.();
    if (s?.frameMsP95 > 88 || (s?.fps != null && s.fps < 14)) {
      await new Promise((resolve) => setTimeout(resolve, 28));
    }
  }

  function _anchorSlice(list) {
    const tier = ZS.Options?.getResolvedTier?.() ?? 'high';
    const frac = tier === 'potato' ? 0.2 : tier === 'low' ? 0.45 : tier === 'medium' ? 0.72 : 1;
    const minN = tier === 'potato' ? 4 : tier === 'low' ? 8 : list.length;
    return list.slice(0, Math.max(minN, Math.ceil(list.length * frac)));
  }

  async function buildForestDecorAsync(scene) {
    if (!scene) return { placed: 0, ms: 0, budget: null };
    ZS.LoadLog?.stepStart?.('forest-decor-build');
    _resetDecorChunks();
    const t0 = performance.now();
    const budget = _decorBudget();
    const tracker = _createPlacedTracker(1.8);
    const mobile = (ZS.Options?.getDecorScale?.() ?? 1) < 0.85
      || !!(window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
    let sinceYield = 0;
    const rng = _rng(55291);

    const root = new THREE.Group();
    root.name = 'forestDecorRoot';
    scene.add(root);
    _forestDecorRoot = root;

    const _TRAIL_BUILDERS = [
      { w: 28, fn: _fernPatch, gap: 0.75, tiny: false },
      { w: 22, fn: _mossCarpet, gap: 0.9, tiny: false },
      { w: 20, fn: _grassTuft, gap: 0.7, tiny: false },
      { w: 18, fn: _branchScatter, gap: 0.45, tiny: true },
      { w: 16, fn: _mushroomCluster, gap: 0.7, tiny: false },
      { w: 14, fn: _pineNeedleMat, gap: 0.8, tiny: false },
      { w: 12, fn: _conePile, gap: 0.35, tiny: true },
      { w: 10, fn: _birchBark, gap: 0.55, tiny: true },
    ];

    const _LIGHT_SCATTER = [
      { w: 24, fn: _pineNeedleMat, gap: 0.8, tiny: false },
      { w: 22, fn: _conePile, gap: 0.35, tiny: true },
      { w: 20, fn: _birchBark, gap: 0.55, tiny: true },
      { w: 18, fn: _branchScatter, gap: 0.45, tiny: true },
      { w: 14, fn: _grassTuft, gap: 0.7, tiny: false },
      { w: 12, fn: _mossCarpet, gap: 0.9, tiny: false },
      { w: 10, fn: _fernPatch, gap: 0.75, tiny: false },
      { w: 8, fn: _mushroomCluster, gap: 0.7, tiny: false },
    ];

    function _pickFrom(list, rngFn, forestW) {
      const roll = rngFn() * 130;
      let acc = 0;
      for (const b of list) {
        let w = b.w;
        if (forestW > 0.65 && (b.fn === _fernPatch || b.fn === _mossCarpet || b.fn === _mushroomCluster)) {
          w *= 1.25;
        }
        acc += w;
        if (roll < acc) return b;
      }
      return list[0];
    }

    function _placeProp(x, z, pick) {
      const parent = _chunkParent(root, x, z);
      const batch = _chunkInstBatch(x, z);
      pick.fn(parent, batch, x, _groundY(x, z), z, rng);
      tracker.add(x, z, pick.tiny);
    }

    function _canPlaceTrailEdge(x, z, minGap, tiny) {
      const td = _trailDist(x, z);
      if (td < 1.2 || td > 4.2) return false;
      if (ZS.isInBeachFootprint?.(x, z, tiny ? 0.15 : 0.8)) return false;
      if (!ZS.isInForestFootprint?.(x, z, tiny ? 0.2 : 0.5)) return false;
      if (_forestW(x, z) < 0.22) return false;
      if (ZS.isInClearingDisc?.(x, z, tiny ? 2 : 4)) return false;
      if (ZS.isInWaterZone?.(x, z)) return false;
      return tracker.canPlace(x, z, minGap, tiny);
    }

    // 1 — Priorité corridor sentier (budget trail)
    const pts = _trailPts();
    const stepAlong = mobile ? 3.6 : 2.6;
    const perSideMax = budget.tier === 'high' ? 2 : 1;
    let trailN = 0;
    for (let i = 1; i < pts.length && trailN < budget.trail; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.5 || _forestW((x0 + x1) * 0.5, (z0 + z1) * 0.5) < 0.25) continue;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;
      const steps = Math.max(1, Math.ceil(len / stepAlong));
      for (let s = 0; s <= steps && trailN < budget.trail; s++) {
        const t = s / steps;
        const cx = x0 + dx * t;
        const cz = z0 + dz * t;
        const fw = _forestW(cx, cz);
        if (fw < 0.25) continue;
        for (let side = -1; side <= 1 && trailN < budget.trail; side += 2) {
          const nSide = Math.min(perSideMax, 1 + (fw > 0.55 ? 1 : 0));
          for (let n = 0; n < nSide && trailN < budget.trail; n++) {
            const dist = 1.5 + rng() * 2.0;
            const px = cx + nx * side * dist + ux * (rng() - 0.5) * 0.45;
            const pz = cz + nz * side * dist + uz * (rng() - 0.5) * 0.45;
            const pick = _pickFrom(_TRAIL_BUILDERS, rng, fw);
            if (!_canPlaceTrailEdge(px, pz, pick.gap * 0.85, pick.tiny)) continue;
            _placeProp(px, pz, pick);
            trailN++;
          }
        }
        if (++sinceYield >= _buildYieldBatch(mobile)) {
          sinceYield = 0;
          await _buildYieldFrame();
        }
      }
    }

    // 2 — Scatter budget restant (builders légers)
    const scatterTarget = Math.max(0, budget.anchors - tracker.count);
    let attempts = 0;
    const maxAttempts = scatterTarget * 45;
    while (tracker.count < budget.anchors && attempts < maxAttempts) {
      attempts++;
      const sample = _sampleInForest(rng);
      if (!sample) continue;
      const { x, z, fw } = sample;
      const pick = _pickFrom(_LIGHT_SCATTER, rng, fw);
      if (!_canPlaceForestDecor(x, z, tracker, pick.gap, pick.tiny)) continue;
      _placeProp(x, z, pick);
      if (++sinceYield >= _buildYieldBatch(mobile)) {
        sinceYield = 0;
        await _buildYieldFrame();
      }
    }

    // 3 — Ancres fixes (subset tier)
    const anchors = [
      [195, -14, _fernPatch], [188, 8, _mossRock], [175, -28, _fallenLog],
      [160, 18, _mushroomCluster], [145, -42, _stumpSmall], [128, 5, _berryBush],
      [110, -18, _mossCarpet], [95, 28, _hollowLog], [78, -55, _rootExposed],
      [62, 12, _pineNeedleMat], [48, -32, _fallenLog], [35, 42, _grassTuft],
      [22, -8, _fernPatch], [18, -48, _mossRock], [8, 22, _conePile],
      [-5, -22, _branchScatter], [-18, 38, _berryBush], [-32, -58, _stumpSmall],
      [-48, 8, _mossCarpet], [-58, -35, _fallenLog], [-72, 48, _birchBark],
      [205, -5, _grassTuft], [198, 32, _mossRock], [168, -62, _antMound],
      [42, -68, _boneRemnant], [88, -72, _oldRope], [-42, -12, _tarpScrap],
      [28, -42, _fernPatch], [-20, 33, _mossRock], [-60, -70, _stumpSmall],
      [120, -88, _pineNeedleMat], [55, 55, _mushroomCluster],
    ];
    for (const [ax, az, fn] of _anchorSlice(anchors)) {
      if (tracker.count >= budget.anchors + 12) break;
      if (!_canPlaceForestDecor(ax, az, tracker, 1.2, false)) continue;
      _placeProp(ax, az, { fn, gap: 1.2, tiny: false });
    }

    const chunkInstCount = _flushAllChunkInstBatches();

    // 4 — Litière instanciée (cap strict)
    const leafMat = FT().getLeafLitterMaterial?.();
    const rockMat = FT().getForestRockMaterial?.(17);
    const instRoot = new THREE.Group();
    instRoot.name = 'forestDecorInstanced';
    root.add(instRoot);
    await _yieldFrame();
    if (leafMat) {
      _scatterInstanced(instRoot, {
        geo: new THREE.BoxGeometry(0.035, 0.006, 0.025),
        mat: leafMat,
        count: budget.instLeaf,
        rng: _rng(88102),
        tracker,
        scaleFn: (r) => 0.55 + r() * 0.85,
        forestSector: true,
      });
    }
    await _yieldFrame();
    if (rockMat) {
      _scatterInstanced(instRoot, {
        geo: _GEO.pebble,
        mat: rockMat,
        count: budget.instRock,
        rng: _rng(77103),
        tracker,
        scaleFn: (r) => 0.5 + r() * 0.8,
        forestSector: true,
      });
    }
    await _yieldFrame();
    _scatterInstanced(instRoot, {
      geo: _GEO.acorn,
      mat: FT().getBarkMaterial?.(42) || rockMat,
      count: budget.instAcorn,
      rng: _rng(66104),
      tracker,
      scaleFn: (r) => 0.65 + r() * 0.55,
      forestSector: true,
    });

    _stripForestDecorShadows(root);
    const spawnX = ZS.SPAWN?.x ?? 248;
    const spawnZ = ZS.SPAWN?.z ?? -8;
    updateForestDecorVisibility(spawnX, spawnZ);

    const ms = Math.round(performance.now() - t0);
    const stats = {
      placed: tracker.count,
      trail: trailN,
      chunks: _decorChunks.size,
      chunkInst: chunkInstCount,
      ms,
      budget,
    };
    ZS.DevLog?.perf?.('forest-decor', ms, stats);
    ZS.DevLog?.trail?.('forest build', stats);
    ZS.LoadLog?.stepEnd?.('forest-decor-build', stats);
    requestAnimationFrame(() => {
      ZS.perfSnapshot?.({ label: 'post-forest-decor', traverse: true });
    });
    return stats;
  }

  function buildForestDecor(scene) {
    buildForestDecorAsync(scene);
  }

  /** @deprecated — alias scatter ; grille sectorielle retirée (perf). */
  async function buildForestSectorDecorAsync(scene) {
    return buildForestDecorAsync(scene);
  }

  /** @deprecated — intégré dans buildForestDecorAsync. */
  async function buildTrailCorridorDecorAsync(scene) {
    return buildForestDecorAsync(scene);
  }

  function finishForestDecorAsync(scene) {
    if (!scene) return Promise.resolve();
    return new Promise((resolve) => {
      const run = async () => {
        ZS.LoadLog?.mark?.('forest-decor-async-start');
        try {
          await buildForestDecorAsync(scene);
        } catch (e) {
          console.warn('[forest] decor deferred', e);
          ZS.LoadLog?.mark?.('forest-decor-async-error', { err: String(e?.message || e) });
        }
        resolve();
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => { run(); }, { timeout: 3500 });
      } else {
        setTimeout(() => { run(); }, 48);
      }
    });
  }
