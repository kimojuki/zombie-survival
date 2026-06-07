// Web Audio — ambiances biomes (plage/forêt) + SFX gameplay.
// Le contexte démarre au premier geste utilisateur (politique autoplay).
(function () {
  'use strict';

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

  // ── Initialisation / reprise du contexte (au 1er geste) ─────────────────────
  function init() {
    setMuted(_muted);
    const resume = () => _ensure();
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) =>
      document.addEventListener(ev, resume, { passive: true }));
  }

  function _ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = _muted ? 0 : _volMaster;
      _outFilter = ctx.createBiquadFilter();
      _outFilter.type = 'lowpass';
      _outFilter.frequency.value = 18000;
      _outFilter.Q.value = 0.7;
      master.connect(_outFilter);
      _outFilter.connect(ctx.destination);

      ambientBus = ctx.createGain();
      ambientBus.gain.value = _volAmbient;
      ambientBus.connect(master);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = _volSfx;
      sfxBus.connect(master);

      // Bruit blanc de 1 s réutilisé par tous les effets
      const len = Math.floor(ctx.sampleRate * 1.0);
      _noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = _noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    _loadBuffers();
    if (!_biomesStarted) { _biomesStarted = true; _startBiomeAmbience(); }
    return ctx;
  }

  function _smoothstep(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  function _biomeTargets(x, z) {
    const bw = ZS.beachCoastWeight?.(x, z) ?? 0;
    const beach = _smoothstep(BEACH_BLEND_IN, BEACH_BLEND_OUT, bw);
    return { beach, forest: 1 - beach };
  }

  function _spawnBiomeLoop(buffer, id) {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ambientBus);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gain);
    src.start(0);
    _biomeLayers[id] = { gain, src };
  }

  function _loadBiomeFile(id, url) {
    return fetch(url)
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { _spawnBiomeLoop(buf, id); })
      .catch(() => { /* secours synth ci-dessous */ });
  }

  function _startBiomeAmbience() {
    Promise.all([
      _loadBiomeFile('beach', BIOME_FILES.beach),
      _loadBiomeFile('forest', BIOME_FILES.forest),
      _loadBiomeFile('forestBed', BIOME_FILES.forestBed),
    ]).finally(() => {
      if (!_biomeLayers.beach) _synthBeachAmbience();
      if (!_biomeLayers.forest) _synthForestAmbience();
    });
  }

  function _synthBeachAmbience() {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ambientBus);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.6;
    const wind = _noiseSource();
    wind.connect(lp);
    lp.connect(gain);
    wind.start();
    _biomeLayers.beach = { gain, src: wind, synth: true };
  }

  function _synthForestAmbience() {
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ambientBus);
    const wind = _noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const wg = ctx.createGain();
    wg.gain.value = 0.14;
    wind.connect(lp);
    lp.connect(wg);
    wg.connect(gain);
    wind.start();
    _biomeLayers.forest = { gain, src: wind, synth: true };
  }

  function _forestWindGust(strength) {
    const list = _forestWindBufs;
    if (!list.length || !ctx || _muted) return;
    const buf = list[Math.floor(Math.random() * list.length)];
    const dur = buf.duration || 1;
    const clip = 0.45 + Math.random() * 0.85;
    const start = dur > clip + 0.15 ? Math.random() * (dur - clip) : 0;
    const pan = (Math.random() - 0.5) * 0.65;
    const vol = (0.07 + Math.random() * 0.06) * Math.max(0.32, strength);
    _playBuffer(buf, vol, pan, 0.9 + Math.random() * 0.18, clip, start);
  }

  function _forestCreatureRustle(strength) {
    if (!ZS.Options?.isFeature?.('forestCreatures')) return;
    const list = _forestCreatureBufs;
    if (!list.length || !ctx || _muted) return;
    const buf = list[Math.floor(Math.random() * list.length)];
    const dur = buf.duration || 1;
    const clip = Math.min(dur, 0.22 + Math.random() * 0.38);
    const start = dur > clip + 0.1 ? Math.random() * (dur - clip) : 0;
    const pan = (Math.random() - 0.5) * 0.9;
    const vol = (0.05 + Math.random() * 0.04) * Math.max(0.28, strength);
    _playBuffer(buf, vol, pan, 0.94 + Math.random() * 0.1, clip, start);
  }

  function _forestBirdChirp(strength) {
    if (!ZS.Options?.isFeature?.('forestBirds')) return;
    const list = _forestBirdBufs;
    if (!list.length || !ctx || _muted) return;
    const buf = list[Math.floor(Math.random() * list.length)];
    const dur = buf.duration || 0.5;
    const clip = Math.min(dur, 0.35 + Math.random() * 0.55);
    const start = dur > clip + 0.05 ? Math.random() * (dur - clip) : 0;
    const pan = (Math.random() - 0.5) * 0.85;
    const vol = (0.1 + Math.random() * 0.08) * Math.max(0.4, strength);
    _playBuffer(buf, vol, pan, 0.95 + Math.random() * 0.15, clip, start);
  }

  function _tickForestEvents(px, pz, dt) {
    const fw = ZS.forestFloorWeight?.(px, pz) ?? 0;
    const forestAmt = _mixForest * Math.max(fw, 0.12);
    if (forestAmt < 0.18) {
      _windGustTimer = Math.min(_windGustTimer, 8);
      _creatureTimer = Math.min(_creatureTimer, 30);
      _birdTimer = Math.min(_birdTimer, 10);
      return;
    }
    _windGustTimer -= dt;
    if (_windGustTimer <= 0) {
      _forestWindGust(forestAmt);
      _windGustTimer = 14 + Math.random() * 20;
    }
    if (ZS.Options?.isFeature?.('forestCreatures')) {
      _creatureTimer -= dt;
      if (_creatureTimer <= 0) {
        _forestCreatureRustle(forestAmt);
        _creatureTimer = 55 + Math.random() * 75;
      }
    }
    if (ZS.Options?.isFeature?.('forestBirds')) {
      _birdTimer -= dt;
      if (_birdTimer <= 0) {
        _forestBirdChirp(forestAmt);
        _birdTimer = 12 + Math.random() * 26;
      }
    }
  }

  function updateBiomeAmbient(px, pz, dt) {
    if (!ctx || _muted) return;
    const tgt = _biomeTargets(px, pz);
    const k = Math.min(1, (dt || 0.016) * 1.6);
    _mixBeach += (tgt.beach - _mixBeach) * k;
    _mixForest += (tgt.forest - _mixForest) * k;
    const oceanProx = ZS.beachOceanProximity?.(px, pz) ?? tgt.beach;
    const waveGain = _mixBeach * BEACH_VOL * (0.06 + 0.94 * Math.max(oceanProx, tgt.beach * 0.15));
    const t = ctx.currentTime;
    if (_biomeLayers.beach?.gain) {
      _biomeLayers.beach.gain.gain.setTargetAtTime(
        Math.max(0.0001, waveGain), t, 0.45);
    }
    const forestGain = Math.max(0.0001, _mixForest * FOREST_VOL);
    if (_biomeLayers.forest?.gain) {
      _biomeLayers.forest.gain.gain.setTargetAtTime(forestGain, t, 0.45);
    }
    if (_biomeLayers.forestBed?.gain) {
      _biomeLayers.forestBed.gain.gain.setTargetAtTime(
        forestGain * FOREST_BED_MIX, t, 0.55);
    }
    _tickForestEvents(px, pz, dt || 0.016);
  }

  function _noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = _noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  function footstepSurface(x, z, feetY) {
    if (ZS.BuildAnchors?.isStandingOnFoundation?.(x, z, feetY)) return 'wood';
    const rnSurf = ZS.RoadNetwork?.getSurfaceAt?.(x, z, 0.1);
    if (rnSurf === 'asphalt') return 'asphalt';
    if (rnSurf === 'trail') return 'trail';
    if (ZS.isInTrailCorridor?.(x, z, 0.3)) return 'trail';
    if (ZS.Trails?.isNear && ZS.SPAWN_TRAIL_PTS
        && ZS.Trails.isNear(ZS.SPAWN_TRAIL_PTS, x, z, 1.05)) return 'trail';
    const bw = ZS.beachCoastWeight?.(x, z) ?? 0;
    const fw = ZS.forestFloorWeight?.(x, z) ?? 0;
    if (bw > 0.32) return 'sand';
    if (fw > 0.32) return 'forest';
    if (ZS.isInClearingDisc?.(x, z, 0.15)) return 'grass';
    return 'dirt';
  }

  function _footstepSample(surface, vol, panOverride) {
    const list = (_footstepBuffers[surface] || _footstepBuffers.dirt).filter(Boolean);
    if (!list.length) return false;
    const buf = list[Math.floor(Math.random() * list.length)];
    const gain = (FOOTSTEP_GAIN[surface] ?? 1) * vol * 0.58;
    const pan = panOverride != null
      ? panOverride
      : (_footAlt++ % 2 ? 0.14 : -0.14) + (Math.random() - 0.5) * 0.1;
    const rateSpan = FOOTSTEP_RATE[surface];
    const rate = rateSpan
      ? rateSpan[0] + Math.random() * (rateSpan[1] - rateSpan[0])
      : 0.93 + Math.random() * 0.14;
    const clip = FOOTSTEP_CLIP[surface] ?? 0.38;
    const dur = buf.duration || clip;
    const start = (surface === 'trail' || surface === 'asphalt') && dur > clip + 0.08
      ? Math.random() * (dur - clip)
      : 0;
    _playBuffer(buf, gain, pan, rate, clip, start);
    return true;
  }

  function _footstepSynth(surface, vol, pan) {
    const p = _FOOTSTEP_SYNTH[surface] || _FOOTSTEP_SYNTH.dirt;
    const t = ctx.currentTime;
    const out = _panNode(pan);

    const src = _noiseSource();
    src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = p.bp * (0.92 + Math.random() * 0.16);
    bp.Q.value = p.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(p.vol * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.1);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(p.thump, t);
    o.frequency.exponentialRampToValueAtTime(p.thump * 0.55, t + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.38 * p.vol * vol, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + 0.1);
  }

  function footstep(surface, vol, pan) {
    if (!ctx || _muted) return;
    _ensure();
    const v = (vol == null ? 1 : vol);
    if (v <= 0.02) return;
    if (_footstepSample(surface, v, pan)) return;
    _footstepSynth(surface, v, pan);
  }

  const SPATIAL_RANGE = 58;
  const _spFwd = { x: 0, z: 0 };

  /** Volume + panoramique selon la position monde (autres joueurs, portes, arbres…). */
  function spatialAt(px, pz) {
    const cam = ZS._camera;
    if (!cam || !Number.isFinite(px) || !Number.isFinite(pz)) return null;
    const dx = px - cam.position.x;
    const dz = pz - cam.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > SPATIAL_RANGE) return { vol: 0, pan: 0 };
    const vol = (1 - dist / SPATIAL_RANGE) ** 2;
    const e = cam.rotation.y || 0;
    _spFwd.x = -Math.sin(e);
    _spFwd.z = -Math.cos(e);
    const fl = Math.hypot(_spFwd.x, _spFwd.z) || 1;
    _spFwd.x /= fl;
    _spFwd.z /= fl;
    const rx = _spFwd.z;
    const rz = -_spFwd.x;
    const tl = Math.hypot(dx, dz) || 1;
    const pan = Math.max(-1, Math.min(1, ((dx / tl) * rx + (dz / tl) * rz)));
    return { vol, pan };
  }

  function splash(vol) {
    if (!ctx || _muted) return;
    _ensure();
    const v = (vol == null ? 1 : vol);
    if (v <= 0.02) return;
    const t = ctx.currentTime;
    const out = sfxBus;

    const src = _noiseSource();
    src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 240 + Math.random() * 120;
    bp.Q.value = 0.45;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + 0.24);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.42 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + 0.2);
  }

  function setWaterDepth(depth, inWater) {
    if (!ctx || !_outFilter) return;
    const t = ctx.currentTime;
    const d = Math.max(0, depth || 0);
    if (!inWater || d < 0.02) {
      _outFilter.frequency.setTargetAtTime(18000, t, 0.28);
      if (ambientBus) ambientBus.gain.setTargetAtTime(0.72, t, 0.35);
      return;
    }
    _outFilter.frequency.setTargetAtTime(Math.max(320, 5600 - d * 2200), t, 0.22);
    if (ambientBus) ambientBus.gain.setTargetAtTime(Math.max(0.22, 0.72 - d * 0.65), t, 0.3);
  }

  // ── Tir d'arme à feu : échantillon réel (secours = synthèse) ────────────────
  function gunshot(type, vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    if (v <= 0.01) return;
    const key = type === 'wpn_fusil_pompe'  ? 'gun_shotgun'
              : type === 'wpn_fusil_chasse' ? 'gun_rifle'
              : 'gun_pistol';
    const buf = _buffers[key];
    if (buf) {
      // Un seul coup : on coupe l'extrait (les enregistrements contiennent
      // plusieurs tirs/une longue traîne).
      const dur = key === 'gun_shotgun' ? 0.7 : key === 'gun_rifle' ? 0.55 : 0.4;
      _playBuffer(buf, v * 0.9, pan, 0.97 + Math.random() * 0.06, dur);
      return;
    }
    _synthGunshot(type, v, pan);
  }

  // ── Grognement de zombie : échantillon réel (secours = synthèse) ────────────
  function zombieGroan(vol, pan) {
    if (!ZOMBIE_SFX_ENABLED || !ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    if (v <= 0.02) return;
    const buf = _buffers['zombie_' + (1 + Math.floor(Math.random() * ZOMBIE_COUNT))];
    // Hauteur abaissée + variée → rendu plus « zombie »
    if (buf) { _playBuffer(buf, v * 0.95, pan, 0.78 + Math.random() * 0.26); return; }
    _synthGroan(v, pan);
  }

  // ── Tir synthétisé (secours) : claquement (bruit filtré) + thump grave ──────
  function _synthGunshot(type, vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    if (v <= 0.01) return;
    const t = ctx.currentTime;
    const out = _panNode(pan);

    const big   = type === 'wpn_fusil_pompe';
    const crack = type === 'wpn_fusil_chasse';
    const dur   = big ? 0.45 : crack ? 0.32 : 0.16;

    // Claquement = bruit blanc filtré, déclin exponentiel rapide
    const src = _noiseSource(); src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = crack ? 3800 : big ? 1700 : 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime((big ? 1.0 : 0.75) * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + dur + 0.02);

    // Thump grave (corps de la détonation)
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(big ? 150 : 115, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime((big ? 0.95 : 0.6) * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.2);
  }

  // ── Porte / bois — grincement court (secours synthèse) ─────────────────────
  function door(open, vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    const t = ctx.currentTime;
    const out = _panNode(pan);
    const opening = open == null ? 1 : (open ? 1 : 0.85);

    const src = _noiseSource(); src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = opening ? 420 : 280; bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55 * v * opening, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + (opening ? 0.38 : 0.28));
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.42);

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(opening ? 110 : 85, t);
    o.frequency.exponentialRampToValueAtTime(opening ? 62 : 48, t + 0.22);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.22 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.26);

    if (!opening) {
      const th = ctx.createOscillator();
      th.type = 'sine';
      th.frequency.setValueAtTime(48, t + 0.08);
      th.frequency.exponentialRampToValueAtTime(28, t + 0.22);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.35 * v, t + 0.08);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      th.connect(tg); tg.connect(out);
      th.start(t + 0.08); th.stop(t + 0.26);
    }
  }

  // ── Coup sur bois (hache / caillou sur arbre) ───────────────────────────────
  function chopWood(vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    const t = ctx.currentTime;
    const out = _panNode(pan);

    const src = _noiseSource(); src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.85 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.16);

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.55 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.18);
  }

  // ── Chute d'arbre au sol ────────────────────────────────────────────────────
  function treeFall(vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    const t = ctx.currentTime;
    const out = _panNode(pan);

    const src = _noiseSource(); src.loop = false;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 280;
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.1 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.58);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.45);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.95 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.52);
  }

  // ── Coup de mêlée : impact mat (whack) ──────────────────────────────────────
  function melee(vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    const t = ctx.currentTime;
    const out = _panNode(pan);

    // Bruit court filtré = « tac » de l'impact
    const src = _noiseSource(); src.loop = false;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.12);

    // Thud grave = masse du coup
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.10);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.6 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(og); og.connect(out);
    o.start(t); o.stop(t + 0.16);
  }

  // ── Grognement synthétisé (secours) : growl grave + raclement ───────────────
  function _synthGroan(vol, pan) {
    if (!ctx || _muted) return;
    const v = (vol == null ? 1 : vol);
    if (v <= 0.02) return;
    const t = ctx.currentTime;
    const out = _panNode(pan);
    const dur = 0.6 + Math.random() * 0.6;
    const f0  = 65 + Math.random() * 55;

    // Oscillateur grave + vibrato → growl
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f0;
    o.frequency.linearRampToValueAtTime(f0 * 0.8, t + dur);

    const vib = ctx.createOscillator();
    vib.frequency.value = 6 + Math.random() * 5;
    const vibGain = ctx.createGain(); vibGain.gain.value = f0 * 0.12;
    vib.connect(vibGain); vibGain.connect(o.frequency);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500 + Math.random() * 300;
    lp.Q.value = 5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * v, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    vib.start(t); vib.stop(t + dur + 0.05);

    // Couche de raclement (souffle rauque)
    const src = _noiseSource(); src.loop = false;
    const nbp = ctx.createBiquadFilter();
    nbp.type = 'bandpass'; nbp.frequency.value = 320; nbp.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.18 * v, t + 0.15);
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
    src.connect(nbp); nbp.connect(ng); ng.connect(out);
    src.start(t); src.stop(t + dur);
  }

  // ── Panoramique stéréo (gauche/droite) selon position ───────────────────────
  function _panNode(pan) {
    if (pan == null || !ctx.createStereoPanner) return sfxBus;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(sfxBus);
    return p;
  }

  // ── Mute / bouton UI ────────────────────────────────────────────────────────
  function _torchSfxVol() {
    return (_muted ? 0 : 1) * (ZS.Options?.get?.('volSfx') ?? 1);
  }

  function _torchCracklePop() {
    if (!ctx || _muted || !_torchFire?.running) return;
    const t = ctx.currentTime;
    const out = sfxBus;
    const src = _noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 1400;
    bp.Q.value = 1.4 + Math.random() * 1.2;
    const g = ctx.createGain();
    const vol = (0.04 + Math.random() * 0.05) * _torchSfxVol();
    const dur = 0.02 + Math.random() * 0.05;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  function _startTorchFire() {
    if (_torchFire?.running || !ctx || _muted) return;
    _ensure();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(sfxBus);
    const mod = ctx.createGain();
    mod.gain.value = 0.11;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 160;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2100;
    lp.Q.value = 0.5;
    const src = _noiseSource();
    src.loop = true;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(mod);
    mod.connect(gain);
    src.start();
    const target = 0.13 * _torchSfxVol();
    gain.gain.setTargetAtTime(Math.max(0.0001, target), ctx.currentTime, 0.35);
    _torchFire = {
      running: true, src, gain, mod, lp, t: Math.random() * 10,
    };
    _torchCrackleAcc = 0;
  }

  function _stopTorchFire() {
    if (!_torchFire?.running) return;
    _torchFire.running = false;
    const tf = _torchFire;
    const t = ctx.currentTime;
    tf.gain.gain.setTargetAtTime(0.0001, t, 0.22);
    setTimeout(() => {
      try { tf.src.stop(); } catch { /* */ }
      try { tf.src.disconnect(); } catch { /* */ }
      if (_torchFire === tf) _torchFire = null;
    }, 320);
  }

  function _tickTorchFire(dt) {
    if (!_torchFire?.running || _muted || !ctx) return;
    _torchFire.t += dt;
    const t = ctx.currentTime;
    const flicker = 0.86 + Math.sin(_torchFire.t * 10.7) * 0.09
      + Math.sin(_torchFire.t * 6.4) * 0.05;
    _torchFire.mod.gain.setTargetAtTime(0.1 * flicker, t, 0.07);
    _torchFire.lp.frequency.setTargetAtTime(1750 + Math.sin(_torchFire.t * 4.8) * 450, t, 0.12);
    _torchFire.gain.gain.setTargetAtTime(0.13 * flicker * _torchSfxVol(), t, 0.15);
    _torchCrackleAcc += dt;
    if (_torchCrackleAcc >= 0.12 + Math.random() * 0.28) {
      _torchCrackleAcc = 0;
      if (Math.random() < 0.72) _torchCracklePop();
    }
  }

  /** Boucle feu torche — appeler chaque frame avec l'item en main. */
  function tickHeldTorch(dt, equippedType, opts = {}) {
    const on = equippedType === 'tool_torche' && !opts.dead && !opts.inWater && !opts.muted;
    if (on && !_torchFire?.running) _startTorchFire();
    if (!on && _torchFire?.running) _stopTorchFire();
    if (_torchFire?.running) _tickTorchFire(dt || 0.016);
  }

  let _volMaster = ZS.Options?.get?.('volMaster') ?? 0.9;
  let _volAmbient = ZS.Options?.get?.('volAmbient') ?? 0.72;
  let _volSfx = ZS.Options?.get?.('volSfx') ?? 1.0;

  function setVolumes(vols = {}) {
    if (vols.master != null) _volMaster = vols.master;
    if (vols.ambient != null) _volAmbient = vols.ambient;
    if (vols.sfx != null) _volSfx = vols.sfx;
    const t = ctx?.currentTime ?? 0;
    if (master) master.gain.setTargetAtTime(_muted ? 0 : _volMaster, t, 0.08);
    if (ambientBus) ambientBus.gain.setTargetAtTime(_volAmbient, t, 0.08);
    if (sfxBus) sfxBus.gain.setTargetAtTime(_volSfx, t, 0.08);
  }

  function setMuted(m) {
    _muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* privé */ }
    if (ZS.Options?.get && ZS.Options.get('muted') !== m) {
      try { ZS.Options.set('muted', m); return; } catch { /* */ }
    }
    const t = ctx?.currentTime ?? 0;
    if (master) master.gain.setTargetAtTime(m ? 0 : _volMaster, t, 0.06);
    if (m && _torchFire?.running) _stopTorchFire();
    const item = document.getElementById('menu-audio');
    if (item) item.textContent = m ? '🔇 Son : coupé' : '🔊 Son : activé';
  }
  function toggleMute() {
    if (ZS.Options?.set) { ZS.Options.set('muted', !_muted); return; }
    setMuted(!_muted);
  }
  function isMuted() { return _muted; }

  window.ZS = window.ZS || {};
  ZS.Audio = {
    init, gunshot, melee, chopWood, treeFall, door, zombieGroan,
    footstep, footstepSurface, splash, spatialAt, setWaterDepth, setVolumes,
    updateBiomeAmbient, tickHeldTorch, setMuted, toggleMute, isMuted,
  };
}());
