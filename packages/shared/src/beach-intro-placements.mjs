/**
 * Intro plage v3 — placements monde (piste unique est → ouest) + zones de beats.
 * Parcours ~25–30 m : réveil côté océan, indices espacés vers le sentier / panneau sortie.
 */

import {
  BEACH_OFFSHORE_WRECK,
  BEACH_SPAWN,
  BEACH_TRAIL_PTS,
  INTRO_SPAWN_CLUSTER,
  introOffshoreWreckLookTarget,
  isOnBeachOffshoreWater,
  isOnBeachSafeSand,
} from './beach-spawn.mjs';

export { introOffshoreWreckLookTarget };

export const BEACH_INTRO_ZONE_ID = 'beach_intro_v3';

export const BEACH_INTRO_FOOTPRINTS_KEY = 'beach:intro_footprints';
export const BEACH_INTRO_BOTTLE_KEY = 'beach:intro_bottle';
export const BEACH_INTRO_CAMPFIRE_KEY = 'beach:intro_campfire';
export const BEACH_INTRO_PIER_KEY = 'beach:intro_pier';
export const BEACH_INTRO_MARKER_MID_KEY = 'beach:intro_marker_mid';
export const BEACH_INTRO_MARKER_PIER_KEY = 'beach:intro_marker_pier';
export const BEACH_INTRO_OFFSHORE_KEY = 'beach:intro:offshore_wreck';

/** @typedef {{ x: number, z: number, r: number }} IntroBeatZone */

/** Premier indice partagé — ~12 m à l'ouest du cluster de réveil. */
export const INTRO_ZONE_FOOTPRINTS = Object.freeze({ x: 269.0, z: -8.0, r: 7.5 });

/** Cible caméra réveil — caillou ~1,75 m devant le joueur (sync intro_starter.js). */
export const INTRO_ROCK_AHEAD = Object.freeze({ dx: -1.75, dz: 0.15 });

export function introRockLookTarget(playerX, playerZ) {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerZ)) {
    return {
      x: INTRO_SPAWN_CLUSTER.cx + INTRO_ROCK_AHEAD.dx,
      z: INTRO_SPAWN_CLUSTER.cz + INTRO_ROCK_AHEAD.dz,
    };
  }
  return {
    x: Math.round((playerX + INTRO_ROCK_AHEAD.dx) * 10) / 10,
    z: Math.round((playerZ + INTRO_ROCK_AHEAD.dz) * 10) / 10,
  };
}

/** Cible secondaire (empreintes / piste). */
export function introFootprintLookTarget() {
  return { x: INTRO_ZONE_FOOTPRINTS.x - 2.0, z: INTRO_ZONE_FOOTPRINTS.z + 0.3 };
}

/** Veilleuse — milieu de parcours (~11 m après empreintes). Fallback si décor absent. */
export const INTRO_ZONE_CAMPFIRE = Object.freeze({ x: 252.0, z: -7.6, r: 7 });
export const INTRO_CAMPFIRE_PICKUP_RADIUS = 5;

/**
 * Zone feu intro — position du décor `spawn_beach_campfire_ring` (admin move OK).
 * @param {Iterable<{ prefabId?: string, placementKey?: string, x?: number, z?: number, scale?: number }>} [decorList]
 */
export function resolveIntroCampfireZone(decorList) {
  if (!decorList) return { ...INTRO_ZONE_CAMPFIRE };
  let anyRing = null;
  for (const decor of decorList) {
    if (decor?.prefabId !== 'spawn_beach_campfire_ring') continue;
    if (!Number.isFinite(decor.x) || !Number.isFinite(decor.z)) continue;
    const scale = Number.isFinite(decor.scale) ? decor.scale : 1;
    const zone = {
      x: decor.x,
      z: decor.z,
      r: Math.max(INTRO_ZONE_CAMPFIRE.r, INTRO_ZONE_CAMPFIRE.r * scale * 0.85),
    };
    if (decor.placementKey === BEACH_INTRO_CAMPFIRE_KEY) return zone;
    if (!anyRing) anyRing = zone;
  }
  return anyRing ? { ...anyRing } : { ...INTRO_ZONE_CAMPFIRE };
}

/** Proximité veilleuse (centre décor ou zone beat). */
export function inIntroCampfirePickupZone(px, pz, zone) {
  const z = zone || INTRO_ZONE_CAMPFIRE;
  if (!Number.isFinite(px) || !Number.isFinite(pz)) return false;
  if (inBeatZone(px, pz, z)) return true;
  const pickupR = Math.max(INTRO_CAMPFIRE_PICKUP_RADIUS, (z.r || INTRO_ZONE_CAMPFIRE.r) * 0.72);
  return Math.hypot(px - z.x, pz - z.z) <= pickupR;
}

/** Épave ponton — bouche du sentier (~7 m après veilleuse). */
export const INTRO_ZONE_PIER = Object.freeze({ x: 243.5, z: -6.8, r: 7 });

/** Zone d'approche panneau sortie plage (avant lecture). */
export const BEACH_EXIT_APPROACH_ZONE = Object.freeze({ x: 243.8, z: -10.8, r: 7 });

