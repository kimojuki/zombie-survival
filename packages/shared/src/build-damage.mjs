/** Résistance des pièces de construction en bois (prefabs `build_*_wood`). */

/** Points de structure à accumuler avant destruction (unité « caillou »). */
export const WOOD_BUILD_HP = 100;

export const BUILD_PREFAB_IDS = Object.freeze([
  'build_floor_wood',
  'build_wall_wood',
  'build_stair_wood',
  'build_door_wood',
  'build_large_door_wood',
]);

/** Dégâts par coup selon l'outil (0 = ne peut pas endommager). */
export const BUILD_DAMAGE_BY_TOOL = Object.freeze({
  tool_caillou: 1,
  tool_hache_pierre: 2,
});

export function isBuildPrefab(prefabId) {
  return BUILD_PREFAB_IDS.includes(prefabId);
}

export function getBuildDamage(toolType) {
  return BUILD_DAMAGE_BY_TOOL[toolType] ?? 0;
}

export function getBuildMaxHp(prefabId) {
  if (!isBuildPrefab(prefabId)) return 0;
  return WOOD_BUILD_HP;
}

/** Nombre de coups pour détruire (arrondi supérieur). */
export function hitsToDestroy(toolType, maxHp = WOOD_BUILD_HP) {
  const dmg = getBuildDamage(toolType);
  if (dmg <= 0) return Infinity;
  return Math.ceil(maxHp / dmg);
}
