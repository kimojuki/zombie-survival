/**
 * Catalogue prefabs décor — IDs découverts automatiquement depuis le client ;
 * métadonnées enrichies ici (optionnel) + labels client via registerDecorPrefab.
 */

import {
  DEFAULT_CLIENT_JS_DIR,
  discoverDecorPrefabIds,
} from './decor-prefab-discover.mjs';
import {
  formatDecorOrientationLong,
  formatDecorOrientationShort,
  getDecorPrefabOrientation,
} from './decor-prefab-orientation.mjs';

/** @typedef {{ id: string, category: string, label: string, desc: string, rcon: string, notes?: string, auto?: boolean, orientation?: string, orientationDetail?: string, orientationDocumented?: boolean }} DecorPrefabEntry */

/** Métadonnées manuelles optionnelles (prioritaires sur l’inférence auto). */
/** @type {Record<string, Omit<DecorPrefabEntry, 'id' | 'auto'>>} */
export const DECOR_PREFAB_META = {
  spawn_campfire: { category: 'camp', label: 'Feu de camp', desc: 'Feu de camp procédural (décor spawn).', rcon: 'decoradd prefab spawn_campfire here' },
  spawn_log_pile: { category: 'camp', label: 'Tas de bûches', desc: 'Pile de rondins décorative.', rcon: 'decoradd prefab spawn_log_pile here' },
  spawn_border_log: { category: 'camp', label: 'Rondin de lisière', desc: 'Rondin horizontal — scale ≈ longueur / 0,42 m.', rcon: 'decoradd prefab spawn_border_log here 0 2', notes: 'Ajuster le scale (ex. 2) pour la longueur.' },
  spawn_supply_crate: { category: 'camp', label: 'Caisse de ravitaillement', desc: 'Caisse texturée (décor camp).', rcon: 'decoradd prefab spawn_supply_crate here' },
  spawn_marker_left: { category: 'camp', label: 'Poteau marqueur (gauche)', desc: 'Poteau de balisage côté gauche.', rcon: 'decoradd prefab spawn_marker_left here' },
  spawn_marker_right: { category: 'camp', label: 'Poteau marqueur (droite)', desc: 'Poteau de balisage côté droit.', rcon: 'decoradd prefab spawn_marker_right here' },
  spawn_bedroll: { category: 'camp', label: 'Sac de couchage', desc: 'Sac de couchage déroulé (repos E) — pas un lit.', rcon: 'decoradd prefab spawn_bedroll here', notes: 'Camp spawn ; cabane S01 utilise spawn_single_bed.' },
  spawn_single_bed: { category: 'camp', label: 'Lit une place', desc: 'Lit simple bois + matelas (repos E).', rcon: 'decoradd prefab spawn_single_bed here', notes: 'Cabane S01 seed s01:cabin01:bed.' },
  spawn_cabin_table: { category: 'camp', label: 'Table de cabane', desc: 'Table rustique bois (~1,15 × 0,70 m) pour intérieur cabane.', rcon: 'decoradd prefab spawn_cabin_table here', notes: 'Devant −Z (assiette) · dos +Z. Voir docs/DECOR_PREFAB_ORIENTATION.md.' },
  spawn_cabin_chair: { category: 'camp', label: 'Chaise de cabane', desc: 'Chaise bois rustique (~0,42 m) — assortie à la table cabane.', rcon: 'decoradd prefab spawn_cabin_chair here', notes: 'Devant −Z (assise) · dossier +Z. Face à la table.' },
  spawn_cabin_shelf: { category: 'camp', label: 'Étagère cabane', desc: 'Étagère bois 3 niveaux (~0,78 m) — dos contre mur (+Z).', rcon: 'decoradd prefab spawn_cabin_shelf here', notes: 'Face ouverte −Z · fond lattes +Z contre mur.' },
  spawn_cabin_stove: { category: 'camp', label: 'Poêle à bois cabane', desc: 'Poêle fonte rustique (~0,52 m) + conduit — porte vitrée −Z.', rcon: 'decoradd prefab spawn_cabin_stove here', notes: 'Porte −Z · conduit +Z vers mur. Voir DECOR_PREFAB_ORIENTATION.md.' },
  spawn_cabin_lantern: { category: 'camp', label: 'Lanterne suspendue cabane', desc: 'Lanterne à chaîne (~2,30 m) — flamme animée, lumière chaude intérieur.', rcon: 'decoradd prefab spawn_cabin_lantern here', notes: 'Pivot sol · crochet plafond · face vitrée −Z. Centre pièce ou au-dessus table.' },
  spawn_cabin_wood_box: { category: 'camp', label: 'Caisse à bûches cabane', desc: 'Bac bois + bûches empilées + hache (~0,50 m) — alimentation poêle.', rcon: 'decoradd prefab spawn_cabin_wood_box here', notes: 'Face ouverte −Z · dos +Z contre mur · près du poêle.' },
  spawn_cabin_rug: { category: 'camp', label: 'Tapis cabane', desc: 'Tapis tissé laine (~0,96 × 0,62 m) — bordure et franges, bande décor −Z.', rcon: 'decoradd prefab spawn_cabin_rug here', notes: 'Tête / bande −Z vers table ou porte · quasi symétrique.' },
  spawn_cabin_bench: { category: 'camp', label: 'Banc mural cabane', desc: 'Banc fixé au mur ~1,02 m — assise 3 planches, cubby chaussures, couverture.', rcon: 'decoradd prefab spawn_cabin_bench here', notes: 'Assise −Z · dossier incliné +Z · cleat + boulons visibles.' },
  spawn_cabin_basin: { category: 'camp', label: 'Lavabo cabane', desc: 'Meuble bois ~0,46 m — cuvette porcelaine encastrée, robinet fer, cruche, seau, miroir.', rcon: 'decoradd prefab spawn_cabin_basin here', notes: 'Face −Z · dos +Z contre mur · eau = disque plat (pas de transparence).' },
  spawn_backpack: { category: 'camp', label: 'Sac à dos', desc: 'Sac posé au sol.', rcon: 'decoradd prefab spawn_backpack here' },
  spawn_lean_to: { category: 'camp', label: 'Abri de fortune', desc: 'Lean-to / abri incliné.', rcon: 'decoradd prefab spawn_lean_to here' },
  spawn_stump_seat: { category: 'camp', label: 'Souche siège', desc: 'Souche tronçonnée pour s’asseoir.', rcon: 'decoradd prefab spawn_stump_seat here' },
  spawn_drink_set: { category: 'camp', label: 'Set boissons', desc: 'Bouteilles / verres décoratifs.', rcon: 'decoradd prefab spawn_drink_set here' },
  spawn_lantern: { category: 'camp', label: 'Lanterne', desc: 'Lanterne posée.', rcon: 'decoradd prefab spawn_lantern here' },
  spawn_stone: { category: 'camp', label: 'Pierre (petite)', desc: 'Caillou décoratif spawn.', rcon: 'decoradd prefab spawn_stone here' },
  spawn_flat_stone: { category: 'camp', label: 'Pierre plate', desc: 'Dalle / pierre plate au sol.', rcon: 'decoradd prefab spawn_flat_stone here' },
  spawn_workbench: { category: 'camp', label: 'Établi', desc: 'Établi de craft décoratif.', rcon: 'decoradd prefab spawn_workbench here' },
  rock_boulder: { category: 'rocher', label: 'Bloc rocheux', desc: 'Gros rocher procédural (monde).', rcon: 'decoradd prefab rock_boulder here', notes: 'Seed : decorseed rocks' },
  rock_outcrop: { category: 'rocher', label: 'Affleurement', desc: 'Affleurement rocheux bas.', rcon: 'decoradd prefab rock_outcrop here', notes: 'Seed : decorseed rocks' },
  storage_chest: { category: 'stockage', label: 'Coffre', desc: 'Coffre interactif — E pour déposer / reprendre des items.', rcon: 'decoradd prefab storage_chest here', notes: '27 emplacements, 3 coups pour casser.' },
  build_wall_wood: { category: 'construction', label: 'Mur bois', desc: 'Mur de base (3×2,6 m).', rcon: 'decoradd prefab build_wall_wood here' },
  build_doorway_wood: { category: 'construction', label: 'Embrasure porte', desc: 'Mur avec ouverture porte standard (1,8 m).', rcon: 'decoradd prefab build_doorway_wood here' },
  build_large_doorway_wood: { category: 'construction', label: 'Embrasure grande porte', desc: 'Mur avec ouverture grande porte (2,4 m).', rcon: 'decoradd prefab build_large_doorway_wood here' },
  build_floor_wood: { category: 'construction', label: 'Plancher bois', desc: 'Dalle de sol 3×3 m.', rcon: 'decoradd prefab build_floor_wood here' },
  build_ceiling_wood: { category: 'construction', label: 'Plafond bois', desc: 'Plafond 3×3 m.', rcon: 'decoradd prefab build_ceiling_wood here' },
  build_stair_wood: { category: 'construction', label: 'Escalier bois', desc: 'Escalier montant 2,6 m.', rcon: 'decoradd prefab build_stair_wood here' },
  build_door_wood: { category: 'construction', label: 'Porte bois', desc: 'Porte battante standard.', rcon: 'decoradd prefab build_door_wood here' },
  build_large_door_wood: { category: 'construction', label: 'Grande porte bois', desc: 'Porte double / large.', rcon: 'decoradd prefab build_large_door_wood here' },
  building_survivor_shack: { category: 'batiment', label: 'Cabane survivant', desc: 'Cabane S01 avec porte, intérieur et toit.', rcon: 'decoradd prefab building_survivor_shack here 0 1', notes: 'Sans x/z = 8 m devant vous ; rotY scale optionnels.' },
  smallcity_house_a: { category: 'batiment', label: 'Maison petite ville A', desc: 'Maison S02 — salon, chambre, SdB, fenêtres, porte.', rcon: 'decoradd prefab smallcity_house_a here 0 1' },
  smallcity_house_b: { category: 'batiment', label: 'Maison petite ville B', desc: 'Variante maison S02.', rcon: 'decoradd prefab smallcity_house_b here 0 1' },
  tree_oak: { category: 'arbre', label: 'Chêne', desc: 'Arbre feuillu — récoltable (bois), croissance progressive.', rcon: 'decoradd prefab tree_oak here', notes: 'Seed : decorseed trees' },
  tree_pine: { category: 'arbre', label: 'Pin', desc: 'Conifère récoltable.', rcon: 'decoradd prefab tree_pine here', notes: 'Seed : decorseed trees' },
  tree_birch: { category: 'arbre', label: 'Bouleau', desc: 'Bouleau récoltable.', rcon: 'decoradd prefab tree_birch here', notes: 'Seed : decorseed trees' },
  tree_dead: { category: 'arbre', label: 'Arbre mort', desc: 'Arbre mort / tronc sec.', rcon: 'decoradd prefab tree_dead here', notes: 'Seed : decorseed trees' },
  tree_palm: { category: 'arbre', label: 'Palmier', desc: 'Palmier plage — récoltable.', rcon: 'decoradd prefab tree_palm here', notes: 'Seed : decorseed palms' },
  wreck_sedan: { category: 'epave', label: 'Épave berline', desc: 'Carrosserie berline abandonnée.', rcon: 'decoradd prefab wreck_sedan here 0 1 rust 0.15 2', notes: 'Variants : rust, olive, navy, beige, burnt — puis tilt, roues, sink.' },
  wreck_pickup: { category: 'epave', label: 'Épave pick-up', desc: 'Pick-up épave routière.', rcon: 'decoradd prefab wreck_pickup here 0 1 rust 0.1 2', notes: 'Seed : decorseed wrecks' },
  road_barrier_post: { category: 'route', label: 'Poteau barrière', desc: 'Poteau de barrière routière.', rcon: 'decoradd prefab road_barrier_post here', notes: 'Seed : decorseed barriers' },
  road_barrier_rail: { category: 'route', label: 'Rail barrière', desc: 'Rail horizontal de barrière.', rcon: 'decoradd prefab road_barrier_rail here', notes: 'Seed : decorseed barriers' },
  sign_beach_exit: { category: 'signalisation', label: 'Panneau sortie plage', desc: 'Panneau directionnel sortie du sentier plage.', rcon: 'decoradd prefab sign_beach_exit here', notes: 'Seed : decorseed signs' },
  beach_exit_torch: { category: 'signalisation', label: 'Torche sortie plage', desc: 'Torche à côté du panneau de sortie.', rcon: 'decoradd prefab beach_exit_torch here', notes: 'Seed : decorseed signs' },
  sign_sector_gate: { category: 'signalisation', label: 'Panneau portail secteur', desc: 'Panneau au portail / checkpoint secteur.', rcon: 'decoradd prefab sign_sector_gate here' },
  s01_gas_station: { category: 's01', label: 'Station-service S01', desc: 'Station-service procédurale secteur 01.', rcon: 'decoradd prefab s01_gas_station here 0 1' },
  s01_military_tent: { category: 's01', label: 'Tente militaire S01', desc: 'Tente militaire checkpoint / camp S01.', rcon: 'decoradd prefab s01_military_tent here 0 1' },
};

