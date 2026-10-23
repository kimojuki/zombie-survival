// Mode vol admin — noclip, déplacement rapide (V pour basculer).
(function () {
  'use strict';

  const FLY_SPEED = 16;
  const FLY_SPRINT = 2.1;
  const VERT_SPEED = 10;

  let _active = false;

  function _isAdmin() {
    return ZS.AdminHub?.hasPerm?.('decor.edit') || ZS.AdminAuth?.hasPerm?.('decor.edit');
  }

  function isActive() {
    return _active;
  }

  function toggle() {
    if (!_isAdmin()) {
      ZS.UI?.showNotif?.('Mode vol : droits admin requis');
      return false;
    }
    _active = !_active;
    if (_active) {
      ZS.UI?.showNotif?.('Mode vol ON — Espace/Ctrl haut/bas · Shift sprint · V arrêter');
      ZS.requestPointerLock?.();
    } else {
      ZS.UI?.showNotif?.('Mode vol OFF');
    }
    return _active;
  }

  function setActive(on) {
    if (on && !_isAdmin()) return;
    _active = !!on;
  }

  /** @returns {boolean} true si le mouvement vol a été appliqué */
  function applyMovement(dt, state, camera) {
    if (!_active || !state?.player) return false;

    const keys = state.keys;
    let mx = state.input.moveX;
    let mz = state.input.moveZ;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'] || state.input.sprintHeld;
    const speed = FLY_SPEED * (sprint ? FLY_SPRINT : 1);

    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    camera.getWorldDirection(fwd);
    right.crossVectors(fwd, up).normalize();

    const p = state.player;
    p.x += (fwd.x * (-mz) + right.x * mx) * speed * dt;
    p.z += (fwd.z * (-mz) + right.z * mx) * speed * dt;

    let vy = 0;
    if (keys['Space']) vy += 1;
    if (keys['ControlLeft'] || keys['ControlRight']) vy -= 1;
    if (vy) p.y += vy * VERT_SPEED * dt;

    p.velocityY = 0;
    p.onGround = false;
    p.sprinting = !!sprint;
    p.isMoving = len > 0.08 || vy !== 0;
    p.moveSpeed = len * speed;
    p.rotY = state.camera.yaw;

    return true;
  }

  function tryToggleKey(code) {
    if (code !== 'KeyV' || !_isAdmin()) return false;
    if (ZS.AdminHub?.isOpen?.() || ZS.Chat?.isOpen?.()) return false;
    toggle();
    return true;
  }

  window.ZS = window.ZS || {};
  ZS.AdminFly = { isActive, toggle, setActive, applyMovement, tryToggleKey };
}());
