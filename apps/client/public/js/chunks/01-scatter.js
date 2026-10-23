// Pick + scatter instancé
const _BUILDERS = [
    { w: 22, fn: _pebbleCluster, gap: 0.75, tiny: false },
    { w: 20, fn: _shells, gap: 0.7, tiny: false },
    { w: 18, fn: _smallLog, gap: 0.45, tiny: true },
    { w: 16, fn: _tinyShell, gap: 0.35, tiny: true },
    { w: 14, fn: _beachGrass, gap: 1.1, tiny: false },
    { w: 12, fn: _woodChip, gap: 0.3, tiny: true },
    { w: 11, fn: _driftwood, gap: 1.6, tiny: false },
    { w: 10, fn: _shoreRock, gap: 1.4, tiny: false },
    { w: 9, fn: _seaglass, gap: 0.4, tiny: true },
    { w: 8, fn: _sandDollar, gap: 0.5, tiny: true },
    { w: 8, fn: _starfish, gap: 0.85, tiny: true },
    { w: 7, fn: _coralBit, gap: 0.55, tiny: true },
    { w: 7, fn: _coconutPile, gap: 1.2, tiny: false },
    { w: 6, fn: _litter, gap: 0.9, tiny: false },
    { w: 5, fn: _litterScatter, gap: 1.2, tiny: false },
    { w: 5, fn: _ropeBit, gap: 0.7, tiny: true },
    { w: 5, fn: _towel, gap: 1.8, tiny: false },
    { w: 4, fn: _surfboard, gap: 2.0, tiny: false },
    { w: 4, fn: _crate, gap: 2.2, tiny: false },
    { w: 4, fn: _seaweed, gap: 1.3, tiny: false },
    { w: 3, fn: _fishNet, gap: 2.5, tiny: false },
    { w: 3, fn: _barrel, gap: 2.2, tiny: false },
    { w: 2, fn: _tidePool, gap: 2.8, tiny: false },
    { w: 2, fn: _beachChair, gap: 3.2, tiny: false },
    { w: 2, fn: _firePit, gap: 3.2, tiny: false },
    { w: 2, fn: _buoy, gap: 3.8, tiny: false },
    { w: 1, fn: _umbrella, gap: 4.5, tiny: false },
    { w: 1, fn: _boatHull, gap: 5.5, tiny: false },
  ];

  function _pickBuilder(rng, x) {
    const shore = x > MAP_EAST_X - 22;
    const roll = rng() * 160;
    let acc = 0;
    for (const b of _BUILDERS) {
      let w = b.w;
      if (shore) {
        if (b.fn === _seaweed || b.fn === _shoreRock || b.fn === _buoy
            || b.fn === _tidePool || b.fn === _fishNet || b.fn === _boatHull
            || b.fn === _coralBit || b.fn === _seaglass || b.fn === _litter) w *= 2.4;
      }
      if (!shore && (b.fn === _tinyShell || b.fn === _sandDollar || b.fn === _pebbleCluster
          || b.fn === _shells || b.fn === _smallLog)) w *= 1.35;
      acc += w;
      if (roll < acc) return b;
    }
    return _BUILDERS[0];
  }

  function _scatterTideLine(parent, placed, rng, scale) {
    const count = Math.max(18, Math.round((scale < 0.85 ? 28 : 52) * (scale || 1)));
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 12) {
      tries++;
      const x = MAP_EAST_X - 6 - rng() * 24;
      const z = -8 + (rng() * 2 - 1) * 58;
      if (_coast(x, z) < 0.52) continue;
      if (!_canPlace(x, z, placed, 0.55, true)) continue;
      const y = _groundY(x, z);
      const roll = rng();
      if (roll < 0.42) _seaweed(parent, x, y, z, rng);
      else if (roll < 0.72) _shells(parent, x, y, z, rng);
      else if (roll < 0.88) _ropeBit(parent, x, y, z, rng);
      else _tinyShell(parent, x, y, z, rng);
      placed.push({ x, z, tiny: true });
      n++;
    }
  }

  function _scatterWakeMicro(parent, placed, rng, scale) {
    const cx = 282;
    const cz = -8;
    const rx = 13;
    const rz = 16;
    const target = Math.max(10, Math.round((scale < 0.85 ? 18 : 32) * (scale || 1)));
    let n = 0;
    let tries = 0;
    while (n < target && tries < target * 20) {
      tries++;
      const x = cx + (rng() * 2 - 1) * rx;
      const z = cz + (rng() * 2 - 1) * rz;
      if (_coast(x, z) < 0.25) continue;
      if (Math.hypot(x - SPAWN_X, z - SPAWN_Z) < 5) continue;
      const pick = _pickBuilder(rng, x);
      if (!_canPlace(x, z, placed, pick.gap * 0.82, pick.tiny)) continue;
      pick.fn(parent, x, _groundY(x, z), z, rng);
      placed.push({ x, z, tiny: pick.tiny });
      n++;
    }
  }

  function _scatterInstanced(parent, opts) {
    const { geo, mat, count, rng, placed, cx, cz, rx, rz, scaleFn } = opts;
    if (!geo || !mat || count < 1) return;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let placedN = 0;
    let tries = 0;
    const maxTries = count * 25;
    while (placedN < count && tries < maxTries) {
      tries++;
      const x = cx + (rng() * 2 - 1) * rx;
      const z = cz + (rng() * 2 - 1) * rz;
      if (!_canPlace(x, z, placed, 0.12, true)) continue;
      const y = _groundY(x, z);
      const s = scaleFn ? scaleFn(rng) : 0.8 + rng() * 0.5;
      dummy.position.set(x, y + 0.006 * s, z);
      dummy.rotation.set(
        (rng() - 0.5) * 0.5,
        rng() * Math.PI * 2,
        (rng() - 0.5) * 0.4);
      dummy.scale.set(s, s * (0.7 + rng() * 0.4), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placedN, dummy.matrix);
      placed.push({ x, z, tiny: true });
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

  function _anchorSlice(list) {
    const tier = ZS.Options?.getResolvedTier?.() ?? 'high';
    const frac = tier === 'potato' ? 0.2 : tier === 'low' ? 0.45 : tier === 'medium' ? 0.72 : 1;
    const minN = tier === 'potato' ? 4 : tier === 'low' ? 8 : list.length;
    return list.slice(0, Math.max(minN, Math.ceil(list.length * frac)));
  }