/** Libellés français des catégories (UI admin). */
export const DECOR_PREFAB_CATEGORIES = {
  camp: 'Camp / spawn',
  rocher: 'Rochers',
  stockage: 'Stockage',
  construction: 'Construction bois',
  batiment: 'Bâtiments',
  arbre: 'Arbres',
  epave: 'Épaves',
  route: 'Route',
  signalisation: 'Signalisation',
  s01: 'Secteur 01',
  autre: 'Autre',
};

/**
 * @param {string} id
 * @returns {string}
 */
export function inferDecorPrefabCategory(id) {
  if (id.startsWith('spawn_')) return 'camp';
  if (id.startsWith('rock_')) return 'rocher';
  if (id.startsWith('storage_')) return 'stockage';
  if (id.startsWith('build_')) return 'construction';
  if (id.startsWith('building_') || id.startsWith('smallcity_')) return 'batiment';
  if (id.startsWith('tree_')) return 'arbre';
  if (id.startsWith('wreck_')) return 'epave';
  if (id.startsWith('road_')) return 'route';
  if (id.startsWith('sign_') || id.startsWith('beach_')) return 'signalisation';
  if (id.startsWith('s01_')) return 's01';
  return 'autre';
}

/**
 * @param {string} id
 * @returns {string}
 */
