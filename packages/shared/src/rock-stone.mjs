/** Stock de pierre par prefab rocher + helpers récolte. */

export const ROCK_STONE_STOCK = Object.freeze({
  rock_boulder: 20,
  rock_outcrop: 14,
  spawn_stone: 8,
});

export function getRockStoneMax(prefabId) {
  return ROCK_STONE_STOCK[prefabId] ?? 10;
}

/** Pierre extraite par coup réussi selon l'outil tenu. */
export function getMineStoneYield(toolType, efficaciteRecolte = 1) {
  if (toolType === 'tool_caillou') return 1;
  if (toolType === 'tool_pioche_pierre' || toolType === 'tool_pioche') return 3;
  if (toolType === 'tool_hache_pierre') return 1;
  return Math.max(1, Math.floor(Number(efficaciteRecolte) * 0.6));
}

export function isMinableRockPrefab(prefabId) {
  if (!prefabId) return false;
  if (prefabId === 'spawn_stone') return true;
  return prefabId.startsWith('rock_');
}

export function listMinableRockPrefabIds() {
  return Object.keys(ROCK_STONE_STOCK);
}
