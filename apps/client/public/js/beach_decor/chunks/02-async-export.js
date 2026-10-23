// Build async + export
async function buildBeachDecorAsync(scene) {
    if (!scene) return;
    const scale = ZS.Options?.getDecorScale?.() ?? 1;
    const mobile = scale < 0.85 || !!(window.__ZS_TOUCH_MODE || window.ZS?._touchInput || window.ZS?._isMobile);
    const target = Math.max(14, Math.round((mobile ? 88 : 178) * scale));
    const rng = _rng(44291);
    const placed = [];
    const cx = 268;
    const cz = -8;
    const rx = 22;
    const rz = 74;
    let attempts = 0;
    const maxAttempts = target * 50;
    let sinceYield = 0;

    const root = new THREE.Group();
    root.name = 'beachDecor';
    scene.add(root);

    while (placed.length < target && attempts < maxAttempts) {
      attempts++;
      const x = cx + (rng() * 2 - 1) * rx;
      const z = cz + (rng() * 2 - 1) * rz;
      const pick = _pickBuilder(rng, x);
      if (!_canPlace(x, z, placed, pick.gap, pick.tiny)) continue;
      const y = _groundY(x, z);
      pick.fn(root, x, y, z, rng);
      placed.push({ x, z, tiny: pick.tiny });
      if (++sinceYield >= _buildYieldBatch(mobile)) {
        sinceYield = 0;
        await _buildYieldFrame();
      }
    }

    const shellMat = BT().getShellMaterial?.();
    const pebbleMat = BT().getPebbleMaterial?.(17);
    const chipMat = BT().getWoodMaterial?.(303);
    await _yieldFrame();
    if (shellMat) {
      await _scatterInstancedAsync(root, {
        geo: _GEO.tinyShell,
        mat: shellMat,
        count: Math.max(10, Math.round((mobile ? 110 : 230) * scale)),
        rng: _rng(99102),
        placed, cx, cz, rx, rz,
        scaleFn: (r) => 0.55 + r() * 0.7,
      });
    }
    await _yieldFrame();
    if (pebbleMat) {
      await _scatterInstancedAsync(root, {
        geo: _GEO.pebble,
        mat: pebbleMat,
        count: Math.max(10, Math.round((mobile ? 95 : 195) * scale)),
        rng: _rng(88103),
        placed, cx, cz, rx, rz,
        scaleFn: (r) => 0.45 + r() * 0.75,
      });
    }
    await _yieldFrame();
    if (chipMat) {
      await _scatterInstancedAsync(root, {
        geo: _GEO.woodChip,
        mat: chipMat,
        count: Math.max(6, Math.round((mobile ? 45 : 90) * scale)),
        rng: _rng(77104),
        placed, cx, cz, rx, rz,
        scaleFn: (r) => 0.7 + r() * 0.6,
      });
    }

    _scatterTideLine(root, placed, _rng(55102), scale);
    await _yieldFrame();
    _scatterWakeMicro(root, placed, _rng(66103), scale);
    await _yieldFrame();

    const anchors = [
      [281, -5.2, _buoy], [283, 9.5, _driftwood], [279, -14.2, _shells], [285, 6.1, _ropeBit],
      [254, -12, _umbrella], [258, 8, _beachChair], [262, -28, _surfboard],
      [270, 18, _crate], [276, -38, _buoy], [284, 22, _driftwood],
      [252, 32, _towel], [288, -8, _seaweed], [256, -48, _pebbleCluster],
      [274, 48, _shells], [281, -18, _umbrella], [249, 22, _beachGrass],
      [291, 12, _coconutPile], [266, -62, _shoreRock], [286, -52, _tidePool],
      [293, 35, _fishNet], [260, -72, _firePit], [278, 58, _barrel],
      [294, -28, _boatHull], [251, -35, _starfish], [272, 0, _towel],
      [255, -22, _litterScatter], [268, 35, _smallLog], [283, -42, _ropeBit],
      [257, 15, _sandDollar], [290, -15, _coralBit], [264, 42, _seaglass],
    ];
    const anchorList = _anchorSlice(anchors);
    for (let ai = 0; ai < anchorList.length; ai++) {
      const [ax, az, fn] = anchorList[ai];
      if (!_canPlace(ax, az, placed, 1.5, false)) continue;
      fn(root, ax, _groundY(ax, az), az, _rng(Math.floor(ax * 17 + az)));
      placed.push({ x: ax, z: az, tiny: false });
      if (ai % 6 === 5) await _buildYieldFrame();
    }
    ZS.BeachAmbientLife?.mount?.(scene);
    _ensureOffshoreWreck(scene);

    const streamer = ZS.Engine?.ChunkStreamer;
    if (streamer) {
      const cs = streamer.CHUNK_SIZE ?? 64;
      streamer.ensureLayer('beach', { chunkSize: cs });
      const key = streamer.chunkKeyFromWorld?.(cx, cz, cs)
        ?? `${Math.floor(cx / cs)},${Math.floor(cz / cs)}`;
      streamer.registerChunk('beach', key, { group: root, cx, cz });
    }
  }

  function _ensureOffshoreWreck(scene) {
    if (!scene || !ZS.spawnDecorPrefab) return;
    let found = false;
    scene.traverse((o) => {
      if (o.userData?.prefabId === 'spawn_beach_offshore_wreck') found = true;
    });
    if (found) return;
    const root = ZS.spawnDecorPrefab(scene, 'spawn_beach_offshore_wreck', 354, 0.6, -6.8, {
      decorId: 'beach_intro_offshore_fallback',
      rotY: Math.PI * 0.5,
      rotZ: 0.22,
      scale: 2.56,
      grounded: false,
      baseY: 0.6,
      collide: false,
    });
    if (root) root.name = 'beachOffshoreWreckFallback';
  }

  function buildBeachDecor(scene) {
    buildBeachDecorAsync(scene);
  }

  window.ZS = window.ZS || {};
  ZS.buildBeachDecor = buildBeachDecor;
  ZS.buildBeachDecorAsync = buildBeachDecorAsync;
