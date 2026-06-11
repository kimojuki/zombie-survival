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

  /** Cercle de pierres + torche allumée (veilleuse monde — ramassable via E en intro). */
  function _buildCampfireRing(root) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x7a7468 });
    const ash = new THREE.MeshLambertMaterial({ color: 0x3a3428 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      _add(root, new THREE.DodecahedronGeometry(0.1 + (i % 2) * 0.03, 0), stone,
        Math.cos(a) * 0.52, 0.06, Math.sin(a) * 0.52);
    }
    _add(root, new THREE.CylinderGeometry(0.32, 0.38, 0.05, 12), ash, 0, 0.03, 0);
    const torchWrap = new THREE.Group();
    torchWrap.name = 'introCampfireTorch';
    root.add(torchWrap);
    _addLitTorch(torchWrap, 0, 0.04, 0);
    root.userData.introCampfireTorch = torchWrap;
  }

  function setIntroCampfireTorchVisible(root, on) {
    const g = root?.userData?.introCampfireTorch
      || root?.getObjectByName?.('introCampfireTorch');
    if (g) g.visible = !!on;
  }

  function syncIntroCampfireTorchVisibility() {
    const beats = ZS.Scenario?.getIntroBeats?.();
    const hide = !ZS.Scenario?.isActive?.()
      || !!beats?.pickedTorch
      || !!ZS.Inventory?.hasItemType?.('tool_torche');
    ZS.Network?.forEachDecor?.((_id, entry) => {
      if (entry?.data?.prefabId !== 'spawn_beach_campfire_ring') return;
      setIntroCampfireTorchVisible(entry.root, !hide);
    });
  }

  /** Coque de barque échouée — canot de sauvetage sur le sable. */
  function _buildBoatHullWreck(root) {
    const M = ZS.CampTextures?.materials?.();
    const hull = M ? M.woodFine(0x7a5840) : new THREE.MeshLambertMaterial({ color: 0x7a5840 });
    const wet = new THREE.MeshLambertMaterial({ color: 0x4a6858 });
    const inner = new THREE.MeshLambertMaterial({ color: 0x5a4030 });

    root.rotation.z = 0.08;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.72), hull);
    body.position.set(0, 0.22, 0);
    body.castShadow = true;
    root.add(body);

    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 4), hull);
    bow.rotation.z = -Math.PI / 2;
    bow.position.set(1.08, 0.18, 0);
    bow.castShadow = true;
    root.add(bow);

    const stern = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.68), wet);
    stern.position.set(-0.98, 0.16, 0);
    root.add(stern);

    _add(root, new THREE.BoxGeometry(1.55, 0.06, 0.58), inner, 0, 0.38, 0, 0.12, 0, 0);
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5), hull, -0.55, 0.42, 0.32, 0.15, 0.4, 0.1);
    _add(root, new THREE.CylinderGeometry(0.04, 0.05, 0.48, 5), hull, -0.42, 0.38, -0.28, 0.1, -0.25, 0.08);

    const rope = new THREE.MeshLambertMaterial({ color: 0x6a5848 });
    _add(root, new THREE.CylinderGeometry(0.022, 0.022, 1.1, 5), rope, 0.15, 0.08, 0.38, Math.PI / 2, 0.55, 0.2);
  }

  /** Bateau de pêche — échoué sur un rocher au large (impact + coque brisée). */
  function _buildOffshoreWreck(root) {
    const M = ZS.CampTextures?.materials?.();
    const hull = M ? M.woodFine(0x4a3828) : new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    const hullDark = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
    const hullBreached = new THREE.MeshLambertMaterial({ color: 0x1a1814 });
    const cabin = new THREE.MeshLambertMaterial({ color: 0xc8c4b8 });
    const rust = new THREE.MeshLambertMaterial({ color: 0x6a4030 });
    const mast = new THREE.MeshLambertMaterial({ color: 0x5a4838 });
    const rockWet = new THREE.MeshLambertMaterial({ color: 0x5a6868 });
    const rockDry = new THREE.MeshLambertMaterial({ color: 0x7a7a72 });
    const rockDark = new THREE.MeshLambertMaterial({ color: 0x3a4448 });
    const algae = new THREE.MeshLambertMaterial({ color: 0x3a5848 });
    const splinter = M ? M.woodPole(0x6a5038) : new THREE.MeshLambertMaterial({ color: 0x6a5038 });

    // — Récif (hauteur d'eau locale ≈ y 0) —
    const reef = new THREE.Group();
    reef.name = 'offshoreReef';
    const reefSpecs = [
      { g: [2.1, 1.45, 1.65], p: [2.05, -0.15, 0.05], r: [0.08, 0.42, 0.12], m: rockWet },
      { g: [1.55, 1.05, 1.35], p: [1.35, -0.35, -0.55], r: [0.15, -0.25, 0.22], m: rockDark },
      { g: [1.25, 0.85, 1.1], p: [1.65, -0.42, 0.62], r: [-0.1, 0.55, -0.18], m: rockWet },
      { g: [0.95, 0.55, 0.8], p: [2.45, 0.12, 0.18], r: [0.22, 0.15, 0.35], m: rockDry },
      { g: [0.7, 0.42, 0.65], p: [1.05, -0.48, 0.35], r: [0, 0.3, 0], m: rockDark },
      { g: [0.55, 0.35, 0.5], p: [2.15, 0.28, -0.42], r: [0.35, -0.2, 0.1], m: rockDry },
      { g: [1.8, 0.22, 1.4], p: [1.75, -0.52, 0], r: [0, 0.1, 0], m: algae },
    ];
    for (const s of reefSpecs) {
      const rock = new THREE.Mesh(new THREE.BoxGeometry(...s.g), s.m);
      rock.position.set(...s.p);
      rock.rotation.set(...s.r);
      rock.castShadow = true;
      rock.receiveShadow = true;
      reef.add(rock);
    }
    root.add(reef);

    // — Coque heurtée, couchée sur le récif (proue écrasée) —
    const boat = new THREE.Group();
    boat.name = 'offshoreBoat';
    boat.rotation.set(-0.06, 0, 0.52);
    boat.position.set(-0.35, 0.08, 0);

    const body = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.28, 2.28), hull);
    body.position.set(-0.15, 0.62, 0);
    body.castShadow = true;
    boat.add(body);

    const bowIntact = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 5), hull);
    bowIntact.rotation.z = Math.PI / 2;
    bowIntact.position.set(2.55, 0.48, 0);
    boat.add(bowIntact);

    const bowCrush = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 1.85), hullDark);
    bowCrush.position.set(3.35, 0.38, 0);
    bowCrush.rotation.set(0, 0, -0.35);
    boat.add(bowCrush);

    const bowSplinter1 = _add(boat, new THREE.BoxGeometry(0.35, 0.08, 0.22), splinter,
      3.55, 0.72, 0.42, 0.5, 0.8, 0.4);
    const bowSplinter2 = _add(boat, new THREE.BoxGeometry(0.28, 0.07, 0.18), splinter,
      3.42, 0.55, -0.48, -0.35, 1.1, -0.25);
    bowSplinter1.castShadow = false;
    bowSplinter2.castShadow = false;

    const breach = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 1.05), hullBreached);
    breach.position.set(2.85, 0.35, 0.95);
    breach.rotation.y = 0.2;
    boat.add(breach);

    const stern = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.88, 2.12), hullDark);
    stern.position.set(-3.18, 0.38, 0);
    boat.add(stern);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.92), rust);
    deck.position.set(0.2, 1.02, 0);
    deck.rotation.z = -0.08;
    boat.add(deck);

    const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.18, 1.48), cabin);
    wheelhouse.position.set(-0.65, 1.62, 0);
    wheelhouse.rotation.z = -0.18;
    wheelhouse.castShadow = true;
    boat.add(wheelhouse);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.09, 1.55), hullDark);
    roof.position.set(-0.62, 2.22, 0);
    roof.rotation.z = -0.22;
    boat.add(roof);

    const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 2.2, 6), mast);
    mastPole.position.set(0.85, 1.85, 0.28);
    mastPole.rotation.z = 0.95;
    boat.add(mastPole);

    const mastStub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 5), mast);
    mastStub.position.set(1.55, 2.05, 0.42);
    mastStub.rotation.z = 1.35;
    boat.add(mastStub);

    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.85, 5), mast);
    boom.position.set(1.15, 0.55, 0.15);
    boom.rotation.set(1.15, 0.4, 0.85);
    boat.add(boom);

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.68, 6), rust);
    stack.position.set(-1.92, 1.38, 0.48);
    stack.rotation.z = 0.28;
    boat.add(stack);

    for (let i = 0; i < 4; i++) {
      _add(boat, new THREE.BoxGeometry(0.48, 0.07, 0.16), hullDark,
        -2.05 + i * 0.58, 0.12 - i * 0.05, 1.02, 0.2, 0.06, 0.08);
    }

    root.add(boat);

    // — Débris flottants / éclats dans l'eau —
    const debris = new THREE.Group();
    debris.name = 'offshoreDebris';
    const floaters = [
      [0.45, -0.08, 1.35, 0.15, 0.6, 0.2, 0.42],
      [-1.2, -0.12, -1.15, -0.2, 1.2, 0.35, 0.48],
      [2.85, -0.06, -0.85, 0.35, -0.5, 0.15, 0.38],
      [-2.4, -0.1, 0.55, 0.1, 2.1, -0.25, 0.52],
      [3.15, -0.04, 0.55, 0.5, 0.9, 0.4, 0.44],
    ];
    for (const [x, y, z, rx, ry, rz, w] of floaters) {
      _add(debris, new THREE.BoxGeometry(w, 0.05, 0.14), splinter,
        x, y, z, rx, ry, rz);
    }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 7), rust);
    barrel.position.set(-1.85, -0.05, -0.95);
    barrel.rotation.set(Math.PI / 2, 0.6, 0.2);
    debris.add(barrel);
    root.add(debris);

    root.userData.isOffshoreWreck = true;
    root.userData.collide = false;
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
  ZS.BeachIntroPrefabs = { setIntroCampfireTorchVisible, syncIntroCampfireTorchVisibility };
  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('spawn_beach_footprint_trail', { build: _buildFootprintTrail });
    ZS.registerDecorPrefab('spawn_beach_message_bottle', { build: _buildMessageBottle });
    ZS.registerDecorPrefab('spawn_beach_campfire_ring', { build: _buildCampfireRing });
    ZS.registerDecorPrefab('spawn_beach_pier_wreck', { build: _buildPierWreck });
    ZS.registerDecorPrefab('spawn_beach_burnt_note', { build: _buildBurntNote });
    ZS.registerDecorPrefab('spawn_beach_boat_hull', {
      build: _buildBoatHullWreck,
      label: 'Canot de sauvetage',
      category: 'plage',
      desc: 'Petite coque échouée — canot utilisé pour gagner le rivage.',
    });
    ZS.registerDecorPrefab('spawn_beach_offshore_wreck', {
      build: _buildOffshoreWreck,
      label: 'Bateau sur récif (au large)',
      category: 'plage',
      desc: 'Épave échouée sur rocher visible — impact proue, coque brisée.',
    });
  }
}());
