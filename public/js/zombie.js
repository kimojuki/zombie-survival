// Client-side zombie manager: creates/updates/removes zombie meshes
(function () {
  'use strict';

  const zombieMeshes = new Map(); // id -> { group, healthBar }
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
    // Remove zombies not in the latest tick
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
    // Fall-down animation via flag; removed after 600ms
    entry.dying = true;
    entry.dieTimer = 0;
    setTimeout(() => _remove(id), 700);
  }

  function tick(dt) {
    zombieMeshes.forEach((entry) => {
      if (entry.dying) {
        entry.dieTimer = (entry.dieTimer || 0) + dt;
        entry.group.rotation.x = Math.min(Math.PI / 2, entry.dieTimer * 3);
        entry.group.position.y -= dt * 0.5;
      }
      // Animate arms (slight sway)
      entry.animTime = (entry.animTime || 0) + dt;
      const sway = Math.sin(entry.animTime * 4) * 0.08;
      if (entry.lArm) entry.lArm.rotation.z =  sway + 0.1;
      if (entry.rArm) entry.rArm.rotation.z = -sway - 0.1;
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────

  function _add(z) {
    const group = ZS.createZombieModel();
    group.position.set(z.x, ZS.getTerrainHeight(z.x, z.z), z.z);
    group.userData.id = z.id;

    // Health bar (floating above head)
    const hbGroup = _makeHealthBar();
    hbGroup.position.y = 2.4;
    group.add(hbGroup);

    const entry = { group, hbGroup, lArm: group.children[5], rArm: group.children[6], animTime: 0 };
    zombieMeshes.set(z.id, entry);
    _scene.add(group);
  }

  function _update(z) {
    const entry = zombieMeshes.get(z.id);
    if (!entry || entry.dying) return;
    const target = ZS.getTerrainHeight(z.x, z.z);
    entry.group.position.set(z.x, target, z.z);
    // Face movement direction
    if (z.lastX !== undefined) {
      const dx = z.x - z.lastX, dz = z.z - z.lastZ;
      if (Math.hypot(dx, dz) > 0.01) {
        entry.group.rotation.y = Math.atan2(dx, dz);
      }
    }
    z.lastX = z.x; z.lastZ = z.z;
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
