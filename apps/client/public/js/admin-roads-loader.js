// Routes admin persistées — chargement monde + helpers preview éditeur.
(function () {
  'use strict';

  const ADMIN_ROAD_PREFIX = 'admin_road_';
  let _roads = [];
  let _loaded = false;

  function _groundY(x, z) {
    if (ZS.RoadNetwork?.roadVertexY) return ZS.RoadNetwork.roadVertexY(x, z, 0.012);
    if (ZS.raycastGroundHeight) return ZS.raycastGroundHeight(x, z) + 0.012;
    if (ZS.getVisibleTerrainHeight) return ZS.getVisibleTerrainHeight(x, z) + 0.012;
    return (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0) + 0.012;
  }

  async function prefetch(force) {
    if (_loaded && !force) return _roads;
    try {
      const res = await fetch('/api/world/admin-roads');
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      _roads = Array.isArray(json.roads) ? json.roads : [];
    } catch (e) {
      console.warn('[roads] prefetch admin', e);
      _roads = [];
    }
    _loaded = true;
    return _roads;
  }

  function setRoads(list) {
    _roads = Array.isArray(list) ? list : [];
    _loaded = true;
  }

  function getRoads() {
    return _roads.map((r) => ({
      ...r,
      pts: (r.pts || []).map((p) => p.slice()),
    }));
  }

  function registerRoads() {
    if (!ZS.RoadNetwork?.defineEdge) return 0;
    let n = 0;
    for (const def of _roads) {
      if (!def?.pts || def.pts.length < 2) continue;
      ZS.RoadNetwork.defineEdge({
        id: def.id,
        pts: def.pts.map((p) => [Number(p[0]), Number(p[1])]),
        width: def.width ?? 2.6,
        type: def.type || 'dirt',
        smooth: def.smooth !== false,
        visual: def.visual !== false,
        barriers: def.barriers === true,
      });
      n++;
    }
    return n;
  }

  function refreshLiveMeshes() {
    const scene = ZS._gfxRuntime?.scene;
    const M = ZS.B?.M;
    if (!scene || !M || !ZS.RoadNetwork?.rebuildMeshes) return false;
    ZS.RoadNetwork.removeEdgesByPrefix?.(ADMIN_ROAD_PREFIX);
    registerRoads();
    ZS.RoadNetwork.rebuildMeshes(scene, M);
    return true;
  }

  async function reloadAndRefresh() {
    await prefetch(true);
    return refreshLiveMeshes();
  }

  function addPreviewLine(parent, pts, color, opacity) {
    if (!parent || !pts || pts.length < 2) return null;
    const pos = [];
    for (const p of pts) {
      const y = _groundY(p[0], p[1]);
      pos.push(p[0], y, p[1]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: color || 0xffcc44,
      transparent: true,
      opacity: opacity ?? 0.95,
      depthTest: true,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 55;
    parent.add(line);
    return line;
  }

  function addPreviewRibbon(parent, pts, width, color, opacity) {
    if (!parent || !pts || pts.length < 2 || !width) return null;
    const half = width * 0.5;
    const pos = [];
    const idx = [];
    let prevRow = -1;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = p[0];
      const pz = p[1];
      let ux = 0;
      let uz = 1;
      if (i < pts.length - 1) {
        const nx = pts[i + 1][0] - px;
        const nz = pts[i + 1][1] - pz;
        const len = Math.hypot(nx, nz) || 1;
        ux = nx / len;
        uz = nz / len;
      } else if (i > 0) {
        const px0 = pts[i - 1][0];
        const pz0 = pts[i - 1][1];
        const nx = px - px0;
        const nz = pz - pz0;
        const len = Math.hypot(nx, nz) || 1;
        ux = nx / len;
        uz = nz / len;
      }
      const lx = -uz;
      const lz = ux;
      const y = _groundY(px, pz);
      const row = pos.length / 3;
      pos.push(px + lx * half, y, pz + lz * half);
      pos.push(px - lx * half, y, pz - lz * half);
      if (prevRow >= 0) {
        idx.push(prevRow, prevRow + 1, row, prevRow + 1, row + 1, row);
      }
      prevRow = row;
    }

    if (pos.length < 9) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      color: color || 0x9a7a52,
      transparent: true,
      opacity: opacity ?? 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 50;
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  }

  function addPointMarkers(parent, pts, color) {
    if (!parent || !pts?.length) return;
    const geo = new THREE.SphereGeometry(0.22, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color || 0xff8844 });
    for (const p of pts) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], _groundY(p[0], p[1]) + 0.1, p[1]);
      parent.add(m);
    }
  }

  function addCursorMarker(parent, x, z) {
    if (!parent) return;
    const geo = new THREE.RingGeometry(0.35, 0.55, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, _groundY(x, z), z);
    ring.renderOrder = 60;
    parent.add(ring);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xccffff }),
    );
    dot.position.set(x, _groundY(x, z) + 0.06, z);
    parent.add(dot);
  }

  function disposePreview(obj) {
    if (!obj) return;
    obj.parent?.remove(obj);
    obj.traverse?.((c) => {
      c.geometry?.dispose?.();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
        else c.material.dispose?.();
      }
    });
  }

  function disposePreviewGroup(grp) {
    disposePreview(grp);
  }

  /** @deprecated */
  function buildPreviewLine(scene, pts, color) {
    if (!scene) return null;
    const g = new THREE.Group();
    addPreviewLine(g, pts, color);
    scene.add(g);
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.AdminRoads = {
    prefetch,
    setRoads,
    getRoads,
    registerRoads,
    refreshLiveMeshes,
    reloadAndRefresh,
    buildPreviewLine,
    disposePreview,
    disposePreviewGroup,
    addPreviewLine,
    addPreviewRibbon,
    addPointMarkers,
    addCursorMarker,
    groundY: _groundY,
  };
}());
