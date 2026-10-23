/**
 * Ancrage cabane sur terrain cabossé — échantillonne les coins du sol.
 */

import { SURVIVOR_SHACK_FLOOR } from './survivor-shack-floor.mjs';

/** Points locaux (lx, lz) sous l'empreinte du sol. */
export function survivorShackPadSampleLocals() {
  const hw = SURVIVOR_SHACK_FLOOR.width / 2;
  const hd = SURVIVOR_SHACK_FLOOR.depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
    [0, 0],
  ];
}

/** Local décor → monde XZ (pivot cabane). */
export function survivorShackLocalToWorldXZ(x, z, rotY, lx, lz) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return {
    x: x + lx * c + lz * s,
    z: z - lx * s + lz * c,
  };
}

/**
 * Hauteur pivot = max terrain sous l'empreinte (évite que le sol enfonce dans les bosses).
 * @param {number} x
 * @param {number} z
 * @param {number} rotY
 * @param {(wx: number, wz: number) => number} heightAt
 */
export function sampleSurvivorShackPadHeight(x, z, rotY, heightAt) {
  let maxH = -Infinity;
  for (const [lx, lz] of survivorShackPadSampleLocals()) {
    const { x: wx, z: wz } = survivorShackLocalToWorldXZ(x, z, rotY, lx, lz);
    const h = heightAt(wx, wz);
    if (Number.isFinite(h) && h > maxH) maxH = h;
  }
  return Number.isFinite(maxH) ? maxH : heightAt(x, z);
}
