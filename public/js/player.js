// Character models + FPS arms avec sprites items.png (12×6 grille 128px)
(function () {
  'use strict';

  const SKIN  = 0xFFCBA4;
  const SHIRT = 0x3B82F6;
  const PANTS = 0x1E3A8A;
  const SHOES = 0x333333;

  // ── Sprite map : type → [colonne, rangée] dans la grille 12×6 de items.png ──
  // Ouvrir worlDesign/items/grid-preview.html pour voir les coordonnées exactes
  const SPRITE_MAP = {
    // ── Row 0 : NOURRITURE ──────────────────────────────────────────────────
    food_eau_bouteille:           [1, 0],
    food_boisson_energisante:     [2, 0],
    food_conserves:               [3, 0],
    food_haricots_boite:          [4, 0],
    food_soupe_conserve:          [5, 0],
    food_pain:                    [6, 0],
    food_fruits:                  [7, 0],
    food_viande_crue:             [8, 0],
    food_viande_cuite:            [9, 0],
    // ── Row 1 : MÉDICAL + ARMES À FEU + ARTISANALES ─────────────────────────
    med_bandage:                  [1, 1],
    med_kit_soin:                 [2, 1],
    med_seringue_anti_infection:  [3, 1],
    wpn_pistolet:                 [5, 1],
    wpn_fusil_pompe:              [6, 1],
    wpn_fusil_chasse:             [7, 1],
    wpn_lance_artisanale:         [9, 1],
    wpn_batte_cloutee:            [10, 1],
    // ── Row 2 : CORPS À CORPS + RESSOURCES ──────────────────────────────────
    wpn_couteau:                  [1, 2],
    wpn_hache_combat:             [2, 2],
    wpn_barre_fer:                [3, 2],
    wpn_machette:                 [4, 2],
    res_bois_brut:                [6, 2],
    res_planche:                  [7, 2],
    res_ferraille:                [8, 2],
    res_metal:                    [9, 2],
    res_clous:                    [10, 2],
    res_ruban_adhesif:            [11, 2],
    // ── Row 3 : suite RESSOURCES + ÉQUIPEMENT ───────────────────────────────
    res_chiffon:                  [0, 3],
    res_corde:                    [1, 3],
    eq_petit_sac:                 [3, 3],
    eq_sac_moyen:                 [4, 3],
    eq_grand_sac:                 [5, 3],
    eq_casque:                    [7, 3],
    eq_gilet_protection:          [8, 3],
    eq_gants:                     [9, 3],
    // ── Row 4 : MUNITIONS + OUTILS ──────────────────────────────────────────
    ammo_pistolet:                [1, 4],
    ammo_fusil_pompe:             [2, 4],
    ammo_fusil_chasse:            [3, 4],
    tool_marteau:                 [5, 4],
    tool_hachette:                [6, 4],
    tool_pioche:                  [7, 4],
    tool_torche:                  [8, 4],
    // ── Row 5 : CONSTRUCTION ────────────────────────────────────────────────
    struct_mur_bois:              [1, 5],
    struct_porte_bois:            [2, 5],
    struct_grande_porte_bois:     [3, 5],
    struct_plancher_bois:         [4, 5],
    struct_escalier_bois:         [5, 5],
    // ── Legacy IDs ──────────────────────────────────────────────────────────
    pistol:   [5, 1],
    medkit:   [2, 1],
    food:     [3, 0],
    ammo:     [1, 4],
  };

  // Texture chargée une seule fois
  let _spriteTex = null;
  function _tex() {
    if (!_spriteTex) {
      _spriteTex = new THREE.TextureLoader().load('/img/items.png');
      _spriteTex.magFilter = THREE.NearestFilter;
      _spriteTex.minFilter = THREE.NearestFilter;
    }
    return _spriteTex;
  }

  // ── Player / Zombie models ─────────────────────────────────────────────────

  function createPlayerModel() {
    const g = new THREE.Group();
    const skM = mat(SKIN), shM = mat(SHIRT), paM = mat(PANTS), soM = mat(SHOES);
    addBox(g, skM, 0.8,  0.8,  0.8,  0,     1.9,  0);
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05, -0.18, 1.97, -0.4);
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05,  0.18, 1.97, -0.4);
    addBox(g, shM, 0.6,  0.75, 0.3,  0,     1.12, 0);
    const lArm = limb(g, skM, -0.43, 1.495);
    const rArm = limb(g, skM,  0.43, 1.495);
    const lLeg = legLimb(g, paM, soM, -0.15, 0.745);
    const rLeg = legLimb(g, paM, soM,  0.15, 0.745);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function createZombieModel() {
    const g = new THREE.Group();
    const skM = mat(0x6daf6d), shM = mat(0x3a3a2a), paM = mat(0x2a2a1a);
    addBox(g, skM, 0.8, 0.8, 0.8, 0, 1.9, 0);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05, -0.17, 1.97, -0.4);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05,  0.17, 1.97, -0.4);
    addBox(g, shM, 0.6, 0.75, 0.3, 0, 1.12, 0);
    const lArm = new THREE.Group(); lArm.position.set(-0.43, 1.495, 0);
    addBox(lArm, skM, 0.25, 0.75, 0.25, 0, -0.375, 0);
    lArm.rotation.x = Math.PI / 2.5; g.add(lArm);
    const rArm = new THREE.Group(); rArm.position.set(0.43, 1.495, 0);
    addBox(rArm, skM, 0.25, 0.75, 0.25, 0, -0.375, 0);
    rArm.rotation.x = Math.PI / 2.5; g.add(rArm);
    const lLeg = legLimb(g, paM, null, -0.15, 0.745);
    const rLeg = legLimb(g, paM, null,  0.15, 0.745);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function limb(parent, m, x, y) {
    const g = new THREE.Group(); g.position.set(x, y, 0);
    addBox(g, m, 0.25, 0.75, 0.25, 0, -0.375, 0); parent.add(g); return g;
  }
  function legLimb(parent, mPant, mShoe, x, y) {
    const g = new THREE.Group(); g.position.set(x, y, 0);
    addBox(g, mPant, 0.25, 0.75, 0.25, 0, -0.375, 0);
    if (mShoe) addBox(g, mShoe, 0.27, 0.12, 0.32, 0, -0.765, 0.03);
    parent.add(g); return g;
  }

  // ── FPS Arms ──────────────────────────────────────────────────────────────

  function createFPSArms() {
    const g = new THREE.Group();
    // Bras visible (manche + main)
    const arm = new THREE.Group();
    addBox(arm, mat(SHIRT), 0.20, 0.55, 0.20,  0,  0.00, 0);
    addBox(arm, mat(SKIN),  0.18, 0.20, 0.18,  0, -0.38, 0);
    arm.rotation.x = 0.6;
    arm.position.set(0.23, -0.28, -0.38);
    g.add(arm);
    // Conteneur de l'item en main
    const holder = new THREE.Group();
    holder.name = 'itemHolder';
    g.add(holder);
    return g;
  }

  // ── Mise à jour de l'item en main ─────────────────────────────────────────

  function updateHandItem(fpsGroup, type) {
    const holder = fpsGroup.getObjectByName('itemHolder');
    if (!holder) return;
    // Vider
    while (holder.children.length) holder.remove(holder.children[0]);
    if (!type) return;

    const cell = SPRITE_MAP[type];
    const def  = ZS.ITEMS?.[type];

    if (cell) {
      // ── Sprite depuis items.png ──────────────────────────────────────────
      const [cx, cy] = cell;
      const item = _makeSpriteItem(cx, cy, def);
      const pos  = _handPos(def?.category || 'default', type);
      holder.position.set(pos.x, pos.y, pos.z);
      holder.rotation.set(pos.rx, pos.ry, pos.rz);
      holder.add(item);
    } else {
      // ── Fallback : boîte colorée + label ────────────────────────────────
      const col = def?.color || 0x888888;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.10, 0.04),
        new THREE.MeshLambertMaterial({ color: col })
      );
      const pos = _handPos(def?.category || 'default', type);
      holder.position.set(pos.x, pos.y, pos.z);
      holder.add(box);
    }
  }

  // Crée un plan texturé pointant vers la bonne cellule du sprite sheet
  function _makeSpriteItem(cx, cy, def) {
    const g = new THREE.Group();
    // Fond légèrement teinté (ombre/profondeur)
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.21),
      new THREE.MeshLambertMaterial({ color: 0x111111, transparent: true, opacity: 0.55 })
    );
    shadow.position.z = -0.003;
    g.add(shadow);

    // Plan avec la portion exacte du sprite
    const geo  = new THREE.PlaneGeometry(0.19, 0.19);
    const uAttr = geo.attributes.uv;
    const u0 = cx / 12,       u1 = (cx + 1) / 12;
    const v0 = (5 - cy) / 6,  v1 = (6 - cy) / 6;
    // PlaneGeometry UV order: top-left, top-right, bottom-left, bottom-right
    uAttr.setXY(0, u0, v1);
    uAttr.setXY(1, u1, v1);
    uAttr.setXY(2, u0, v0);
    uAttr.setXY(3, u1, v0);
    uAttr.needsUpdate = true;

    const plane = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: _tex(),
      transparent: true,
      alphaTest: 0.05,
    }));
    g.add(plane);
    return g;
  }

  // Position FPS selon catégorie / item
  function _handPos(category, type) {
    // Armes longues → plus centrées
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale')
      return { x: 0.14, y: -0.22, z: -0.44, rx: 0, ry: 0.15, rz: 0 };
    const T = {
      firearm:   { x: 0.20, y: -0.22, z: -0.44, rx: 0,    ry: 0.12, rz: 0 },
      melee:     { x: 0.20, y: -0.20, z: -0.42, rx: 0.15, ry: 0.10, rz: 0 },
      tool:      { x: 0.20, y: -0.20, z: -0.42, rx: 0.15, ry: 0.10, rz: 0 },
      food:      { x: 0.19, y: -0.26, z: -0.40, rx: 0,    ry: 0.20, rz:-0.12 },
      medical:   { x: 0.19, y: -0.26, z: -0.40, rx: 0,    ry: 0.20, rz:-0.12 },
      ammo:      { x: 0.19, y: -0.28, z: -0.38, rx: 0,    ry: 0.20, rz:-0.12 },
      resource:  { x: 0.19, y: -0.28, z: -0.38, rx: 0,    ry: 0.20, rz:-0.12 },
      equipment: { x: 0.19, y: -0.26, z: -0.40, rx: 0,    ry: 0.20, rz:-0.12 },
      structure: { x: 0.17, y: -0.24, z: -0.40, rx: 0,    ry: 0.20, rz:-0.12 },
    };
    return T[category] || { x: 0.19, y: -0.26, z: -0.40, rx: 0, ry: 0.20, rz:-0.12 };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addBox(parent, material, w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function mat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  window.ZS = window.ZS || {};
  ZS.createPlayerModel = createPlayerModel;
  ZS.createZombieModel = createZombieModel;
  ZS.createFPSArms     = createFPSArms;
  ZS.updateHandItem    = updateHandItem;
}());
