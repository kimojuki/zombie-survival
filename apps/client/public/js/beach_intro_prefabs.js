// Prefabs intro plage v3 — piste monde + indices lisibles.
(function () {
  'use strict';

  function _add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function _sandMat() {
    return new THREE.MeshLambertMaterial({ color: 0xd4bc88 });
  }

  /** Traînée d'empreintes + corde dans le sable. */
  function _buildFootprintTrail(root) {
    const sand = _sandMat();
    const dark = new THREE.MeshLambertMaterial({ color: 0xb8a070 });
    const rope = new THREE.MeshLambertMaterial({ color: 0x6a5848 });

    for (let i = 0; i < 9; i++) {
      const lx = -0.72 + i * 0.2;
      const lz = -0.1 + (i % 2) * 0.18;
      _add(root, new THREE.BoxGeometry(0.16, 0.035, 0.22), dark, lx, 0.018, lz, 0, i * 0.08, 0);
      _add(root, new THREE.BoxGeometry(0.13, 0.03, 0.18), dark, lx + 0.28, 0.016, lz - 0.12, 0, -i * 0.06, 0);
    }
    const ropeMesh = _add(root, new THREE.CylinderGeometry(0.024, 0.024, 1.35, 6), rope, 0.45, 0.04, 0.06, 0, 0.4, 0.15);
    ropeMesh.scale.z = 1.2;
    _add(root, new THREE.BoxGeometry(1.05, 0.02, 0.48), sand, 0, 0.008, 0);
  }

  function _buildMessageBottle(root) {
    const glass = new THREE.MeshLambertMaterial({ color: 0x9ab8c8, transparent: true, opacity: 0.75 });
    const cork = new THREE.MeshLambertMaterial({ color: 0x8a6840 });
    const paper = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });

    _add(root, new THREE.CylinderGeometry(0.045, 0.055, 0.22, 10), glass, 0, 0.12, 0);
    _add(root, new THREE.CylinderGeometry(0.028, 0.028, 0.04, 8), cork, 0, 0.24, 0);
    const scroll = _add(root, new THREE.BoxGeometry(0.08, 0.01, 0.14), paper, 0.02, 0.08, 0.04, 0.2, 0.3, 0);
    scroll.castShadow = false;
    root.userData.isReadableSign = true;
    root.userData.signKind = 'intro_bottle_k';
  }

  function _addLitTorch(parent, x, y, z) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const wrapMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    _add(parent, new THREE.CylinderGeometry(0.05, 0.065, 0.62, 6), poleMat, x, y + 0.31, z);
    _add(parent, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), wrapMat, x, y + 0.66, z);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5a18 }),
    );
    flame.position.set(x, y + 0.82, z);
    parent.add(flame);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.45 }),
    );
    halo.position.set(x, y + 0.86, z);
    parent.add(halo);
    const light = new THREE.PointLight(0xff6620, 2.2, 16, 1.6);
    light.position.set(x, y + 0.84, z);
    parent.add(light);
    if (ZS.registerFireLight) {
      ZS.registerFireLight(light, flame, {
        baseIntensity: 2.2,
        onTick(t, flicker) {
          const s = 1 + flicker * 0.22;
          flame.scale.setScalar(s);
          halo.scale.setScalar(0.95 + flicker * 0.25);
        },
      });
    }
  }

  /** Cercle de pierres + torche allumée (veilleuse monde, toujours visible). */
  function _buildCampfireRing(root) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x7a7468 });
    const ash = new THREE.MeshLambertMaterial({ color: 0x3a3428 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      _add(root, new THREE.DodecahedronGeometry(0.1 + (i % 2) * 0.03, 0), stone,
        Math.cos(a) * 0.52, 0.06, Math.sin(a) * 0.52);
    }
    _add(root, new THREE.CylinderGeometry(0.32, 0.38, 0.05, 12), ash, 0, 0.03, 0);
    _addLitTorch(root, 0, 0.04, 0);
  }

  /** Jetée cassée — planches basses sur le sable (pas un meuble retourné). */
  function _buildPierWreck(root) {
    const M = ZS.CampTextures?.materials?.();
    const wood = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const plank = M ? M.woodFine(0x8a6848) : new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    const wet = new THREE.MeshLambertMaterial({ color: 0x5a4838 });

    for (let i = 0; i < 4; i++) {
      _add(root, new THREE.BoxGeometry(0.12, 0.35, 0.12), wood, -0.55 + i * 0.38, 0.17, -0.22 + (i % 2) * 0.44, 0.08, 0, 0);
    }
    _add(root, new THREE.BoxGeometry(1.75, 0.07, 0.38), plank, 0.1, 0.1, 0.05, 0, 0.15, 0.04);
    _add(root, new THREE.BoxGeometry(1.2, 0.06, 0.28), wet, -0.15, 0.07, -0.18, 0.12, -0.25, 0);
    _add(root, new THREE.BoxGeometry(0.55, 0.05, 0.22), plank, 0.55, 0.08, 0.22, 0.2, 0.6, 0.05);
    _add(root, new THREE.BoxGeometry(0.4, 0.05, 0.18), plank, -0.62, 0.06, 0.28, 0.15, -0.35, 0);
  }

  /** Note carbonisée sur pierre (spawn personnel). */
  function _buildBurntNote(root) {
    const rock = new THREE.MeshLambertMaterial({ color: 0x6a6458 });
    const paper = new THREE.MeshLambertMaterial({ color: 0x2a2218 });
    _add(root, new THREE.DodecahedronGeometry(0.14, 0), rock, 0, 0.08, 0);
    const note = _add(root, new THREE.BoxGeometry(0.18, 0.008, 0.14), paper, 0, 0.17, 0.02, -0.2, 0.15, 0);
    note.castShadow = false;
    root.userData.isReadableSign = true;
    root.userData.signKind = 'intro_burnt_note_k';
  }

  window.ZS = window.ZS || {};
  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('spawn_beach_footprint_trail', { build: _buildFootprintTrail });
    ZS.registerDecorPrefab('spawn_beach_message_bottle', { build: _buildMessageBottle });
    ZS.registerDecorPrefab('spawn_beach_campfire_ring', { build: _buildCampfireRing });
    ZS.registerDecorPrefab('spawn_beach_pier_wreck', { build: _buildPierWreck });
    ZS.registerDecorPrefab('spawn_beach_burnt_note', { build: _buildBurntNote });
  }
}());
