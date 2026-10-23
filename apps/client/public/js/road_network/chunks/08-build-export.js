// buildMeshes + export ZS.RoadNetwork — extrait de road_network.js (IIFE)
function removeEdgesByPrefix(prefix) {
    if (!prefix) return 0;
    let n = 0;
    for (let i = _raw.length - 1; i >= 0; i--) {
      if (String(_raw[i].id || '').startsWith(prefix)) {
        _raw.splice(i, 1);
        n++;
      }
    }
    if (n) _ready = false;
    return n;
  }

  function rebuildMeshes(scene, M) {
    disposeMeshes();
    buildMeshes(scene, M);
  }

  function buildMeshes(scene, M) {
    if (!_ready) resolve();
    if (!scene || !M) return;
    _beginRoadChunkBuild(scene);
    const LL = ZS.LoadLog;
    const t0 = performance.now();
    const total = _resolved.length;
    LL?.stepStart?.('road-meshes-build', { edges: total });
    const clearMat = M.path || M.roadDirt;
    const edgeExits = new Map();
    for (const e of _resolved) {
      const linked = _findLinkedClearing(e);
      if (linked) edgeExits.set(e.id, _exitCone(linked, e));
    }

    // Temporairement désactivé: on retire tous les disques visuels de clairière
    // pour isoler le grand disque brun pendant la refonte du spawn.

    let n = 0;
    for (const e of _resolved) {
      n++;
      const roadJoin = _findRoadJoinAtEnd(e);
      if (!e.visual && roadJoin && (e.type === 'trail' || e.type === 'dirt' || e.type === 'path')) {
        _buildTrailRoadJunction(scene, e, roadJoin, _matFor(e, M), _matFor(roadJoin.road, M));
        continue;
      }
      if (!e.visual) continue;
      const mat = _matFor(e, M);
      const clearing = _findLinkedClearing(e);

      if (clearing) {
        _buildCampTrailJunction(scene, clearing, e, mat);
        _buildRibbon(scene, e, mat, JUNCTION_MERGE, 0);
      } else if (roadJoin) {
        _buildTrailRoadJunction(scene, e, roadJoin, mat, _matFor(roadJoin.road, M));
        _buildRibbon(scene, e, mat, 0, JUNCTION_MERGE);
      } else if (e.type === 'asphalt') {
        _buildAsphaltRoad(scene, e, M);
      } else {
        _buildRibbon(scene, e, mat, 0, 0);
      }
      if (LL?.isEnabled?.() && (n % 20 === 0 || n === total)) {
        LL.mark('road-meshes-progress', {
          done: n,
          total,
          ms: Math.round(performance.now() - t0),
          type: e.type,
        });
      }
    }
    LL?.stepEnd?.('road-meshes-build', { edges: total, ms: Math.round(performance.now() - t0) });
    _registerRoadChunksWithStreamer();
  }

  window.ZS = window.ZS || {};
  ZS.RoadNetwork = {
    defineEdge,
    defineClearing,
    resolve,
    applyFlattening,
    buildMeshes,
    buildMeshesAsync,
    rebuildMeshes,
    disposeMeshes,
    removeEdgesByPrefix,
    roadVertexY: _roadVertexY,
    isNearRoad,
    getSurfaceAt,
    sampleAlong,
    getResolvedEdges,
    computeTrailRoadJoin,
    trimTrailForJoin,
    nearestPointOnRoad,
    buildTrailTowardRoad,
  };
  ZS.isNearRoad = isNearRoad;
