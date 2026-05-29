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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  // Le resize global est géré par _resizeToViewport plus bas (visualViewport).

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

  // ── Viewport sizing — adapte le rendu à la vraie zone visible ───────────────
  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function _resizeToViewport() {
    // visualViewport donne la vraie zone visible (sous la barre Safari sur iOS)
    const vp = window.visualViewport;
    const w  = vp ? vp.width  : window.innerWidth;
    const h  = vp ? vp.height : window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.top    = (vp ? vp.offsetTop  : 0) + 'px';
    canvas.style.left   = (vp ? vp.offsetLeft : 0) + 'px';
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', _resizeToViewport);
    window.visualViewport.addEventListener('scroll', _resizeToViewport);
  }
  window.addEventListener('resize', _resizeToViewport);
  _resizeToViewport();

  // ── Plein écran + orientation paysage ─────────────────────────────────────
  let _fsActive = false;

  function _tryFullscreen() {
    if (_fsActive) return;
    const el = document.documentElement;
    // iOS 16.4+ / Android / desktop
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
    // Orientation (non-iOS)
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }

  // iOS < 16.4 : scroll trick corrigé — doit temporairement autoriser l'overflow
  function _iosScrollHide() {
    if (!_isIOS || window.navigator.standalone || _fsActive) return;
    const body = document.body;
    body.style.overflow = 'scroll';
    body.style.height   = (window.screen.height + 50) + 'px';
    setTimeout(() => {
      window.scrollTo(0, 50);
      setTimeout(() => {
        body.style.overflow = 'hidden';
        body.style.height   = '';
        _resizeToViewport();
      }, 200);
    }, 60);
  }

  document.addEventListener('fullscreenchange', () => {
    _fsActive = !!document.fullscreenElement;
    if (_iosBtn) _iosBtn.style.display = _fsActive ? 'none' : 'flex';
  });
  document.addEventListener('webkitfullscreenchange', () => {
    _fsActive = !!document.webkitFullscreenElement;
    if (_iosBtn) _iosBtn.style.display = _fsActive ? 'none' : 'flex';
  });

  // Bouton ⛶ persistant pour iOS (barre Safari ne peut pas être cachée
  // autrement que via requestFullscreen ou PWA)
  let _iosBtn = null;
  if (_isIOS && !window.navigator.standalone) {
    _iosBtn = document.createElement('button');
    _iosBtn.textContent = '⛶';
    Object.assign(_iosBtn.style, {
      position: 'fixed', bottom: '82px', left: '12px',
      width: '42px', height: '42px', borderRadius: '10px',
      background: 'rgba(0,0,0,0.65)',
      border: '1px solid rgba(255,255,255,0.3)',
      color: '#fff', fontSize: '22px', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '200', cursor: 'pointer',
      backdropFilter: 'blur(4px)',
    });
    document.body.appendChild(_iosBtn);
    _iosBtn.addEventListener('click', () => {
      _tryFullscreen();
      _iosScrollHide();
    });

    // Bannière "Ajouter à l'écran d'accueil" pour plein écran garanti
    const hint = document.createElement('div');
    hint.textContent = '📲 Ajouter à l\'écran d\'accueil pour le vrai plein écran';
    Object.assign(hint.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      background: 'rgba(0,0,0,0.8)', color: '#fff',
      fontSize: '12px', textAlign: 'center', padding: '6px 8px',
      zIndex: '300', pointerEvents: 'none',
    });
    document.body.appendChild(hint);
    setTimeout(() => { hint.style.display = 'none'; }, 5000);
  }

  function _enterFullscreen() {
    _tryFullscreen();
    _iosScrollHide();
  }

  // Retry sur chaque touch (sans { once }) jusqu'à succès
  document.addEventListener('touchstart', _enterFullscreen);
  document.addEventListener('click',      _enterFullscreen);

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
    newX = Math.max(-128, Math.min(128, newX));
    newZ = Math.max(-128, Math.min(128, newZ));

    // Collision avec arbres, rochers, murs — respecte la hauteur pour sauter par-dessus
    const colliders = ZS.getColliders();
    const feetY = p.y - 1.7; // Y des pieds du joueur

    for (const col of colliders) {
      if (col.type === 'box') {
        // Sauter par-dessus si les pieds dépassent le sommet de l'obstacle
        if (col.maxY !== undefined && feetY >= col.maxY - 0.05) continue;
        // Mur d'étage / parapet : solide seulement si les pieds sont assez hauts.
        // La collision est en 2D : sans ça, le collider rebouche la porte du rez juste en dessous.
        if (col.minY !== undefined && feetY < col.minY - 0.05) continue;
        const clampX = Math.max(col.cx - col.hw, Math.min(col.cx + col.hw, newX));
        const clampZ = Math.max(col.cz - col.hd, Math.min(col.cz + col.hd, newZ));
        const dx = newX - clampX;
        const dz = newZ - clampZ;
        const dist = Math.hypot(dx, dz);
        if (dist < PLAYER_R && dist > 0.001) {
          const pen = PLAYER_R - dist;
          newX += (dx / dist) * pen;
          newZ += (dz / dist) * pen;
        }
      } else {
        // Cylindrique (arbres, rochers) — sautable si topY défini
        if (col.topY !== undefined && feetY >= col.topY - 0.05) continue;
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

    // Vertical physics — uses multi-floor height (stairs, 2nd floor)
    const groundY = ZS.getEffectiveFloorHeight(p.x, p.z, p.y) + 1.7;
    if (!p.onGround) {
      p.velocityY -= GRAVITY * dt;
      p.y         += p.velocityY * dt;
      if (p.y <= groundY) {
        p.y         = groundY;
        p.velocityY = 0;
        p.onGround  = true;
      }
    } else {
      if (groundY < p.y - 0.4) {
        // Floor dropped away (stepped off ledge/2nd floor) — start falling
        p.onGround  = false;
        p.velocityY = 0;
      } else {
        p.y = groundY;
      }
    }

    camera.position.set(p.x, p.y, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
}());
