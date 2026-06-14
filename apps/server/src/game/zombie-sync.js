'use strict';

const ZOMBIE_SYNC_KEYS = [
  'id', 'x', 'z', 'angle', 'speed', 'health', 'maxHealth',
  'prefabId', 'meleeReach', 'collideRadius', 'scenarioFrozen',
];

function compactZombiesForSync(list) {
  const out = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    const row = {};
    for (let k = 0; k < ZOMBIE_SYNC_KEYS.length; k++) {
      const key = ZOMBIE_SYNC_KEYS[k];
      const val = z[key];
      if (val != null) row[key] = val;
    }
    out[i] = row;
  }
  return out;
}

module.exports = { compactZombiesForSync, ZOMBIE_SYNC_KEYS };
