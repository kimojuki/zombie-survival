// Debug bâtiments / collisions décor — wireframes + comparaison mesh ↔ collider
(function () {
  'use strict';

  const TAG = '[building-debug]';
  const SHACK_PREFAB = 'building_survivor_shack';
  /** Miroir design/BUILDING_PREFABS.md — incrémenter à chaque pièce validée. */
  const SHACK_EXPECTED_COLLIDERS = 5;
  const _v3a = new THREE.Vector3();
  const _v3b = new THREE.Vector3();
  const _box3 = new THREE.Box3();
  let _enabled = false;
  let _wireframes = false;
  let _overlay = null;
  let _seq = 0;

  function _lsOn() {
    try { return localStorage.getItem('zs_building_debug') === '1'; } catch { return false; }
  }

  function log(phase, data) {
    if (!_enabled && phase !== 'init') return;
    const row = { phase, t: Date.now(), ...data };
    console.info(TAG, phase, row);
    try {
      const buf = JSON.parse(localStorage.getItem('zs_building_debug_log') || '[]');
      buf.push(row);
      while (buf.length > 60) buf.shift();
      localStorage.setItem('zs_building_debug_log', JSON.stringify(buf));
    } catch { /* ignore */ }
  }

  function enable(on = true) {
    _enabled = !!on;
    try { localStorage.setItem('zs_building_debug', _enabled ? '1' : '0'); } catch { /* ignore */ }
    log('toggle', { enabled: _enabled });
    if (_enabled && _wireframes) _rebuildOverlay();
  }

  function _scene() {
    return ZS._scene || null;
  }

  function _ensureOverlay() {
    const scene = _scene();
    if (!scene) return null;
    if (!_overlay) {
      _overlay = new THREE.Group();
      _overlay.name = 'building-debug-overlay';
      scene.add(_overlay);
    }
    return _overlay;
  }

  function _clearOverlay() {
    if (!_overlay) return;
    while (_overlay.children.length) {
      const c = _overlay.children[0];
      _overlay.remove(c);
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
  }

  function _localToWorld(lx, ly, lz, col) {
    if (ZS.decorLocalToWorld) return ZS.decorLocalToWorld(lx, ly, lz, col);
    const c = Math.cos(col.rotY || 0);
    const s = Math.sin(col.rotY || 0);
    const x = lx * c + lz * s;
    const z = -lx * s + lz * c;
    return { x: col.cx + x, y: (col.baseY ?? 0) + ly, z: col.cz + z };
  }

  function _yBand(col) {
    const base = col.baseY ?? 0;
    const minY = col.minY != null ? col.minY : base;
    const maxY = col.maxY != null ? col.maxY : base + 2.8;
    return { minY, maxY };
  }

  function _addBoxWire(group, col, color, opacity) {
    const hw = col.hw || 0.1;
    const hd = col.hd || 0.1;
    const lx0 = col.lx || 0;
    const lz0 = col.lz || 0;
    const { minY, maxY } = _yBand(col);
    const localCorners = [
      [-hw, minY, -hd], [hw, minY, -hd], [hw, minY, hd], [-hw, minY, hd],
      [-hw, maxY, -hd], [hw, maxY, -hd], [hw, maxY, hd], [-hw, maxY, hd],
    ];
    const world = localCorners.map(([lx, ly, lz]) => {
      const w = _localToWorld(lx0 + lx, ly - (col.baseY ?? 0), lz0 + lz, col);
      return new THREE.Vector3(w.x, w.y, w.z);
    });
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const pos = [];
    for (const [a, b] of edges) {
      pos.push(world[a].x, world[a].y, world[a].z, world[b].x, world[b].y, world[b].z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 999;
    group.add(lines);
  }

  function _meshWorldBox(mesh, root) {
    if (root) root.updateMatrixWorld(true);
    _box3.setFromObject(mesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    _box3.getCenter(center);
    _box3.getSize(size);
    return {
      min: { x: _box3.min.x, y: _box3.min.y, z: _box3.min.z },
      max: { x: _box3.max.x, y: _box3.max.y, z: _box3.max.z },
      center: { x: center.x, y: center.y, z: center.z },
      size: { x: size.x, y: size.y, z: size.z },
    };
  }

  function _findDecorByPrefab(prefabId) {
    const out = [];
    ZS.Network?.forEachDecor?.((entry, id) => {
      if (entry?.data?.prefabId === prefabId || entry?.root?.userData?.prefabId === prefabId) {
        out.push({ id, entry });
      }
    });
    return out;
  }

  function _meshWorldPivot(mesh, root) {
    if (root) root.updateMatrixWorld(true);
    mesh.getWorldPosition(_v3a);
    return { x: _v3a.x, y: _v3a.y, z: _v3a.z };
  }

  function _shackSpecAndCols(root, decorId) {
    const spec = root?.userData?.decorSpec;
    if (!spec || !ZS.buildDecorColliders) return { spec: null, cols: [] };
    const cols = ZS.getDecorCollidersForId?.(decorId)
      || ZS.buildDecorColliders(spec);
    return { spec, cols };
  }

  function compareMeshVsColliders(root, decorId, label) {
    if (!root) return null;
    const { spec, cols } = _shackSpecAndCols(root, decorId);
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    const meshBoxes = meshes.map((m) => ({
      name: m.name || 'mesh',
      localPos: { x: m.position.x, y: m.position.y, z: m.position.z },
      worldPivot: _meshWorldPivot(m, root),
      world: _meshWorldBox(m, root),
    }));
    const colSummaries = (cols || []).map((c, i) => {
      const w = _localToWorld(c.lx || 0, 0, c.lz || 0, c);
      return {
        i,
        lx: c.lx,
        lz: c.lz,
        hw: c.hw,
        hd: c.hd,
        rotY: c.rotY,
        baseY: c.baseY,
        minY: c.minY,
        maxY: c.maxY,
        worldCenter: { x: w.x, y: w.y, z: w.z },
        decorId: c.decorId,
        prefabId: c.prefabId,
      };
    });
    const northMesh = meshBoxes.find((m) => m.localPos.z > 1.5)
      || meshBoxes.reduce((best, m) => ((!best || m.localPos.z > best.localPos.z) ? m : best), null);
    const northCol = colSummaries.find((c) => Math.abs((c.lz || 0) - 2.04) < 0.05);
    const colRotY = northCol?.rotY ?? null;
    let delta = null;
    let deltaPivot = null;
    if (northMesh && northCol) {
      const mc = northMesh.worldPivot;
      const colCy = northCol.baseY != null ? northCol.baseY + 1.32 : mc.y;
      deltaPivot = {
        dx: northCol.worldCenter.x - mc.x,
        dy: colCy - mc.y,
        dz: northCol.worldCenter.z - mc.z,
        dist: Math.hypot(
          northCol.worldCenter.x - mc.x,
          northCol.worldCenter.z - mc.z,
        ),
      };
      delta = {
        dx: northCol.worldCenter.x - northMesh.world.center.x,
        dy: colCy - northMesh.world.center.y,
        dz: northCol.worldCenter.z - northMesh.world.center.z,
        dist: Math.hypot(
          northCol.worldCenter.x - northMesh.world.center.x,
          northCol.worldCenter.z - northMesh.world.center.z,
        ),
        pivotDist: deltaPivot.dist,
      };
    }
    const rootRot = root.rotation?.y ?? 0;
    const specRot = spec?.rotY ?? null;
    const row = {
      label,
      decorId,
      rootPos: { x: root.position.x, y: root.position.y, z: root.position.z },
      rootRotY: rootRot,
      specRotY: specRot,
      colRotY,
      rotMismatch: specRot != null && Math.abs(rootRot - specRot) > 0.001,
      colRotMismatch: colRotY != null && Math.abs(rootRot - colRotY) > 0.001,
      meshCount: meshes.length,
      colliderCount: cols.length,
      northMeshPivot: northMesh?.worldPivot,
      northMeshAabb: northMesh?.world?.center,
      northCol: northCol?.worldCenter,
      delta,
      deltaPivot,
      meshBoxes,
      colliders: colSummaries,
    };
    log('compare', row);
    const distCheck = deltaPivot?.dist ?? delta?.dist ?? 0;
    if (distCheck > 0.2) {
      console.warn(TAG, 'ÉCART mesh/collider mur nord > 20 cm', { deltaPivot, delta, colRotY, rootRot });
    }
    if (row.rotMismatch) {
      console.warn(TAG, 'rotY root ≠ decorSpec', { rootRot, specRot });
    }
    if (row.colRotMismatch) {
      console.warn(TAG, 'rotY root ≠ collider enregistré — collision décalée', { rootRot, colRotY });
    }
    if (cols.length !== SHACK_EXPECTED_COLLIDERS) {
      console.warn(TAG, 'Nombre colliders cabane inattendu', {
        count: cols.length,
        expected: SHACK_EXPECTED_COLLIDERS,
      });
    }
    return row;
  }

  function dumpShack() {
    const hits = _findDecorByPrefab(SHACK_PREFAB);
    if (!hits.length) {
      const row = { ok: false, reason: 'Aucune cabane spawnée' };
      console.warn(TAG, 'dumpShack', row);
      return row;
    }
    const reports = hits.map(({ id, entry }) => compareMeshVsColliders(entry.root, id, 'dumpShack'));
    return { ok: true, count: hits.length, reports };
  }

  function listNearPlayer(radius) {
    const lp = ZS.Network?.getLocalXZ?.() || ZS._state?.player;
    if (!lp) return [];
    const px = lp.x ?? 0;
    const pz = lp.z ?? 0;
    const r = radius ?? 10;
    const cols = ZS.getCollidersNear?.(px, pz, r) || ZS.getColliders?.() || [];
    const decor = cols.filter((c) => c.decorId);
    const rows = decor.map((c) => {
      const w = _localToWorld(c.lx || 0, 0, c.lz || 0, c);
      return {
        decorId: c.decorId,
        prefabId: c.prefabId,
        lx: c.lx,
        lz: c.lz,
        hw: c.hw,
        hd: c.hd,
        rotY: c.rotY,
        cx: c.cx,
        cz: c.cz,
        worldCenter: { x: w.x, z: w.z },
        distToPlayer: Math.hypot(w.x - px, w.z - pz),
      };
    }).sort((a, b) => a.distToPlayer - b.distToPlayer);
    log('near-player', { px, pz, radius: r, count: rows.length, rows });
    return rows;
  }

  function probePlayer() {
    const p = ZS._state?.player;
    if (!p) return null;
    const px = p.x;
    const pz = p.z;
    const feetY = p.y - 1.7;
    const playerR = 0.4;
    const cols = ZS.getCollidersNear?.(px, pz, 12) || [];
    const hits = [];
    for (const col of cols) {
      let resolved = null;
      if (col.type === 'box' || col.cx !== undefined) {
        resolved = ZS.resolveDecorBoxCollision?.(col, px, pz, feetY, playerR);
      } else if (col.type === 'seg') {
        resolved = ZS.resolveDecorSegmentCollision?.(col, px, pz, feetY, playerR);
      } else if (col.x != null) {
        const dist = Math.hypot(px - col.x, pz - col.z);
        if (dist < playerR + (col.r || 0.3)) hits.push({ kind: 'cyl', col, dist });
        continue;
      }
      if (resolved) {
        hits.push({
          kind: col.type || 'box',
          decorId: col.decorId,
          prefabId: col.prefabId,
          lx: col.lx,
          lz: col.lz,
          rotY: col.rotY,
          cx: col.cx,
          cz: col.cz,
          push: resolved,
        });
      }
    }
    const row = { px, pz, feetY, hitCount: hits.length, hits };
    log('probe-player', row);
    if (!hits.length) console.info(TAG, 'Aucun collider décor ne bloque ici');
    return row;
  }

  function _rebuildOverlay() {
    _clearOverlay();
    if (!_wireframes) return;
    const group = _ensureOverlay();
    if (!group) return;
    const lp = ZS.Network?.getLocalXZ?.() || { x: 0, z: 0 };
    const cols = ZS.getCollidersNear?.(lp.x, lp.z, 40) || [];
    for (const col of cols) {
      if (!col.decorId) continue;
      if (col.type === 'box' || col.cx !== undefined) {
        _addBoxWire(group, col, 0xff44ff, 0.92);
      }
    }
    const shacks = _findDecorByPrefab(SHACK_PREFAB);
    for (const { entry } of shacks) {
      entry.root?.traverse((o) => {
        if (!o.isMesh) return;
        const b = _meshWorldBox(o);
        const hw = b.size.x * 0.5;
        const hd = b.size.z * 0.5;
        const cy = (b.min.y + b.max.y) * 0.5;
        _addBoxWire(group, {
          cx: b.center.x,
          cz: b.center.z,
          baseY: cy,
          lx: 0,
          lz: 0,
          hw,
          hd,
          rotY: 0,
          minY: b.min.y,
          maxY: b.max.y,
        }, 0x44ff66, 0.75);
      });
    }
  }

  function showWireframes(on) {
    _wireframes = !!on;
    if (_wireframes) {
      enable(true);
      _rebuildOverlay();
    } else {
      _clearOverlay();
    }
    log('wireframes', { on: _wireframes });
  }

  function onShackCollidersRegistered(spec, cols, root) {
    if (cols?.length !== SHACK_EXPECTED_COLLIDERS) {
      console.warn(TAG, 'cabane: collider count inattendu', {
        count: cols?.length,
        expected: SHACK_EXPECTED_COLLIDERS,
        cols: (cols || []).map((c) => ({ lx: c.lx, lz: c.lz, hw: c.hw, hd: c.hd })),
        hint: 'Ctrl+F5 — voir design/BUILDING_PREFABS.md',
      });
    }
    if (!_enabled && !_lsOn()) return;
    log('shack-register', {
      decorId: spec?.decorId,
      x: spec?.x,
      z: spec?.z,
      baseY: spec?.baseY,
      rotY: spec?.rotY,
      colCount: cols?.length,
      cols: (cols || []).map((c) => ({ lx: c.lx, lz: c.lz, hw: c.hw, hd: c.hd, rotY: c.rotY })),
    });
    if (root) compareMeshVsColliders(root, spec?.decorId, 'on-register');
    if (_wireframes) _rebuildOverlay();
  }

  function tick() {
    if (!_wireframes) return;
    if ((_seq++ % 90) === 0) _rebuildOverlay();
  }

  window.ZS = window.ZS || {};
  ZS.BuildingDebug = {
    TAG,
    enable,
    log,
    dumpShack,
    compareMeshVsColliders,
    listNearPlayer,
    probePlayer,
    showWireframes,
    onShackCollidersRegistered,
    tick,
    isEnabled: () => _enabled,
  };

  const urlDbg = typeof location !== 'undefined' && location.search?.includes('debugColliders');
  if (_lsOn() || urlDbg) {
    enable(true);
    if (urlDbg) showWireframes(true);
  }

  log('init', {
    msg: 'BuildingDebug prêt',
    help: 'Filtre: building-debug | ZS.BuildingDebug.enable() | showWireframes(true) | dumpShack() | probePlayer() | Shift+F8',
  });

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key === 'F8') {
      showWireframes(!_wireframes);
      ZS.UI?.showNotif?.(_wireframes ? 'Colliders: ON (magenta)' : 'Colliders: OFF');
    }
  });
}());
