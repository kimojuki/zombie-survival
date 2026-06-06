/** Croissance des arbres — phases, échelle visuelle et stock de bois. */

import { getTreeWoodMax } from './tree-wood.mjs';

/** Phase 0 = pousse … 4 = adulte (max). */
export const TREE_GROWTH_MAX_PHASE = 4;

/** Durée réelle entre deux phases de croissance (ms). */
export const GROWTH_PHASE_MS = 120_000;

export const TREE_SCALE_BY_PHASE = Object.freeze([0.14, 0.32, 0.52, 0.76, 1.0]);

export const TREE_WOOD_RATIO_BY_PHASE = Object.freeze([0.1, 0.28, 0.5, 0.78, 1.0]);

export function clampGrowthPhase(phase) {
  return Math.max(0, Math.min(TREE_GROWTH_MAX_PHASE, Math.floor(Number(phase) || 0)));
}

export function getTreeScale(phase) {
  return TREE_SCALE_BY_PHASE[clampGrowthPhase(phase)];
}

export function getTreeWoodForPhase(prefabId, phase) {
  const adult = getTreeWoodMax(prefabId);
  const ratio = TREE_WOOD_RATIO_BY_PHASE[clampGrowthPhase(phase)];
  return Math.max(1, Math.floor(adult * ratio));
}

export function isTreeAdult(phase) {
  return clampGrowthPhase(phase) >= TREE_GROWTH_MAX_PHASE;
}

/** Timestamp à partir duquel la phase courante peut avancer. */
export function nextGrowthDueAt(plantedAt, phase) {
  const p = clampGrowthPhase(phase);
  if (p >= TREE_GROWTH_MAX_PHASE) return Infinity;
  return Number(plantedAt) + (p + 1) * GROWTH_PHASE_MS;
}
