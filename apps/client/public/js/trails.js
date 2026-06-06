// Sentiers — ruban terrain + aplatissement, jonction route sans z-fighting.

(function () {
  'use strict';

  const LIFT = 0.08;
  const ROAD_LIFT = 0.07;
  const SEG_STEP = 0.22;
  const COLS = 8;

  function _smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function _chaikin(pts, passes) {
    let result = pts.map((p) => [p[0], p[1]]);
    for (let pass = 0; pass < (passes || 1); pass++) {
      if (result.length < 2) break;
      const next = [[result[0][0], result[0][1]]];
      for (let i = 0; i < result.length - 1; i++) {
        const [x0, z0] = result[i];
        const [x1, z1] = result[i + 1];
        next.push([0.75 * x0 + 0.25 * x1, 0.75 * z0 + 0.25 * z1]);
        next.push([0.25 * x0 + 0.75 * x1, 0.25 * z0 + 0.75 * z1]);
      }
      next.push([result[result.length - 1][0], result[result.length - 1][1]]);
      result = next;
    }
    return result;
  }

  function _dedupe(pts, minDist) {
    if (!pts.length) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const last = out[out.length - 1];
      if (Math.hypot(pts[i][0] - last[0], pts[i][1] - last[1]) >= (minDist || 0.12)) {
        out.push(pts[i]);
      }
    }
    return out;
  }

  function _prepPath(pts, smooth) {
    if (!pts || pts.length < 2) return [];
    let path = pts.map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]);
    if (smooth !== false && path.length >= 3) {
      path = _dedupe(_chaikin(path, 1), 0.12);
    }
    return path;
  }

  function _pathLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return total;
  }

  function _pointAtDist(path, dist) {
    let remain = Math.max(0, dist);
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i];
      const [x1, z1] = path[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-6) continue;
      if (remain <= segLen || i === path.length - 2) {
        const f = segLen > 0 ? Math.min(1, remain / segLen) : 0;
        return {
          x: x0 + dx * f,
          z: z0 + dz * f,
          ux: dx / segLen,
          uz: dz / segLen,
          dist,
        };
      }
      remain -= segLen;
    }
    const last = path[path.length - 1];
    const prev = path[path.length - 2] || last;
    const dx = last[0] - prev[0];
    const dz = last[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    return { x: last[0], z: last[1], ux: dx / len, uz: dz / len, dist };
  }

  function _resample(path, step) {
    const total = _pathLength(path);
    if (total <= 0) return [];
    const samples = [];
    const s = Math.max(step || SEG_STEP, 0.08);
    for (let d = 0; d <= total; d += s) {
      samples.push(_pointAtDist(path, d));
    }
    const tail = samples[samples.length - 1];
    if (!tail || tail.dist < total - s * 0.35) {
      samples.push(_pointAtDist(path, total));
    }
    return samples;
  }

  function _taperMul(dist, total, taperStart, taperEnd) {
    let mul = 1;
    if (taperStart > 0 && dist < taperStart) mul = dist / taperStart;
    if (taperEnd > 0 && dist > total - taperEnd) mul = Math.min(mul, (total - dist) / taperEnd);
    return _smoothstep(mul);
  }

  function _vertexHeight(px, pz, dist, total, opts) {
    const skipEnd = opts.skipEnd || 0;
    const roadBlend = opts.roadBlend || 3.0;
    const terrainH = ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0;
    const decorH = ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(px, pz)
      : terrainH + LIFT;
    const roadH = terrainH + ROAD_LIFT;

    if (skipEnd <= 0) return decorH;

    const cut = total - skipEnd;
    if (dist <= cut - roadBlend) return decorH;
    if (dist >= cut) return roadH;

    const t = _smoothstep((dist - (cut - roadBlend)) / roadBlend);
    return decorH * (1 - t) + roadH * t;
  }

  function _trailMaterial() {
    if (ZS.CampTextures?.materials) return ZS.CampTextures.materials().trail();
    return new THREE.MeshLambertMaterial({ color: 0x7a6348 });
  }

  /** Aplatit le terrain le long du tracé (à appeler avant buildTerrain). */
  function registerFlatten(pts, opts) {
    opts = opts || {};
    const path = _prepPath(pts, opts.smooth);
    if (path.length < 2) return;
    const half = (opts.width || 1.55) * 0.5 + (opts.shoulder || 0.65);
    if (ZS.registerTrailCorridor) {
      ZS.registerTrailCorridor(path, half, opts.blend || 3.5);
    } else if (ZS.registerRoadCorridor) {
      ZS.registerRoadCorridor(path, half, opts.blend || 3.5);
    }
  }

  /** Ruban texturé — s'arrête avant la jonction route (skipEnd) pour éviter z-fighting. */
  function buildMesh(scene, pts, opts) {
    if (!scene || !pts || pts.length < 2) return null;
    opts = opts || {};

    const path = _prepPath(pts, opts.smooth);
    if (path.length < 2) return null;

    const width = opts.width || 1.55;
    const taperStart = opts.taperStart ?? 0.9;
    const taperEnd = opts.taperEnd ?? 0.65;
    const skipEnd = opts.skipEnd || 0;
    const tileLen = opts.tileLen || 2.2;
    const total = _pathLength(path);
    const meshEnd = skipEnd > 0 ? Math.max(0, total - skipEnd) : total;
    const samples = _resample(path, opts.step || SEG_STEP);

    const pos = [];
    const uv = [];
    const idx = [];
    let prevRow = -1;

    for (const sample of samples) {
      if (sample.dist > meshEnd - 0.02) {
        prevRow = -1;
        continue;
      }

      const wMul = _taperMul(sample.dist, total, taperStart, taperEnd);
      const effW = width * wMul;
      if (effW < 0.04) {
        prevRow = -1;
        continue;
      }

      const nx = -sample.uz;
      const nz = sample.ux;
      const hw = effW / 2;
      const v = sample.dist / tileLen;
      const row = pos.length / 3;

      for (let c = 0; c <= COLS; c++) {
        const u = c / COLS;
        const off = -hw + effW * u;
        const px = sample.x + nx * off;
        const pz = sample.z + nz * off;
        const py = _vertexHeight(px, pz, sample.dist, total, opts);
        pos.push(px, py, pz);
        uv.push(u, v);
      }

      if (prevRow >= 0) {
        for (let c = 0; c < COLS; c++) {
          const a = prevRow + c;
          const b = prevRow + c + 1;
          const d = row + c;
          const e = row + c + 1;
          idx.push(a, b, d, b, e, d);
        }
      }
      prevRow = row;
    }

    if (pos.length < 9) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, _trailMaterial());
    mesh.renderOrder = 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function sample(pts, t, smooth) {
    const path = _prepPath(pts, smooth);
    const total = _pathLength(path);
    if (total <= 0) return null;
    return _pointAtDist(path, Math.max(0, Math.min(1, t)) * total);
  }

  function isNear(pts, x, z, margin, smooth) {
    const path = _prepPath(pts, smooth);
    const m = margin || 1.2;
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i];
      const [x1, z1] = path[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-6) continue;
      const u = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * u;
      const pz = z0 + dz * u;
      if (Math.hypot(x - px, z - pz) < m) return true;
    }
    return false;
  }

  function build(scene, pts, opts) {
    return buildMesh(scene, pts, opts);
  }

  window.ZS = window.ZS || {};
  ZS.Trails = {
    prepPath: _prepPath,
    registerFlatten,
    buildMesh,
    build,
    sample,
    isNear,
    length: _pathLength,
  };
}());
