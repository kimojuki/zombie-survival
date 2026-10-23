/**
 * POI carte admin — positions précises (live serveur > seed > design placeholder).
 */

import { computeBeachSignPlacements } from './beach-sign-placements.mjs';
import { S01_BUILD_EXCLUSION_POIS } from './s01-poi.mjs';
import { computeS01DecorPlacements } from './s01-world-placements.mjs';

const POI_BUILDING_PREFIXES = ['building_', 'smallcity_', 's01_'];
const POI_SIGN_PREFIXES = ['sign_', 'beach_'];
const POI_STORAGE_IDS = new Set(['storage_chest']);

/** Décor procédural — jamais en couche POI (sinon spam + ignore les filtres). */
function _isMapNoiseDecor(d) {
  const pid = d.prefabId || '';
  if (!pid) return true;
  if (pid.startsWith('tree_')) return true;
  if (pid.startsWith('rock_') || pid === 'spawn_stone' || pid === 'spawn_flat_stone') return true;
  if (pid.startsWith('road_barrier_')) return true;
  if (pid.startsWith('spawn_')) return true;
  return false;
}

function _round2(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : n;
}

function _poiLabelFromDecor(d) {
  const pid = d.prefabId || '';
  const key = d.placementKey || '';
  if (pid === 'building_survivor_shack' && key.includes('cabin01')) return 'Cabane #1';
  if (pid === 'storage_chest' && key.includes('chest')) return 'Coffre cabane #1';
  if (pid === 'spawn_bedroll' && key.includes('bedroll')) return 'Sac de couchage cabane #1';
  if (pid === 'spawn_single_bed' && key.includes('cabin01:bed')) return 'Lit cabane #1';
  if (pid === 's01_gas_station') return 'Station-service S01';
  if (pid === 'sign_sector_gate') return 'Panneau portail';
  if (pid === 'sign_beach_exit') return 'Panneau sortie plage';
  if (pid === 'beach_exit_torch') return 'Torche sortie plage';
  return pid || key || d.id;
}

function _poiCategoryFromDecor(d) {
  const pid = d.prefabId || '';
  if (POI_STORAGE_IDS.has(pid)) return 'storage';
  if (pid === 'spawn_bedroll' || pid === 'spawn_lean_to' || pid === 'spawn_single_bed') return 'camp';
  if (POI_SIGN_PREFIXES.some((p) => pid.startsWith(p))) return 'sign';
  if (POI_BUILDING_PREFIXES.some((p) => pid.startsWith(p))) return 'building';
  if (d.placementKey) return 'poi-live';
  return 'poi-live';
}

function _isMapPoiDecor(d) {
  const pid = d.prefabId || '';
  if (!pid || _isMapNoiseDecor(d)) return false;
  if (POI_BUILDING_PREFIXES.some((p) => pid.startsWith(p))) return true;
  if (POI_SIGN_PREFIXES.some((p) => pid.startsWith(p))) return true;
  if (POI_STORAGE_IDS.has(pid) && (d.placementKey || d.shackAnchor || d.anchorId)) return true;
  if ((pid === 'spawn_bedroll' || pid === 'spawn_lean_to') && d.placementKey) return true;
  if (pid === 'spawn_single_bed' && d.placementKey) return true;
  if (pid.startsWith('wreck_')) return !!d.placementKey;
  return false;
}

/** Seeds carte admin — S01 + signalisation plage (+ futurs packs). */
export function computeAdminMapSeedPlacements() {
  return [
    ...computeS01DecorPlacements(),
    ...computeBeachSignPlacements(),
  ];
}

/**
 * @param {object} opts
 * @param {Array<object>} opts.decor — marqueurs live (_adminDecorMarker)
 * @param {Array<object>} [opts.seedPlacements] — computeS01DecorPlacements()
 * @param {Array<object>} [opts.designLandmarks] — placeholders design (optionnel)
 */
export function buildAdminMapPois({ decor = [], seedPlacements = [], designLandmarks = [] }) {
  const pois = [];
  const byKey = new Map();

  for (const d of decor) {
    if (!_isMapPoiDecor(d)) continue;
    const key = d.placementKey || `decor:${d.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, true);
    pois.push({
      id: key,
      label: _poiLabelFromDecor(d),
      category: _poiCategoryFromDecor(d),
      x: _round2(d.x),
      z: _round2(d.z),
      rotY: d.rotY,
      prefabId: d.prefabId,
      decorId: d.id,
      placementKey: d.placementKey || null,
      immutable: !!d.immutable,
      precise: true,
      source: 'live',
    });
  }

  for (const p of seedPlacements) {
    const key = p.placementKey;
    if (!key || byKey.has(key)) continue;
    byKey.set(key, true);
    pois.push({
      id: key,
      label: _poiLabelFromDecor(p),
      category: _poiCategoryFromDecor(p),
      x: _round2(p.x),
      z: _round2(p.z),
      rotY: p.rotY,
      prefabId: p.prefabId,
      placementKey: key,
      precise: true,
      source: 'seed',
    });
  }

  for (const p of designLandmarks) {
    if (p.placeholder !== true) continue;
    const id = p.id || `design:${p.label}`;
    if (byKey.has(id)) continue;
    pois.push({
      id,
      label: p.label,
      category: 'poi-design',
      x: _round2(p.x),
      z: _round2(p.z),
      note: p.note,
      placeholder: true,
      precise: false,
      source: 'design',
    });
  }

  for (const p of S01_BUILD_EXCLUSION_POIS) {
    pois.push({
      id: `exclusion_${p.id}`,
      label: `Exclusion build — ${p.id}`,
      category: 'exclusion',
      x: _round2(p.x),
      z: _round2(p.z),
      r: p.r,
      precise: true,
      source: 'exclusion',
    });
  }

  return pois;
}
