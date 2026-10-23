// Prefabs intro plage — torche allumée + valise échouée lootable.
(function () {
  'use strict';

  function _add(parent, geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Torche plantée dans le sable — visible de jour comme de nuit. */
  function _buildBeachStarterTorch(root) {
    const M = ZS.CampTextures?.materials?.();
    const poleMat = M ? M.woodPole(0x6b4a20) : new THREE.MeshLambertMaterial({ color: 0x6b4a20 });
    const wrapMat = M ? M.canvas(0x4a3828) : new THREE.MeshLambertMaterial({ color: 0x4a3828 });
    const metalMat = M ? M.metal() : new THREE.MeshLambertMaterial({ color: 0x6a6e72 });

    _add(root, new THREE.CylinderGeometry(0.045, 0.06, 0.55, 6), poleMat, 0, 0.28, 0);
    _add(root, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), metalMat, 0, 0.58, 0);
    _add(root, new THREE.CylinderGeometry(0.055, 0.055, 0.18, 8), wrapMat, 0, 0.70, 0);

    const flameCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5a18 }),
    );
    flameCore.position.set(0, 0.84, 0);
    root.add(flameCore);

    const flameHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.42 }),
    );
    flameHalo.position.set(0, 0.88, 0);
    root.add(flameHalo);

    const light = new THREE.PointLight(0xff6620, 2.0, 14, 1.6);
    light.position.set(0, 0.86, 0);
    root.add(light);

    const fill = new THREE.PointLight(0xffcc77, 0.5, 8, 2);
    fill.position.set(0.1, 0.78, 0.08);
    root.add(fill);

    if (ZS.registerFireLight) {
      ZS.registerFireLight(light, flameCore, {
        baseIntensity: 2.0,
        fillLight: fill,
        onTick(t, flicker) {
          const s = 1 + flicker * 0.22 + Math.sin(t * 0.011) * 0.06;
          flameCore.scale.setScalar(s);
          flameHalo.scale.setScalar(0.95 + flicker * 0.28);
          flameHalo.material.opacity = 0.34 + flicker * 0.22;
        },
      });
    }
    root.userData.beachStarterTorch = true;
  }

  /** Valise échouée — conteneur intro, légère surbrillance. */
  function _buildBeachStarterSuitcase(root) {
    const M = ZS.CampTextures?.materials?.();
    const shell = new THREE.MeshStandardMaterial({
      color: 0x6a5848,
      roughness: 0.82,
      metalness: 0.08,
      emissive: 0x3a2818,
      emissiveIntensity: 0.22,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x9a7a48,
      roughness: 0.55,
      metalness: 0.35,
      emissive: 0x5a4020,
      emissiveIntensity: 0.35,
    });
    const strap = M?.canvas?.(0x4a4038) || new THREE.MeshLambertMaterial({ color: 0x4a4038 });

    const g = new THREE.Group();
    root.add(g);

    _add(g, new THREE.BoxGeometry(0.52, 0.22, 0.34), shell, 0, 0.12, 0);
    _add(g, new THREE.BoxGeometry(0.48, 0.04, 0.30), trim, 0, 0.24, 0);
    for (const sx of [-0.18, 0.18]) {
      _add(g, new THREE.BoxGeometry(0.04, 0.08, 0.34), trim, sx, 0.26, 0);
    }
    _add(g, new THREE.BoxGeometry(0.10, 0.03, 0.06), trim, 0, 0.27, 0.18);

    const lidPivot = new THREE.Group();
    lidPivot.name = 'introSuitcaseLidPivot';
    lidPivot.position.set(0, 0.24, -0.17);
    g.add(lidPivot);
    _add(lidPivot, new THREE.BoxGeometry(0.50, 0.06, 0.32), shell, 0, 0.03, 0.16);
    _add(lidPivot, new THREE.BoxGeometry(0.08, 0.03, 0.05), trim, 0, 0.06, 0.30);

    _add(g, new THREE.BoxGeometry(0.06, 0.02, 0.28), strap, -0.22, 0.18, 0);

    const hint = new THREE.PointLight(0xffd8a0, 0.85, 8, 2);
    hint.position.set(0, 0.35, 0.2);
    root.add(hint);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.38, 0.48, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);

    if (ZS.registerFireLight) {
      ZS.registerFireLight(hint, lidPivot.children[1] || lidPivot, {
        baseIntensity: 0.85,
        onTick(t, flicker) {
          const pulse = 0.85 + flicker * 0.25 + Math.sin(t * 0.004) * 0.12;
          shell.emissiveIntensity = 0.16 + pulse * 0.12;
          trim.emissiveIntensity = 0.28 + pulse * 0.18;
        },
      });
    }

    g.userData.isStorage = true;
    g.userData.storageLidPivot = lidPivot;
    root.userData.isStorage = true;
    root.userData.storageLidPivot = lidPivot;
    root.userData.introStarterSuitcase = true;
  }

  window.ZS = window.ZS || {};
  if (ZS.registerDecorPrefab) {
    ZS.registerDecorPrefab('spawn_beach_starter_torch', { build: _buildBeachStarterTorch });
    ZS.registerDecorPrefab('spawn_beach_starter_suitcase', { build: _buildBeachStarterSuitcase });
  }
}());
