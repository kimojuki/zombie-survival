// Init + ambiances biomes — extrait de audio.js (IIFE)
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

  let _seagullTimer = 7;

  function _seagullCry(beachAmt, pan) {
    if (!ctx || _muted || beachAmt < 0.12) return;
    const t = ctx.currentTime;
    const out = (() => {
      if (pan == null || !ctx.createStereoPanner) return ambientBus || master;
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(ambientBus || master);
      return p;
    })();
    for (let i = 0; i < 2; i++) {
      const start = t + i * 0.24;
      const f0 = 620 + Math.random() * 140;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, start);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.4, start + 0.07);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.7, start + 0.2);
      const g = ctx.createGain();
      const v = (0.05 + Math.random() * 0.05) * beachAmt;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(v, start + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      o.connect(g);
      g.connect(out);
      o.start(start);
      o.stop(start + 0.24);
    }
  }

  function tickBeachLife(px, pz, dt) {
    if (!ctx || _muted) return;
    const bw = ZS.beachCoastWeight?.(px, pz) ?? 0;
    if (bw < 0.1) {
      _seagullTimer = 5;
      return;
    }
    _seagullTimer -= dt || 0.016;
    if (_seagullTimer > 0) return;
    _seagullTimer = 12 + Math.random() * 22;
    _seagullCry(Math.max(bw, _mixBeach * 0.55), 0.2 + Math.random() * 0.55);
  }
