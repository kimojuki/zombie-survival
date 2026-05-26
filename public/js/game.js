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
      health: parseInt(localStorage.getItem('zombie_health') || '100'),
      kills:  parseInt(localStorage.getItem('zombie_kills')  || '0'),
      ammo: 30, dead: false
    },
    input:  { moveX: 0, moveZ: 0 },
    camera: { yaw: 0, pitch: 0 },
    keys:   {},
    lastTime: 0,
    onShoot:  null,
    onRespawn: null
  };

  // Load saved spawn position
  try {
    const sp = JSON.parse(localStorage.getItem('zombie_spawn') || 'null');
    if (sp) { state.player.x = sp.x; state.player.z = sp.z; state.camera.yaw = sp.rotY || 0; }
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

  // ── Socket.io ─────────────────────────────────────────────────────────────
  const socket = io({ auth: { token } });
  ZS.Network.init(socket, scene, state);

  // ── UI ────────────────────────────────────────────────────────────────────
  ZS.UI.init(state);
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setKills(state.player.kills);

  // ── Input: keyboard ───────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => { state.keys[e.code] = true; });
  document.addEventListener('keyup',   (e) => { state.keys[e.code] = false; });

  // ── Input: desktop pointer lock ───────────────────────────────────────────
  let pointerLocked = false;
  canvas.addEventListener('click', () => {
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
    if (state.player.dead || state.player.ammo <= 0) return;
    state.player.ammo--;
    ZS.UI.setAmmo(state.player.ammo);

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

    if (state.player.ammo === 0) {
      setTimeout(() => { state.player.ammo = 30; ZS.UI.setAmmo(30); }, 2000);
    }
  }

  state.onShoot = shoot;
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && pointerLocked) shoot();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') shoot();
  });

  // ── Respawn ───────────────────────────────────────────────────────────────
  function respawn() {
    state.player.health = 100;
    state.player.dead   = false;
    state.player.x = (Math.random() - 0.5) * 6;
    state.player.z = (Math.random() - 0.5) * 6;
    ZS.UI.setHealth(100);
    ZS.UI.hideDeath();
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
    ZS.Zombies.tick(dt);
    renderer.render(scene, camera);
  }

  requestAnimationFrame((t) => { state.lastTime = t; loop(t); });

  // ── Movement ──────────────────────────────────────────────────────────────
  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up    = new THREE.Vector3(0, 1, 0);

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
    p.x += (_fwd.x * (-mz) + _right.x * mx) * SPEED * dt;
    p.z += (_fwd.z * (-mz) + _right.z * mx) * SPEED * dt;

    // World bounds
    p.x = Math.max(-57, Math.min(57, p.x));
    p.z = Math.max(-57, Math.min(57, p.z));

    // Stick to terrain (eye height = 1.7)
    p.y = ZS.getTerrainHeight(p.x, p.z) + 1.7;

    camera.position.set(p.x, p.y, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
}());
