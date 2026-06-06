// Main game loop — Three.js setup, FPS movement, shooting
(async function () {
  'use strict';

  function _clearAuthSession() {
    ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_spawn', 'zombie_health', 'zombie_kills']
      .forEach((k) => localStorage.removeItem(k));
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = localStorage.getItem('zombie_token');
  if (!token) { window.location.href = '/'; return; }

  try {
    const authRes = await fetch('/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!authRes.ok) {
      _clearAuthSession();
      window.location.href = '/';
      return;
    }
  } catch {
    // Tunnel/serveur en cours de démarrage — on laisse Socket.io retenter.
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    selfId: null,
    player: {
      x: 0.4, y: 5, z: 7, rotY: 0,
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

  // TEST — spawn forcé sur Small Town (S02)
  // Load saved spawn position
  // try {
  //   const sp = JSON.parse(localStorage.getItem('zombie_spawn') || 'null');
  //   if (sp && sp.x != null && sp.z != null) {
  //     state.player.x = sp.x;
  //     state.player.z = sp.z;
  //     state.camera.yaw = sp.rotY || 0;
  //   }
  // } catch {}

  // ── Three.js ──────────────────────────────────────────────────────────────
  const canvas   = document.getElementById('game-canvas');
  function _detectMobile() {
    const ua = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    // PC avec écran tactile : pointer fine + large → mode souris/clavier
    return ua || (coarse && narrow);
  }
  const _isMobile = _detectMobile();
  document.body.classList.add(_isMobile ? 'mode-mobile' : 'mode-desktop');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  // Pixel ratio plafonné : énorme gain mobile (moins de fragments → moins de chauffe).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, _isMobile ? 1.25 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;     // moins cher que PCFSoft
  renderer.shadowMap.autoUpdate = false;            // ombres mises à jour par intermittence
  renderer.shadowMap.needsUpdate = true;
  ZS._isMobile = _isMobile;

  const scene  = new THREE.Scene();
  // Distance de rendu réduite (le brouillard masque la coupe) → moins de draw calls.
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 175);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  ZS._camera = camera;   // référence pour l'audio spatial (panoramique/distance)

  // Le resize global est géré par _resizeToViewport plus bas (visualViewport).

  // ── Overlay eau ───────────────────────────────────────────────────────────
  const _waterOverlay = document.createElement('div');
  Object.assign(_waterOverlay.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '40',
    background: 'linear-gradient(to top, rgba(10,60,140,0.55) 0%, rgba(10,60,140,0.18) 40%, transparent 70%)',
    opacity: '0', transition: 'opacity 0.35s ease',
  });
  document.body.appendChild(_waterOverlay);
  let _inWater = false;
  let _waterDepth = 0;

  function _updateWaterEffect(px, pz, py) {
    const waterY = ZS.getWaterSurface(px, pz);
    const feetY = (py || 0) - 1.7;
    const nowIn  = waterY !== null && waterY > feetY - 0.05;
    _waterDepth = nowIn ? Math.max(0, waterY - feetY) : 0;
    if (nowIn === _inWater) return;
    _inWater = nowIn;
    _waterOverlay.style.opacity = nowIn ? '1' : '0';
    state.player.inWater = nowIn;
    ZS.Survival?.setWaterContact?.(nowIn);
  }

  // ── Build world ───────────────────────────────────────────────────────────
  const _tWorld = performance.now();
  ZS.buildWorld(scene);
  console.log('[world] build', Math.round(performance.now() - _tWorld), 'ms');

  // Lumières ponctuelles — collectées une fois (évite scene.traverse chaque frame)
  const _pointLights = [];
  scene.traverse((o) => { if (o.isPointLight) _pointLights.push(o); });
  ZS.Zombies.init(scene);

  // Local proxy rig (invisible) + viewmodel FPS sur camera.
  const localAvatar = ZS.createPlayerModel({ local: true });
  localAvatar.visible = false;
  scene.add(localAvatar);
  ZS._localAvatar = localAvatar;
  const fpsArms = ZS.createFPSArms();
  camera.add(fpsArms);
  fpsArms.position.set(-0.05, -0.03, -0.04);
  ZS._fpsArms = fpsArms;
  // Expose globally pour que l'inventaire puisse changer l'item en main.
  // On diffuse aussi l'item équipé pour que les autres joueurs le voient.
  ZS.setHandItem = (type) => {
    ZS.updateHandItem(fpsArms, type);
    ZS.Network.sendEquip(type || null);
  };

  // Raycaster for shooting
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);
  const _camWorld = new THREE.Vector3();
  function _cameraWorldPos() {
    return camera.getWorldPosition(_camWorld);
  }

  // Position camera at spawn before first render
  state.player.y = (ZS.getDecorGroundHeight
    ? ZS.getDecorGroundHeight(state.player.x, state.player.z)
    : ZS.getTerrainHeight(state.player.x, state.player.z)) + 1.7;
  localAvatar.position.set(state.player.x, state.player.y - 1.7, state.player.z);
  localAvatar.rotation.y = state.camera.yaw;
  camera.position.set(state.player.x, state.player.y, state.player.z);
  camera.rotation.y = state.camera.yaw;
  camera.rotation.x = state.camera.pitch;

  // ── Socket.io ─────────────────────────────────────────────────────────────
  const socket = io({
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
  });
  ZS.Network.init(socket, scene, state);

  // Transmet la géométrie de collision au serveur (physique des zombies côté serveur)
  socket.emit('world-colliders', ZS.getColliders());
  socket.emit('world-water-zones', ZS.getWaterZones());

  // Transmet l'empreinte des bâtiments lootables → le serveur génère le loot (items.md)
  socket.emit('loot-buildings', ZS.Buildings.getLootBuildings());

  // ── UI ────────────────────────────────────────────────────────────────────
  try { ZS.UI.init(state); } catch (e) { console.error('UI init:', e); }
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setKills(state.player.kills);

  // ── Survival ──────────────────────────────────────────────────────────────
  ZS.Survival.init(state);

  // ── Inventory ─────────────────────────────────────────────────────────────
  ZS.Inventory.init(state, scene, socket);
  ZS.SleepLoot?.init?.(state);
  ZS.Map.init(state, scene);
  ZS.Craft.init();
  ZS.Audio.init();
  if (ZS.Chat) ZS.Chat.init(socket);
  _initMenu();
  _addTestItems();

  // ── Menu (☰) : audio on/off + déconnexion ───────────────────────────────────
  async function _syncAdminMenu() {
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('zombie_is_admin', data.isAdmin ? '1' : '0');
        if (data.username) localStorage.setItem('zombie_username', data.username);
      }
    } catch { /* hors ligne */ }
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
  }

  function _initMenu() {
    const btn     = document.getElementById('menu-btn');
    const panel   = document.getElementById('menu-panel');
    const audio   = document.getElementById('menu-audio');
    const out     = document.getElementById('menu-logout');
    const consoleBtn = document.getElementById('menu-console');
    if (!btn || !panel) return;

    const setOpen = (open) => { panel.style.display = open ? 'flex' : 'none'; };

    if (consoleBtn) {
      consoleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(false);
        if (ZS.Rcon?.open) ZS.Rcon.open();
      });
    }

    _syncAdminMenu();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      setOpen(panel.style.display === 'none');
    });
    // Clic en dehors du menu → fermeture
    document.addEventListener('click', (e) => {
      if (panel.style.display !== 'none' &&
          !panel.contains(e.target) && e.target !== btn) setOpen(false);
    });
    if (audio) audio.addEventListener('click', () => {
      // Pas de stopPropagation : laisse audio.js démarrer le contexte sur ce geste.
      ZS.Audio.toggleMute();   // met aussi à jour le libellé du bouton
    });
    if (out) out.addEventListener('click', (e) => {
      e.stopPropagation();
      ZS.logout();
    });
  }

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

  // Retry plein écran — mobile uniquement (évite de voler le premier clic PC)
  if (_isMobile) {
    document.addEventListener('touchstart', _enterFullscreen);
    document.addEventListener('click', _enterFullscreen);
  }

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
  function _rconTyping(e) {
    const t = e.target;
    return t && (t.id === 'rcon-input' || t.closest?.('#rcon-panel'));
  }

  document.addEventListener('keydown', (e) => {
    if (ZS.Chat?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.()) {
      if (_rconTyping(e)) return;
      if (e.code === 'Backquote' || e.code === 'F2' || e.code === 'Escape') {
        if (ZS.Rcon) { e.preventDefault(); ZS.Rcon.toggle(); }
      }
      return;
    }
    if (e.code === 'Backquote' || e.code === 'F2') {
      if (ZS.Rcon?.isAdmin?.()) {
        e.preventDefault();
        ZS.Rcon.toggle();
      }
      return;
    }
    if (e.code === 'KeyE') {
      if (_interactWorld()) e.preventDefault();
      return;
    }
    state.keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    if (ZS.Chat?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.() || _rconTyping(e)) return;
    state.keys[e.code] = false;
  });

  // ── Input: desktop pointer lock ───────────────────────────────────────────
  let pointerLocked = false;

  function _blocksPointerLock(el) {
    if (!el || el === canvas) return false;
    return !!el.closest?.(
      '#menu-panel, #menu-btn, #inv-panel, #craft-panel, #map-overlay, #death-screen, '
      + '#connecting-screen, #rcon-panel, #chat-wrap, #hotbar, #craft-btn, #inv-btn, #map-btn, #chat-btn, '
      + '#build-ctl, button, a, input, textarea, select, [contenteditable]'
    );
  }

  function _syncPointerLockUi() {
    pointerLocked = document.pointerLockElement === canvas;
    document.body.classList.toggle('pointer-locked', pointerLocked);
    if (canvas) canvas.style.cursor = pointerLocked ? 'none' : 'crosshair';
  }

  function _requestPointerLock() {
    if (_isMobile || pointerLocked) return;
    if (ZS.Rcon?.isOpen?.()) return;
    if (ZS.Chat?.isOpen?.() || document.body.classList.contains('chat-open')) return;
    const conn = document.getElementById('connecting-screen');
    if (conn && conn.style.display === 'flex') return;
    canvas.requestPointerLock();
  }

  if (!_isMobile) {
    document.addEventListener('mousedown', (e) => {
      if (pointerLocked) return;
      if (e.button !== 0) return;
      if (ZS.Rcon?.isOpen?.()) return;
      if (_blocksPointerLock(e.target)) return;
      _requestPointerLock();
    }, true);
  } else {
    document.addEventListener('click', (e) => {
      if (pointerLocked) return;
      if (ZS.Rcon?.isOpen?.()) return;
      if (e.target.closest?.('#rcon-panel')) return;
      if (e.target !== canvas && e.target !== document.body) return;
      canvas.requestPointerLock();
    });
  }

  document.addEventListener('pointerlockchange', _syncPointerLockUi);
  document.addEventListener('pointerlockerror', () => {
    console.warn('[input] pointer lock refusé');
    _syncPointerLockUi();
  });
  _syncPointerLockUi();
  ZS.requestPointerLock = _requestPointerLock;

  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    state.camera.yaw   -= e.movementX * 0.002;
    state.camera.pitch -= e.movementY * 0.002;
    state.camera.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.camera.pitch));
  });

  // ── Combat : tir, mêlée, abattage d'arbres ─────────────────────────────────
  const FIRE_INTERVAL = {
    wpn_pistolet: 0.28, pistol: 0.28, wpn_fusil_pompe: 0.85, wpn_fusil_chasse: 1.10,
  };
  let _lastAttack  = 0;     // s — dernière attaque
  let _reloadUntil = 0;     // s — fin du rechargement en cours
  const _now = () => performance.now() / 1000;

  function _muzzleFlash() {
    const holder = fpsArms.getObjectByName('itemHolder');
    ZS.muzzleFlash(holder);
  }

  function _sendShot(baseDir, disp, dmg, range, radius) {
    const dx = baseDir.x + (Math.random() - 0.5) * disp;
    const dz = baseDir.z + (Math.random() - 0.5) * disp;
    const cam = _cameraWorldPos();
    ZS.Network.sendShoot(cam.x, cam.z, dx, dz, dmg, range, radius);
  }

  function _startReload(def) {
    if (_now() < _reloadUntil) return;
    if (ZS.isArmAnimActive?.(fpsArms)) return;
    if (ZS.Inventory.getWeaponAmmo() >= (def.capacite_chargeur || 12)) return;
    if (ZS.Inventory.countItem(def.type_munition_accepte) <= 0) { ZS.UI.showNotif('Pas de munitions'); return; }
    const t = def.temps_rechargement || 2;
    _reloadUntil = _now() + t;
    ZS.UI.showNotif('Rechargement…');
    const item = ZS.Inventory.getActiveItem();
    if (item) ZS.triggerArmAnim(fpsArms, 'reload', item.type, { dur: t });
    setTimeout(() => ZS.Inventory.reloadWeapon(), t * 1000);
  }

  function _fireGun(item, def) {
    const n = _now();
    if (n < _reloadUntil) return;
    if (n - _lastAttack < (FIRE_INTERVAL[item.type] || 0.3)) return;
    if ((item.ammo || 0) <= 0) {
      if (ZS.Inventory.countItem(def.type_munition_accepte) > 0) _startReload(def);
      else ZS.UI.showNotif('Pas de munitions');
      return;
    }
    _lastAttack = n;
    ZS.Inventory.decrementAmmo();
    _muzzleFlash();
    ZS.Audio.gunshot(item.type);
    _playSwing('recoil', item.type);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction.clone();
    const disp = def.dispersion_balle || 0.05;
    if (item.type === 'wpn_fusil_pompe') {
      for (let i = 0; i < 8; i++) _sendShot(dir, Math.max(disp, 0.25), def.degats_par_balle || 12, 40, 0.9);
    } else {
      _sendShot(dir, disp, def.degats_par_balle || 25, 90, 0.8);
    }
    if ((item.ammo || 0) <= 0 && ZS.Inventory.countItem(def.type_munition_accepte) > 0) _startReload(def);
  }

  // Coup de poing à mains nues (aucune arme en main)
  const FIST = { degats_impact: 8, portee_metre: 1.6, cadence_attaque: 0.5 };
  function _hitStorageWithMelee(cam, dir, range) {
    const hit = ZS.hitDecorStorage?.(cam.x, cam.z, dir.x, dir.z, Math.max(range + 1.4, 3.2));
    if (!hit?.decorId) return false;
    ZS.Audio.chopWood?.(0.85);
    ZS.Network.requestStorageHit?.(hit.decorId);
    return true;
  }

  function _fistPunch() {
    const n = _now();
    if (n - _lastAttack < FIST.cadence_attaque) return;
    _lastAttack = n;
    _playSwing('punch', null);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const cam = _cameraWorldPos();
    const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
    ZS.Audio.melee(hitDist < FIST.portee_metre + 0.8 ? 0.9 : 0.4);
    _hitStorageWithMelee(cam, dir, FIST.portee_metre);
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z,
                         FIST.degats_impact, FIST.portee_metre, 1.4, 0.5);
  }

  function _canHarvestWood(type, def) {
    if (!def) return false;
    if (type === 'wpn_hache_combat' || type === 'tool_hachette' || type === 'tool_hache_pierre') return true;
    return def.type_recolte === 'Bois' && def.degats_impact > 0;
  }

  function _canHarvestStone(type, def) {
    if (type === 'tool_caillou') return true;
    if (type === 'tool_pioche_pierre' || type === 'tool_pioche') return true;
    if (type === 'tool_hache_pierre') return true;
    return def?.type_recolte === 'Pierre' && def.degats_impact > 0;
  }

  function _chopWoodYield(type, def) {
    if (type === 'tool_hachette') return 2;
    if (type === 'tool_hache_pierre') return 2;
    if (type === 'wpn_hache_combat') return 1;
    if (type === 'tool_caillou') return 1;
    return Math.max(1, Math.floor((def?.efficacite_recolte || 1) * 0.8));
  }

  function _mineStoneYield(type, def) {
    if (type === 'tool_caillou') return 1;
    if (type === 'tool_pioche_pierre' || type === 'tool_pioche') return 3;
    if (type === 'tool_hache_pierre') return 1;
    return Math.max(1, Math.floor((def?.efficacite_recolte || 1) * 0.6));
  }

  function _meleeSwing(item, def) {
    const n = _now();
    if (n - _lastAttack < (def.cadence_attaque || 0.5)) return;
    _lastAttack = n;
    _playSwing('melee', item.type);

    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const range = def.portee_metre || 1.2;
    const cam = _cameraWorldPos();
    const harvestRange = Math.max(range + 1.2, 2.4);
    let harvested = false;

    // Récolter de la pierre sur un rocher devant soi
    if (_canHarvestStone(item.type, def) && ZS.mineRock) {
      const mine = ZS.mineRock(
        cam.x, cam.z, dir.x, dir.z,
        harvestRange,
        _mineStoneYield(item.type, def),
      );
      if (mine?.hit) {
        harvested = true;
        ZS.Audio.chopWood(0.95);
        if (mine.stoneTaken > 0) {
          ZS.Inventory.addItem('res_pierre', mine.stoneTaken);
          ZS.UI.showNotif('+' + mine.stoneTaken + ' Pierre');
        }
        if (mine.depleted) ZS.UI.showNotif('Rocher épuisé');
        if (mine.decorId) {
          ZS.Network.notifyDecorMine(mine.decorId, mine.stoneTaken);
        }
      }
    }

    // Outils / armes : récolter du bois sur un arbre devant soi
    if (!harvested && _canHarvestWood(item.type, def) && ZS.chopTree) {
      const chop = ZS.chopTree(
        cam.x, cam.z, dir.x, dir.z,
        harvestRange,
        _chopWoodYield(item.type, def),
      );
      if (chop?.hit) {
        harvested = true;
        ZS.Audio.chopWood(1.0);
        if (chop.woodTaken > 0) {
          ZS.Inventory.addItem('res_bois_brut', chop.woodTaken);
          ZS.UI.showNotif('+' + chop.woodTaken + ' Bois brut');
        }
        if (chop.felled) ZS.UI.showNotif('Arbre abattu');
        if (chop.decorId) {
          ZS.Network.notifyDecorChop(chop.decorId, chop.woodTaken, dir.x, dir.z);
        }
      }
    }

    if (!harvested) {
      const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
      ZS.Audio.melee(hitDist < range + 0.8 ? 1.0 : 0.45);
    }
    _hitStorageWithMelee(cam, dir, range);

    // Frappe les zombies dans la portée (rayon latéral large = coup de mêlée balayant)
    // + recul : un coup au corps à corps repousse le zombie en arrière.
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z, def.degats_impact || 10, range, 1.6, def.recul_metre || 1.2);
    ZS.Inventory.wearActiveWeapon();
  }

  function _useHeldItem() {
    const item = ZS.Inventory.getActiveItem();
    if (!item) return false;
    const def = ZS.ITEMS[item.type];
    if (!def) return false;
    if (def.category === 'food' || def.category === 'medical') {
      if (ZS.Survival.useItem(item.type)) {
        const dur = (ZS.getGrip(item.type)?.anim?.use?.dur)
          ?? (def.category === 'medical' ? (def.temps_utilisation || 1.5) : 0.5);
        ZS.triggerArmAnim(fpsArms, 'use', item.type, { dur });
      }
      return true;
    }
    if (def.category === 'ammo') {
      ZS.Inventory.reloadWeapon();
      return true;
    }
    return false;
  }

  function attack() {
    if (state.player.dead) return;
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (def && def.category === 'structure') {
      ZS.Inventory.placeActiveStructure?.();
      return;
    }
    if (def && (def.category === 'food' || def.category === 'medical' || def.category === 'ammo')) {
      _useHeldItem();
      return;
    }
    if (def && def.category === 'firearm') { _fireGun(item, def); return; }
    if (def && def.category === 'melee')   { _meleeSwing(item, def); return; }
    // Outils offensifs (hachette, marteau, pioche…) → frappent aussi les zombies
    if (def && def.category === 'tool' && def.degats_impact) { _meleeSwing(item, def); return; }
    if (!def) _fistPunch();   // mains vides → coup de poing
  }

  function _placeHeldStructure() {
    if (state.player.dead) return false;
    const item = ZS.Inventory.getActiveItem();
    const def = item ? ZS.ITEMS[item.type] : null;
    if (!def || def.category !== 'structure') return false;
    return !!ZS.Inventory.placeActiveStructure?.();
  }

  function _playSwing(kind, type) {
    ZS.triggerArmAnim(fpsArms, kind, type);
    ZS.Network.sendAttack(kind === 'punch' ? 'melee' : kind);
  }

  let _doorBtn = null;
  let _nearDoor = null;
  let _nearStorage = null;

  function _ensureDoorButton() {
    if (_doorBtn) return _doorBtn;
    _doorBtn = document.createElement('button');
    _doorBtn.id = 'door-interact-btn';
    _doorBtn.type = 'button';
    _doorBtn.style.cssText = [
      'display:none',
      'position:fixed',
      'right:92px',
      'bottom:132px',
      'z-index:120',
      'min-width:96px',
      'min-height:42px',
      'border:2px solid rgba(230,210,150,.85)',
      'border-radius:10px',
      'background:rgba(25,18,10,.78)',
      'color:#f3e3b0',
      'font:bold 13px system-ui,sans-serif',
      'box-shadow:0 4px 14px rgba(0,0,0,.35)',
      'touch-action:manipulation',
    ].join(';');
    const fire = (e) => {
      if (e) e.preventDefault();
      _interactWorld();
    };
    _doorBtn.addEventListener('click', fire);
    _doorBtn.addEventListener('touchstart', fire, { passive: false });
    document.body.appendChild(_doorBtn);
    return _doorBtn;
  }

  const StorageUI = (() => {
    let panel = null;
    let backdrop = null;
    let state = { id: null, items: [], capacity: 0 };

    function _ensurePanel() {
      if (panel) return;
      backdrop = document.createElement('div');
      backdrop.style.cssText = 'display:none;position:fixed;inset:0;z-index:469;background:rgba(0,0,0,.28)';
      backdrop.addEventListener('click', close);
      document.body.appendChild(backdrop);

      panel = document.createElement('div');
      panel.id = 'storage-panel';
      panel.style.cssText = [
        'display:none',
        'position:fixed',
        'top:50%',
        'left:50%',
        'transform:translate(-50%,-50%)',
        'z-index:470',
        'width:min(438px,96vw)',
        'max-height:82vh',
        'overflow:auto',
        'background:#c6c6c6',
        'border:4px solid',
        'border-color:#f6f6f6 #555 #555 #f6f6f6',
        'border-radius:4px',
        'padding:12px 14px 14px',
        'color:#303030',
        'font:13px monospace',
        'box-shadow:0 6px 28px rgba(0,0,0,.55)',
      ].join(';');
      document.body.appendChild(panel);
    }

    function _itemLabel(stack) {
      const def = ZS.ITEMS?.[stack.type];
      return `${def?.icon || '□'} ${def?.label || stack.type} x${stack.qty || 1}`;
    }

    function _makeSlot(stack, onClick) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.title = stack?.type ? _itemLabel(stack) : '';
      slot.style.cssText = [
        'position:relative',
        'width:40px',
        'height:40px',
        'padding:0',
        'border:2px solid',
        'border-color:#595959 #f5f5f5 #f5f5f5 #595959',
        'background:#8b8b8b',
        'box-shadow:inset 2px 2px 0 rgba(0,0,0,.35), inset -2px -2px 0 rgba(255,255,255,.35)',
        'font:20px monospace',
        'color:#fff',
        'cursor:pointer',
        'touch-action:manipulation',
      ].join(';');
      if (stack?.type) {
        const icon = document.createElement('span');
        icon.textContent = ZS.ITEMS?.[stack.type]?.icon || '?';
        icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px';
        const count = document.createElement('span');
        count.textContent = (stack.qty || 1) > 1 ? String(stack.qty || 1) : '';
        count.style.cssText = 'position:absolute;right:3px;bottom:1px;font:bold 11px monospace;color:#fff;text-shadow:1px 1px 0 #000';
        slot.appendChild(icon);
        slot.appendChild(count);
      } else {
        slot.disabled = true;
        slot.style.cursor = 'default';
      }
      if (stack?.type && onClick) slot.addEventListener('click', onClick);
      return slot;
    }

    function _makeGrid() {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(9,40px);gap:4px;width:max-content;max-width:100%;';
      return grid;
    }

    function _sectionTitle(text) {
      const h = document.createElement('div');
      h.textContent = text;
      h.style.cssText = 'margin:10px 0 4px;color:#3b3b3b;font:16px monospace;text-shadow:1px 1px 0 #eee';
      return h;
    }

    function render() {
      _ensurePanel();
      panel.replaceChildren();

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'x';
      closeBtn.style.cssText = 'position:absolute;right:8px;top:6px;width:24px;height:24px;border:2px solid #555;background:#d6d6d6;color:#222;cursor:pointer';
      closeBtn.addEventListener('click', close);
      panel.appendChild(closeBtn);

      panel.appendChild(_sectionTitle(`Chest (${state.items.length}/${state.capacity})`));
      const chestGrid = _makeGrid();
      for (let i = 0; i < state.capacity; i++) {
        const stack = state.items[i] || null;
        chestGrid.appendChild(_makeSlot(stack, () => {
          if (!ZS.Inventory?.canAddStack?.(stack.type, stack.qty || 1)) {
            ZS.UI?.showNotif?.('Inventaire plein');
            return;
          }
          ZS.Network.requestStorageWithdraw(state.id, i);
        }));
      }
      panel.appendChild(chestGrid);

      panel.appendChild(_sectionTitle('Inventory'));
      const invSlots = ZS.Inventory?.getStorageSlots?.() || [];
      const bagSlots = invSlots.filter((s) => s.zone === 'bag');
      const hotbarSlots = invSlots.filter((s) => s.zone === 'hotbar');
      const invGrid = _makeGrid();
      const paddedBag = [...bagSlots, ...Array(Math.max(0, 27 - bagSlots.length)).fill(null)];
      for (const slot of paddedBag) {
        invGrid.appendChild(_makeSlot(slot, () => {
          if (state.items.length >= state.capacity) {
            ZS.UI?.showNotif?.('Coffre plein');
            return;
          }
          const removed = ZS.Inventory.removeStack(slot.zone, slot.idx, slot.qty);
          if (!removed) return;
          ZS.Network.requestStorageDeposit(state.id, removed);
        }));
      }
      panel.appendChild(invGrid);

      const hotbarGrid = _makeGrid();
      const paddedHotbar = [...hotbarSlots, ...Array(Math.max(0, 9 - hotbarSlots.length)).fill(null)];
      for (const slot of paddedHotbar) {
        hotbarGrid.appendChild(_makeSlot(slot, () => {
          if (state.items.length >= state.capacity) {
            ZS.UI?.showNotif?.('Coffre plein');
            return;
          }
          const removed = ZS.Inventory.removeStack(slot.zone, slot.idx, slot.qty);
          if (!removed) return;
          ZS.Network.requestStorageDeposit(state.id, removed);
        }));
      }
      panel.appendChild(hotbarGrid);
    }

    function open(data) {
      state = {
        id: data?.id || null,
        items: Array.isArray(data?.items) ? data.items : [],
        capacity: data?.capacity || 18,
      };
      if (state.id) ZS.setDecorStorageState?.(state.id, true);
      _ensurePanel();
      backdrop.style.display = 'block';
      panel.style.display = 'block';
      render();
    }

    function update(data) {
      if (!panel || panel.style.display === 'none') return;
      if (!data || data.id !== state.id) return;
      state.items = Array.isArray(data.items) ? data.items : [];
      state.capacity = data.capacity || state.capacity;
      render();
    }

    function close() {
      if (state.id) ZS.setDecorStorageState?.(state.id, false);
      if (state.id) ZS.Network?.requestStorageClose?.(state.id);
      if (panel) panel.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
    }

    function closeIf(decorId) {
      if (decorId && decorId === state.id) close();
    }

    return { open, update, close, closeIf };
  })();
  window.ZS = window.ZS || {};
  ZS.StorageUI = StorageUI;

  function _interactDoor() {
    const storage = ZS.findNearestDecorStorage?.(state.player.x, state.player.z, 2.8);
    if (storage) {
      ZS.setDecorStorageState?.(storage.decorId, true);
      ZS.Network.requestStorageOpen(storage.decorId);
      return true;
    }
    const door = ZS.findNearestDecorDoor?.(state.player.x, state.player.z, 3.2);
    if (!door) return false;
    ZS.setDecorDoorState?.(door.decorId, !door.open);
    ZS.Network.requestDecorDoorToggle(door.decorId);
    return true;
  }

  function _interactWorld() {
    if (_interactDoor()) return true;
    return ZS.SleepLoot?.tryInteract?.() || false;
  }

  function _updateDoorInteractUi() {
    const storage = ZS.findNearestDecorStorage?.(state.player.x, state.player.z, 2.8) || null;
    const door = ZS.findNearestDecorDoor?.(state.player.x, state.player.z, 3.2) || null;
    const sleeper = (!storage && !door && !state.player.dead)
      ? ZS.SleepLoot?.getNearestForUi?.(state.player.x, state.player.z) : null;
    if (!storage && !door && !sleeper && !_nearDoor && !_nearStorage) return;
    _nearStorage = storage;
    _nearDoor = door;
    const btn = _ensureDoorButton();
    if ((!storage && !door && !sleeper) || state.player.dead || ZS.Rcon?.isOpen?.() || ZS.Chat?.isOpen?.() || ZS.SleepLoot?.isOpen?.()) {
      btn.style.display = 'none';
      return;
    }
    const mobile = document.body.classList.contains('mode-mobile');
    let label;
    if (storage) label = 'Coffre';
    else if (door) label = door.open ? 'Fermer' : 'Ouvrir';
    else label = 'Fouiller';
    btn.textContent = mobile ? label : `E — ${label}`;
    btn.style.display = 'block';
    btn.style.right = mobile ? '92px' : '24px';
    btn.style.bottom = mobile ? '132px' : '96px';
  }

  state.onShoot  = attack;
  state.onReload = () => {
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (def && def.category === 'firearm') _startReload(def);
  };
  state.onJump   = () => { state.jumpPressed = true; };
  document.addEventListener('mousedown', (e) => {
    if (!pointerLocked) return;
    if (_blocksPointerLock(e.target)) return;
    if (e.button === 2) {
      if (_placeHeldStructure()) e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    attack();
  });
  document.addEventListener('contextmenu', (e) => {
    if (!pointerLocked) return;
    const item = ZS.Inventory.getActiveItem();
    const def = item ? ZS.ITEMS[item.type] : null;
    if (def?.category === 'structure') e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && state.onReload) state.onReload();
  });

  // ── Respawn ───────────────────────────────────────────────────────────────
  function respawn() {
    state.player.health    = 100;
    state.player.dead      = false;
    state.player.velocityY = 0;
    state.player.onGround  = true;
    // Réinit survie tout de suite — sinon infection/faim à 0 retue avant `respawn-at`.
    ZS.Survival?.reset?.();
    ZS.UI.setHealth(100);
    ZS.UI.hideDeath();
    // Le serveur fait autorité : il renvoie `respawn-at` avec la position (Start
    // Forest), le kit de départ et la survie remis à neuf (cf. network.js).
    ZS.Network.sendRespawn();
  }
  state.onRespawn = respawn;

  // ── Game loop ─────────────────────────────────────────────────────────────
  // ── Culling des lumières : seules les N PointLights les plus proches restent
  // actives (en forward rendering chaque fragment éclairé calcule TOUTES les
  // lumières → coût majeur sur mobile). Le compte reste constant = pas de recompile.
  const MAX_ACTIVE_LIGHTS = _isMobile ? 5 : 8;
  let _bbCamX = NaN, _bbCamZ = NaN;
  const _lp = new THREE.Vector3();
  function _cullLights() {
    const n = _pointLights.length;
    if (n <= MAX_ACTIVE_LIGHTS) { for (const l of _pointLights) l.visible = true; return; }
    const cx = _cameraWorldPos();
    for (const l of _pointLights) { l.getWorldPosition(_lp); l.userData._d = _lp.distanceToSquared(cx); }
    _pointLights.sort((a, b) => a.userData._d - b.userData._d);
    for (let i = 0; i < n; i++) _pointLights[i].visible = i < MAX_ACTIVE_LIGHTS;
  }

  let _shadowTick = 0;
  const _SHADOW_INTERVAL = _isMobile ? 24 : 18;
  function loop(timestamp) {
    requestAnimationFrame(loop);
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
    state.lastTime = timestamp;

    if (!state.player.dead) {
      updateMovement(dt);
      _updateWaterEffect(state.player.x, state.player.z, state.player.y);
    }
    ZS.tickFPSArms(fpsArms, dt, {
      moving: !!state.player.isMoving,
      speed: state.player.moveSpeed || 0,
    });
    ZS.tickArmAnim(fpsArms, dt);
    ZS.setShadowCenter(state.player.x, state.player.z);
    ZS.tickDayNight(dt);
    ZS.tickTreeFalls?.(dt);
    ZS.tickRockMines?.(dt);
    ZS.tickDecorDoors?.(dt);
    const camPos = _cameraWorldPos();
    const camX = camPos.x, camZ = camPos.z;
    if (Math.hypot(camX - _bbCamX, camZ - _bbCamZ) > 0.2) {
      _bbCamX = camX; _bbCamZ = camZ;
      if (ZS.updateBillboards) ZS.updateBillboards(camX, camZ);
    }
    ZS.Zombies.tick(dt);
    ZS.Network.tick(dt);
    ZS.Inventory.tick(dt);
    ZS.Survival.tick(dt);
    ZS.Map.tick();
    _updateDoorInteractUi();
    _cullLights();

    if (++_shadowTick >= _SHADOW_INTERVAL) { _shadowTick = 0; renderer.shadowMap.needsUpdate = true; }

    renderer.render(scene, camera);
  }

  requestAnimationFrame((t) => {
    state.lastTime = t;
    const camPos = _cameraWorldPos();
    if (ZS.updateBillboards) ZS.updateBillboards(camPos.x, camPos.z);
    _bbCamX = camPos.x;
    _bbCamZ = camPos.z;
    requestAnimationFrame(loop);
  });

  // ── Movement ──────────────────────────────────────────────────────────────
  const _fwd   = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up    = new THREE.Vector3(0, 1, 0);

  const PLAYER_R  = 0.45;
  const GRAVITY   = 22;
  const JUMP_V    = 8;

  function updateMovement(dt) {
    const SPEED = _inWater ? 2.8 : 5;
    const keys  = state.keys;

    let mx = state.input.moveX;
    let mz = state.input.moveZ;

    if (keys['KeyW'] || keys['ArrowUp'])    mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    state.player.isMoving = len > 0.01;
    state.player.moveSpeed = len * SPEED;

    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    const p = state.player;

    // Horizontal movement
    let newX = p.x + (_fwd.x * (-mz) + _right.x * mx) * SPEED * dt;
    let newZ = p.z + (_fwd.z * (-mz) + _right.z * mx) * SPEED * dt;

    // World bounds (map 600×600 → range -300…+300)
    newX = Math.max(-295, Math.min(295, newX));
    newZ = Math.max(-295, Math.min(295, newZ));

    // Collision avec arbres, rochers, murs — respecte la hauteur pour sauter par-dessus
    const colliders = ZS.getColliders();
    const feetY = p.y - 1.7; // Y des pieds du joueur

    for (const col of colliders) {
      const refX = col.cx ?? col.x ?? ((col.x0 ?? 0) + (col.x1 ?? 0)) * 0.5;
      const refZ = col.cz ?? col.z ?? ((col.z0 ?? 0) + (col.z1 ?? 0)) * 0.5;
      const _cdx = refX - newX;
      const _cdz = refZ - newZ;
      if (_cdx * _cdx + _cdz * _cdz > 900) continue;

      if (col.type === 'seg') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, PLAYER_R)) continue;
        const resolved = ZS.resolveDecorSegmentCollision?.(col, newX, newZ, feetY, PLAYER_R);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else if (col.type === 'box') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, PLAYER_R)) continue;
        const resolved = ZS.resolveDecorBoxCollision?.(col, newX, newZ, feetY, PLAYER_R);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, PLAYER_R)) continue;
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

    if (ZS.Zombies.resolvePlayerCollision) {
      const out = ZS.Zombies.resolvePlayerCollision(newX, newZ, PLAYER_R);
      newX = out.x;
      newZ = out.z;
    }

    p.x = newX;
    p.z = newZ;

    const waterY   = ZS.getWaterSurface(p.x, p.z);
    const inRiver  = waterY !== null;
    const groundY  = (ZS.getStandHeight?.(p.x, p.z, p.y) ?? ZS.getEffectiveFloorHeight(p.x, p.z, p.y)) + 1.7;
    const swimEyeY = inRiver ? waterY - 0.10 : null;
    const minEyeY  = inRiver ? waterY - 0.40 : null;
    const submerged = inRiver && feetY < waterY - 0.06;

    // Saut / nage vers la surface
    const jumpReq = keys['Space'] || state.jumpPressed;
    if (jumpReq) {
      if (inRiver && (submerged || p.y < waterY + 0.2)) {
        p.velocityY = Math.max(p.velocityY, 5.8);
        p.onGround = false;
      } else if (p.onGround) {
        p.velocityY = JUMP_V;
        p.onGround = false;
      }
      state.jumpPressed = false;
    } else {
      state.jumpPressed = false;
    }

    // Physique verticale
    if (inRiver && (submerged || p.y < waterY + 0.18)) {
      // Dans la colonne d'eau — flottabilité, pas de chute sous la surface
      p.onGround = false;
      p.velocityY -= GRAVITY * 0.12 * dt;
      p.velocityY += (swimEyeY - p.y) * 3.5 * dt;
      p.y += p.velocityY * dt;

      if (p.y < minEyeY) {
        p.y = minEyeY;
        p.velocityY = Math.max(p.velocityY, 3.0);
      }
      if (p.y > waterY + 0.12) {
        p.y = waterY + 0.12;
        p.velocityY = 0;
      }
      // Wade : le fond est assez haut pour marcher
      if (groundY >= waterY - 0.18 && p.y <= groundY + 0.08 && p.velocityY <= 0) {
        p.y = groundY;
        p.velocityY = 0;
        p.onGround = true;
      }
    } else if (!p.onGround) {
      p.velocityY -= GRAVITY * dt;
      p.y += p.velocityY * dt;
      if (p.y <= groundY) {
        p.y = groundY;
        p.velocityY = 0;
        p.onGround = true;
      }
    } else {
      if (groundY < p.y - 0.4) {
        p.onGround = false;
        p.velocityY = 0;
      } else {
        p.y = groundY;
      }
    }

    // Filet de sécurité — impossible de rester sous le plan d'eau
    if (inRiver && p.y < minEyeY) {
      p.y = minEyeY;
      p.velocityY = Math.max(p.velocityY, 3.5);
      p.onGround = false;
    }

    localAvatar.position.set(p.x, p.y - 1.7, p.z);
    localAvatar.rotation.y = state.camera.yaw;
    camera.position.set(p.x, p.y, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
  // ── Items de test — un exemplaire de chaque item ─────────────────────────
  function _addTestItems() {
    // Inventaire de départ vide — les joueurs ne commencent avec rien.
  }
}());
