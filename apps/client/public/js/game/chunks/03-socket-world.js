// Socket + build monde + avatar FPS + raycast — extrait de game.js (async IIFE)
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
