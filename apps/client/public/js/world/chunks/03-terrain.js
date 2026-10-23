// Terrain async + raycast sol — extrait de world.js (IIFE)
function applyGraphicsOptions(profile) {
    const p = profile || _optsProfile();
    if (!p) return;
    _waterAnimEnabled = p.waterAnim !== false;
    _oceanScrollEnabled = p.oceanScroll !== false;
    if (_scene?.fog) {
      _scene.fog.near = p.fogNear;
      _scene.fog.far = p.fogFar;
    }
    if (_sunLight) {
      _sunLight.castShadow = !!p.shadows;
      if (_sunLight.shadow) {
        _sunLight.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
        _applyShadowFrustum(p.shadowFrustum);
      }
    }
    _setCloudBudget(p.clouds);
    if (_starField) _starField.visible = !!p.stars && (p.starCount ?? 0) > 0;
  }

  function _triSlope(pa, i0, i1, i2) {
    const ax = pa[i0 * 3], ay = pa[i0 * 3 + 1], az = pa[i0 * 3 + 2];
    const bx = pa[i1 * 3], by = pa[i1 * 3 + 1], bz = pa[i1 * 3 + 2];
    const cx = pa[i2 * 3], cy = pa[i2 * 3 + 1], cz = pa[i2 * 3 + 2];
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return 1 - Math.max(0, ny / len);
  }

  function _paintVert(pa, beachW, cols, uvs, col, idx, slope, useDirt, uBase, uSpan, tileScale) {
    const vx = pa[idx * 3];
    const vy = pa[idx * 3 + 1];
    const vz = pa[idx * 3 + 2];
    const fw = ZS.forestFloorWeight?.(vx, vz) ?? 0;
    const scale = tileScale * (fw > 0.2 ? 0.65 : 1);
    const frac = (v) => v - Math.floor(v);
    uvs[idx * 2] = uBase + frac((vx + 300) / scale) * uSpan;
    uvs[idx * 2 + 1] = frac((vz + 300) / scale);
    const bwCorner = beachW[idx];
    if (bwCorner > 0.03) {
      const sandHex = _beachSandColor(vx, vz);
      if (bwCorner >= 0.85) {
        col.setHex(sandHex);
      } else {
        col.setHex(_terrainTint(vx, vz, vy, slope, useDirt));
        _cD.setHex(sandHex);
        col.lerp(_cD, Math.min(1, bwCorner * 1.05));
      }
    } else {
      col.setHex(_terrainTint(vx, vz, vy, slope, useDirt));
    }
    cols[idx * 3] = col.r;
    cols[idx * 3 + 1] = col.g;
    cols[idx * 3 + 2] = col.b;
  }

  async function buildTerrainAsync(scene, onChunk) {
    const SIZE = 600;
    const SEG = _terrainSeg();
    const VX = SEG + 1;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const pa = pos.array;
    const uvs = new Float32Array(pos.count * 2);
    const cols = new Float32Array(pos.count * 3);
    const beachW = new Float32Array(pos.count);
    const col = new THREE.Color();
    const tileScale = 6.0;
    const yieldRows = _isMobileBuild() ? 2 : 3;

    for (let iz = 0; iz <= SEG; iz++) {
      for (let ix = 0; ix <= SEG; ix++) {
        const i = iz * VX + ix;
        const vx = pa[i * 3];
        const vz = pa[i * 3 + 2];
        let h = ZS.getTerrainHeight(vx, vz);
        if (ZS.isInClearingDisc?.(vx, vz, 0.12)) h -= 0.14;
        const bw = ZS.beachCoastWeight?.(vx, vz) ?? 0;
        beachW[i] = bw;
        if (bw > 0.06 && ZS.beachTerrainSink) h -= ZS.beachTerrainSink(bw);
        pa[i * 3 + 1] = h;
      }
      if (onChunk && iz % yieldRows === 0) {
        onChunk(iz / (SEG * 2));
        await _yieldFrame();
      }
    }
    pos.needsUpdate = true;

    const cellDirt = new Uint8Array(SEG * SEG);
    for (let iz = 0; iz < SEG; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const i00 = iz * VX + ix;
        const i10 = i00 + 1;
        const i01 = i00 + VX;
        const i11 = i01 + 1;
        const cx = (pa[i00 * 3] + pa[i10 * 3] + pa[i01 * 3] + pa[i11 * 3]) * 0.25;
        const cz = (pa[i00 * 3 + 2] + pa[i10 * 3 + 2] + pa[i01 * 3 + 2] + pa[i11 * 3 + 2]) * 0.25;
        const avgH = (pa[i00 * 3 + 1] + pa[i10 * 3 + 1] + pa[i01 * 3 + 1] + pa[i11 * 3 + 1]) * 0.25;
        const beachWCell = (beachW[i00] + beachW[i10] + beachW[i01] + beachW[i11]) * 0.25;
        const inBeach = beachWCell >= 0.38;
        const inRiver = ZS.isInRiverChannel?.(cx, cz, 0) ?? false;
        const inClearing = beachWCell < 0.06 && !inBeach && (ZS.isInClearingDisc?.(cx, cz, 0.25) ?? false);
        const onRoad = ZS.isInRoadCorridor?.(cx, cz, 0.8) ?? ZS.isNearRoad?.(cx, cz, 1.2) ?? false;
        const slope = Math.max(
          _triSlope(pa, i00, i11, i10),
          _triSlope(pa, i00, i01, i11),
        );
        // Routes terre S01 sur ceinture plage→forêt : splat dirt même si beachW modéré.
        const roadDirt = onRoad && beachWCell < 0.55 && !inRiver;
        cellDirt[iz * SEG + ix] = roadDirt || (beachWCell < 0.08 && !inBeach
          && (inRiver || onRoad || inClearing || slope > 0.22 || avgH > 13.5)) ? 1 : 0;
      }
      if (onChunk && iz % yieldRows === 0) {
        onChunk(0.5 + iz / (SEG * 2));
        await _yieldFrame();
      }
    }

    for (let iz = 0; iz < SEG; iz++) {
      for (let ix = 0; ix < SEG; ix++) {
        const i00 = iz * VX + ix;
        const i10 = i00 + 1;
        const i01 = i00 + VX;
        const i11 = i01 + 1;
        const useDirt = cellDirt[iz * SEG + ix] === 1;
        const uBase = useDirt ? 0.52 : 0.02;
        const uSpan = 0.46;
        const slope1 = _triSlope(pa, i00, i11, i10);
        const slope2 = _triSlope(pa, i00, i01, i11);
        _paintVert(pa, beachW, cols, uvs, col, i00, slope1, useDirt, uBase, uSpan, tileScale);
        _paintVert(pa, beachW, cols, uvs, col, i10, slope1, useDirt, uBase, uSpan, tileScale);
        _paintVert(pa, beachW, cols, uvs, col, i11, slope1, useDirt, uBase, uSpan, tileScale);
        _paintVert(pa, beachW, cols, uvs, col, i01, slope2, useDirt, uBase, uSpan, tileScale);
      }
      if (onChunk && iz % yieldRows === 0) {
        onChunk(0.75 + iz / (SEG * 4));
        await _yieldFrame();
      }
    }

    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      map: _terrainAtlasTex(),
      vertexColors: true,
      flatShading: true,
    }));
    mesh.receiveShadow = true;
    mesh.renderOrder = 0;
    scene.add(mesh);
    _terrainMesh = mesh;
    registerGroundMesh(mesh);
    if (onChunk) onChunk(1);
  }

  function buildTerrain(scene) {
    buildTerrainAsync(scene);
  }

  function registerGroundMesh(mesh) {
    if (!mesh || _groundMeshes.includes(mesh)) return;
    _groundMeshes.push(mesh);
  }

  /** Hauteur analytique identique au mesh terrain (inclut -0.14 clairière). */
  function getVisibleTerrainHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    let h = ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0;
    if (ZS.isInClearingDisc?.(x, z, 0.12)) h -= 0.14;
    const bw = ZS.beachCoastWeight?.(x, z) ?? 0;
    if (bw > 0.06 && ZS.beachTerrainSink) h -= ZS.beachTerrainSink(bw);
    return h;
  }

  /** Raycast depuis un rayon caméra → point sol (terrain + meshes enregistrés). */
  function raycastViewToGround(raycaster, maxDist = 120) {
    if (!raycaster) return null;
    const prevFar = raycaster.far;
    raycaster.far = maxDist;
    let best = null;
    if (_terrainMesh) {
      const hits = raycaster.intersectObject(_terrainMesh, false);
      if (hits.length) {
        best = { x: hits[0].point.x, y: hits[0].point.y, z: hits[0].point.z, dist: hits[0].distance };
      }
    }
    for (const mesh of _groundMeshes) {
      if (!mesh?.isMesh) continue;
      const hits = raycaster.intersectObject(mesh, false);
      if (!hits.length) continue;
      if (!best || hits[0].distance < best.dist) {
        best = { x: hits[0].point.x, y: hits[0].point.y, z: hits[0].point.z, dist: hits[0].distance };
      }
    }
    raycaster.far = prevFar;
    return best;
  }

  /** Hauteur réelle du mesh terrain (raycast vertical). */
  function raycastTerrainHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    if (!_terrainMesh) return getVisibleTerrainHeight(x, z);
    _terrainRayOrigin.set(x, 500, z);
    _terrainRay.set(_terrainRayOrigin, _terrainRayDir);
    const hits = _terrainRay.intersectObject(_terrainMesh, false);
    if (hits.length) return hits[0].point.y;
    return getVisibleTerrainHeight(x, z);
  }

  /** Surface la plus haute sous (x,z) — terrain, sol camp, sentier, etc. */
  function raycastGroundHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    _terrainRayOrigin.set(x, 500, z);
    _terrainRay.set(_terrainRayOrigin, _terrainRayDir);
    let topY = null;
    for (const mesh of _groundMeshes) {
      if (!mesh?.isMesh) continue;
      const hits = _terrainRay.intersectObject(mesh, false);
      if (!hits.length) continue;
      const y = hits[0].point.y;
      if (topY === null || y > topY) topY = y;
    }
    if (topY !== null) return topY;
    return raycastTerrainHeight(x, z);
  }

  // ── PRNG déterministe ────────────────────────────────────────────────────────

  function _makeRng(seed) {
    let s = seed >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 0xffffffff; };
  }
  const _rng = _makeRng(0xDEADBEEF);

  // ── Fleurs ───────────────────────────────────────────────────────────────────
