// Prefabs rochers minables (gros nœuds de pierre — rétrécissent à la récolte).

(function () {
  'use strict';

  function _mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _seedFromOpts(opts) {
    return ZS.RockPrefab?.seedFromOpts?.(opts) || 1;
  }

  /** Gros rocher minable — plusieurs morceaux fusionnés. */
  function buildBoulder(root, opts = {}) {
    const seed = _seedFromOpts(opts);
    const rng = _mulberry32(seed);
    const visual = new THREE.Group();
    visual.name = 'boulderVisual';
    const mat = ZS.RockTextures?.getRockMaterial?.(seed, 0x8a8578)
      || new THREE.MeshLambertMaterial({ color: 0x7a7468 });
    const chunks = 3 + Math.floor(rng() * 3);
    const baseR = 0.52 + (opts.boulderScale || 0) * 0.08;
    for (let i = 0; i < chunks; i++) {
      const r = baseR * (0.55 + rng() * 0.55);
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      mesh.position.set(
        (rng() - 0.5) * baseR * 1.6,
        r * (0.35 + rng() * 0.35),
        (rng() - 0.5) * baseR * 1.6,
      );
      mesh.scale.set(1.1 + rng() * 0.35, 0.72 + rng() * 0.28, 1.05 + rng() * 0.3);
      mesh.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.4);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      visual.add(mesh);
    }
    root.add(visual);
    root.userData.boulderVisual = visual;
    root.userData.rockSeed = seed;
    return root;
  }

  /** Affleurement rocheux (plus plat, un peu moins haut). */
  function buildOutcrop(root, opts = {}) {
    const seed = _seedFromOpts(opts);
    const rng = _mulberry32(seed);
    const visual = new THREE.Group();
    visual.name = 'boulderVisual';
    const mat = ZS.RockTextures?.getRockMaterial?.(seed, 0x9a9588)
      || new THREE.MeshLambertMaterial({ color: 0x6e6a60 });
    const baseR = 0.28 + rng() * 0.12;
    for (let i = 0; i < 4; i++) {
      const r = baseR * (0.65 + rng() * 0.5);
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      mesh.position.set(
        (rng() - 0.5) * baseR * 2.2,
        r * (0.2 + rng() * 0.25),
        (rng() - 0.5) * baseR * 2.2,
      );
      mesh.scale.set(1.4 + rng() * 0.4, 0.45 + rng() * 0.2, 1.3 + rng() * 0.35);
      mesh.rotation.set(rng() * 0.35, rng() * Math.PI * 2, rng() * 0.25);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      visual.add(mesh);
    }
    root.add(visual);
    root.userData.boulderVisual = visual;
    root.userData.rockSeed = seed;
    return root;
  }

  window.ZS = window.ZS || {};
  ZS.RockWorldPrefabs = { buildBoulder, buildOutcrop };
}());
