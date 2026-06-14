// Constantes + helpers slider — extrait de admin-live-decor.js (IIFE)
const PANEL_ID = 'zs-admin-live-decor';
  const PICK_DIST = 80;
  const PLACE_DIST = 80;
  const SAVE_DEBOUNCE_MS = 400;
  const PREVIEW_ID = '__ald_preview__';
  const ROT_WHEEL_STEP = Math.PI / 12;
  const ROT_KEY_STEP = Math.PI / 36;
  const SEARCH_DEBOUNCE_MS = 280;
  const SNAP_STEP = Math.PI / 12;
  const COPY_KEYS = [
    'prefabId', 'rotX', 'rotZ', 'rotY', 'scale', 'groundLift', 'baseY', 'buildLevel',
    'wreckTilt', 'wreckWheels', 'wreckSink', 'wreckVariant', 'wreckBurnt',
    'railLen', 'shackFloorY', 'treeSeed',
  ];

  const NUM_FIELDS = [
    ['x', 'X'],
    ['z', 'Z'],
    ['y', 'Y'],
    ['baseY', 'baseY'],
    ['rotY', 'rotY'],
    ['rotX', 'rotX'],
    ['rotZ', 'rotZ'],
    ['scale', 'échelle'],
    ['groundLift', 'groundLift'],
    ['buildLevel', 'niveau build'],
    ['wreckTilt', 'épave tilt'],
    ['wreckWheels', 'épave roues'],
    ['wreckSink', 'épave enfoncement'],
    ['railLen', 'long. rail'],
    ['shackFloorY', 'shack floor Y'],
  ];

  const SLIDER_CFG = {
    x: { span: 8, step: 0.02, numStep: 0.01, absMin: -2500, absMax: 2500 },
    z: { span: 8, step: 0.02, numStep: 0.01, absMin: -2500, absMax: 2500 },
    y: { span: 4, step: 0.01, numStep: 0.001, absMin: -500, absMax: 500 },
    baseY: { span: 4, step: 0.01, numStep: 0.001, absMin: -500, absMax: 500 },
    rotY: { span: 1.4, step: 0.005, numStep: 0.001, absMin: -6.29, absMax: 6.29 },
    rotX: { span: 0.8, step: 0.005, numStep: 0.001, absMin: -3.15, absMax: 3.15 },
    rotZ: { span: 0.8, step: 0.005, numStep: 0.001, absMin: -3.15, absMax: 3.15 },
    scale: { span: 2, step: 0.01, numStep: 0.001, absMin: 0.02, absMax: 24 },
    groundLift: { span: 1.2, step: 0.01, numStep: 0.001, absMin: -8, absMax: 8 },
    buildLevel: { span: 3, step: 1, numStep: 1, absMin: 0, absMax: 8 },
    wreckTilt: { span: 0.6, step: 0.01, numStep: 0.001, absMin: -2, absMax: 2 },
    wreckWheels: { span: 4, step: 1, numStep: 1, absMin: 0, absMax: 8 },
    wreckSink: { span: 0.8, step: 0.01, numStep: 0.001, absMin: -3, absMax: 3 },
    railLen: { span: 6, step: 0.05, numStep: 0.01, absMin: 0.5, absMax: 80 },
    shackFloorY: { span: 2, step: 0.01, numStep: 0.001, absMin: -20, absMax: 20 },
  };

  function _sliderBounds(key, value) {
    const cfg = SLIDER_CFG[key] || { span: 4, step: 0.01, absMin: -500, absMax: 500 };
    const v = Number.isFinite(value) ? value : 0;
    const half = cfg.span * 0.5;
    let min = Math.max(cfg.absMin, v - half);
    let max = Math.min(cfg.absMax, v + half);
    if (max - min < cfg.step * 4) {
      min = cfg.absMin;
      max = cfg.absMax;
    }
    return { min, max, step: cfg.step, numStep: cfg.numStep ?? cfg.step, absMin: cfg.absMin, absMax: cfg.absMax, span: cfg.span };
  }

  function _clampField(key, value) {
    const cfg = SLIDER_CFG[key];
    if (!Number.isFinite(value)) return 0;
    if (!cfg) return value;
    return Math.max(cfg.absMin, Math.min(cfg.absMax, value));
  }

  function _defaultScale(prefabId) {
    if (prefabId === 'spawn_border_log') return 2;
    return 1;
  }

  function _scene() {
    return ZS._gfxRuntime?.scene || null;
  }
