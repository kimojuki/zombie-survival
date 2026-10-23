// Prefabs S01 — station essence + panneau pont (enregistrés dans DECOR_PREFABS).
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

  function _buildGasStation(root) {
    const M = ZS.B?.M;
    const floor = M?.floor || new THREE.MeshLambertMaterial({ color: 0x888888 });
    const concrete = M?.concrete || new THREE.MeshLambertMaterial({ color: 0x9a9890 });
    const metal = M?.metal || new THREE.MeshLambertMaterial({ color: 0x7a7c80 });
    const rust = M?.rust || new THREE.MeshLambertMaterial({ color: 0x6a3820 });
    const roof = M?.roofGray || new THREE.MeshLambertMaterial({ color: 0x5a5a5a });

    _add(root, new THREE.BoxGeometry(8, 0.12, 6), floor, 0, 0.06, 0);
    _add(root, new THREE.BoxGeometry(8, 3.2, 0.2), concrete, 0, 1.65, 2.9);
    _add(root, new THREE.BoxGeometry(8, 3.2, 0.2), concrete, 0, 1.65, -2.9);
    _add(root, new THREE.BoxGeometry(0.2, 3.2, 5.8), concrete, 3.9, 1.65, 0);
    _add(root, new THREE.BoxGeometry(0.2, 3.2, 2.2), concrete, -3.9, 1.65, -1.8);
    _add(root, new THREE.BoxGeometry(0.2, 3.2, 2.2), concrete, -3.9, 1.65, 1.8);
    _add(root, new THREE.BoxGeometry(8.2, 0.14, 6.2), roof, 0, 3.28, 0);
    const canX = -4.5;
    _add(root, new THREE.BoxGeometry(5.2, 0.12, 6.8), metal, canX, 3.75, 0);
    for (const pz of [-2.6, 2.6]) {
      _add(root, new THREE.BoxGeometry(0.2, 3.6, 3.6), metal, canX - 2.1, 1.85, pz);
      _add(root, new THREE.BoxGeometry(0.5, 1.6, 0.35), rust, canX, 0.85, pz);
    }
    _add(root, new THREE.BoxGeometry(5.8, 0.08, 7.5), floor, canX, 0.04, 0);
  }

  function _boardTex(title, sub) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 280;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#5a3d22';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
    ctx.fillStyle = '#3d2814';
    ctx.font = 'bold 32px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, c.width / 2, 64);
    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#5c4028';
    ctx.fillText(sub, c.width / 2, 110);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function _buildGateSign(root) {
    const pole = new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const plank = new THREE.MeshLambertMaterial({
      map: _boardTex('ROUTE OUEST', 'Secteur fermé — bientôt'),
    });
    _add(root, new THREE.CylinderGeometry(0.09, 0.11, 2.35, 6), pole, -0.72, 1.18, 0);
    _add(root, new THREE.CylinderGeometry(0.09, 0.11, 2.35, 6), pole, 0.72, 1.18, 0);
    _add(root, new THREE.BoxGeometry(1.55, 1.05, 0.08), plank, 0, 1.72, 0.06);
    root.userData.isReadableSign = true;
    root.userData.signKind = 'sector_coming_soon';
  }

  /** Grande tente militaire — campement abandonné (entrée sud, -Z local). */
  function _buildMilitaryTent(root) {
    const B = ZS.B;
    const M = B?.M;
    const W = 11;
    const D = 7.5;
    const eaveH = 2.1;
    const peakH = 3.7;
    const T = 0.14;
    const canvasMat = new THREE.MeshLambertMaterial({ color: 0x4a5a32 });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x5c3e18 });
    const floorMat = M?.floor || new THREE.MeshLambertMaterial({ color: 0x6a6458 });

    function panel(px, py, pz, w, h, d, rz) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), canvasMat);
      m.position.set(px, py, pz);
      if (rz) m.rotation.z = rz;
      m.castShadow = m.receiveShadow = true;
      root.add(m);
    }

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.2, 0.08, D - 0.2),
      floorMat,
    );
    floor.position.set(0, 0.04, 0);
    floor.receiveShadow = true;
    root.add(floor);

    panel(-W / 2, eaveH / 2, 0, T, eaveH, D);
    panel(W / 2, eaveH / 2, 0, T, eaveH, D);
    panel(0, eaveH / 2, D / 2, W, eaveH, T);

    const frontZ = -D / 2;
    for (const px of [-W / 2 + 0.15, W / 2 - 0.15]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, eaveH, 7), poleMat);
      post.position.set(px, eaveH / 2, frontZ);
      post.castShadow = true;
      root.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, W - 0.3, 6), poleMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, eaveH + 0.04, frontZ);
    root.add(bar);

    const roofRise = peakH - eaveH;
    const roofRun = W / 2;
    const roofLen = Math.sqrt(roofRun * roofRun + roofRise * roofRise);
    const roofAng = Math.atan2(roofRise, roofRun);
    const midY = (eaveH + peakH) / 2;
    panel(-W / 4, midY, 0, roofLen, T, D + 0.6, roofAng);
    panel(W / 4, midY, 0, roofLen, T, D + 0.6, -roofAng);

    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, D + 0.8, 6), poleMat);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(0, peakH + 0.04, 0);
    root.add(ridge);

    for (const pz of [-1.8, 1.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, peakH, 7), poleMat);
      pole.position.set(0, peakH / 2, pz);
      pole.castShadow = true;
      root.add(pole);
    }
  }

  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('s01_gas_station', { build: _buildGasStation });
    ZS.registerDecorPrefab('sign_sector_gate', { build: _buildGateSign });
    ZS.registerDecorPrefab('s01_military_tent', { build: _buildMilitaryTent });
  }
}());
