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
      x: -200, y: 5, z: -105, rotY: Math.PI,
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

  // ── Overlay eau ───────────────────────────────────────────────────────────
  const _waterOverlay = document.createElement('div');
  Object.assign(_waterOverlay.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '40',
    background: 'linear-gradient(to top, rgba(10,60,140,0.55) 0%, rgba(10,60,140,0.18) 40%, transparent 70%)',
    opacity: '0', transition: 'opacity 0.35s ease',
  });
  document.body.appendChild(_waterOverlay);
  let _inWater = false;

  function _updateWaterEffect(px, pz) {
    const waterY = ZS.getWaterSurface(px, pz);
    const nowIn  = waterY !== null;
    if (nowIn === _inWater) return;
    _inWater = nowIn;
    _waterOverlay.style.opacity = nowIn ? '1' : '0';
  }

  // ── Build world ───────────────────────────────────────────────────────────
  ZS.buildWorld(scene);
  ZS.Zombies.init(scene);

  // FPS arms attached to camera
  const fpsArms = ZS.createFPSArms();
  camera.add(fpsArms);
  // Expose globally pour que l'inventaire puisse changer l'item en main
  ZS.setHandItem = (type) => ZS.updateHandItem(fpsArms, type);

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

  // Transmet la géométrie de collision au serveur (physique des zombies côté serveur)
  socket.emit('world-colliders', ZS.getColliders());

  // ── UI ────────────────────────────────────────────────────────────────────
  try { ZS.UI.init(state); } catch (e) { console.error('UI init:', e); }
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setKills(state.player.kills);

  // ── Survival ──────────────────────────────────────────────────────────────
  ZS.Survival.init(state);

  // ── Inventory ─────────────────────────────────────────────────────────────
  ZS.Inventory.init(state, scene, socket);
  ZS.Map.init(state, scene);
  ZS.Craft.init();
  _addTestItems();

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

  // ── Combat : tir, mêlée, abattage d'arbres ─────────────────────────────────
  const FIRE_INTERVAL = {
    wpn_pistolet: 0.28, pistol: 0.28, wpn_fusil_pompe: 0.85, wpn_fusil_chasse: 1.10,
  };
  let _lastAttack  = 0;     // s — dernière attaque
  let _reloadUntil = 0;     // s — fin du rechargement en cours
  let _swing = null;        // animation arme : { start, dur, kind }
  const _now = () => performance.now() / 1000;

  function _muzzleFlash() {
    const holder = fpsArms.getObjectByName('itemHolder');
    if (!holder) return;
    holder.traverse((c) => {
      if (c.isMesh && c.material && c.material.color) {
        const orig = c.material.color.getHex();
        c.material.color.set(0xffee88);
        setTimeout(() => { try { c.material.color.setHex(orig); } catch (_) {} }, 55);
      }
    });
  }

  function _sendShot(baseDir, disp, dmg, range, radius) {
    const dx = baseDir.x + (Math.random() - 0.5) * disp;
    const dz = baseDir.z + (Math.random() - 0.5) * disp;
    ZS.Network.sendShoot(camera.position.x, camera.position.z, dx, dz, dmg, range, radius);
  }

  function _startReload(def) {
    if (_now() < _reloadUntil) return;
    if (ZS.Inventory.getWeaponAmmo() >= (def.capacite_chargeur || 12)) return;
    if (ZS.Inventory.countItem(def.type_munition_accepte) <= 0) { ZS.UI.showNotif('Pas de munitions'); return; }
    const t = def.temps_rechargement || 2;
    _reloadUntil = _now() + t;
    ZS.UI.showNotif('Rechargement…');
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
    _playSwing(0.12, 'recoil');
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

  function _meleeSwing(item, def) {
    const n = _now();
    if (n - _lastAttack < (def.cadence_attaque || 0.5)) return;
    _lastAttack = n;
    _playSwing((def.cadence_attaque || 0.5) * 0.55, 'melee');

    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const range = def.portee_metre || 1.2;

    // Hache : tenter d'abattre un arbre devant soi
    if ((item.type === 'wpn_hache_combat' || item.type === 'tool_hachette') && ZS.chopTree) {
      const dmg  = item.type === 'tool_hachette' ? 2 : 1;
      const chop = ZS.chopTree(camera.position.x, camera.position.z, dir.x, dir.z, Math.max(range + 1.2, 2.6), dmg);
      if (chop && chop.felled) {
        ZS.Inventory.addItem('res_bois_brut', 3);
        ZS.UI.showNotif('Arbre abattu : +3 Bois brut');
      }
    }

    // Frappe les zombies dans la portée (rayon latéral large = coup de mêlée balayant)
    ZS.Network.sendShoot(camera.position.x, camera.position.z, dir.x, dir.z, def.degats_impact || 10, range, 1.6);
    ZS.Inventory.wearActiveWeapon();
  }

  function attack() {
    if (state.player.dead) return;
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (!def) return;
    if (def.category === 'firearm') { _fireGun(item, def); return; }
    if (def.category === 'melee')   { _meleeSwing(item, def); return; }
    if (def.category === 'tool' && item.type === 'tool_hachette') { _meleeSwing(item, def); return; }
  }

  function _playSwing(dur, kind) { _swing = { start: _now(), dur, kind }; }
  function _tickSwing() {
    if (!_swing) return;
    const e = (_now() - _swing.start) / _swing.dur;
    if (e >= 1) { fpsArms.position.z = 0; fpsArms.rotation.set(0, 0, 0); _swing = null; return; }
    const s = Math.sin(e * Math.PI);
    if (_swing.kind === 'recoil') {
      fpsArms.position.z = s * 0.05;
      fpsArms.rotation.x = -s * 0.12;
    } else {
      fpsArms.rotation.x = -s * 0.95;
      fpsArms.rotation.z = s * 0.30;
    }
  }

  state.onShoot  = attack;
  state.onReload = () => {
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (def && def.category === 'firearm') _startReload(def);
  };
  state.onJump   = () => { state.jumpPressed = true; };
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && pointerLocked) attack();
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
    ZS.Survival.reset();

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
      _updateWaterEffect(state.player.x, state.player.z);
    }
    _tickSwing();
    ZS.tickDayNight(dt);
    ZS.Zombies.tick(dt);
    ZS.Network.tick(dt);
    ZS.Inventory.tick(dt);
    ZS.Survival.tick(dt);
    ZS.Map.tick();
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

    // World bounds (map 600×600 → range -300…+300)
    newX = Math.max(-295, Math.min(295, newX));
    newZ = Math.max(-295, Math.min(295, newZ));

    // Collision avec arbres, rochers, murs — respecte la hauteur pour sauter par-dessus
    const colliders = ZS.getColliders();
    const feetY = p.y - 1.7; // Y des pieds du joueur

    for (const col of colliders) {
      // Ignore les colliders trop éloignés (optimisation — 30² = 900)
      const _cdx = (col.cx !== undefined ? col.cx : col.x) - newX;
      const _cdz = (col.cz !== undefined ? col.cz : col.z) - newZ;
      if (_cdx * _cdx + _cdz * _cdz > 900) continue;

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
  // ── Items de test — un exemplaire de chaque item ─────────────────────────
  function _addTestItems() {
    const testItems = [
      // Nourriture
      ['food_eau_bouteille', 5], ['food_boisson_energisante', 3],
      ['food_conserves', 5], ['food_haricots_boite', 5],
      ['food_soupe_conserve', 5], ['food_pain', 3],
      ['food_fruits', 5], ['food_viande_crue', 3], ['food_viande_cuite', 3],
      // Médical
      ['med_bandage', 5], ['med_kit_soin', 2], ['med_seringue_anti_infection', 3],
      // Armes mêlée
      ['wpn_couteau', 1], ['wpn_hache_combat', 1],
      ['wpn_barre_fer', 1], ['wpn_machette', 1],
      // Armes à feu
      ['wpn_pistolet', 1], ['wpn_fusil_pompe', 1], ['wpn_fusil_chasse', 1],
      // Munitions
      ['ammo_pistolet', 30], ['ammo_fusil_pompe', 12], ['ammo_fusil_chasse', 10],
      // Équipement
      ['eq_grand_sac', 1], ['eq_casque', 1], ['eq_gilet_protection', 1], ['eq_gants', 1],
      // Ressources
      ['res_bois_brut', 50], ['res_planche', 30], ['res_ferraille', 20],
      ['res_metal', 20], ['res_clous', 100], ['res_ruban_adhesif', 10],
      ['res_chiffon', 20], ['res_corde', 15],
      // Outils
      ['tool_marteau', 1], ['tool_hachette', 1], ['tool_pioche', 1], ['tool_torche', 1],
      // Structures
      ['struct_mur_bois', 5], ['struct_porte_bois', 3],
      ['struct_plancher_bois', 5], ['struct_escalier_bois', 3],
    ];
    for (const [type, qty] of testItems) ZS.Inventory.addItem(type, qty);
  }
}());
