// Chêne, pin, bouleau
function buildOak(root, opts) {
    const rng = _rngFromOpts(opts);
    const trunkH = 3.4 + rng() * 2.6;
    const trunkR = 0.14 + rng() * 0.07;
    const trunkMat = _trunkMat(0xe8d8b8);
    _stackTrunk(root, trunkMat, trunkH, trunkR * 1.35, trunkR * 0.7, 3 + Math.floor(rng() * 2), rng);
    _addRoots(root, trunkMat, trunkR * 1.2, rng);

    const leafCols = [0xa0d070, 0x90c060, 0xb0e080, 0x80b858, 0x98c868];
    const lm1 = _leafMat(_pickLeafTint(rng, leafCols));
    const lm2 = _leafMat(_pickLeafTint(rng, leafCols));
    const crownY = trunkH * 0.72 + rng() * 0.4;

    const hub = new THREE.Mesh(
      _sphereGeo(trunkR * 2.2, 7, 6),
      _leafMat(_pickLeafTint(rng, leafCols)));
    hub.position.y = crownY;
    hub.scale.set(1.2, 0.75, 1.2);
    hub.castShadow = false;
    root.add(hub);

    const branchN = _detailCount(2, 3, 3, rng);
    for (let b = 0; b < branchN; b++) {
      const ang = (b / branchN) * Math.PI * 2 + rng() * 0.6;
      const bLen = 0.55 + rng() * 0.75;
      const bY = trunkH * (0.42 + rng() * 0.28);
      const branch = new THREE.Mesh(
        _cylGeo(0.04, 0.07, bLen, 5), trunkMat);
      branch.position.set(Math.cos(ang) * bLen * 0.4, bY, Math.sin(ang) * bLen * 0.4);
      branch.rotation.set(0.2, ang, Math.PI / 2 + (rng() - 0.5) * 0.35);
      branch.castShadow = true;
      root.add(branch);
      _addLeafBlob(root, b % 2 ? lm1 : lm2,
        Math.cos(ang) * bLen * 0.85, bY + 0.15, Math.sin(ang) * bLen * 0.85,
        0.45 + rng() * 0.35, 0.65 + rng() * 0.2);
    }

    const leafN = _detailCount(4, 5, 4, rng);
    for (let i = 0; i < leafN; i++) {
      const r = 0.75 + rng() * 1.1;
      const ang = (i / leafN) * Math.PI * 2 + rng() * 0.9;
      const dist = 0.35 + rng() * 1.3;
      _addLeafBlob(root, i % 2 ? lm1 : lm2,
        Math.cos(ang) * dist, crownY - 0.2 + rng() * 1.6, Math.sin(ang) * dist,
        r, 0.68 + rng() * 0.28);
    }
    const lowN = _detailCount(1, 2, 2, rng);
    for (let i = 0; i < lowN; i++) {
      const ang = rng() * Math.PI * 2;
      _addLeafBlob(root, lm2,
        Math.cos(ang) * (0.5 + rng() * 0.4), trunkH * (0.35 + rng() * 0.2), Math.sin(ang) * (0.5 + rng() * 0.4),
        0.35 + rng() * 0.25, 0.55);
    }
    if (_detailMul() > 0.6) _addGroundTuft(root, rng, _pickLeafTint(rng, leafCols));
    root.userData.treeKind = 'oak';
  }

  function buildPine(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.5 + rng() * 4.5;
    const trunkMat = _trunkMat(0xd8c8a8);
    _stackTrunk(root, trunkMat, h, 0.22, 0.07, 4, rng);
    _addRoots(root, trunkMat, 0.18, rng);

    const pCols = [0x68a858, 0x78b868, 0x5a9850, 0x88c070, 0x70b060];
    const pMat = _leafMat(_pickLeafTint(rng, pCols));
    const pMat2 = _leafMat(_pickLeafTint(rng, pCols));
    const layers = _detailCount(4, 4, 3, rng);
    const leanDetail = _detailMul() > 0.6;
    for (let i = 0; i < layers; i++) {
      const t = i / Math.max(1, layers - 1);
      const r = (1.4 - t * 0.88) * (0.85 + rng() * 0.45);
      const cH = 1.2 + rng() * 0.75;
      const yP = h * (0.22 + t * 0.64);
      const rotY = i * 0.55 + rng() * 0.4;
      const c1 = new THREE.Mesh(_coneGeo(r, cH, 9), i % 2 ? pMat : pMat2);
      c1.position.y = yP;
      c1.rotation.y = rotY;
      c1.castShadow = false;
      c1.receiveShadow = true;
      root.add(c1);
      if (leanDetail && i < layers - 1) {
        const c2 = new THREE.Mesh(_coneGeo(r * 0.62, cH * 0.5, 8), pMat);
        c2.position.y = yP + cH * 0.36;
        c2.rotation.y = rotY + 0.8;
        c2.castShadow = false;
        root.add(c2);
      }
      if (leanDetail && i > 0 && i < layers - 1 && rng() < 0.7) {
        for (let s = 0; s < 2; s++) {
          const sa = rotY + (s ? Math.PI : 0) + rng() * 0.5;
          const nub = new THREE.Mesh(_coneGeo(r * 0.28, 0.45 + rng() * 0.3, 6), pMat2);
          nub.position.set(Math.cos(sa) * r * 0.55, yP - cH * 0.15, Math.sin(sa) * r * 0.55);
          nub.rotation.z = Math.PI / 2 + 0.35;
          nub.rotation.y = sa;
          nub.castShadow = false;
          root.add(nub);
        }
      }
    }
    const tip = new THREE.Mesh(_coneGeo(0.12, 0.9 + rng() * 0.5, 6), pMat);
    tip.position.y = h * 0.92;
    tip.castShadow = false;
    root.add(tip);
    _addGroundTuft(root, rng, 0x6a9850);
    root.userData.treeKind = 'pine';
  }

  function buildBirch(root, opts) {
    const rng = _rngFromOpts(opts);
    const h = 5.0 + rng() * 3.0;
    const trunkMat = _trunkMat(0xf0ece0);
    const markMat = new THREE.MeshLambertMaterial({ color: 0x403028 });
    _stackTrunk(root, trunkMat, h, 0.13, 0.06, 3, rng);

    for (let m = 0; m < 7 + Math.floor(rng() * 4); m++) {
      const my = h * (0.12 + m * (0.72 / 10) + rng() * 0.04);
      const mw = 0.06 + rng() * 0.05;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.04 + rng() * 0.05, 0.09), markMat);
      mark.position.y = my;
      mark.rotation.y = rng() * Math.PI;
      root.add(mark);
    }

    const lCols = [0xa8d848, 0xb8e850, 0x98c838, 0xc8d858, 0x88c040];
    const lMat = _leafMat(_pickLeafTint(rng, lCols));
    const lMat2 = _leafMat(_pickLeafTint(rng, lCols));

    const branchN = 4 + Math.floor(rng() * 3);
    for (let b = 0; b < branchN; b++) {
      const ang = (b / branchN) * Math.PI * 2 + rng() * 0.5;
      const bLen = 0.7 + rng() * 0.9;
      const bY = h * (0.55 + rng() * 0.35);
      const twig = new THREE.Mesh(
        _cylGeo(0.025, 0.04, bLen, 5), trunkMat);
      twig.position.set(Math.cos(ang) * bLen * 0.35, bY, Math.sin(ang) * bLen * 0.35);
      twig.rotation.set(0.45 + rng() * 0.25, ang, Math.PI / 2.2);
      twig.castShadow = true;
      root.add(twig);
      const droop = new THREE.Mesh(
        _sphereGeo(0.28 + rng() * 0.22, 6, 5), b % 2 ? lMat : lMat2);
      droop.position.set(
        Math.cos(ang) * bLen * 0.75, bY - 0.25 - rng() * 0.2, Math.sin(ang) * bLen * 0.75);
      droop.scale.set(1.1, 0.55, 1.0);
      droop.castShadow = false;
      root.add(droop);
    }

    for (let i = 0; i < 8 + Math.floor(rng() * 4); i++) {
      const r = 0.45 + rng() * 0.65;
      const ang = rng() * Math.PI * 2;
      const dist = 0.25 + rng() * 0.85;
      const leaf = new THREE.Mesh(_dodecaGeo(r), i % 2 ? lMat : lMat2);
      leaf.position.set(Math.cos(ang) * dist, h * 0.7 + rng() * h * 0.26, Math.sin(ang) * dist);
      leaf.scale.set(1.25, 0.58 + rng() * 0.22, 1.05);
      leaf.castShadow = false;
      leaf.receiveShadow = true;
      root.add(leaf);
    }
    _addGroundTuft(root, rng, _pickLeafTint(rng, lCols));
    root.userData.treeKind = 'birch';
  }

  function _palmFrondMat(tint) {
    return _leafMat(tint);
  }
