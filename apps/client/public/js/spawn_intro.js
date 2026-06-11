// Scénario d'intro — réveil amnésique sur la plage (première connexion).
(function () {
  'use strict';

  const STAND_MS = 1400;

  const LINES = [
    'Du sable. Des vagues. Aucun souvenir.',
    'L\'océan à l\'est. La forêt… là-bas, à l\'ouest.',
    'Personne en vue.',
  ];

  let _active = false;
  let _phase = 'idle'; // idle | wake | stand
  let _state = null;
  let _overlay = null;
  let _bubble = null;
  let _btn = null;
  let _standT = 0;
  let _saved = null;

  function isActive() {
    return _active;
  }

  function blocksInput() {
    return _active;
  }

  function _groundEyeY(x, z) {
    const base = ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
    return base + 0.32;
  }

  function _standEyeY(x, z) {
    const base = ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0);
    return base + 1.7;
  }

  function _shouldPlay() {
    return ZS.Scenario?.needsWakeIntro?.() === true;
  }

  function _buildUi() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.id = 'spawn-intro-overlay';
    _overlay.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:280',
      'pointer-events:auto',
      'background:linear-gradient(180deg,rgba(8,12,18,.15) 0%,rgba(8,12,18,.55) 100%)',
    ].join(';');

    _bubble = document.createElement('div');
    _bubble.id = 'spawn-intro-bubble';
    _bubble.style.cssText = [
      'pointer-events:auto',
      'position:absolute',
      'left:50%',
      'bottom:max(18px,env(safe-area-inset-bottom))',
      'transform:translateX(-50%)',
      'width:min(92vw,420px)',
      'padding:18px 20px 16px',
      'border-radius:16px',
      'border:2px solid rgba(230,210,160,.75)',
      'background:rgba(18,14,10,.88)',
      'color:#f3e8d0',
      'font:400 15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif',
      'box-shadow:0 12px 40px rgba(0,0,0,.45)',
      'backdrop-filter:blur(6px)',
      '-webkit-backdrop-filter:blur(6px)',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Réveil';
    title.style.cssText = 'font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c9a86a;margin-bottom:10px;';
    _bubble.appendChild(title);

    const body = document.createElement('div');
    body.id = 'spawn-intro-text';
    body.style.cssText = 'margin-bottom:14px;white-space:pre-line;';
    body.textContent = LINES.join('\n\n');
    _bubble.appendChild(body);

    _btn = document.createElement('button');
    _btn.type = 'button';
    _btn.textContent = 'Se relever';
    _btn.style.cssText = [
      'display:block',
      'width:100%',
      'min-height:48px',
      'border:none',
      'border-radius:10px',
      'background:linear-gradient(180deg,#8a6840,#6a5030)',
      'color:#fff8e8',
      'font:bold 16px system-ui,sans-serif',
      'cursor:pointer',
      'touch-action:manipulation',
      'box-shadow:0 4px 14px rgba(0,0,0,.35)',
    ].join(';');
    _btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _beginStand();
    });
    _btn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
    _bubble.appendChild(_btn);

    _overlay.appendChild(_bubble);
    document.body.appendChild(_overlay);
  }

  function _applyWakeView() {
    const cam = ZS._camera;
    const fps = ZS._fpsArms;
    if (!cam || !_state) return;
    const p = _state.player;
    _saved = {
      pitch: _state.camera.pitch,
      yaw: _state.camera.yaw,
      y: p.y,
      fpsVisible: fps ? fps.visible : true,
    };
    _state.camera.pitch = 0.58;
    p.y = _groundEyeY(p.x, p.z);
    cam.position.set(p.x, p.y, p.z);
    cam.rotation.x = _state.camera.pitch;
    cam.rotation.y = _state.camera.yaw;
    if (fps) fps.visible = false;
    ZS.clearMovementKeys?.();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function _beginStand() {
    if (_phase !== 'wake') return;
    _phase = 'stand';
    _standT = 0;
    if (_bubble) _bubble.style.opacity = '0.35';
    if (_btn) _btn.disabled = true;
    ZS.Scenario?.advance?.('intro_stand');
  }

  function _finish() {
    _active = false;
    _phase = 'idle';
    if (_overlay) _overlay.style.display = 'none';
    document.body.classList.remove('spawn-intro-active');
    if (_bubble) _bubble.style.opacity = '1';
    if (_btn) _btn.disabled = false;
    const fps = ZS._fpsArms;
    if (fps && _saved) fps.visible = _saved.fpsVisible !== false;
    ZS.shortcutsBlocked = null;
    if (ZS.onUiPanelClose) ZS.onUiPanelClose();
    ZS.IntroStarter?.onWake?.();
    ZS.Scenario?.advance?.('breathe');
  }

  function tryStart(state) {
    if (_active || !_shouldPlay()) return false;
    if (!state?.player || state.player.dead) return false;
    _state = state;
    _buildUi();
    _active = true;
    _phase = 'wake';
    _applyWakeView();
    _overlay.style.display = 'block';
    document.body.classList.add('spawn-intro-active');
    ZS.shortcutsBlocked = () => true;
    return true;
  }

  function tick(dt) {
    if (!_active || _phase !== 'stand' || !_state) return;
    const cam = ZS._camera;
    if (!cam) return;
    _standT += dt;
    const t = Math.min(1, _standT / (STAND_MS / 1000));
    const ease = t * t * (3 - 2 * t);
    const p = _state.player;
    const eyeLo = _groundEyeY(p.x, p.z);
    const eyeHi = _standEyeY(p.x, p.z);
    p.y = eyeLo + (eyeHi - eyeLo) * ease;
    _state.camera.pitch = 0.58 + (0 - 0.58) * ease;
    if (_saved && ZS.IntroStarter?.lookYawFromPlayer) {
      const lookT = Math.max(0, (t - 0.25) / 0.75);
      const lookEase = lookT * lookT * (3 - 2 * lookT);
      const targetYaw = ZS.IntroStarter.lookYawFromPlayer(p.x, p.z);
      let delta = targetYaw - _saved.yaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      _state.camera.yaw = _saved.yaw + delta * lookEase;
    }
    cam.position.set(p.x, p.y, p.z);
    cam.rotation.x = _state.camera.pitch;
    cam.rotation.y = _state.camera.yaw;
    if (t >= 1) _finish();
  }

  window.ZS = window.ZS || {};
  ZS.SpawnIntro = {
    tryStart,
    tick,
    isActive,
    blocksInput,
  };
}());
