// Main game loop — Three.js setup, FPS movement, shooting (généré — éditer game/chunks/*.js puis npm run bundle:game)
(async function () {
  'use strict';

function _clearAuthSession() {
    ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_is_guest', 'zombie_guest_committed', 'zombie_spawn', 'zombie_health', 'zombie_kills']
      .forEach((k) => localStorage.removeItem(k));
  }

  function _storeAuthPayload(data) {
    localStorage.setItem('zombie_token', data.token);
    localStorage.setItem('zombie_username', data.username);
    localStorage.setItem('zombie_is_admin', data.isAdmin ? '1' : '0');
    localStorage.setItem('zombie_is_guest', data.guest ? '1' : '0');
    localStorage.setItem('zombie_guest_committed', data.guestCommitted ? '1' : '0');
    if (data.role) localStorage.setItem('zs_role', data.role);
    if (data.roleLabel) localStorage.setItem('zs_role_label', data.roleLabel);
    if (data.permissions) localStorage.setItem('zs_permissions', JSON.stringify(data.permissions));
    if (data.serverRole) localStorage.setItem('zombie_server_role', data.serverRole);
    if (data.spawn) localStorage.setItem('zombie_spawn', JSON.stringify(data.spawn));
    if (data.health != null) localStorage.setItem('zombie_health', data.health);
    if (data.kills != null) localStorage.setItem('zombie_kills', data.kills);
  }

  // ── Handoff standalone (auth-server → game JWT) ───────────────────────────
  const _handoffCode = new URLSearchParams(window.location.search).get('handoff');
  if (_handoffCode) {
    window.ZS?.Loading?.setPhase?.('auth', 0, 'Connexion au serveur…', '');
    ZS.LoadLog?.stepStart?.('auth');
    try {
      const serverId = localStorage.getItem('zombie_server_id') || 'prod';
      const hres = await fetch('/api/auth/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: _handoffCode, serverId }),
      });
      const hdata = await hres.json().catch(() => ({}));
      if (!hres.ok) {
        ZS.LoadLog?.stepEnd?.('auth', { ok: false, status: hres.status, handoff: true });
        _clearAuthSession();
        window.location.href = '/play.html';
        return;
      }
      _storeAuthPayload(hdata);
      history.replaceState(null, '', '/game.html');
      window.ZS?.Loading?.setPhase?.('auth', 1, 'Compte vérifié', '');
      ZS.LoadLog?.stepEnd?.('auth', { ok: true, handoff: true });
    } catch {
      _clearAuthSession();
      window.location.href = '/play.html';
      return;
    }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = localStorage.getItem('zombie_token');
  if (!token) { window.location.href = '/play.html'; return; }

  window.ZS?.Loading?.setPhase?.('auth', 0, 'Vérification du compte…', '');
  ZS.LoadLog?.stepStart?.('auth');

  try {
    const authRes = await fetch('/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!authRes.ok) {
      ZS.LoadLog?.stepEnd?.('auth', { ok: false, status: authRes.status });
      _clearAuthSession();
      window.location.href = '/';
      return;
    }
    window.ZS?.Loading?.setPhase?.('auth', 1, 'Compte vérifié', '');
    ZS.LoadLog?.stepEnd?.('auth', { ok: true });
  } catch {
    // Tunnel/serveur en cours de démarrage — on laisse Socket.io retenter.
    window.ZS?.Loading?.setPhase?.('auth', 0.5, 'Compte…', 'Serveur lent — connexion directe');
    ZS.LoadLog?.stepEnd?.('auth', { ok: false, fallback: true });
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const _spawn0 = ZS.SpawnZone?.spawn || { x: 248, y: 5, z: -8, rotY: Math.PI / 2 };
  const state = {
    selfId: null,
    player: {
      x: _spawn0.x, y: 5, z: _spawn0.z, rotY: _spawn0.rotY,
      velocityY: 0,
      onGround: true,
      health: parseInt(localStorage.getItem('zombie_health') || '100'),
      kills:  parseInt(localStorage.getItem('zombie_kills')  || '0'),
      playerKills: 0,
      dead: false,
      crouching: false,
      _crouchT: 0,
    },
    input:  { moveX: 0, moveZ: 0, sprintHeld: false, crouchToggle: false },
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
  ZS.applyDeviceBodyClasses?.();
  const _touchInput = ZS._touchInput
    ?? ZS.needsTouchControls?.()
    ?? ZS.detectTouchInput?.()
    ?? !!window.__ZS_TOUCH_MODE;
  const _isPhone = ZS._isPhone ?? false;
  const _isMobile = _touchInput;
  ZS.Options?.init?.();
  ZS.Options?.applyTouchMode?.();
  const _gfxProf = ZS.Options?.getProfile?.() || {
    pixelRatioMax: _isMobile ? 1.15 : 1.5,
    shadows: !_isMobile,
    cameraFar: 175,
    maxLights: _isMobile ? 5 : 8,
    shadowInterval: _isMobile ? 24 : 18,
  };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, _gfxProf.pixelRatioMax));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !!_gfxProf.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;     // moins cher que PCFSoft
  renderer.shadowMap.autoUpdate = false;            // ombres mises à jour par intermittence
  renderer.shadowMap.needsUpdate = true;
  ZS._isMobile = _isMobile;

  const scene  = new THREE.Scene();
  // Distance de rendu réduite (le brouillard masque la coupe) → moins de draw calls.
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, _gfxProf.cameraFar || 175);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  ZS._camera = camera;   // référence pour l'audio spatial (panoramique/distance)

  // Le resize global est géré par _resizeToViewport plus bas (visualViewport).

  // ── Overlay eau ───────────────────────────────────────────────────────────
  const _waterOverlay = document.createElement('div');
  Object.assign(_waterOverlay.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '40',
    background: 'linear-gradient(to top, rgba(10,60,140,0.62) 0%, rgba(10,60,140,0.22) 42%, transparent 72%)',
    opacity: '0',
  });
  document.body.appendChild(_waterOverlay);
  let _inWater = false;
  let _waterDepth = 0;
  let _footstepAcc = 0;
  let _walkBobPhase = 0;
  let _camFov = 75;

