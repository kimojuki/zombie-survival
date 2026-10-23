// État + chargement buffers — extrait de audio.js (IIFE)
const MUTE_KEY = 'zs_audio_muted';
  /** Grognements zombies désactivés temporairement (qualité audio à revoir). */
  const ZOMBIE_SFX_ENABLED = false;

  function _readMutedPref() {
    if (ZS.Options?.get) return !!ZS.Options.get('muted');
    const v = localStorage.getItem(MUTE_KEY);
    if (v === null) return false;
    return v === '1';
  }

  let ctx = null;
  let master = null;
  let ambientBus = null; // ambiances biomes
  let sfxBus = null;
  let _muted = _readMutedPref();
  let _biomesStarted = false;
  let _noise = null;

  // Crossfade plage ↔ forêt (beachCoastWeight)
  const BIOME_FILES = {
    beach: '/audio/biomes/beach_waves.flac',
    forest: '/audio/biomes/forest_wind.mp3',
    forestBed: '/audio/biomes/forest_ambient.ogg',
  };
  // CC0 : jasinski — vagues ; OGA « The Woods » — vent + lit forêt ; rafales vent ; faune (rustle_2) séparée.
  const FOREST_WIND_GUST_FILES = [
    '/audio/sfx/forest/wind_gust_1.ogg',
    '/audio/sfx/forest/wind_gust_2.ogg',
    '/audio/sfx/forest/wind_gust_3.ogg',
  ];
  /** Bruissement type serpent / faune — optionnel, très espacé (pas dans les rafales vent). */
  const FOREST_CREATURE_FILES = [
    '/audio/sfx/forest/rustle_2.ogg',
  ];
  const FOREST_BIRD_FILES = [
    '/audio/sfx/forest/bird_chirp_2.ogg',
    '/audio/sfx/forest/bird_chirp_1.ogg',
  ];
  const BEACH_BLEND_IN = 0.08;
  const BEACH_BLEND_OUT = 0.40;
  const BEACH_VOL = 0.58;
  const FOREST_VOL = 0.54;
  const FOREST_BED_MIX = 0.32;
  let _biomeLayers = { beach: null, forest: null, forestBed: null };
  let _mixBeach = 0.85;
  let _mixForest = 0.15;
  let _outFilter = null;
  let _forestWindBufs = [];
  let _forestCreatureBufs = [];
  let _forestBirdBufs = [];
  let _forestEventsLoaded = false;
  let _windGustTimer = 10;
  let _creatureTimer = 75;
  let _birdTimer = 12;

  /** Torche en main — crépitement feu (synthèse boucle + pops). */
  let _torchFire = null;
  let _torchCrackleAcc = 0;

  // Pas réels (CC0 / CC-BY) — voir DEV_TRACKER « footstep-samples ».
  const FOOTSTEP_BASE = '/audio/sfx/footsteps/';
  const FOOTSTEP_PATHS = {
    sand:   ['sand_1.flac', 'sand_2.flac'],
    grass:  ['grass_1.flac', 'grass_2.flac'],
    forest: ['grass_1.flac', 'grass_2.flac', 'dirt_3.ogg', 'dirt_4.ogg'],
    dirt:   ['dirt_1.ogg', 'dirt_2.ogg', 'dirt_3.ogg', 'dirt_4.ogg'],
    water:  ['water_1.ogg', 'water_2.ogg', 'water_3.ogg'],
    wood:   ['wood_1.ogg', 'wood_2.ogg', 'wood_3.ogg', 'wood_4.ogg'],
    trail:  ['trail_1.ogg', 'trail_2.ogg', 'trail_3.ogg'],
    asphalt: ['asphalt_1.ogg', 'asphalt_2.ogg'],
  };
  const FOOTSTEP_GAIN = {
    sand: 0.46, grass: 0.9, forest: 0.7, dirt: 0.95, water: 0.72,
    wood: 0.78, trail: 0.8, asphalt: 0.72,
  };
  const FOOTSTEP_CLIP = { sand: 0.30, forest: 0.28, wood: 0.30, water: 0.34, trail: 0.34, asphalt: 0.26 };
  const FOOTSTEP_RATE = {
    wood: [0.96, 1.08], sand: [0.86, 0.98], forest: [0.87, 1.0],
    trail: [0.9, 1.04], asphalt: [0.97, 1.06],
  };
  const _footstepBuffers = {
    sand: [], grass: [], forest: [], dirt: [], water: [], wood: [], trail: [], asphalt: [],
  };
  let _footstepsLoaded = false;
  let _footAlt = 0;

  const _FOOTSTEP_SYNTH = {
    sand:   { bp: 300, q: 0.65, vol: 0.24, thump: 92 },
    forest: { bp: 460, q: 1.05, vol: 0.19, thump: 108 },
    grass:  { bp: 540, q: 0.95, vol: 0.17, thump: 122 },
    dirt:   { bp: 390, q: 0.85, vol: 0.21, thump: 98 },
    water:  { bp: 210, q: 0.55, vol: 0.14, thump: 68 },
    wood:   { bp: 680, q: 1.15, vol: 0.15, thump: 138 },
    trail:  { bp: 420, q: 0.9, vol: 0.18, thump: 105 },
    asphalt: { bp: 820, q: 1.2, vol: 0.13, thump: 152 },
  };

  // Échantillons réels (CC0, opengameart.org) chargés en AudioBuffer.
  // Tirs : Free Firearm recordings. Zombies : « 80 CC0 creature SFX ».
  const _buffers = {};
  const SFX_FILES = {
    gun_pistol:  '/audio/sfx/gun_pistol.wav',
    gun_shotgun: '/audio/sfx/gun_shotgun.wav',
    gun_rifle:   '/audio/sfx/gun_rifle.wav',
    zombie_1: '/audio/sfx/zombie_1.ogg',
    zombie_2: '/audio/sfx/zombie_2.ogg',
    zombie_3: '/audio/sfx/zombie_3.ogg',
    zombie_4: '/audio/sfx/zombie_4.ogg',
    zombie_5: '/audio/sfx/zombie_5.ogg',
    zombie_6: '/audio/sfx/zombie_6.ogg',
  };
  const ZOMBIE_COUNT = 6;
  let _buffersLoaded = false;

  function _loadBuffers() {
    if (_buffersLoaded) return;
    _buffersLoaded = true;
    for (const key in SFX_FILES) {
      fetch(SFX_FILES[key])
        .then((r) => r.arrayBuffer())
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { _buffers[key] = buf; })
        .catch(() => { /* échantillon indispo → on garde la synthèse en secours */ });
    }
    _loadFootsteps();
    _loadForestEvents();
  }

  function _loadForestEvents() {
    if (_forestEventsLoaded) return;
    _forestEventsLoaded = true;
    const pushBuf = (arr, url) => {
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((buf) => { arr.push(buf); })
        .catch(() => {});
    };
    FOREST_WIND_GUST_FILES.forEach((u) => pushBuf(_forestWindBufs, u));
    FOREST_CREATURE_FILES.forEach((u) => pushBuf(_forestCreatureBufs, u));
    FOREST_BIRD_FILES.forEach((u) => pushBuf(_forestBirdBufs, u));
  }

  function _loadFootsteps() {
    if (_footstepsLoaded) return;
    _footstepsLoaded = true;
    for (const surface in FOOTSTEP_PATHS) {
      FOOTSTEP_PATHS[surface].forEach((file, idx) => {
        fetch(FOOTSTEP_BASE + file)
          .then((r) => r.arrayBuffer())
          .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
          .then((buf) => { _footstepBuffers[surface][idx] = buf; })
          .catch(() => { /* fichier manquant → synthèse */ });
      });
    }
  }

  // Joue un AudioBuffer avec volume, panoramique et légère variation de hauteur.
  // `maxDur` (s) : ne joue qu'un extrait (un seul coup) avec un fondu de fin —
  // les enregistrements de tir durent plusieurs secondes (plusieurs coups).
  function _playBuffer(buf, vol, pan, rate, maxDur, startOff) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (rate) src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(_panNode(pan));
    const t = ctx.currentTime;
    const off = Math.max(0, startOff || 0);
    if (maxDur && maxDur > 0) {
      const rel = Math.min(0.05, maxDur * 0.3);
      g.gain.setValueAtTime(vol, t + maxDur - rel);
      g.gain.exponentialRampToValueAtTime(0.0001, t + maxDur);
      src.start(t, off, maxDur);
      src.stop(t + maxDur + 0.02);
    } else {
      src.start(t, off);
    }
  }
