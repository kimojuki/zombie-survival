// Contours plage, exclusions, build
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
