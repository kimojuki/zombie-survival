/**
 * Orientation des prefabs décor — convention Three.js et repères par prefab.
 * Source de vérité pour catalogue admin, seeds S01 et docs/DECOR_PREFAB_ORIENTATION.md
 *
 * Convention moteur (prefabs décor) :
 * - Pivot = centre sol (sauf bâtiments : pivot sol du bâtiment).
 * - Devant mesh = axe local **−Z** (rotation.y = rotY).
 * - Direction monde du devant : XZ = (−sin(rotY), −cos(rotY)).
 * - Droite mesh = **+X**, haut = **+Y**.
 */

/** @typedef {{
 *   forward: '-Z' | '+Z' | '-X' | '+X' | 'none',
 *   back?: '-Z' | '+Z' | '-X' | '+X',
 *   left?: '+X' | '-X',
 *   right?: '+X' | '-X',
 *   frontLabel: string,
 *   backLabel?: string,
 *   leftLabel?: string,
 *   rightLabel?: string,
 *   placementHint?: string,
 *   rotYHint?: string,
 *   symmetric?: boolean,
 * }} DecorPrefabOrientationDef */

/** @type {Record<string, DecorPrefabOrientationDef>} */
export const DECOR_PREFAB_ORIENTATION = Object.freeze({
  building_survivor_shack: {
    forward: '-Z',
    back: '+Z',
    left: '-X',
    right: '+X',
    frontLabel: 'Porte d\'entrée (mur sud mesh)',
    backLabel: 'Mur nord (fond cabane)',
    leftLabel: 'Mur ouest',
    rightLabel: 'Mur est',
    placementHint: 'Porte vers −Z local ; en seed S01 rotY ≈ 0,55',
  },
  storage_chest: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face serrure / couvercle',
    backLabel: 'Dos lisse',
    rotYHint: 'atan2(−dx, −dz) depuis la position vers la porte (Three.js −Z forward)',
    placementHint: 'Cabane : rotY ≈ shack.rotY pour face porte — voir s01-cabin01-chest.mjs',
  },
  spawn_single_bed: {
    forward: '+Z',
    back: '-Z',
    left: '-X',
    right: '+X',
    frontLabel: 'Tête / oreiller',
    backLabel: 'Pieds',
    placementHint: 'Coin NO cabane : tête contre mur nord (+Z local)',
  },
  spawn_cabin_table: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Côté assiette (face salle)',
    backLabel: 'Côté gobelet',
    symmetric: true,
    placementHint: 'Plateau quasi symétrique ; rotY pour orienter vers porte ou chaises',
  },
  spawn_cabin_chair: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise (où s\'assoit le joueur)',
    backLabel: 'Dossier',
    placementHint: 'Placer face à la table : devant −Z vers le plateau',
  },
  spawn_cabin_shelf: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face ouverte (plateaux visibles)',
    backLabel: 'Fond lattes — coller au mur',
    placementHint: 'Dos +Z contre mur nord ouest ; rotY = shack.rotY ou +π selon mur',
  },
  spawn_cabin_stove: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Porte vitrée / chargement bois',
    backLabel: 'Conduit fumée côté +Z',
    placementHint: 'Dos +Z vers mur (conduit) ; porte −Z vers pièce — pas trop près murs bois',
  },
  spawn_cabin_lantern: {
    forward: '-Z',
    back: '+Z',
    left: '-X',
    right: '+X',
    frontLabel: 'Face vitrée principale',
    backLabel: 'Dos cage',
    symmetric: true,
    placementHint: 'Pivot au sol sous la lanterne ; crochet vers plafond (~2,30 m) — centre pièce ou table',
  },
  spawn_cabin_wood_box: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face ouverte (bûches visibles)',
    backLabel: 'Fond lattes — contre mur',
    placementHint: 'Près du poêle ; dos +Z au mur · ouverture −Z vers pièce',
  },
  spawn_cabin_rug: {
    forward: '-Z',
    back: '+Z',
    left: '-X',
    right: '+X',
    frontLabel: 'Bande décorative / tête du tapis',
    backLabel: 'Bord arrière',
    symmetric: true,
    placementHint: 'Centre pièce ou devant table — bande −Z vers porte ou plateau',
  },
  spawn_cabin_bench: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise (vers la pièce)',
    backLabel: 'Dossier + fixations mur',
    placementHint: 'Dos +Z collé au mur ; assise −Z vers table ou feu',
  },
  spawn_cabin_basin: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face lavabo / cuvette',
    backLabel: 'Crédence + miroir contre mur',
    placementHint: 'Mur est ou ouest — dos +Z au mur, face −Z vers pièce',
  },
  spawn_cabin_wall_clock: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Cadran / face horloge',
    backLabel: 'Planche fixation mur',
    placementHint: 'Mur intérieur — dos +Z · cadran −Z vers pièce · ~1,45 m',
  },
  spawn_cabin_coat_rack: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Patères + vêtements',
    backLabel: 'Planche contre mur',
    placementHint: 'Près de la porte — dos +Z au mur, patères −Z',
  },
  spawn_beach_wreck_debris: {
    forward: '-Z',
    back: '+Z',
    left: '+X',
    right: '-X',
    frontLabel: 'Détail lisible (filet, corde, planches)',
    backLabel: 'Dos du tas',
    placementHint: 'Sol sable — spawn plage ~(245, -8) : rotY pour face joueur · 3–5 m du point de réveil',
    symmetric: false,
  },
  spawn_beach_washed_gear: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Sac ouvert + gourde visibles',
    backLabel: 'Dos du sac',
    placementHint: 'Entre naufrage et bouche sentier ~(240, -10) · rotY pour lire le sac depuis le spawn',
    symmetric: false,
  },
  spawn_beach_driftwood: {
    forward: '-Z',
    back: '+Z',
    left: '-X',
    right: '+X',
    frontLabel: 'Branche / nœud visible',
    backLabel: 'Extrémité du rondin',
    placementHint: 'Bouche sentier — rondin parallèle au chemin (pointe vers −X / forêt)',
    symmetric: false,
  },
  spawn_beach_footprint_trail: {
    forward: '-X',
    back: '+X',
    frontLabel: 'Sens des empreintes (vers feu / ponton)',
    backLabel: 'Vers la mer',
    placementHint: 'Piste intro ~(245, -7.6) · monde unique',
    symmetric: false,
  },
  spawn_beach_message_bottle: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Bouteille + parchemin',
    placementHint: 'Lisible E · intro_bottle_k',
    symmetric: true,
  },
  spawn_beach_campfire_ring: {
    forward: '-Z',
    back: '+Z',
    placementHint: 'Centre torche personnelle · ~(241, -7.5)',
    symmetric: true,
  },
  spawn_beach_pier_wreck: {
    forward: '-X',
    back: '+X',
    frontLabel: 'Planches vers la mer',
    backLabel: 'Vers la forêt',
    placementHint: 'Valise sous charpente · ~(237.6, -6.9)',
    symmetric: false,
  },
  spawn_beach_burnt_note: {
    forward: '-Z',
    placementHint: 'Lisible E · intro_burnt_note_k · spawn personnel',
    symmetric: true,
  },
  spawn_bedroll: {
    forward: '+Z',
    back: '-Z',
    frontLabel: 'Capuche / tête sac',
    backLabel: 'Rouleau fermé',
  },
  spawn_workbench: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face outils / établi',
    backLabel: 'Renfort arrière',
  },
  spawn_lean_to: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Ouverture abri',
    backLabel: 'Toile contre poteaux arrière',
  },
  build_door_wood: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face poignée / ouverture',
    backLabel: 'Charniere côté +Z',
  },
  build_doorway_wood: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Ouverture passage',
    backLabel: 'Montants côté +Z',
  },
  sign_beach_exit: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face panneau lisible',
    backLabel: 'Support arrière',
  },
  sign_sector_gate: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face panneau lisible',
    backLabel: 'Support arrière',
  },
  spawn_urban_bench: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise (dos dossier +Z)',
    backLabel: 'Dossier',
    placementHint: 'Aligner le long du trottoir ; dossier vers bâtiment',
  },
  spawn_urban_street_lamp: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Bras / lanterne vers −Z',
    backLabel: 'Poteau +Z',
    symmetric: true,
    placementHint: 'Aligner le long de la rue',
  },
  spawn_prop_shop_counter: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face client / caisse',
    backLabel: 'Dos comptoir',
    placementHint: 'Bras L vers +X local — orienter vers salle',
  },
  spawn_prop_grocery_shelf: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Face produits',
    backLabel: 'Dos tôles — contre mur',
  },
  spawn_urban_fence_panel: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Grillage visible',
    backLabel: 'Montants arrière',
    symmetric: true,
  },
  spawn_urban_vending_machine: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrine / sélection',
    backLabel: 'Dos tôle',
    placementHint: 'Contre mur ou angle magasin',
  },
  spawn_urban_newspaper_box: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrine journaux',
    backLabel: 'Dos métal',
  },
  spawn_prop_office_desk: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran + face bureau',
    backLabel: 'Dos / tiroirs',
  },
  spawn_prop_wardrobe: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Portes / poignées',
    backLabel: 'Dos — contre mur',
  },
  spawn_prop_bookshelf: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Livres visibles',
    backLabel: 'Dos — contre mur',
  },
  spawn_prop_kitchen_chair: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise',
    backLabel: 'Dossier +Z',
  },
  spawn_prop_workbench: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Étau / face travail',
    backLabel: 'Dos établi',
  },
  spawn_prop_double_bed: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Tête de lit / oreillers',
    backLabel: 'Pied de lit',
  },
  spawn_urban_atm: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran / clavier',
    backLabel: 'Dos tôle',
  },
  spawn_urban_phone_booth: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrine / téléphone',
    backLabel: 'Dos cabine',
  },
  spawn_urban_bus_shelter: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrage / banc',
    backLabel: 'Dos structure',
    placementHint: 'Aligner le long de la rue',
  },
  spawn_prop_kitchen_sink: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Évier + robinet',
    backLabel: 'Dos meuble',
  },
  spawn_urban_window_ac: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Grille façade',
    backLabel: 'Évacuation air +Z',
  },
  spawn_urban_gas_pump: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran / pistolet',
    backLabel: 'Dos distributeur',
  },
  spawn_prop_filing_cabinet: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Tiroirs / poignées',
    backLabel: 'Dos tôle',
  },
  spawn_prop_safe: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Porte + cadran',
    backLabel: 'Dos coffre',
  },
  spawn_prop_medicine_cabinet: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Miroir / porte',
    backLabel: 'Dos — mur',
    placementHint: 'Hauteur murale — pivot sol sous le meuble',
  },
  spawn_urban_snack_machine: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrine snacks',
    backLabel: 'Dos tôle',
  },
  spawn_urban_locker: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Portes casiers',
    backLabel: 'Dos tôle',
  },
  spawn_prop_upright_piano: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Clavier / façade',
    backLabel: 'Dos bois',
  },
  spawn_urban_store_awning: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Auvent / devanture',
    backLabel: 'Fixation mur +Z',
    placementHint: 'Pivot au sol sous la devanture — hauteur ~2,4 m',
  },
  spawn_prop_arcade_cabinet: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran + joystick',
    backLabel: 'Dos borne',
  },
  spawn_urban_bakery_rack: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Pains visibles',
    backLabel: 'Dos tôle',
  },
  spawn_prop_display_fridge: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitrine verre',
    backLabel: 'Dos tôle',
  },
  spawn_prop_cash_register: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran + clavier',
    backLabel: 'Dos caisse',
  },
  spawn_prop_whiteboard: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Surface blanche',
    backLabel: 'Fixation mur +Z',
    placementHint: 'Pivot au sol sous le tableau — hauteur ~0,62 m',
  },
  spawn_prop_wall_tv: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Écran',
    backLabel: 'Fixation mur +Z',
    placementHint: 'Pivot au sol sous la TV — hauteur ~0,72 m',
  },
  spawn_game_foosball: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Joueurs −Z',
    backLabel: 'Dos table +Z',
  },
  spawn_game_pinball: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Vitre + joueur',
    backLabel: 'Dos caisse',
  },
  spawn_game_poker_table: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Croupier / banque',
    backLabel: 'Dos feutre',
    symmetric: true,
  },
  spawn_game_dartboard: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Cible',
    backLabel: 'Fixation mur +Z',
    placementHint: 'Pivot au sol sous la cible — hauteur ~1,42 m',
  },
  spawn_sport_soccer_goal: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Ouverture but',
    backLabel: 'Filet +Z',
  },
  spawn_loisir_camping_tent: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Porte tente',
    backLabel: 'Dos toile +Z',
  },
  spawn_game_air_hockey: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Joueur −Z',
    backLabel: 'Dos table +Z',
  },
  spawn_loisir_keyboard: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Clavier / musicien',
    backLabel: 'Dos pied +Z',
  },
  spawn_loisir_folding_chair: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise',
    backLabel: 'Dossier +Z',
  },
  spawn_sport_kayak: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Cockpit / proue',
    backLabel: 'Arrière coque +Z',
  },
  spawn_loisir_canoe: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Proue canoë',
    backLabel: 'Arrière + rack +Z',
  },
  spawn_game_roulette_table: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Croupier / joueurs',
    backLabel: 'Dos table +Z',
  },
  spawn_sport_climbing_wall: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Prises escalade',
    backLabel: 'Structure +Z',
  },
  spawn_loisir_portable_bbq: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Grille / cuisson',
    backLabel: 'Dos BBQ +Z',
  },
  spawn_loisir_beach_chair: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Assise / mer',
    backLabel: 'Dossier incliné +Z',
  },
  spawn_loisir_paddle_board: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Proue planche',
    backLabel: 'Arrière +Z',
  },
  spawn_loisir_camp_cot: {
    forward: '-Z',
    back: '+Z',
    frontLabel: 'Tête lit',
    backLabel: 'Pieds +Z',
  },
});