function _updateWaterEffect(px, pz, py) {
    const waterY = ZS.getWaterSurface(px, pz);
    const feetY = (py || 0) - 1.7;
    const nowIn  = waterY !== null && waterY > feetY - 0.05;
    const depth = nowIn ? Math.max(0, waterY - feetY) : 0;
    _waterDepth = depth;

    const opacity = nowIn ? Math.min(0.68, 0.1 + depth * 0.52) : 0;
    _waterOverlay.style.opacity = String(opacity);
    // Pas de filter:blur — coûteux sur GPU mobile/tablette.
    _waterOverlay.style.filter = '';

    ZS.Audio?.setWaterDepth?.(depth, nowIn);

    if (nowIn !== _inWater) {
      if (nowIn) ZS.Audio?.splash?.(Math.min(1, depth * 1.4 + 0.32));
      _inWater = nowIn;
      state.player.inWater = nowIn;
      ZS.Survival?.setWaterContact?.(nowIn);
    }
  }

  function _tickFootsteps(dt) {
    if (ZS.Options?.isFeature?.('footsteps') === false) return;
    const p = state.player;
    if (!p.onGround || p.dead) return;
    const speed = p.moveSpeed || 0;
    if (speed < 0.4) { _footstepAcc = 0; return; }
    if (_inWater && _waterDepth > 0.38) return;

    _footstepAcc += dt;
    const interval = p.sprinting ? 0.28 : 0.41;
    if (_footstepAcc < interval) return;
    _footstepAcc = 0;

    const feetY = p.y - 1.7;
    let surface = ZS.Audio?.footstepSurface?.(p.x, p.z, feetY) || 'dirt';
    if (_inWater && _waterDepth > 0.02) surface = 'water';
    const stepVol = p.sprinting ? 0.72 : 0.56;
    ZS.Audio?.footstep?.(surface, stepVol);
    ZS.Network?.sendFootstep?.(surface, p.sprinting);
  }

  let _onSafeSand = null;
  function _updateBeachZoneUi(px, pz) {
    const safe = !!(ZS.isOnBeachSafeSand?.(px, pz));
    if (safe === _onSafeSand) return;
    _onSafeSand = safe;
    ZS.UI?.setZoneSafe?.(safe);
  }

  // ── Socket (parallèle au build — game-init bufferisé dans network.js) ───────
  window.ZS?.Loading?.setPhase?.('socket', 0, 'Connexion multijoueur…', 'En parallèle du monde');
  const _tSocket = performance.now();
  const socket = io({
    auth: { token, client: _isMobile ? 'mobile' : 'desktop' },
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 8,
  });
  ZS.Network?.preconnect?.(socket);

  // ── Build world ───────────────────────────────────────────────────────────
  window.ZS?.Loading?.setPhase?.('world', 0, 'Construction du monde…', 'Terrain et routes');
  ZS.LoadLog?.stepStart?.('world-build');
  const _tWorld = performance.now();
  if (ZS.buildWorldAsync) {
    await ZS.buildWorldAsync(scene, (p, detail) => {
      window.ZS?.Loading?.setPhase?.('world', p, 'Construction du monde…', detail || '');
      if (socket.connected) {
        window.ZS?.Loading?.setPhase?.('socket', 1, 'Serveur joint', detail || 'Monde en cours…');
      } else {
        window.ZS?.Loading?.setPhase?.('socket', Math.min(0.65, 0.15 + p * 0.35), 'Connexion multijoueur…', detail || '');
      }
    });
  } else {
    ZS.buildWorld(scene);
    window.ZS?.Loading?.setPhase?.('world', 0.72, 'Construction du monde…', 'Végétation et camp');
  }
  const _worldMs = Math.round(performance.now() - _tWorld);
  const _sockMs = Math.round(performance.now() - _tSocket);
  console.log('[world] build', _worldMs, 'ms');
  if (socket.connected) console.log('[socket] connect', _sockMs, 'ms (parallel)');
  ZS.LoadLog?.stepEnd?.('world-build', { ms: _worldMs, socketMs: _sockMs, socketConnected: socket.connected });
  ZS.DevLog?.boot?.('world-ready', { worldMs: _worldMs, socketMs: _sockMs, socketConnected: socket.connected });

  const _worldLights = [];
  const _playerTorchLights = [];
  scene.traverse((o) => {
    if (!o.isPointLight && !o.isSpotLight) return;
    if (o.userData.playerTorch) _playerTorchLights.push(o);
    else _worldLights.push(o);
  });
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
  ZS.ArmTuner?.init?.(fpsArms);
  ZS.loadFPSValidatedPoses?.(fpsArms);
  ZS.AdminHub?.init?.();
  // Expose globally pour que l'inventaire puisse changer l'item en main.
  // On diffuse aussi l'item équipé pour que les autres joueurs le voient.
  ZS.setHandItem = (type) => {
    ZS.updateHandItem(fpsArms, type);
    ZS.Network.sendEquip(type || null);
  };

  // Raycaster for shooting
  const raycaster = new THREE.Raycaster();
  const screenCenter = new THREE.Vector2(0, 0);
  const _viewAimNdc = new THREE.Vector2(0, 0);
  let _viewAimNdcValid = false;
  const _camWorld = new THREE.Vector3();
  function _cameraWorldPos() {
    return camera.getWorldPosition(_camWorld);
  }

  function _updateViewAimNdc(clientX, clientY) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    _viewAimNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _viewAimNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _viewAimNdcValid = true;
  }

  function _raycastNdc() {
    return (pointerLocked || !_viewAimNdcValid) ? screenCenter : _viewAimNdc;
  }

  /** Cible E / UI : coffre ou porte sous le réticule (pas la plus proche en XZ). */
  function _pickInteractRay(maxDist = 3.5) {
    if (!ZS.pickDecorInteractRay) return null;
    raycaster.setFromCamera(_raycastNdc(), camera);
    return ZS.pickDecorInteractRay(raycaster, maxDist);
  }
  ZS.pickWorldInteract = _pickInteractRay;

  function _pickAdminDecorRay(maxDist = 80) {
    if (!ZS.pickDecorAdminRay) return null;
    raycaster.setFromCamera(_raycastNdc(), camera);
    return ZS.pickDecorAdminRay(raycaster, maxDist);
  }
  ZS.pickAdminDecorRay = _pickAdminDecorRay;

  /** Point de pose admin : visée réticule → sol, sinon devant le joueur. */
  function _pickAdminDecorPlacement(maxDist = 80) {
    raycaster.setFromCamera(_raycastNdc(), camera);
    const hit = ZS.raycastViewToGround?.(raycaster, maxDist);
    const yaw = state.camera.yaw;
    if (hit) return { x: hit.x, y: hit.y, z: hit.z, rotY: yaw, fromRay: true };
    const dist = 3.2;
    const x = state.player.x - Math.sin(yaw) * dist;
    const z = state.player.z - Math.cos(yaw) * dist;
    const y = (ZS.getDecorGroundHeight
      ? ZS.getDecorGroundHeight(x, z)
      : (ZS.getTerrainHeight ? ZS.getTerrainHeight(x, z) : 0));
    return { x, y, z, rotY: yaw, fromRay: false };
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

  window.ZS?.Loading?.setPhase?.('world', 1, 'Monde prêt', socket.connected ? 'Synchronisation…' : 'Connexion multijoueur…');

  // ── UI ────────────────────────────────────────────────────────────────────
  try { ZS.UI.init(state); } catch (e) { console.error('UI init:', e); }
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setPlayerKills(state.player.playerKills);

  // ── Survival + inventaire avant Network (game-init appelle spawnWorldItem / loadFromSave)
  ZS.Survival.init(state);
  ZS.Inventory.init(state, scene, socket);

  ZS.Network.init(socket, scene, state);
  ZS.LoadLog?.mark?.('game-modules-init', { socketConnected: socket.connected });
  if (typeof ZS.Network?.tick !== 'function' && typeof ZS.networkTick !== 'function') {
    console.error('[game] ZS.Network.tick absent — videz le cache (Ctrl+F5) ou redeploy client');
  }

  socket.emit('world-water-zones', ZS.getWaterZones());

  // Transmet l'empreinte des bâtiments lootables → le serveur génère le loot (items.md)
  socket.emit('loot-buildings', ZS.Buildings.getLootBuildings());
  ZS.SleepLoot?.init?.(state);
  ZS.Map?.init?.(state, scene);
  ZS.Craft?.init?.();
  ZS.Audio?.init?.();
  ZS.Options?.applyAudio?.();
  if (ZS.Chat) ZS.Chat.init(socket);
  ZS.OptionsUI?.init?.();
  ZS.UI?.applyOptions?.();
  _initMenu();
  _addTestItems();

  // ── Menu (☰) : audio on/off + déconnexion ───────────────────────────────────
  async function _syncAdminMenu() {
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        ZS.AdminAuth?.loadFromAuth?.(data);
        if (data.username) localStorage.setItem('zombie_username', data.username);
        if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
      }
    } catch { /* hors ligne */ }
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
  }

  function _initMenu() {
    const btn     = document.getElementById('menu-btn');
    const panel   = document.getElementById('menu-panel');
    const audio   = document.getElementById('menu-audio');
    const options = document.getElementById('menu-options');
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
    if (options) options.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(false);
      ZS.OptionsUI?.open?.();
    });
    if (audio) audio.addEventListener('click', () => {
      const next = !ZS.Audio.isMuted();
      ZS.Options?.set?.('muted', next);
    });
    if (out) out.addEventListener('click', (e) => {
      e.stopPropagation();
      ZS.logout();
    });
  }

  // ── Viewport sizing — adapte le rendu à la vraie zone visible ───────────────
  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let _frameRecoverUntil = 0;
  let _zombieRecoverSkip = 0;
  let _adaptivePrUntil = 0;
  let _adaptivePrRestoreAfter = 0;
  let _adaptivePrLastResizeAt = 0;
  let _adaptivePrCap = null;
  const _ADAPTIVE_PR_HOLD_MS = 1800;
  const _ADAPTIVE_PR_RESTORE_MS = 3400;
  const _ADAPTIVE_PR_RESIZE_COOLDOWN_MS = 2800;
  let _lastVpW = 0;
  let _lastVpH = 0;
  let _lastVpPr = 0;
  let _lastVpTop = 0;
  let _lastVpLeft = 0;

  let _bootRenderWarmup = 0;

  ZS.beginBootRenderWarmup = (frames) => {
    _bootRenderWarmup = Math.max(0, frames | 0);
    if (_bootRenderWarmup > 0) {
      _adaptivePrCap = ZS._isMobile ? 0.68 : 0.82;
      _adaptivePrRestoreAfter = performance.now() + _ADAPTIVE_PR_RESTORE_MS;
      _resizeToViewport(true);
    }
  };
  ZS.getBootRenderWarmup = () => _bootRenderWarmup;

  ZS.isFrameRecovering = () => performance.now() < _frameRecoverUntil;

  function _effectivePixelRatioMax() {
    const base = ZS.Options?.getProfile?.()?.pixelRatioMax ?? _gfxProf.pixelRatioMax;
    if (_adaptivePrCap != null) return Math.min(base, _adaptivePrCap);
    return base;
  }

  function _resizeToViewport(force = false) {
    // visualViewport donne la vraie zone visible (sous la barre Safari sur iOS)
    const vp = window.visualViewport;
    const w  = vp ? vp.width  : window.innerWidth;
    const h  = vp ? vp.height : window.innerHeight;
    const prMax = _effectivePixelRatioMax();
    const pr = Math.min(window.devicePixelRatio || 1, prMax);
    const top = vp ? vp.offsetTop : 0;
    const left = vp ? vp.offsetLeft : 0;
    if (!force
        && Math.abs(w - _lastVpW) < 0.5
        && Math.abs(h - _lastVpH) < 0.5
        && Math.abs(pr - _lastVpPr) < 0.01
        && Math.abs(top - _lastVpTop) < 0.5
        && Math.abs(left - _lastVpLeft) < 0.5) {
      return;
    }
    _lastVpW = w;
    _lastVpH = h;
    _lastVpPr = pr;
    _lastVpTop = top;
    _lastVpLeft = left;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.style.top    = top + 'px';
    canvas.style.left   = left + 'px';
  }

  function _tickAdaptivePixelRatio(frameMs) {
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const recover = ZS.isFrameRecovering();
    const sectorBusy = ZS.Network?.isSectorLoadBusy?.();
    const now = performance.now();
    const stressed = frameMs >= 52 || recover || sectorBusy || (fps != null && fps < 15);
    if (stressed) {
      _adaptivePrUntil = now + _ADAPTIVE_PR_HOLD_MS;
      _adaptivePrRestoreAfter = now + _ADAPTIVE_PR_RESTORE_MS;
    }
    const dropCap = ZS._isMobile ? 0.82 : 0.95;
    const shouldDrop = now < _adaptivePrUntil
      || (_adaptivePrCap != null && now < _adaptivePrRestoreAfter);
    const newCap = shouldDrop ? dropCap : null;
    if (newCap === _adaptivePrCap) return;
    if (now - _adaptivePrLastResizeAt < _ADAPTIVE_PR_RESIZE_COOLDOWN_MS) return;
    _adaptivePrCap = newCap;
    _adaptivePrLastResizeAt = now;
    _resizeToViewport();
    if (shouldDrop && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('adaptive-pr-drop', {
        cap: newCap,
        frameMs: Math.round(frameMs),
        fps: fps ?? null,
      });
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', _resizeToViewport);
    if (_isIOS) window.visualViewport.addEventListener('scroll', _resizeToViewport);
  }
  window.addEventListener('resize', _resizeToViewport);
  _resizeToViewport(true);

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

  function _adminRoadsTyping(e) {
    if (!ZS.AdminLiveRoads?.isActive?.()) return false;
    const sel = '#zs-admin-live-roads input, #zs-admin-live-roads textarea, #zs-admin-live-roads select';
    const ae = document.activeElement;
    if (ae?.closest?.(sel)) return true;
    if (e?.target?.closest?.(sel)) return true;
    return false;
  }

  function _adminDecorTyping(e) {
    if (!ZS.AdminLiveDecor?.isActive?.()) return false;
    const sel = '#zs-admin-live-decor input, #zs-admin-live-decor textarea, #zs-admin-live-decor select';
    const ae = document.activeElement;
    if (ae?.closest?.(sel)) return true;
    if (e?.target?.closest?.(sel)) return true;
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (ZS.BedSleep?.isActive?.() && e.code === 'Space') {
      e.preventDefault();
      ZS.BedSleep.tryWake();
      return;
    }
    if (ZS.BedSleep?.isActive?.()) return;
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
    if (e.code === 'Escape' && ZS.StorageUI?.isOpen?.()) {
      e.preventDefault();
      ZS.StorageUI.close();
      return;
    }
    if (e.code === 'Escape' && ZS.SignUI?.isOpen?.()) {
      e.preventDefault();
      ZS.SignUI.close();
      return;
    }
    if (e.code === 'Escape' && ZS.SleepLoot?.isOpen?.()) {
      e.preventDefault();
      ZS.SleepLoot.closePanel();
      return;
    }
    if (e.code === 'KeyQ' && ZS.AdminLiveDecor?.isPlacing?.() && ZS.AdminLiveDecor.tryRotateOnKey?.('KeyQ')) {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && ZS.AdminLiveDecor?.isActive?.()) {
      e.preventDefault();
      ZS.AdminLiveDecor.tryUndo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' && ZS.AdminLiveDecor?.isActive?.()) {
      e.preventDefault();
      ZS.AdminLiveDecor.tryRedo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && ZS.AdminLiveDecor?.isActive?.()) {
      if (ZS.AdminLiveDecor.tryCopyOnKey?.()) {
        e.preventDefault();
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && ZS.AdminLiveDecor?.isActive?.()) {
      if (ZS.AdminLiveDecor.tryPasteOnKey?.()) {
        e.preventDefault();
        return;
      }
    }
    if (e.code === 'KeyV' && ZS.AdminFly?.tryToggleKey?.('KeyV')) {
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyC' && !_touchInput && !e.repeat && !(e.ctrlKey || e.metaKey)) {
      state.input.crouchToggle = !state.input.crouchToggle;
      e.preventDefault();
      return;
    }
    if (ZS.AdminLiveRoads?.isActive?.() && !_adminRoadsTyping(e)) {
      if (e.code === 'Enter' && ZS.AdminLiveRoads.tryFinishOnEnter?.()) {
        e.preventDefault();
        return;
      }
      if (e.code === 'Backspace' && ZS.AdminLiveRoads.tryUndoPointOnBackspace?.()) {
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock?.();
          return;
        }
        ZS.AdminLiveRoads.exit();
        return;
      }
    }
    if (e.code === 'KeyE') {
      state.keys[e.code] = true;
      if (ZS.SleepLoot?.isOpen?.()) return;
      // key repeat remettait _doorUnlockHold.t à 0 → barre qui repart de zéro
      if (e.repeat) {
        if (_interactHold) e.preventDefault();
        return;
      }
      if (ZS.AdminLiveDecor?.isActive?.()) {
        if (_adminDecorTyping(e)) return;
        if (ZS.AdminLiveDecor.isPlacing?.()) {
          if (ZS.AdminLiveDecor.tryPickOnE?.({ shiftKey: e.shiftKey })) {
            e.preventDefault();
            return;
          }
          if (ZS.AdminLiveDecor.tryRotateOnKey?.('KeyE')) {
            e.preventDefault();
            return;
          }
          return;
        }
        if (ZS.AdminLiveDecor.tryPickOnE?.({ shiftKey: e.shiftKey })) {
          e.preventDefault();
          return;
        }
      }
      if (ZS.Inventory?.tryGrabNearest?.()) {
        e.preventDefault();
        return;
      }
      if (_interactWorldKeyDown()) e.preventDefault();
      return;
    }
    state.keys[e.code] = true;
  });
  document.addEventListener('keyup', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.() || _rconTyping(e)) return;
    if (e.code === 'KeyE') _interactHoldEnd();
    state.keys[e.code] = false;
  });

  function _clearMovementKeys() {
    for (const k of Object.keys(state.keys)) delete state.keys[k];
    state.input.moveX = 0;
    state.input.moveZ = 0;
    state.input.sprintHeld = false;
  }
  ZS.clearMovementKeys = _clearMovementKeys;

  // ── Input: desktop pointer lock ───────────────────────────────────────────
  let pointerLocked = false;
  let _lockReqId = 0;

  function _safeExitPointerLock() {
    if (!document.pointerLockElement) return;
    _lockReqId += 1;
    try {
      document.exitPointerLock();
    } catch (_) { /* ignore */ }
  }

  function _blocksPointerLock(el) {
    if (!el || el === canvas) return false;
    return !!el.closest?.(
      '#menu-panel, #menu-btn, #inv-panel, #craft-panel, #storage-panel, #storage-backdrop, #sleep-loot-panel, #sleep-loot-backdrop, #sign-backdrop, #sign-panel, #options-backdrop, #options-panel, #admin-backdrop, #admin-panel, #map-overlay, #group-backdrop, #death-screen, '
      + '#connecting-screen, #rcon-panel, #chat-wrap, #hotbar, #craft-btn, #inv-btn, #map-btn, #chat-btn, '
      + '#build-ctl, #zs-admin-live-decor, #zs-admin-live-roads, #zs-admin-map-overlay, #zs-admin-prefab-catalog, #zs-arm-tuner, '
      + '#sprint-btn, #crouch-btn, '
      + 'button, a, input, textarea, select, [contenteditable]'
    );
  }

  function _syncPointerLockUi() {
    pointerLocked = document.pointerLockElement === canvas;
    document.body.classList.toggle('pointer-locked', pointerLocked);
    if (canvas) canvas.style.cursor = pointerLocked ? 'none' : 'crosshair';
  }

  function _uiPanelOpen() {
    const inv = document.getElementById('inv-panel');
    if (inv && inv.style.display === 'block') return true;
    const craft = document.getElementById('craft-panel');
    if (craft && craft.classList.contains('is-open')) return true;
    const map = document.getElementById('map-overlay');
    if (map && map.style.display === 'flex') return true;
    const groupBd = document.getElementById('group-backdrop');
    if (groupBd && groupBd.style.display === 'flex') return true;
    if (ZS.StorageUI?.isOpen?.()) return true;
    if (ZS.SleepLoot?.isOpen?.()) return true;
    if (ZS.SignUI?.isOpen?.()) return true;
    if (ZS.OptionsUI?.isOpen?.()) return true;
    if (ZS.AdminHub?.isOpen?.()) return true;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return true;
    if (document.getElementById('zs-admin-prefab-catalog')) return true;
    if (ZS.Calibration?.anyOpen?.() && !ZS.AdminLiveDecor?.isActive?.() && !ZS.ArmTuner?.allowsWalkPreview?.()) return true;
    if (ZS.AdminPanel?.isOpen?.()) return true;
    const death = document.getElementById('death-screen');
    if (death && death.classList.contains('show')) return true;
    const optBd = document.getElementById('options-backdrop');
    if (optBd && optBd.style.display === 'flex') return true;
    const adminBd = document.getElementById('admin-backdrop');
    if (adminBd && adminBd.style.display === 'flex') return true;
    return false;
  }

  function _onUiPanelOpen() {
    if (_isMobile) return;
    _safeExitPointerLock();
  }

  function _onUiPanelClose() {
    // Pas de requestPointerLock ici : Chrome exige un geste utilisateur (clic canvas).
    // Le listener mousedown sur le canvas reprend le lock au prochain clic.
  }

  function _requestPointerLock() {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (_isMobile || pointerLocked) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (ZS.Rcon?.isOpen?.()) return;
    if (ZS.Chat?.isOpen?.() || document.body.classList.contains('chat-open')) return;
    if (_uiPanelOpen()) return;
    const conn = document.getElementById('connecting-screen');
    if (conn && conn.style.display === 'flex' && !conn.classList.contains('connecting-fade-out')) return;
    if (ZS.Loading?.isActive?.()) return;
    if (!canvas?.requestPointerLock) return;
    const reqId = ++_lockReqId;
    let req;
    try {
      req = canvas.requestPointerLock();
    } catch (_) {
      return;
    }
    if (req && typeof req.then === 'function') {
      req.catch((err) => {
        if (reqId !== _lockReqId) return;
        // SecurityError normal si Esc / panneau / extension bloque le lock.
        if (err?.name !== 'SecurityError' && err?.name !== 'NotAllowedError') {
          console.warn('[input] pointer lock:', err?.message || err);
        }
      });
    }
  }

  if (!_isMobile) {
    document.addEventListener('mousedown', (e) => {
      if (pointerLocked) return;
      if (e.button !== 0) return;
      if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
      if (ZS.Rcon?.isOpen?.()) return;
      if (ZS.AdminLiveRoads?.isActive?.()) return;
      if (_blocksPointerLock(e.target)) return;
      _requestPointerLock();
    }, true);
  }

  document.addEventListener('pointerlockchange', _syncPointerLockUi);
  document.addEventListener('pointerlockerror', () => {
    _syncPointerLockUi();
  });
  _syncPointerLockUi();
  ZS.requestPointerLock = _requestPointerLock;
  ZS.onUiPanelOpen = _onUiPanelOpen;
  ZS.onUiPanelClose = _onUiPanelClose;

  document.addEventListener('mousemove', (e) => {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (!pointerLocked) {
      _updateViewAimNdc(e.clientX, e.clientY);
      return;
    }
    _viewAimNdc.set(0, 0);
    _viewAimNdcValid = true;
    const sens = ZS.Options?.getLookSensitivity?.().mouse ?? 0.002;
    const inv = ZS.Options?.get?.('invertY') ? -1 : 1;
    state.camera.yaw   -= e.movementX * sens;
    state.camera.pitch -= e.movementY * sens * inv;
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

  function _sendShot(baseDir, disp, weaponType) {
    const dx = baseDir.x + (Math.random() - 0.5) * disp;
    const dz = baseDir.z + (Math.random() - 0.5) * disp;
    const cam = _cameraWorldPos();
    ZS.Network.sendShoot(cam.x, cam.z, dx, dz, weaponType);
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
    _muzzleFlash();
    ZS.Audio.gunshot(item.type);
    _playSwing('recoil', item.type);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction.clone();
    const disp = def.dispersion_balle || 0.05;
    // Un seul événement — le serveur résout les 8 plombs (autoritaire).
    _sendShot(dir, item.type === 'wpn_fusil_pompe' ? Math.max(disp, 0.25) : disp, item.type);
    if ((item.ammo || 0) <= 0 && ZS.Inventory.countItem(def.type_munition_accepte) > 0) _startReload(def);
  }

  // Coup de poing à mains nues (aucune arme en main)
  const FIST = { degats_impact: 8, portee_metre: 1.6, cadence_attaque: 0.5 };
  function _fistPunch() {
    const n = _now();
    if (n - _lastAttack < FIST.cadence_attaque) return;
    _lastAttack = n;
    _playSwing('punch', null);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const cam = _cameraWorldPos();
    const decorHit = _tryDamageDecorRay('__fist__', FIST.portee_metre + 1.2);
    const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
    ZS.Audio.melee(decorHit ? 0.85 : (hitDist < FIST.portee_metre + 0.8 ? 0.9 : 0.4));
    // Toujours envoyer au serveur (PvP prioritaire côté serveur même si décor touché localement).
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z, '__fist__');
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

  function _canDamageBuild(type) {
    return type === 'tool_caillou' || type === 'tool_hache_pierre';
  }

  function _canBreakLockedDoor(type) {
    if (!type) return false;
    if (type === '__fist__') return true;
    if (_canDamageBuild(type)) return true;
    if (type === 'tool_hachette' || type === 'wpn_hache_combat') return true;
    const def = ZS.ITEMS?.[type];
    return (def?.category === 'melee' || def?.category === 'tool') && (def.degats_impact || 0) > 0;
  }

  function _isLockedDoorWithoutKey(meta) {
    return !!meta?.locked && !_hasDoorKey(meta.lockId);
  }

  function _tryDamageDecorRay(itemType, maxDist) {
    if (!ZS.hitDecorBuildRay && !ZS.hitDecorDoorRay) return false;
    raycaster.setFromCamera(screenCenter, camera);
    raycaster.far = maxDist;

    const buildHit = ZS.hitDecorBuildRay?.(raycaster, maxDist);
    if (buildHit?.decorId) {
      const meta = ZS.getDecorDoorMeta?.(buildHit.decorId);
      const lockedNoKey = _isLockedDoorWithoutKey(meta);
      if (lockedNoKey && _canBreakLockedDoor(itemType)) {
        ZS.Network.requestBuildHit(buildHit.decorId, itemType);
        return true;
      }
      if (!lockedNoKey && _canDamageBuild(itemType)) {
        ZS.Network.requestBuildHit(buildHit.decorId, itemType);
        return true;
      }
    }

    const doorHit = ZS.hitDecorDoorRay?.(raycaster, maxDist);
    if (doorHit?.decorId && _isLockedDoorWithoutKey(doorHit) && _canBreakLockedDoor(itemType)) {
      ZS.Network.requestBuildHit(doorHit.decorId, itemType);
      return true;
    }
    return false;
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

    // Dégâts construction / porte verrouillée sans clé
    if (ZS.hitDecorBuildRay || ZS.hitDecorDoorRay) {
      raycaster.far = harvestRange + 1.5;
      if (_tryDamageDecorRay(item.type, harvestRange + 1.5)) {
        harvested = true;
        ZS.Audio.chopWood(0.88);
      }
    }

    // Récolter de la pierre sur un rocher devant soi
    if (!harvested && _canHarvestStone(item.type, def) && ZS.mineRock) {
      const mine = ZS.mineRock(
        cam.x, cam.z, dir.x, dir.z,
        harvestRange,
        _mineStoneYield(item.type, def),
      );
      if (mine?.hit) {
        harvested = true;
        ZS.Audio.chopWood(0.95);
        if (mine.stoneTaken > 0) {
          ZS.UI.showNotif('+' + mine.stoneTaken + ' Pierre');
        }
        if (mine.depleted) ZS.UI.showNotif('Rocher épuisé');
        if (mine.decorId) {
          ZS.Network.notifyDecorMine(mine.decorId);
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
          ZS.UI.showNotif('+' + chop.woodTaken + ' Bois brut');
        }
        if (chop.felled) ZS.UI.showNotif('Arbre abattu');
        if (chop.decorId) {
          ZS.Network.notifyDecorChop(chop.decorId, dir.x, dir.z);
        }
      }
    }

    if (!harvested) {
      const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
      ZS.Audio.melee(hitDist < range + 0.8 ? 1.0 : 0.45);
    }

    // Frappe les zombies dans la portée (rayon latéral large = coup de mêlée balayant)
    // + recul : un coup au corps à corps repousse le zombie en arrière.
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z, item.type);
    ZS.Inventory.wearActiveWeapon();
  }

  function _useHeldItem() {
    const item = ZS.Inventory.getActiveItem();
    if (!item) return false;
    const def = ZS.ITEMS[item.type];
    if (!def) return false;
    if (def.category === 'food' || def.category === 'medical') {
      if (ZS.Survival.useItem(item.type, ZS.Inventory?.findItemSlot?.(item.type))) {
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
    if (ZS.BedSleep?.isActive?.()) return;
    if (ZS.AdminLiveDecor?.isPlacing?.() || ZS.AdminLiveRoads?.isPlacing?.() || ZS.AdminFly?.isActive?.()) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (ZS.SpawnIntro?.blocksInput?.()) return;
    if (ZS.Loading?.isActive?.() || !ZS.Network?.isSpawnReady?.()) return;
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
    ZS.Network.sendAttack(kind === 'punch' ? 'melee' : kind, type);
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

  const INTERACT_HOLD_S = 2.0;
  const INTERACT_TAP_MAX_S = 0.28;
  let _interactHold = null;
  let _doorHoldBar = null;
  let _doorHoldLabel = null;

  function _isDesktopMode() {
    return document.body.classList.contains('mode-desktop');
  }

  function _hasDoorKey(lockId) {
    return ZS.Inventory?.hasDoorKey?.(lockId) || false;
  }

  function _localUsername() {
    return ZS.Network?.getLocalUsername?.() || localStorage.getItem('zombie_username') || '';
  }

  function _canRemoveDoorLock(door) {
    if (!door?.locked) return false;
    return _hasDoorKey(door.lockId);
  }

  function _ensureDoorHoldUi() {
    if (_doorHoldBar) return;
    const wrap = document.createElement('div');
    wrap.id = 'door-hold-ui';
    wrap.style.cssText = [
      'display:none', 'position:fixed', 'left:50%', 'bottom:18%', 'transform:translateX(-50%)',
      'z-index:130', 'min-width:180px', 'padding:8px 12px', 'border-radius:10px',
      'background:rgba(20,14,8,.82)', 'border:1px solid rgba(210,180,120,.6)',
      'color:#f3e3b0', 'font:12px system-ui,sans-serif', 'text-align:center',
    ].join(';');
    _doorHoldLabel = document.createElement('div');
    _doorHoldLabel.textContent = 'Retrait du verrou…';
    _doorHoldBar = document.createElement('div');
    _doorHoldBar.style.cssText = 'margin-top:6px;height:6px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden';
    const fill = document.createElement('div');
    fill.id = 'door-hold-fill';
    fill.style.cssText = 'height:100%;width:0%;background:#66cc66;transition:width .05s linear';
    _doorHoldBar.appendChild(fill);
    wrap.appendChild(_doorHoldLabel);
    wrap.appendChild(_doorHoldBar);
    document.body.appendChild(wrap);
    _doorHoldBar = wrap;
    _doorHoldBar._fill = fill;
  }

  function _showHoldUi(progress, kind) {
    _ensureDoorHoldUi();
    _doorHoldLabel.textContent = kind === 'storage-pickup'
      ? 'Récupération du coffre…'
      : 'Retrait du verrou…';
    _doorHoldBar.style.display = 'block';
    _doorHoldBar._fill.style.width = `${Math.round(Math.min(1, progress) * 100)}%`;
  }

  function _hideHoldUi() {
    if (_doorHoldBar) _doorHoldBar.style.display = 'none';
  }

  function tryInstallDoorLock() {
    return ZS.Inventory?.installDoorLockOnNearestDoor?.() || false;
  }

  function _toggleNearbyDoor(door) {
    if (door.locked && !_hasDoorKey(door.lockId)) {
      ZS.UI?.showNotif?.('Porte verrouillée — clé requise');
      return true;
    }
    ZS.setDecorDoorState?.(door.decorId, !door.open);
    ZS.Network?.requestDecorDoorToggle?.(door.decorId);
    return true;
  }

  function _openStorageById(decorId) {
    if (!decorId) return false;
    ZS.setDecorStorageState?.(decorId, true);
    ZS.Network.requestStorageOpen(decorId);
    return true;
  }

  function _doorFromPick(pick) {
    if (!pick || pick.kind !== 'door') return null;
    return ZS.getDecorDoorForInteract?.(pick.decorId) || null;
  }

  function _storageFromPick(pick) {
    if (!pick || pick.kind !== 'storage') return null;
    return ZS.getDecorStorageForInteract?.(pick.decorId) || null;
  }

  function _signFromPick(pick) {
    if (!pick || pick.kind !== 'sign') return null;
    return ZS.getDecorSignForInteract?.(pick.decorId) || null;
  }

  function _interactRayTarget(maxDist = 3.5) {
    const pick = _pickInteractRay(maxDist);
    return {
      pick,
      storage: _storageFromPick(pick),
      door: _doorFromPick(pick),
      sign: _signFromPick(pick),
    };
  }

  function _interactDoorFromTarget(door) {
    if (!door) return false;
    const active = ZS.Inventory?.getActiveItem?.();
    if (active?.type === 'tool_verrou' && !door.locked) {
      return ZS.Inventory?.installDoorLockOnAimedDoor?.() || false;
    }
    return _toggleNearbyDoor(door);
  }

  function _interactDoorTap() {
    const { storage, door } = _interactRayTarget(3.2);
    if (storage) return _openStorageById(storage.decorId);
    if (door) return _interactDoorFromTarget(door);
    return false;
  }

  function _interactHoldStart() {
    const pick = _pickInteractRay(3.2);
    const storage = _storageFromPick(pick);
    if (storage && _isDesktopMode() && !ZS.StorageUI?.isOpen?.()) {
      if (_interactHold?.kind === 'storage-pickup' && _interactHold.decorId === storage.decorId) return true;
      _interactHold = { kind: 'storage-pickup', decorId: storage.decorId, t: 0, started: performance.now() };
      return true;
    }
    const door = _doorFromPick(pick);
    if (!door || !door.locked) return false;
    const active = ZS.Inventory?.getActiveItem?.();
    if (active?.type === 'tool_verrou') return false;
    if (!_canRemoveDoorLock(door)) return false;
    if (_interactHold?.kind === 'door-unlock' && _interactHold.decorId === door.decorId) return true;
    _interactHold = { kind: 'door-unlock', decorId: door.decorId, t: 0, started: performance.now() };
    return true;
  }

  function _interactHoldEnd() {
    if (!_interactHold) return;
    const hold = _interactHold;
    _interactHold = null;
    _hideHoldUi();
    if (hold.t >= INTERACT_HOLD_S) return;
    if (hold.t < INTERACT_TAP_MAX_S) {
      if (hold.kind === 'storage-pickup') _openStorageById(hold.decorId);
      else if (hold.kind === 'door-unlock') {
        const door = ZS.getDecorDoorForInteract?.(hold.decorId);
        if (door) _toggleNearbyDoor(door);
      }
    }
  }

  function _updateInteractHold(dt) {
    if (!_interactHold) return;
    if (!state.keys['KeyE']) {
      _interactHoldEnd();
      return;
    }
    _interactHold.t += dt;
    _showHoldUi(_interactHold.t / INTERACT_HOLD_S, _interactHold.kind);
    if (_interactHold.t >= INTERACT_HOLD_S) {
      const { kind, decorId } = _interactHold;
      _interactHold = null;
      _hideHoldUi();
      if (kind === 'door-unlock') ZS.Network?.requestDecorDoorUnlock?.(decorId);
      else if (kind === 'storage-pickup') ZS.Network?.requestStoragePickup?.(decorId);
    }
  }

  function _interactDoor() {
    return _interactDoorTap();
  }

  function _canPickupIntroCampfireTorch() {
    const beats = ZS.Scenario?.getIntroBeats?.();
    return !!ZS.Scenario?.isActive?.()
      && !ZS.Inventory?.hasItemType?.('tool_torche')
      && !beats?.pickedTorch;
  }

  function _hideIntroCampfireTorchMesh(decorId) {
    const entry = ZS.Network?.getDecorEntry?.(decorId);
    const root = entry?.root;
    if (root) ZS.BeachIntroPrefabs?.setIntroCampfireTorchVisible?.(root, false);
  }

  function _introTorchPickup(decorId) {
    ZS.Network?.requestIntroTorchPickup?.(decorId)?.then((res) => {
      if (res?.ok) {
        _hideIntroCampfireTorchMesh(decorId);
        ZS.Network?.forEachDecor?.((id, entry) => {
          if (entry?.data?.prefabId === 'spawn_beach_campfire_ring') {
            _hideIntroCampfireTorchMesh(id);
          }
        });
        ZS.Scenario?.mergeServerScenario?.({
          introBeats: { pickedTorch: true, campfire: true },
        });
        ZS.IntroStarter?.onPickup?.('tool_torche');
        ZS.IntroLessons?.onTorchAcquired?.();
        ZS.UI?.showNotif?.('Torche récupérée');
      } else if (res?.err === 'inventory_full') {
        ZS.UI?.showNotif?.('Inventaire plein — libère un emplacement');
      } else if (res?.err === 'no_torch') {
        ZS.UI?.showNotif?.('Approche la veilleuse — la torche n\'est pas encore là');
      } else if (res?.err === 'need_rock') {
        ZS.UI?.showNotif?.('Ramasse d\'abord le caillou sur la plage');
      } else if (res?.err === 'already_has_torch') {
        ZS.UI?.showNotif?.('Tu as déjà la torche');
        ZS.BeachIntroPrefabs?.syncIntroCampfireTorchVisibility?.();
      } else if (res?.err === 'need_campfire_beat') {
        ZS.UI?.showNotif?.('Approche la veilleuse — le feu doit te sentir proche');
      } else if (res?.err === 'pickup_failed') {
        ZS.UI?.showNotif?.('Ramassage impossible');
      } else {
        ZS.UI?.showNotif?.('Ramassage impossible');
      }
    });
  }

  function _interactCampProp(px, pz) {
    if (_canPickupIntroCampfireTorch()) {
      const introTorch = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'intro_torch');
      if (introTorch) {
        _introTorchPickup(introTorch.decorId);
        return true;
      }
      const campfireTorch = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'intro_campfire_torch');
      if (campfireTorch) {
        _introTorchPickup(campfireTorch.decorId);
        return true;
      }
    }
    const wb = ZS.findNearestDecorInteract?.(px, pz, 3.0, 'workbench');
    if (wb) {
      ZS.Craft?.toggle?.();
      return true;
    }
    const fire = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'campfire');
    if (fire) {
      ZS.Network?.requestCampfireCook?.(fire.decorId);
      return true;
    }
    const bed = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'bedroll');
    if (bed) {
      ZS.Network?.requestCampRest?.(bed.decorId);
      return true;
    }
    const bedFurniture = ZS.findNearestDecorInteract?.(px, pz, 3.2, 'bed');
    if (bedFurniture) {
      ZS.BedSleep?.tryStart?.(bedFurniture.decorId);
      return true;
    }
    return false;
  }

  function _interactWorld() {
    const { storage, door, sign } = _interactRayTarget(3.2);
    if (storage) return _openStorageById(storage.decorId);
    if (door) return _interactDoorFromTarget(door);
    if (_interactCampProp(state.player.x, state.player.z)) return true;
    if (sign && ZS.SignUI?.tryInteract?.(sign)) return true;
    return ZS.SleepLoot?.tryInteract?.() || false;
  }

  function _interactWorldKeyDown() {
    if (ZS.StorageUI?.isOpen?.()) return true;
    if (ZS.SignUI?.isOpen?.()) return true;
    if (ZS.SleepLoot?.isPending?.()) return true;
    if (!state.player.dead) {
      const { storage, door, sign } = _interactRayTarget(3.5);
      if (storage || door) {
        if (_interactHoldStart()) return true;
      }
      if (storage) return _openStorageById(storage.decorId);
      if (door) return _interactDoorFromTarget(door);
      if (sign && ZS.SignUI?.tryInteract?.(sign)) return true;
      if (_interactCampProp(state.player.x, state.player.z)) return true;
      const sleeper = ZS.SleepLoot?.getNearestForUi?.(state.player.x, state.player.z);
      if (sleeper && ZS.SleepLoot?.tryInteract?.()) return true;
    }
    if (_interactHoldStart()) return true;
    return _interactWorld();
  }

  ZS.isInteractHoldActive = () => !!_interactHold;
  ZS.isDoorUnlockHoldActive = ZS.isInteractHoldActive;

  let _doorUiTick = 0;
  let _doorUiX = NaN;
  let _doorUiZ = NaN;
  let _doorUiYaw = NaN;
  function _updateDoorInteractUi() {
    const px = state.player.x;
    const pz = state.player.z;
    const yaw = state.camera?.yaw ?? 0;
    const moved = Math.hypot(px - _doorUiX, pz - _doorUiZ) > 0.45;
    const turned = Math.abs(yaw - _doorUiYaw) > 0.035;
    if (!moved && !turned && !_interactHold && ++_doorUiTick < 2) return;
    _doorUiTick = 0;
    _doorUiX = px;
    _doorUiZ = pz;
    _doorUiYaw = yaw;
    const pick = _pickInteractRay(3.5);
    const storage = _storageFromPick(pick);
    const door = _doorFromPick(pick);
    const sign = _signFromPick(pick);
    let campProp = (!storage && !door && !sign)
      ? ZS.findNearestDecorInteract?.(px, pz, 3.2) : null;
    if (campProp && (campProp.role === 'intro_torch' || campProp.role === 'intro_campfire_torch')
        && !_canPickupIntroCampfireTorch()) campProp = null;
    const sleeper = (!storage && !door && !sign && !campProp && !state.player.dead)
      ? ZS.SleepLoot?.getNearestForUi?.(px, pz) : null;
    _nearStorage = storage;
    _nearDoor = door;
    const btn = _ensureDoorButton();
    if ((!storage && !door && !campProp && !sign && !sleeper) || state.player.dead || ZS.Rcon?.isOpen?.() || ZS.Chat?.isOpen?.() || ZS.SleepLoot?.isOpen?.() || ZS.SignUI?.isOpen?.()) {
      btn.style.display = 'none';
      return;
    }
    const mobile = document.body.classList.contains('input-touch');
    let label;
    if (storage) {
      label = 'Coffre';
      if (!mobile && !_interactHold) label += ' · maintenir E = ramasser';
    } else if (door) {
      const active = ZS.Inventory?.getActiveItem?.();
      if (active?.type === 'tool_verrou' && !door.locked) label = 'Verrouiller';
      else if (door.locked && !_hasDoorKey(door.lockId)) label = 'Verrouillée · frapper pour casser';
      else if (door.locked && _hasDoorKey(door.lockId)) {
        label = door.open ? 'Fermer' : 'Ouvrir';
        if (!mobile && !_interactHold) label += ' · maintenir E = retirer verrou';
      }
      else label = door.open ? 'Fermer' : 'Ouvrir';
    }
    else if (campProp?.role === 'workbench') label = 'Établi';
    else if ((campProp?.role === 'intro_torch' || campProp?.role === 'intro_campfire_torch')
        && _canPickupIntroCampfireTorch()) label = 'Ramasser la torche';
    else if (campProp?.role === 'campfire') label = 'Cuire au feu';
    else if (campProp?.role === 'bed') label = 'Repos';
    else if (campProp?.role === 'bedroll') label = 'Repos (sac)';
    else if (sign) label = sign.signKind?.startsWith('intro_') ? 'Lire' : 'Lire le panneau';
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
    if (!pointerLocked) {
      if (_blocksPointerLock(e.target)) return;
      if (e.target !== canvas) return;
      if (e.button === 2) {
        if (ZS.AdminLiveRoads?.tryCancelOnRightClick?.()) {
          e.preventDefault();
        }
        return;
      }
      if (e.button !== 0) return;
      if (ZS.AdminLiveRoads?.tryPlaceOnClick?.()) {
        e.preventDefault();
      }
      return;
    }
    if (_blocksPointerLock(e.target)) return;
    if (e.button === 2) {
      if (ZS.AdminLiveRoads?.tryCancelOnRightClick?.()) {
        e.preventDefault();
        return;
      }
      if (ZS.AdminLiveDecor?.tryCancelOnRightClick?.()) {
        e.preventDefault();
        return;
      }
      if (_placeHeldStructure()) e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (ZS.AdminLiveRoads?.tryPlaceOnClick?.()) {
      e.preventDefault();
      return;
    }
    if (ZS.AdminLiveDecor?.tryPlaceOnClick?.()) {
      e.preventDefault();
      return;
    }
    attack();
  });
  document.addEventListener('contextmenu', (e) => {
    if (!pointerLocked) {
      if (ZS.AdminLiveRoads?.isActive?.() && e.target === canvas) {
        e.preventDefault();
      }
      return;
    }
    if (ZS.AdminLiveDecor?.isPlacing?.() || ZS.AdminLiveRoads?.isPlacing?.()) {
      e.preventDefault();
      return;
    }
    const item = ZS.Inventory.getActiveItem();
    const def = item ? ZS.ITEMS[item.type] : null;
    if (def?.category === 'structure') e.preventDefault();
  });
  document.addEventListener('wheel', (e) => {
    if (!pointerLocked) {
      if (ZS.AdminLiveRoads?.onWheel?.(e)) e.preventDefault();
      return;
    }
    if (ZS.AdminLiveDecor?.onWheel?.(e)) e.preventDefault();
    if (ZS.AdminLiveRoads?.onWheel?.(e)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.()) return;
    if (e.code === 'KeyR' && state.onReload) state.onReload();
  });

  // ── Respawn ───────────────────────────────────────────────────────────────
  function respawn() {
    // Ne pas réveiller le joueur ici : sinon la boucle envoie encore la position
    // de mort au serveur avant `respawn-at` et annule le téléport plage.
    ZS.Network.sendRespawn();
  }
  state.onRespawn = respawn;

  // ── Game loop ─────────────────────────────────────────────────────────────
  // ── Culling des lumières : seules les N PointLights les plus proches restent
  // actives (en forward rendering chaque fragment éclairé calcule TOUTES les
  // lumières → coût majeur sur mobile). Le compte reste constant = pas de recompile.
  let MAX_ACTIVE_LIGHTS = _gfxProf.maxLights || (_isMobile ? 3 : 8);
  let _SHADOW_INTERVAL = _gfxProf.shadowInterval || (_isMobile ? 36 : 18);
  let _LIGHT_CULL_EVERY = _gfxProf.lightCullEvery || (_isMobile ? 6 : 4);
  let _BIOME_STRIDE = _gfxProf.biomeStride || (_isMobile ? 2 : 1);
  let _BILLBOARD_STRIDE = _gfxProf.billboardStride || (_isMobile ? 2 : 1);
  let _biomeStrideAcc = 0;
  let _beachLifeStrideAcc = 0;
  let _s01ZoneLog = '';
  const _S01_CABIN_XZ = { x: 165.1, z: 7.1 };
  const _S01_CLEARING_XZ = { x: 0, z: -6 };
  const _S01_ROUTE_JUNC = { x: 85, z: -6 };

  function _tickS01DevLog(px, pz) {
    if (!ZS.DevLog?.isEnabled?.()) return;
    const bed = ZS.findNearestDecorInteract?.(px, pz, 3.5, 'bed');
    const dCab = Math.hypot(px - _S01_CABIN_XZ.x, pz - _S01_CABIN_XZ.z);
    const dRoute = Math.hypot(px - _S01_ROUTE_JUNC.x, pz - _S01_ROUTE_JUNC.z);
    const dClear = Math.hypot(px - _S01_CLEARING_XZ.x, pz - _S01_CLEARING_XZ.z);
    const onRoad = ZS.isNearRoad?.(px, pz, 1.35);
    let zone = null;
    if (bed) zone = 'lit_cabane';
    else if (dCab < 14) zone = 'cabane01_proche';
    else if (dClear < 12) zone = 'clairiere_hub';
    else if (dRoute < 10) zone = 'route_jonction';
    else if (onRoad && px > 70 && px < 175) zone = 'route_cabane';
    else if (onRoad && px < 70 && px > -15) zone = 'route_clearing';
    if (!zone || zone === _s01ZoneLog) return;
    _s01ZoneLog = zone;
    ZS.DevLog.s01(`zone:${zone}`, {
      x: Math.round(px * 10) / 10,
      z: Math.round(pz * 10) / 10,
      bedId: bed?.decorId || null,
      onRoad: !!onRoad,
    });
  }
  let _billboardStrideAcc = 0;
  ZS._gfxRuntime = {
    renderer,
    camera,
    scene,
    onProfile(p) {
      MAX_ACTIVE_LIGHTS = p.maxLights ?? MAX_ACTIVE_LIGHTS;
      _SHADOW_INTERVAL = p.shadowInterval ?? _SHADOW_INTERVAL;
      _LIGHT_CULL_EVERY = p.lightCullEvery ?? _LIGHT_CULL_EVERY;
      _BIOME_STRIDE = p.biomeStride ?? 1;
      _BILLBOARD_STRIDE = p.billboardStride ?? 1;
    },
  };
  ZS.Options?.applyRuntime?.(ZS._gfxRuntime);
  let _bbCamX = NaN, _bbCamZ = NaN;
  let _lightCullCamX = NaN, _lightCullCamZ = NaN;
  let _lightCullTick = 0;
  const _lp = new THREE.Vector3();
  function _cullLights() {
    for (let i = 0; i < _playerTorchLights.length; i++) _playerTorchLights[i].visible = true;
    const n = _worldLights.length;
    if (n <= MAX_ACTIVE_LIGHTS) {
      for (const l of _worldLights) l.visible = true;
      return;
    }
    const cx = _cameraWorldPos();
    const camMoved = Math.hypot(cx.x - _lightCullCamX, cx.z - _lightCullCamZ) > 4;
    if (!camMoved && ++_lightCullTick < _LIGHT_CULL_EVERY) return;
    _lightCullTick = 0;
    _lightCullCamX = cx.x;
    _lightCullCamZ = cx.z;
    const k = MAX_ACTIVE_LIGHTS;
    const nearest = [];
    for (const l of _worldLights) {
      l.getWorldPosition(_lp);
      const d = _lp.distanceToSquared(cx);
      l.userData._d = d;
      let ins = nearest.length;
      for (let i = 0; i < nearest.length; i++) {
        if (d < nearest[i].userData._d) { ins = i; break; }
      }
      if (nearest.length < k) {
        nearest.splice(ins, 0, l);
      } else if (ins < k) {
        nearest.splice(ins, 0, l);
        nearest.length = k;
      }
    }
    const nearSet = new Set(nearest);
    for (const l of _worldLights) l.visible = nearSet.has(l);
  }

  let _shadowTick = 0;
  let _roadsRenderSkip = 0;

  let _sceneRendered = false;

  function loop(timestamp) {
    requestAnimationFrame(loop);
    const rawDt = (timestamp - state.lastTime) / 1000;
    const spawnReady = ZS.Network?.isSpawnReady?.();
    if (!spawnReady) {
      ZS._frameId = (ZS._frameId | 0) + 1;
      state.lastTime = timestamp;
      if (_sceneRendered) renderer.render(scene, camera);
      return;
    }
    const _frameT0 = performance.now();
    let _sectT = _frameT0;
    const _sect = {};
    const _markSect = (k) => {
      _sect[k] = (_sect[k] || 0) + (performance.now() - _sectT);
      _sectT = performance.now();
    };
    ZS._frameId = (ZS._frameId | 0) + 1;
    if (_bootRenderWarmup > 0) {
      _bootRenderWarmup--;
      if (_bootRenderWarmup === 0) {
        _adaptivePrCap = null;
        _adaptivePrUntil = 0;
        _adaptivePrRestoreAfter = 0;
        _resizeToViewport(true);
      }
    }
    const dt = window.__zsBenchMove
      ? Math.min(Math.max(rawDt, 0.001), 1)
      : Math.min(rawDt, 0.05);
    state.lastTime = timestamp;

    if (!state.player.dead && !ZS.Loading?.isActive?.() && ZS.Network?.isSpawnReady?.()
        && !ZS.SpawnIntro?.isActive?.()) {
      updateMovement(dt);
      _updateWaterEffect(state.player.x, state.player.z, state.player.y);
      _updateBeachZoneUi(state.player.x, state.player.z);
      _biomeStrideAcc++;
      const biomeStride = ZS.isFrameRecovering?.()
        ? _BIOME_STRIDE * 2
        : _BIOME_STRIDE;
      if (_biomeStrideAcc >= biomeStride) {
        _biomeStrideAcc = 0;
        ZS.Audio?.updateBiomeAmbient?.(state.player.x, state.player.z, dt * biomeStride);
      }
      _tickFootsteps(dt);
      const activeType = ZS.Inventory?.getActiveItem?.()?.type;
      ZS.Audio?.tickHeldTorch?.(dt, activeType, {
        dead: false,
        inWater: _inWater && _waterDepth > 0.25,
      });
    } else {
      ZS.Audio?.tickHeldTorch?.(dt, null, { dead: !!state.player.dead });
      if (_onSafeSand !== null) {
        _onSafeSand = null;
        ZS.UI?.setZoneSafe?.(null);
      }
    }
    ZS.SpawnIntro?.tick?.(dt);
    ZS.Scenario?.tick?.(dt);
    if (!state.player.dead && !ZS.Loading?.isActive?.()) {
      if (!ZS.isFrameRecovering?.()) {
        ZS.BeachAmbientLife?.tick?.(dt, state.player.x, state.player.z);
      }
      _beachLifeStrideAcc++;
      if (_beachLifeStrideAcc >= _BIOME_STRIDE) {
        _beachLifeStrideAcc = 0;
        if (!ZS.isFrameRecovering?.()) {
          ZS.Audio?.tickBeachLife?.(state.player.x, state.player.z, dt * _BIOME_STRIDE);
        }
      }
    }
    ZS.AdminLiveDecor?.tick?.();
    ZS.AdminLiveRoads?.tick?.();
    const _tunerWalk = ZS.ArmTuner?.allowsWalkPreview?.();
    if (!ZS._armTunerActive || _tunerWalk) {
      ZS.tickFPSArms(fpsArms, dt, {
        moving: _tunerWalk ? !!ZS.ArmTuner.walkPreviewOn : !!state.player.isMoving,
        speed: _tunerWalk ? (ZS.ArmTuner.walkPreviewOn ? 4.5 : 0) : (state.player.moveSpeed || 0),
      });
    }
    if (!ZS._armTunerActive) {
      ZS.tickArmAnim(fpsArms, dt);
    }
    ZS.tickTorchFx?.(dt, {
      moving: !!state.player.isMoving,
      speed: state.player.moveSpeed || 0,
      extinguished: _inWater && _waterDepth > 0.25,
    });
    ZS.setShadowCenter(state.player.x, state.player.z);
    ZS.tickDayNight(dt);
    if (!ZS.isFrameRecovering?.()) {
      if (ZS.hasActiveTreeAnims?.()) ZS.tickTreeFalls?.(dt);
      if (ZS.hasActiveRockMines?.()) ZS.tickRockMines?.(dt);
    }
    ZS.tickDecorDoors?.(dt);
    const camPos = _cameraWorldPos();
    const camX = camPos.x, camZ = camPos.z;
    _billboardStrideAcc++;
    if (_billboardStrideAcc >= _BILLBOARD_STRIDE
        && Math.hypot(camX - _bbCamX, camZ - _bbCamZ) > 0.2
        && !ZS.Network?.isInitVisRevealBusy?.()
        && !ZS.isFrameRecovering?.()) {
      _billboardStrideAcc = 0;
      _bbCamX = camX; _bbCamZ = camZ;
      if (ZS.updateBillboards) ZS.updateBillboards(camX, camZ);
    }
    if ((!ZS._roadsPostSpawnBusy || (_roadsRenderSkip % 4 === 0))
        && !ZS.Network?.isInitVisRevealBusy?.()
        && !ZS.Network?.isSectorLoadBusy?.()
        && _bootRenderWarmup <= 4) {
      const fpsStats = ZS.PerfMonitor?.getStats?.();
      const fps = fpsStats?.fps;
      if ((fps == null || fps >= 12)
          && (fpsStats?.frameMsP95 == null || fpsStats.frameMsP95 <= 90)) {
        const streamer = ZS.Engine?.ChunkStreamer;
        const reenter = streamer?.hasHiddenNear?.(camX, camZ);
        const src = ZS.Engine?.ContentLoader?.getStreamingSource?.();
        const moving = src && ((src.vx ?? 0) ** 2 + (src.vz ?? 0) ** 2 > 1.44);
        const forceVis = reenter || moving;
        streamer?.tick?.(camX, camZ, forceVis ? 6 : 2, { force: forceVis });
        ZS.updateForestDecorVisibility?.(camX, camZ);
      }
    }
    _tickS01DevLog(state.player.x, state.player.z);
    if (!ZS.Network?.isInitVisRevealBusy?.()) {
      if (!ZS.isFrameRecovering?.() || (++_zombieRecoverSkip % 2 === 0)) {
        ZS.Zombies.tick(dt);
      }
    }
    _markSect('preNet');
    (ZS.Network?.tick || ZS.networkTick)?.(dt);
    _markSect('network');
    ZS.Inventory.tick(dt);
    if (!ZS.isFrameRecovering?.()) ZS.Craft.tick(dt);
    ZS.Survival.tick(dt);
    if (!ZS.Network?.isSectorLoadBusy?.() && !ZS.isFrameRecovering?.()) {
      ZS.Map?.tick?.(dt);
    }
    _markSect('systems');
    _updateInteractHold(dt);
    _updateDoorInteractUi();
    _cullLights();

    if (!ZS.Network?.isInitVisRevealBusy?.() && !ZS.isFrameRecovering?.()) {
      const fpsStats = ZS.PerfMonitor?.getStats?.();
      const sectorBusy = ZS.Network?.isSectorLoadBusy?.();
      const shadowEvery = (fpsStats?.fps != null && fpsStats.fps < 14) || sectorBusy
        ? Math.round(_SHADOW_INTERVAL * 2.2)
        : _SHADOW_INTERVAL;
      if (++_shadowTick >= shadowEvery) { _shadowTick = 0; renderer.shadowMap.needsUpdate = true; }
    }

    ZS.BuildingDebug?.tick?.();
    _roadsRenderSkip = 0;
    renderer.render(scene, camera);
    _sceneRendered = true;
    _markSect('render');
    ZS.PerfMonitor?.tickFrame?.();

    const frameMs = performance.now() - _frameT0;
    ZS.LoadLog?.tickPerfSample?.(frameMs, _sect);
    if (frameMs >= 68) {
      const initVisBusy = ZS.Network?.isInitVisRevealBusy?.();
      const recoverMs = initVisBusy
        ? Math.min(360, Math.max(120, Math.round(frameMs * 0.5)))
        : Math.min(280, Math.max(80, Math.round(frameMs * 0.42)));
      _frameRecoverUntil = performance.now() + recoverMs;
      if (frameMs >= 110 && ZS.LoadLog?.isEnabled?.()) {
        ZS.LoadLog.post('frame-recover', {
          ms: Math.round(frameMs),
          recoverMs,
          render: Math.round(_sect.render || 0),
          network: Math.round(_sect.network || 0),
        });
      }
    }
    _tickAdaptivePixelRatio(frameMs);
    if (ZS.LoadLog?.isEnabled?.() && frameMs >= 80) {
      ZS.LoadLog.slowFrame(frameMs, {
        preNet: Math.round(_sect.preNet || 0),
        network: Math.round(_sect.network || 0),
        systems: Math.round(_sect.systems || 0),
        render: Math.round(_sect.render || 0),
      });
    }
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
  const WALK_SPEED = 5;
  const SPRINT_MULT = 1.62;
  const PS = () => ZS.PlayerStance || { EYE_STAND: 1.7, EYE_CROUCH: 1.05, CROUCH_SPEED_MULT: 0.52, eyeHeight: (t) => 1.7, isCrouched: () => false };

  function _playerEyeH(p) {
    return PS().eyeHeight(p._crouchT ?? 0);
  }

  function updateMovement(dt) {
    if (ZS.SpawnIntro?.isActive?.()) return;
    if (ZS.AdminFly?.applyMovement?.(dt, state, camera)) {
      const p = state.player;
      const eyeH = PS().EYE_STAND;
      localAvatar.position.set(p.x, p.y - eyeH, p.z);
      localAvatar.rotation.y = state.camera.yaw;
      camera.position.set(p.x, p.y, p.z);
      camera.rotation.y = state.camera.yaw;
      camera.rotation.x = state.camera.pitch;
      p.rotY = state.camera.yaw;
      ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
      return;
    }
    const keys  = state.keys;

    if (ZS.BedSleep?.isActive?.()) {
      state.input.moveX = 0;
      state.input.moveZ = 0;
      state.input.sprintHeld = false;
      return;
    }

    let mx = state.input.moveX;
    let mz = state.input.moveZ;

    if (keys['KeyW'] || keys['ArrowUp'])    mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  mz += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    const benchMove = window.__zsBenchMove;
    if (benchMove && typeof benchMove === 'object') {
      if (benchMove.worldDir && typeof benchMove.worldDir === 'object') {
        mx = benchMove.worldDir.x ?? 0;
        mz = benchMove.worldDir.z ?? 0;
      } else {
        if (Number.isFinite(benchMove.mx)) mx = benchMove.mx;
        if (Number.isFinite(benchMove.mz)) mz = benchMove.mz;
      }
    }

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const moving = len > 0.08;

    const p = state.player;
    const wantsCrouch = !!state.input.crouchToggle;
    const canCrouch = !_inWater && p.onGround;
    const crouchTarget = wantsCrouch && canCrouch ? 1 : 0;
    if (!Number.isFinite(p._crouchT)) p._crouchT = 0;
    if (!p.onGround && !wantsCrouch) p._crouchT = Math.max(0, p._crouchT - dt * 10);
    else p._crouchT += (crouchTarget - p._crouchT) * Math.min(1, dt * 14);
    const eyeH = _playerEyeH(p);
    p.crouching = PS().isCrouched(p._crouchT);

    const sprintKey = keys['ShiftLeft'] || keys['ShiftRight'];
    const wantsSprint = (sprintKey || state.input.sprintHeld) && moving && !p.crouching;
    const canSprint = !_inWater && ZS.Survival?.canSprint?.();
    const sprinting = wantsSprint && canSprint;
    state.player.sprinting = sprinting;
    const baseSpeed = _inWater ? 2.8 : WALK_SPEED;
    let speedMult = sprinting ? SPRINT_MULT : 1;
    if (benchMove?.sprint && moving) speedMult = Math.max(speedMult, SPRINT_MULT);
    if (p.crouching) speedMult *= PS().CROUCH_SPEED_MULT;
    const SPEED = baseSpeed * speedMult;
    state.player.isMoving = moving;
    state.player.moveSpeed = len * SPEED;
    ZS.Survival?.tickEndurance?.(dt, { sprinting, moving });

    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    // Horizontal movement
    let newX;
    let newZ;
    if (benchMove?.worldDir && typeof benchMove.worldDir === 'object') {
      const wx = benchMove.worldDir.x ?? 0;
      const wz = benchMove.worldDir.z ?? 0;
      const wlen = Math.hypot(wx, wz) || 1;
      newX = p.x + (wx / wlen) * SPEED * dt;
      newZ = p.z + (wz / wlen) * SPEED * dt;
    } else {
      newX = p.x + (_fwd.x * (-mz) + _right.x * mx) * SPEED * dt;
      newZ = p.z + (_fwd.z * (-mz) + _right.z * mx) * SPEED * dt;
    }

    if (ZS.SectorBounds?.clamp) {
      const bc = ZS.SectorBounds.clamp(newX, newZ);
      if (Math.abs(bc.x - newX) > 0.04 || Math.abs(bc.z - newZ) > 0.04) {
        ZS.SectorBounds.onBlocked?.();
      }
      newX = bc.x;
      newZ = bc.z;
    } else {
      newX = Math.max(-295, Math.min(295, newX));
      newZ = Math.max(-295, Math.min(295, newZ));
    }

    // Collision avec arbres, rochers, murs — respecte la hauteur pour sauter par-dessus
    const benchNoclip = !!(benchMove && benchMove.noclip);
    const feetY = p.y - eyeH;
    const playerR = p.crouching ? PLAYER_R * 0.88 : PLAYER_R;
    if (!benchNoclip) {
    const colliders = ZS.getCollidersNear?.(newX, newZ, 30) || ZS.getColliders();

    for (const col of colliders) {
      if (col.type === 'seg') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        const resolved = ZS.resolveDecorSegmentCollision?.(col, newX, newZ, feetY, playerR);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else if (col.type === 'box') {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        const resolved = ZS.resolveDecorBoxCollision?.(col, newX, newZ, feetY, playerR);
        if (resolved) {
          newX = resolved.x;
          newZ = resolved.z;
        }
      } else {
        if (ZS.shouldSkipDecorSideCollision?.(col, feetY, p.y, p.velocityY, newX, newZ, playerR)) continue;
        // Cylindrique (arbres, rochers) — sautable si topY défini
        if (col.topY !== undefined && feetY >= col.topY - 0.05) continue;
        const dx   = newX - col.x;
        const dz   = newZ - col.z;
        const dist = Math.hypot(dx, dz);
        const min  = playerR + col.r;
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
    if (ZS.Network.resolveRemotePlayerCollision) {
      const out = ZS.Network.resolveRemotePlayerCollision(newX, newZ, PLAYER_R);
      newX = out.x;
      newZ = out.z;
    }
    }

    p.x = newX;
    p.z = newZ;

    const waterY   = ZS.getWaterSurface(p.x, p.z);
    const inRiver  = waterY !== null;
    const groundY  = (ZS.getStandHeight?.(p.x, p.z, p.y) ?? ZS.getEffectiveFloorHeight(p.x, p.z, p.y)) + eyeH;
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

    const bobAmp = (ZS.Options?.isFeature?.('headBob') !== false && moving && p.onGround && !_inWater && !p.crouching)
      ? 0.016 * Math.min(1, (p.moveSpeed || 0) / 5) * (sprinting ? 1.15 : 1)
      : 0;
    if (bobAmp > 0) _walkBobPhase += dt * (sprinting ? 11 : 9);
    const headBob = bobAmp > 0 ? Math.sin(_walkBobPhase) * bobAmp : 0;

    const targetFov = (sprinting && ZS.Options?.isFeature?.('sprintFov') !== false) ? 81 : 75;
    _camFov += (targetFov - _camFov) * Math.min(1, dt * 9);
    if (Math.abs(camera.fov - _camFov) > 0.05) {
      camera.fov = _camFov;
      camera.updateProjectionMatrix();
    }

    localAvatar.position.set(p.x, p.y - eyeH, p.z);
    localAvatar.rotation.y = state.camera.yaw;
    camera.position.set(p.x, p.y + headBob, p.z);
    camera.rotation.y = state.camera.yaw;
    camera.rotation.x = state.camera.pitch;

    p.rotY = state.camera.yaw;
    ZS.Network.sendMove(p.x, p.y, p.z, p.rotY);
  }
  // ── Items de test — un exemplaire de chaque item ─────────────────────────
  function _addTestItems() {
    // Inventaire de départ vide — les joueurs ne commencent avec rien.
  }

  ZS.Game = { tryInstallDoorLock };
}());
