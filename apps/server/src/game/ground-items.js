'use strict';

const GROUND_ITEM_TTL_MS = 30 * 60 * 1000; // drops joueur / mort / zombie / coffre : 30 min

/**
 * Objets au sol — spawn, drop, expiration, sync clients.
 */
function createGroundItems(deps) {
  const {
    io,
    worldPersist,
    getItems,
    getPlayers,
    normPlayerId,
    getNextItemId,
    groundItemTtlMs = GROUND_ITEM_TTL_MS,
  } = deps;

  function emitGroundItemSpawn(item) {
    if (item?.introPersonal && item.ownerPlayerId != null) {
      const oid = normPlayerId(item.ownerPlayerId);
      for (const [sid, p] of getPlayers().entries()) {
        if (normPlayerId(p.id) === oid) io.to(sid).emit('item-spawn', item);
      }
      return;
    }
    io.emit('item-spawn', item);
  }

  function addGroundItem(drop) {
    if (!drop?.id) return null;
    const item = { ...drop };
    if (item.ownerPlayerId != null) {
      item.personalLoot = true;
      item.expiresAt = null;
    }
    // Loot de bâtiment (loot:true) : reste jusqu'au ramassage. Tout le reste : TTL.
    if (!item.loot && !item.personalLoot && item.expiresAt == null) {
      item.expiresAt = Date.now() + groundItemTtlMs;
    }
    const items = getItems();
    items.set(item.id, item);
    worldPersist.scheduleUpsertItem(item);
    emitGroundItemSpawn(item);
    return item;
  }

  function removeGroundItem(id, { emit = true } = {}) {
    const items = getItems();
    const item = items.get(id);
    if (!item) return false;
    items.delete(id);
    worldPersist.scheduleDeleteItem(id, item);
    if (emit) io.emit('item-remove', id);
    return true;
  }

  function dropWorldItem(type, qty, x, z, extra = {}) {
    const id = getNextItemId();
    return addGroundItem({ id, type, qty, x, z, ...extra });
  }

  function spawnChestOverflowDrop(type, qty, baseX, baseZ, extra, idx) {
    const a = (idx / Math.max(1, idx + 1)) * Math.PI * 2 + idx * 0.4;
    const r = 0.4 + (idx % 4) * 0.22;
    return dropWorldItem(
      type,
      Math.max(1, qty),
      baseX + Math.cos(a) * r,
      baseZ + Math.sin(a) * r,
      extra,
    );
  }

  function spawnWorldDrop(type, qty, x, z, extra = {}) {
    if (!type) return null;
    const id = getNextItemId();
    return addGroundItem({
      id,
      type,
      qty: Math.max(1, Math.min(999, Number(qty) || 1)),
      x,
      z,
      ...extra,
    });
  }

  return {
    GROUND_ITEM_TTL_MS: groundItemTtlMs,
    addGroundItem,
    removeGroundItem,
    dropWorldItem,
    spawnChestOverflowDrop,
    spawnWorldDrop,
  };
}

module.exports = { createGroundItems, GROUND_ITEM_TTL_MS };
