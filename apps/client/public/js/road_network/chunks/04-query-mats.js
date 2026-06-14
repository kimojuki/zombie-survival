// Requêtes surface + matériaux — extrait de road_network.js (IIFE)
function _normClearingDist(x, z, c) {
    return Math.hypot((x - c.cx) / c.rx, (z - c.cz) / c.rz);
  }

  function _distSeg(x, z, x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-8) return Math.hypot(x - x0, z - z0);
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
    return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
  }

  function isNearRoad(x, z, margin) {
    if (!_ready) resolve();
    const m = margin || 0;
    for (const e of _resolved) {
      const hw = e.width * 0.5 + (QUERY_PAD[e.type] || 0.6) + m;
      for (let i = 0; i < e.pts.length - 1; i++) {
        if (_distSeg(x, z, e.pts[i][0], e.pts[i][1], e.pts[i + 1][0], e.pts[i + 1][1]) <= hw) {
          return true;
        }
      }
    }
    return false;
  }

  /** Surface chaussée sous (x,z) : `asphalt` | `trail` | null (hors RN goudron/sentier). */
  function getSurfaceAt(x, z, margin) {
    if (!_ready) resolve();
    const m = margin ?? 0.12;
    let best = null;
    for (const e of _resolved) {
      if (e.type !== 'asphalt' && e.type !== 'trail') continue;
      const hw = e.width * 0.5 + m;
      for (let i = 0; i < e.pts.length - 1; i++) {
        const d = _distSeg(x, z, e.pts[i][0], e.pts[i][1], e.pts[i + 1][0], e.pts[i + 1][1]);
        if (d <= hw && (!best || d < best.dist)) best = { dist: d, type: e.type };
      }
    }
    return best ? best.type : null;
  }

  function sampleAlong(edgeId, t) {
    if (!_ready) resolve();
    const e = _resolved.find(ed => ed.id === edgeId);
    if (!e || e.totalLen <= 0) return null;
    const dist = Math.max(0, Math.min(1, t)) * e.totalLen;
    let acc = 0;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [x0, z0] = e.pts[i], [x1, z1] = e.pts[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 0.01) continue;
      if (acc + segLen >= dist || i === e.pts.length - 2) {
        const f = segLen > 0 ? Math.min(1, (dist - acc) / segLen) : 0;
        return { x: x0 + dx * f, z: z0 + dz * f, ux: dx / segLen, uz: dz / segLen };
      }
      acc += segLen;
    }
    const last = e.pts[e.pts.length - 1];
    return { x: last[0], z: last[1], ux: 0, uz: 1 };
  }

  function getResolvedEdges() {
    if (!_ready) resolve();
    return _resolved.map(e => ({ id: e.id, pts: e.pts.map(p => p.slice()), width: e.width, type: e.type }));
  }

  function _matFor(edge, M) {
    if (edge.type === 'clearing') return M.path || M.roadDirt;
    if (edge.type === 'trail') return M.trail || M.path || M.roadDirt;
    if (edge.type === 'dirt' || edge.type === 'path') return M.roadDirt || M.path;
    return M.road;
  }

  function _ellipseAngle(c, x, z) {
    return Math.atan2((z - c.cz) / c.rz, (x - c.cx) / c.rx);
  }

  function _pointOnEllipse(c, angle, rf) {
    const f = rf == null ? 1 : rf;
    return [
      c.cx + Math.cos(angle) * c.rx * f,
      c.cz + Math.sin(angle) * c.rz * f,
    ];
  }

  function _interpArcAngles(aL, aR, steps) {
    let left = aL, right = aR;
    let span = right - left;
    if (span < 0) span += Math.PI * 2;
    if (span > Math.PI) {
      const t = left; left = right; right = t;
      span = Math.PI * 2 - span;
    }
    const out = [];
    for (let i = 0; i <= steps; i++) {
      out.push(left + (span * i) / steps);
    }
    return out;
  }

  function _findLinkedClearing(edge) {
    if (!edge.pts || edge.pts.length < 2) return null;
    const [x, z] = edge.pts[0];
    for (const c of _clearings) {
      const nd = _normClearingDist(x, z, c);
      if (nd >= 0.88 && nd <= 1.12) return c;
    }
    return null;
  }

  function _exitCone(clearing, edge) {
    const [x0, z0] = edge.pts[0];
    const [x1, z1] = edge.pts[1];
    const len = Math.hypot(x1 - x0, z1 - z0) || 1;
    const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    const hw = edge.width * 0.5 + 0.35;
    const aL = _ellipseAngle(clearing, x0 + nx * (-hw), z0 + nz * (-hw));
    const aR = _ellipseAngle(clearing, x0 + nx * hw, z0 + nz * hw);
    const center = _ellipseAngle(clearing, x0, z0);
    return { aL, aR, center, pad: 0.12 };
  }

  function _inExitCone(angle, cone) {
    let a = angle, s = cone.aL - cone.pad, e = cone.aR + cone.pad;
    while (a < s) a += Math.PI * 2;
    while (e < s) e += Math.PI * 2;
    return a >= s && a <= e;
  }

  function _trackMesh(mesh) {
    if (mesh) _meshes.push(mesh);
  }

  function disposeMeshes() {
    for (const mesh of _meshes) {
      mesh.parent?.remove(mesh);
      mesh.traverse?.((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
          else c.material.dispose?.();
        }
      });
    }
    _meshes.length = 0;
    _resetRoadChunkState();
  }

  /** Hauteur sol visible (mesh terrain) — pas la couche décor/herbe. */
  function _groundBase(px, pz) {
    if (ZS.raycastGroundHeight) {
      const hit = ZS.raycastGroundHeight(px, pz);
      if (Number.isFinite(hit)) return hit;
    }
    if (ZS.getVisibleTerrainHeight) return ZS.getVisibleTerrainHeight(px, pz);
    return ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0;
  }

  /** Réduit le lift sur les pentes pour éviter l'effet « vol » en vue latérale. */
  function _slopeLiftMul(px, pz) {
    const e = 0.32;
    const y0 = _groundBase(px, pz);
    const yx = _groundBase(px + e, pz) - _groundBase(px - e, pz);
    const yz = _groundBase(px, pz + e) - _groundBase(px, pz - e);
    const slope = Math.hypot(yx, yz) / (2 * e);
    return Math.max(RIBBON_LIFT_MIN / RIBBON_LIFT, 1 - slope * 1.35);
  }

  /** Hauteur ruban route — colle au mesh terrain, lift minimal anti z-fight. */
  function _roadVertexY(px, pz, lift) {
    const base = lift != null ? lift : RIBBON_LIFT;
    const l = Math.max(RIBBON_LIFT_MIN, base * _slopeLiftMul(px, pz));
    return _groundBase(px, pz) + l;
  }

  function _pushMesh(scene, pos, uv, idx, mat, renderOrder, opts) {
    if (pos.length < 9) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    if (opts?.skipNormals) {
      const n = pos.length / 3;
      const nor = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1;
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    } else {
      geo.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = renderOrder;
    mesh.userData.roadNetwork = true;
    if (opts?.roadLift != null) mesh.userData.roadLift = opts.roadLift;
    const c = _centroidXZ(pos);
    _roadChunkParent(scene, c.x, c.z).add(mesh);
    _trackMesh(mesh);
    return mesh;
  }
