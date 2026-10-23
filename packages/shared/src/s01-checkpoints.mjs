/** Points de téléportation admin pour valider le secteur S01 en jeu. */

import { BEACH_SPAWN, BEACH_TRAIL_PTS } from './beach-spawn.mjs';
import { cabin01BedWorldXZ } from './s01-cabin01-bed.mjs';
import { S01_CABIN01_PROTO, S01_CLEARING } from './s01-poi.mjs';

const TRAIL_MOUTH = BEACH_TRAIL_PTS[0];
const TRAIL_END = BEACH_TRAIL_PTS[BEACH_TRAIL_PTS.length - 1];
const TRAIL_JONCTION = BEACH_TRAIL_PTS.find(([x, z]) => Math.abs(x - 85) < 0.01 && Math.abs(z + 6) < 0.01)
  || [85, -6];

/** Vue sentier — ~4 m à l'est du repère, face à la plage (fwd = -sin/cos rotY). */
const CABANE_VIEW = Object.freeze({ x: 169.1, z: 7.1 });
const _cabaneViewRotY = Math.atan2(
  -(S01_CABIN01_PROTO.x - CABANE_VIEW.x),
  -(S01_CABIN01_PROTO.z - CABANE_VIEW.z),
);

const _routeStart = TRAIL_JONCTION;
const _routeRotY = Math.atan2(
  S01_CABIN01_PROTO.x - _routeStart[0],
  S01_CABIN01_PROTO.z - _routeStart[1],
);
const _bedWorld = cabin01BedWorldXZ();

export const S01_CHECKPOINTS = Object.freeze({
  plage: {
    label: 'Spawn plage',
    x: BEACH_SPAWN.x,
    z: BEACH_SPAWN.z,
    rotY: BEACH_SPAWN.rotY,
  },
  sentier: {
    label: 'Bouche sentier (panneau + torche)',
    x: TRAIL_MOUTH[0],
    z: TRAIL_MOUTH[1],
    rotY: -Math.PI / 2,
  },
  cabane: {
    label: 'Vue sentier (regarder vers la cabane #1)',
    x: CABANE_VIEW.x,
    z: CABANE_VIEW.z,
    rotY: _cabaneViewRotY,
    note: `Point de vue — cabane @ (${S01_CABIN01_PROTO.x}, ${S01_CABIN01_PROTO.z})`,
  },
  repere: {
    label: 'Cabane #1 (emplacement exact)',
    x: S01_CABIN01_PROTO.x,
    z: S01_CABIN01_PROTO.z,
    rotY: S01_CABIN01_PROTO.rotY ?? 0.55,
    note: 'building_survivor_shack — porte interactive',
  },
  cabane_pied: {
    label: 'Cabane #1 (alias)',
    x: S01_CABIN01_PROTO.x,
    z: S01_CABIN01_PROTO.z,
    rotY: S01_CABIN01_PROTO.rotY ?? 0.55,
  },
  fin_sentier: {
    label: 'Fin du sentier forêt',
    x: TRAIL_END[0],
    z: TRAIL_END[1],
    rotY: 0.3,
  },
  route_cabane: {
    label: 'Jonction route terre → cabane #1',
    x: _routeStart[0],
    z: _routeStart[1],
    rotY: _routeRotY,
    note: 'Jonction sentier plage @ (85, -6) — route cabane via CMS admin',
  },
  lit_cabane: {
    label: 'Lit cabane #1 (E = repos)',
    x: _bedWorld.x + 0.9,
    z: _bedWorld.z - 1.1,
    rotY: _bedWorld.rotY + Math.PI * 0.85,
    note: 'spawn_single_bed — s01:cabin01:bed',
  },
  clairiere: {
    label: 'Clairière hub',
    x: S01_CLEARING.x,
    z: S01_CLEARING.z,
    rotY: 0.3,
    note: 'Hub camp — route cabane via outil admin routes',
  },
  route_clearing: {
    label: 'Clairière hub (alias)',
    x: S01_CLEARING.x,
    z: S01_CLEARING.z,
    rotY: 0.3,
    note: 'alias clairiere',
  },
});

const ALIASES = Object.freeze({
  beach: 'plage',
  spawn: 'plage',
  trail: 'sentier',
  mouth: 'sentier',
  cabin01: 'cabane',
  cabin: 'cabane',
  cabane1: 'cabane',
  shack: 'cabane',
  cabin_foot: 'cabane_pied',
  marker: 'repere',
  repere: 'repere',
  poteau: 'repere',
  trail_end: 'fin_sentier',
  end: 'fin_sentier',
  route: 'route_cabane',
  dirt: 'route_cabane',
  jonction_route: 'route_cabane',
  bed: 'lit_cabane',
  lit: 'lit_cabane',
  single_bed: 'lit_cabane',
  clearing: 'clairiere',
  hub: 'clairiere',
  camp: 'clairiere',
  route_clearing: 'clairiere',
});

export function resolveS01Checkpoint(rawId) {
  if (!rawId) return null;
  const key = String(rawId).toLowerCase();
  const id = ALIASES[key] || key;
  const cp = S01_CHECKPOINTS[id];
  if (!cp) return null;
  return { id, ...cp };
}

export function listS01Checkpoints() {
  return Object.entries(S01_CHECKPOINTS).map(([id, cp]) => ({ id, ...cp }));
}
