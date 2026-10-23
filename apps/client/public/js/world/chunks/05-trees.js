// Arbres coupables + chute — extrait de world.js (IIFE)
function registerChoppableTree(scene, group, x, z, decorId, opts = {}) {
    if (decorId) removeChoppableTree(decorId);
    if (opts.baseScale == null) opts.baseScale = group.scale.x || 1;
    return _registerTree(scene, group, x, z, { decorId }, decorId, opts);
  }

  function removeChoppableTree(decorId) {
    const idx = _trees.findIndex((t) => t.decorId === decorId);
    if (idx < 0) return;
    const t = _trees[idx];
    if (t.fallTimer) clearTimeout(t.fallTimer);
    t.state = 'gone';
    _trees.splice(idx, 1);
  }

  function _shakeTree(tree) {
    tree.shakeT = 0.12;
  }

  function _startTreeFall(tree, dirX, dirZ) {
    if (!tree || tree.state !== 'standing') return;
    tree.state = 'falling';
    const len = Math.hypot(dirX, dirZ) || 1;
    const fallYaw = Math.atan2(dirX / len, dirZ / len);
    tree.group.rotation.order = 'YXZ';
    tree.fallAnim = {
      t: 0,
      dur: TREE_FALL_ANIM_SEC,
      fallYaw,
      impactPlayed: false,
    };
    if (tree.decorId) ZS.removeDecorColliders?.(tree.decorId);
    if (tree.fallTimer) clearTimeout(tree.fallTimer);
    tree.fallTimer = setTimeout(() => {
      if (tree.scene && tree.group?.parent) tree.scene.remove(tree.group);
      const idx = _trees.indexOf(tree);
      if (idx >= 0) _trees.splice(idx, 1);
    }, TREE_FALL_LINGER_MS);
  }

  function applyRemoteTreeChop(decorId, woodRemaining, woodMax, extra = {}) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    if (Number.isFinite(woodMax)) tree.woodMax = woodMax;
    if (Number.isFinite(woodRemaining)) tree.woodRemaining = woodRemaining;
    if (Number.isFinite(extra.growthPhase)) tree.growthPhase = extra.growthPhase;
    _shakeTree(tree);
    if (tree.woodRemaining <= 0) {
      const dx = Number(extra.fallDirX);
      const dz = Number(extra.fallDirZ);
      _startTreeFall(tree, Number.isFinite(dx) ? dx : 0, Number.isFinite(dz) ? dz : 1);
    }
  }

  function applyRemoteTreeGrow(decorId, data = {}) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    if (Number.isFinite(data.growthPhase)) tree.growthPhase = data.growthPhase;
    if (Number.isFinite(data.woodMax)) tree.woodMax = data.woodMax;
    if (Number.isFinite(data.woodRemaining)) tree.woodRemaining = data.woodRemaining;
    _updateTreeVisual(tree);
  }

  function _treeHitRadius(tree) {
    return 0.4 + 1.1 * _treeGrowthScale(tree.growthPhase ?? 4);
  }

  function applyRemoteTreeFell(decorId, dirX, dirZ) {
    const tree = _findTreeByDecorId(decorId);
    if (!tree || tree.state !== 'standing') return;
    _startTreeFall(tree, dirX, dirZ);
  }

  function hasActiveTreeAnims() {
    for (const tree of _trees) {
      if (tree.shakeT > 0 || tree.state === 'falling') return true;
    }
    return false;
  }

  function tickTreeFalls(dt) {
    for (const tree of _trees) {
      if (tree.shakeT > 0) {
        tree.shakeT = Math.max(0, tree.shakeT - dt);
        const s = tree.shakeT > 0 ? (Math.random() - 0.5) * 0.06 * (tree.shakeT / 0.12) : 0;
        tree.group.position.x = tree.x + s;
      }
      if (tree.state !== 'falling' || !tree.fallAnim) continue;
      tree.fallAnim.t += dt;
      const p = Math.min(1, tree.fallAnim.t / tree.fallAnim.dur);
      const ease = p * p;
      tree.group.rotation.y = tree.fallAnim.fallYaw;
      tree.group.rotation.x = ease * (Math.PI * 0.46);
      if (p >= 1 && !tree.fallAnim.impactPlayed) {
        tree.fallAnim.impactPlayed = true;
        const sp = ZS.Audio?.spatialAt?.(tree.x, tree.z);
        ZS.Audio?.treeFall?.(0.9 * (sp?.vol ?? 1), sp?.pan);
      }
    }
  }

  // Coupe l'arbre le plus proche devant (ox,oz) — extrait du bois à chaque coup.
  function chopTree(ox, oz, dirX, dirZ, range, woodYield) {
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    let best = null, bestT = Infinity;
    for (const t of _trees) {
      if (t.state !== 'standing') continue;
      const proj = (t.x - ox) * nx + (t.z - oz) * nz;
      if (proj < 0 || proj > range) continue;
      const perp = Math.hypot(ox + nx * proj - t.x, oz + nz * proj - t.z);
      if (perp < _treeHitRadius(t) && proj < bestT) { bestT = proj; best = t; }
    }
    if (!best) return null;
    if (best.woodRemaining <= 0) {
      _startTreeFall(best, dirX, dirZ);
      return {
        hit: true,
        felled: true,
        woodTaken: 0,
        woodRemaining: 0,
        x: best.x,
        z: best.z,
        decorId: best.decorId || null,
      };
    }
    const yieldAmt = Math.max(1, woodYield || 1);
    const woodTaken = Math.min(yieldAmt, best.woodRemaining);
    best.woodRemaining -= woodTaken;
    _shakeTree(best);
    const felled = best.woodRemaining <= 0;
    if (felled) _startTreeFall(best, dirX, dirZ);
    return {
      hit: true,
      felled,
      woodTaken,
      woodRemaining: best.woodRemaining,
      x: best.x,
      z: best.z,
      decorId: best.decorId || null,
    };
  }

  // ── Rochers minables (récolte progressive de pierre) ───────────────────────

  const ROCK_STONE_MAX = {
    rock_boulder: 20, rock_outcrop: 14, spawn_stone: 8,
  };

  const _rocks = [];

  function _stoneMaxFor(prefabId) {
    return ROCK_STONE_MAX[prefabId] ?? 10;
  }

  function _findRockByDecorId(decorId) {
    if (!decorId) return null;
    return _rocks.find((r) => r.decorId === decorId) || null;
  }

  function _rockHarvestRatio(rock) {
    return rock.stoneMax > 0 ? rock.stoneRemaining / rock.stoneMax : 0;
  }

  function _rockVisualScale(ratio) {
    return 0.22 + 0.78 * ratio;
  }

  function _updateRockColliders(rock) {
    if (!rock?.decorId || !ZS.buildDecorColliders) return;
    const spec = rock.group?.userData?.decorSpec;
    if (!spec) return;
    const visualScale = _rockVisualScale(_rockHarvestRatio(rock));
    const effectiveScale = (rock.baseScale || spec.scale || 1) * visualScale;
    ZS.registerDecorColliders(
      rock.decorId,
      ZS.buildDecorColliders({ ...spec, scale: effectiveScale }),
    );
    ZS.Network?.syncWorldColliders?.();
  }

  function _updateRockVisual(rock) {
    const visualScale = _rockVisualScale(_rockHarvestRatio(rock));
    const vis = rock.group.userData.boulderVisual;
    if (vis) {
      vis.scale.setScalar(visualScale);
    } else {
      rock.group.scale.setScalar(rock.baseScale * visualScale);
    }
    _updateRockColliders(rock);
  }

  function _rockHitRadius(rock) {
    return 0.35 + 1.15 * _rockVisualScale(_rockHarvestRatio(rock));
  }

  function _registerRock(scene, group, x, z, decorId, opts = {}) {
    const prefabId = opts.prefabId || group.userData.prefabId || 'rock_boulder';
    const stoneMax = opts.stoneMax ?? _stoneMaxFor(prefabId);
    const stoneRemaining = Number.isFinite(opts.stoneRemaining) ? opts.stoneRemaining : stoneMax;
    const baseScale = Number.isFinite(opts.baseScale) ? opts.baseScale : (group.scale.x || 1);
    const rock = {
      scene, group, x, z, decorId: decorId || null,
      prefabId, stoneMax, stoneRemaining, baseScale,
      state: 'active',
      shakeT: 0,
    };
    _rocks.push(rock);
    _updateRockVisual(rock);
    return rock;
  }
