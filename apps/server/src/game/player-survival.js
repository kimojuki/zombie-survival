'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const ITEM_EFFECTS_URL = pathToFileURL(
  path.join(__dirname, '../../../../packages/shared/src/item-effects.mjs'),
).href;
const itemEffectsModPromise = import(ITEM_EFFECTS_URL);
let _itemFxMod = null;
itemEffectsModPromise.then((m) => { _itemFxMod = m; }).catch(() => {});

/**
 * Broadcast survie (dedup snap) + sync armure équipée (item-effects).
 */
function createPlayerSurvival(deps) {
  const { normalizeInv } = deps;

  function emitSurvivalUpdate(socket, p) {
    const sv = p.survival || {};
    const snap = {
      f: Math.floor(sv.faim ?? 80),
      s: Math.floor(sv.soif ?? 80),
      i: Math.floor(sv.infection ?? 0),
      b: !!sv.saignement,
      e: Math.floor(sv.endurance ?? 100),
      h: Math.floor(p.health ?? 100),
    };
    const prev = p._svBroadcastSnap;
    p._svBroadcastSnap = snap;
    if (prev && prev.f === snap.f && prev.s === snap.s && prev.i === snap.i
      && prev.b === snap.b && prev.e === snap.e && prev.h === snap.h) {
      return;
    }
    socket.emit('survival-update', {
      faim: sv.faim ?? 80,
      soif: sv.soif ?? 80,
      infection: sv.infection ?? 0,
      saignement: !!sv.saignement,
      infectionPausedUntil: sv.infectionPausedUntil || 0,
      endurance: sv.endurance ?? 100,
      health: p.health,
    });
  }

  async function getItemFx() {
    return _itemFxMod || itemEffectsModPromise;
  }

  function maybeSyncEquipArmor(p, prevArmor, itemFx) {
    const newArmor = itemFx.getArmorFromInv(p.inv, normalizeInv);
    itemFx.syncArmorHealth(p, prevArmor, newArmor);
    return prevArmor !== newArmor;
  }

  return {
    emitSurvivalUpdate,
    getItemFx,
    maybeSyncEquipArmor,
    itemEffectsModPromise,
    getItemFxMod: () => _itemFxMod,
  };
}

module.exports = { createPlayerSurvival };
