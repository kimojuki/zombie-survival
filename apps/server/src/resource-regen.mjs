'use strict';

import { clampGrowthPhase, getTreeScale, getTreeWoodForPhase, nextGrowthDueAt, TREE_GROWTH_MAX_PHASE, GROWTH_PHASE_MS } from '../../../packages/shared/src/tree-growth.mjs';
import {
  REGEN_CONFIG,
  findRandomTreeSpawn,
  findRandomRockSpawn,
  countStandingTrees,
  countWorldRocks,
} from '../../../packages/shared/src/resource-spawn.mjs';
import { getRockStoneMax } from '../../../packages/shared/src/rock-stone.mjs';

/**
 * Repousse progressive arbres (croissance + spawn) et rochers (spawn adulte).
 */
export function createResourceRegen(ctx) {
  let lastTreeSpawnTick = 0;
  let lastRockSpawnTick = 0;

  function _decorList() {
    return Array.from(ctx.decorItems?.values?.() || []);
  }

  function tickTreeGrowth(now = Date.now()) {
    if (!ctx.io) return 0;
    let advanced = 0;
    for (const item of ctx.decorItems.values()) {
      if (!item.prefabId?.startsWith('tree_') || item.falling) continue;
      const phase = clampGrowthPhase(item.growthPhase ?? TREE_GROWTH_MAX_PHASE);
      if (phase >= TREE_GROWTH_MAX_PHASE) continue;
      const plantedAt = item.plantedAt ?? item.createdAt ?? now;
      if (now < nextGrowthDueAt(plantedAt, phase)) continue;
      item.growthPhase = phase + 1;
      item.plantedAt = plantedAt;
      item.woodMax = getTreeWoodForPhase(item.prefabId, item.growthPhase);
      item.woodRemaining = item.woodMax;
      ctx.io.emit('decor-tree-grow', {
        id: item.id,
        growthPhase: item.growthPhase,
        woodMax: item.woodMax,
        woodRemaining: item.woodRemaining,
        treeScale: getTreeScale(item.growthPhase),
      });
      ctx.persistDecorUpsert?.(item);
      advanced++;
    }
    return advanced;
  }

  function tickTreeSpawn(now = Date.now()) {
    if (now - lastTreeSpawnTick < REGEN_CONFIG.treeIntervalMs) return 0;
    lastTreeSpawnTick = now;
    const decors = _decorList();
    const standing = countStandingTrees(decors);
    const need = REGEN_CONFIG.treeTargetStanding - standing;
    if (need <= 0) return 0;
    const batch = Math.min(REGEN_CONFIG.treesPerTick, need);
    let added = 0;
    for (let i = 0; i < batch; i++) {
      const spot = findRandomTreeSpawn(decors, now + i * 9973);
      if (!spot) break;
      const startPhase = clampGrowthPhase(REGEN_CONFIG.regenTreeStartPhase ?? 0);
      const woodMax = getTreeWoodForPhase(spot.prefabId, startPhase);
      const item = ctx.makeDecorItem({
        ...spot,
        growthPhase: startPhase,
        plantedAt: now - startPhase * GROWTH_PHASE_MS,
        woodMax,
        woodRemaining: woodMax,
        treeScale: getTreeScale(startPhase),
      });
      decors.push(item);
      ctx.io.emit('decor-item-spawn', item);
      added++;
    }
    if (added) ctx.log?.info?.('regen', 'trees spawned', { added, standing: standing + added });
    return added;
  }

  function tickRockSpawn(now = Date.now()) {
    if (now - lastRockSpawnTick < REGEN_CONFIG.rockIntervalMs) return 0;
    lastRockSpawnTick = now;
    const decors = _decorList();
    const count = countWorldRocks(decors);
    const need = REGEN_CONFIG.rockTargetWorld - count;
    if (need <= 0) return 0;
    const batch = Math.min(REGEN_CONFIG.rocksPerTick, need);
    let added = 0;
    for (let i = 0; i < batch; i++) {
      const spot = findRandomRockSpawn(decors, now + i * 12007);
      if (!spot) break;
      const stoneMax = getRockStoneMax(spot.prefabId);
      const item = ctx.makeDecorItem({
        ...spot,
        stoneMax,
        stoneRemaining: stoneMax,
      });
      decors.push(item);
      ctx.io.emit('decor-item-spawn', item);
      added++;
    }
    if (added) ctx.log?.info?.('regen', 'rocks spawned', { added, count: count + added });
    return added;
  }

  function tick(now = Date.now()) {
    tickTreeGrowth(now);
    tickTreeSpawn(now);
    tickRockSpawn(now);
  }

  return { tick, tickTreeGrowth, tickTreeSpawn, tickRockSpawn };
}
