// Constantes + helpers + builders
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
