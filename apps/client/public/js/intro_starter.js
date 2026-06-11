// Intro plage v3 — narration « Épaves et empreintes ».
(function () {
  'use strict';

  // Sync packages/shared/src/beach-intro-placements.mjs → introRockLookTarget()
  const ROCK_AHEAD = Object.freeze({ dx: -2.6, dz: 0.12 });
  let _rockLook = null;

  const WAKE_LINE = 'Un caillou devant moi… et des traces vers l\'ouest.';
  const BEAT_LINES = Object.freeze({
    footprints: 'Le caillou est là — comme si on voulait qu\'on le trouve en premier.',
    campfire: 'Une torche allumée au milieu des pierres. K. l\'a laissée pour moi.',
    pier: 'Sous les planches… une valise. À fouiller.',
    kit_done: 'De quoi tenir. Et ces initiales : K. — qui c\'est ?',
  });
  const PICKUP_LINES = Object.freeze({
    tool_caillou: 'Caillou en poche. Je suis les traces vers l\'ouest — la torche fume encore.',
    tool_torche: 'Valise sous l\'épave de bois, plus loin à l\'ouest.',
  });
  const SUITCASE_OPEN_LINE = 'De l\'eau, un sandwich… K. a pensé à ceux qui viendraient après.';

  let _bubble = null;
  let _hideT = null;

  function _rockTarget(px, pz) {
    if (_rockLook && Number.isFinite(_rockLook.x) && Number.isFinite(_rockLook.z)) return _rockLook;
    return {
      x: Math.round((px + ROCK_AHEAD.dx) * 10) / 10,
      z: Math.round((pz + ROCK_AHEAD.dz) * 10) / 10,
    };
  }

  function setRockLookTarget(t) {
    _rockLook = (t && Number.isFinite(t.x) && Number.isFinite(t.z)) ? { x: t.x, z: t.z } : null;
  }

  function lookYawFromPlayer(px, pz) {
    const t = _rockTarget(px, pz);
    return Math.atan2(t.x - px, t.z - pz);
  }

  function _ensureBubble() {
    if (_bubble) return _bubble;
    _bubble = document.createElement('div');
    _bubble.id = 'intro-starter-bubble';
    _bubble.style.cssText = [
      'display:none',
      'position:fixed',
      'left:50%',
      'bottom:max(120px,calc(env(safe-area-inset-bottom) + 108px))',
      'transform:translateX(-50%)',
      'max-width:min(92vw,400px)',
      'padding:14px 18px',
      'border-radius:14px',
      'border:2px solid rgba(210,185,130,.7)',
      'background:rgba(16,12,8,.9)',
      'color:#f2e6cc',
      'font:italic 15px/1.5 Georgia,serif',
      'text-align:center',
      'box-shadow:0 10px 32px rgba(0,0,0,.4)',
      'z-index:260',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(_bubble);
    return _bubble;
  }

  function _showLine(line, ms = 5200) {
    if (!line || !ZS.Scenario?.isActive?.()) return;
    const el = _ensureBubble();
    el.textContent = line;
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(_hideT);
    _hideT = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 320);
    }, ms);
  }

  function onWake() {
    _showLine(WAKE_LINE, 6200);
  }

  function onBeat(beat) {
    if (BEAT_LINES[beat]) _showLine(BEAT_LINES[beat]);
  }

  function onPickup(type) {
    if (PICKUP_LINES[type]) _showLine(PICKUP_LINES[type]);
  }

  function onStorageOpen(data) {
    if (data?.prefabId === 'spawn_beach_starter_suitcase' || data?.title === 'Valise échouée') {
      _showLine(SUITCASE_OPEN_LINE, 4800);
    }
  }

  window.ZS = window.ZS || {};
  ZS.IntroStarter = {
    lookYawFromPlayer,
    setRockLookTarget,
    onWake,
    onBeat,
    onPickup,
    onStorageOpen,
  };
}());
