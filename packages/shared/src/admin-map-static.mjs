/**
 * Données carte statiques pour l’admin (secteurs, routes, POI landmarks).
 */

import {
  MAP_WORLD,
  MAP_ROADS,
  SECTORS_ALL,
  SECTOR_01_GATES,
} from './sectors.mjs';
import {
  S01_CLEARING,
  S01_FOREST_HUB,
  S01_ABANDONED_CAMP,
  S01_CABIN_NORTH,
  S01_CABIN_SOUTH,
  S01_GAS_STATION,
  S01_BRIDGE,
} from './s01-poi.mjs';

/** Landmarks design (référence carte — pas les positions seed/live). */
export const ADMIN_MAP_DESIGN_LANDMARKS = Object.freeze([
  { id: 's01_clearing', label: 'Clairière spawn', ...S01_CLEARING, note: 'Camp de départ' },
  { id: 's01_forest_hub', label: 'Hub forêt', ...S01_FOREST_HUB },
  { id: 's01_abandoned_camp', label: 'Camp abandonné', ...S01_ABANDONED_CAMP },
  { id: 's01_cabin_north', label: 'Cabane nord (placeholder)', ...S01_CABIN_NORTH, placeholder: true },
  { id: 's01_cabin_south', label: 'Cabane sud (placeholder)', ...S01_CABIN_SOUTH, placeholder: true },
  { id: 's01_gas_station_poi', label: 'Station-service (design)', ...S01_GAS_STATION, placeholder: true },
  { id: 's01_bridge', label: 'Pont S01 (design)', ...S01_BRIDGE, placeholder: true },
]);

export function getAdminMapStaticData() {
  return {
    world: MAP_WORLD,
    sectors: SECTORS_ALL,
    roads: MAP_ROADS,
    gates: SECTOR_01_GATES,
    designLandmarks: ADMIN_MAP_DESIGN_LANDMARKS,
  };
}
