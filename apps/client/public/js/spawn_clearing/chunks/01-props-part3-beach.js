// Plage, workbench, lean-to
function _buildBeachWreckDebris(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const woodBleach = M?.woodFine?.(0xc8b090) || new THREE.MeshLambertMaterial({ color: 0xc8b090 });
    const woodWet = M?.woodFine?.(0x8a6848) || new THREE.MeshLambertMaterial({ color: 0x8a6848 });
    const rope = M?.strap?.() || new THREE.MeshLambertMaterial({ color: 0x9a8860 });
    const net = new THREE.MeshLambertMaterial({ color: 0x8a9aa8, side: THREE.DoubleSide });
    const metal = M?.metal?.() || new THREE.MeshLambertMaterial({ color: 0x5a5e64 });

    const plankA = _add(g, new THREE.BoxGeometry(0.92, 0.028, 0.14), woodBleach, 0.04, 0.05, 0.02, 0.08, 0.22, 0.04);
    plankA.receiveShadow = true;

    const plankB = _add(g, new THREE.BoxGeometry(0.58, 0.024, 0.12), woodWet, -0.12, 0.11, -0.06, -0.12, -0.35, 0.18);
    const plankC = _add(g, new THREE.BoxGeometry(0.34, 0.020, 0.09), woodBleach, 0.28, 0.07, -0.14, 0.22, 0.55, -0.08);

    const splinter = _add(g, new THREE.BoxGeometry(0.18, 0.014, 0.05), woodWet, -0.32, 0.04, 0.18, 0.05, 0.8, 0.12);

    const crateCorner = _add(g, new THREE.BoxGeometry(0.22, 0.16, 0.20), woodWet, -0.28, 0.08, 0.12);
    _add(g, new THREE.BoxGeometry(0.22, 0.04, 0.04), woodBleach, -0.28, 0.18, 0.22);
    _add(g, new THREE.BoxGeometry(0.04, 0.16, 0.20), woodBleach, -0.39, 0.08, 0.12);

    const ropeCoil = _add(g, new THREE.TorusGeometry(0.11, 0.022, 6, 14), rope, 0.22, 0.04, -0.08);
    ropeCoil.rotation.x = Math.PI / 2;
    ropeCoil.rotation.z = 0.4;
    _add(g, new THREE.CylinderGeometry(0.034, 0.038, 0.06, 8), rope, 0.22, 0.04, -0.08);

    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), net);
    sail.position.set(0.08, 0.14, -0.18);
    sail.rotation.set(-0.55, 0.15, 0.22);
    sail.castShadow = true;
    sail.receiveShadow = true;
    g.add(sail);
    const sailFold = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), net);
    sailFold.position.set(-0.06, 0.09, -0.12);
    sailFold.rotation.set(-0.35, -0.4, 0.1);
    sailFold.castShadow = true;
    g.add(sailFold);

    _add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.09, 6), metal, 0.38, 0.06, 0.06, Math.PI / 2, 0, 0);
    _add(g, new THREE.SphereGeometry(0.028, 6, 5), metal, 0.41, 0.03, 0.08);

    const sandBurial = _add(g, new THREE.BoxGeometry(0.78, 0.03, 0.52),
      new THREE.MeshLambertMaterial({ color: 0xd8c898 }), 0.02, 0.015, 0.04);
    sandBurial.receiveShadow = true;
    sandBurial.castShadow = false;
  }

  /**
   * Bois flotté (plage) — rondin échoué + branche, axe vers l'ouest (sentier).
   * Pivot sol · ~1,4 m — repère naturel bouche du sentier.
   */
  function _buildBeachDriftwood(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const wood = M?.woodFine?.(0xc8b088) || new THREE.MeshLambertMaterial({ color: 0xc8b088 });
    const woodDark = M?.woodFine?.(0x9a7858) || new THREE.MeshLambertMaterial({ color: 0x9a7858 });

    const main = _add(g, new THREE.CylinderGeometry(0.055, 0.10, 1.38, 7), wood, 0.02, 0.075, 0.01, 0.06, 0, Math.PI / 2);
    main.scale.set(1, 0.92, 1);
    const knot = _add(g, new THREE.SphereGeometry(0.07, 6, 5), woodDark, -0.38, 0.08, -0.04);
    knot.scale.set(1.1, 0.7, 0.9);
    _add(g, new THREE.CylinderGeometry(0.022, 0.038, 0.48, 6), woodDark, 0.48, 0.085, 0.14, 0.25, 0.35, Math.PI / 2.4);
    _add(g, new THREE.CylinderGeometry(0.018, 0.028, 0.22, 5), wood, 0.62, 0.07, -0.08, -0.15, 0.9, Math.PI / 3);

    const sand = _add(g, new THREE.BoxGeometry(0.72, 0.02, 0.28),
      new THREE.MeshLambertMaterial({ color: 0xd8c898 }), 0.04, 0.01, 0.02);
    sand.receiveShadow = true;
    sand.castShadow = false;
  }

  /**
   * Affaires échouées (plage) — sac mouillé, gourde, sandale, casquette.
   * Pivot sol · détail −Z · ~0,65 m — trace personnelle sur le rivage.
   */
  function _buildBeachWashedGear(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    // Teintes claires : canvas × couleur sombre = sac illisible en aperçu catalogue.
    const bagBody = M?.canvas?.(0x7a8c6e) || new THREE.MeshLambertMaterial({ color: 0x7a8c6e });
    const bagFlap = M?.canvas?.(0x8a9c7a) || new THREE.MeshLambertMaterial({ color: 0x8a9c7a });
    const strap = new THREE.MeshLambertMaterial({ color: 0x5a6458 });
    const plastic = new THREE.MeshLambertMaterial({ color: 0x9ab8c8 });
    const capMat = new THREE.MeshLambertMaterial({ color: 0x3a4a38 });
    const rubber = new THREE.MeshLambertMaterial({ color: 0x4a5858 });

    const bag = _add(g, new THREE.BoxGeometry(0.36, 0.10, 0.28), bagBody, -0.04, 0.05, 0.02, 0.12, 0.18, 0.05);
    const bagOpen = _add(g, new THREE.BoxGeometry(0.30, 0.06, 0.22), bagFlap, -0.02, 0.11, -0.04, -0.45, 0.2, 0);
    _add(g, new THREE.BoxGeometry(0.05, 0.02, 0.24), strap, -0.20, 0.06, 0.04, 0.1, 0.3, 0);
    _add(g, new THREE.BoxGeometry(0.04, 0.03, 0.08), strap, 0.08, 0.08, 0.16, 0.2, -0.2, 0.15);

    const bottle = _add(g, new THREE.CylinderGeometry(0.035, 0.042, 0.20, 10), plastic, 0.20, 0.10, -0.10, 0.08, 0.4, 0.12);
    _add(g, new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8),
      new THREE.MeshLambertMaterial({ color: 0x4a90b8 }), 0.20, 0.21, -0.10, 0.08, 0.4, 0.12);
    const water = _add(g, new THREE.CylinderGeometry(0.030, 0.036, 0.11, 10),
      new THREE.MeshLambertMaterial({ color: 0x6a9ab0, transparent: true, opacity: 0.55 }),
      0.20, 0.08, -0.10, 0.08, 0.4, 0.12);
    water.castShadow = false;

    const sandal = _add(g, new THREE.BoxGeometry(0.22, 0.03, 0.10), rubber, 0.06, 0.025, 0.18, 0.05, -0.25, 0);
    _add(g, new THREE.BoxGeometry(0.04, 0.025, 0.06), rubber, 0.02, 0.04, 0.18, 0.1, -0.25, 0);
    _add(g, new THREE.BoxGeometry(0.04, 0.025, 0.06), rubber, 0.14, 0.04, 0.18, 0.1, -0.25, 0);

    const cap = _add(g, new THREE.CylinderGeometry(0.10, 0.11, 0.05, 10), capMat, -0.18, 0.03, -0.14, 0.15, 0.55, 0);
    const brim = _add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.012, 12), capMat, -0.18, 0.02, -0.15, 0.12, 0.55, 0);

    const sand = _add(g, new THREE.BoxGeometry(0.52, 0.02, 0.40),
      new THREE.MeshLambertMaterial({ color: 0xd8c898 }), 0.02, 0.008, 0.04);
    sand.receiveShadow = true;
    sand.castShadow = false;
  }

  /**
   * Porte-manteau cabane — planche murale + 4 patères, veste et casquette.
   * Dos +Z au mur ; patères vers −Z.
   */
  function _buildCabinCoatRack(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const frameMat = M?.tableLeg?.() || new THREE.MeshLambertMaterial({ color: 0x4a3224 });
    const iron = new THREE.MeshLambertMaterial({ color: 0x5a5e64 });
    const coatMat = M?.canvas?.(0x3d4a32) || new THREE.MeshLambertMaterial({ color: 0x3d4a32 });
    const capMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });

    const backZ = 0.025;
    const plank = _add(g, new THREE.BoxGeometry(0.38, 1.08, 0.022), frameMat, 0, 0.92, backZ);
    plank.castShadow = true;
    const capRail = _add(g, new THREE.BoxGeometry(0.40, 0.024, 0.026), frameMat, 0, 1.48, backZ);
    capRail.castShadow = true;

    const hookXs = [-0.13, -0.04, 0.06, 0.15];
    const hookYs = [1.32, 1.18, 1.02, 0.86];
    for (let i = 0; i < hookXs.length; i++) {
      const hx = hookXs[i];
      const hy = hookYs[i];
      const base = _add(g, new THREE.BoxGeometry(0.028, 0.018, 0.012), iron, hx, hy, backZ - 0.004);
      const hook = _add(g, new THREE.TorusGeometry(0.022, 0.006, 5, 10), iron, hx, hy - 0.02, backZ - 0.03);
      hook.rotation.x = Math.PI / 2;
      hook.rotation.z = Math.PI;
    }

    const coat = _add(g, new THREE.BoxGeometry(0.34, 0.52, 0.04), coatMat, 0.02, 0.78, -0.05);
    coat.rotation.x = 0.06;
    coat.castShadow = true;
    const coatL = _add(g, new THREE.BoxGeometry(0.08, 0.38, 0.03), coatMat, -0.14, 0.62, -0.06);
    coatL.rotation.z = 0.22;
    coatL.rotation.x = 0.08;
    const coatR = _add(g, new THREE.BoxGeometry(0.08, 0.36, 0.03), coatMat, 0.16, 0.60, -0.055);
    coatR.rotation.z = -0.18;
    coatR.rotation.x = 0.07;

    const cap = _add(g, new THREE.CylinderGeometry(0.09, 0.10, 0.05, 10), capMat, -0.12, 1.36, -0.04);
    cap.rotation.x = 0.15;
    cap.castShadow = true;
    const capBrim = _add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.012, 12), capMat, -0.12, 1.33, -0.05);
    capBrim.castShadow = true;

    const scarf = _add(g, new THREE.BoxGeometry(0.06, 0.42, 0.012),
      new THREE.MeshLambertMaterial({ color: 0x6a3030 }), -0.14, 0.95, -0.045);
    scarf.rotation.z = 0.05;
    scarf.castShadow = true;
  }

  /** Gourde + tasse près du feu */
  function _buildDrinkSet(parent, x, y, z) {
    const gourde = new THREE.MeshLambertMaterial({ color: 0x6a8070 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
    _add(parent, new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), gourde, x, y + 0.11, z);
    _add(parent, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), cap, x, y + 0.245, z);
    _add(parent, new THREE.CylinderGeometry(0.045, 0.038, 0.07, 8),
      new THREE.MeshLambertMaterial({ color: 0x5a4030 }), x + 0.18, y + 0.035, z + 0.05);
  }

  function _buildLantern(parent, x, y, z, color) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    _add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.38, 8),
      new THREE.MeshLambertMaterial({ color: 0x6a8070 }), 0, 0.19, 0);
    _add(g, new THREE.BoxGeometry(0.16, 0.18, 0.16),
      new THREE.MeshLambertMaterial({ color: color || 0xd8c57a, emissive: 0x2b2108, emissiveIntensity: 0.25 }), 0, 0.34, 0);
    const light = new THREE.PointLight(color || 0xffda7d, 0.35, 5, 2);
    light.position.set(0, 0.42, 0);
    g.add(light);
  }

  function _buildStone(parent, x, y, z, r, rotY) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY || 0;
    parent.add(g);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(r || 0.16, 0),
      new THREE.MeshLambertMaterial({ color: 0x7a7468 })
    );
    rock.position.y = (r || 0.16) * 0.7;
    rock.rotation.set(0.25, 0.4, -0.18);
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
    g.userData.boulderVisual = g;
    parent.userData.boulderVisual = g;
  }

  function _buildWorkbench(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const woodMat = M ? M.wood(0xd9a36b) : new THREE.MeshLambertMaterial({ color: 0xd9a36b });
    const darkWoodMat = M ? M.woodDark(0xa16b3f) : new THREE.MeshLambertMaterial({ color: 0xa16b3f });
    const toolMat = M ? M.tool() : new THREE.MeshLambertMaterial({ color: 0x5f6d46 });
    const metalMat = M ? M.metal() : new THREE.MeshLambertMaterial({ color: 0x7d7f84 });

    _add(g, new THREE.BoxGeometry(1.8, 0.1, 0.82), woodMat, 0, 0.88, 0);
    _add(g, new THREE.BoxGeometry(1.64, 0.06, 0.24), darkWoodMat, 0, 0.46, 0.2);
    for (const [px, pz] of [
      [-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32],
    ]) {
      _add(g, new THREE.CylinderGeometry(0.06, 0.07, 0.84, 6), darkWoodMat, px, 0.42, pz);
    }
    _add(g, new THREE.BoxGeometry(1.54, 0.06, 0.08), darkWoodMat, 0, 0.64, -0.3);
    _add(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, -0.68, 0.72, -0.34);
    _add(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, 0.68, 0.72, -0.34);
    _add(g, new THREE.BoxGeometry(0.72, 0.08, 0.16), toolMat, -0.22, 0.96, -0.08, 0, -0.2, 0.18);
    _add(g, new THREE.BoxGeometry(0.54, 0.08, 0.14), toolMat, 0.26, 0.94, 0.1, 0, 0.25, -0.12);
    _add(g, new THREE.BoxGeometry(0.14, 0.06, 0.42), metalMat, -0.54, 0.98, 0.12, 0.16, 0.18, 0);
    _add(g, new THREE.BoxGeometry(0.1, 0.22, 0.1), metalMat, 0.58, 1.02, -0.16);
  }

  /** Small lean-to so the camp reads as an actual shelter in wide shots. */
  function _buildLeanToShelter(parent, x, y, z, ry) {
    const M = _campMats();
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    parent.add(g);

    const poleMat = M ? M.woodPole(0xb68753) : new THREE.MeshLambertMaterial({ color: 0x6a4a20 });
    const clothMat = M ? M.canvas(0x4b5d39) : new THREE.MeshLambertMaterial({ color: 0x4b5d39 });
    const ropeMat = M ? M.rope() : new THREE.MeshLambertMaterial({ color: 0x3a2a18 });

    for (const [px, pz] of [
      [-0.95, -0.45],
      [0.95, -0.45],
      [-0.95, 0.55],
      [0.95, 0.55],
    ]) {
      _add(g, new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6), poleMat, px, 0.8, pz);
    }

    _add(g, new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), ropeMat, 0, 1.55, -0.15, 0, 0, Math.PI / 2);

    const roofA = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.95), clothMat);
    roofA.position.set(0, 1.2, -0.05);
    roofA.rotation.z = -0.18;
    roofA.castShadow = roofA.receiveShadow = true;
    g.add(roofA);

    const roofB = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.10, 0.58), clothMat);
    roofB.position.set(0, 0.9, 0.20);
    roofB.rotation.z = 0.12;
    roofB.castShadow = roofB.receiveShadow = true;
    g.add(roofB);

    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.62, 0.06),
      M ? M.canvas(0x5b6f47) : new THREE.MeshLambertMaterial({ color: 0x5b6f47 })
    );
    flap.position.set(0.02, 0.86, 0.55);
    flap.rotation.x = 0.08;
    flap.castShadow = flap.receiveShadow = true;
    g.add(flap);
  }

  /** Premier prefab bâtiment RCON : cabane simple, procédurale et réutilisable. */
  /** Pièce 2/7. Miroir packages/shared/src/survivor-shack-wall-north.mjs */
