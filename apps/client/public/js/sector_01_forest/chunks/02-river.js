// Rivière + berges
function _buildRiver(scene) {
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x1a5e8e, emissive: 0x0a3a6a, emissiveIntensity: 0.14,
      transparent: true, opacity: 0.88,
      side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12,
      depthWrite: false,
    });
    ZS.registerWaterMaterial(riverMat);

    const pts = RIVER_PTS;
    const width = RIVER_WATER_WIDTH;
    const STEP = 1.0;
    const CROSS_SEGS = 10;
    const WATER_LIFT = 0.10;
    const pos = [], idx = [];
    let prevRow = null;

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const steps = Math.max(1, Math.ceil(sLen / STEP));
      for (let i = (si === 0 ? 0 : 1); i <= steps; i++) {
        const t = i / steps;
        const x = x0 + sdx * t, z = z0 + sdz * t;
        const row = [];
        for (let ci = 0; ci <= CROSS_SEGS; ci++) {
          const u = ci / CROSS_SEGS;
          const off = (u - 0.5) * width;
          const vx = x + nx * off;
          const vz = z + nz * off;
          const bedY = ZS.getTerrainHeight(vx, vz);
          row.push(pos.length / 3);
          pos.push(vx, bedY + RIVER_WATER_RISE + WATER_LIFT, vz);
        }
        if (prevRow) {
          for (let ci = 0; ci < CROSS_SEGS; ci++) {
            const a = prevRow[ci], b = prevRow[ci + 1];
            const c = row[ci], d = row[ci + 1];
            idx.push(a, c, b, c, d, b);
          }
        }
        prevRow = row;
      }
    }
    if (pos.length >= 9 && idx.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, riverMat);
      mesh.renderOrder = 5;
      scene.add(mesh);
      ZS.registerWaterSurface(mesh, 0.04, 1.0);
    }

    for (let si = 0; si < pts.length - 1; si++) {
      const [x0, z0] = pts[si], [x1, z1] = pts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      const steps = Math.max(1, Math.floor(sLen / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wx = x0 + sdx * t, wz = z0 + sdz * t;
        const waterY = ZS.getTerrainHeight(wx, wz) + RIVER_WATER_RISE;
        ZS.registerWaterZone(wx, wz, RIVER_WATER_WIDTH * 0.52, waterY);
      }
    }

    _buildRiverBanks(scene);
  }

  function _buildRiverBanks(scene) {
    const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
    const mudGeo   = new THREE.CylinderGeometry(1, 1, 0.18, 6);
    const stoneMats = [0x6a6872, 0x7a7060, 0x888888, 0x5a5a68]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const mudMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });

    const bankPts = RIVER_PTS;
    let seed = 0x1A2B3C4D;
    function rr() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0xffffffff; }

    const perStone = stoneMats.map(() => []);
    const muds     = [];

    for (let si = 0; si < bankPts.length - 1; si++) {
      const [x0, z0] = bankPts[si], [x1, z1] = bankPts[si + 1];
      const sdx = x1 - x0, sdz = z1 - z0;
      const sLen = Math.hypot(sdx, sdz);
      if (sLen < 0.01) continue;
      const nx = -sdz / sLen, nz = sdx / sLen;
      const steps = Math.max(2, Math.ceil(sLen / 14)); // espacés tous les 14 (était 8)

      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const cx = x0 + sdx * t, cz = z0 + sdz * t;

        for (const side of [-1, 1]) {
          const bx = cx + nx * (6 + rr() * 2) * side;
          const bz = cz + nz * (6 + rr() * 2) * side;
          const by = ZS.getTerrainHeight(bx, bz);
          muds.push({ x: bx, y: by + 0.08, z: bz, ry: rr() * Math.PI,
            rx: 1.4 + rr() * 0.8, rz: 1.6 + rr() * 0.8 });

          const nStones = 1 + Math.floor(rr() * 2); // 1-2 (était 2-3)
          for (let k = 0; k < nStones; k++) {
            const sx = bx + (rr() - 0.5) * 3.5, sz = bz + (rr() - 0.5) * 3.5;
            const sy = ZS.getTerrainHeight(sx, sz);
            const sr = 0.12 + rr() * 0.22;
            const mi = Math.floor(rr() * stoneMats.length);
            perStone[mi].push({ x: sx, y: sy + sr * 0.2, z: sz, sr,
              sy: 0.45 + rr() * 0.3,
              rx: rr()*Math.PI, ry: rr()*Math.PI, rz: rr()*Math.PI });
          }
        }
      }
    }

    const dummy = new THREE.Object3D();

    // Galets en InstancedMesh par couleur
    for (let mi = 0; mi < stoneMats.length; mi++) {
      const list = perStone[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(stoneGeo, stoneMats[mi], list.length);
      im.castShadow = false;
      for (let k = 0; k < list.length; k++) {
        const s = list[k];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(s.rx, s.ry, s.rz);
        dummy.scale.set(s.sr, s.sr * s.sy, s.sr);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    // Vase en InstancedMesh
    if (muds.length > 0) {
      const im = new THREE.InstancedMesh(mudGeo, mudMat, muds.length);
      im.castShadow = false;
      for (let k = 0; k < muds.length; k++) {
        const m = muds[k];
        dummy.position.set(m.x, m.y, m.z);
        dummy.rotation.set(0, m.ry, 0);
        dummy.scale.set(m.rx, 1, m.rz);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }

  // ── Végétation dense ─────────────────────────────────────────────────────────
  // Arbres prefab : seed serveur (ensureWorldTrees / RCON decorseed trees)

  // ── Poteaux électriques le long de la route principale ───────────────────────
