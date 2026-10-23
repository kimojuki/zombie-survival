// Layers + primitives ligne
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
