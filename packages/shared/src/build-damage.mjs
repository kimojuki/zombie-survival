/** Résistance des pièces de construction en bois (prefabs `build_*_wood`). */

/** Points de structure à accumuler avant destruction (unité « caillou »). */
export const WOOD_BUILD_HP = 100;

/** Porte verrouillée sans clé — moins résistante, frappable au corps à corps. */
export const LOCKED_DOOR_BREAK_HP = 50;

export const BUILD_PREFAB_IDS = Object.freeze([
  'build_floor_wood',
  'build_wall_wood',
  'build_stair_wood',
  'build_door_wood',
  'build_large_door_wood',
]);

/** Prefabs avec porte verrouillable (dont cabane spawn). */
export const LOCKABLE_DOOR_PREFAB_IDS = Object.freeze([
  'building_survivor_shack',
  'build_door_wood',
  'build_large_door_wood',
]);

/** Dégâts par coup selon l'outil (0 = ne peut pas endommager). */
export const BUILD_DAMAGE_BY_TOOL = Object.freeze({
  tool_caillou: 1,
  tool_hache_pierre: 2,
});

/** Dégâts forcés sur porte verrouillée (sans clé). */
const DOOR_BREAK_DAMAGE_BY_TOOL = Object.freeze({
  __fist__: 1,
  tool_caillou: 1,
  tool_hache_pierre: 3,
  tool_hachette: 2,
  wpn_hache_combat: 3,
});

export function isBuildPrefab(prefabId) {
  return BUILD_PREFAB_IDS.includes(prefabId);
}

export function isLockableDoorPrefab(prefabId) {
  return LOCKABLE_DOOR_PREFAB_IDS.includes(prefabId);
}

export function getBuildDamage(toolType) {
  return BUILD_DAMAGE_BY_TOOL[toolType] ?? 0;
}

/** Dégâts d'une frappe sur porte verrouillée (mêlée / outils). */
export function getDoorBreakDamage(toolType) {
  const t = String(toolType || '').slice(0, 80);
  if (!t) return 0;
  if (DOOR_BREAK_DAMAGE_BY_TOOL[t] != null) return DOOR_BREAK_DAMAGE_BY_TOOL[t];
  if (t.startsWith('wpn_')) return 2;
  if (t.startsWith('tool_') && t !== 'tool_verrou') return 1;
  return 0;
}

export function getBuildMaxHp(prefabId) {
  if (!isBuildPrefab(prefabId)) return 0;
  return WOOD_BUILD_HP;
}

export function getLockedDoorBreakMaxHp(_prefabId) {
  return LOCKED_DOOR_BREAK_HP;
}

/** Nombre de coups pour détruire (arrondi supérieur). */
export function hitsToDestroy(toolType, maxHp = WOOD_BUILD_HP) {
  const dmg = getBuildDamage(toolType);
  if (dmg <= 0) return Infinity;
  return Math.ceil(maxHp / dmg);
}

export function doorBreakHitsToDestroy(toolType, maxHp = LOCKED_DOOR_BREAK_HP) {
  const dmg = getDoorBreakDamage(toolType);
  if (dmg <= 0) return Infinity;
  return Math.ceil(maxHp / dmg);
}
