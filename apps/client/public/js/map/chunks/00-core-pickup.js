// Init + pickup items
let _state, _scene, _itemMesh = null;
  let _found = localStorage.getItem('zs_map_found') === '1';
  let _open = false;
  let _drawAcc = 0;
  let _lastDrawX = NaN;
  let _lastDrawZ = NaN;
  const _DRAW_MIN_DT = 0.1;
  const _MOVE_REDRAW = 0.2;

  function _worldCfg() {
    const w = ZS.SectorBounds?.MAP_WORLD;
    return w || { scale: 1.35, offsetX: 310, offsetZ: 300 };
  }

  function cx(x) {
    const w = _worldCfg();
    return (x + w.offsetX) * w.scale;
  }

  function cy(z) {
    const w = _worldCfg();
    return (z + w.offsetZ) * w.scale;
  }

  function init(state, scene) {
    _state = state;
    _scene = scene;
    if (!_found) _spawnItem();
    _bindKeys();
  }

  function tick(dt) {
    if (_itemMesh) {
      _itemMesh.rotation.y += 0.018;
      _itemMesh.position.y = _itemMesh.userData.baseY + Math.sin(Date.now() * 0.002) * 0.12;
    }
    if (!_found && _itemMesh) {
      if (Math.hypot(_state.player.x - SPAWN_X, _state.player.z - SPAWN_Z) < 2.2) _pickup();
    }
    if (!_open) return;
    const px = _state?.player?.x ?? 0;
    const pz = _state?.player?.z ?? 0;
    const moved = Math.hypot(px - _lastDrawX, pz - _lastDrawZ) >= _MOVE_REDRAW;
    _drawAcc += dt || 0;
    if (moved || _drawAcc >= _DRAW_MIN_DT) {
      _drawAcc = 0;
      _lastDrawX = px;
      _lastDrawZ = pz;
      _draw();
    }
  }

  function _spawnItem() {
    const y = ZS.getTerrainHeight(SPAWN_X, SPAWN_Z);
    const g = new THREE.Group();
    const pm = new THREE.MeshLambertMaterial({ color: 0xd4b468 });
    const dm = new THREE.MeshLambertMaterial({ color: 0x8a6030 });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.34), pm);
    g.add(sheet);
    for (const [ox, oz] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), dm);
      c.position.set(ox, 0.01, oz);
      g.add(c);
    }
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.03, 12),
      new THREE.MeshLambertMaterial({ color: 0xffdd44, transparent: true, opacity: 0.28 }),
    );
    ring.position.y = 0.22;
    g.add(ring);
    const pl = new THREE.PointLight(0xffcc44, 1.8, 6);
    pl.position.y = 0.5;
    g.add(pl);
    g.position.set(SPAWN_X, y + 0.65, SPAWN_Z);
    g.userData.baseY = y + 0.65;
    _scene.add(g);
    _itemMesh = g;
  }

  function _pickup() {
    _found = true;
    localStorage.setItem('zs_map_found', '1');
    _scene.remove(_itemMesh);
    _itemMesh = null;
    ZS.Inventory.receivePickup('map');
  }

  function toggleMap() { _open ? _close() : _open_(); }

  function _open_() {
    _open = true;
    _drawAcc = _DRAW_MIN_DT;
    _lastDrawX = NaN;
    _lastDrawZ = NaN;
    document.getElementById('map-overlay').style.display = 'flex';
    _draw();
    ZS.onUiPanelOpen?.();
  }

  function _close() {
    _open = false;
    _drawAcc = 0;
    document.getElementById('map-overlay').style.display = 'none';
    ZS.onUiPanelClose?.();
  }

  function _onKeyDown(e) {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.() || ZS.Rcon?.isOpen?.()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'Escape' && _open) {
      e.preventDefault();
      _close();
      return;
    }
    if (e.code !== 'KeyM') return;
    if (e.repeat) return;
    e.preventDefault();
    toggleMap();
  }

  function _bindKeys() {
    document.addEventListener('keydown', _onKeyDown);
    const closeBtn = document.getElementById('map-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', _close);
      closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _close(); }, { passive: false });
    }
    const overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) _close(); });
      overlay.addEventListener('touchstart', (e) => { if (e.target === overlay) _close(); }, { passive: true });
    }
  }