export function defaultDecorPrefabRcon(id) {
  if (id.startsWith('building_') || id.startsWith('smallcity_') || id === 's01_gas_station' || id === 's01_military_tent') {
    return `decoradd prefab ${id} here 0 1`;
  }
  if (id.startsWith('wreck_')) {
    return `decoradd prefab ${id} here 0 1 rust 0.15 2`;
  }
  if (id === 'spawn_border_log') {
    return `decoradd prefab ${id} here 0 2`;
  }
  return `decoradd prefab ${id} here`;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function humanizeDecorPrefabLabel(id) {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string[]} ids
 * @param {Record<string, Partial<DecorPrefabEntry>>} [clientMeta]
 * @returns {DecorPrefabEntry[]}
 */
export function buildDecorPrefabCatalog(ids, clientMeta = {}) {
  return ids.map((id) => {
    const manual = DECOR_PREFAB_META[id];
    const client = clientMeta[id];
    const auto = !manual;
    const category = manual?.category || client?.category || inferDecorPrefabCategory(id);
    const label = manual?.label || client?.label || humanizeDecorPrefabLabel(id);
    const desc = manual?.desc || client?.desc || 'Prefab décor enregistré côté client.';
    const rcon = manual?.rcon || client?.rcon || defaultDecorPrefabRcon(id);
    const notes = manual?.notes || client?.notes;
    const orient = getDecorPrefabOrientation(id);
    return {
      id,
      category,
      label,
      desc,
      rcon,
      notes,
      auto,
      orientation: formatDecorOrientationShort(orient),
      orientationDetail: formatDecorOrientationLong(orient),
      orientationDocumented: orient.documented,
    };
  });
}

/**
 * @param {string} [clientJsDir]
 * @param {Record<string, Partial<DecorPrefabEntry>>} [clientMeta]
 */
export function loadDecorPrefabCatalog(clientJsDir = DEFAULT_CLIENT_JS_DIR, clientMeta = {}) {
  const ids = discoverDecorPrefabIds(clientJsDir);
  return {
    ids,
    catalog: buildDecorPrefabCatalog(ids, clientMeta),
    categories: DECOR_PREFAB_CATEGORIES,
  };
}

/** @deprecated Utiliser loadDecorPrefabCatalog().catalog */
export function getDecorPrefabCatalog(clientJsDir, clientMeta) {
  return loadDecorPrefabCatalog(clientJsDir, clientMeta).catalog;
}

export { discoverDecorPrefabIds, DEFAULT_CLIENT_JS_DIR };
