// Constantes + état réseau — extrait de road_network.js (IIFE)
const SNAP_RADIUS = 1.0;
  const RIBBON_LIFT = 0.02;
  const RIBBON_LIFT_MIN = 0.006;
  const RIBBON_STEP = 0.22;
  const RIBBON_STEP_ASYNC_DEFAULT = 0.36;
  const RIBBON_ASYNC_BUDGET_MS = 18;
  const GROUND_CACHE_GRID = 0.35;
  const GROUND_CACHE_GRID_RESNAP = 0.28;
  const JUNCTION_MERGE = 0.42;
  const JUNCTION_ARC_STEPS = 12;

  const SHOULDER = { clearing: 0.5, dirt: 1.0, path: 0.8, trail: 0.85, asphalt: 2.8 };
  const BLEND    = { clearing: 4.0, dirt: 5.0, path: 4.0, trail: 4.5, asphalt: 6.5 };
  const QUERY_PAD = { clearing: 0.3, dirt: 0.6, path: 0.5, trail: 0.55, asphalt: 1.2 };
  const BARRIER_OFFSET = 0.55;
  const BARRIER_STEP = 2.6;

  const _raw = [];
  const _clearings = [];
  const _resolved = [];
  const _barrierGaps = [];
  const _meshes = [];
  let _ready = false;
  let _edgeId = 0;
  /** Config temporaire pour buildMeshesAsync (qualité réduite, budget temps). */
  let _asyncRoadCfg = null;

  function _asyncRoadCfgOrDefault() {
    return _asyncRoadCfg || {
      ribbonStep: RIBBON_STEP,
      budgetMs: RIBBON_ASYNC_BUDGET_MS,
      cols: 6,
      skipShoulder: false,
      skipLaneOverlay: false,
      skipBarriers: false,
      deferLaneOverlay: false,
      deferBarriers: false,
      fastGround: false,
    };
  }

  function _ribbonStepForAsyncEdge(edge) {
    const cfg = _asyncRoadCfgOrDefault();
    const len = edge.totalLen || _polylineLength(edge.pts || []);
    let step = cfg.ribbonStep || RIBBON_STEP_ASYNC_DEFAULT;
    if (len > 400) step = Math.max(step, 0.78);
    else if (len > 280) step = Math.max(step, 0.65);
    else if (len > 200) step = Math.max(step, 0.46);
    else if (len > 120) step = Math.max(step, 0.40);
    return step;
  }

  /** Cache hauteur sol pendant buildMeshesAsync (raycast terrain mesh, dédupliqué). */
  let _groundCache = null;
  let _groundCacheGrid = GROUND_CACHE_GRID;
