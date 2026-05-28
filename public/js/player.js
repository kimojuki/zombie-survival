// Minecraft-style character models and FPS arms
(function () {
  'use strict';

  const SKIN   = 0xFFCBA4;
  const SHIRT  = 0x3B82F6;
  const PANTS  = 0x1E3A8A;
  const SHOES  = 0x333333;

  function createPlayerModel() {
    const g = new THREE.Group();

    const skinMat  = mat(SKIN);
    const shirtMat = mat(SHIRT);
    const pantsMat = mat(PANTS);
    const shoesMat = mat(SHOES);

    // Head
    addBox(g, skinMat,  0.8,  0.8,  0.8,  0,     1.9,  0);
    // Eyes
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05, -0.18, 1.97, -0.4);
    addBox(g, mat(0x222222), 0.15, 0.1, 0.05,  0.18, 1.97, -0.4);
    // Body
    addBox(g, shirtMat, 0.6,  0.75, 0.3,  0,     1.12, 0);

    // Arms — pivot at shoulder top (y=1.495) so rotation.x animates naturally
    const lArm = new THREE.Group();
    lArm.position.set(-0.43, 1.495, 0);
    addBox(lArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    g.add(lArm);

    const rArm = new THREE.Group();
    rArm.position.set(0.43, 1.495, 0);
    addBox(rArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    g.add(rArm);

    // Legs — pivot at hip top (y=0.745); shoes attached here so they follow
    const lLeg = new THREE.Group();
    lLeg.position.set(-0.15, 0.745, 0);
    addBox(lLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    addBox(lLeg, shoesMat, 0.27, 0.12, 0.32, 0, -0.765, 0.03);
    g.add(lLeg);

    const rLeg = new THREE.Group();
    rLeg.position.set(0.15, 0.745, 0);
    addBox(rLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    addBox(rLeg, shoesMat, 0.27, 0.12, 0.32, 0, -0.765, 0.03);
    g.add(rLeg);

    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function createZombieModel() {
    const g = new THREE.Group();
    const skinMat  = mat(0x6daf6d);
    const shirtMat = mat(0x3a3a2a);
    const pantsMat = mat(0x2a2a1a);

    addBox(g, skinMat,  0.8,  0.8,  0.8,  0,      1.9,  0);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05, -0.17, 1.97, -0.4);
    addBox(g, mat(0xff2222), 0.15, 0.12, 0.05,  0.17, 1.97, -0.4);
    addBox(g, shirtMat, 0.6,  0.75, 0.3,  0,      1.12, 0);

    // Arms — pivot at shoulder, stretched forward (zombie pose)
    const lArm = new THREE.Group();
    lArm.position.set(-0.43, 1.495, 0);
    addBox(lArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    lArm.rotation.x = Math.PI / 2.5;
    g.add(lArm);

    const rArm = new THREE.Group();
    rArm.position.set(0.43, 1.495, 0);
    addBox(rArm, skinMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    rArm.rotation.x = Math.PI / 2.5;
    g.add(rArm);

    // Legs — pivot at hip
    const lLeg = new THREE.Group();
    lLeg.position.set(-0.15, 0.745, 0);
    addBox(lLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    g.add(lLeg);

    const rLeg = new THREE.Group();
    rLeg.position.set(0.15, 0.745, 0);
    addBox(rLeg, pantsMat, 0.25, 0.75, 0.25, 0, -0.375, 0);
    g.add(rLeg);

    g.userData.limbs = { lArm, rArm, lLeg, rLeg };
    return g;
  }

  function createFPSArms() {
    const g = new THREE.Group();
    const skinMat = mat(SKIN);
    const shirtMat = mat(SHIRT);

    // Right arm (lower right of view)
    const arm = new THREE.Group();
    addBox(arm, shirtMat, 0.2, 0.55, 0.2, 0, 0, 0);
    addBox(arm, skinMat,  0.18, 0.2, 0.18, 0, -0.38, 0);
    arm.rotation.x = 0.6;
    arm.position.set(0.25, -0.3, -0.4);
    g.add(arm);

    // Gun
    const gun = createGun();
    gun.position.set(0.25, -0.28, -0.55);
    g.add(gun);

    return g;
  }

  function createGun() {
    const g = new THREE.Group();
    const darkMat = mat(0x222222);
    const midMat  = mat(0x444444);

    addBox(g, darkMat, 0.06, 0.06, 0.35, 0,     0,     0);     // barrel
    addBox(g, midMat,  0.1,  0.12, 0.18, 0,    -0.06,  0.08);  // body
    addBox(g, darkMat, 0.07, 0.14, 0.07, 0,    -0.14,  0.1);   // grip
    addBox(g, darkMat, 0.04, 0.04, 0.08, 0,     0.04, -0.16);  // front sight

    return g;
  }

  function addBox(parent, material, w, h, d, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function mat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  window.ZS = window.ZS || {};
  ZS.createPlayerModel  = createPlayerModel;
  ZS.createZombieModel  = createZombieModel;
  ZS.createFPSArms      = createFPSArms;
}());
