'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

/**
 * Imports ESM dynamiques (packages/shared + modules serveur).
 */
function createSharedModImports(serverDir) {
  const sharedDir = path.join(serverDir, '../../packages/shared/src');
  const srcDir = path.join(serverDir, 'src');

  const urls = {
    S01_BUILD_EXCLUSIONS_URL: pathToFileURL(path.join(sharedDir, 's01-build-exclusions.mjs')).href,
    S01_SAFE_ZONES_URL: pathToFileURL(path.join(sharedDir, 's01-safe-zones.mjs')).href,
    TREE_WOOD_URL: pathToFileURL(path.join(sharedDir, 'tree-wood.mjs')).href,
    ROCK_STONE_URL: pathToFileURL(path.join(sharedDir, 'rock-stone.mjs')).href,
    BUILD_DAMAGE_URL: pathToFileURL(path.join(sharedDir, 'build-damage.mjs')).href,
    CRAFT_RECIPES_URL: pathToFileURL(path.join(sharedDir, 'craft-recipes.mjs')).href,
    WEAPON_STATS_URL: pathToFileURL(path.join(sharedDir, 'weapon-stats.mjs')).href,
    RESOURCE_REGEN_URL: pathToFileURL(path.join(srcDir, 'resource-regen.mjs')).href,
    SCENARIO_BEACH_URL: pathToFileURL(path.join(srcDir, 'scenario-beach.mjs')).href,
    INTRO_BEACH_BEATS_URL: pathToFileURL(path.join(srcDir, 'intro-beach-beats.mjs')).href,
    INTRO_BEATS_SHARED_URL: pathToFileURL(path.join(sharedDir, 'intro-beach-beats.mjs')).href,
    GROUPS_URL: pathToFileURL(path.join(srcDir, 'groups.mjs')).href,
    COMBAT_URL: pathToFileURL(path.join(sharedDir, 'combat.mjs')).href,
    SURVIVAL_URL: pathToFileURL(path.join(sharedDir, 'survival.mjs')).href,
    BED_SLEEP_URL: pathToFileURL(path.join(sharedDir, 'bed-sleep.mjs')).href,
    BEACH_SPAWN_URL: pathToFileURL(path.join(sharedDir, 'beach-spawn.mjs')).href,
    SECTOR_BOUNDS_URL: pathToFileURL(path.join(sharedDir, 'sector-bounds.mjs')).href,
  };

  let combatMod = null;
  let survivalMod = null;
  let beachSpawnMod = null;
  let s01BuildMod = null;
  let s01SafeMod = null;
  let sectorBoundsMod = null;
  let weaponStatsMod = null;

  const combatModPromise = import(urls.COMBAT_URL).then((m) => { combatMod = m; return m; });
  const survivalModPromise = import(urls.SURVIVAL_URL).then((m) => { survivalMod = m; return m; });
  const bedSleepModPromise = import(urls.BED_SLEEP_URL);
  const beachSpawnModPromise = import(urls.BEACH_SPAWN_URL).then((m) => { beachSpawnMod = m; return m; });
  const s01BuildModPromise = import(urls.S01_BUILD_EXCLUSIONS_URL).then((m) => { s01BuildMod = m; return m; });
  const s01SafeModPromise = import(urls.S01_SAFE_ZONES_URL).then((m) => { s01SafeMod = m; return m; });
  const sectorBoundsModPromise = import(urls.SECTOR_BOUNDS_URL).then((m) => { sectorBoundsMod = m; return m; });
  const buildDamageModPromise = import(urls.BUILD_DAMAGE_URL);
  const craftRecipesModPromise = import(urls.CRAFT_RECIPES_URL);
  const weaponStatsModPromise = import(urls.WEAPON_STATS_URL);
  weaponStatsModPromise.then((m) => { weaponStatsMod = m; }).catch(() => {});

  const scenarioBeachModPromise = import(urls.SCENARIO_BEACH_URL);
  const introBeachBeatsModPromise = import(urls.INTRO_BEACH_BEATS_URL);
  const groupsModPromise = import(urls.GROUPS_URL);

  return {
    urls,
    combatModPromise,
    survivalModPromise,
    bedSleepModPromise,
    beachSpawnModPromise,
    s01BuildModPromise,
    s01SafeModPromise,
    sectorBoundsModPromise,
    buildDamageModPromise,
    craftRecipesModPromise,
    weaponStatsModPromise,
    scenarioBeachModPromise,
    introBeachBeatsModPromise,
    groupsModPromise,
    getCombatMod: () => combatMod,
    getSurvivalMod: () => survivalMod,
    getBeachSpawnMod: () => beachSpawnMod,
    getS01BuildMod: () => s01BuildMod,
    getS01SafeMod: () => s01SafeMod,
    getSectorBoundsMod: () => sectorBoundsMod,
    getWeaponStatsMod: () => weaponStatsMod,
  };
}

module.exports = { createSharedModImports };
