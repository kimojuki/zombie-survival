// Client-side zombie manager: creates/updates/removes zombie meshes
(function () {
  'use strict';

  const zombieMeshes = new Map(); // id -> entry
  let _scene = null;

  function init(scene) {
    _scene = scene;
  }

  function syncAll(zombieArray) {
    const seen = new Set();
    for (const z of zombieArray) {
      seen.add(z.id);
      if (!zombieMeshes.has(z.id)) {
        _add(z);
      } else {
        _update(z);
      }
    }
    for (const [id] of zombieMeshes) {
      if (!seen.has(id)) _remove(id);
    }
  }

  function spawn(z) {
    if (!zombieMeshes.has(z.id)) _add(z);
  }

  function hit(id, health) {
    const entry = zombieMeshes.get(id);
    if (!entry) return;
    _flashRed(entry.group);
    _updateHealthBar(entry, health);
  }

  function die(id) {
    const entry = zombieMeshes.get(id);
    if (!entry) return;
    entry.dying = true;
    entry.dieTimer = 0;
    setTimeout(() => _remove(id), 700);
  }

  function tick(dt) {
    zombieMeshes.forEach((entry) => {
      if (entry.dying) {
        entry.dieTimer += dt;
        entry.group.rotation.x = Math.min(Math.PI / 2, entry.dieTimer * 3);
        entry.group.position.y -= dt * 0.5;
        return;
      }

      // Smooth rotation toward server-authoritative angle
      let diff = entry.targetAngle - entry.currentAngle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entry.currentAngle += diff * Math.min(1, 15 * dt);
      // ang=0 means +X; Three.js forward is -Z; rotation.y=θ gives forward (-sin θ, 0, -cos θ)
      // To face +X (ang=0): θ = -π/2 = -(0 + π/2) → negate the sum
      entry.group.rotation.y = -(entry.currentAngle + Math.PI / 2);

      const limbs = entry.group.userData.limbs;
      if (!limbs) return;

      entry.animTime += dt;

      if (entry.isMoving) {
        // Walk cycle — freq scales with zombie speed
        const freq = entry.speed * 2.2;
        const swing = Math.sin(entry.animTime * freq);
        limbs.lLeg.rotation.x =  swing * 0.45;
        limbs.rLeg.rotation.x = -swing * 0.45;
        // Arms counter-swing, keep zombie stretch-forward base
        limbs.lArm.rotation.x = Math.PI / 2.5 + (-swing * 0.28);
        limbs.rArm.rotation.x = Math.PI / 2.5 + ( swing * 0.28);
      } else {
        // Idle: ease limbs back to default pose
        limbs.lLeg.rotation.x *= 0.85;
        limbs.rLeg.rotation.x *= 0.85;
        limbs.lArm.rotation.x += (Math.PI / 2.5 - limbs.lArm.rotation.x) * 0.12;
        limbs.rArm.rotation.x += (Math.PI / 2.5 - limbs.rArm.rotation.x) * 0.12;
      }
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────

  function _add(z) {
    const group = ZS.createZombieModel();
    const initialAngle = z.angle != null ? z.angle : 0;
    group.position.set(z.x, ZS.getTerrainHeight(z.x, z.z), z.z);
    group.rotation.y = -(initialAngle + Math.PI / 2);

    const hbGroup = _makeHealthBar();
    hbGroup.position.y = 2.4;
    group.add(hbGroup);

    const entry = {
      group,
      hbGroup,
      animTime:     0,
      currentAngle: initialAngle,
      targetAngle:  initialAngle,
      speed:        z.speed || 2,
      isMoving:     false,
      prevX:        z.x,
      prevZ:        z.z
    };
    zombieMeshes.set(z.id, entry);
    _scene.add(group);
  }

  function _update(z) {
    const entry = zombieMeshes.get(z.id);
    if (!entry || entry.dying) return;

    entry.group.position.set(z.x, ZS.getTerrainHeight(z.x, z.z), z.z);

    if (z.angle != null) entry.targetAngle = z.angle;
    if (z.speed  != null) entry.speed = z.speed;

    const moved = Math.hypot(z.x - entry.prevX, z.z - entry.prevZ);
    entry.isMoving = moved > 0.005;
    entry.prevX = z.x;
    entry.prevZ = z.z;
  }

  function _remove(id) {
    const entry = zombieMeshes.get(id);
    if (!entry) return;
    _scene.remove(entry.group);
    zombieMeshes.delete(id);
  }

  function _flashRed(group) {
    group.traverse((child) => {
      if (child.isMesh) {
        const orig = child.material.color.getHex();
        child.material.color.set(0xff4444);
        setTimeout(() => child.material.color.setHex(orig), 100);
      }
    });
  }

  function _makeHealthBar() {
    const g = new THREE.Group();
    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    const fillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x22cc44 })
    );
    fillMesh.position.z = 0.001;
    g.add(bgMesh);
    g.add(fillMesh);
    g.userData.fill = fillMesh;
    return g;
  }

  function _updateHealthBar(entry, health) {
    const fill = entry.hbGroup && entry.hbGroup.userData.fill;
    if (!fill) return;
    const ratio = Math.max(0, health / 100);
    fill.scale.x = ratio;
    fill.position.x = -(1 - ratio) * 0.4;
    fill.material.color.set(ratio > 0.5 ? 0x22cc44 : ratio > 0.25 ? 0xffaa00 : 0xcc2222);
  }

  window.ZS = window.ZS || {};
  ZS.Zombies = { init, syncAll, spawn, hit, die, tick };
}());
