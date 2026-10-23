// Sentier, ring clairière, trail decor — extrait de spawn_clearing.js (IIFE)
function _onPath(x, z) {
    if (ZS.Trails?.isNear) return ZS.Trails.isNear(SPAWN_TRAIL_PTS, x, z, 1.15);
    const margin = 1.2;
    for (let i = 0; i < SPAWN_TRAIL_PTS.length - 1; i++) {
      const [x0, z0] = SPAWN_TRAIL_PTS[i];
      const [x1, z1] = SPAWN_TRAIL_PTS[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      if (Math.hypot(x - px, z - pz) < margin) return true;
    }
    return false;
  }

  function _samplePath(t, pts) {
    if (ZS.Trails?.sample) return ZS.Trails.sample(pts || SPAWN_TRAIL_PTS, t);
    return _pointAlongPath(pts || SPAWN_TRAIL_PTS, t);
  }

  function _pointAlongPath(pts, t) {
    let total = 0;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dz = pts[i + 1][1] - pts[i][1];
      const l = Math.hypot(dx, dz);
      segs.push({ ax: pts[i][0], az: pts[i][1], dx, dz, l });
      total += l;
    }
    let dist = t * total;
    for (const s of segs) {
      if (dist <= s.l || s === segs[segs.length - 1]) {
        const f = s.l > 0 ? Math.min(1, dist / s.l) : 0;
        return {
          x: s.ax + s.dx * f,
          z: s.az + s.dz * f,
          ux: s.l > 0 ? s.dx / s.l : 0,
          uz: s.l > 0 ? s.dz / s.l : 1,
        };
      }
      dist -= s.l;
    }
    const last = pts[pts.length - 1];
    return { x: last[0], z: last[1], ux: 0, uz: 1 };
  }

  /** Rochers, buissons et fleurs en lisière de clairière */
  function buildClearingRing(scene, cx, cz, B) {
    const rr = _rng(0x5a0417 ^ ((cx * 7) | 0) ^ ((cz * 13) | 0));
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMats = [0x7a7068, 0x6a6458, 0x848078, 0x5a5248]
      .map(c => new THREE.MeshLambertMaterial({ color: c }));
    const rockBuckets = rockMats.map(() => []);

    const bushGeo = new THREE.SphereGeometry(1, 5, 4);
    const bushMats = [0x2d5a25, 0x3a6530, 0x4a5828].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const bushBuckets = bushMats.map(() => []);

    const flowerColors = [0xe8c840, 0xd86888, 0xf0f0f0, 0xc878d8];
    const flowerGeo = new THREE.SphereGeometry(1, 4, 3);
    const flowerBuckets = flowerColors.map(c => {
      const m = new THREE.MeshLambertMaterial({ color: c });
      return { mat: m, list: [] };
    });

    const logMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    const logs = [];

    for (let i = 0; i < 52; i++) {
      const a = rr() * Math.PI * 2;
      const dist = 6.2 + rr() * 8.5;
      const x = cx + Math.cos(a) * dist * (CLEAR_RX / 5.5);
      const z = cz + Math.sin(a) * dist * (CLEAR_RZ / 5.5);
      if (_inCamp(x, z, cx, cz) || _onPath(x, z)) continue;

      const roll = rr();
      const y = ZS.getTerrainHeight(x, z);

      if (roll < 0.28) {
        const s = 0.14 + rr() * 0.28;
        rockBuckets[Math.floor(rr() * rockBuckets.length)].push({
          x, y: y + s * 0.25, z, s,
          rx: rr(), ry: rr(), rz: rr(),
        });
      } else if (roll < 0.58) {
        const r = 0.22 + rr() * 0.38;
        bushBuckets[Math.floor(rr() * bushBuckets.length)].push({
          x, y: y + r * 0.3, z, r,
          sx: 1 + rr() * 0.4, sy: 0.5 + rr() * 0.35, sz: 1 + rr() * 0.35,
        });
      } else if (roll < 0.82) {
        const r = 0.06 + rr() * 0.05;
        const fb = flowerBuckets[Math.floor(rr() * flowerBuckets.length)];
        fb.list.push({ x, y: y + 0.12, z, r, stem: y });
      } else {
        logs.push({
          x, z, y,
          len: 0.7 + rr() * 0.9,
          r: 0.06 + rr() * 0.03,
          ry: rr() * Math.PI,
        });
      }
    }

    const dummy = new THREE.Object3D();
    for (let mi = 0; mi < rockMats.length; mi++) {
      const list = rockBuckets[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(rockGeo, rockMats[mi], list.length);
      im.castShadow = im.receiveShadow = true;
      for (let k = 0; k < list.length; k++) {
        const r = list[k];
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(r.rx, r.ry, r.rz);
        dummy.scale.setScalar(r.s);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (let mi = 0; mi < bushMats.length; mi++) {
      const list = bushBuckets[mi];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(bushGeo, bushMats[mi], list.length);
      im.castShadow = true;
      for (let k = 0; k < list.length; k++) {
        const bush = list[k];
        dummy.position.set(bush.x, bush.y, bush.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(bush.r * bush.sx, bush.r * bush.sy, bush.r * bush.sz);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (const fb of flowerBuckets) {
      if (!fb.list.length) continue;
      const im = new THREE.InstancedMesh(flowerGeo, fb.mat, fb.list.length);
      for (let k = 0; k < fb.list.length; k++) {
        const f = fb.list[k];
        dummy.position.set(f.x, f.y, f.z);
        dummy.scale.setScalar(f.r);
        dummy.updateMatrix();
        im.setMatrixAt(k, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }

    for (const lg of logs) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(lg.r * 0.9, lg.r, lg.len, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = lg.ry;
      log.position.set(lg.x, lg.y + lg.r, lg.z);
      log.castShadow = true;
      scene.add(log);
    }

    // Souches décoratives loin du camp spawn (évite doublons avec les assises)
    const stumpMat = new THREE.MeshLambertMaterial({ color: 0x5a3818 });
    for (const [sx, sz, sr] of [[-4.5, 3.0, 0.20], [4.2, -3.5, 0.18], [-3.8, -4.2, 0.19]]) {
      const sy = ZS.getTerrainHeight(cx + sx, cz + sz);
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.8, sr, 0.28, 7), stumpMat);
      stump.position.set(cx + sx, sy + 0.14, cz + sz);
      stump.castShadow = true;
      scene.add(stump);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.75, sr * 0.75, 0.04, 7),
        new THREE.MeshLambertMaterial({ color: 0x3a2510 }));
      top.position.set(cx + sx, sy + 0.29, cz + sz);
      scene.add(top);
    }
  }

  /** Sentier spawn → route : pierres bordure, lanterne, panneau */
  /** Décor léger le long du sentier (pierres de bordure). */
  function buildSpawnTrailDecor(scene, pts, B) {
    const rr = _rng(0x0a7001);
    const stoneMat = ZS.CampTextures?.materials
      ? ZS.CampTextures.materials().stone()
      : new THREE.MeshLambertMaterial({ color: 0x6a6458 });

    for (let t = 0.12; t < 0.86; t += 0.18) {
      const p = _samplePath(t, pts);
      if (!p) continue;
      const side = (Math.floor(t * 20) % 2 === 0) ? 1 : -1;
      const px = p.x + (-p.uz) * side * 1.15;
      const pz = p.z + p.ux * side * 1.15;
      const py = ZS.getTerrainHeight(px, pz);
      const r = 0.07 + rr() * 0.04;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 0),
        stoneMat
      );
      rock.position.set(px, py + r * 0.55, pz);
      rock.rotation.set(rr() * 0.4, Math.atan2(p.ux, p.uz) + rr() * 0.5, rr() * 0.3);
      rock.castShadow = true;
      scene.add(rock);
    }
  }

  /** Mesh sentier + décor ; jonction RN via RoadNetwork.buildMeshes */
  function buildSpawnTrail(scene, pts, B) {
    if (ZS.ENABLE_CODEGEN_TRAIL_MESH === false) return;
    const path = pts || SPAWN_TRAIL_PTS;
    if (ZS.Trails?.buildMesh) {
      ZS.Trails.buildMesh(scene, path, {
        width: 1.55,
        taperStart: 0,
        taperEnd: 0,
        skipEnd: 2.2,
        roadBlend: 3.5,
        step: 0.2,
        smooth: true,
      });
    }
    buildSpawnTrailDecor(scene, path, B);
  }

  /** @deprecated alias */
  function buildClearingExit(scene, cx, ez, B) {
    buildSpawnTrail(scene, SPAWN_TRAIL_PTS, B);
  }
