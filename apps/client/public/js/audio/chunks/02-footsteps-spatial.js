// Pas + spatial + eau — extrait de audio.js (IIFE)
  function scatterSeagull(nearness) {
    if (!ctx || _muted) return;
    const v = Math.max(0.15, Math.min(1, nearness || 0.6));
    const t = ctx.currentTime;
    const out = ambientBus || master;
    const f0 = 780 + Math.random() * 180;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.55, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.65, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04 * v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.18);
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
