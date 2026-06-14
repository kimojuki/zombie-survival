// Véhicules + register sector
const _WHEEL_SLOTS = [[-0.97, -1.38], [0.97, -1.38], [-0.97, 1.38], [0.97, 1.38]];

  function _carcass(scene, cx, cz, opts) {
    opts = opts || {};
    const rotY   = opts.rotY || 0;
    const tilt   = opts.tilt || 0;
    const sink   = opts.sink || 0;
    const burnt  = !!opts.burnt;
    const color  = burnt ? 0x1a1510 : (opts.color || 0x5a3015);
    const cy     = ZS.getTerrainHeight(cx, cz) - sink;

    const bodyM  = new THREE.MeshLambertMaterial({ color });
    const darkM  = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const flatM  = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const glassM = new THREE.MeshLambertMaterial({ color: burnt ? 0x1a2020 : 0x334444, transparent: true, opacity: burnt ? 0.25 : 0.45 });
    const charM  = new THREE.MeshLambertMaterial({ color: 0x0a0806 });
    const g      = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 4.1), bodyM);
    body.position.y = 0.62; body.castShadow = true; body.receiveShadow = true;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.62, 2.15), bodyM);
    cabin.position.set(0, 1.25, -0.18); cabin.castShadow = true;

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.06), glassM);
    windshield.position.set(0, 1.3, -1.2);
    if (burnt) windshield.rotation.x = 0.22;

    const wheelCount = opts.wheels == null ? 4 : Math.max(0, Math.min(4, opts.wheels | 0));
    const skipFrom = wheelCount >= 4 ? 0 : 4 - wheelCount;
    for (let i = 0; i < _WHEEL_SLOTS.length; i++) {
      if (i < skipFrom) continue;
      const [ox, oz] = _WHEEL_SLOTS[i];
      const flat = i >= 2 && (tilt > 0.12 || wheelCount <= 2);
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(flat ? 0.36 : 0.34, flat ? 0.36 : 0.34, flat ? 0.12 : 0.22, 9),
        flat ? flatM : darkM
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(ox, flat ? 0.28 : 0.37, oz);
      g.add(w);
    }

    if (tilt > 0.1 || burnt) {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.1), bodyM);
      hood.position.set(0, 0.92, 1.55);
      hood.rotation.x = burnt ? -0.55 : -0.35;
      g.add(hood);
    }

    if (burnt) {
      const scorch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 2.2), charM);
      scorch.position.set(0, 0.78, 0.2);
      g.add(scorch);
    }

    g.add(body); g.add(cabin); g.add(windshield);
    g.position.set(cx, cy, cz);
    g.rotation.y = rotY;
    g.rotation.z = tilt;
    scene.add(g);
    _colliders.push({ type: 'box', cx, cz, hw: 1.0, hd: 2.2, maxY: cy + 0.98 });
  }

  function _car(scene, cx, cz, rotY, colorHex) {
    _carcass(scene, cx, cz, { rotY, color: colorHex });
  }

  // ── Sector registry ───────────────────────────────────────────────────────────

  function registerSector(sectorObj) {
    if (!sectorObj) return;
    _sectors.push(sectorObj);
    if (sectorObj.spawnOnly === true) _spawnSectors.push(sectorObj);
  }

  function applyRoadFlattening() {
    if (ZS.RoadNetwork) {
      ZS.RoadNetwork.resolve();
      ZS.RoadNetwork.applyFlattening();
      return;
    }
    if (ZS.finalizeRoadNetwork) ZS.finalizeRoadNetwork();
  }

  function _roadRibbonOpts(def) {
    const o = {};
    if (def.taperStart) o.taperStart = def.taperStart;
    if (def.taperEnd)   o.taperEnd   = def.taperEnd;
    return o;
  }

  function buildAll(scene, opts) {
    for (const s of _spawnSectors) {
      if (s.build) s.build(scene, opts);
    }
    for (const s of _sectors) {
      if (s.spawnOnly === true) continue;
      if (s.build) s.build(scene, opts);
    }
    return _colliders;
  }

  // ── Exports ───────────────────────────────────────────────────────────────────

  window.ZS = window.ZS || {};
  ZS.B = {
    M,
    whenRoadTexturesReady,
    mesh:         _mesh,
    wall:         _wall,
    slab:         _slab,
    slabWithHole: _slabWithHole,
    box:          _box,
    visualStairs: _visualStairs,
    ribbon:       _ribbon,
    roadOpts:     _roadRibbonOpts,
    house:        _house,
    immeuble2F:   _buildImmeuble2F,
    farmhouse2F:  _buildFarmhouse2F,
    barn:         _buildBarn,
    watchtower:   _buildWatchtower,
    gasStation:   _buildGasStation,
    car:          _car,
    carcass:      _carcass,
    addCollider:  (c) => _colliders.push(c),
  };
  ZS.registerLoot = registerLoot;
  ZS.isNearRoad     = isNearRoad;
  ZS.getRoadPaths   = () => (ZS.RoadNetwork ? ZS.RoadNetwork.getResolvedEdges() : []);
  ZS.Buildings = { buildAll, registerSector, applyRoadFlattening, getLootBuildings: () => _lootBuildings };
