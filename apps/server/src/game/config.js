'use strict';

const WORLD_RADIUS = 290;
const ZOMBIE_COUNT = 70;

const ZOMBIE_ZONES = Object.freeze([
  { name: 'maincity', cx: -20, cz: -182, r: 70, weight: 34 },
  { name: 'military', cx: -200, cz: -172, r: 75, weight: 24 },
  { name: 'smalltown', cx: -177, cz: 0, r: 58, weight: 12 },
  { name: 'forest', cx: 0, cz: 20, r: 95, weight: 14 },
]);

module.exports = { WORLD_RADIUS, ZOMBIE_COUNT, ZOMBIE_ZONES };
