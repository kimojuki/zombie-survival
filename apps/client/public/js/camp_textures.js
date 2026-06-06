// Textures camp partagées — bois, toile olive, sol (prefabs décor + mapgen).
(function () {
  'use strict';

  const URLS = {
    woodLight: '/textures/camp/wood_planks_light.png',
    wood: '/textures/camp/wood_planks.png',
    canvas: '/textures/camp/olive_canvas.png',
    ground: '/textures/camp/spawn_ground.png',
    trailForest: '/textures/camp/trail_forest.png',
  };

  const _texLoader = new THREE.TextureLoader();
  const _texCache = new Map();
  let _mats = null;

  function load(url, repeatX, repeatY) {
    const key = `${url}|${repeatX || 1}|${repeatY || 1}`;
    if (_texCache.has(key)) return _texCache.get(key);
    const tex = _texLoader.load(url);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX || 1, repeatY || 1);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    _texCache.set(key, tex);
    return tex;
  }

  /** Matériaux réutilisables pour caisses, lits, abris, établi, etc. */
  function materials() {
    if (_mats) return _mats;

    const texWood = load(URLS.woodLight, 2.2, 1.6);
    const texWoodFine = load(URLS.woodLight, 1.2, 1.0);
    const texWoodDark = load(URLS.wood, 1.4, 1.0);
    const texCanvas = load(URLS.canvas, 1.4, 1.2);
    const texCanvasTight = load(URLS.canvas, 0.9, 0.9);
    const texTrail = load(URLS.trailForest, 2.8, 2.8);

    _mats = {
      wood: (color) => new THREE.MeshLambertMaterial({ color: color || 0xc69158, map: texWood }),
      woodFine: (color) => new THREE.MeshLambertMaterial({ color: color || 0xc69158, map: texWoodFine }),
      woodDark: (color) => new THREE.MeshLambertMaterial({ color: color || 0xa16b3f, map: texWoodFine }),
      woodFrame: () => new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodDark }),
      woodPole: (color) => new THREE.MeshLambertMaterial({ color: color || 0xb68753, map: texWoodFine }),
      canvas: (color) => new THREE.MeshLambertMaterial({ color: color || 0x4a5838, map: texCanvas }),
      canvasTight: (color) => new THREE.MeshLambertMaterial({ color: color || 0x5a4030, map: texCanvasTight }),
      bark: () => new THREE.MeshLambertMaterial({ color: 0x4a3018, map: texWoodFine }),
      endWood: () => new THREE.MeshLambertMaterial({ color: 0xc4a070 }),
      ring: () => new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
      rope: () => new THREE.MeshLambertMaterial({ color: 0x3a2a18 }),
      strap: () => new THREE.MeshLambertMaterial({ color: 0x2a3818 }),
      stone: () => new THREE.MeshLambertMaterial({ color: 0x7a7468 }),
      metal: () => new THREE.MeshLambertMaterial({ color: 0x7d7f84 }),
      tool: () => new THREE.MeshLambertMaterial({ color: 0x5f6d46 }),
      trail: (color) => new THREE.MeshLambertMaterial({
        color: color || 0x9a8870,
        map: texTrail,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -10,
      }),
    };
    return _mats;
  }

  window.ZS = window.ZS || {};
  ZS.CampTextures = { URLS, load, materials };
}());
