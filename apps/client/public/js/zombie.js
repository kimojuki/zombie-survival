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

  function hit(id, health, maxHealth) {
    const entry = zombieMeshes.get(id);
    if (!entry) return;
    _flashRed(entry.group);
    _updateHealthBar(entry, health, maxHealth ?? entry.maxHealth);
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

      let diff = entry.targetAngle - entry.currentAngle;
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      entry.currentAngle += diff * Math.min(1, 15 * dt);
      entry.group.rotation.y = -(entry.currentAngle + Math.PI / 2);

      const limbs = entry.group.userData.limbs;
      if (!limbs) return;

      entry.animTime += dt;
      const armTarget = entry.meleeReach ? entry.armPose : entry.armPose * 0.32;

      if (entry.isMoving) {
        const freq = entry.speed * 2.2;
        const swing = Math.sin(entry.animTime * freq);
        limbs.lLeg.rotation.x =  swing * 0.45;
        limbs.rLeg.rotation.x = -swing * 0.45;
        limbs.lArm.rotation.x = armTarget + (-swing * 0.28);
        limbs.rArm.rotation.x = armTarget + ( swing * 0.28);
      } else {
        limbs.lLeg.rotation.x *= 0.85;
        limbs.rLeg.rotation.x *= 0.85;
        limbs.lArm.rotation.x += (armTarget - limbs.lArm.rotation.x) * 0.12;
        limbs.rArm.rotation.x += (armTarget - limbs.rArm.rotation.x) * 0.12;
      }
    });
  }

  function nearestDist(x, z) {
    let best = Infinity;
    zombieMeshes.forEach((e) => {
      if (e.dying) return;
      const d = Math.hypot(e.group.position.x - x, e.group.position.z - z);
      if (d < best) best = d;
    });
    return best;
  }

  /** Repousse le joueur hors du corps des zombies (collision cylindrique XZ). */
  function resolvePlayerCollision(px, pz, playerR) {
    let x = px;
    let z = pz;
    const maxDist2 = 900; // 30 m — même cull que les colliders monde
    zombieMeshes.forEach((entry) => {
      if (entry.dying) return;
      const zx = entry.group.position.x;
      const zz = entry.group.position.z;
      const dx = x - zx;
      const dz = z - zz;
      if (dx * dx + dz * dz > maxDist2) return;
      const zr = entry.collideRadius || 0.42;
      const dist = Math.hypot(dx, dz);
      const min = playerR + zr;
      if (dist >= min || dist <= 0.001) return;
      const push = min / dist;
      x = zx + dx * push;
      z = zz + dz * push;
    });
    return { x, z };
  }

  function _add(z) {
    const prefabId = z.prefabId || 'zombie_walker';
    const group = ZS.createZombieModel(prefabId);
    const initialAngle = z.angle != null ? z.angle : 0;
    group.position.set(z.x, ZS.getTerrainHeight(z.x, z.z), z.z);
    group.rotation.y = -(initialAngle + Math.PI / 2);

    const hbY = group.userData.healthBarY || 2.4;
    const hbGroup = _makeHealthBar();
    hbGroup.position.y = hbY;
    group.add(hbGroup);

    const maxHealth = z.maxHealth || z.health || 100;
    const armPose = group.userData.rig
      ? (ZS.ZombiePrefabs?.getVisual?.(prefabId)?.armPose || Math.PI / 2.5)
      : Math.PI / 2.5;

    const vis = ZS.ZombiePrefabs?.getVisual?.(prefabId) || {};
    const entry = {
      group,
      hbGroup,
      prefabId,
      maxHealth,
      collideRadius: z.collideRadius || vis.collideRadius || 0.42,
      armPose,
      animTime:     0,
      currentAngle: initialAngle,
      targetAngle:  initialAngle,
      speed:        z.speed || 2,
      isMoving:     false,
      meleeReach:   !!z.meleeReach,
      prevX:        z.x,
      prevZ:        z.z,
    };
    _updateHealthBar(entry, z.health != null ? z.health : maxHealth, maxHealth);
    entry.lastHealth = z.health != null ? z.health : maxHealth;
    zombieMeshes.set(z.id, entry);
    _scene.add(group);
  }

  function _update(z) {
    const entry = zombieMeshes.get(z.id);
    if (!entry || entry.dying) return;

    const moved = Math.hypot(z.x - entry.prevX, z.z - entry.prevZ);
    const angleSame = z.angle == null || Math.abs(z.angle - entry.targetAngle) < 0.001;
    const healthSame = z.health == null || z.health === entry.lastHealth;
    const reachSame = z.meleeReach == null || !!z.meleeReach === !!entry.meleeReach;
    if (moved < 0.0001 && angleSame && healthSame && reachSame) return;
    entry.group.position.x = z.x;
    entry.group.position.z = z.z;
    if (moved > 0.08 || entry.lastTerrainX == null
      || Math.hypot(z.x - entry.lastTerrainX, z.z - entry.lastTerrainZ) > 0.35) {
      entry.group.position.y = ZS.getTerrainHeight(z.x, z.z);
      entry.lastTerrainX = z.x;
      entry.lastTerrainZ = z.z;
    }

    if (z.angle != null) entry.targetAngle = z.angle;
    if (z.speed  != null) entry.speed = z.speed;
    if (z.meleeReach != null) entry.meleeReach = !!z.meleeReach;
    if (z.maxHealth != null) entry.maxHealth = z.maxHealth;
    if (z.collideRadius != null) entry.collideRadius = z.collideRadius;
    if (z.health != null && z.health !== entry.lastHealth) {
      _updateHealthBar(entry, z.health, entry.maxHealth);
      entry.lastHealth = z.health;
    }

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
      if (child.isMesh && child.material?.color) {
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

  function _updateHealthBar(entry, health, maxHealth) {
    const fill = entry.hbGroup && entry.hbGroup.userData.fill;
    if (!fill) return;
    const max = maxHealth || entry.maxHealth || 100;
    const ratio = Math.max(0, health / max);
    fill.scale.x = ratio;
    fill.position.x = -(1 - ratio) * 0.4;
    fill.material.color.set(ratio > 0.5 ? 0x22cc44 : ratio > 0.25 ? 0xffaa00 : 0xcc2222);
  }

  const GROAN_RANGE = 30;
  const _gFwd = new THREE.Vector3(), _gRight = new THREE.Vector3(),
        _gTo = new THREE.Vector3(), _gUp = new THREE.Vector3(0, 1, 0);

  function _scheduleGroan() {
    setTimeout(() => {
      _maybeGroan();
      _scheduleGroan();
    }, 2200 + Math.random() * 4000);
  }

  function _maybeGroan() {
    const cam = ZS._camera;
    if (!cam || !ZS.Audio || zombieMeshes.size === 0) return;
    let best = Infinity, bx = 0, bz = 0;
    zombieMeshes.forEach((e) => {
      if (e.dying) return;
      const dx = e.group.position.x - cam.position.x;
      const dz = e.group.position.z - cam.position.z;
      const d = Math.hypot(dx, dz);
      if (d < best) { best = d; bx = e.group.position.x; bz = e.group.position.z; }
    });
    if (best > GROAN_RANGE) return;
    const vol = (1 - best / GROAN_RANGE) ** 1.5;
    cam.getWorldDirection(_gFwd); _gFwd.y = 0; _gFwd.normalize();
    _gRight.crossVectors(_gFwd, _gUp).normalize();
    _gTo.set(bx - cam.position.x, 0, bz - cam.position.z).normalize();
    ZS.Audio.zombieGroan(vol, Math.max(-1, Math.min(1, _gTo.dot(_gRight))));
  }

  _scheduleGroan();

  window.ZS = window.ZS || {};
  ZS.Zombies = { init, syncAll, spawn, hit, die, tick, nearestDist, resolvePlayerCollision };
}());
