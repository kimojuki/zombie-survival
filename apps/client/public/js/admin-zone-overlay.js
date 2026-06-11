// Overlay zones admin — secteurs, plage safe, exclusions build S01.
(function () {
  'use strict';

  const GROUP_NAME = '__zs_admin_zones__';
  const LAYER_KEY = 'zs_admin_zone_layers';

  let _active = false;
  let _group = null;
  let _layers = { sectors: true, safeBeach: true, buildExclusions: true };

  function _loadLayers() {
    try {
      const raw = localStorage.getItem(LAYER_KEY);
      if (raw) Object.assign(_layers, JSON.parse(raw));
    } catch (_) { /* ignore */ }
  }

  function _saveLayers() {
    try { localStorage.setItem(LAYER_KEY, JSON.stringify(_layers)); } catch (_) { /* ignore */ }
  }

  function _scene() {
    return ZS._gfxRuntime?.scene || null;
  }

  function _groundY(x, z) {
    const h = ZS.getTerrainHeight?.(x, z);
    return Number.isFinite(h) ? h + 0.12 : 0.12;
  }

  function _lineLoop(points, color, opacity = 0.85) {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
    });
    return new THREE.LineLoop(geom, mat);
  }

  function _lineSegments(points, color, opacity = 0.7) {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
    });
    return new THREE.LineSegments(geom, mat);
  }

  function _rectCorners(xMin, xMax, zMin, zMax) {
    const y1 = _groundY(xMin, zMin);
    const y2 = _groundY(xMax, zMin);
    const y3 = _groundY(xMax, zMax);
    const y4 = _groundY(xMin, zMax);
    return [
      new THREE.Vector3(xMin, y1, zMin),
      new THREE.Vector3(xMax, y2, zMin),
      new THREE.Vector3(xMax, y3, zMax),
      new THREE.Vector3(xMin, y4, zMax),
    ];
  }

  function _circleLoop(cx, cz, radius, segments, color, opacity) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      pts.push(new THREE.Vector3(x, _groundY(x, z), z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true });
    return new THREE.Line(geom, mat);
  }

  /** Contour approximatif plage safe (grille + arêtes intérieur/extérieur). */
  function _buildSafeBeachContour() {
    const inside = ZS.isOnBeachSafeSand;
    if (!inside) return null;
    const xMin = 228;
    const xMax = 298;
    const zMin = -92;
    const zMax = 78;
    const step = 4;
    const segs = [];
    const yAt = (x, z) => _groundY(x, z);

    for (let x = xMin; x < xMax; x += step) {
      for (let z = zMin; z < zMax; z += step) {
        const a = inside(x, z);
        const b = inside(x + step, z);
        const c = inside(x, z + step);
        const d = inside(x + step, z + step);
        const xm = x + step * 0.5;
        const zm = z + step * 0.5;
        if (a !== b) {
          segs.push(new THREE.Vector3(xm, yAt(xm, z), z));
          segs.push(new THREE.Vector3(xm, yAt(xm, z + step), z + step));
        }
        if (a !== c) {
          segs.push(new THREE.Vector3(x, yAt(x, zm), zm));
          segs.push(new THREE.Vector3(x + step, yAt(x + step, zm), zm));
        }
        if (a !== d && b !== c) { /* diagonal skip */ }
      }
    }
    if (segs.length < 4) return null;
    return _lineSegments(segs, 0x44ddff, 0.75);
  }

  function _buildBuildExclusions() {
    const group = new THREE.Group();
    const r = ZS.S01Bounds?.POI_EXCLUSION_R || 10;
    const pois = ZS.S01Bounds?.POIS || [];
    for (const poi of pois) {
      if (!Number.isFinite(poi.x)) continue;
      const rad = poi.r || r;
      group.add(_circleLoop(poi.x, poi.z, rad, 40, 0xff4466, 0.85));
    }
    const pts = ZS.BEACH_TRAIL_PTS || [];
    if (pts.length) {
      const [tx, tz] = pts[0];
      const westEdge = tx - r;
      const xMin = westEdge - 4;
      const xMax = tx + 2;
      const zMin = tz - r - 6;
      const zMax = tz + r + 6;
      group.add(_lineLoop(_rectCorners(xMin, xMax, zMin, zMax), 0xff6688, 0.7));
    }
    return group.children.length ? group : null;
  }

  function _build() {
    const scene = _scene();
    if (!scene) return;
    _dispose();
    _group = new THREE.Group();
    _group.name = GROUP_NAME;

    if (_layers.sectors) {
      const sectors = ZS.SectorBounds?.SECTORS_ALL || [];
      for (const s of sectors) {
        if (!Number.isFinite(s.xMin)) continue;
        const open = s.status === 'open';
        const color = open ? 0x44cc66 : 0xcc8844;
        const loop = _lineLoop(_rectCorners(s.xMin, s.xMax, s.zMin, s.zMax), color, open ? 0.9 : 0.55);
        loop.userData.sectorId = s.id;
        _group.add(loop);
      }
      const map = ZS.SectorBounds?.MAP_WORLD;
      if (map) {
        _group.add(_lineLoop(
          _rectCorners(map.xMin, map.xMax, map.zMin, map.zMax),
          0x6688cc,
          0.45,
        ));
      }
    }

    if (_layers.safeBeach) {
      const beach = _buildSafeBeachContour();
      if (beach) _group.add(beach);
    }

    if (_layers.buildExclusions) {
      const ex = _buildBuildExclusions();
      if (ex) _group.add(ex);
    }

    scene.add(_group);
  }

  function _dispose() {
    if (!_group) return;
    _group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    _group.parent?.remove(_group);
    _group = null;
  }

  function getLayers() {
    return { ..._layers };
  }

  function setLayer(key, on) {
    if (!(key in _layers)) return;
    _layers[key] = !!on;
    _saveLayers();
    if (_active) _build();
  }

  function isActive() {
    return _active;
  }

  function enter() {
    if (_active) return;
    _loadLayers();
    _active = true;
    _build();
  }

  function exit() {
    if (!_active) return;
    _active = false;
    _dispose();
    _hidePanel();
  }

  function toggle() {
    if (_active) exit();
    else {
      enter();
      _showPanel();
    }
    return _active;
  }

  function setActive(on) {
    if (on) { enter(); _showPanel(); }
    else exit();
  }

  function _showPanel() {
    let el = document.getElementById('zs-admin-zone-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zs-admin-zone-panel';
      el.innerHTML = [
        '<style>#zs-admin-zone-panel{position:fixed;bottom:12px;left:12px;z-index:12900;',
        'background:rgba(10,14,22,0.92);color:#cde;padding:10px 12px;border-radius:6px;',
        'font:11px/1.4 Consolas,monospace;border:1px solid rgba(100,180,255,0.35);min-width:200px;}',
        '#zs-admin-zone-panel label{display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;}',
        '#zs-admin-zone-panel .title{font-size:12px;color:#9cf;margin-bottom:6px;}',
        '#zs-admin-zone-panel button{margin-top:8px;background:#2a4a7a;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;width:100%;}',
        '</style>',
        '<div class="title">🗺️ Couches zones</div>',
        '<label><input type="checkbox" data-zl="sectors"> Secteurs</label>',
        '<label><input type="checkbox" data-zl="safeBeach"> Plage safe (cyan)</label>',
        '<label><input type="checkbox" data-zl="buildExclusions"> Exclusions build (rouge)</label>',
        '<button type="button" id="zs-zone-close">Masquer tout</button>',
      ].join('');
      document.body.appendChild(el);
      el.querySelectorAll('input[data-zl]').forEach((inp) => {
        inp.addEventListener('change', () => {
          setLayer(inp.dataset.zl, inp.checked);
        });
      });
      el.querySelector('#zs-zone-close')?.addEventListener('click', () => exit());
    }
    el.style.display = 'block';
    el.querySelectorAll('input[data-zl]').forEach((inp) => {
      inp.checked = !!_layers[inp.dataset.zl];
    });
  }

  function _hidePanel() {
    const el = document.getElementById('zs-admin-zone-panel');
    if (el) el.style.display = 'none';
  }

  _loadLayers();

  window.ZS = window.ZS || {};
  ZS.AdminZoneOverlay = {
    isActive,
    toggle,
    setActive,
    enter,
    exit,
    getLayers,
    setLayer,
  };
}());
