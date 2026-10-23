// Feu de camp — construction réaliste + flammes billboards
(function () {
  'use strict';

  const _vA = new THREE.Vector3();
  const _vB = new THREE.Vector3();

  function _canvasTex(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawFn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    return t;
  }

  let _fireTex, _barkTex, _ashTex, _emberTex, _smokeTex;

  function _getSmokeTex() {
    if (_smokeTex) return _smokeTex;
    _smokeTex = _canvasTex(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.48);
      g.addColorStop(0, 'rgba(200,195,188,0.65)');
      g.addColorStop(0.5, 'rgba(130,125,118,0.22)');
      g.addColorStop(1, 'rgba(80,75,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    return _smokeTex;
  }

  function _getFireTex() {
    if (_fireTex) return _fireTex;
    _fireTex = _canvasTex(128, 160, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.5, h * 0.72, 2, w * 0.5, h * 0.55, w * 0.48);
      g.addColorStop(0, 'rgba(255,255,240,1)');
      g.addColorStop(0.15, 'rgba(255,220,80,1)');
      g.addColorStop(0.38, 'rgba(255,100,10,0.95)');
      g.addColorStop(0.62, 'rgba(220,35,0,0.55)');
      g.addColorStop(1, 'rgba(60,8,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 32; i++) {
        const x = w * 0.5 + (Math.random() - 0.5) * w * 0.4;
        const y = h * (0.28 + Math.random() * 0.55);
        const r = 3 + Math.random() * 8;
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        g2.addColorStop(0, 'rgba(255,250,150,0.65)');
        g2.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return _fireTex;
  }

  function _getBarkTex() {
    if (_barkTex) return _barkTex;
    _barkTex = _canvasTex(64, 128, (ctx, w, h) => {
      ctx.fillStyle = '#3d2410';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 2) {
        const n = 0.65 + Math.sin(x * 0.35) * 0.15;
        ctx.fillStyle = `rgb(${Math.floor(55 * n)},${Math.floor(32 * n)},${Math.floor(14 * n)})`;
        ctx.fillRect(x, 0, 2, h);
      }
    });
    return _barkTex;
  }

  function _getAshTex() {
    if (_ashTex) return _ashTex;
    _ashTex = _canvasTex(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 600; i++) {
        const g = 18 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${g},${g - 4},${g - 8})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    });
    _ashTex.wrapS = _ashTex.wrapT = THREE.RepeatWrapping;
    _ashTex.repeat.set(2, 2);
    return _ashTex;
  }

  function _getEmberTex() {
    if (_emberTex) return _emberTex;
    _emberTex = _canvasTex(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.48);
      g.addColorStop(0, 'rgba(255,140,40,1)');
      g.addColorStop(0.5, 'rgba(200,50,5,0.85)');
      g.addColorStop(1, 'rgba(40,5,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    return _emberTex;
  }

  function _addMesh(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = mat.transparent !== true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Bûche entre deux points 3D */
  function _logBetween(root, barkMat, x1, y1, z1, x2, y2, z2, r) {
    _vA.set(x1, y1, z1);
    _vB.set(x2, y2, z2);
    _vB.sub(_vA);
    const len = _vB.length();
    if (len < 0.05) return;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 1.05, len, 8), barkMat);
    log.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    log.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _vB.normalize());
    log.castShadow = true;
    root.add(log);
  }

  function buildCampfire(scene, cx, cz, baseY) {
    const root = new THREE.Group();
    root.position.set(cx, baseY, cz);
    scene.add(root);

    const GROUND = 0.08;
    const RING_R = 0.82;

    // ── Fosse + braises ─────────────────────────────────────────────────────
    const ashMat = new THREE.MeshLambertMaterial({ map: _getAshTex(), color: 0x777777 });
    _addMesh(root, new THREE.CylinderGeometry(0.88, 0.98, 0.06, 20), ashMat, 0, 0.035, 0);
    _addMesh(root, new THREE.CylinderGeometry(0.55, 0.62, 0.04, 16),
      new THREE.MeshLambertMaterial({ color: 0x1a120c }), 0, 0.07, 0);
    _addMesh(root, new THREE.CylinderGeometry(0.28, 0.32, 0.025, 12),
      new THREE.MeshBasicMaterial({ color: 0xff5500 }), 0, 0.095, 0);

    // ── Anneau de pierres (8 pierres à plat, même hauteur) ───────────────────
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6a6458 });
    const stoneH = 0.11;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sx = Math.cos(a) * RING_R;
      const sz = Math.sin(a) * RING_R;
      const tilt = (i % 2) * 0.08;
      _addMesh(root, new THREE.BoxGeometry(0.24, stoneH, 0.20), stoneMat,
        sx, GROUND + stoneH * 0.5, sz, tilt, a + Math.PI * 0.5, 0);
    }

    const barkMat = new THREE.MeshLambertMaterial({ map: _getBarkTex() });

    // ── Tipi de 3 bûches — bases sur l'anneau, sommets convergents (vide au centre) ─
    const apexY = 0.78;
    const apexX = 0, apexZ = 0;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI * 0.5;
      const bx = Math.cos(a) * (RING_R - 0.06);
      const bz = Math.sin(a) * (RING_R - 0.06);
      _logBetween(root, barkMat, bx, GROUND + 0.04, bz, apexX, apexY, apexZ, 0.075);
    }

    // ── Support de cuisson : 2 pierres plates + barre transversale ────────────
    const COOK_TOP = 0.30;
    const stoneW = 0.24, stoneD = 0.16, stoneLift = 0.09;
    const leftX = -0.36, rightX = 0.36;
    _addMesh(root, new THREE.BoxGeometry(stoneW, stoneLift, stoneD), stoneMat,
      leftX, COOK_TOP - stoneLift * 0.5, 0);
    _addMesh(root, new THREE.BoxGeometry(stoneW, stoneLift, stoneD), stoneMat,
      rightX, COOK_TOP - stoneLift * 0.5, 0);
    _addMesh(root, new THREE.CylinderGeometry(0.022, 0.022, 0.52, 6), barkMat,
      0, COOK_TOP + 0.012, 0, 0, 0, Math.PI / 2);

    // ── Casserole posée sur la barre, au-dessus du vide central ─────────────
    // ── Casserole sur la barre (métal sombre, forme lisible) ───────────────
    const potMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const potBottom = COOK_TOP + 0.028;
    const potH = 0.095;
    const potCY = potBottom + potH * 0.5;
    _addMesh(root, new THREE.CylinderGeometry(0.14, 0.175, potH, 12), potMat, 0, potCY, 0);
    _addMesh(root, new THREE.TorusGeometry(0.178, 0.012, 6, 16), potMat, 0, potBottom + potH + 0.004, 0, Math.PI / 2, 0, 0);
    _addMesh(root, new THREE.CylinderGeometry(0.11, 0.12, 0.014, 10),
      new THREE.MeshLambertMaterial({ color: 0x6a5040 }), 0, potBottom + potH - 0.003, 0);
    for (const side of [-1, 1]) {
      const handle = _addMesh(root, new THREE.TorusGeometry(0.032, 0.008, 4, 8), potMat,
        side * 0.17, potCY + 0.01, 0, 0, 0, Math.PI / 2);
      handle.rotation.x = side * 0.4;
    }

    // ── Flammes (billboards verticaux, sous la marmite) ─────────────────────
    const emberMat = new THREE.MeshBasicMaterial({
      map: _getEmberTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const embers = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rr = 0.06 + (i % 2) * 0.05;
      const e = _addMesh(root, new THREE.PlaneGeometry(0.28, 0.28), emberMat,
        Math.cos(a) * rr, 0.13, Math.sin(a) * rr);
      e.renderOrder = 4;
      e.userData.billboard = true;
      embers.push({ mesh: e, phase: i * 1.3, speed: 0.9 + i * 0.15 });
    }

    const fireMat = new THREE.MeshBasicMaterial({
      map: _getFireTex(), transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const fireLayers = [
      { mesh: null, w: 0.62, h: 0.92, y: 0.22, x: 0, phase: 0 },
      { mesh: null, w: 0.46, h: 0.68, y: 0.28, x: 0.04, phase: 1.4 },
      { mesh: null, w: 0.30, h: 0.50, y: 0.34, x: -0.03, phase: 2.6 },
    ];
    for (const L of fireLayers) {
      const m = _addMesh(root, new THREE.PlaneGeometry(L.w, L.h), fireMat, L.x, L.y, 0);
      m.renderOrder = 6;
      m.userData.billboard = true;
      L.mesh = m;
    }

    const smokeMat = new THREE.MeshBasicMaterial({
      map: _getSmokeTex(), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
    });
    const smokes = [];
    for (let i = 0; i < 2; i++) {
      const w = 0.38 + i * 0.14;
      const s = _addMesh(root, new THREE.PlaneGeometry(w, w * 1.4), smokeMat, 0, 0.72 + i * 0.18, 0);
      s.renderOrder = 3;
      s.userData.billboard = true;
      smokes.push({ mesh: s, phase: i * 2.2, baseY: s.position.y });
    }

    const billboards = fireLayers.map(l => l.mesh)
      .concat(embers.map(e => e.mesh), smokes.map(s => s.mesh));

    const light = new THREE.PointLight(0xff6620, 4.2, 34, 1.45);
    light.position.set(0, 0.55, 0);
    root.add(light);

    const fill = new THREE.PointLight(0xffaa44, 0.75, 16, 2);
    fill.position.set(0.3, 0.35, 0.2);
    root.add(fill);

    if (ZS.registerFireLight) {
      ZS.registerFireLight(light, fireLayers[0].mesh, {
        baseIntensity: 4.2,
        fillLight: fill,
        onTick(t, flicker, night) {
          const vis = 0.55 + (night || 0) * 0.45;
          for (const L of fireLayers) {
            const wob = Math.sin(t * 0.009 + L.phase) * 0.07 + Math.sin(t * 0.018 + L.phase * 2) * 0.05;
            L.mesh.scale.set(1 + wob, 0.9 + flicker * 0.25 + wob * 0.4, 1);
            L.mesh.material.opacity = vis * (0.92 + wob * 0.4);
          }
          for (const e of embers) {
            const p = e.phase + t * 0.001 * e.speed;
            e.mesh.material.opacity = vis * (0.65 + Math.sin(p) * 0.35);
            e.mesh.scale.setScalar(0.9 + Math.sin(p * 1.2) * 0.18);
          }
          for (const s of smokes) {
            s.mesh.position.y = s.baseY + Math.sin(t * 0.001 + s.phase) * 0.1;
            s.mesh.material.opacity = vis * (0.22 + Math.sin(t * 0.0012 + s.phase) * 0.12);
          }
          if (fill) fill.intensity = (0.28 + flicker * 0.12) * (0.55 + (night || 0) * 0.85);
        },
      });
    }

    if (ZS.registerBillboards) ZS.registerBillboards(billboards);
    return root;
  }

  window.ZS = window.ZS || {};
  ZS.buildCampfire = buildCampfire;
}());
