// Vie ambiante plage — mouettes (sol + ciel), crabes, brise (client-only).
(function () {
  'use strict';

  const SCARE_R = 5.8;
  const SCARE_R2 = SCARE_R * SCARE_R;
  const CRAB_SCARE_R = 4.2;
  const CRAB_SCARE_R2 = CRAB_SCARE_R * CRAB_SCARE_R;
  const GROUND_GULL_MIN = 6;
  const GROUND_GULL_MAX = 11;
  const CRAB_MIN = 14;
  const CRAB_MAX = 24;

  let _root = null;
  let _birds = [];
  let _groundGulls = [];
  let _crabs = [];
  let _sway = [];
  let _mounted = false;
  let _t = 0;
  let _scatterSfxCd = 0;

  function _makeBirdMat() {
    return new THREE.MeshLambertMaterial({ color: 0xf0f0ec, side: THREE.DoubleSide });
  }

  function _makeWingMat() {
    return new THREE.MeshLambertMaterial({ color: 0xd8d8d0, side: THREE.DoubleSide });
  }

  function _makeCrabMat(tint) {
    return new THREE.MeshLambertMaterial({ color: tint ?? 0x8a4030 });
  }

  function _pickBeachSpot(fromX, fromZ, rng, spreadX, spreadZ) {
    for (let i = 0; i < 16; i++) {
      const lx = fromX + (rng() - 0.5) * spreadX;
      const lz = fromZ + (rng() - 0.5) * spreadZ;
      if (_onBeachSand(lx, lz)) return { x: lx, z: lz };
    }
    return {
      x: fromX + (rng() - 0.5) * spreadX * 0.4,
      z: fromZ + (rng() - 0.5) * spreadZ * 0.4,
    };
  }

  function _groundY(x, z) {
    return (ZS.getDecorGroundHeight?.(x, z) ?? (ZS.getBeachSurfaceHeight?.(x, z) ?? 0)) + 0.045;
  }

  function _onBeachSand(x, z) {
    return (ZS.beachCoastWeight?.(x, z) ?? 0) >= 0.26;
  }

  function _buildGullMesh(scale) {
    const g = new THREE.Group();
    g.scale.setScalar(scale);
    const body = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), _makeBirdMat());
    body.position.y = 0.02;
    g.add(body);
    const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.1), _makeWingMat());
    wingL.position.set(-0.18, 0.04, 0.01);
    wingL.name = 'wingL';
    g.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x = 0.18;
    wingR.name = 'wingR';
    g.add(wingR);
    const legMat = new THREE.MeshLambertMaterial({ color: 0xc8a060 });
    for (const sx of [-0.06, 0.06]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.018), legMat);
      leg.position.set(sx, -0.02, 0.02);
      g.add(leg);
    }
    return { mesh: g, wingL, wingR, body };
  }

  function _spawnSkyBird(parent, rng) {
    const { mesh: g, wingL, wingR } = _buildGullMesh(1);
    const cx = 284 + rng() * 10;
    const cz = -8 + (rng() * 2 - 1) * 28;
    const alt = 7.5 + rng() * 5.5;
    g.position.set(cx, alt, cz);
    g.userData.billboard = true;
    parent.add(g);
    _birds.push({
      mesh: g,
      wingL,
      wingR,
      cx,
      cz,
      alt,
      phase: rng() * Math.PI * 2,
      speed: 0.08 + rng() * 0.12,
      orbit: 2.2 + rng() * 3.5,
    });
    return g;
  }

  function _pickLandSpot(fromX, fromZ, rng) {
    return _pickBeachSpot(fromX, fromZ, rng, 36, 44);
  }

  function _pickCrabSpot(fromX, fromZ, rng) {
    return _pickBeachSpot(fromX, fromZ, rng, 10, 12);
  }

  function _spawnGroundGull(parent, x, z, rng) {
    const { mesh: g, wingL, wingR } = _buildGullMesh(0.88);
    g.position.set(x, _groundY(x, z), z);
    g.rotation.y = rng() * Math.PI * 2;
    g.userData.billboard = true;
    parent.add(g);
    _groundGulls.push({
      mesh: g,
      wingL,
      wingR,
      state: 'ground',
      x,
      z,
      phase: rng() * Math.PI * 2,
      flyT: 0,
      flyDur: 0,
      landX: x,
      landZ: z,
      vx: 0,
      vz: 0,
      peakAlt: 0,
      scareCd: 0,
    });
  }

  function _scatterGroundGulls(g, px, pz, rng) {
    g.state = 'fly';
    g.flyT = 0;
    g.flyDur = 1.5 + rng() * 1.4;
    const spot = _pickLandSpot(g.x, g.z, rng);
    g.landX = spot.x;
    g.landZ = spot.z;
    const dx = g.landX - g.x;
    const dz = g.landZ - g.z;
    const dist = Math.hypot(dx, dz) || 1;
    const spd = 7.5 + rng() * 5;
    g.vx = (dx / dist) * spd;
    g.vz = (dz / dist) * spd;
    g.peakAlt = 3.5 + rng() * 4.5;
    g.scareCd = 2.2 + rng() * 2.5;
    if (_scatterSfxCd <= 0) {
      const away = Math.hypot(g.x - px, g.z - pz) || 1;
      ZS.Audio?.scatterSeagull?.(Math.max(0.2, 1 - away / SCARE_R));
      _scatterSfxCd = 0.15;
    }
  }

  function _spawnCrab(parent, x, z, rng) {
    const scale = 0.72 + rng() * 0.62;
    const tint = (0x7a3828 + Math.floor(rng() * 0x221810)) & 0xffffff;
    const shellMat = _makeCrabMat(tint);
    const clawMat = _makeCrabMat((tint + 0x181008) & 0xffffff);

    const g = new THREE.Group();
    g.scale.setScalar(scale);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), shellMat);
    shell.scale.set(1.2, 0.55, 1.35);
    shell.position.y = 0.05;
    g.add(shell);

    const legs = [];
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.1), shellMat);
      const a = (i / 4) * Math.PI * 2 + rng() * 0.4;
      leg.position.set(Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09);
      leg.rotation.y = a;
      g.add(leg);
      legs.push(leg);
    }

    const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), clawMat);
    clawL.position.set(0.1, 0.04, 0.07);
    clawL.rotation.y = 0.5;
    g.add(clawL);
    const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), clawMat);
    clawR.position.set(0.1, 0.04, -0.07);
    clawR.rotation.y = -0.5;
    g.add(clawR);
    const pincerL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.04), clawMat);
    pincerL.position.set(0.14, 0.038, 0.1);
    g.add(pincerL);
    const pincerR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.04), clawMat);
    pincerR.position.set(0.14, 0.038, -0.1);
    g.add(pincerR);

    g.position.set(x, _groundY(x, z) - 0.025, z);
    g.rotation.y = rng() * Math.PI * 2;
    parent.add(g);
    _crabs.push({
      mesh: g,
      legs,
      claws: [clawL, clawR, pincerL, pincerR],
      x,
      z,
      homeX: x,
      homeZ: z,
      state: 'idle',
      vx: 0,
      vz: 0,
      fleeT: 0,
      fleeDur: 0,
      scareCd: 0,
      phase: rng() * Math.PI * 2,
      scuttle: 0.12 + rng() * 0.28,
      legPhase: rng() * Math.PI * 2,
    });
  }

  function _fleeCrab(c, px, pz, rng) {
    c.state = 'flee';
    c.fleeT = 0;
    c.fleeDur = 0.55 + rng() * 1.05;
    let dx = c.x - px;
    let dz = c.z - pz;
    const dist = Math.hypot(dx, dz) || 1;
    dx /= dist;
    dz /= dist;
    const jitter = (rng() - 0.5) * 0.55;
    dx += jitter;
    dz += (rng() - 0.5) * 0.55;
    const len = Math.hypot(dx, dz) || 1;
    const spd = 2.6 + rng() * 2.8;
    c.vx = (dx / len) * spd;
    c.vz = (dz / len) * spd;
    c.scareCd = 1.2 + rng() * 2.2;
  }

  function mount(scene) {
    if (!scene || _mounted) return;
    _mounted = true;
    _root = new THREE.Group();
    _root.name = 'beachAmbientLife';
    scene.add(_root);

    const rng = () => Math.random();
    const potato = ZS.Options?.getResolvedTier?.() === 'potato';
    const skyN = potato ? 2 : 4;
    for (let i = 0; i < skyN; i++) _spawnSkyBird(_root, rng);

    const gullN = potato
      ? GROUND_GULL_MIN
      : GROUND_GULL_MIN + Math.floor(rng() * (GROUND_GULL_MAX - GROUND_GULL_MIN + 1));
    for (let i = 0; i < gullN; i++) {
      let x = 0;
      let z = 0;
      for (let t = 0; t < 20; t++) {
        x = 256 + rng() * 38;
        z = -8 + (rng() * 2 - 1) * 38;
        if (_onBeachSand(x, z)) break;
      }
      _spawnGroundGull(_root, x, z, rng);
    }

    const crabN = potato
      ? CRAB_MIN
      : CRAB_MIN + Math.floor(rng() * (CRAB_MAX - CRAB_MIN + 1));
    for (let i = 0; i < crabN; i++) {
      let x = 0;
      let z = 0;
      for (let t = 0; t < 24; t++) {
        x = 252 + rng() * 42;
        z = -8 + (rng() * 2 - 1) * 42;
        if (_onBeachSand(x, z)) break;
      }
      _spawnCrab(_root, x, z, rng);
    }

    const billboards = [
      ..._birds.map((b) => b.mesh),
      ..._groundGulls.map((g) => g.mesh),
    ];
    ZS.registerBillboards?.(billboards);
  }

  function registerSway(mesh) {
    if (mesh) _sway.push({ mesh, baseX: mesh.rotation.x, phase: Math.random() * Math.PI * 2 });
  }

  function tick(dt, px, pz) {
    if (!_root?.parent) return;
    _t += dt;
    _scatterSfxCd = Math.max(0, _scatterSfxCd - dt);
    const rng = Math.random;
    const hasPlayer = Number.isFinite(px) && Number.isFinite(pz);

    for (const b of _birds) {
      const ang = _t * b.speed + b.phase;
      b.mesh.position.x = b.cx + Math.cos(ang) * b.orbit;
      b.mesh.position.z = b.cz + Math.sin(ang * 0.85) * b.orbit * 0.65;
      b.mesh.position.y = b.alt + Math.sin(_t * 1.6 + b.phase) * 0.35;
      const flap = Math.sin(_t * 9 + b.phase) * 0.55;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }

    for (const g of _groundGulls) {
      if (g.scareCd > 0) g.scareCd -= dt;

      if (g.state === 'ground') {
        g.mesh.position.y = _groundY(g.x, g.z) + Math.sin(_t * 2.8 + g.phase) * 0.012;
        const peck = Math.sin(_t * 4.5 + g.phase * 2) > 0.92 ? 0.12 : 0;
        g.wingL.rotation.z = peck;
        g.wingR.rotation.z = -peck;
        if (hasPlayer && g.scareCd <= 0) {
          const dx = g.x - px;
          const dz = g.z - pz;
          if (dx * dx + dz * dz < SCARE_R2) _scatterGroundGulls(g, px, pz, rng);
        }
      } else {
        g.flyT += dt;
        const t = Math.min(1, g.flyT / g.flyDur);
        g.x += g.vx * dt;
        g.z += g.vz * dt;
        const arc = Math.sin(t * Math.PI);
        const alt = g.peakAlt * arc;
        const gy = _groundY(g.x, g.z);
        g.mesh.position.set(g.x, gy + alt, g.z);
        g.mesh.rotation.y = Math.atan2(g.vx, g.vz);
        const flap = Math.sin(_t * 26 + g.phase) * 0.92;
        g.wingL.rotation.z = flap;
        g.wingR.rotation.z = -flap;
        if (t >= 1) {
          g.state = 'ground';
          g.x = g.landX;
          g.z = g.landZ;
          g.mesh.position.set(g.x, _groundY(g.x, g.z), g.z);
          g.wingL.rotation.z = 0;
          g.wingR.rotation.z = 0;
        }
      }
    }

    for (const c of _crabs) {
      if (c.scareCd > 0) c.scareCd -= dt;

      if (c.state === 'idle') {
        const wiggle = Math.sin(_t * 2.2 + c.phase) * c.scuttle;
        c.x = c.homeX + Math.cos(c.phase) * wiggle;
        c.z = c.homeZ + Math.sin(c.phase) * wiggle;
        c.mesh.position.set(c.x, _groundY(c.x, c.z) - 0.025, c.z);
        const clawWave = Math.sin(_t * 5 + c.phase) * 0.18;
        if (c.claws?.[0]) c.claws[0].rotation.z = clawWave;
        if (c.claws?.[1]) c.claws[1].rotation.z = -clawWave;
        if (hasPlayer && c.scareCd <= 0) {
          const dx = c.x - px;
          const dz = c.z - pz;
          if (dx * dx + dz * dz < CRAB_SCARE_R2) _fleeCrab(c, px, pz, rng);
        }
      } else {
        c.fleeT += dt;
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        c.mesh.position.set(c.x, _groundY(c.x, c.z) - 0.025, c.z);
        c.mesh.rotation.y = Math.atan2(c.vx, c.vz);
        const legSpd = 38 + c.fleeT * 12;
        c.legPhase += dt * legSpd;
        for (let i = 0; i < c.legs.length; i++) {
          const leg = c.legs[i];
          leg.rotation.x = Math.sin(c.legPhase + i * 1.6) * 0.55;
        }
        const panic = Math.sin(_t * 24 + c.phase) * 0.35;
        if (c.claws?.[0]) c.claws[0].rotation.z = panic;
        if (c.claws?.[1]) c.claws[1].rotation.z = -panic;
        if (c.fleeT >= c.fleeDur) {
          const spot = _pickCrabSpot(c.x, c.z, rng);
          c.state = 'idle';
          c.x = spot.x;
          c.z = spot.z;
          c.homeX = spot.x;
          c.homeZ = spot.z;
          c.vx = 0;
          c.vz = 0;
          c.mesh.position.set(c.x, _groundY(c.x, c.z) - 0.025, c.z);
          for (const leg of c.legs) leg.rotation.x = 0;
        }
      }
    }
    for (const s of _sway) {
      s.mesh.rotation.x = s.baseX + Math.sin(_t * 1.4 + s.phase) * 0.06;
    }
  }

  function dispose() {
    if (_root?.parent) _root.parent.remove(_root);
    _root = null;
    _birds = [];
    _groundGulls = [];
    _crabs = [];
    _sway = [];
    _mounted = false;
  }

  window.ZS = window.ZS || {};
  ZS.BeachAmbientLife = { mount, tick, registerSway, dispose };
}());
