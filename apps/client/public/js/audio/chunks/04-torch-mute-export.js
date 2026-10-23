// Torche + mute + export ZS.Audio — extrait de audio.js (IIFE)
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
    updateBiomeAmbient, tickBeachLife, scatterSeagull, tickHeldTorch, setMuted, toggleMute, isMuted,
  };
