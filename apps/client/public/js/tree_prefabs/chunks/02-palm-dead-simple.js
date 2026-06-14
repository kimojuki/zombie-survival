// Palmier, mort, simple
function buildPalm(root, opts) {
    const rng = _rngFromOpts(opts);
    const lean = (rng() - 0.5) * 0.07;
    const h = 4.8 + rng() * 2.4;
    const trunkR = 0.13 + rng() * 0.05;
    const trunkMat = _trunkMat(0xf2e0c0);
    const scarMat = new THREE.MeshLambertMaterial({ color: 0x9a8868 });

    const segN = 5 + Math.floor(rng() * 2);
    const pieceH = h / segN;
    for (let s = 0; s < segN; s++) {
      const tBot = s / segN;
      const tTop = (s + 1) / segN;
      const rBot = trunkR * (1.14 - tBot * 0.22);
      const rTop = trunkR * (1.10 - tTop * 0.18);
      const leanS = lean * ((tBot + tTop) * 0.5);
      const seg = new THREE.Mesh(
        _cylGeo(rTop, rBot, pieceH, 8), trunkMat);
      seg.position.y = pieceH * s + pieceH * 0.5;
      seg.rotation.z = leanS;
      seg.castShadow = true;
      root.add(seg);
      if (s > 0) {
        const scarH = Math.min(0.07, pieceH * 0.12);
        const scar = new THREE.Mesh(
          _cylGeo(rBot * 1.05, rBot * 1.02, scarH, 8), scarMat);
        scar.position.y = pieceH * s;
        scar.rotation.z = leanS;
        scar.castShadow = true;
        root.add(scar);
      }
    }

    const crownY = h - pieceH * 0.12 + rng() * 0.08;
    const hub = new THREE.Mesh(
      _sphereGeo(trunkR * 1.5, 7, 6),
      _trackLitMat(new THREE.MeshLambertMaterial({
        map: _leafTex,
        color: 0x88c858,
        emissive: _LEAF_EMISSIVE,
        emissiveIntensity: 0.08,
      }), 0.08, _LEAF_EMISSIVE));
    hub.position.y = crownY;
    hub.scale.set(1.1, 0.5, 1.1);
    hub.rotation.z = lean * 0.5;
    root.add(hub);

    const frondCols = [0xa8e860, 0x98d850, 0xb8f070, 0x88c848];
    const frondN = _detailCount(5, 6, 3, rng);
    const palmDetail = _detailMul() > 0.55;
    for (let i = 0; i < frondN; i++) {
      const ang = (i / frondN) * Math.PI * 2 + rng() * 0.25;
      const len = 2.2 + rng() * 1.5;
      const tint = frondCols[Math.floor(rng() * frondCols.length)];
      const fMat = _palmFrondMat(tint);
      const frond = new THREE.Mesh(
        new THREE.PlaneGeometry(len, 0.5 + rng() * 0.22, 4, 1), fMat);
      frond.position.set(Math.cos(ang) * 0.1, crownY + 0.06, Math.sin(ang) * 0.1);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = ang;
      frond.rotation.x = -0.48 - rng() * 0.28;
      frond.rotation.z = lean * 0.35;
      frond.castShadow = false;
      frond.receiveShadow = true;
      root.add(frond);
      if (palmDetail && rng() < 0.55) {
        const sub = new THREE.Mesh(
          new THREE.PlaneGeometry(len * 0.78, 0.38, 3, 1), fMat);
        sub.position.copy(frond.position);
        sub.rotation.copy(frond.rotation);
        sub.rotation.x -= 0.18 + rng() * 0.14;
        sub.rotation.y += (rng() - 0.5) * 0.35;
        sub.castShadow = false;
        root.add(sub);
      }
    }

    const cocoMat = _trackLitMat(new THREE.MeshLambertMaterial({
      color: 0x8a6840,
      emissive: 0x181008,
      emissiveIntensity: 0.05,
    }), 0.05, 0x181008);
    const cocoN = 2 + Math.floor(rng() * 3);
    for (let c = 0; c < cocoN; c++) {
      const ca = (c / cocoN) * Math.PI * 2 + rng() * 0.8;
      const coco = new THREE.Mesh(
        _sphereGeo(0.1 + rng() * 0.04, 6, 5), cocoMat);
      coco.position.set(
        Math.cos(ca) * 0.22,
        crownY - 0.12 - rng() * 0.18,
        Math.sin(ca) * 0.22,
      );
      coco.castShadow = true;
      root.add(coco);
    }

    if (rng() < 0.55) {
      const tuftMat = _leafMat(0xc8d878);
      for (let g = 0; g < 3 + Math.floor(rng() * 3); g++) {
        const ga = rng() * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), tuftMat);
        blade.position.set(Math.cos(ga) * 0.35, 0.25, Math.sin(ga) * 0.35);
        blade.rotation.y = ga;
        blade.rotation.x = -0.2;
        blade.castShadow = false;
        root.add(blade);
      }
    }

    root.userData.treeKind = 'palm';
  }

  function buildDead(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 3.0 + rng() * 3.2;
    const mat = _trackLitMat(new THREE.MeshLambertMaterial({
      map: _barkTex,
      color: 0x6a5848,
      emissive: _TRUNK_EMISSIVE,
      emissiveIntensity: 0.05,
    }), 0.05, _TRUNK_EMISSIVE);
    _stackTrunk(root, mat, h, 0.16, 0.07, 3, rng);
    _addRoots(root, mat, 0.14, rng);
    for (let i = 0; i < 5 + Math.floor(rng() * 4); i++) {
      const ba = rng() * Math.PI * 2;
      const bl = 0.5 + rng() * 1.4;
      const by = h * (0.38 + rng() * 0.5);
      const br = new THREE.Mesh(_cylGeo(0.02, 0.05, bl, 4), mat);
      br.position.set(Math.cos(ba) * bl * 0.32, by, Math.sin(ba) * bl * 0.32);
      br.rotation.z = (rng() > 0.5 ? 1 : -1) * (Math.PI * 0.38 + rng() * 0.3);
      br.rotation.y = ba;
      br.castShadow = true;
      root.add(br);
      if (rng() < 0.35) {
        const snag = br.clone();
        snag.scale.setScalar(0.65);
        snag.rotation.z += (rng() > 0.5 ? 1 : -1) * 0.5;
        snag.position.y -= 0.15;
        root.add(snag);
      }
    }
    root.userData.treeKind = 'dead';
  }

  /** LOD léger (2 meshes) — arbres lointains / chargement différé. */
  function buildSimple(root, prefabId) {
    const kind = (prefabId || 'tree_oak').replace('tree_', '');
    const trunkColor = kind === 'birch' ? 0xd8d0c8 : kind === 'dead' ? 0x6a5a48 : 0x9a7a58;
    const trunkMat = _trunkMat(trunkColor);
    const trunkH = kind === 'pine' ? 4.4 : kind === 'palm' ? 3.8 : 3.4;
    const trunk = new THREE.Mesh(_cylGeo(0.32, 0.48, trunkH, 6), trunkMat);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = false;
    root.add(trunk);
    if (kind === 'dead') {
      const snag = new THREE.Mesh(_cylGeo(0.12, 0.22, 1.8, 5), trunkMat);
      snag.position.set(0.35, trunkH * 0.55, 0.1);
      snag.rotation.z = 0.65;
      snag.castShadow = false;
      root.add(snag);
    } else if (kind === 'pine') {
      const cone = new THREE.Mesh(_coneGeo(1.7, 3.8, 6), _leafMat(0x3a6a38));
      cone.position.y = trunkH + 1.6;
      cone.castShadow = false;
      root.add(cone);
    } else if (kind === 'palm') {
      const crown = new THREE.Mesh(_dodecaGeo(1.4), _leafMat(0x4a8a40));
      crown.position.y = trunkH + 1.1;
      crown.scale.y = 0.65;
      crown.castShadow = false;
      root.add(crown);
    } else {
      const leafTint = kind === 'birch' ? 0x9acc68 : 0x6aaa48;
      const blob = new THREE.Mesh(_dodecaGeo(1.55), _leafMat(leafTint));
      blob.position.y = trunkH + 1.25;
      blob.castShadow = false;
      root.add(blob);
    }
    root.userData.treeKind = kind;
  }
