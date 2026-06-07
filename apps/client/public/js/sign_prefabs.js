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

  window.ZS = window.ZS || {};
  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('sign_beach_exit', { build: _buildExitSign });
  }
}());
