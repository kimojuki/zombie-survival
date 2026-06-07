/** Craft recipes — shared between client UI and server validation. */
export const CRAFT_RECIPES = Object.freeze([
  { id: 'wpn_lance_bois', result: 'wpn_lance_bois', qty: 1, ingredients: { res_bois_brut: 10 }, craftTime: 8 },
  { id: 'tool_hache_pierre', result: 'tool_hache_pierre', qty: 1, ingredients: { res_bois_brut: 7, res_pierre: 10 }, craftTime: 10 },
  { id: 'tool_pioche_pierre', result: 'tool_pioche_pierre', qty: 1, ingredients: { res_bois_brut: 7, res_pierre: 10 }, craftTime: 10 },
  { id: 'wpn_lance_pierre', result: 'wpn_lance_pierre', qty: 1, ingredients: { wpn_lance_bois: 1, res_pierre: 2 }, craftTime: 6 },
  { id: 'res_planche', result: 'res_planche', qty: 2, ingredients: { res_bois_brut: 1 }, craftTime: 3 },
  { id: 'res_corde', result: 'res_corde', qty: 1, ingredients: { res_chiffon: 5 }, craftTime: 4 },
  { id: 'tool_torche', result: 'tool_torche', qty: 1, ingredients: { res_bois_brut: 5, res_chiffon: 2 }, craftTime: 5 },
  { id: 'med_bandage', result: 'med_bandage', qty: 1, ingredients: { res_chiffon: 2 }, craftTime: 3 },
  { id: 'wpn_arc_artisanal', result: 'wpn_arc_artisanal', qty: 1, ingredients: { res_bois_brut: 15, res_corde: 1 }, craftTime: 12 },
  { id: 'wpn_batte_cloutee', result: 'wpn_batte_cloutee', qty: 1, ingredients: { res_planche: 1, res_clous: 10 }, craftTime: 10 },
  { id: 'struct_plancher_bois', result: 'struct_plancher_bois', qty: 1, ingredients: { res_planche: 2 }, craftTime: 6 },
  { id: 'struct_plafond_bois', result: 'struct_plafond_bois', qty: 1, ingredients: { res_planche: 4 }, craftTime: 8 },
  { id: 'struct_mur_bois', result: 'struct_mur_bois', qty: 1, ingredients: { res_planche: 6 }, craftTime: 10 },
  { id: 'struct_mur_embrasure_porte', result: 'struct_mur_embrasure_porte', qty: 1, ingredients: { res_planche: 5 }, craftTime: 8 },
  { id: 'struct_mur_embrasure_grande_porte', result: 'struct_mur_embrasure_grande_porte', qty: 1, ingredients: { res_planche: 7 }, craftTime: 9 },
  { id: 'struct_porte_bois', result: 'struct_porte_bois', qty: 1, ingredients: { res_planche: 4 }, craftTime: 7 },
  { id: 'struct_escalier_bois', result: 'struct_escalier_bois', qty: 1, ingredients: { res_planche: 8 }, craftTime: 10 },
  { id: 'struct_grande_porte_bois', result: 'struct_grande_porte_bois', qty: 1, ingredients: { res_planche: 10 }, craftTime: 12 },
  { id: 'tool_verrou', result: 'tool_verrou', qty: 1, ingredients: { res_planche: 2 }, craftTime: 5 },
  { id: 'struct_storage_chest', result: 'struct_storage_chest', qty: 1, ingredients: { res_bois_brut: 15 }, craftTime: 10 },
]);

export const CRAFT_MAX_QUEUE = 12;

export function findCraftRecipe(recipeId) {
  return CRAFT_RECIPES.find((r) => r.id === recipeId || r.result === recipeId) || null;
}

export function defaultCraftDuration(rec) {
  if (Number.isFinite(rec.craftTime) && rec.craftTime > 0) return rec.craftTime;
  return 5;
}
