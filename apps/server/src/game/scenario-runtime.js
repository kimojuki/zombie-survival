'use strict';

/**
 * Lazy init — groups, intro beats plage, scénario beach (factory différée).
 */
function createScenarioRuntime(deps) {
  const {
    io,
    log,
    groupsModPromise,
    introBeachBeatsModPromise,
    scenarioBeachModPromise,
    getPlayers,
    getZombies,
    getItems,
    getDecorItems,
    worldPersist,
    normPlayerId,
    makeZombie,
    compactZombiesForSync,
    addGroundItem,
    removeGroundItem,
    makeDecorItem,
    removeDecorItem,
    addStackToInv,
    emitInvAuth,
    getNextItemId,
    snapIntroPlayerToCluster,
    clearIntroInventory,
  } = deps;

  let groupsManager = null;
  let introBeachBeats = null;
  let scenarioBeach = null;

  async function getGroupsManager() {
    if (groupsManager) return groupsManager;
    const { createGroupsManager } = await groupsModPromise;
    groupsManager = createGroupsManager({
      io,
      players: getPlayers(),
      log,
      normPlayerId,
    });
    return groupsManager;
  }

  async function getIntroBeachBeats() {
    if (introBeachBeats) return introBeachBeats;
    const { createIntroBeachBeats } = await introBeachBeatsModPromise;
    introBeachBeats = createIntroBeachBeats({
      items: getItems(),
      decorItems: getDecorItems(),
      addGroundItem,
      removeGroundItem,
      addDecorItem: (d) => {
        const item = makeDecorItem({ ...d, createdBy: 'intro' });
        io.emit('decor-item-spawn', item);
        return item;
      },
      removeDecorItem: (id) => removeDecorItem(id, { emit: true, force: true }),
      introDecorId: (playerId, kind) => `intro_${normPlayerId(playerId)}_${kind}`,
      normPlayerId,
      nextItemId: getNextItemId,
      notifyPlayer: (socket, payload) => { if (payload) socket.emit('scenario-update', payload); },
      log,
      addStackToInv,
      emitInvAuth,
    });
    return introBeachBeats;
  }

  async function getScenarioBeach() {
    if (scenarioBeach) return scenarioBeach;
    const beatsMod = await getIntroBeachBeats();
    const { createScenarioBeach } = await scenarioBeachModPromise;
    scenarioBeach = createScenarioBeach({
      zombies: getZombies(),
      players: getPlayers(),
      makeZombie,
      compactZombiesForSync,
      addGroundItem,
      getNextItemId,
      worldPersist,
      log,
      normPlayerId,
      ensureIntroBeats: (p, socket) => beatsMod.ensure(p, socket),
      snapIntroPlayerToCluster,
      introBeatsTick: (p, socket) => beatsMod.tick(p, socket),
      clearIntroInventory,
      emitInvAuth,
    });
    return scenarioBeach;
  }

  return {
    getGroupsManager,
    getIntroBeachBeats,
    getScenarioBeach,
  };
}

module.exports = { createScenarioRuntime };
