// Options joueur — qualité graphique, audio, contrôles, immersion (localStorage).
(function () {
  'use strict';

  const STORAGE_KEY = 'zs_options_v1';

  const QUALITY_PRESETS = {
    auto: {
      label: 'Automatique',
      hint: 'Adapte le jeu à votre appareil (mémoire, écran tactile).',
    },
    potato: {
      label: 'Très faible',
      hint: 'Téléphones très anciens — décor réduit, pas d\'ombres, distance courte.',
    },
    low: {
      label: 'Faible',
      hint: 'Économise la batterie — ombres coupées, monde allégé.',
    },
    medium: {
      label: 'Moyen',
      hint: 'Tablette récente ou PC léger — peut ramer sur téléphone.',
    },
    high: {
      label: 'Élevé',
      hint: 'PC ou appareil puissant — ombres, décor dense, nuages.',
    },
  };

  const PROFILES = {
    potato: {
      tier: 'potato',
      pixelRatioMax: 0.55,
      shadows: false,
      shadowMapSize: 256,
      shadowInterval: 180,
      shadowFrustum: 30,
      fogNear: 48,
      fogFar: 88,
      fogFarNight: 68,
      cameraFar: 95,
      terrainSeg: 14,
      decorScale: 0.15,
      clouds: 0,
      stars: false,
      waterAnim: false,
      oceanScroll: false,
      maxLights: 1,
      starCount: 0,
      lightCullEvery: 10,
      biomeStride: 3,
      billboardStride: 4,
      dayNightStride: 3,
      decorVisRadius: 72,
      waterStride: 1,
    },
    low: {
      tier: 'low',
      pixelRatioMax: 0.78,
      shadows: false,
      shadowMapSize: 512,
      shadowInterval: 72,
      shadowFrustum: 38,
      fogNear: 62,
      fogFar: 108,
      fogFarNight: 82,
      cameraFar: 118,
      terrainSeg: 18,
      decorScale: 0.32,
      clouds: 1,
      stars: false,
      waterAnim: false,
      oceanScroll: false,
      maxLights: 2,
      starCount: 0,
      lightCullEvery: 7,
      biomeStride: 2,
      billboardStride: 3,
      dayNightStride: 2,
      decorVisRadius: 95,
      waterStride: 1,
    },
    medium: {
      tier: 'medium',
      pixelRatioMax: 0.92,
      shadows: false,
      shadowMapSize: 512,
      shadowInterval: 36,
      shadowFrustum: 46,
      fogNear: 82,
      fogFar: 145,
      fogFarNight: 115,
      cameraFar: 155,
      terrainSeg: 22,
      decorScale: 0.5,
      clouds: 3,
      stars: false,
      waterAnim: true,
      oceanScroll: true,
      maxLights: 3,
      starCount: 48,
      lightCullEvery: 5,
      biomeStride: 2,
      billboardStride: 2,
      dayNightStride: 1,
      decorVisRadius: 130,
      waterStride: 2,
    },
    high: {
      tier: 'high',
      pixelRatioMax: 1.5,
      shadows: true,
      shadowMapSize: 1024,
      shadowInterval: 18,
      shadowFrustum: 58,
      fogNear: 140,
      fogFar: 420,
      fogFarNight: 220,
      cameraFar: 175,
      terrainSeg: 44,
      decorScale: 1.0,
      clouds: 10,
      stars: true,
      waterAnim: true,
      oceanScroll: true,
      maxLights: 8,
      starCount: 240,
      lightCullEvery: 4,
      biomeStride: 1,
      billboardStride: 1,
      dayNightStride: 1,
      decorVisRadius: 165,
      waterStride: 1,
    },
  };

  const DEFAULTS = {
    quality: 'auto',
    muted: false,
    volMaster: 0.9,
    volAmbient: 0.72,
    volSfx: 1.0,
    footsteps: true,
    forestBirds: false,
    forestCreatures: false,
    headBob: true,
    sprintFov: true,
    survivalVignette: true,
    lookSens: 1.0,
    invertY: false,
    touchMode: 'auto',
  };

  let _opts = { ...DEFAULTS };
  let _resolvedTier = 'medium';
  let _listeners = [];
  let _inited = false;

  function _clamp() {
    _opts.volMaster = Math.max(0, Math.min(1, Number(_opts.volMaster) || 0.9));
    _opts.volAmbient = Math.max(0, Math.min(1, Number(_opts.volAmbient) || 0.72));
    _opts.volSfx = Math.max(0, Math.min(1, Number(_opts.volSfx) || 1));
    _opts.lookSens = Math.max(0.4, Math.min(2.2, Number(_opts.lookSens) || 1));
    if (!QUALITY_PRESETS[_opts.quality] && _opts.quality !== 'auto') _opts.quality = 'auto';
    if (!['auto', 'on', 'off'].includes(_opts.touchMode)) _opts.touchMode = 'auto';
  }

  function _resolveTier(quality) {
    if (quality && quality !== 'auto' && PROFILES[quality]) return quality;
    const mem = navigator.deviceMemory;
    const touch = ZS.needsTouchControls?.() ?? false;
    const phone = ZS.detectPhone?.() ?? false;
    const tablet = ZS.detectTabletDevice?.() ?? false;
    if (!touch) return 'high';
    if (mem && mem <= 2) return 'potato';
    if (phone) return mem && mem <= 4 ? 'potato' : 'low';
    if (tablet) return mem && mem <= 4 ? 'low' : 'low';
    return 'low';
  }

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(_opts, JSON.parse(raw));
    } catch { /* privé / JSON invalide */ }
    const legacyMute = localStorage.getItem('zs_audio_muted');
    if (legacyMute !== null && !localStorage.getItem(STORAGE_KEY)) {
      _opts.muted = legacyMute === '1';
    }
    _clamp();
    _resolvedTier = _resolveTier(_opts.quality);
  }

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_opts)); } catch { /* */ }
    try { localStorage.setItem('zs_audio_muted', _opts.muted ? '1' : '0'); } catch { /* */ }
    _resolvedTier = _resolveTier(_opts.quality);
    for (const fn of _listeners) {
      try { fn(getAll()); } catch { /* */ }
    }
  }

  function init() {
    if (_inited) return;
    _load();
    _inited = true;
  }

  function get(key) { return _opts[key]; }

  function getAll() {
    return { ..._opts, resolvedTier: _resolvedTier, profile: getProfile() };
  }

  function getProfile() {
    return { ...PROFILES[_resolvedTier] };
  }

  function getResolvedTier() { return _resolvedTier; }

  function getDecorScale() { return getProfile().decorScale; }

  function getLookSensitivity() {
    return {
      touch: 0.004 * _opts.lookSens,
      mouse: 0.002 * _opts.lookSens,
    };
  }

  function isFeature(name) {
    switch (name) {
      case 'footsteps': return _opts.footsteps !== false;
      case 'forestBirds': return _opts.forestBirds === true;
      case 'forestCreatures': return _opts.forestCreatures === true;
      case 'headBob': return _opts.headBob !== false;
      case 'sprintFov': return _opts.sprintFov !== false;
      case 'survivalVignette': return _opts.survivalVignette !== false;
      case 'waterAnim': return getProfile().waterAnim !== false;
      default: return true;
    }
  }

  function set(key, value) {
    if (!(key in DEFAULTS)) return;
    _opts[key] = value;
    _clamp();
    _save();
    _applyImmediate(key);
  }

  function setMany(patch) {
    Object.assign(_opts, patch);
    _clamp();
    _save();
    for (const k of Object.keys(patch)) _applyImmediate(k);
  }

  function reset() {
    _opts = { ...DEFAULTS };
    _save();
    applyAudio();
    applyTouchMode();
    ZS.UI?.applyOptions?.();
  }

  function onChange(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter((f) => f !== fn); };
  }

  function applyTouchMode() {
    const mode = _opts.touchMode || 'auto';
    if (mode === 'on') {
      window.__ZS_FORCE_TOUCH = true;
      window.__ZS_TOUCH_MODE = true;
    } else if (mode === 'off') {
      window.__ZS_FORCE_TOUCH = false;
      window.__ZS_TOUCH_MODE = false;
    } else {
      delete window.__ZS_FORCE_TOUCH;
    }
    ZS.applyDeviceBodyClasses?.();
    ZS.UI?.ensureTouchControls?.();
  }

  function applyAudio() {
    ZS.Audio?.setMuted?.(!!_opts.muted);
    ZS.Audio?.setVolumes?.({
      master: _opts.volMaster,
      ambient: _opts.volAmbient,
      sfx: _opts.volSfx,
    });
    const item = document.getElementById('menu-audio');
    if (item) item.textContent = _opts.muted ? '🔇 Son : coupé' : '🔊 Son : activé';
  }

  function applyRuntime(ctx) {
    const p = getProfile();
    const { renderer, camera, scene } = ctx || {};
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatioMax));
      renderer.shadowMap.enabled = !!p.shadows;
      if (p.shadows) renderer.shadowMap.needsUpdate = true;
    }
    if (camera) {
      camera.far = p.cameraFar;
      camera.updateProjectionMatrix();
    }
    if (scene?.fog) {
      scene.fog.near = p.fogNear;
      scene.fog.far = p.fogFar;
    }
    ZS.applyGraphicsOptions?.(p);
    applyAudio();
    applyTouchMode();
    ZS.UI?.applyOptions?.();
    if (ctx?.onProfile) ctx.onProfile(p);
  }

  function _applyImmediate(key) {
    switch (key) {
      case 'muted':
      case 'volMaster':
      case 'volAmbient':
      case 'volSfx':
        applyAudio();
        break;
      case 'touchMode':
        applyTouchMode();
        break;
      case 'lookSens':
      case 'invertY':
        ZS.UI?.applyOptions?.();
        break;
      case 'quality':
        if (ZS._gfxRuntime?.renderer) applyRuntime(ZS._gfxRuntime);
        break;
      case 'footsteps':
      case 'forestBirds':
      case 'forestCreatures':
      case 'headBob':
      case 'sprintFov':
      case 'survivalVignette':
        ZS.UI?.applyOptions?.();
        break;
      default:
        break;
    }
  }

  function qualityNeedsReload(prevTier, nextTier) {
    return prevTier !== nextTier;
  }

  function getDeviceHint() {
    const mem = navigator.deviceMemory;
    const phone = ZS.detectPhone?.();
    const tablet = ZS.detectTabletDevice?.();
    if (phone) {
      const tier = getResolvedTier();
      if (tier === 'medium' || tier === 'high') {
        return 'Téléphone — passez en « Faible » ou « Très faible », puis rechargez la page.';
      }
      return 'Téléphone — si ça rame encore, essayez « Très faible » puis rechargez.';
    }
    if (tablet) {
      if (getResolvedTier() === 'medium' || getResolvedTier() === 'high') {
        return 'Tablette — « Faible » recommandé pour de meilleures perfs. Rechargez après changement.';
      }
      return 'Tablette — en cas de ralentissements, passez en « Très faible » et rechargez.';
    }
    if (mem && mem <= 2) {
      return 'Mémoire limitée — profil « Très faible » recommandé.';
    }
    return null;
  }

  window.ZS = window.ZS || {};
  ZS.Options = {
    init,
    get,
    set,
    setMany,
    reset,
    getAll,
    getProfile,
    getResolvedTier,
    getDecorScale,
    getLookSensitivity,
    isFeature,
    onChange,
    applyRuntime,
    applyAudio,
    applyTouchMode,
    qualityNeedsReload,
    getDeviceHint,
    QUALITY_PRESETS,
    DEFAULTS,
  };
  init();
}());