export const BEACH_INTRO_WORLD_PROPS = Object.freeze([
  {
    prefabId: 'spawn_beach_offshore_wreck',
    x: BEACH_OFFSHORE_WRECK.x,
    z: BEACH_OFFSHORE_WRECK.z,
    y: BEACH_OFFSHORE_WRECK.y,
    rotY: BEACH_OFFSHORE_WRECK.rotY,
    rotZ: BEACH_OFFSHORE_WRECK.rotZ,
    scale: 2.56,
    groundLift: 0,
    grounded: false,
    collide: false,
    placementKey: BEACH_INTRO_OFFSHORE_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_footprint_trail',
    x: 269.0,
    z: -8.0,
    rotY: -2.35,
    scale: 1,
    groundLift: -0.012,
    placementKey: BEACH_INTRO_FOOTPRINTS_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_message_bottle',
    x: 260.0,
    z: -10.2,
    rotY: 0.55,
    scale: 1,
    groundLift: -0.008,
    placementKey: BEACH_INTRO_BOTTLE_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    signKind: 'intro_bottle_k',
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_campfire_ring',
    x: 252.0,
    z: -7.6,
    rotY: 0.1,
    scale: 1.35,
    groundLift: -0.01,
    placementKey: BEACH_INTRO_CAMPFIRE_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_marker_right',
    x: 264.0,
    z: -8.6,
    rotY: 1.57,
    scale: 1,
    groundLift: 0,
    placementKey: BEACH_INTRO_MARKER_MID_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_beach_pier_wreck',
    x: 243.5,
    z: -6.8,
    rotY: 0.42,
    scale: 1.5,
    groundLift: -0.022,
    placementKey: BEACH_INTRO_PIER_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
  {
    prefabId: 'spawn_marker_right',
    x: 244.5,
    z: -7.1,
    rotY: 1.57,
    scale: 1,
    groundLift: 0,
    placementKey: BEACH_INTRO_MARKER_PIER_KEY,
    zoneId: BEACH_INTRO_ZONE_ID,
    immutable: true,
  },
]);

/** Positions monde des spawns personnels (léger offset MP par slot joueur). */
export const INTRO_PERSONAL_WORLD = Object.freeze({
  rock: {
    x: INTRO_SPAWN_CLUSTER.cx + INTRO_ROCK_AHEAD.dx,
    z: INTRO_SPAWN_CLUSTER.cz + INTRO_ROCK_AHEAD.dz,
  },
  /** Torche ramassable — centre du cercle de pierres (veilleuse). */
  torch: { x: 252.0, z: -7.6 },
  burnt_note: { x: 244.8, z: -8.9 },
  /** Sous l'épave de jetée — visible depuis le ponton décor. */
  suitcase: { x: 243.2, z: -7.0 },
});

export function computeBeachIntroPlacements() {
  return BEACH_INTRO_WORLD_PROPS.map((p) => ({ ...p }));
}

export function introPersonalSlotOffset(playerId) {
  const n = Number(playerId);
  const slot = Number.isFinite(n) ? Math.abs(Math.floor(n)) % 5 : 0;
  return { dx: (slot - 2) * 0.32, dz: (slot % 3 - 1) * 0.22 };
}

export function introPersonalPosition(kind, playerId) {
  const base = INTRO_PERSONAL_WORLD[kind];
  if (!base) return null;
  const o = introPersonalSlotOffset(playerId);
  return {
    x: Math.round((base.x + o.dx) * 10) / 10,
    z: Math.round((base.z + o.dz) * 10) / 10,
  };
}

/** Caillou intro — devant le joueur sur la plage, ou vers la piste si respawn loin. */
export function introPersonalRockPosition(playerX, playerZ, playerId) {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerZ)) {
    return introPersonalPosition('rock', playerId);
  }
  const clusterReach = Math.hypot(INTRO_SPAWN_CLUSTER.rx, INTRO_SPAWN_CLUSTER.rz) + 10;
  if (Math.hypot(playerX - INTRO_SPAWN_CLUSTER.cx, playerZ - INTRO_SPAWN_CLUSTER.cz) <= clusterReach) {
    return introRockLookTarget(playerX, playerZ);
  }
  const look = introFootprintLookTarget();
  const dx = look.x - playerX;
  const dz = look.z - playerZ;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: Math.round((playerX + (dx / len) * 3.2) * 10) / 10,
    z: Math.round((playerZ + (dz / len) * 3.2) * 10) / 10,
  };
}

export function isBeachIntroPlacementValid(p) {
  if (!p?.prefabId || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (p.prefabId === 'spawn_beach_offshore_wreck') {
    return isOnBeachOffshoreWater(p.x, p.z);
  }
  if (!isOnBeachSafeSand(p.x, p.z)) return false;
  const { cx, cz } = INTRO_SPAWN_CLUSTER;
  if (Math.hypot(p.x - cx, p.z - cz) < 10) return false;
  const [tx, tz] = BEACH_TRAIL_PTS[0];
  const trailPad = p.prefabId === 'spawn_beach_pier_wreck' ? 1.2 : 2.5;
  if (Math.hypot(p.x - tx, p.z - tz) < trailPad) return false;
  return true;
}

export function inBeatZone(px, pz, zone) {
  if (!zone || !Number.isFinite(px) || !Number.isFinite(pz)) return false;
  return Math.hypot(px - zone.x, pz - zone.z) <= zone.r;
}

export function inBeachExitApproachZone(px, pz) {
  return inBeatZone(px, pz, BEACH_EXIT_APPROACH_ZONE);
}

/** Distances entre les étapes principales du parcours (empreintes → bouteille → feu → ponton). */
export function introPathStageDistances() {
  const pts = [
    INTRO_ZONE_FOOTPRINTS,
    { x: 260.0, z: -10.2 },
    INTRO_ZONE_CAMPFIRE,
    INTRO_ZONE_PIER,
  ];
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    out.push(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  }
  return out;
}
