/**
 * Pièce 7 — toit cabane survivor_shack (2 pans + faîtière + pignons).
 * Mesh : spawn_clearing.js → _buildSurvivorShackRoof
 */

export const SURVIVOR_SHACK_ROOF = Object.freeze({
  halfRun: 2.45,
  rise: 0.93,
  eaveY: 2.62,
  roofW: 5.88,
  roofThick: 0.16,
  panelOverhang: 0.12,
  ridgeTrimH: 0.14,
  ridgeTrimW: 0.14,
  gableX: 2.68,
  gableInset: 0.06,
  /** Bande verticale colliders — évite fantômes au sol / sous les murs. */
  colliderMinY: 2.55,
  colliderMaxY: 3.65,
});

export function survivorShackRoofPitch() {
  const r = SURVIVOR_SHACK_ROOF;
  return Math.atan2(r.rise, r.halfRun);
}

export function survivorShackRoofColliderDefs() {
  const r = SURVIVOR_SHACK_ROOF;
  const pitch = survivorShackRoofPitch();
  const panelLen = r.halfRun + r.panelOverhang;
  const panelZ = r.halfRun * 0.5;
  const band = { minY: r.colliderMinY, maxY: r.colliderMaxY };
  return [
    {
      type: 'box',
      lx: 0,
      lz: -panelZ,
      hw: r.roofW / 2,
      hd: panelLen / 2,
      rotX: -pitch,
      ...band,
    },
    {
      type: 'box',
      lx: 0,
      lz: panelZ,
      hw: r.roofW / 2,
      hd: panelLen / 2,
      rotX: pitch,
      ...band,
    },
  ];
}
