// Layout camp spawn + props herbes — extrait de spawn_clearing.js (IIFE)
function buildCampLayout(scene, cx, cz, baseY, B) {

    // ── Sud-est : réserve de bois (hors sentier) ─────────────────────────────
    spawnDecorPrefab(scene, 'spawn_log_pile', cx + 1.85, baseY + 0.02, cz - 1.65);

    // ── Est : caisse de ravitaillement ───────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_supply_crate', cx + 2.25, baseY, cz + 0.25, { rotY: -0.45 });
    spawnDecorPrefab(scene, 'spawn_marker_right', cx + 1.7, baseY, cz + 0.9);

    // ── Ouest : zone nuit ───────────────────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_bedroll', cx - 2.05, baseY, cz - 0.15, { rotY: 0.35 });
    spawnDecorPrefab(scene, 'spawn_backpack', cx - 1.55, baseY, cz + 0.55, { rotY: 0.6 });
    spawnDecorPrefab(scene, 'spawn_lean_to', cx - 1.95, baseY + 0.02, cz + 0.05, { rotY: 0.18 });
    spawnDecorPrefab(scene, 'spawn_marker_left', cx - 2.75, baseY, cz + 0.25);

    // ── Nord (derrière le feu) : assises ─────────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_stump_seat', cx - 0.85, baseY, cz + 1.55);
    spawnDecorPrefab(scene, 'spawn_stump_seat', cx + 0.85, baseY, cz + 1.55);
    spawnDecorPrefab(scene, 'spawn_marker_left', cx - 0.25, baseY, cz + 2.35);
    spawnDecorPrefab(scene, 'spawn_marker_right', cx + 0.35, baseY, cz + 2.35);

    // ── Côté feu : gourde sur pierre plate ───────────────────────────────────
    spawnDecorPrefab(scene, 'spawn_flat_stone', cx + 1.05, baseY, cz - 0.45);
    spawnDecorPrefab(scene, 'spawn_drink_set', cx + 1.05, baseY + 0.08, cz - 0.45);

  }

  /** Herbes en lisière uniquement (rien de confus dans le camp) */
  function buildCampProps(scene, cx, cz, baseY, B) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 4.8 + (i % 3) * 0.25;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (_onPath(px, pz)) continue;
      const py = ZS.getTerrainHeight(px, pz);
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.15, 4),
        new THREE.MeshLambertMaterial({ color: i % 2 ? 0x3a6828 : 0x4a7830 })
      );
      tuft.position.set(px, py + 0.06, pz);
      tuft.rotation.y = a;
      scene.add(tuft);
    }
  }

  /** Alias regroupé pour le secteur spawn */
  function buildSpawnCamp(scene, cx, cz, baseY, B) {
    buildCampGround(scene, cx, cz, baseY, B);
    buildCampLayout(scene, cx, cz, baseY, B);
    buildCampProps(scene, cx, cz, baseY, B);
  }

  /** Points du sentier spawn → route goudronnée (14, -18) */
