// Main game loop — Three.js setup, FPS movement, shooting
(function () {
  'use strict';

  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = localStorage.getItem('zombie_token');
  if (!token) { window.location.href = '/'; return; }

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    selfId: null,
    player: {
      x: 0, y: 5, z: 0, rotY: 0,
      velocityY: 0,
      onGround: true,
      health: parseInt(localStorage.getItem('zombie_health') || '100'),
      kills:  parseInt(localStorage.getItem('zombie_kills')  || '0'),
      dead: false
    },
    input:  { moveX: 0, moveZ: 0 },
    camera: { yaw: 0, pitch: 0 },
    keys:   {},
    jumpPressed: false,
    lastTime: 0,
    onShoot:   null,
    onRespawn: null,
    onJump:    null
  };

  // Load saved spawn position
  try {
    const sp = JSON.parse(localStorage.getItem('zombie_spawn') || 'null');
    if (sp && sp.x != null && sp.z != null) {
      state.player.x = sp.x;
      state.player.z = sp.z;
      state.camera.yaw = sp.rotY || 0;
    }
  } catch {}

  // ── Three.js ──────────────────────────────────────────────────────────────
  const canvas   = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // ── Build world ───────────────────────────────────────────────────────────
  ZS.buildWorld(scene);
  ZS.Zombies.init(scene);

  // FPS arms attached to camera
  const fpsArms = ZS.createFPSArms();
  camera.add(fpsArms);

  // Raycaster for shooting
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);

  // Position camera at spawn before first render
  state.player.y = ZS.getTerrainHeight(state.player.x, state.player.z) + 1.7;
  camera.position.set(state.player.x, state.player.y, state.player.z);
  camera.rotation.y = state.camera.yaw;

  // ── Socket.io ─────────────────────────────────────────────────────────────
  const socket = io({ auth: { token } });
  ZS.Network.init(socket, scene, state);

  // ── UI ────────────────────────────────────────────────────────────────────
  try { ZS.UI.init(state); } catch (e) { console.error('UI init:', e); }
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setKills(state.player.kills);

  // ── Inventory ─────────────────────────────────────────────────────────────
  ZS.Inventory.init(state, scene, socket);

  // ── Plein écran + orientation paysage ─────────────────────────────────────
  function _enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen)              el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen)   el.webkitRequestFullscreen();
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }
  document.addEventListener('touchstart', _enterFullscreen, { once: true });
  document.addEventListener('click',      _enterFullscreen, { once: true });

  // Auto-fullscreen when rotating to landscape
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      if (screen.orientation.type.startsWith('landscape')) _enterFullscreen();
    });
  } else {
    window.addEventListener('orientationchange', () => {
      if (Math.abs(window.orientation) === 90) _enterFullscreen();
    });
  }

  // ── Input: keyboard ───────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => { state.keys[e.code] = true; });
  document.addEventListener('keyup',   (e) => { state.keys[e.code] = false; });

  // ── Input: desktop pointer lock ───────────────────────────────────────────
  let pointerLocked = false;
  document.addEventListener('click', (e) => {
    if (e.target.closest('#death-screen, #shoot-btn')) return;
    if (!pointerLocked) canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = !!document.pointerLockElement;
  });
  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    state.camera.yaw   -= e.movementX * 0.002;
    state.camera.pitch -= e.movementY * 0.002;
    state.camera.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.camera.pitch));
  });

  // ── Shooting ──────────────────────────────────────────────────────────────
  function shoot() {
    if (state.player.dead) return;
    if (!ZS.Inventory.decrementAmmo()) return; // no weapon or no ammo

    // Muzzle flash
    fpsArms.children[1] && fpsArms.children[1].traverse((c) => {
      if (c.isMesh) {
        const orig = c.material.color.getHex();
        c.material.color.set(0xffff88);
        setTimeout(() => c.material.color.setHex(orig), 60);
      }
    });

    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    ZS.Network.sendShoot(camera.position.x, camera.position.z, dir.x, dir.z);

    if (ZS.Inventory.getWeaponAmmo() === 0) {
      setTimeout(() => ZS.Inventory.reloadWeapon(), 2000);
    }
  }

  state.onShoot = shoot;
  state.onJump  = () => { state.jumpPressed = true; };
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && pointerLocked) shoot();
  });

  // ── Respawn ───────────────────────────────────────────────────────────────
  function respawn() {
    state.player.health    = 100;
    state.player.dead      = false;
    state.player.velocityY = 0;
    state.player.onGround  = true;

    const angle = Math.random() * Math.PI * 2;
    const dist  = 10 + Math.random() * 25;
    state.player.x = Math.cos(angle) * dist;
    state.player.z = Math.sin(angle) * dist;

    ZS.UI.setHealth(100);
    ZS.UI.hideDeath();
    ZS.Inventory.clear(); // efface l'inventaire à la mort
    ZS.Network.sendRespawn();
  }
  state.onRespawn = respawn;

  // ── Game loop ─────────────────────────────────────────────────────────────
  function loop(timestamp) {
    requestAnimationFrame(loop);
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
    state.lastTime = timestamp;

    if (!state.player.dead) {
      updateMovement(dt);
    }
    ZS.tickDayNight(dt);
    ZS.Zombies.tick(dt);
    ZS.Network.tick(dt);
    ZS.Inventory.tick(dt);
    renderer.render(scene, camera);
  }

  requestAnimationFrame((t) => { state.lastTime = t; loop(t); });

  // ── Movement ──────────────────────────────────────────────────────────────
  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up    = new THREE.Vector3(0, 1, 0);

  const PLAYER_R  = 0.45;
  const GRAVITY   = 22;
  const JUMP_V    = 8;

  function updateMovement(dt) {
    const SPEED = 5;
    const keys  = state.keys;

    let mx = state.input.moveX;
    let mz = state.input.moveZ;

    if (keys['KeyW'] || keys['ArrowUp'])    mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    const p = state.player;

    // Horizontal movement
    let newX = p.x + (_fwd.x * (-mz) + _right.x * mx) * SPEED * dt;
    let newZ = p.z + (_fwd.z * (-mz) + _right.z * mx) * SPEED * dt;

    // World bounds
    newX = Math.max(-57, Math.min(57, newX));
    newZ = Math.max(-57, Math.min(57, newZ));

    // Collision with trees and rocks
    const colliders = ZS.getColliders();
    for (const col of colliders) {
      const dx   = newX - col.x;
      const dz   = newZ - col.z;
      const dist = Math.hypot(dx, dz);
      const min  = PLAYER_R + col.r;
      if (dist < min && dist > 0.001) {
        const scale = min / dist;
        newX = col.x + dx * scale;
        newZ = col.z + dz * scale;
      }
    }

    p.x = newX;
    p.z = newZ;

    // Jump
    if (p.onGround && (keys['Space'] || state.jumpPressed)) {
      p.velocityY    = JUMP_V;
      p.onGround     = false;
      state.jumpPressed = false;
    }
    state.jumpPressed = false;

    // Vertical physics
    const groundY = ZS.getTerrainHeight(p.x, p.z) + 1.7;
    if (!p.onGround) {
      p.velocityY -= GRAVITY * dt;
      p.y         += p.velocityY * dt;
      if (p.y <= groundY) {
        p.y        = groundY;
        p.velocityY = 0;
        p.onGround  = true;
      }
    } else {
      p.y = groundY;
    }

    camera.position.set(p.x, p.y, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
}());
