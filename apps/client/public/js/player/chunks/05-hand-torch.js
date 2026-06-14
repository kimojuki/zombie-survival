// Main, torche, muzzle flash — extrait de player.js (IIFE)
function _clearSharedCenterHolder(fpsGroup) {
    const center = fpsGroup.getObjectByName('centerItemHolder');
    if (!center) return;
    center.visible = false;
    center.userData.type = null;
    const pivot = _getItemPivot(center);
    while (pivot.children.length) pivot.remove(pivot.children[0]);
    pivot.scale.set(1, 1, 1);
    pivot.visible = true;
  }

  function updateHandItem(fpsGroup, type, opts) {
    opts = opts || {};
    // Re-render hotbar (ex. stack +1 bois) ne doit pas annuler une anim de frappe en cours.
    if (!opts.force && type === fpsGroup.userData.gripType) return;

    const parts = _getRigParts(fpsGroup);
    const rArm = parts.rArm;
    const prevGrip = fpsGroup.userData.gripType ? getGrip(fpsGroup.userData.gripType) : null;
    const grip = getGrip(type);

    if (prevGrip?.sharedItem && prevGrip?.twoHanded) {
      _clearSharedCenterHolder(fpsGroup);
      const rightPivot = parts.rightHolder && _getItemPivot(parts.rightHolder);
      if (rightPivot) rightPivot.visible = true;
      if (parts.lArm) parts.lArm.visible = false;
    }

    const holder = (grip.sharedItem && grip.twoHanded)
      ? _getCenterItemHolder(fpsGroup)
      : (parts.rightHolder || rArm?.userData.itemHolder || rArm?.getObjectByName('itemHolder'));
    if (!holder) return;
    const pivot = _getItemPivot(holder);
    while (pivot.children.length) pivot.remove(pivot.children[0]);
    holder.userData.type = type || null;
    if (grip.sharedItem && grip.twoHanded) holder.visible = true;
    const rightPivot = parts.rightHolder && _getItemPivot(parts.rightHolder);
    if (rightPivot && holder !== parts.rightHolder) rightPivot.visible = false;
    if (grip.glbOffset && grip.item) {
      const g = grip.glbOffset;
      grip.item = {
        ...grip.item,
        x: grip.item.x + (g.x || 0),
        y: grip.item.y + (g.y || 0),
        z: grip.item.z + (g.z || 0),
      };
    }
    fpsGroup.userData.anim = null;
    _saveBasePose(fpsGroup, grip, type);

    if (!type) return;

    // 1) Modèle procédural normalisé immédiat (affichage instantané)
    const cat = ZS.ITEMS?.[type]?.category || '';
    const viewScale = fpsGroup.userData?.isFPS
      ? (cat === 'firearm' ? 0.70
        : (type === 'tool_hachette' ? 0.88
          : (type === 'tool_caillou' ? 0.60
            : (cat === 'melee' || cat === 'tool' ? 0.58 : 0.82))))
      : 1;
    const procModel = _buildModel(type);
    const procGrip  = _getGripPoint(type, procModel);
    const scaleMul = (grip.itemScale && type === 'tool_caillou') ? (grip.itemScale / 0.60) : 1;
    const proc = _normalizeHeld(procModel, _fit(type) * viewScale * scaleMul, null, procGrip);
    pivot.add(proc);
    if (type === 'tool_torche') _addTorchFx(pivot, proc, { local: true });
    if (grip.twoHanded && grip.itemScale) _applyHandItemScale(fpsGroup, type, grip.itemScale);

    // 2) Si un .glb existe, on le charge et on remplace une fois prêt
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;
        while (pivot.children.length) pivot.remove(pivot.children[0]);
        const m = _normalizeHeld(t.clone(true), _fit(type) * viewScale, spec.rot, _getGripPoint(type, t));
        pivot.add(m);
        if (type === 'tool_torche') _addTorchFx(pivot, m, { local: true });
      }).catch(() => { /* on garde le fallback procédural */ });
    }
  }

  // ── Item en main d'un joueur DISTANT (vue 3e personne) ─────────────────────
  // Attache le modèle de l'item à la main droite (rArm) du modèle distant, avec
  // la torche enflammée + sa lumière. Réutilise le même pipeline que la vue FPS.
  function setRemoteHandItem(playerMesh, type) {
    const limbs = playerMesh.userData.limbs;
    if (!limbs || !limbs.rArm) return;
    const rig = playerMesh.userData.rig;
    let holder = rig?.rightItemHolder || limbs.rArm.getObjectByName('itemHolder') || limbs.rArm.getObjectByName('handHolder');
    if (!holder) {
      holder = new THREE.Group();
      holder.name = 'itemHolder';
      holder.position.set(0.03, -0.13, -0.13);
      const hand = rig?.rightHand || limbs.rArm;
      hand.add(holder);
    }
    while (holder.children.length) holder.remove(holder.children[0]);
    holder.userData.type = type || null;

    const grip = getGrip(type);
    playerMesh.userData.grip = grip;
    playerMesh.userData.twoHandedFirearm = grip.twoHanded && !!type &&
      (ZS.ITEMS?.[type]?.category === 'firearm');

    if (!type) return;

    const remote = grip.remote || _REMOTE_AIM;
    if (remote.handHolder && !rig?.rightItemHolder) holder.position.set(...remote.handHolder);

    const isFirearm = ZS.ITEMS?.[type]?.category === 'firearm';
    const fit = _fit(type) * (type === 'tool_hachette' ? 1.22 : (isFirearm ? 1.35 : 1));

    // 1) Modèle procédural immédiat
    const procModel = _buildModel(type);
    const proc = _normalizeHeld(procModel, fit, null, _getGripPoint(type, procModel));
    holder.add(proc);
    if (type === 'tool_torche') _addTorchFx(holder, proc);

    // 2) Remplacement par le .glb une fois chargé
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;
        while (holder.children.length) holder.remove(holder.children[0]);
        const mm = _normalizeHeld(t.clone(true), fit, spec.rot, _getGripPoint(type, t));
        holder.add(mm);
        if (type === 'tool_torche') _addTorchFx(holder, mm);
      }).catch(() => {});
    }
  }

  // ── Torche enflammée : billboards + lumières (style feu de camp, échelle main) ─
  const _torchFxList = [];
  let _torchFireTex = null;
  let _torchEmberTex = null;

  function _torchCanvasTex(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawFn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  function _getTorchFireTex() {
    if (_torchFireTex) return _torchFireTex;
    _torchFireTex = _torchCanvasTex(64, 80, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.74, 1, w * 0.5, h * 0.52, w * 0.5);
      g.addColorStop(0, 'rgba(255,255,230,1)');
      g.addColorStop(0.18, 'rgba(255,215,70,1)');
      g.addColorStop(0.42, 'rgba(255,95,15,0.95)');
      g.addColorStop(0.68, 'rgba(210,40,0,0.5)');
      g.addColorStop(1, 'rgba(40,5,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) {
        const x = w * 0.5 + (Math.random() - 0.5) * w * 0.35;
        const y = h * (0.22 + Math.random() * 0.55);
        const r = 2 + Math.random() * 5;
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
        g2.addColorStop(0, 'rgba(255,248,160,0.7)');
        g2.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return _torchFireTex;
  }

  function _getTorchEmberTex() {
    if (_torchEmberTex) return _torchEmberTex;
    _torchEmberTex = _torchCanvasTex(32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.48);
      g.addColorStop(0, 'rgba(255,180,60,1)');
      g.addColorStop(0.55, 'rgba(220,60,8,0.85)');
      g.addColorStop(1, 'rgba(30,5,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    return _torchEmberTex;
  }

  function _unregisterTorchFx(fx) {
    const i = _torchFxList.indexOf(fx);
    if (i >= 0) _torchFxList.splice(i, 1);
  }

  function _animateTorchFx(fx, dt, opts) {
    const ud = fx.userData.torchAnim;
    if (!ud) return;
    const out = !!opts?.extinguished && fx.userData.torchLocal;
    fx.visible = !out;
    if (out) return;

    ud.t += dt;
    const t = ud.t;
    const move = !!opts?.moving && (opts.speed || 0) > 0.4;
    const wind = move ? 0.016 + Math.min(0.028, (opts.speed || 0) * 0.0035) : 0.006;

    const flicker = 0.86 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 14.7) * 0.05 + Math.sin(t * 23.3) * 0.03;
    const flicker2 = 0.9 + Math.sin(t * 6.4 + 1.2) * 0.07 + Math.sin(t * 11.8) * 0.04;
    const swayX = Math.sin(t * 6.2) * wind + Math.sin(t * 12.1) * wind * 0.45;
    const swayZ = Math.sin(t * 4.8 + 0.5) * wind * 0.55;

    ud.lights.spot.intensity = ud.base.spot * flicker;
    ud.lights.core.intensity = ud.base.core * flicker2;
    ud.lights.pool.intensity = ud.base.pool * (0.88 + Math.sin(t * 5.1) * 0.1);
    ud.lights.spot.angle = Math.PI / 5.2 + Math.sin(t * 5.5) * 0.028 + wind * Math.sin(t * 8);
    ud.lights.spotTgt.position.x = swayX * 12;
    ud.lights.spotTgt.position.z = -10 + swayZ * 8;

    for (let i = 0; i < ud.layers.length; i++) {
      const L = ud.layers[i];
      const wob = Math.sin(t * 8.5 + L.phase) * 0.1 + Math.sin(t * 15.2 + L.phase * 1.7) * 0.07;
      const rise = Math.sin(t * 10 + L.phase) * 0.01;
      L.mesh.position.x = L.baseX + swayX * (1.2 + L.phase * 0.12);
      L.mesh.position.z = L.baseZ + swayZ * (0.8 + L.phase * 0.08);
      L.mesh.position.y = L.baseY + rise + Math.abs(swayX) * 0.5;
      const sy = 0.78 + wob + flicker * 0.14;
      const sx = 1 + Math.sin(t * 11 + L.phase) * 0.1;
      L.mesh.scale.set(sx, sy, 1);
      L.mesh.material.opacity = 0.7 + wob * 0.38 + flicker * 0.18;
    }

    for (let i = 0; i < ud.embers.length; i++) {
      const e = ud.embers[i];
      const p = e.phase + t * e.speed;
      e.mesh.material.opacity = 0.35 + Math.sin(p * 6) * 0.4;
      e.mesh.scale.setScalar(0.42 + Math.sin(p * 4.2) * 0.18);
      e.mesh.position.y = e.baseY + Math.sin(p * 3) * 0.014;
      e.mesh.position.x = e.baseX + swayX * 2.2;
    }

    if (ud.coreOuter) {
      const sy = 0.72 + flicker * 0.22;
      ud.coreOuter.scale.set(1 + swayX * 3, sy, 1 + swayZ * 2.5);
      ud.coreInner.scale.set(1 + swayX, 1.05 + (1 - sy) * 0.35, 1 + swayZ);
      ud.coreOuter.material.opacity = 0.5 + flicker * 0.22;
      ud.coreInner.material.opacity = 0.82 + flicker2 * 0.14;
    }
  }

  function tickTorchFx(dt, opts) {
    const step = dt || 0.016;
    for (let i = _torchFxList.length - 1; i >= 0; i--) {
      const fx = _torchFxList[i];
      if (!fx.parent) {
        _torchFxList.splice(i, 1);
        continue;
      }
      _animateTorchFx(fx, step, opts || {});
    }
  }

  function _addTorchFx(holder, model, opts) {
    const old = holder.getObjectByName('torchFx');
    if (old) {
      _unregisterTorchFx(old);
      holder.remove(old);
    }

    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    box.applyMatrix4(new THREE.Matrix4().copy(holder.matrixWorld).invert());
    const cx = isFinite(box.min.x) ? (box.min.x + box.max.x) / 2 : 0;
    const cz = isFinite(box.min.z) ? (box.min.z + box.max.z) / 2 : 0;
    const topY = isFinite(box.max.y) ? box.max.y : 0.3;

    const fx = new THREE.Group();
    fx.name = 'torchFx';
    fx.position.set(cx, topY + 0.02, cz);
    fx.userData.torchLocal = !!opts?.local;

    const flameMat = (color, op) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    });
    const coreOuter = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 7), flameMat(0xff5512, 0.65));
    coreOuter.position.y = 0.09;
    const coreInner = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 7), flameMat(0xffdd55, 0.92));
    coreInner.position.y = 0.07;
    fx.add(coreOuter, coreInner);

    const fireMat = new THREE.MeshBasicMaterial({
      map: _getTorchFireTex(),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const emberMat = new THREE.MeshBasicMaterial({
      map: _getTorchEmberTex(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const layers = [];
    const layerDefs = [
      { w: 0.16, h: 0.26, y: 0.1, x: 0, z: 0, phase: 0 },
      { w: 0.11, h: 0.18, y: 0.12, x: 0.014, z: 0.006, phase: 1.15 },
      { w: 0.075, h: 0.12, y: 0.14, x: -0.01, z: -0.004, phase: 2.35 },
    ];
    const billboards = [];
    for (let i = 0; i < layerDefs.length; i++) {
      const d = layerDefs[i];
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), fireMat.clone());
      mesh.position.set(d.x, d.y, d.z);
      mesh.renderOrder = 14;
      mesh.userData.billboard = true;
      fx.add(mesh);
      billboards.push(mesh);
      layers.push({
        mesh, phase: d.phase, baseX: d.x, baseY: d.y, baseZ: d.z,
      });
    }

    const embers = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const ex = Math.cos(a) * 0.028;
      const ez = Math.sin(a) * 0.022;
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), emberMat.clone());
      e.position.set(ex, 0.05 + (i % 2) * 0.02, ez);
      e.renderOrder = 13;
      e.userData.billboard = true;
      fx.add(e);
      billboards.push(e);
      embers.push({ mesh: e, phase: i * 1.7, speed: 5.5 + i * 0.9, baseX: ex, baseY: e.position.y });
    }

    if (ZS.registerBillboards) ZS.registerBillboards(billboards);

    const spot = new THREE.SpotLight(0xff9520, 68, 32, Math.PI / 5.2, 0.44, 1.1);
    spot.position.set(0, 0.05, 0);
    const spotTgt = new THREE.Object3D();
    spotTgt.position.set(0, -0.03, -10);
    fx.add(spotTgt);
    spot.target = spotTgt;
    spot.userData.playerTorch = true;
    fx.add(spot);

    const core = new THREE.PointLight(0xffb040, 18, 18, 1.2);
    core.position.y = 0.06;
    core.userData.playerTorch = true;
    fx.add(core);

    const pool = new THREE.PointLight(0xffa868, 3.2, 44, 1.55);
    pool.position.y = -0.12;
    pool.userData.playerTorch = true;
    fx.add(pool);

    fx.userData.torchAnim = {
      t: Math.random() * 10,
      layers,
      embers,
      coreOuter,
      coreInner,
      lights: { spot, core, pool, spotTgt },
      base: { spot: 68, core: 18, pool: 3.2 },
    };

    holder.add(fx);
    _torchFxList.push(fx);
  }

  // ── Muzzle flash : éclair + lumière au bout du canon lors d'un tir ──────────
  // `holder` = groupe contenant l'arme (itemHolder en FPS, handHolder distant).
  // L'arme pointe vers -z, donc le canon est à la face avant (min z) de la boîte.
  function muzzleFlash(holder) {
    if (!holder) return;
    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(holder);
    let cx = 0, cy = 0, frontZ = -0.30;
    if (isFinite(box.min.z)) {
      box.applyMatrix4(new THREE.Matrix4().copy(holder.matrixWorld).invert());
      cx = (box.min.x + box.max.x) / 2;
      cy = (box.min.y + box.max.y) / 2;
      frontZ = box.min.z;   // bout du canon (avant = -z)
    }

    // Blending NORMAL + depthTest désactivé : bien visible de jour comme de nuit,
    // et toujours dessiné par-dessus l'arme (jamais masqué).
    const flashMat = (color, op) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });

    const fx = new THREE.Group();
    fx.position.set(cx, cy, frontZ - 0.05);
    fx.rotation.z = Math.random() * Math.PI;        // variation d'orientation
    fx.scale.setScalar(0.9 + Math.random() * 0.5);  // variation de taille
    fx.renderOrder = 999;

    // Boule de feu centrale, étirée vers l'avant
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), flashMat(0xfff2b0, 1));
    core.scale.z = 1.6;
    // Cône de flamme vers l'avant (-z)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.32, 10), flashMat(0xffb030, 0.95));
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = -0.17;
    // Étoile d'éclat (deux plans croisés)
    const star1 = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.11), flashMat(0xffd070, 0.9));
    const star2 = star1.clone(); star2.rotation.z = Math.PI / 2;
    fx.add(core, cone, star1, star2);
    fx.children.forEach((c) => { c.renderOrder = 999; });

    const light = new THREE.PointLight(0xffcc66, 12, 18, 2);
    fx.add(light);
    holder.add(fx);

    // Éclat bref qui grossit légèrement en s'estompant (~90 ms).
    const start = performance.now();
    const DUR = 90;
    const base = fx.scale.x;
    core.onBeforeRender = () => {
      const k = Math.max(0, 1 - (performance.now() - start) / DUR);
      fx.scale.setScalar(base * (1 + (1 - k) * 0.5));
      core.material.opacity  = k;
      cone.material.opacity  = 0.95 * k;
      star1.material.opacity = star2.material.opacity = 0.9 * k;
      light.intensity = 12 * k;
    };
    setTimeout(() => { try { holder.remove(fx); } catch (_) {} }, 160);
  }

  // ── Constructeur principal ────────────────────────────────────────────────
