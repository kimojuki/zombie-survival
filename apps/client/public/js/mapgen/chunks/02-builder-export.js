// Spawn builder — suite + export
    function workbench(cx, cz, baseY, rotY) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      g.rotation.y = Number.isFinite(rotY) ? rotY : 0;
      state.scene.add(g);

      const woodMat = new THREE.MeshLambertMaterial({ color: 0xd9a36b, map: texWood });
      const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0xa16b3f, map: texWoodFine });
      const toolMat = new THREE.MeshLambertMaterial({ color: 0x5f6d46 });
      const metalMat = new THREE.MeshLambertMaterial({ color: 0x7d7f84 });

      addMesh(g, new THREE.BoxGeometry(1.8, 0.1, 0.82), woodMat, 0, 0.88, 0);
      addMesh(g, new THREE.BoxGeometry(1.64, 0.06, 0.24), darkWoodMat, 0, 0.46, 0.2);
      for (const [px, pz] of [
        [-0.8, -0.32],
        [0.8, -0.32],
        [-0.8, 0.32],
        [0.8, 0.32],
      ]) {
        addMesh(g, new THREE.CylinderGeometry(0.06, 0.07, 0.84, 6), darkWoodMat, px, 0.42, pz);
      }
      addMesh(g, new THREE.BoxGeometry(1.54, 0.06, 0.08), darkWoodMat, 0, 0.64, -0.3);
      addMesh(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, -0.68, 0.72, -0.34);
      addMesh(g, new THREE.BoxGeometry(0.08, 0.48, 0.06), darkWoodMat, 0.68, 0.72, -0.34);

      addMesh(g, new THREE.BoxGeometry(0.72, 0.08, 0.16), toolMat, -0.22, 0.96, -0.08, 0, -0.2, 0.18);
      addMesh(g, new THREE.BoxGeometry(0.54, 0.08, 0.14), toolMat, 0.26, 0.94, 0.1, 0, 0.25, -0.12);
      addMesh(g, new THREE.BoxGeometry(0.14, 0.06, 0.42), metalMat, -0.54, 0.98, 0.12, 0.16, 0.18, 0);
      addMesh(g, new THREE.BoxGeometry(0.1, 0.22, 0.1), metalMat, 0.58, 1.02, -0.16);

      return g;
    }

    function markerPole(cx, cz, baseY, opts) {
      const side = Number.isFinite(opts?.side) ? opts.side : 1;
      const flagColor = opts?.flagColor || (side < 0 ? 0xd7c24a : 0xb86235);
      const lightColor = opts?.lightColor || 0xffc46a;
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      state.scene.add(g);

      const poleMat = new THREE.MeshLambertMaterial({ color: 0xbf8b4f, map: texWoodFine });
      const flagMat = new THREE.MeshLambertMaterial({
        color: flagColor,
        map: texCanvasTight,
        emissive: side < 0 ? 0x251e08 : 0x240f08,
        emissiveIntensity: 0.1,
      });

      addMesh(g, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), poleMat, 0, 2.1, 0);
      addMesh(g, new THREE.BoxGeometry(0.95, 0.06, 0.06), poleMat, side * 0.32, 3.92, 0);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.05), flagMat);
      flag.position.set(side * 0.72, 3.62, 0);
      flag.rotation.z = side * 0.08;
      flag.castShadow = true;
      flag.receiveShadow = true;
      g.add(flag);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.11),
        new THREE.MeshBasicMaterial({ color: lightColor })
      );
      lamp.position.set(side * 0.92, 3.84, 0.02);
      g.add(lamp);
      const light = new THREE.PointLight(lightColor, 0.55, 8, 2);
      light.position.set(side * 0.92, 3.84, 0.02);
      g.add(light);
      return g;
    }

    function drinkSet(cx, cz, baseY) {
      const g = new THREE.Group();
      g.position.set(cx, baseY, cz);
      state.scene.add(g);
      const gourde = new THREE.MeshLambertMaterial({ color: 0x6a8070 });
      const cap = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
      addMesh(g, new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), gourde, 0, 0.11, 0);
      addMesh(g, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), cap, 0, 0.245, 0);
      addMesh(g, new THREE.CylinderGeometry(0.045, 0.038, 0.07, 8),
        new THREE.MeshLambertMaterial({ color: 0x5a4030 }), 0.18, 0.035, 0.05);
      return g;
    }

    function registerTerrainPatch(cx, cz, rx, rz, blend, opts2) {
      return addTerrainPatch(cx, cz, rx, rz, blend, opts2);
    }

    return {
      seed: state.seed,
      rng: state.rng,
      scene: state.scene,
      baseY: state.baseY,
      groundPatch,
      trailPatch,
      campfire,
      stump,
      crate,
      bedroll,
      backpack,
      lantern,
      stone,
      logPile,
      leanTo,
      workbench,
      markerPole,
      drinkSet,
      registerTerrainPatch,
      addMesh,
    };
  }

  window.ZS = window.ZS || {};
  ZS.MapGen = { createSpawnBuilder };
