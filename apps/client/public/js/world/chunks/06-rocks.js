// Rochers minables — extrait de world.js (IIFE)
function registerMinableRock(scene, group, x, z, decorId, opts = {}) {
    return _registerRock(scene, group, x, z, decorId, opts);
  }

  function removeMinableRock(decorId) {
    const idx = _rocks.findIndex((r) => r.decorId === decorId);
    if (idx < 0) return;
    _rocks[idx].state = 'gone';
    _rocks.splice(idx, 1);
  }

  function _shakeRock(rock) {
    rock.shakeT = 0.1;
  }

  function _depleteRock(rock) {
    if (!rock || rock.state !== 'active') return;
    rock.state = 'depleted';
    rock.stoneRemaining = 0;
    _updateRockVisual(rock);
    if (rock.decorId) ZS.removeDecorColliders?.(rock.decorId);
    setTimeout(() => {
      if (rock.scene && rock.group?.parent) rock.scene.remove(rock.group);
      const idx = _rocks.indexOf(rock);
      if (idx >= 0) _rocks.splice(idx, 1);
    }, 350);
  }

  function applyRemoteRockMine(decorId, stoneRemaining) {
    const rock = _findRockByDecorId(decorId);
    if (!rock || rock.state !== 'active') return;
    if (Number.isFinite(stoneRemaining)) rock.stoneRemaining = stoneRemaining;
    _updateRockVisual(rock);
    _shakeRock(rock);
  }

  function applyRemoteRockDepleted(decorId) {
    const rock = _findRockByDecorId(decorId);
    if (!rock || rock.state !== 'active') return;
    _depleteRock(rock);
  }

  function hasActiveRockMines() {
    for (const rock of _rocks) {
      if (rock.shakeT > 0) return true;
    }
    return false;
  }

  function tickRockMines(dt) {
    for (const rock of _rocks) {
      if (rock.shakeT > 0) {
        rock.shakeT = Math.max(0, rock.shakeT - dt);
        const s = rock.shakeT > 0 ? (Math.random() - 0.5) * 0.05 * (rock.shakeT / 0.1) : 0;
        rock.group.position.x = rock.x + s;
      }
    }
  }

  function mineRock(ox, oz, dirX, dirZ, range, stoneYield) {
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    let best = null, bestT = Infinity;
    for (const r of _rocks) {
      if (r.state !== 'active') continue;
      const proj = (r.x - ox) * nx + (r.z - oz) * nz;
      if (proj < 0 || proj > range) continue;
      const perp = Math.hypot(ox + nx * proj - r.x, oz + nz * proj - r.z);
      if (perp < _rockHitRadius(r) && proj < bestT) { bestT = proj; best = r; }
    }
    if (!best) return null;
    const yieldAmt = Math.max(1, stoneYield || 1);
    const stoneTaken = Math.min(yieldAmt, best.stoneRemaining);
    best.stoneRemaining -= stoneTaken;
    _shakeRock(best);
    _updateRockVisual(best);
    const depleted = best.stoneRemaining <= 0;
    if (depleted) _depleteRock(best);
    return {
      hit: true,
      depleted,
      stoneTaken,
      stoneRemaining: best.stoneRemaining,
      x: best.x,
      z: best.z,
      decorId: best.decorId || null,
    };
  }
