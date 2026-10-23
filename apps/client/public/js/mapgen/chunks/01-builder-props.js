// Spawn builder — sol + props
function createSpawnBuilder(scene, opts) {
    const texWood = _campTexture('/textures/camp/wood_planks_light.png', 2.2, 1.6);
    const texWoodFine = _campTexture('/textures/camp/wood_planks_light.png', 1.2, 1.0);
    const texCanvas = _campTexture('/textures/camp/olive_canvas.png', 1.4, 1.2);
    const texCanvasTight = _campTexture('/textures/camp/olive_canvas.png', 0.9, 0.9);
    const state = {
      scene,
      seed: Number.isFinite(opts?.seed) ? opts.seed : 1,
      cx: Number.isFinite(opts?.cx) ? opts.cx : 0,
      cz: Number.isFinite(opts?.cz) ? opts.cz : 0,
      baseY: Number.isFinite(opts?.baseY) ? opts.baseY : 0,
      rng: _rng(Number.isFinite(opts?.seed) ? opts.seed : 1),
    };

    function addMesh(parent, geo, mat, x, y, z, rx, ry, rz) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      if (rx) mesh.rotation.x = rx;
      if (ry) mesh.rotation.y = ry;
      if (rz) mesh.rotation.z = rz;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function addTerrainPatch(cx, cz, rx, rz, blend, opts2) {
      if (!ZS.registerTerrainPatch) return null;
      return ZS.registerTerrainPatch(cx, cz, rx, rz, blend, opts2);
    }

    function groundPatch(cx, cz, rx, rz, seed, color) {
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
      state.scene.add(mesh);
      return mesh;
    }

    function trailPatch(points, width, color) {
      const pos = [];
      const idx = [];
      const uv = [];
      const cols = 5;
      const lift = 0.05;

      function sample(px0, pz0, px1, pz1, t) {
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
          const p = sample(x0, z0, x1, z1, t);
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
      state.scene.add(mesh);
      return mesh;
    }

    function campfire(cx, cz, baseY) {
      if (ZS.buildCampfire) return ZS.buildCampfire(state.scene, cx, cz, baseY);
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      state.scene.add(g);

      addMesh(g, new THREE.CylinderGeometry(0.82, 0.9, 0.06, 18),
        new THREE.MeshLambertMaterial({ color: 0x5e5545 }), 0, 0.03, 0);
      addMesh(g, new THREE.CylinderGeometry(0.48, 0.54, 0.05, 14),
        new THREE.MeshLambertMaterial({ color: 0x1e1510 }), 0, 0.06, 0);
      addMesh(g, new THREE.CylinderGeometry(0.19, 0.22, 0.04, 12),
        new THREE.MeshBasicMaterial({ color: 0xff5b15 }), 0, 0.09, 0);

      const barkMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI * 0.3;
        const bx = Math.cos(a) * 0.52;
        const bz = Math.sin(a) * 0.52;
        addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 1.05, 6), barkMat,
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

    function stump(cx, cz, baseY, opts) {
      const height = Number.isFinite(opts?.height) ? opts.height : 0.42;
      const radius = Number.isFinite(opts?.radius) ? opts.radius : 0.22;
      const topR = Math.max(0.14, radius * 0.9);
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      state.scene.add(g);
      addMesh(g, new THREE.CylinderGeometry(radius, radius * 1.12, height, 8),
        new THREE.MeshLambertMaterial({ color: 0x5a3818 }), 0, height * 0.5, 0);
      addMesh(g, new THREE.CylinderGeometry(topR, topR, 0.04, 8),
        new THREE.MeshLambertMaterial({ color: 0xc8a878 }), 0, height + 0.02, 0);
      return g;
    }

    function crate(cx, cz, baseY, opts) {
      const w = Number.isFinite(opts?.w) ? opts.w : 0.58;
      const h = Number.isFinite(opts?.h) ? opts.h : 0.42;
      const d = Number.isFinite(opts?.d) ? opts.d : 0.48;
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(opts?.rotY) ? opts.rotY : 0;
      state.scene.add(g);
      const crateMat = new THREE.MeshLambertMaterial({ color: 0xc69158, map: texWoodFine });
      const lidMat = new THREE.MeshLambertMaterial({ color: 0x966338, map: texWoodFine });
      const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
      addMesh(g, new THREE.BoxGeometry(w, h, d),
        crateMat, 0, h * 0.5, 0);
      addMesh(g, new THREE.BoxGeometry(w * 0.92, 0.04, d * 0.92),
        lidMat, 0, h + 0.02, 0);
      addMesh(g, new THREE.BoxGeometry(w * 0.08, h + 0.02, d * 0.94),
        frameMat, -w * 0.46, h * 0.5, 0);
      addMesh(g, new THREE.BoxGeometry(w * 0.94, 0.04, d * 0.08),
        frameMat, 0, h * 0.38, d * 0.46);
      return g;
    }

    function bedroll(cx, cz, baseY, rotY) {
      const M = ZS.CampTextures?.materials?.();
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(rotY) ? rotY : 0;
      state.scene.add(g);
      const mat = M?.bedrollBody?.() || new THREE.MeshLambertMaterial({ color: 0x3a4548, map: texCanvas });
      const rollMat = M?.bedrollRoll?.() || new THREE.MeshLambertMaterial({ color: 0x2e3638, map: texCanvas });
      addMesh(g, new THREE.BoxGeometry(1.65, 0.06, 0.72), mat, 0, 0.03, 0);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 10), rollMat);
      roll.rotation.z = Math.PI / 2;
      roll.position.set(0.5, 0.12, 0);
      roll.castShadow = true;
      roll.receiveShadow = true;
      g.add(roll);
      return g;
    }

    function backpack(cx, cz, baseY, rotY) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(rotY) ? rotY : 0;
      state.scene.add(g);
      const body = new THREE.MeshLambertMaterial({ color: 0x3d5028, map: texCanvas });
      const strap = new THREE.MeshLambertMaterial({ color: 0x2a3818 });
      addMesh(g, new THREE.BoxGeometry(0.32, 0.42, 0.16), body, 0, 0.21, 0);
      addMesh(g, new THREE.BoxGeometry(0.28, 0.12, 0.14), body, 0, 0.44, -0.02, -0.25, 0, 0);
      for (const sx of [-0.09, 0.09]) {
        addMesh(g, new THREE.BoxGeometry(0.04, 0.38, 0.03), strap, sx, 0.22, 0.09);
      }
      addMesh(g, new THREE.BoxGeometry(0.08, 0.06, 0.04), strap, 0, 0.38, 0.08);
      return g;
    }

    function lantern(cx, cz, baseY, color) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      state.scene.add(g);
      addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 0.38, 8),
        new THREE.MeshLambertMaterial({ color: 0x6a8070 }), 0, 0.19, 0);
      addMesh(g, new THREE.BoxGeometry(0.16, 0.18, 0.16),
        new THREE.MeshLambertMaterial({ color: color || 0xd8c57a, emissive: 0x2b2108, emissiveIntensity: 0.25 }), 0, 0.34, 0);
      const light = new THREE.PointLight(color || 0xffda7d, 0.35, 5, 2);
      light.position.set(0, 0.42, 0);
      g.add(light);
      return g;
    }

    function stone(cx, cz, baseY, opts) {
      const r = Number.isFinite(opts?.radius) ? opts.radius : 0.16;
      const h = Number.isFinite(opts?.height) ? opts.height : 0.12;
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(opts?.rotY) ? opts.rotY : 0;
      state.scene.add(g);
      addMesh(g, new THREE.DodecahedronGeometry(r, 0),
        new THREE.MeshLambertMaterial({ color: 0x7a7468 }), 0, h, 0,
        (state.rng() - 0.5) * 0.7, (state.rng() - 0.5) * 0.7, (state.rng() - 0.5) * 0.7);
      return g;
    }

    function logPile(cx, cz, baseY, rotY) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(rotY) ? rotY : 0;
      state.scene.add(g);
      const bark = new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodFine });
      const endWood = new THREE.MeshLambertMaterial({ color: 0xc4a070 });
      const logs = [
        { x: 0, z: 0, y: 0.08, len: 0.95, r: 0.085, ry: 0 },
        { x: 0.05, z: 0.08, y: 0.08, len: 0.88, r: 0.08, ry: Math.PI / 2 },
        { x: -0.02, z: 0.04, y: 0.22, len: 0.82, r: 0.075, ry: 0.15 },
        { x: 0.04, z: -0.03, y: 0.23, len: 0.78, r: 0.072, ry: Math.PI / 2 + 0.2 },
      ];
      for (const log of logs) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(log.r * 0.9, log.r, log.len, 8), bark);
        body.rotation.z = Math.PI / 2;
        body.rotation.y = log.ry;
        body.position.set(log.x, log.y, log.z);
        body.castShadow = true;
        body.receiveShadow = true;
        g.add(body);
        const cap = new THREE.Mesh(new THREE.CircleGeometry(log.r * 0.85, 8), endWood);
        cap.rotation.y = log.ry;
        cap.rotation.x = Math.PI / 2;
        cap.position.set(
          log.x + Math.cos(log.ry) * log.len * 0.42,
          log.y,
          log.z + Math.sin(log.ry) * log.len * 0.42
        );
        cap.receiveShadow = true;
        g.add(cap);
      }
      return g;
    }

    function leanTo(cx, cz, baseY, rotY) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(rotY) ? rotY : 0;
      state.scene.add(g);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0xb68753, map: texWoodFine });
      const clothMat = new THREE.MeshLambertMaterial({ color: 0x4b5d39, map: texCanvas });
      const ropeMat = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });

      for (const [px, pz] of [
        [-0.95, -0.45],
        [0.95, -0.45],
        [-0.95, 0.55],
        [0.95, 0.55],
      ]) {
        addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6), poleMat, px, 0.8, pz);
      }

      addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), ropeMat, 0, 1.55, -0.15, 0, 0, Math.PI / 2);

      const roofA = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.95), clothMat);
      roofA.position.set(0, 1.2, -0.05);
      roofA.rotation.z = -0.18;
      roofA.castShadow = true;
      roofA.receiveShadow = true;
      g.add(roofA);

      const roofB = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.58), clothMat);
      roofB.position.set(0, 0.9, 0.20);
      roofB.rotation.z = 0.12;
      roofB.castShadow = true;
      roofB.receiveShadow = true;
      g.add(roofB);

      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.62, 0.06),
        new THREE.MeshLambertMaterial({ color: 0x5b6f47, map: texCanvas })
      );
      flap.position.set(0.02, 0.86, 0.55);
      flap.rotation.x = 0.08;
      flap.castShadow = true;
      flap.receiveShadow = true;
      g.add(flap);

      return g;
    }
