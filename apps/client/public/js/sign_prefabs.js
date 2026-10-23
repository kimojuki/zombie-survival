// Prefabs panneaux lisibles (E) — enregistrés dans spawn_clearing DECOR_PREFABS
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

  function _boardTexture(title, sub) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = `rgba(90, 60, 30, ${Math.random() * 0.06})`;
      ctx.fillRect(x, y, 2 + Math.random() * 4, 1);
    }
    ctx.strokeStyle = '#5a3d22';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.fillStyle = '#3d2814';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 72);
    ctx.font = '22px Georgia, serif';
    ctx.fillStyle = '#5c4028';
    const words = (sub || '').split(' ');
    let line = '';
    let y = 118;
    for (const w of words) {
      const test = `${line}${w} `;
      if (ctx.measureText(test).width > canvas.width - 56 && line) {
        ctx.fillText(line.trim(), canvas.width / 2, y);
        line = `${w} `;
        y += 30;
      } else line = test;
    }
    if (line) ctx.fillText(line.trim(), canvas.width / 2, y);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#7a4a28';
    ctx.fillText('E — Lire', canvas.width / 2, canvas.height - 36);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function _buildExitSign(root) {
    const M = ZS.CampTextures?.materials?.();
    const wood = M ? M.woodDark(0x5a371d) : new THREE.MeshLambertMaterial({ color: 0x5a371d });
    const pole = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const plank = new THREE.MeshLambertMaterial({
      map: _boardTexture('LISEZ ÇA', 'Messages des naufragés — avant le sentier'),
    });

    _add(root, new THREE.CylinderGeometry(0.09, 0.11, 2.35, 6), pole, -0.72, 1.18, 0);
    _add(root, new THREE.CylinderGeometry(0.09, 0.11, 2.35, 6), pole, 0.72, 1.18, 0);
    _add(root, new THREE.BoxGeometry(1.65, 0.1, 0.14), wood, 0, 2.28, 0);
    const board = _add(root, new THREE.BoxGeometry(1.55, 1.05, 0.08), plank, 0, 1.72, 0.06);
    board.rotation.x = -0.04;

    for (const [px, py] of [[-0.68, 2.12], [0.68, 2.12], [-0.68, 1.32], [0.68, 1.32]]) {
      _add(root, new THREE.CylinderGeometry(0.028, 0.028, 0.05, 6),
        new THREE.MeshLambertMaterial({ color: 0x444444 }), px, py, 0.1, Math.PI / 2);
    }

    root.userData.isReadableSign = true;
    root.userData.signKind = 'beach_safe_zone';
  }

  /** Torche balise — attire l'œil vers le panneau de sortie (jour + nuit). */
  function _buildBeachExitTorch(root) {
    const M = ZS.CampTextures?.materials?.();
    const poleMat = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const metalMat = M ? M.metal() : new THREE.MeshLambertMaterial({ color: 0x6a6e72 });
    const wrapMat = M ? M.canvas(0x4a3828) : new THREE.MeshLambertMaterial({ color: 0x4a3828 });

    _add(root, new THREE.CylinderGeometry(0.055, 0.075, 2.05, 6), poleMat, 0, 1.02, 0);
    _add(root, new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), metalMat, 0, 2.08, 0);
    _add(root, new THREE.CylinderGeometry(0.07, 0.07, 0.28, 8), wrapMat, 0, 2.24, 0);

    const flameCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5a18 }),
    );
    flameCore.position.set(0, 2.42, 0);
    root.add(flameCore);

    const flameHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.42 }),
    );
    flameHalo.position.set(0, 2.46, 0);
    root.add(flameHalo);

    const light = new THREE.PointLight(0xff6620, 2.4, 20, 1.55);
    light.position.set(0, 2.45, 0);
    root.add(light);

    const fill = new THREE.PointLight(0xffcc77, 0.65, 11, 2);
    fill.position.set(0.15, 2.2, 0.12);
    root.add(fill);

    if (ZS.registerFireLight) {
      ZS.registerFireLight(light, flameCore, {
        baseIntensity: 2.4,
        fillLight: fill,
        onTick(t, flicker) {
          const s = 1 + flicker * 0.22 + Math.sin(t * 0.011) * 0.06;
          flameCore.scale.setScalar(s);
          flameHalo.scale.setScalar(0.95 + flicker * 0.28);
          flameHalo.material.opacity = 0.34 + flicker * 0.22;
        },
      });
    }
    root.userData.beachExitTorch = true;
  }

  window.ZS = window.ZS || {};
  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('sign_beach_exit', { build: _buildExitSign });
    ZS.registerDecorPrefab('beach_exit_torch', { build: _buildBeachExitTorch });
  }
}());
