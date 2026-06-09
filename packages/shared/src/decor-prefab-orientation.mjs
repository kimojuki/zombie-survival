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
