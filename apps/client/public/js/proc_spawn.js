// Procedural spawn zone, rebuilt from scratch.
(function () {
  'use strict';

  const SPAWN_CX = 0;
  const SPAWN_CZ = -6;

  function _rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function _smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function _hash(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function _noise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const ux = xf * xf * (3 - 2 * xf);
    const uz = zf * zf * (3 - 2 * zf);
    return _lerp(
      _lerp(_hash(xi, zi), _hash(xi + 1, zi), ux),
      _lerp(_hash(xi, zi + 1), _hash(xi + 1, zi + 1), ux),
      uz
    );
  }

  function _avgTerrain(x, z, radius) {
    const r = radius || 1.5;
    let sum = 0;
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        sum += ZS.getTerrainHeight(x + dx * r, z + dz * r);
        count++;
      }
    }
    return count ? sum / count : ZS.getTerrainHeight(x, z);
  }

  function _add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function _groundPatch(scene, cx, cz, rx, rz, seed, color) {
    const points = [];
    const sides = 52;
    const rr = _rng(seed);
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const wob = 1 + (_noise(Math.cos(a) * 1.8 + seed * 0.001, Math.sin(a) * 1.8 - seed * 0.001) - 0.5) * 0.18;
      const tail = Math.max(0, Math.sin(a - Math.PI * 1.5));
      const stretch = 1 + tail * 0.28;
      points.push(new THREE.Vector2(
        Math.cos(a) * rx * wob * stretch,
        Math.sin(a) * rz * wob * (1 + (rr() - 0.5) * 0.06)
      ));
    }

    const shape = new THREE.Shape(points);
    const geo = new THREE.ShapeGeometry(shape, 4);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const x = cx + lx;
      const z = cz + lz;
      const d = Math.hypot(lx / rx, lz / rz);
      const edge = _smoothstep(Math.max(0, Math.min(1, (d - 0.72) / 0.28)));
      const raw = ZS.getTerrainHeight(x, z);
      const avg = _avgTerrain(x, z, 1.35);
      const h = _lerp(avg, raw, edge) + 0.03;
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      color: color || 0x5f4326,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, 0, cz);
    mesh.renderOrder = 1;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function _trailPatch(scene, points, width, color) {
    const pos = [];
    const idx = [];
    const uv = [];
    const cols = 5;
    const lift = 0.05;

    function _sample(px0, pz0, px1, pz1, t) {
      return {
        x: _lerp(px0, px1, t),
        z: _lerp(pz0, pz1, t),
      };
    }

    let prevRow = -1;
    for (let si = 0; si < points.length - 1; si++) {
      const [x0, z0] = points[si];
      const [x1, z1] = points[si + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const ux = dx / len, uz = dz / len;
      const nx = -uz, nz = ux;
      const steps = Math.max(1, Math.ceil(len / 0.45));
      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const p = _sample(x0, z0, x1, z1, t);
        const w = width * (0.75 + 0.25 * Math.sin((si + t) * 1.7));
        const row = pos.length / 3;
        for (let c = 0; c <= cols; c++) {
          const u = c / cols;
          const off = (u - 0.5) * w;
          const x = p.x + nx * off;
          const z = p.z + nz * off;
          const y = ZS.getTerrainHeight(x, z) + lift;
          pos.push(x, y, z);
          uv.push(u, (si + t) / (points.length - 1));
        }
        if (prevRow >= 0) {
          for (let c = 0; c < cols; c++) {
            const a = prevRow + c, b = prevRow + c + 1;
            const d = row + c, e = row + c + 1;
            idx.push(a, b, d, b, e, d);
          }
        }
        prevRow = row;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: color || 0x6b4a2a,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -5,
    }));
    mesh.renderOrder = 1;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function _campfire(scene, cx, cz, baseY) {
    const g = new THREE.Group();
    g.position.set(cx, baseY, cz);
    scene.add(g);

    _add(g, new THREE.CylinderGeometry(0.82, 0.9, 0.06, 18),
      new THREE.MeshLambertMaterial({ color: 0x5e5545 }), 0, 0.03, 0);
    _add(g, new THREE.CylinderGeometry(0.48, 0.54, 0.05, 14),
      new THREE.MeshLambertMaterial({ color: 0x1e1510 }), 0, 0.06, 0);
    _add(g, new THREE.CylinderGeometry(0.19, 0.22, 0.04, 12),
      new THREE.MeshBasicMaterial({ color: 0xff5b15 }), 0, 0.09, 0);

    const barkMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.3;
      const bx = Math.cos(a) * 0.52;
      const bz = Math.sin(a) * 0.52;
      _add(g, new THREE.CylinderGeometry(0.06, 0.08, 1.05, 6), barkMat,
        bx, 0.12, bz, Math.PI / 2, a + Math.PI / 2, 0);
    }

    const fire = new THREE.PointLight(0xff6a22, 3.8, 24, 1.5);
    fire.position.set(0, 0.6, 0);
    g.add(fire);
    const fill = new THREE.PointLight(0xffa046, 0.55, 12, 2);
    fill.position.set(0.35, 0.35, 0.2);
    g.add(fill);

    return g;
  }

  function _beacon(scene, cx, cz, baseY) {
    const g = new THREE.Group();
    g.position.set(cx, baseY, cz);
    scene.add(g);

    _add(g, new THREE.CylinderGeometry(0.08, 0.1, 4.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x7a5324 }), 0, 2.2, 0);
    _add(g, new THREE.BoxGeometry(1.1, 0.08, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x5a3a18 }), 0.36, 4.08, 0);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.92, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xe07d2b, emissive: 0x331400, emissiveIntensity: 0.3 })
    );
    flag.position.set(0.88, 3.78, 0);
    flag.rotation.z = 0.04;
    flag.castShadow = true;
    flag.receiveShadow = true;
    g.add(flag);
    const lamp = new THREE.PointLight(0xffb24a, 0.9, 12, 2);
    lamp.position.set(0.96, 4.1, 0.03);
    g.add(lamp);
    return g;
  }

  function _tent(scene, cx, cz, baseY) {
    const g = new THREE.Group();
    g.position.set(cx, baseY, cz);
    scene.add(g);

    const canvas = new THREE.MeshLambertMaterial({ color: 0x4d5f39 });
    const pole = new THREE.MeshLambertMaterial({ color: 0x5b3f20 });

    _add(g, new THREE.ConeGeometry(1.65, 2.4, 4, 1), canvas, 0, 1.2, 0, 0, Math.PI / 4, 0);
    _add(g, new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), pole, 0, 1.2, 0);
    _add(g, new THREE.BoxGeometry(1.35, 0.06, 0.12), pole, 0, 1.95, -0.04);
    _add(g, new THREE.BoxGeometry(0.7, 0.6, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x364828 }), 0, 0.72, 1.45);

    return g;
  }

  function _markerPole(scene, x, z, baseY, colA, colB) {
    const g = new THREE.Group();
    g.position.set(x, baseY, z);
    scene.add(g);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const flagMat = new THREE.MeshLambertMaterial({ color: colA || 0xd7c24a });
    _add(g, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), poleMat, 0, 2.1, 0);
    _add(g, new THREE.BoxGeometry(0.95, 0.06, 0.06), poleMat, 0.32, 3.92, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.78, 0.05), flagMat);
    flag.position.set(0.75, 3.62, 0);
    flag.rotation.z = 0.06;
    flag.castShadow = true;
    g.add(flag);
    const lamp = new THREE.PointLight(colB || 0xffc46a, 0.5, 8, 2);
    lamp.position.set(0.86, 3.82, 0.02);
    g.add(lamp);
    return g;
  }

  function _campLayout(scene, B) {
    const cx = SPAWN_CX, cz = SPAWN_CZ;
    const baseY = ZS.getTerrainHeight(cx, cz);
    const map = ZS.MapGen?.createSpawnBuilder
      ? ZS.MapGen.createSpawnBuilder(scene, { seed: 20260606, cx, cz, baseY })
      : null;

    if (map) {
      map.campfire(cx + 0.2, cz - 0.15, baseY);

      map.logPile(cx + 2.1, cz - 2.25, baseY, 0.2);
      map.crate(cx + 2.55, cz + 0.25, baseY, { rotY: -0.34, w: 1.08, h: 0.72, d: 0.82 });
      map.crate(cx + 3.25, cz - 0.7, baseY, { rotY: 0.22, w: 0.72, h: 0.46, d: 0.58 });

      map.workbench(cx - 2.45, cz + 0.3, baseY, 0.16);
      map.bedroll(cx - 2.9, cz - 1.55, baseY, -0.12);
      map.backpack(cx - 1.95, cz - 0.9, baseY, 0.34);
      map.lantern(cx - 1.45, cz - 0.35, baseY, 0xffd47d);

      map.stump(cx - 1.0, cz + 2.0, baseY, { radius: 0.4, height: 0.62 });
      map.stump(cx + 1.05, cz + 1.9, baseY, { radius: 0.38, height: 0.58 });
      map.stone(cx + 0.8, cz + 2.45, baseY, { radius: 0.2, height: 0.06, rotY: -0.35 });
      map.stone(cx -0.4, cz + 2.2, baseY, { radius: 0.14, height: 0.05, rotY: 0.2 });
      map.drinkSet(cx + 1.1, cz - 0.55, baseY + 0.04);

      map.markerPole(cx - 3.35, cz + 1.3, baseY, { side: -1, flagColor: 0xd7c24a, lightColor: 0xffc46a });
      map.markerPole(cx + 1.95, cz + 2.65, baseY, { side: 1, flagColor: 0xb86235, lightColor: 0xffb04d });
      map.markerPole(cx - 0.2, cz + 2.8, baseY, { side: -1, flagColor: 0xd7c24a, lightColor: 0xffd480 });
      return;
    }

    _campfire(scene, cx + 0.2, cz - 0.1, baseY);
    _beacon(scene, cx - 3.4, cz + 1.4, baseY);
  }

  function build(scene) {
    // Spawn décor is now server-seeded and RCON-manageable.
  }

  function _registerTerrain() {
    if (ZS.registerTerrainPatch) {
      ZS.registerTerrainPatch(SPAWN_CX, SPAWN_CZ, 18.0, 16.0, 11.0, {
        smooth: 0.95,
        level: 0.08,
        sampleRadius: 2.2,
      });
    }
  }

  _registerTerrain();
  ZS.SpawnZone = {
    build,
    // Spawn the player south of the camp, facing north into it.
    spawn: { x: SPAWN_CX + 0.4, y: 1, z: SPAWN_CZ + 13.0, rotY: 0 },
  };
  ZS.Buildings.registerSector({ build, roads: [], spawnOnly: true });
}());
