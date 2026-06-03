// Audio entièrement synthétisé (Web Audio API) — musique d'ambiance + bruitages.
// Aucun fichier externe : tout est généré à la volée. Le contexte audio démarre
// au premier geste utilisateur (politique d'autoplay des navigateurs).
(function () {
  'use strict';

  let ctx = null;
  let master = null;     // gain principal
  let musicBus = null;   // bus musique
  let sfxBus = null;     // bus effets
  let _muted = false;
  let _musicStarted = false;
  let _noise = null;     // buffer de bruit blanc réutilisable

  // ── Initialisation / reprise du contexte (au 1er geste) ─────────────────────
  function init() {
    const resume = () => _ensure();
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((ev) =>
      document.addEventListener(ev, resume, { passive: true }));
    _makeButton();
  }

  function _ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = _muted ? 0 : 0.9;
      master.connect(ctx.destination);

      musicBus = ctx.createGain();
      musicBus.gain.value = 0.0;            // fondu d'entrée
      musicBus.connect(master);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 1.0;
      sfxBus.connect(master);

      // Bruit blanc de 1 s réutilisé par tous les effets
      const len = Math.floor(ctx.sampleRate * 1.0);
      _noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = _noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (!_musicStarted) { _musicStarted = true; _startMusic(); }
    return ctx;
  }

  function _noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = _noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  // ── Musique d'ambiance : nappe sombre évolutive (drone + accords mineurs) ────
  function _startMusic() {
    const now = ctx.currentTime;

    // Filtre passe-bas commun avec LFO lent sur la coupure → mouvement organique
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    lp.Q.value = 4;
    lp.connect(musicBus);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;             // ~20 s par cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    lfo.start();

    // Accords mineurs (Hz) — progression lente et sombre
    const chords = [
      [55.00, 65.41, 82.41],   // Am  (A1, C2, E2)
      [49.00, 58.27, 73.42],   // Gm  (G1, Bb1, D2)
      [43.65, 51.91, 65.41],   // Fm  (F1, Ab1, C2)
      [41.20, 49.00, 61.74],   // Em  (E1, G1, B1)
    ];
    const oscs = [];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = chords[0][i];
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.32;
      // léger désaccord pour de l'épaisseur
      o.detune.value = (i - 1) * 6;
      o.connect(g); g.connect(lp);
      o.start();
      oscs.push(o);
    }

    // Souffle de vent très discret
    const wind = _noiseSource();
    const windLp = ctx.createBiquadFilter();
    windLp.type = 'lowpass'; windLp.frequency.value = 220;
    const windGain = ctx.createGain(); windGain.gain.value = 0.05;
    wind.connect(windLp); windLp.connect(windGain); windGain.connect(musicBus);
    wind.start();

    // Respiration d'amplitude
    const ampLfo = ctx.createOscillator();
    ampLfo.frequency.value = 0.08;
    const ampDepth = ctx.createGain(); ampDepth.gain.value = 0.04;
    const ampBase = musicBus.gain;
    ampLfo.connect(ampDepth); ampDepth.connect(ampBase);
    ampLfo.start();

    // Fondu d'entrée
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(0.0001, now);
    musicBus.gain.linearRampToValueAtTime(0.16, now + 4);

    // Changement d'accord lent
    let ci = 0;
    setInterval(() => {
      if (!ctx) return;
      ci = (ci + 1) % chords.length;
      const t = ctx.currentTime;
      for (let i = 0; i < oscs.length; i++) {
        oscs[i].frequency.cancelScheduledValues(t);
        oscs[i].frequency.setValueAtTime(oscs[i].frequency.value, t);
        oscs[i].frequency.linearRampToValueAtTime(chords[ci][i], t + 6);
      }
    }, 13000);
  }

  // ── Tir d'arme à feu : claquement (bruit filtré) + thump grave ──────────────
  function gunshot(type, vol, pan) {
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

  // ── Grognement de zombie : growl grave + raclement ──────────────────────────
  function zombieGroan(vol, pan) {
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
  function setMuted(m) {
    _muted = m;
    if (master) master.gain.value = m ? 0 : 0.9;
    const btn = document.getElementById('audio-btn');
    if (btn) btn.textContent = m ? '🔇' : '🔊';
  }
  function toggleMute() { setMuted(!_muted); }

  function _makeButton() {
    if (document.getElementById('audio-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'audio-btn';
    btn.title = 'Son';
    btn.textContent = '🔊';
    Object.assign(btn.style, {
      position: 'fixed', top: '10px', right: '10px',
      width: '42px', height: '42px', borderRadius: '10px',
      background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.3)',
      color: '#fff', fontSize: '20px', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '210', cursor: 'pointer', backdropFilter: 'blur(4px)',
    });
    btn.addEventListener('click', (e) => { e.stopPropagation(); _ensure(); toggleMute(); });
    document.body.appendChild(btn);
  }

  window.ZS = window.ZS || {};
  ZS.Audio = { init, gunshot, melee, zombieGroan, setMuted, toggleMute };
}());
