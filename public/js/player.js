// Minecraft-style character models, FPS arms, and dynamic hand items
(function () {
  'use strict';

  const SKIN  = 0xFFCBA4;
  const SHIRT = 0x3B82F6;
  const PANTS = 0x1E3A8A;
  const SHOES = 0x333333;

  // ── Player / zombie models ────────────────────────────────────────────────

  function createPlayerModel() {
    const g = new THREE.Group();
    const skinMat  = mat(SKIN);
    const shirtMat = mat(SHIRT);
    const pantsMat = mat(PANTS);
    const shoesMat = mat(SHOES);
    addBox(g, skinMat,  0.8, 0.8, 0.8, 0, 1.9, 0);
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05, -0.18, 1.97, -0.4);
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05,  0.18, 1.97, -0.4);
    addBox(g, shirtMat, 0.6, 0.75, 0.3, 0, 1.12, 0);
    const lArm = new THREE.Group(); lArm.position.set(-0.43, 1.495, 0);
    addBox(lArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0); g.add(lArm);
    const rArm = new THREE.Group(); rArm.position.set(0.43, 1.495, 0);
    addBox(rArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0); g.add(rArm);
    const lLeg = new THREE.Group(); lLeg.position.set(-0.15, 0.745, 0);
    addBox(lLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    addBox(lLeg, shoesMat, 0.27, 0.12, 0.32, 0, -0.765, 0.03); g.add(lLeg);
    const rLeg = new THREE.Group(); rLeg.position.set(0.15, 0.745, 0);
    addBox(rLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    addBox(rLeg, shoesMat, 0.27, 0.12, 0.32, 0, -0.765, 0.03); g.add(rLeg);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function createZombieModel() {
    const g = new THREE.Group();
    const skinMat  = mat(0x6daf6d);
    const shirtMat = mat(0x3a3a2a);
    const pantsMat = mat(0x2a2a1a);
    addBox(g, skinMat, 0.8, 0.8, 0.8, 0, 1.9, 0);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05, -0.17, 1.97, -0.4);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05,  0.17, 1.97, -0.4);
    addBox(g, shirtMat, 0.6, 0.75, 0.3, 0, 1.12, 0);
    const lArm = new THREE.Group(); lArm.position.set(-0.43, 1.495, 0);
    addBox(lArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    lArm.rotation.x = Math.PI / 2.5; g.add(lArm);
    const rArm = new THREE.Group(); rArm.position.set(0.43, 1.495, 0);
    addBox(rArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    rArm.rotation.x = Math.PI / 2.5; g.add(rArm);
    const lLeg = new THREE.Group(); lLeg.position.set(-0.15, 0.745, 0);
    addBox(lLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0); g.add(lLeg);
    const rLeg = new THREE.Group(); rLeg.position.set(0.15, 0.745, 0);
    addBox(rLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0); g.add(rLeg);
    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  // ── FPS Arms ──────────────────────────────────────────────────────────────

  function createFPSArms() {
    const g = new THREE.Group();
    const arm = new THREE.Group();
    addBox(arm, mat(SHIRT), 0.2, 0.55, 0.2, 0, 0, 0);
    addBox(arm, mat(SKIN),  0.18, 0.2, 0.18, 0, -0.38, 0);
    arm.rotation.x = 0.6;
    arm.position.set(0.25, -0.30, -0.40);
    g.add(arm);
    const holder = new THREE.Group();
    holder.name = 'itemHolder';
    g.add(holder);
    return g;
  }

  // Appelé par game.js chaque fois que le slot actif change
  function updateHandItem(fpsGroup, type) {
    const holder = fpsGroup.getObjectByName('itemHolder');
    if (!holder) return;
    while (holder.children.length > 0) holder.remove(holder.children[0]);
    if (!type) return;

    const mesh = _buildHandMesh(type);
    if (!mesh) return;

    const def = ZS.ITEMS?.[type];
    const pos = _handPos(def?.category || 'default', type);
    holder.position.set(pos.x, pos.y, pos.z);
    holder.rotation.set(pos.rx, pos.ry, pos.rz);
    holder.add(mesh);
  }

  // Position FPS selon catégorie / type
  function _handPos(category, type) {
    if (type === 'wpn_barre_fer' || type === 'wpn_lance_artisanale')
      return { x: 0.12, y: -0.24, z: -0.60, rx: 0.3,  ry: 0,    rz: 0 };
    const T = {
      firearm:   { x: 0.22, y: -0.28, z: -0.52, rx: 0,    ry: 0,    rz: 0 },
      melee:     { x: 0.22, y: -0.24, z: -0.46, rx: 0.3,  ry: 0,    rz: 0 },
      tool:      { x: 0.22, y: -0.26, z: -0.46, rx: 0.3,  ry: 0,    rz: 0 },
      food:      { x: 0.20, y: -0.30, z: -0.43, rx: 0,    ry: 0.25, rz:-0.15 },
      medical:   { x: 0.20, y: -0.30, z: -0.43, rx: 0,    ry: 0.25, rz:-0.15 },
      ammo:      { x: 0.20, y: -0.32, z: -0.42, rx: 0,    ry: 0.25, rz:-0.15 },
      resource:  { x: 0.20, y: -0.32, z: -0.42, rx: 0,    ry: 0.25, rz:-0.15 },
      equipment: { x: 0.20, y: -0.30, z: -0.43, rx: 0,    ry: 0.25, rz:-0.15 },
      structure: { x: 0.18, y: -0.28, z: -0.45, rx: 0,    ry: 0.25, rz:-0.15 },
      map:       { x: 0.18, y: -0.28, z: -0.42, rx:-0.2,  ry: 0,    rz: 0.1 },
    };
    return T[category] || { x: 0.20, y: -0.30, z: -0.43, rx: 0, ry: 0.25, rz:-0.15 };
  }

  // ── Constructeur de mesh main selon type ──────────────────────────────────

  function _buildHandMesh(type) {
    const def = ZS.ITEMS?.[type];
    const c   = def?.color || 0x888888;

    switch (type) {
      // Armes à feu
      case 'pistol': case 'wpn_pistolet':     return _gun(0x334466);
      case 'wpn_fusil_pompe':                  return _shotgun();
      case 'wpn_fusil_chasse':                 return _rifle();
      // Mêlée
      case 'wpn_couteau':                      return _knife();
      case 'wpn_hache_combat': case 'tool_hachette': return _axe(c);
      case 'wpn_barre_fer':                    return _ironBar();
      case 'wpn_machette':                     return _machette();
      case 'wpn_lance_artisanale':             return _lance();
      case 'wpn_batte_cloutee':                return _bat();
      // Outils
      case 'tool_marteau':                     return _hammer();
      case 'tool_pioche':                      return _pickaxe();
      case 'tool_torche':                      return _lighter();
      // Nourriture
      case 'food_eau_bouteille':               return _bottle(c);
      case 'food_boisson_energisante':         return _tallCan(c);
      case 'food_conserves': case 'food_haricots_boite': case 'food_soupe_conserve':
                                               return _can(c);
      case 'food_pain':                        return _bread();
      case 'food_fruits':                      return _fruit(c);
      case 'food_viande_crue': case 'food_viande_cuite': return _meat(c);
      case 'food': case 'medkit':              return _can(c); // legacy
      // Médical
      case 'med_bandage':                      return _bandage();
      case 'med_kit_soin':                     return _medkit();
      case 'med_seringue_anti_infection':      return _syringe(c);
      // Munitions / ressources / équipement / structures → boîte colorée
      default: {
        const g = new THREE.Group();
        addBox(g, mat(c), 0.14, 0.10, 0.08, 0, 0, 0);
        return g;
      }
    }
  }

  // ── Armes à feu ───────────────────────────────────────────────────────────

  function _gun(col) {
    const g = new THREE.Group();
    addBox(g, mat(col || 0x222222), 0.06, 0.06, 0.35, 0,     0,     0);
    addBox(g, mat(0x444444),        0.10, 0.12, 0.18, 0,    -0.06,  0.08);
    addBox(g, mat(col || 0x222222), 0.07, 0.14, 0.07, 0,    -0.14,  0.10);
    addBox(g, mat(col || 0x222222), 0.04, 0.04, 0.08, 0,     0.04, -0.16);
    return g;
  }

  function _shotgun() {
    const g = new THREE.Group();
    addBox(g, mat(0x553311), 0.06, 0.07, 0.52, 0,     0,     0);
    addBox(g, mat(0x885533), 0.12, 0.10, 0.32, 0,    -0.06,  0.09);
    addBox(g, mat(0x885533), 0.08, 0.15, 0.08, 0,    -0.17,  0.11);
    addBox(g, mat(0x553311), 0.10, 0.04, 0.42, 0,     0.05,  0.02);
    return g;
  }

  function _rifle() {
    const g = new THREE.Group();
    addBox(g, mat(0x332211), 0.04, 0.04, 0.72, 0,     0,     0);
    addBox(g, mat(0x885533), 0.08, 0.10, 0.44, 0,    -0.05,  0.12);
    addBox(g, mat(0x332211), 0.06, 0.13, 0.06, 0,    -0.14,  0.12);
    addBox(g, mat(0x444444), 0.05, 0.04, 0.22,-0.06,  0.02, -0.04);
    return g;
  }

  // ── Mêlée ─────────────────────────────────────────────────────────────────

  function _knife() {
    const g = new THREE.Group();
    addBox(g, mat(0xcccccc), 0.02, 0.22, 0.05, 0,  0.06, 0);
    addBox(g, mat(0x553322), 0.04, 0.12, 0.04, 0, -0.10, 0);
    return g;
  }

  function _axe(col) {
    const g = new THREE.Group();
    addBox(g, mat(0x553322), 0.04, 0.44, 0.04, 0,     0,    0);
    addBox(g, mat(col),      0.04, 0.20, 0.14, 0.05,  0.18, 0);
    return g;
  }

  function _ironBar() {
    const g = new THREE.Group();
    addBox(g, mat(0x888888), 0.04, 0.62, 0.04, 0, 0, 0);
    return g;
  }

  function _machette() {
    const g = new THREE.Group();
    addBox(g, mat(0xaaaaaa), 0.02, 0.40, 0.11, 0,  0.07, 0);
    addBox(g, mat(0x553322), 0.04, 0.14, 0.06, 0, -0.16, 0);
    return g;
  }

  function _lance() {
    const g = new THREE.Group();
    addBox(g, mat(0x885533), 0.04, 0.72, 0.04, 0,    0,    0);
    addBox(g, mat(0x888888), 0.03, 0.14, 0.06, 0, 0.42,    0);
    return g;
  }

  function _bat() {
    const g = new THREE.Group();
    addBox(g, mat(0x886633), 0.07, 0.52, 0.07, 0, 0.05, 0);
    for (let i = 0; i < 3; i++)
      addBox(g, mat(0xaaaaaa), 0.01, 0.01, 0.09, (i-1)*0.025, 0.22, 0);
    return g;
  }

  // ── Outils ────────────────────────────────────────────────────────────────

  function _hammer() {
    const g = new THREE.Group();
    addBox(g, mat(0x553322), 0.04, 0.42, 0.04, 0, -0.05, 0);
    addBox(g, mat(0x555555), 0.16, 0.08, 0.06, 0,  0.18, 0);
    return g;
  }

  function _pickaxe() {
    const g = new THREE.Group();
    addBox(g, mat(0x553322), 0.04, 0.40, 0.04, 0, -0.04, 0);
    addBox(g, mat(0x888888), 0.26, 0.05, 0.05, 0,  0.17, 0);
    addBox(g, mat(0x888888), 0.05, 0.05, 0.10, 0.13, 0.14, 0.05);
    return g;
  }

  function _lighter() {
    const g = new THREE.Group();
    addBox(g, mat(0xff4400), 0.06, 0.10, 0.03, 0,  0.00, 0);
    addBox(g, mat(0xff8800), 0.03, 0.04, 0.02, 0,  0.08, 0);
    addBox(g, mat(0xffff00), 0.02, 0.03, 0.02, 0,  0.11, 0);
    return g;
  }

  // ── Nourriture ────────────────────────────────────────────────────────────

  function _bottle(col) {
    const g = new THREE.Group();
    const m = mat(col, 0.55);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.18, 8), m);
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.034, 0.06, 8), m);
    neck.position.y = 0.12; g.add(neck);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), mat(0x888888));
    cap.position.y = 0.155; g.add(cap);
    return g;
  }

  function _tallCan(col) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 8), mat(col));
    g.add(body);
    addBox(g, mat(0x888888), 0.056, 0.012, 0.056, 0, 0.085, 0);
    return g;
  }

  function _can(col) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.09, 8), mat(col));
    g.add(body);
    addBox(g, mat(0x888888), 0.076, 0.010, 0.076, 0, 0.05, 0);
    return g;
  }

  function _bread() {
    const g = new THREE.Group();
    addBox(g, mat(0xddbb66), 0.17, 0.08, 0.11, 0, 0, 0);
    addBox(g, mat(0xeecc88), 0.09, 0.04, 0.09, 0, 0.06, 0);
    return g;
  }

  function _fruit(col) {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), mat(col));
    g.add(sphere);
    addBox(g, mat(0x553322), 0.01, 0.04, 0.01, 0, 0.075, 0);
    return g;
  }

  function _meat(col) {
    const g = new THREE.Group();
    addBox(g, mat(col), 0.15, 0.06, 0.11, 0, 0, 0);
    addBox(g, mat(0xfff0e0), 0.08, 0.03, 0.07, 0.02, 0.045, 0);
    return g;
  }

  // ── Médical ───────────────────────────────────────────────────────────────

  function _bandage() {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 10), mat(0xffffff));
    roll.rotation.z = Math.PI / 2; g.add(roll);
    return g;
  }

  function _medkit() {
    const g = new THREE.Group();
    addBox(g, mat(0xff3333), 0.18, 0.12, 0.08, 0, 0, 0);
    addBox(g, mat(0xffffff), 0.02, 0.08, 0.01, 0, 0, -0.045);
    addBox(g, mat(0xffffff), 0.08, 0.02, 0.01, 0, 0, -0.045);
    return g;
  }

  function _syringe(col) {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), mat(col, 0.65));
    g.add(barrel);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.06, 6), mat(0xcccccc));
    needle.position.y = 0.12; g.add(needle);
    addBox(g, mat(0xffffff), 0.032, 0.04, 0.032, 0, -0.12, 0);
    return g;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function addBox(parent, material, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function mat(color, opacity) {
    if (opacity !== undefined)
      return new THREE.MeshLambertMaterial({ color, transparent: true, opacity });
    return new THREE.MeshLambertMaterial({ color });
  }

  window.ZS = window.ZS || {};
  ZS.createPlayerModel = createPlayerModel;
  ZS.createZombieModel = createZombieModel;
  ZS.createFPSArms     = createFPSArms;
  ZS.updateHandItem    = updateHandItem;
}());
