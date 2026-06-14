// Définition clairières / arêtes / sentiers — extrait de road_network.js (IIFE)
function defineClearing(def) {
    if (!def || def.cx == null || def.cz == null) return null;
    const c = {
      id: def.id || `clearing_${_clearings.length}`,
      cx: Number(def.cx),
      cz: Number(def.cz),
      rx: def.rx || def.radius || 5.5,
      rz: def.rz || def.radius || def.rx || 5.5,
      blend: def.blend || 4,
      type: def.type || 'clearing',
      visual: def.visual !== false,
    };
    _clearings.push(c);
    _ready = false;
    return c.id;
  }

  function defineEdge(def) {
    if (!def || !Array.isArray(def.pts) || def.pts.length < 2) return null;
    const edge = {
      id: def.id || `edge_${_edgeId++}`,
      pts: def.pts.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]),
      width: def.width || 3,
      type: def.type || 'dirt',
      visual: def.visual !== false,
      smooth: def.smooth !== false,
      taperStart: def.taperStart || 0,
      taperEnd: def.taperEnd || 0,
      line: !!def.line,
      lineSolid: !!def.lineSolid,
      broken: !!def.broken,
      barriers: def.barriers !== false,
      join: def.join || null,
    };
    _raw.push(edge);
    _ready = false;
    return edge.id;
  }

  function _nearestOnEdge(edge, x, z) {
    let best = null;
    for (let i = 0; i < edge.pts.length - 1; i++) {
      const [x0, z0] = edge.pts[i], [x1, z1] = edge.pts[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-8) continue;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / len2));
      const px = x0 + dx * t, pz = z0 + dz * t;
      const dist = Math.hypot(x - px, z - pz);
      if (!best || dist < best.dist) {
        best = {
          dist, x: px, z: pz,
          ux: dx / Math.sqrt(len2), uz: dz / Math.sqrt(len2),
          segIdx: i, t,
        };
      }
    }
    return best;
  }

  function _polylineLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    return total;
  }

  function _samplePolyline(pts, step) {
    const total = _polylineLength(pts);
    if (total <= 0) return [];
    const out = [];
    const s = Math.max(step || 0.4, 0.08);
    for (let dist = 0; dist <= total; dist += s) {
      let remain = dist;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 1e-6) continue;
        if (remain <= segLen || i === pts.length - 2) {
          const f = segLen > 0 ? Math.min(1, remain / segLen) : 0;
          out.push({
            x: x0 + dx * f,
            z: z0 + dz * f,
            ux: dx / segLen,
            uz: dz / segLen,
            dist,
          });
          break;
        }
        remain -= segLen;
      }
    }
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2] || last;
    const dx = last[0] - prev[0], dz = last[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    const tail = out[out.length - 1];
    if (!tail || tail.dist < total - s * 0.3) {
      out.push({ x: last[0], z: last[1], ux: dx / len, uz: dz / len, dist: total });
    }
    return out;
  }

  /** Point le plus proche sur une polyligne. */
  function nearestPointOnRoad(roadPts, x, z) {
    if (!roadPts || roadPts.length < 2) return null;
    return _nearestOnEdge({ pts: roadPts }, x, z);
  }

  /**
   * Courbe camp → RN : vise le point route le plus proche de la bouche (pas l'extrémité est).
   */
  function buildTrailTowardRoad(mouth, roadPts, opts) {
    opts = opts || {};
    if (!mouth || !roadPts || roadPts.length < 2) return null;

    const [mx, mz] = mouth;
    const hit = nearestPointOnRoad(roadPts, mx, mz);
    if (!hit) return null;

    const lead = opts.leadIn || 5.5;
    const toMx = mx - hit.x;
    const toMz = mz - hit.z;
    const toLen = Math.hypot(toMx, toMz) || 1;
    const approachX = hit.x + (toMx / toLen) * lead;
    const approachZ = hit.z + (toMz / toLen) * lead;

    const perpX = -toMz / toLen;
    const perpZ = toMx / toLen;
    const bend = opts.bend || 3.5;
    const cx = mx + (approachX - mx) * 0.42 + perpX * bend;
    const cz = mz + (approachZ - mz) * 0.42 + perpZ * bend * 0.35;

    const steps = opts.steps || 14;
    const pts = [[mx, mz]];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const omt = 1 - t;
      pts.push([
        omt * omt * mx + 2 * omt * t * cx + t * t * approachX,
        omt * omt * mz + 2 * omt * t * cz + t * t * approachZ,
      ]);
    }
    return pts;
  }

  /** Plus proche couple sentier ↔ route (distance minimale le long des polylignes). */
  function computeTrailRoadJoin(trailPts, roadPts, opts) {
    opts = opts || {};
    if (!trailPts || trailPts.length < 2 || !roadPts || roadPts.length < 2) return null;

    let path = trailPts.map(p => [Number(p[0]) || 0, Number(p[1]) || 0]);
    if (opts.smooth !== false && path.length >= 3) {
      path = _dedupe(_chaikin(path, 1), 0.12);
    }

    const maxDist = opts.maxDist || 12;
    const samples = _samplePolyline(path, opts.step || 0.4);
    let best = null;

    for (const s of samples) {
      const hit = _nearestOnEdge({ pts: roadPts }, s.x, s.z);
      if (!hit || hit.dist > maxDist) continue;
      if (!best || hit.dist < best.dist - 1e-4) {
        best = {
          dist: hit.dist,
          x: hit.x,
          z: hit.z,
          ux: hit.ux,
          uz: hit.uz,
          trailX: s.x,
          trailZ: s.z,
          trailUx: s.ux,
          trailUz: s.uz,
          trailDist: s.dist,
          roadId: opts.roadId || null,
        };
      }
    }
    return best;
  }

  /** Coupe le sentier avant la jonction et ajoute une bouche d'approche. */
  function trimTrailForJoin(trailPts, join, leadIn) {
    if (!join || !trailPts || trailPts.length < 2) return trailPts.map(p => p.slice());

    const lead = leadIn || 3.0;
    const cutDist = Math.max(0, join.trailDist - lead);
    let path = trailPts.map(p => p.slice());
    if (path.length >= 3) {
      path = _dedupe(_chaikin(path, 1), 0.12);
    }

    const out = [];
    let acc = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i], [x1, z1] = path[i + 1];
      const dx = x1 - x0, dz = z1 - z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-6) continue;

      if (acc + segLen < cutDist - 0.05) {
        if (!out.length || out[out.length - 1][0] !== x0 || out[out.length - 1][1] !== z0) {
          out.push([x0, z0]);
        }
        acc += segLen;
        continue;
      }

      const f = segLen > 0 ? Math.max(0, Math.min(1, (cutDist - acc) / segLen)) : 0;
      const cx = x0 + dx * f, cz = z0 + dz * f;
      if (!out.length || Math.hypot(out[out.length - 1][0] - cx, out[out.length - 1][1] - cz) > 0.15) {
        out.push([cx, cz]);
      }

      const tux = join.trailUx || (dx / segLen);
      const tuz = join.trailUz || (dz / segLen);
      const mouthX = join.trailX, mouthZ = join.trailZ;
      out.push([
        mouthX - tux * 1.1,
        mouthZ - tuz * 1.1,
      ]);
      out.push([mouthX, mouthZ]);
      return out;
    }

    out.push([join.trailX, join.trailZ]);
    return out;
  }
