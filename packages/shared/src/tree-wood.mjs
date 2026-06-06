/** Stock de bois par prefab arbre + helpers récolte / chute. */

export const TREE_WOOD_STOCK = Object.freeze({
  tree_oak: 8,
  tree_pine: 10,
  tree_birch: 6,
  tree_dead: 3,
});

/** Délai serveur avant suppression du tronc au sol (ms). */
export const TREE_FALL_LINGER_MS = 90_000;

/** Durée approximative de l'anim de chute côté client (s). */
export const TREE_FALL_ANIM_SEC = 1.15;

export function getTreeWoodMax(prefabId) {
  return TREE_WOOD_STOCK[prefabId] ?? 6;
}

/** Bois extrait par coup réussi selon l'outil tenu. */
export function getChopWoodYield(toolType, efficaciteRecolte = 1) {
  if (toolType === 'tool_hachette') return 2;
  if (toolType === 'wpn_hache_combat') return 1;
  if (toolType === 'tool_caillou') return 1;
  return Math.max(1, Math.floor(Number(efficaciteRecolte) * 0.8));
}

export function listTreePrefabIds() {
  return Object.keys(TREE_WOOD_STOCK);
}

