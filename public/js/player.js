// Modèles personnages + bras FPS + items en main (modèles .glb + fallback procédural)
(function () {
  'use strict';

  const SKIN  = 0xFFCBA4;
  const SHIRT = 0x3B82F6;
  const PANTS = 0x1E3A8A;
  const SHOES = 0x333333;

  // ── Personnages ────────────────────────────────────────────────────────────

  function createPlayerModel() {
    const g = new THREE.Group();
    addBox(g, m(SKIN),  0.8,  0.8,  0.8,  0, 1.9, 0);
    addBox(g, m(0x222222), 0.15, 0.1, 0.05, -0.18, 1.97, -0.4);
    addBox(g, m(0x222222), 0.15, 0.1, 0.05,  0.18, 1.97, -0.4);
    addBox(g, m(SHIRT), 0.6, 0.75, 0.3, 0, 1.12, 0);
    const lArm = armGroup(g, m(SKIN), -0.43);
    const rArm = armGroup(g, m(SKIN),  0.43);
    const lLeg = legGroup(g, -0.15);
    const rLeg = legGroup(g,  0.15);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function createZombieModel() {
    const g = new THREE.Group();
    addBox(g, m(0x6daf6d), 0.8, 0.8, 0.8, 0, 1.9, 0);
    addBox(g, m(0xff2222), 0.15, 0.12, 0.05, -0.17, 1.97, -0.4);
    addBox(g, m(0xff2222), 0.15, 0.12, 0.05,  0.17, 1.97, -0.4);
    addBox(g, m(0x3a3a2a), 0.6, 0.75, 0.3, 0, 1.12, 0);
    const lArm = armGroup(g, m(0x6daf6d), -0.43);
    const rArm = armGroup(g, m(0x6daf6d),  0.43);
    lArm.rotation.x = rArm.rotation.x = Math.PI / 2.5;
    const lLeg = legGroup(g, -0.15, 0x2a2a1a);
    const rLeg = legGroup(g,  0.15, 0x2a2a1a);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function armGroup(parent, mat_, x) {
    const g = new THREE.Group(); g.position.set(x, 1.495, 0);
    addBox(g, mat_, 0.25, 0.75, 0.25, 0, -0.375, 0); parent.add(g); return g;
  }
  function legGroup(parent, x, pantColor = PANTS) {
    const g = new THREE.Group(); g.position.set(x, 0.745, 0);
    addBox(g, m(pantColor),  0.25, 0.75, 0.25, 0, -0.375,  0);
    addBox(g, m(SHOES), 0.27, 0.12, 0.32, 0, -0.765, 0.03);
    parent.add(g); return g;
  }

  // ── Bras FPS ──────────────────────────────────────────────────────────────

  // Bras droit : épaule en haut, main en bas (tient la crosse / l'objet).
  function _fpsArm() {
    const arm = new THREE.Group();
    addBox(arm, m(SHIRT), 0.11, 0.52, 0.11, 0,  0.00, 0);   // bras mince
    addBox(arm, m(SKIN),  0.11, 0.16, 0.11, 0, -0.32, 0);   // main
    return arm;
  }

  // Bras gauche (soutien) : MAIN EN HAUT (posée sur le fût), avant-bras qui
  // descend vers le bas de l'écran et en sort — ainsi aucune extrémité coupée
  // n'est visible. L'origine du groupe = la main.
  function _fpsForearm() {
    const a = new THREE.Group();
    addBox(a, m(SKIN),  0.11, 0.16, 0.11, 0,  0.02, 0);   // main (en haut)
    addBox(a, m(SHIRT), 0.11, 0.58, 0.11, 0, -0.34, 0);   // avant-bras (descend)
    return a;
  }

  function createFPSArms() {
    const g = new THREE.Group();

    // Bras droit : tient la crosse / poignée (toujours visible).
    const rArm = _fpsArm();
    rArm.name = 'rArm';
    rArm.rotation.x = 0.60;
    rArm.position.set(0.19, -0.24, -0.42);
    g.add(rArm);

    // Bras gauche : soutient l'arme à l'avant (deux mains). Visible seulement
    // pour les armes à feu.
    const lArm = _fpsForearm();
    lArm.name = 'lArm';
    lArm.visible = false;
    g.add(lArm);

    const holder = new THREE.Group();
    holder.name = 'itemHolder';
    g.add(holder);
    return g;
  }

  // Pose du bras gauche (main sur le fût) selon le type d'arme, ou null = caché.
  // SEULES les armes à feu se tiennent à deux mains. La main est posée au niveau
  // de l'arme et l'avant-bras descend hors de l'écran (pas d'extrémité coupée).
  function _leftArmPose(cat, type) {
    if (type === 'wpn_pistolet' || type === 'pistol')
      return { pos: [0.11, -0.24, -0.70], rot: [0.0, 0.0, 0.22] };
    if (cat === 'firearm')
      return { pos: [0.10, -0.20, -0.98], rot: [-0.18, 0.0, 0.16] };
    return null;   // mêlée, outils, objets → bras gauche caché (une seule main)
  }

  // ── Modèles .glb (libres de droits, Quaternius CC0) ─────────────────────────
  // type → fichier dans /models + rotation d'orientation [x, y, z] (radians).
  // La taille est gérée par _fit(). Les types absents → modèle procédural.
  const GLB = {
    // Armes à feu
    wpn_pistolet:        { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    pistol:              { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    wpn_fusil_pompe:     { file: 'shotgun',       rot: [0, Math.PI / 2, 0] },
    wpn_fusil_chasse:    { file: 'sniper_rifle',  rot: [0, Math.PI / 2, 0] },
    // Mêlée / outils
    wpn_couteau:         { file: 'knife',         rot: [0, 0, 0] },
    wpn_hache_combat:    { file: 'axe',           rot: [0, 0, 0] },
    tool_hachette:       { file: 'axe',           rot: [0, 0, 0] },
    tool_pioche:         { file: 'shovel',        rot: [0, 0, 0] },
    tool_torche:         { file: 'wooden_torch',  rot: [0, 0, 0] },
    // Nourriture / médical / ressources
    food_eau_bouteille:  { file: 'water_bottle',  rot: [0, 0, 0] },
    food_conserves:      { file: 'can',           rot: [0, 0, 0] },
    food_haricots_boite: { file: 'can_red',       rot: [0, 0, 0] },
    food_soupe_conserve: { file: 'can_broken',    rot: [0, 0, 0] },
    med_kit_soin:        { file: 'first_aid_kit', rot: [0, 0, 0] },
    res_bois_brut:       { file: 'wood_log',      rot: [0, 0, 0] },
    // Équipement (sac à dos, 3 tailles → même modèle)
    eq_petit_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_sac_moyen:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_grand_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
  };

  // Taille cible (plus grande dimension, en m) de l'item en main — volontairement
  // généreuse pour que l'objet équipé soit bien visible.
  function _fit(type) {
    if (type === 'wpn_pistolet' || type === 'pistol') return 0.52;
    if (type === 'wpn_fusil_chasse')                  return 1.20;
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale') return 1.15;
    const cat = ZS.ITEMS?.[type]?.category || '';
    const byCat = {
      firearm: 1.00, melee: 0.92, tool: 0.86,
      food: 0.32, medical: 0.32, ammo: 0.32, resource: 0.34,
      equipment: 0.44, structure: 0.46,
    };
    return byCat[cat] || 0.36;
  }

  const _loader = (typeof THREE !== 'undefined' && THREE.GLTFLoader) ? new THREE.GLTFLoader() : null;
  const _cache  = {};   // file → Promise<THREE.Object3D> (template chargé)

  function _loadGLB(file) {
    if (_cache[file]) return _cache[file];
    _cache[file] = new Promise((resolve, reject) => {
      if (!_loader) { reject(new Error('GLTFLoader indisponible')); return; }
      _loader.load('/models/' + file + '.glb',
        (g) => {
          g.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          resolve(g.scene);
        },
        undefined,
        reject);
    });
    return _cache[file];
  }

  // Recentre l'objet, l'ajuste à `fit` (m) et applique l'orientation `rot`.
  function _normalize(obj, fit, rot) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const s = fit / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.setScalar(s);
    obj.position.set(-center.x * s, -center.y * s, -center.z * s);
    const centered = new THREE.Group(); centered.add(obj);     // géométrie centrée à l'origine
    const pivot = new THREE.Group(); pivot.add(centered);      // pivot pour l'orientation
    if (rot) pivot.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return pivot;
  }

  // Renvoie une Promesse du modèle d'affichage normalisé (GLB sinon procédural).
  // Utilisé par l'item en main ET le générateur d'icônes (ZS.Icons).
  function getItemModel(type) {
    const fit  = _fit(type);
    const spec = GLB[type];
    if (spec && _loader) {
      return _loadGLB(spec.file)
        .then((t) => _normalize(t.clone(true), fit, spec.rot))
        .catch(() => _normalize(_buildModel(type), fit, null));
    }
    return Promise.resolve(_normalize(_buildModel(type), fit, null));
  }

  // ── Mise à jour de l'item en main ─────────────────────────────────────────

  function updateHandItem(fpsGroup, type) {
    const holder = fpsGroup.getObjectByName('itemHolder');
    if (!holder) return;
    while (holder.children.length) holder.remove(holder.children[0]);
    holder.userData.type = type || null;

    // Bras gauche : visible (et posé) uniquement pour les armes à deux mains.
    const lArm = fpsGroup.getObjectByName('lArm');
    const pose = type ? _leftArmPose(ZS.ITEMS?.[type]?.category || '', type) : null;
    if (lArm) {
      lArm.visible = !!pose;
      if (pose) { lArm.position.set(...pose.pos); lArm.rotation.set(...pose.rot); }
    }

    if (!type) return;

    const def = ZS.ITEMS?.[type];
    const p   = _pos(def?.category || '', type);
    holder.position.set(p.x, p.y, p.z);
    holder.rotation.set(p.rx, p.ry, p.rz);

    // 1) Modèle procédural normalisé immédiat (affichage instantané)
    const proc = _normalize(_buildModel(type), _fit(type), null);
    holder.add(proc);
    if (type === 'tool_torche') _addTorchFx(holder, proc);

    // 2) Si un .glb existe, on le charge et on remplace une fois prêt
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;             // l'item a changé entre-temps
        while (holder.children.length) holder.remove(holder.children[0]);
        const m = _normalize(t.clone(true), _fit(type), spec.rot);
        holder.add(m);
        if (type === 'tool_torche') _addTorchFx(holder, m);
      }).catch(() => { /* on garde le fallback procédural */ });
    }
  }

  // ── Item en main d'un joueur DISTANT (vue 3e personne) ─────────────────────
  // Attache le modèle de l'item à la main droite (rArm) du modèle distant, avec
  // la torche enflammée + sa lumière. Réutilise le même pipeline que la vue FPS.
  function setRemoteHandItem(playerMesh, type) {
    const limbs = playerMesh.userData.limbs;
    if (!limbs || !limbs.rArm) return;
    let holder = limbs.rArm.getObjectByName('handHolder');
    if (!holder) {
      holder = new THREE.Group();
      holder.name = 'handHolder';
      holder.position.set(0, -0.72, -0.12);   // dans la paume, légèrement en avant
      limbs.rArm.add(holder);
    }
    while (holder.children.length) holder.remove(holder.children[0]);
    holder.userData.type = type || null;

    // Drapeau « arme à feu tenue à deux mains » lu par l'animation distante
    // (network.js) pour rapprocher le bras gauche de l'arme. Seules les armes
    // à feu sont à deux mains.
    playerMesh.userData.twoHandedFirearm = !!type && ZS.ITEMS?.[type]?.category === 'firearm';

    if (!type) return;

    // 1) Modèle procédural immédiat
    const proc = _normalize(_buildModel(type), _fit(type), null);
    holder.add(proc);
    if (type === 'tool_torche') _addTorchFx(holder, proc);

    // 2) Remplacement par le .glb une fois chargé
    const spec = GLB[type];
    if (spec && _loader) {
      _loadGLB(spec.file).then((t) => {
        if (holder.userData.type !== type) return;
        while (holder.children.length) holder.remove(holder.children[0]);
        const mm = _normalize(t.clone(true), _fit(type), spec.rot);
        holder.add(mm);
        if (type === 'tool_torche') _addTorchFx(holder, mm);
      }).catch(() => {});
    }
  }

  // ── Torche enflammée : flamme animée + lumière à la pointe ──────────────────
  function _addTorchFx(holder, model) {
    const old = holder.getObjectByName('torchFx');
    if (old) holder.remove(old);

    // Sommet du modèle (= bout de la torche), exprimé dans l'espace local du holder
    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    box.applyMatrix4(new THREE.Matrix4().copy(holder.matrixWorld).invert());
    const cx   = isFinite(box.min.x) ? (box.min.x + box.max.x) / 2 : 0;
    const cz   = isFinite(box.min.z) ? (box.min.z + box.max.z) / 2 : 0;
    const topY = isFinite(box.max.y) ? box.max.y : 0.3;

    const fx = new THREE.Group();
    fx.name = 'torchFx';
    fx.position.set(cx, topY + 0.02, cz);

    const flameMat = (color, op) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.20, 8), flameMat(0xff5512, 0.7));
    outer.position.y = 0.10;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.13, 8), flameMat(0xffdd55, 0.95));
    inner.position.y = 0.075;
    fx.add(outer); fx.add(inner);

    const light = new THREE.PointLight(0xffa540, 7.0, 34, 2);
    light.position.y = 0.06;
    fx.add(light);

    // Scintillement (exécuté à chaque rendu via le mesh extérieur)
    let t = Math.random() * 10;
    outer.onBeforeRender = () => {
      t += 0.08;
      const f = 0.85 + Math.sin(t * 7.3) * 0.10 + Math.sin(t * 13.1) * 0.05;
      light.intensity = 7.0 * f;
      const sy = 0.85 + Math.sin(t * 9.0) * 0.15;
      outer.scale.set(1, sy, 1);
      inner.scale.set(1, 1.85 - sy, 1);
    };

    holder.add(fx);
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

  // Position en main selon catégorie (rapprochée/centrée pour bien voir l'objet)
  function _pos(cat, type) {
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale')
      return { x: 0.10, y: -0.16, z: -0.78, rx: 0.15, ry: 0, rz: 0 };
    const T = {
      firearm:  { x: 0.15, y: -0.18, z: -0.72, rx: 0,    ry: 0.10, rz: 0    },
      melee:    { x: 0.17, y: -0.14, z: -0.66, rx: 0.20, ry: 0.08, rz: 0.05 },
      tool:     { x: 0.17, y: -0.14, z: -0.64, rx: 0.20, ry: 0.08, rz: 0.05 },
      food:     { x: 0.15, y: -0.18, z: -0.46, rx: 0,    ry: 0.20, rz: 0    },
      medical:  { x: 0.15, y: -0.18, z: -0.46, rx: 0,    ry: 0.20, rz: 0    },
      ammo:     { x: 0.15, y: -0.20, z: -0.46, rx: 0,    ry: 0.20, rz: 0    },
      resource: { x: 0.15, y: -0.20, z: -0.46, rx: 0,    ry: 0.20, rz: 0    },
      equipment:{ x: 0.14, y: -0.18, z: -0.52, rx: 0,    ry: 0.20, rz: 0    },
    };
    return T[cat] || { x: 0.15, y: -0.18, z: -0.46, rx: 0, ry: 0.20, rz: 0 };
  }

  // ── Constructeur principal ────────────────────────────────────────────────

  function _buildModel(type) {
    switch (type) {
      // ── Armes à feu ──────────────────────────────────────────────────────
      case 'pistol': case 'wpn_pistolet':   return _pistol();
      case 'wpn_fusil_pompe':               return _shotgun();
      case 'wpn_fusil_chasse':              return _rifle();
      // ── Mêlée ────────────────────────────────────────────────────────────
      case 'wpn_couteau':                   return _knife();
      case 'wpn_hache_combat':              return _axe(0x887733);
      case 'wpn_barre_fer':                 return _ironBar();
      case 'wpn_machette':                  return _machette();
      case 'wpn_lance_artisanale':          return _spear();
      case 'wpn_batte_cloutee':             return _bat();
      // ── Outils ───────────────────────────────────────────────────────────
      case 'tool_marteau':                  return _hammer();
      case 'tool_hachette':                 return _axe(0x775522);
      case 'tool_pioche':                   return _pickaxe();
      case 'tool_torche':                   return _lighter();
      // ── Nourriture ───────────────────────────────────────────────────────
      case 'food_eau_bouteille':            return _bottle(0x88bbff, 0.85);
      case 'food_boisson_energisante':      return _tallCan(0xeecc00);
      case 'food_conserves':               return _can(0xaaaaaa);
      case 'food_haricots_boite':           return _can(0xcc7733);
      case 'food_soupe_conserve':           return _can(0xdd9933);
      case 'food_pain':                     return _bread();
      case 'food_fruits':                   return _apple();
      case 'food_viande_crue':              return _meat(0xcc4444);
      case 'food_viande_cuite':             return _meat(0x884422);
      case 'food': case 'medkit':           return _can(0xcc8844);
      // ── Médical ──────────────────────────────────────────────────────────
      case 'med_bandage':                   return _bandage();
      case 'med_kit_soin':                  return _medkit();
      case 'med_seringue_anti_infection':   return _syringe();
      // ── Munitions ────────────────────────────────────────────────────────
      case 'ammo': case 'ammo_pistolet':    return _ammoBox(0xddcc44);
      case 'ammo_fusil_pompe':              return _ammoBox(0xcc4422);
      case 'ammo_fusil_chasse':             return _ammoBox(0xdd8822);
      // ── Ressources ───────────────────────────────────────────────────────
      case 'res_bois_brut':                 return _log();
      case 'res_planche':                   return _plank();
      case 'res_ferraille': case 'res_metal': return _ingot(ZS.ITEMS?.[type]?.color||0x888888);
      case 'res_clous':                     return _nails();
      case 'res_corde':                     return _coil(0xbb9944);
      case 'res_ruban_adhesif':             return _coil(0xffcc00);
      case 'res_chiffon':                   return _cloth();
      // ── Équipement ───────────────────────────────────────────────────────
      case 'eq_casque':                     return _helmet();
      case 'eq_gilet_protection':           return _vest();
      case 'eq_petit_sac': case 'eq_sac_moyen': case 'eq_grand_sac':
                                            return _backpack(ZS.ITEMS?.[type]?.color||0x886633);
      // ── Structures ───────────────────────────────────────────────────────
      case 'struct_mur_bois': case 'struct_porte_bois':
      case 'struct_grande_porte_bois': case 'struct_plancher_bois':
      case 'struct_escalier_bois':          return _plank();
      default: {
        const c = ZS.ITEMS?.[type]?.color || 0x888888;
        const g = new THREE.Group();
        addBox(g, m(c), 0.12, 0.10, 0.06, 0, 0, 0);
        return g;
      }
    }
  }

  // ── Armes à feu ───────────────────────────────────────────────────────────

  function _pistol() {
    const g = new THREE.Group();
    addBox(g, m(0x222233), 0.055, 0.055, 0.38,  0,     0,      0);      // canon
    addBox(g, m(0x333344), 0.10,  0.11,  0.19,  0,    -0.055,  0.07);   // corps
    addBox(g, m(0x333344), 0.072, 0.16,  0.072, 0,    -0.148,  0.10);   // poignée
    addBox(g, m(0x222233), 0.03,  0.03,  0.10,  0,     0.022, -0.16);   // guidon
    addBox(g, m(0x555566), 0.092, 0.022, 0.12,  0,    -0.055,  0.04);   // chargeur
    return g;
  }

  function _shotgun() {
    const g = new THREE.Group();
    addBox(g, m(0x553311), 0.065, 0.065, 0.55,  0,     0,      0);
    addBox(g, m(0x885533), 0.11,  0.095, 0.34,  0,    -0.06,   0.09);
    addBox(g, m(0x885533), 0.08,  0.16,  0.08,  0,    -0.17,   0.11);
    addBox(g, m(0x664422), 0.10,  0.038, 0.44,  0,     0.055,  0.02);   // pompe
    return g;
  }

  function _rifle() {
    const g = new THREE.Group();
    addBox(g, m(0x332211), 0.040, 0.040, 0.75,  0,     0,      0);
    addBox(g, m(0x885533), 0.076, 0.095, 0.46,  0,    -0.046,  0.12);
    addBox(g, m(0x332211), 0.055, 0.13,  0.055, 0,    -0.14,   0.12);
    addBox(g, m(0x444444), 0.044, 0.036, 0.22, -0.054, 0.022, -0.04);   // lunette
    addBox(g, m(0x333333), 0.040, 0.040, 0.10, -0.054, 0.046, -0.10);   // support lunette
    return g;
  }

  // ── Mêlée ─────────────────────────────────────────────────────────────────

  function _knife() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.018, 0.26, 0.052, 0,  0.09,  0);           // lame
    addBox(g, m(0xaaaaaa), 0.024, 0.018, 0.072, 0,  -0.04, 0);          // garde
    addBox(g, m(0x553322), 0.038, 0.12,  0.042, 0, -0.115, 0);          // manche
    return g;
  }

  function _axe(woodColor) {
    const g = new THREE.Group();
    addBox(g, m(woodColor), 0.036, 0.50, 0.036, 0,    0,    0);         // manche
    addBox(g, m(0x999988),  0.036, 0.22, 0.13,  0.04, 0.22, 0);        // tête
    addBox(g, m(0x888877),  0.028, 0.18, 0.04,  0.04, 0.22, 0.07);     // tranchant
    return g;
  }

  function _ironBar() {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8), m(0x777788));
    g.add(bar);
    return g;
  }

  function _machette() {
    const g = new THREE.Group();
    addBox(g, m(0xccccbb), 0.018, 0.44, 0.115, 0,  0.09, 0);
    addBox(g, m(0xaaaaaa), 0.022, 0.016, 0.13,  0, -0.14, 0);           // garde
    addBox(g, m(0x553322), 0.040, 0.14,  0.044, 0, -0.19, 0);
    return g;
  }

  function _spear() {
    const g = new THREE.Group();
    addBox(g, m(0x885533), 0.036, 0.78, 0.036, 0, 0, 0);
    addBox(g, m(0xccccaa), 0.026, 0.16, 0.058, 0, 0.43, 0);
    return g;
  }

  function _bat() {
    const g = new THREE.Group();
    addBox(g, m(0x886644), 0.058, 0.56, 0.058, 0, 0.04, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(0x999999), 0.008, 0.008, 0.076, i * 0.022, 0.22, 0);  // clous
    return g;
  }

  // ── Outils ────────────────────────────────────────────────────────────────

  function _hammer() {
    const g = new THREE.Group();
    addBox(g, m(0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(0x555555), 0.18,  0.075, 0.058, 0,  0.19, 0);
    addBox(g, m(0x777777), 0.032, 0.032, 0.08,  0.10, 0.16, 0.06);      // panne
    return g;
  }

  function _pickaxe() {
    const g = new THREE.Group();
    addBox(g, m(0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(0x888888), 0.28,  0.048, 0.048, 0,  0.20, 0);           // traverse
    addBox(g, m(0x777777), 0.048, 0.052, 0.11,  0.14, 0.17, 0.062);     // pointe
    return g;
  }

  function _lighter() {
    const g = new THREE.Group();
    addBox(g, m(0xcc3311), 0.055, 0.095, 0.028, 0, 0,     0);
    addBox(g, m(0x888888), 0.038, 0.016, 0.022, 0, 0.056, 0);           // roue
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.042, 6), m(0xff8800));
    flame.position.set(0, 0.082, 0); g.add(flame);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.026, 6), m(0xffff44));
    tip.position.set(0, 0.094, 0); g.add(tip);
    return g;
  }

  // ── Nourriture ────────────────────────────────────────────────────────────

  function _bottle(color, opacity = 1) {
    const g = new THREE.Group();
    const mat_ = opacity < 1
      ? new THREE.MeshLambertMaterial({ color, transparent: true, opacity })
      : m(color);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.19, 10), mat_);
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.034, 0.06, 8), mat_);
    neck.position.y = 0.125; g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.018, 8), m(0x555555));
    cap.position.y = 0.160; g.add(cap);
    return g;
  }

  function _tallCan(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.17, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.058, 0.011, 0.058, 0,  0.092, 0);
    addBox(g, m(0x666666), 0.036, 0.008, 0.036, 0,  0.102, 0);
    return g;
  }

  function _can(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.092, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.082, 0.009, 0.082, 0,  0.051, 0);
    return g;
  }

  function _bread() {
    const g = new THREE.Group();
    addBox(g, m(0xcc9944), 0.18, 0.082, 0.12,  0,  0,     0);
    addBox(g, m(0xddbb66), 0.10, 0.042, 0.10,  0,  0.062, 0);           // top doré
    addBox(g, m(0xbb8833), 0.18, 0.016, 0.12,  0, -0.049, 0);           // dessous
    return g;
  }

  function _apple() {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), m(0xdd2222));
    g.add(sphere);
    addBox(g, m(0x553322), 0.010, 0.044, 0.010, 0, 0.078, 0);           // tige
    return g;
  }

  function _meat(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.062, 0.12,  0,       0,    0);
    addBox(g, m(0xffeedd),  0.09, 0.030, 0.07,  0.020,  0.046, 0);      // gras
    return g;
  }

  // ── Médical ───────────────────────────────────────────────────────────────

  function _bandage() {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.076, 10), m(0xffffff));
    roll.rotation.z = Math.PI / 2; g.add(roll);
    const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.014, 10),
      new THREE.MeshLambertMaterial({ color: 0xffeeee, transparent: true, opacity: 0.7 }));
    strip.rotation.z = Math.PI / 2; strip.position.x = -0.045; g.add(strip);
    return g;
  }

  function _medkit() {
    const g = new THREE.Group();
    addBox(g, m(0xcc2222), 0.19, 0.125, 0.082, 0,  0,     0);
    addBox(g, m(0xffffff), 0.018, 0.085, 0.01, 0,  0,    -0.046);       // croix
    addBox(g, m(0xffffff), 0.085, 0.018, 0.01, 0,  0,    -0.046);
    addBox(g, m(0x881111), 0.19,  0.012, 0.082, 0,  0.068, 0);          // couvercle
    return g;
  }

  function _syringe() {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.20, 8),
      new THREE.MeshLambertMaterial({ color: 0x88bbff, transparent: true, opacity: 0.70 })
    );
    g.add(barrel);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.066, 6), m(0xcccccc));
    needle.position.y = 0.133; g.add(needle);
    addBox(g, m(0xff4444), 0.030, 0.048, 0.030, 0, -0.122, 0);          // piston
    addBox(g, m(0xddddee), 0.036, 0.010, 0.036, 0, -0.148, 0);
    return g;
  }

  // ── Munitions ─────────────────────────────────────────────────────────────

  function _ammoBox(color) {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.13, 0.068, 0.092, 0,  0,     0);
    addBox(g, m(color),    0.11, 0.012, 0.078, 0,  0.040, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(color), 0.010, 0.030, 0.010, i * 0.036, 0.042, 0);
    return g;
  }

  // ── Ressources ────────────────────────────────────────────────────────────

  function _log() {
    const g = new THREE.Group();
    const log_ = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.22, 8), m(0x885533));
    log_.rotation.z = Math.PI / 2; g.add(log_);
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.040, 8), m(0xaa7744));
    end.rotation.y = Math.PI / 2; end.position.x = 0.11; g.add(end);
    return g;
  }

  function _plank() {
    const g = new THREE.Group();
    addBox(g, m(0xbb8844), 0.22, 0.030, 0.088, 0, 0,  0);
    addBox(g, m(0x997733), 0.22, 0.008, 0.088, 0, 0.019, 0);
    return g;
  }

  function _ingot(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.052, 0.076, 0,  0,     0);
    addBox(g, m(0xffffff), 0.025, 0.010, 0.050, 0.044, 0.032, 0);      // reflet
    return g;
  }

  function _nails() {
    const g = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.10, 5), m(0x888888));
      nail.position.set(i * 0.020, 0, 0); g.add(nail);
    }
    addBox(g, m(0x333333), 0.11, 0.014, 0.014, 0, -0.056, 0);
    return g;
  }

  function _coil(color) {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 14), m(color));
    torus.rotation.x = Math.PI / 2; g.add(torus);
    return g;
  }

  function _cloth() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.18, 0.012, 0.14, 0, 0,  0);
    addBox(g, m(0xccccbb), 0.18, 0.012, 0.14, 0.018, 0.022, 0.018);
    return g;
  }

  // ── Équipement ────────────────────────────────────────────────────────────

  function _helmet() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), m(0x556644));
    dome.position.y = 0.01; g.add(dome);
    addBox(g, m(0x445533), 0.17, 0.026, 0.016, 0, -0.06, -0.09);        // visière
    return g;
  }

  function _vest() {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.19, 0.22, 0.072, 0,  0,    0);
    addBox(g, m(0x444433), 0.06, 0.19, 0.076, 0.13,  0, 0);             // côté
    addBox(g, m(0x555544), 0.04, 0.06, 0.080, 0.068, 0.095, 0);         // poche
    return g;
  }

  function _backpack(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.20, 0.080, 0,  0,     0);
    addBox(g, m(0xddcc88),  0.12, 0.012, 0.084, 0,  0.072, 0);          // sangle
    addBox(g, m(0x222222),  0.04, 0.04,  0.010, 0.028,  0.008, -0.046); // fermoir
    return g;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addBox(parent, material, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function m(color) { return new THREE.MeshLambertMaterial({ color }); }

  window.ZS = window.ZS || {};
  ZS.createPlayerModel = createPlayerModel;
  ZS.createZombieModel = createZombieModel;
  ZS.createFPSArms     = createFPSArms;
  ZS.updateHandItem    = updateHandItem;
  ZS.setRemoteHandItem = setRemoteHandItem;
  ZS.muzzleFlash       = muzzleFlash;
  ZS.getItemModel      = getItemModel;
}());
