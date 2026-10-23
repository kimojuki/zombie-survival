'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { createWorldLoops } = require('./game/world-loops');
const { createWorldBoot } = require('./game/world-boot');

const SPATIAL_GRID_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/spatial-grid.mjs'),
).href;

/**
 * Resource regen async, boucles temps réel, boot séquence serveur.
 */
function createServerRuntime(deps) {
  const { log, resourceRegenUrl, loops, boot } = deps;
  let resourceRegen = null;

  function startResourceRegen(io, decorItems, makeDecorItem, worldPersist) {
    import(resourceRegenUrl).then(({ createResourceRegen }) => {
      resourceRegen = createResourceRegen({
        io,
        decorItems,
        makeDecorItem,
        persistDecorUpsert: (item) => worldPersist.scheduleUpsertDecor(item),
        log,
      });
      log.info('boot', 'resource regen ready');
    }).catch((err) => log.error('boot', 'resource regen init failed', { err: err.message }));
  }

  const worldLoops = createWorldLoops({
    ...loops,
    SPATIAL_GRID_URL,
    resourceRegen: () => resourceRegen,
  });

  const worldBoot = createWorldBoot(boot);

  function startServer() {
    worldBoot.registerShutdownHandlers();
    return worldBoot.startServer().catch((err) => {
      log.error('boot', 'fatal startup error', { err: err?.message || String(err) });
      process.exit(1);
    });
  }

  return {
    worldLoops,
    worldBoot,
    playerVisibleZombies: worldLoops.playerVisibleZombies,
    rebuildPlayerSpatialGrid: (...args) => worldLoops.rebuildPlayerSpatialGrid(...args),
    broadcastPlayerMove: (...args) => worldLoops.broadcastPlayerMove(...args),
    startResourceRegen,
    startServer,
  };
}

module.exports = { createServerRuntime };
