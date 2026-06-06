// Prefabs barrières routières — poteaux + rails (seed serveur decorseed barriers).

(function () {
  'use strict';

  const _metalMat = new THREE.MeshLambertMaterial({ color: 0x6a6e72 });
  const _rustMat = new THREE.MeshLambertMaterial({ color: 0x7a4a32 });

  function _buildPost(root) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.72, 5),
      _rustMat,
    );
    post.position.y = 0.36;
    post.castShadow = post.receiveShadow = true;
    root.add(post);
    root.userData.barrierKind = 'post';
  }

  function _buildRail(root, opts) {
    const len = Math.max(0.05, Number(opts.railLen) || 2.6);
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.07, 0.07),
      _metalMat,
    );
    rail.position.y = 0.62;
    rail.castShadow = rail.receiveShadow = true;
    root.add(rail);
    root.userData.barrierKind = 'rail';
    root.userData.railLen = len;
  }

  const BARRIER_PREFABS = {
    road_barrier_post: { build: _buildPost, label: 'Poteau barrière route' },
    road_barrier_rail: { build: _buildRail, label: 'Rail barrière route' },
  };

  function registerBarrierPrefabs() {
    if (!ZS.registerDecorPrefab) return;
    for (const [id, def] of Object.entries(BARRIER_PREFABS)) {
      ZS.registerDecorPrefab(id, def);
    }
  }

  registerBarrierPrefabs();

  const _axisX = new THREE.Vector3(1, 0, 0);
  const _dir = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _euler = new THREE.Euler();
  /** Colliders statiques RN — survit à clearDecorColliders() au reconnect socket. */
  const _barrierColliders = [];

  function resetBarrierColliders() {
    _barrierColliders.length = 0;
  }

  function getBarrierColliders() {
    return _barrierColliders;
  }

  function _registerPostCollider(bx, by, bz, decorId) {
    _barrierColliders.push({
      x: bx,
      z: bz,
      r: 0.09,
      topY: by + 0.72,
      decorId,
      barrier: true,
    });
  }

  function _registerRailCollider(a, b, decorId, baseY) {
    _barrierColliders.push({
      type: 'seg',
      x0: a.x,
      z0: a.z,
      x1: b.x,
      z1: b.z,
      r: 0.14,
      baseY,
      maxY: baseY + 0.78,
      decorId,
      barrier: true,
    });
  }

  /** Pose les glissières le long d'une arête RN résolue (même algo qu'avant, via prefabs). */
  function buildRoadBarriers(scene, edge, opts) {
    if (!scene || !edge?.barriers || edge.type !== 'asphalt') return;
    if (!ZS.spawnDecorPrefab) return;
    opts = opts || {};
    const offset = Number.isFinite(opts.offset) ? opts.offset : 0.55;
    const step = Number.isFinite(opts.step) ? opts.step : 2.6;
    const inGap = typeof opts.inGap === 'function' ? opts.inGap : () => false;
    const terrainAt = (x, z) => (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
    const pts = edge.pts;
    if (!pts || pts.length < 2) return;

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const totalLen = cum[cum.length - 1];
    if (totalLen < 0.01) return;
    const hw = edge.width * 0.5 + offset;

    function pointAt(dist) {
      const d = Math.max(0, Math.min(totalLen, dist));
      for (let i = 1; i < pts.length; i++) {
        const segLen = cum[i] - cum[i - 1];
        if (segLen < 0.0001) continue;
        if (d <= cum[i] || i === pts.length - 1) {
          const f = (d - cum[i - 1]) / segLen;
          const x0 = pts[i - 1][0];
          const z0 = pts[i - 1][1];
          const x1 = pts[i][0];
          const z1 = pts[i][1];
          return {
            x: x0 + (x1 - x0) * f,
            z: z0 + (z1 - z0) * f,
            tx: (x1 - x0) / segLen,
            tz: (z1 - z0) / segLen,
          };
        }
      }
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const segLen = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
      return {
        x: last[0],
        z: last[1],
        tx: (last[0] - prev[0]) / segLen,
        tz: (last[1] - prev[1]) / segLen,
      };
    }

    for (const side of [-1, 1]) {
      const sideTag = side < 0 ? 'left' : 'right';
      const posts = [];
      let postIdx = 0;
      for (let d = 0; d <= totalLen + 0.001; d += step) {
        const p = pointAt(d);
        const bx = p.x + (-p.tz) * hw * side;
        const bz = p.z + p.tx * hw * side;
        if (inGap(bx, bz)) {
          posts.push(null);
          continue;
        }
        const by = terrainAt(bx, bz);
        ZS.spawnDecorPrefab(scene, 'road_barrier_post', bx, by, bz, {
          decorId: `rb_${edge.id}_${sideTag}_post_${postIdx}`,
          grounded: false,
          collide: false,
        });
        _registerPostCollider(bx, by, bz, `rb_${edge.id}_${sideTag}_post_${postIdx}`);
        posts.push({ x: bx, y: by + 0.62, z: bz });
        postIdx += 1;
      }

      for (let i = 0; i < posts.length - 1; i++) {
        const a = posts[i];
        const b = posts[i + 1];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.02) continue;
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const midZ = (a.z + b.z) * 0.5;
        const decorId = `rb_${edge.id}_${sideTag}_rail_${i}`;
        const root = ZS.spawnDecorPrefab(scene, 'road_barrier_rail', midX, midY - 0.62, midZ, {
          decorId,
          grounded: false,
          railLen: len,
          collide: false,
        });
        if (root) {
          _dir.set(dx / len, dy / len, dz / len);
          _quat.setFromUnitVectors(_axisX, _dir);
          root.quaternion.copy(_quat);
          const spec = root.userData.decorSpec;
          if (spec) {
            _euler.setFromQuaternion(_quat, 'XYZ');
            spec.rotY = _euler.y;
            spec.rotX = _euler.x;
            spec.baseY = Math.min(terrainAt(a.x, a.z), terrainAt(b.x, b.z));
            spec.railSeg = { x0: a.x, z0: a.z, x1: b.x, z1: b.z };
            _registerRailCollider(a, b, decorId, spec.baseY);
          }
        }
      }
    }
  }

  window.ZS = window.ZS || {};
  ZS.BarrierPrefabs = {
    listBarrierPrefabIds: () => Object.keys(BARRIER_PREFABS),
    buildRoadBarriers,
    resetBarrierColliders,
    getBarrierColliders,
    BARRIER_PREFABS,
  };
}());
