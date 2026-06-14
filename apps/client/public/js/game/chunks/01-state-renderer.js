// State + Three.js + overlay eau — extrait de game.js (async IIFE)
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