const DEFAULT_FORWARD = '-Z';

/**
 * Vecteur monde XZ unitaire du devant mesh pour un rotY donné.
 * @param {number} rotY
 * @returns {{ x: number, z: number }}
 */
export function decorForwardWorldXZ(rotY) {
  return { x: -Math.sin(rotY), z: -Math.cos(rotY) };
}

/**
 * rotY pour que le devant (−Z) regarde un point monde (cx, cz) depuis (x, z).
 * @param {number} x
 * @param {number} z
 * @param {number} targetX
 * @param {number} targetZ
 * @returns {number}
 */
export function decorRotYFaceTarget(x, z, targetX, targetZ) {
  const dx = targetX - x;
  const dz = targetZ - z;
  return Math.atan2(-dx, -dz);
}

/**
 * @param {string} id
 * @returns {DecorPrefabOrientationDef & { id: string, documented: boolean, summary: string }}
 */
export function getDecorPrefabOrientation(id) {
  const def = DECOR_PREFAB_ORIENTATION[id];
  if (def) {
    return {
      id,
      documented: true,
      summary: formatDecorOrientationShort(def),
      ...def,
    };
  }
  return {
    id,
    documented: false,
    forward: DEFAULT_FORWARD,
    frontLabel: 'Devant mesh (convention −Z, non documenté)',
    placementHint: 'Ajouter une entrée dans decor-prefab-orientation.mjs',
    summary: 'Devant −Z (convention — non documenté)',
  };
}

/**
 * @param {DecorPrefabOrientationDef} o
 * @returns {string}
 */
export function formatDecorOrientationShort(o) {
  const parts = [`Devant ${o.forward}`];
  if (o.frontLabel) parts[0] += ` — ${o.frontLabel}`;
  if (o.back) parts.push(`Dos ${o.back}${o.backLabel ? ` (${o.backLabel})` : ''}`);
  if (o.symmetric) parts.push('symétrique plan');
  return parts.join(' · ');
}

/**
 * @param {DecorPrefabOrientationDef} o
 * @returns {string}
 */
export function formatDecorOrientationLong(o) {
  const lines = [formatDecorOrientationShort(o)];
  if (o.left && o.leftLabel) lines.push(`Gauche ${o.left} — ${o.leftLabel}`);
  if (o.right && o.rightLabel) lines.push(`Droite ${o.right} — ${o.rightLabel}`);
  if (o.rotYHint) lines.push(`rotY : ${o.rotYHint}`);
  if (o.placementHint) lines.push(`Placement : ${o.placementHint}`);
  return lines.join('\n');
}
