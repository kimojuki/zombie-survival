// Prefab caillou — mesh procédural (item en main + prop au sol).

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

    if (Number.isFinite(opts?.rockSeed)) return opts.rockSeed >>> 0;

    if (Number.isFinite(opts?.treeSeed)) return opts.treeSeed >>> 0;

    if (opts?.decorId) {

      let h = 0;

      for (let i = 0; i < opts.decorId.length; i++) h = (h * 31 + opts.decorId.charCodeAt(i)) >>> 0;

      return h || 1;

    }

    return (Math.random() * 0xffffff) >>> 0;

  }



  /** Caillou tenu à deux mains (normalisé autour de l'origine = centre de prise). */

  function buildHandRock(root, opts = {}) {

    const seed = _seedFromOpts(opts);

    const rng = _mulberry32(seed);

    const mat = ZS.RockTextures?.getRockMaterial?.(seed, 0xe8e4dc)

      || new THREE.MeshLambertMaterial({ color: 0x9a9588 });

    const r = 0.058 + rng() * 0.024;

    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);

    mesh.scale.set(1.32 + rng() * 0.18, 0.76 + rng() * 0.14, 1.22 + rng() * 0.16);

    mesh.rotation.set(rng() * 0.28, rng() * Math.PI * 2, rng() * 0.22);

    mesh.castShadow = true;

    root.add(mesh);

    root.userData.rockSeed = seed;

    root.userData.gripPoint = { x: 0, y: 0, z: 0 };

    return root;

  }



  /** Caillou posé au sol (décors item / drop). */

  function buildGroundRock(root, opts = {}) {

    const seed = _seedFromOpts(opts);

    const rng = _mulberry32(seed);

    const mat = ZS.RockTextures?.getRockMaterial?.(seed, 0xded8cc)

      || new THREE.MeshLambertMaterial({ color: 0x8a8578 });

    const r = 0.11 + rng() * 0.05;

    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);

    mesh.scale.set(1.2 + rng() * 0.25, 0.75 + rng() * 0.2, 1.1 + rng() * 0.2);

    mesh.rotation.set(rng() * 0.4, rng() * Math.PI * 2, rng() * 0.3);

    mesh.position.y = r * 0.55;

    mesh.castShadow = true;

    mesh.receiveShadow = true;

    root.add(mesh);

    root.userData.rockSeed = seed;

    return root;

  }



  window.ZS = window.ZS || {};

  ZS.RockPrefab = { buildHandRock, buildGroundRock, seedFromOpts: _seedFromOpts };

}());


