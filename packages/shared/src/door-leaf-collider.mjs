/** Battant porte ouvert — centre + rotation locale autour du pivot (Three.js rotation.y). */

export const DOOR_OPEN_ANGLE = -Math.PI * 0.52;

/** Espace décor → axes du battant (inverse rotation Y du pivot). */
export function doorLeafLocalXZ(bx, bz, localRotY) {
  if (!localRotY) return { bx, bz };
  const c = Math.cos(localRotY);
  const s = Math.sin(localRotY);
  return {
    bx: bx * c - bz * s,
    bz: bx * s + bz * c,
  };
}

/** Axes du battant → espace décor. */
export function doorLeafWorldXZ(bx, bz, localRotY) {
  if (!localRotY) return { bx, bz };
  const c = Math.cos(localRotY);
  const s = Math.sin(localRotY);
  return {
    bx: bx * c + bz * s,
    bz: -bx * s + bz * c,
  };
}

/**
 * Déplace le centre du collider battant et ajoute localRotY quand la porte est ouverte.
 * @param {object} def — lx, lz, doorPivotLx?, doorPivotLz?, door?
 * @param {number} angle — rotation Y du pivot (rad), 0 = fermé
 */
export function transformOpenDoorLeaf(def, angle) {
  if (!def?.door || !angle) return def;
  const px = def.doorPivotLx ?? def.lx ?? 0;
  const pz = def.doorPivotLz ?? def.lz ?? 0;
  const offX = (def.lx || 0) - px;
  const offZ = (def.lz || 0) - pz;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    ...def,
    lx: px + offX * c + offZ * s,
    lz: pz - offX * s + offZ * c,
    localRotY: angle,
  };
}
