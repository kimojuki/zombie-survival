// Décor procédural plage — coquillages, rondins, déchets, textures procédurales.
(function () {
  'use strict';

  const SPAWN_X = 248;
  const SPAWN_Z = -8;
  const MAP_EAST_X = 295;

  const BT = () => ZS.BeachTextures || {};

  const _GEO = {
    pebble: new THREE.SphereGeometry(0.05, 4, 3),
    tinyShell: new THREE.ConeGeometry(0.02, 0.032, 4),
    woodChip: new THREE.BoxGeometry(0.05, 0.01, 0.02),
    smallLog: null,
  };
  _GEO.smallLog = new THREE.CylinderGeometry(0.03, 0.035, 0.28, 5);

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _coast(x, z) {
    return ZS.beachCoastWeight ? ZS.beachCoastWeight(x, z) : 0;
  }

  function _groundY(x, z) {
    return ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getBeachSurfaceHeight?.(x, z) ?? 0);
  }

  function _distSeg(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return Math.hypot(px - x0, pz - z0);
    let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
  }

  function _nearTrail(x, z, margin) {
    const pts = ZS.BEACH_TRAIL_PTS || [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1];
      const [x1, z1] = pts[i];
      if (_distSeg(x, z, x0, z0, x1, z1) < margin) return true;
    }
    return false;
  }

  function _canPlace(x, z, placed, minGap, tiny) {
    if (!ZS.isInBeachFootprint?.(x, z, tiny ? 0.2 : 1)) return false;
    if (_coast(x, z) < (tiny ? 0.12 : 0.28)) return false;
    if (!tiny && Math.hypot(x - SPAWN_X, z - SPAWN_Z) < 7.5) return false;
    if (!tiny && _nearTrail(x, z, 2.2)) return false;
    if (tiny && _nearTrail(x, z, 1.4)) return false;
    for (const p of placed) {
      const g = p.tiny && tiny ? minGap * 0.55 : minGap;
      if (Math.hypot(x - p.x, z - p.z) < g) return false;
    }
    return true;
  }

  function _add(parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    if (sx != null) m.scale.set(sx, sy ?? sx, sz ?? sx);
    m.castShadow = !mat.transparent;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  const _shellTints = [0xfff8f0, 0xf0e0d0, 0xe8d0b8, 0xfff0e8, 0xd8c0a8];
  const _fabricHues = [195, 38, 340, 130, 0];

  function _pebbleCluster(parent, x, y, z, rng) {
    const mat = BT().getPebbleMaterial?.(Math.floor(rng() * 10))
      || new THREE.MeshLambertMaterial({ color: 0x9a9088 });
    const n = 4 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const s = 0.55 + rng() * 0.9;
      _add(parent, _GEO.pebble, mat,
        x + (rng() - 0.5) * 0.65, y + 0.02 * s, z + (rng() - 0.5) * 0.65,
        rng() * 0.4, rng() * Math.PI, rng() * 0.3, s, s * 0.85, s);
    }
  }

  function _shells(parent, x, y, z, rng) {
    const n = 4 + Math.floor(rng() * 7);
    for (let i = 0; i < n; i++) {
      const mat = BT().getShellMaterial?.(_shellTints[Math.floor(rng() * _shellTints.length)])
        || new THREE.MeshLambertMaterial({ color: 0xf0e8d8 });
      mat.side = THREE.DoubleSide;
      const kind = rng();
      let geo;
      if (kind < 0.35) {
        geo = new THREE.ConeGeometry(0.04 + rng() * 0.06, 0.07 + rng() * 0.05, 5);
      } else if (kind < 0.65) {
        geo = new THREE.SphereGeometry(0.035 + rng() * 0.04, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
      } else {
        geo = new THREE.BoxGeometry(0.06 + rng() * 0.04, 0.025, 0.05 + rng() * 0.03);
      }
      const sh = _add(parent, geo, mat,
        x + (rng() - 0.5) * 0.55, y + 0.015, z + (rng() - 0.5) * 0.55,
        Math.PI / 2 + (rng() - 0.5) * 0.6, rng() * Math.PI, (rng() - 0.5) * 0.4);
      if (rng() < 0.4) sh.scale.multiplyScalar(0.55 + rng() * 0.35);
    }
  }

  function _tinyShell(parent, x, y, z, rng) {
    const mat = BT().getShellMaterial?.(_shellTints[Math.floor(rng() * _shellTints.length)]);
    mat.side = THREE.DoubleSide;
    _add(parent, new THREE.ConeGeometry(0.018 + rng() * 0.015, 0.028 + rng() * 0.02, 4), mat,
      x, y + 0.008, z, Math.PI / 2 + (rng() - 0.5) * 0.4, rng() * Math.PI, 0,
      0.7 + rng() * 0.5, 0.7 + rng() * 0.5, 0.7 + rng() * 0.5);
  }

  function _sandDollar(parent, x, y, z, rng) {
    const mat = BT().getSandDollarMaterial?.() || new THREE.MeshLambertMaterial({ color: 0xe8d8c0 });
    mat.side = THREE.DoubleSide;
    _add(parent, new THREE.CircleGeometry(0.07 + rng() * 0.03, 6), mat,
      x, y + 0.01, z, -Math.PI / 2, 0, rng() * Math.PI,
      1, 0.75 + rng() * 0.2, 1);
  }

  function _seaglass(parent, x, y, z, rng) {
    const mat = BT().getSeaglassMaterial?.();
    _add(parent, new THREE.BoxGeometry(0.04 + rng() * 0.03, 0.015, 0.03 + rng() * 0.02), mat,
      x, y + 0.01, z, (rng() - 0.5) * 0.3, rng() * Math.PI, (rng() - 0.5) * 0.3);
  }

  function _driftwood(parent, x, y, z, rng) {
    const seed = Math.floor(rng() * 8000);
    const wood = BT().getWoodMaterial?.(seed) || new THREE.MeshLambertMaterial({ color: 0xa08058 });
    const len = 0.7 + rng() * 1.8;
    _add(parent, new THREE.CylinderGeometry(0.04, 0.1, len, 6), wood,
      x, y + 0.06, z, 0, rng() * Math.PI, Math.PI / 2);
    if (rng() < 0.6) {
      _add(parent, new THREE.CylinderGeometry(0.02, 0.045, 0.3 + rng() * 0.4, 5), wood,
        x + 0.12, y + 0.08, z + 0.08, 0, rng() * Math.PI, Math.PI / 3);
    }
  }

  function _smallLog(parent, x, y, z, rng) {
    const wood = BT().getWoodMaterial?.(Math.floor(rng() * 6));
    const s = 0.65 + rng() * 0.55;
    _add(parent, _GEO.smallLog, wood,
      x, y + 0.02 * s, z, (rng() - 0.5) * 0.2, rng() * Math.PI, Math.PI / 2 + (rng() - 0.5) * 0.15,
      s, s, s * (0.8 + rng() * 0.4));
  }

  function _woodChip(parent, x, y, z, rng) {
    const wood = BT().getWoodMaterial?.(Math.floor(rng() * 6));
    const s = 0.75 + rng() * 0.65;
    _add(parent, _GEO.woodChip, wood,
      x, y + 0.008, z, (rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5, s, 1, s);
  }

  function _beachGrass(parent, x, y, z, rng) {
    const mat = BT().getGrassMaterial?.() || new THREE.MeshLambertMaterial({ color: 0xc8d878 });
    mat.side = THREE.DoubleSide;
    const n = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08 + rng() * 0.05, 0.35 + rng() * 0.35), mat);
      blade.position.set(x + Math.cos(ang) * 0.2, y + 0.18, z + Math.sin(ang) * 0.2);
      blade.rotation.y = ang;
      blade.rotation.x = -0.28 - rng() * 0.25;
      blade.castShadow = false;
      parent.add(blade);
      ZS.BeachAmbientLife?.registerSway?.(blade);
    }
  }

  function _shoreRock(parent, x, y, z, rng) {
    const seed = Math.floor(rng() * 5000);
    const mat = BT().getRockMaterial?.(seed) || BT().getPebbleMaterial?.(seed);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + rng() * 0.45, 0), mat);
    rock.position.set(x, y + 0.12, z);
    rock.rotation.set(rng(), rng(), rng());
    rock.scale.set(1, 0.45 + rng() * 0.35, 1);
    rock.castShadow = true;
    parent.add(rock);
  }

  function _coralBit(parent, x, y, z, rng) {
    const mat = BT().getCoralMaterial?.();
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      _add(parent, new THREE.SphereGeometry(0.04 + rng() * 0.06, 5, 4), mat,
        x + (rng() - 0.5) * 0.25, y + 0.03, z + (rng() - 0.5) * 0.25,
        rng() * 0.5, rng() * Math.PI, 0, 1, 0.6 + rng() * 0.5, 1);
    }
  }

  function _litter(parent, x, y, z, rng) {
    const kinds = ['bottle', 'can', 'plastic'];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const mat = BT().getLitterMaterial?.(kind);
    if (kind === 'bottle') {
      _add(parent, new THREE.CylinderGeometry(0.035, 0.04, 0.22 + rng() * 0.08, 6), mat,
        x, y + 0.05, z, (rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.5);
    } else if (kind === 'can') {
      _add(parent, new THREE.CylinderGeometry(0.04, 0.04, 0.07, 8), mat,
        x, y + 0.035, z, Math.PI / 2 + (rng() - 0.5) * 0.3, rng() * Math.PI, 0);
    } else {
      _add(parent, new THREE.BoxGeometry(0.12 + rng() * 0.08, 0.008, 0.08 + rng() * 0.06), mat,
        x, y + 0.006, z, 0, rng() * Math.PI, (rng() - 0.5) * 0.4);
    }
    if (rng() < 0.35) {
      _add(parent, new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4),
        BT().getRustMaterial?.() || mat, x + 0.08, y + 0.01, z, Math.PI / 2, rng() * Math.PI, 0);
    }
  }

  function _litterScatter(parent, x, y, z, rng) {
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      _litter(parent, x + (rng() - 0.5) * 0.4, y, z + (rng() - 0.5) * 0.4, rng);
    }
  }

  function _ropeBit(parent, x, y, z, rng) {
    const mat = BT().getRopeMaterial?.();
    mat.side = THREE.DoubleSide;
    const len = 0.25 + rng() * 0.45;
    _add(parent, new THREE.CylinderGeometry(0.018, 0.022, len, 5), mat,
      x, y + 0.02, z, Math.PI / 2, rng() * Math.PI, (rng() - 0.5) * 0.35);
    if (rng() < 0.5) {
      _add(parent, new THREE.TorusGeometry(0.06 + rng() * 0.04, 0.012, 4, 8), mat,
        x + 0.1, y + 0.025, z, Math.PI / 2, rng() * Math.PI, 0);
    }
  }

  function _crate(parent, x, y, z, rng) {
    const mat = BT().getCrateMaterial?.();
    _add(parent, new THREE.BoxGeometry(0.52, 0.4, 0.45), mat, x, y + 0.2, z, 0, rng() * Math.PI, 0);
    if (rng() < 0.45) {
      _add(parent, new THREE.BoxGeometry(0.54, 0.06, 0.47), BT().getWoodMaterial?.(42),
        x, y + 0.42, z, 0, rng() * Math.PI, 0);
    }
  }

  function _buoy(parent, x, y, z, rng) {
    const pole = BT().getWoodMaterial?.(12);
    const body = BT().getRustMaterial?.();
    _add(parent, new THREE.CylinderGeometry(0.035, 0.045, 0.48, 6), pole, x, y + 0.24, z);
    _add(parent, new THREE.SphereGeometry(0.17, 8, 6), body, x, y + 0.56, z);
    const stripe = BT().getFabricMaterial?.(0);
    _add(parent, new THREE.CylinderGeometry(0.19, 0.21, 0.07, 8), stripe, x, y + 0.4, z);
  }

  function _umbrella(parent, x, y, z, rng) {
    const pole = BT().getWoodMaterial?.(88);
    const canopy = BT().getFabricMaterial?.(rng() < 0.5 ? 0 : 195);
    canopy.side = THREE.DoubleSide;
    _add(parent, new THREE.CylinderGeometry(0.028, 0.038, 1.55, 6), pole, x, y + 0.78, z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.32, 8, 1, true), canopy);
    top.position.set(x, y + 1.5, z);
    top.rotation.x = Math.PI;
    top.castShadow = true;
    parent.add(top);
  }

  function _towel(parent, x, y, z, rng) {
    const mat = BT().getFabricMaterial?.(_fabricHues[Math.floor(rng() * _fabricHues.length)]);
    mat.side = THREE.DoubleSide;
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.5), mat);
    towel.rotation.x = -Math.PI / 2;
    towel.rotation.z = rng() * Math.PI;
    towel.position.set(x, y + 0.02, z);
    towel.receiveShadow = true;
    parent.add(towel);
  }

  function _starfish(parent, x, y, z, rng) {
    const mat = BT().getStarfishMaterial?.();
    mat.side = THREE.DoubleSide;
    _add(parent, new THREE.CircleGeometry(0.1 + rng() * 0.05, 5), mat,
      x, y + 0.01, z, -Math.PI / 2, 0, rng() * Math.PI, 1, 0.65 + rng() * 0.25, 1);
  }

  function _coconutPile(parent, x, y, z, rng) {
    const mat = BT().getCoconutMaterial?.();
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      _add(parent, new THREE.SphereGeometry(0.08 + rng() * 0.04, 6, 5), mat,
        x + (rng() - 0.5) * 0.32, y + 0.06, z + (rng() - 0.5) * 0.32);
    }
  }

  function _seaweed(parent, x, y, z, rng) {
    const mat = BT().getSeaweedMaterial?.();
    mat.side = THREE.DoubleSide;
    for (let i = 0; i < 5 + Math.floor(rng() * 5); i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.06 + rng() * 0.04, 0.4 + rng() * 0.5), mat);
      strip.position.set(x + (rng() - 0.5) * 0.3, y + 0.03, z + (rng() - 0.5) * 0.3);
      strip.rotation.x = -Math.PI / 2 + (rng() - 0.5) * 0.6;
      strip.rotation.z = rng() * 0.7;
      strip.castShadow = false;
      parent.add(strip);
    }
  }

  function _surfboard(parent, x, y, z, rng) {
    const mat = BT().getFabricMaterial?.(rng() < 0.5 ? 0 : 0);
    _add(parent, new THREE.BoxGeometry(0.12, 0.04, 1.6), mat,
      x, y + 0.04, z, 0, rng() * Math.PI, Math.PI / 2 + (rng() - 0.5) * 0.15);
  }

  function _beachChair(parent, x, y, z, rng) {
    const wood = BT().getWoodMaterial?.(201);
    const fabric = BT().getFabricMaterial?.(rng() < 0.5 ? 195 : 38);
    fabric.side = THREE.DoubleSide;
    const ry = rng() * Math.PI;
    _add(parent, new THREE.BoxGeometry(0.5, 0.04, 0.5), wood, x, y + 0.22, z, 0, ry, 0.35);
    _add(parent, new THREE.BoxGeometry(0.48, 0.5, 0.04), fabric, x, y + 0.48, z - 0.12, -0.55, ry, 0);
    _add(parent, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), wood, x - 0.2, y + 0.25, z, 0, ry, 0.4);
    _add(parent, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), wood, x + 0.2, y + 0.25, z, 0, ry, 0.4);
  }

  function _tidePool(parent, x, y, z, rng) {
    const rock = BT().getPebbleMaterial?.(77);
    const rad = 0.42 + rng() * 0.28;
    for (let i = 0; i < 7 + Math.floor(rng() * 4); i++) {
      const a = (i / 10) * Math.PI * 2;
      _add(parent, new THREE.SphereGeometry(0.08 + rng() * 0.1, 5, 4), rock,
        x + Math.cos(a) * rad, y + 0.05, z + Math.sin(a) * rad);
    }
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(rad * 0.72, 8),
      new THREE.MeshLambertMaterial({
        color: 0x4a90a8, transparent: true, opacity: 0.75,
        emissive: 0x102830, emissiveIntensity: 0.12,
      }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, y + 0.03, z);
    parent.add(water);
  }

  function _fishNet(parent, x, y, z, rng) {
    const mat = BT().getNetMaterial?.();
    mat.side = THREE.DoubleSide;
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), mat);
    net.position.set(x, y + 0.08, z);
    net.rotation.x = -Math.PI / 2 + 0.1;
    net.rotation.z = rng() * Math.PI;
    parent.add(net);
    _add(parent, new THREE.CylinderGeometry(0.04, 0.05, 0.35, 5), BT().getWoodMaterial?.(33), x, y + 0.17, z);
  }

  function _barrel(parent, x, y, z, rng) {
    _add(parent, new THREE.CylinderGeometry(0.22, 0.24, 0.42, 8), BT().getRustMaterial?.(),
      x, y + 0.21, z, 0, rng() * Math.PI, (rng() - 0.5) * 0.25);
  }

  function _firePit(parent, x, y, z, rng) {
    const stone = BT().getPebbleMaterial?.(901);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      _add(parent, new THREE.SphereGeometry(0.09 + rng() * 0.05, 5, 4), stone,
        x + Math.cos(a) * 0.35, y + 0.05, z + Math.sin(a) * 0.35);
    }
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.28, 8), BT().getWoodMaterial?.(999));
    ash.rotation.x = -Math.PI / 2;
    ash.position.set(x, y + 0.02, z);
    parent.add(ash);
  }

  function _boatHull(parent, x, y, z, rng) {
    const hull = BT().getWoodMaterial?.(501);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.55), hull);
    body.position.set(x, y + 0.18, z);
    body.rotation.y = rng() * Math.PI;
    body.castShadow = true;
    parent.add(body);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 4), hull);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = body.rotation.y;
    bow.position.set(
      x + Math.cos(body.rotation.y) * 0.85, y + 0.15,
      z + Math.sin(body.rotation.y) * 0.85);
    parent.add(bow);
  }

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
    const batch = Math.max(4, Math.round((mobile ? 8 : 14) * Math.min(1, scale + 0.35)));
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
      if (++sinceYield >= batch) {
        sinceYield = 0;
        await _yieldFrame();
      }
    }

    const shellMat = BT().getShellMaterial?.();
    const pebbleMat = BT().getPebbleMaterial?.(17);
    const chipMat = BT().getWoodMaterial?.(303);
    await _yieldFrame();
    if (shellMat) {
      _scatterInstanced(root, {
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
      _scatterInstanced(root, {
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
      _scatterInstanced(root, {
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
    for (const [ax, az, fn] of _anchorSlice(anchors)) {
      if (!_canPlace(ax, az, placed, 1.5, false)) continue;
      fn(root, ax, _groundY(ax, az), az, _rng(Math.floor(ax * 17 + az)));
      placed.push({ x: ax, z: az, tiny: false });
    }
    ZS.BeachAmbientLife?.mount?.(scene);
    _ensureOffshoreWreck(scene);
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
}());
