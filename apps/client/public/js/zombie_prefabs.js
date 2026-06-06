// Prefabs zombie — visuels procéduraux (stats serveur : packages/shared/src/zombie-prefabs.mjs)
(function () {
  'use strict';

  const VISUALS = {
    zombie_walker: {
      skin: 0x6daf6d, shirt: 0x3a3a2a, pants: 0x2a2a1a, eyes: 0xff2222,
      scale: 1, armPose: Math.PI / 2.5, healthBarY: 2.4, collideRadius: 0.42,
    },
    zombie_runner: {
      skin: 0x8a9a6a, shirt: 0x4a4030, pants: 0x2a2818, eyes: 0xff6644,
      scale: 0.92, armPose: Math.PI / 2.2, healthBarY: 2.2, collideRadius: 0.38,
    },
    zombie_brute: {
      skin: 0x5a7048, shirt: 0x2a2820, pants: 0x1a1810, eyes: 0xcc1111,
      scale: 1.18, armPose: Math.PI / 2.8, healthBarY: 2.7, collideRadius: 0.52,
    },
  };

  function build(prefabId) {
    const def = VISUALS[prefabId] || VISUALS.zombie_walker;
    if (!ZS.createHumanoidRig) return null;
    const g = ZS.createHumanoidRig({
      name: 'zombieRig',
      skin: def.skin,
      shirt: def.shirt,
      pants: def.pants,
      eyes: def.eyes,
    });
    const scale = def.scale || 1;
    g.scale.setScalar(scale);
    const r = g.userData.rig;
    if (r) {
      r.leftShoulder.rotation.x = def.armPose;
      r.rightShoulder.rotation.x = def.armPose;
    }
    g.userData.prefabId = prefabId || 'zombie_walker';
    g.userData.healthBarY = def.healthBarY || 2.4;
    g.userData.zombieScale = scale;
    return g;
  }

  window.ZS = window.ZS || {};
  ZS.ZombiePrefabs = {
    build,
    ids: () => Object.keys(VISUALS),
    getVisual: (id) => VISUALS[id] || VISUALS.zombie_walker,
  };
}());
