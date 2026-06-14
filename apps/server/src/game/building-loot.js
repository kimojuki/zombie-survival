'use strict';

const LOOT_RESPAWN_MS = 3600 * 1000; // 1 h — respawn horaire désactivé volontairement

/** Tables par type : high = forte probabilité, low = faible. Aucun objet exclusif. */
const LOOT_TABLES = {
  hopital: {
    high: ['med_bandage', 'med_kit_soin', 'med_pilules_anti_infection'],
    low: ['med_seringue_anti_infection', 'food_conserves', 'food_eau_bouteille', 'tool_marteau', 'res_chiffon', 'res_ferraille'],
  },
  police: {
    high: ['wpn_pistolet', 'wpn_fusil_pompe', 'wpn_fusil_chasse',
      'ammo_pistolet', 'ammo_fusil_pompe', 'ammo_fusil_chasse'],
    low: ['food_conserves', 'food_eau_bouteille', 'med_bandage', 'res_ferraille'],
  },
  maison: {
    high: ['food_conserves', 'food_pain', 'food_fruits', 'food_eau_bouteille', 'res_chiffon', 'eq_petit_sac'],
    med: ['med_bandage', 'tool_marteau', 'tool_hachette', 'res_corde'],
    low: ['wpn_couteau', 'ammo_pistolet', 'eq_sac_moyen'],
  },
  chantier: {
    high: ['res_bois_brut', 'res_planche', 'res_clous', 'res_ferraille', 'res_metal', 'tool_marteau', 'tool_hachette'],
    low: ['food_conserves', 'food_eau_bouteille', 'res_corde'],
  },
  garage: {
    high: ['res_ferraille', 'res_metal', 'tool_marteau', 'tool_hachette', 'tool_pioche', 'res_ruban_adhesif'],
    low: ['food_conserves', 'food_eau_bouteille', 'med_bandage', 'res_corde'],
  },
  supermarche: {
    high: ['food_conserves', 'food_haricots_boite', 'food_soupe_conserve', 'food_pain',
      'food_fruits', 'food_eau_bouteille', 'food_boisson_energisante'],
    low: ['tool_marteau', 'med_bandage', 'res_chiffon'],
  },
  militaire: {
    high: ['wpn_fusil_chasse', 'wpn_fusil_pompe', 'ammo_fusil_chasse', 'ammo_fusil_pompe',
      'ammo_pistolet', 'eq_gilet_protection', 'eq_casque'],
    low: ['med_kit_soin', 'food_conserves', 'food_boisson_energisante'],
  },
};

/** Pool global : tout objet peut apparaître n'importe où (faible chance). */
const ALL_ITEMS = [
  'food_eau_bouteille', 'food_boisson_energisante', 'food_conserves', 'food_haricots_boite',
  'food_soupe_conserve', 'food_pain', 'food_sandwich', 'food_fruits',
  'med_bandage', 'med_kit_soin', 'med_pilules_anti_infection', 'med_seringue_anti_infection',
  'wpn_couteau', 'wpn_machette', 'wpn_barre_fer', 'wpn_batte_cloutee',
  'wpn_pistolet', 'wpn_fusil_pompe', 'wpn_fusil_chasse',
  'ammo_pistolet', 'ammo_fusil_pompe', 'ammo_fusil_chasse',
  'eq_petit_sac', 'eq_sac_moyen', 'eq_casque', 'eq_gilet_protection', 'eq_gants',
  'res_bois_brut', 'res_planche', 'res_pierre', 'res_ferraille', 'res_metal', 'res_clous',
  'res_ruban_adhesif', 'res_chiffon', 'res_corde',
  'tool_marteau', 'tool_hachette', 'tool_hache_pierre', 'tool_pioche', 'tool_pioche_pierre', 'tool_caillou',
  'wpn_lance_bois', 'wpn_lance_pierre',
  'struct_storage_chest',
];

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Quantité d'une pile au sol selon la nature de l'objet (pas de def serveur → par préfixe). */
function lootQty(type) {
  if (type.startsWith('ammo_')) return randInt(6, 18);
  if (type.startsWith('res_')) return randInt(4, 14);
  if (type.startsWith('food_')) return randInt(1, 3);
  if (type.startsWith('med_')) return randInt(1, 2);
  return 1;
}

/** Nombre d'objets selon la taille du bâtiment (1–8, cf. items.md). */
function lootCount(w, d) {
  const area = w * d;
  if (area < 75) return randInt(1, 4);
  if (area < 170) return randInt(2, 6);
  return randInt(4, 8);
}

/** Tirage pondéré d'un type d'objet pour un bâtiment donné. */
function pickLootType(table) {
  if (Math.random() < 0.15) return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  const pool = [];
  for (const t of (table.high || [])) for (let i = 0; i < 6; i++) pool.push(t);
  for (const t of (table.med || [])) for (let i = 0; i < 3; i++) pool.push(t);
  for (const t of (table.low || [])) for (let i = 0; i < 1; i++) pool.push(t);
  if (pool.length === 0) return ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Loot bâtiments — empreintes client, génération initiale unique.
 */
function createBuildingLoot(deps) {
  const {
    log,
    getItems,
    getLootBuildings,
    addGroundItem,
    removeGroundItem,
    getNextItemId,
  } = deps;

  function hasPersistedBuildingLoot() {
    for (const it of getItems().values()) {
      if (it.loot) return true;
    }
    return false;
  }

  function clearLoot() {
    for (const [id, it] of getItems()) {
      if (it.loot) removeGroundItem(id);
    }
  }

  function generateLoot() {
    clearLoot();
    const lootBuildings = getLootBuildings();
    const items = getItems();
    for (const b of lootBuildings) {
      const table = LOOT_TABLES[b.category] || LOOT_TABLES.maison;
      const n = lootCount(b.w, b.d);
      const placed = [];
      for (let i = 0; i < n; i++) {
        let x;
        let z;
        let ok = false;
        for (let tries = 0; tries < 12 && !ok; tries++) {
          x = b.cx + (Math.random() - 0.5) * b.w * 0.7;
          z = b.cz + (Math.random() - 0.5) * b.d * 0.7;
          ok = placed.every((pt) => Math.hypot(pt.x - x, pt.z - z) > 1.2);
        }
        if (!ok) continue;
        placed.push({ x, z });
        const type = pickLootType(table);
        const id = getNextItemId();
        addGroundItem({ id, type, x, z, qty: lootQty(type), loot: true });
      }
    }
    const generatedItems = [...items.values()].filter((i) => i.loot).length;
    log.info('loot', 'generated', { items: generatedItems, buildings: lootBuildings.length });
  }

  return {
    lootQty,
    pickLootType,
    lootCount,
    hasPersistedBuildingLoot,
    clearLoot,
    generateLoot,
  };
}

module.exports = {
  createBuildingLoot,
  LOOT_TABLES,
  ALL_ITEMS,
  LOOT_RESPAWN_MS,
  lootQty,
};
