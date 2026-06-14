// Modèles procéduraux items — extrait de player.js (IIFE)
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
      case 'wpn_arc_artisanal':             return _bow();
      case 'wpn_lance_artisanale':          return _spear();
      case 'wpn_lance_bois':                return _spear(0x886633);
      case 'wpn_lance_pierre':              return _spear(0x777766, true);
      case 'wpn_batte_cloutee':             return _bat();
      // ── Outils ───────────────────────────────────────────────────────────
      case 'tool_marteau':                  return _hammer();
      case 'tool_caillou':                  return _rock();
      case 'tool_hachette':                 return _axe(0x775522);
      case 'tool_hache_pierre':             return _axe(0x665544, true);
      case 'tool_pioche':                   return _pickaxe();
      case 'tool_pioche_pierre':            return _pickaxe(0x666666, true);
      case 'tool_torche':                   return _lighter();
      // ── Nourriture ───────────────────────────────────────────────────────
      case 'food_eau_bouteille':            return _bottle(0x88bbff, 0.85);
      case 'food_boisson_energisante':      return _tallCan(0xeecc00);
      case 'food_conserves':               return _can(0xaaaaaa);
      case 'food_haricots_boite':           return _can(0xcc7733);
      case 'food_soupe_conserve':           return _can(0xdd9933);
      case 'food_pain':                     return _bread();
      case 'food_sandwich':                 return _sandwich();
      case 'food_fruits':                   return _apple();
      case 'food_viande_crue':              return _meat(0xcc4444);
      case 'food_viande_cuite':             return _meat(0x884422);
      case 'food': case 'medkit':           return _can(0xcc8844);
      // ── Médical ──────────────────────────────────────────────────────────
      case 'med_bandage':                   return _bandage();
      case 'med_kit_soin':                  return _medkit();
      case 'med_pilules_anti_infection':    return _pillBlister();
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
      case 'struct_mur_bois':
      case 'struct_mur_embrasure_porte':
      case 'struct_mur_embrasure_grande_porte':
      case 'struct_porte_bois':
      case 'struct_grande_porte_bois': case 'struct_plancher_bois':
      case 'struct_plafond_bois':
      case 'struct_escalier_bois':          return _plank();
      case 'tool_verrou':                   return _lockItem();
      case 'struct_cle':                    return _keyItem();
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
    return _setGripPoint(g, 0, -0.14, 0.10);
  }

  function _shotgun() {
    const g = new THREE.Group();
    addBox(g, m(0x553311), 0.065, 0.065, 0.55,  0,     0,      0);
    addBox(g, m(0x885533), 0.11,  0.095, 0.34,  0,    -0.06,   0.09);
    addBox(g, m(0x885533), 0.08,  0.16,  0.08,  0,    -0.17,   0.11);
    addBox(g, m(0x664422), 0.10,  0.038, 0.44,  0,     0.055,  0.02);   // pompe
    return _setGripPoint(g, 0, -0.17, 0.10);
  }

  function _rifle() {
    const g = new THREE.Group();
    addBox(g, m(0x332211), 0.040, 0.040, 0.75,  0,     0,      0);
    addBox(g, m(0x885533), 0.076, 0.095, 0.46,  0,    -0.046,  0.12);
    addBox(g, m(0x332211), 0.055, 0.13,  0.055, 0,    -0.14,   0.12);
    addBox(g, m(0x444444), 0.044, 0.036, 0.22, -0.054, 0.022, -0.04);   // lunette
    addBox(g, m(0x333333), 0.040, 0.040, 0.10, -0.054, 0.046, -0.10);   // support lunette
    return _setGripPoint(g, 0, -0.14, 0.12);
  }

  // ── Mêlée ─────────────────────────────────────────────────────────────────

  function _knife() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.018, 0.26, 0.052, 0,  0.09,  0);           // lame
    addBox(g, m(0xaaaaaa), 0.024, 0.018, 0.072, 0,  -0.04, 0);          // garde
    addBox(g, m(0x553322), 0.038, 0.12,  0.042, 0, -0.115, 0);          // manche
    return _setGripPoint(g, 0, -0.05, 0);
  }

  function _axe(woodColor, stoneHead) {
    const g = new THREE.Group();
    addBox(g, m(woodColor || 0x887733), 0.040, 0.76, 0.040, 0,    0.00, 0);         // manche
    addBox(g, m(0x8b8877),  0.065, 0.12, 0.085, 0.04, 0.28, 0.00);      // collet
    const headColor = stoneHead ? 0x7a7468 : 0x999988;
    addBox(g, m(headColor),   0.11,  0.22, 0.11,  0.12, 0.40, 0.01);     // tête
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.18, 0.04),
      m(stoneHead ? 0x8a8578 : 0xdddddd)
    );
    blade.rotation.z = -0.92;
    blade.position.set(0.32, 0.46, 0.08);
    g.add(blade);
    addBox(g, m(stoneHead ? 0x6e6a60 : 0x666655),   0.07,  0.07, 0.09,  0.08, 0.36, -0.05);
    return _setGripPoint(g, 0, -0.03, 0);
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
    return _setGripPoint(g, 0, -0.05, 0);
  }

  function _spear(woodColor, stoneTip) {
    const g = new THREE.Group();
    addBox(g, m(woodColor || 0x885533), 0.036, 0.78, 0.036, 0, 0, 0);
    addBox(g, m(stoneTip ? 0x7a7468 : 0xccccaa), 0.026, 0.16, 0.058, 0, 0.43, 0);
    return _setGripPoint(g, 0, -0.18, 0);
  }

  function _bow() {
    const g = new THREE.Group();
    addBox(g, m(0x886633), 0.04, 0.62, 0.04, 0, 0.08, 0);
    const limb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), m(0x775522));
    limb.rotation.z = 0.55; limb.position.set(-0.12, 0.34, 0); g.add(limb);
    const limb2 = limb.clone(); limb2.rotation.z = -0.55; limb2.position.set(0.12, 0.34, 0); g.add(limb2);
    addBox(g, m(0xddddcc), 0.008, 0.52, 0.008, 0, 0.10, -0.02);
    return _setGripPoint(g, 0, -0.12, 0.04);
  }

  function _bat() {
    const g = new THREE.Group();
    addBox(g, m(0x886644), 0.058, 0.56, 0.058, 0, 0.04, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(0x999999), 0.008, 0.008, 0.076, i * 0.022, 0.22, 0);  // clous
    return _setGripPoint(g, 0, -0.04, 0);
  }

  // ── Outils ────────────────────────────────────────────────────────────────

  function _hammer() {
    const g = new THREE.Group();
    addBox(g, m(0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(0x555555), 0.18,  0.075, 0.058, 0,  0.19, 0);
    addBox(g, m(0x777777), 0.032, 0.032, 0.08,  0.10, 0.16, 0.06);      // panne
    return _setGripPoint(g, 0, -0.04, 0);
  }

  function _rock() {
    const g = new THREE.Group();
    if (ZS.RockPrefab?.buildHandRock) {
      ZS.RockPrefab.buildHandRock(g, { rockSeed: 1337 });
    } else {
      addBox(g, m(0x9a9588), 0.10, 0.08, 0.12, 0, 0, 0);
    }
    return _setGripPoint(g, 0, 0, 0);
  }

  function _pickaxe(handleColor, stoneHead) {
    const g = new THREE.Group();
    addBox(g, m(handleColor || 0x553322), 0.036, 0.44, 0.036, 0, -0.04, 0);
    addBox(g, m(stoneHead ? 0x7a7468 : 0x888888), 0.28,  0.048, 0.048, 0,  0.20, 0);
    addBox(g, m(stoneHead ? 0x6e6a60 : 0x777777), 0.048, 0.052, 0.11,  0.14, 0.17, 0.062);
    return _setGripPoint(g, 0, -0.04, 0);
  }

  function _lighter() {
    const g = new THREE.Group();
    addBox(g, m(0xcc3311), 0.055, 0.095, 0.028, 0, 0,     0);
    addBox(g, m(0x888888), 0.038, 0.016, 0.022, 0, 0.056, 0);           // roue
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.042, 6), m(0xff8800));
    flame.position.set(0, 0.082, 0); g.add(flame);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.026, 6), m(0xffff44));
    tip.position.set(0, 0.094, 0); g.add(tip);
    return _setGripPoint(g, 0, -0.02, 0);
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
    return _setGripPoint(g, 0, -0.03, 0);
  }

  function _tallCan(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.17, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.058, 0.011, 0.058, 0,  0.092, 0);
    addBox(g, m(0x666666), 0.036, 0.008, 0.036, 0,  0.102, 0);
    return _setGripPoint(g, 0, -0.03, 0);
  }

  function _can(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.092, 10), m(color));
    g.add(body);
    addBox(g, m(0x777777), 0.082, 0.009, 0.082, 0,  0.051, 0);
    return _setGripPoint(g, 0, -0.02, 0);
  }

  function _bread() {
    const g = new THREE.Group();
    addBox(g, m(0xcc9944), 0.18, 0.082, 0.12,  0,  0,     0);
    addBox(g, m(0xddbb66), 0.10, 0.042, 0.10,  0,  0.062, 0);           // top doré
    addBox(g, m(0xbb8833), 0.18, 0.016, 0.12,  0, -0.049, 0);           // dessous
    return _setGripPoint(g, 0, 0, 0);
  }

  function _sandwich() {
    const g = new THREE.Group();
    addBox(g, m(0xddbb66), 0.20, 0.034, 0.14,  0,  0.048, 0);
    addBox(g, m(0x88aa55), 0.17, 0.028, 0.12,  0,  0.014, 0);
    addBox(g, m(0xcc8844), 0.15, 0.022, 0.11,  0, -0.010, 0);
    addBox(g, m(0xddbb66), 0.20, 0.034, 0.14,  0, -0.048, 0);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _apple() {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), m(0xdd2222));
    g.add(sphere);
    addBox(g, m(0x553322), 0.010, 0.044, 0.010, 0, 0.078, 0);           // tige
    return _setGripPoint(g, 0, 0, 0);
  }

  function _meat(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.062, 0.12,  0,       0,    0);
    addBox(g, m(0xffeedd),  0.09, 0.030, 0.07,  0.020,  0.046, 0);      // gras
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Médical ───────────────────────────────────────────────────────────────

  function _bandage() {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.076, 10), m(0xffffff));
    roll.rotation.z = Math.PI / 2; g.add(roll);
    const strip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.014, 10),
      new THREE.MeshLambertMaterial({ color: 0xffeeee, transparent: true, opacity: 0.7 }));
    strip.rotation.z = Math.PI / 2; strip.position.x = -0.045; g.add(strip);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _medkit() {
    const g = new THREE.Group();
    addBox(g, m(0xcc2222), 0.19, 0.125, 0.082, 0,  0,     0);
    addBox(g, m(0xffffff), 0.018, 0.085, 0.01, 0,  0,    -0.046);       // croix
    addBox(g, m(0xffffff), 0.085, 0.018, 0.01, 0,  0,    -0.046);
    addBox(g, m(0x881111), 0.19,  0.012, 0.082, 0,  0.068, 0);          // couvercle
    return _setGripPoint(g, 0, 0, 0);
  }

  function _pillBlister() {
    const g = new THREE.Group();
    const foil = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.018, 0.10),
      new THREE.MeshLambertMaterial({ color: 0xd8e8f0 }),
    );
    g.add(foil);
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.088), m(0xf4f8ff));
    card.position.y = 0.012; g.add(card);
    const pillMat = m(0x88ddaa);
    const pillA = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.028, 4, 8), pillMat);
    pillA.rotation.z = Math.PI / 2;
    pillA.position.set(-0.028, 0.022, 0);
    g.add(pillA);
    const pillB = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.028, 4, 8), pillMat);
    pillB.rotation.z = Math.PI / 2;
    pillB.position.set(0.028, 0.022, 0);
    g.add(pillB);
    const label = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.03), m(0x44aa66));
    label.position.set(0, 0.018, -0.048);
    g.add(label);
    return _setGripPoint(g, 0, 0, 0);
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
    return _setGripPoint(g, 0, -0.07, 0);
  }

  // ── Munitions ─────────────────────────────────────────────────────────────

  function _ammoBox(color) {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.13, 0.068, 0.092, 0,  0,     0);
    addBox(g, m(color),    0.11, 0.012, 0.078, 0,  0.040, 0);
    for (let i = -1; i <= 1; i++)
      addBox(g, m(color), 0.010, 0.030, 0.010, i * 0.036, 0.042, 0);
    return _setGripPoint(g, 0, -0.01, 0);
  }

  // ── Ressources ────────────────────────────────────────────────────────────

  function _log() {
    const g = new THREE.Group();
    const log_ = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.22, 8), m(0x885533));
    log_.rotation.z = Math.PI / 2; g.add(log_);
    const end = new THREE.Mesh(new THREE.CircleGeometry(0.040, 8), m(0xaa7744));
    end.rotation.y = Math.PI / 2; end.position.x = 0.11; g.add(end);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _plank() {
    const g = new THREE.Group();
    addBox(g, m(0xbb8844), 0.22, 0.030, 0.088, 0, 0,  0);
    addBox(g, m(0x997733), 0.22, 0.008, 0.088, 0, 0.019, 0);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _lockItem() {
    const g = new THREE.Group();
    addBox(g, m(0x555566), 0.08, 0.10, 0.04, 0, 0, 0);
    addBox(g, m(0x777788), 0.05, 0.05, 0.02, 0, 0.06, 0.02);
    return _setGripPoint(g, 0, -0.02, 0.04);
  }

  function _keyItem() {
    const g = new THREE.Group();
    addBox(g, m(0xccaa44), 0.06, 0.02, 0.02, 0.04, 0, 0);
    addBox(g, m(0xccaa44), 0.025, 0.025, 0.015, -0.02, 0, 0);
    addBox(g, m(0xaa8822), 0.012, 0.012, 0.012, -0.05, 0, 0);
    return _setGripPoint(g, 0, -0.02, 0.02);
  }

  function _ingot(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.052, 0.076, 0,  0,     0);
    addBox(g, m(0xffffff), 0.025, 0.010, 0.050, 0.044, 0.032, 0);      // reflet
    return _setGripPoint(g, 0, 0, 0);
  }

  function _nails() {
    const g = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.10, 5), m(0x888888));
      nail.position.set(i * 0.020, 0, 0); g.add(nail);
    }
    addBox(g, m(0x333333), 0.11, 0.014, 0.014, 0, -0.056, 0);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _coil(color) {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 14), m(color));
    torus.rotation.x = Math.PI / 2; g.add(torus);
    return _setGripPoint(g, 0, 0, 0);
  }

  function _cloth() {
    const g = new THREE.Group();
    addBox(g, m(0xddddcc), 0.18, 0.012, 0.14, 0, 0,  0);
    addBox(g, m(0xccccbb), 0.18, 0.012, 0.14, 0.018, 0.022, 0.018);
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Équipement ────────────────────────────────────────────────────────────

  function _helmet() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), m(0x556644));
    dome.position.y = 0.01; g.add(dome);
    addBox(g, m(0x445533), 0.17, 0.026, 0.016, 0, -0.06, -0.09);        // visière
    return _setGripPoint(g, 0, 0, 0);
  }

  function _vest() {
    const g = new THREE.Group();
    addBox(g, m(0x333322), 0.19, 0.22, 0.072, 0,  0,    0);
    addBox(g, m(0x444433), 0.06, 0.19, 0.076, 0.13,  0, 0);             // côté
    addBox(g, m(0x555544), 0.04, 0.06, 0.080, 0.068, 0.095, 0);         // poche
    return _setGripPoint(g, 0, 0, 0);
  }

  function _backpack(color) {
    const g = new THREE.Group();
    addBox(g, m(color),     0.16, 0.20, 0.080, 0,  0,     0);
    addBox(g, m(0xddcc88),  0.12, 0.012, 0.084, 0,  0.072, 0);          // sangle
    addBox(g, m(0x222222),  0.04, 0.04,  0.010, 0.028,  0.008, -0.046); // fermoir
    return _setGripPoint(g, 0, 0, 0);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const _boxGeoCache = new Map();
  const _matCache = new Map();
