// Tir, zombie, porte, mêlée — extrait de audio.js (IIFE)
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
