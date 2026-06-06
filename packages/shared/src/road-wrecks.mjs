/** Épaves routières — placements le long des polylignes (seed serveur + doc). */

export const TOWN_MAIN_PTS = [
  [88, -64], [74, -62], [62, -60], [56, -58],
  [36, -56], [16, -52], [-4, -46], [-24, -36], [-44, -24], [-64, -8],
  [-78, -9], [-92, -9], [-104, -9], [-118, -8], [-155, 0], [-180, 1], [-210, 0], [-250, 1], [-295, 0],
];

export const CITY_HIGHWAY_PTS = [
  [-104, -9], [-96, -32], [-82, -58], [-65, -85], [-48, -105], [-32, -116], [-20, -122],
];

const ROAD_WIDTH = { town_main: 8.4, city_highway: 12 };

function _sampleAlong(pts, t) {
  if (!pts || pts.length < 2) return null;
  const clamped = Math.max(0, Math.min(1, Number(t) || 0));
  let total = 0;
  const segLens = [];
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segLens.push(len);
    total += len;
  }
  if (total < 1e-6) return null;
  let dist = clamped * total;
  for (let i = 0; i < segLens.length; i++) {
    if (dist <= segLens[i] || i === segLens.length - 1) {
      const f = segLens[i] > 0 ? Math.min(1, dist / segLens[i]) : 0;
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz) || 1;
      return { x: x0 + dx * f, z: z0 + dz * f, ux: dx / len, uz: dz / len };
    }
    dist -= segLens[i];
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = last[0] - prev[0];
  const dz = last[1] - prev[1];
  const len = Math.hypot(dx, dz) || 1;
  return { x: last[0], z: last[1], ux: dx / len, uz: dz / len };
}

function _placeOnRoad(pts, width, def) {
  const s = _sampleAlong(pts, def.t);
  if (!s) return null;
  const hw = width * 0.5;
  const nx = -s.uz;
  const nz = s.ux;
  const sign = def.side === 'left' ? 1 : def.side === 'right' ? -1 : 0;
  const lateral = sign * (hw * (def.lane ?? 0.42) + (def.offset || 0));
  return {
    x: s.x + nx * lateral,
    z: s.z + nz * lateral,
    rotY: Math.atan2(s.ux, s.uz) + (def.rot || 0),
  };
}

/** Gabarit épaves — le long de town_main (jonction → ouest) + 1 sur city_highway. */
export const ROAD_WRECK_TEMPLATES = Object.freeze([
  // Jonction sentier — 2 véhicules (file d'attente)
  { prefabId: 'wreck_sedan', road: 'town_main', t: 0.278, side: 'right', lane: 0.38, variant: 'rust', wheels: 2, tilt: 0.1 },
  { prefabId: 'wreck_pickup', road: 'town_main', t: 0.305, side: 'left', lane: 0.42, variant: 'burnt', burnt: true, wheels: 1, tilt: 0.08 },
  // Ouest — épars (~25–35 m entre chaque)
  { prefabId: 'wreck_sedan', road: 'town_main', t: 0.38, side: 'right', lane: 0.4, variant: 'olive', wheels: 3 },
  { prefabId: 'wreck_pickup', road: 'town_main', t: 0.46, side: 'left', lane: 0.44, variant: 'beige', tilt: -0.12, wheels: 2 },
  { prefabId: 'wreck_sedan', road: 'town_main', t: 0.54, side: 'center', lane: 0.12, variant: 'burnt', burnt: true, rot: 0.15, tilt: 0.18 },
  { prefabId: 'wreck_pickup', road: 'town_main', t: 0.62, side: 'right', lane: 0.46, variant: 'navy', wheels: 2, tilt: -0.14 },
  { prefabId: 'wreck_sedan', road: 'town_main', t: 0.70, side: 'left', lane: 0.38, variant: 'rust', rot: Math.PI + 0.08, sink: 0.04 },
  // Branche grande ville
  { prefabId: 'wreck_pickup', road: 'city_highway', t: 0.18, side: 'right', lane: 0.42, variant: 'olive', wheels: 3, tilt: -0.1 },
]);

/**
 * @returns {Array<{ kind: 'prefab', prefabId: string, x: number, z: number, rotY: number, rotZ?: number, scale: number, wreckVariant?: string, wreckBurnt?: boolean, wreckTilt?: number, wreckWheels?: number, wreckSink?: number }>}
 */
export function computeRoadWreckPlacements() {
  const out = [];
  for (const tpl of ROAD_WRECK_TEMPLATES) {
    const pts = tpl.road === 'city_highway' ? CITY_HIGHWAY_PTS : TOWN_MAIN_PTS;
    const width = ROAD_WIDTH[tpl.road] || 8.4;
    const pos = _placeOnRoad(pts, width, tpl);
    if (!pos) continue;
    out.push({
      kind: 'prefab',
      prefabId: tpl.prefabId,
      x: pos.x,
      z: pos.z,
      rotY: pos.rotY,
      rotZ: tpl.tilt || 0,
      scale: 1,
      wreckVariant: tpl.variant || 'rust',
      wreckBurnt: !!tpl.burnt,
      wreckTilt: tpl.tilt || 0,
      wreckWheels: tpl.wheels,
      wreckSink: tpl.sink || 0,
    });
  }
  return out;
}
