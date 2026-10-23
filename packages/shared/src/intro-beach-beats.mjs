/**
 * Intro plage v3 — beats narratifs (zones + lecture), remplace la chaîne starterLootStep.
 */

import {
  BEACH_EXIT_APPROACH_ZONE,
  INTRO_ZONE_CAMPFIRE,
  INTRO_ZONE_FOOTPRINTS,
  INTRO_ZONE_PIER,
  inBeatZone,
} from './beach-intro-placements.mjs';

export const INTRO_SUITCASE_CAPACITY = 4;

export const INTRO_READABLE_FOOTPRINTS = 'intro_bottle_k';
export const INTRO_READABLE_CAMPFIRE = 'intro_burnt_note_k';

export function defaultIntroBeats() {
  return {
    footprints: false,
    campfire: false,
    pier: false,
    kitDone: false,
    pickedRock: false,
    pickedTorch: false,
  };
}

export function isIntroKitDone(beats) {
  return !!beats?.kitDone;
}

/** Loot / décor intro personnel — visible uniquement pour le propriétaire. */
export function introPersonalVisibleTo(entry, viewerPlayerId) {
  if (!entry?.introPersonal) return true;
  if (entry.ownerPlayerId == null || viewerPlayerId == null) return false;
  return Number(entry.ownerPlayerId) === Number(viewerPlayerId);
}

/** Pas de kit magique eau/sandwich tant que la valise intro n'est pas vidée. */
export function blocksStarterRationsDuringIntro(scenario) {
  const sc = scenario || {};
  if (sc.completed || sc.step === 'act1_done') return false;
  return !isIntroKitDone(migrateIntroBeats(sc));
}

export function migrateIntroBeats(scenario) {
  if (!scenario || typeof scenario !== 'object') return defaultIntroBeats();
  if (scenario.introBeats && typeof scenario.introBeats === 'object') {
    const b = scenario.introBeats;
    return {
      footprints: !!b.footprints,
      campfire: !!b.campfire,
      pier: !!b.pier,
      kitDone: !!b.kitDone,
      pickedRock: !!b.pickedRock,
      pickedTorch: !!b.pickedTorch,
    };
  }
  // Migration v2 starterLootStep
  const step = Number(scenario.starterLootStep);
  if (Number.isFinite(step) && step >= 3) {
    return { footprints: true, campfire: true, pier: true, kitDone: true, pickedRock: true, pickedTorch: true };
  }
  if (step >= 2) return { footprints: true, campfire: true, pier: false, kitDone: false, pickedRock: true, pickedTorch: true };
  if (step >= 1) return { footprints: true, campfire: false, pier: false, kitDone: false, pickedRock: true, pickedTorch: false };
  return defaultIntroBeats();
}

/** @returns {boolean} joueur possède déjà un objet intro dans l'inventaire. */
export function playerOwnsIntroItem(inv, type) {
  if (!inv || typeof inv !== 'object' || !type) return false;
  if (inv.equip?.[0]?.type === type) return true;
  for (const slot of inv.hotbar || []) {
    if (slot?.type === type) return true;
  }
  for (const slot of inv.bag || []) {
    if (slot?.type === type) return true;
  }
  return false;
}

/** Progression intro déjà commencée (beats, loot ramassé ou inventaire). */
export function hasIntroSessionProgress(scenario, inv) {
  const beats = migrateIntroBeats(scenario);
  if (beats.footprints || beats.campfire || beats.pier || beats.kitDone) return true;
  if (beats.pickedRock || beats.pickedTorch) return true;
  if (playerOwnsIntroItem(inv, 'tool_caillou') || playerOwnsIntroItem(inv, 'tool_torche')) return true;
  return false;
}

/** Réinitialiser l'inventaire au connect — uniquement si intro vierge. */
export function shouldResetIntroInventoryOnConnect(scenario, inv) {
  const sc = scenario || {};
  if (sc.completed || sc.step === 'act1_done') return false;
  return !hasIntroSessionProgress(sc, inv);
}

function _stripTypeFromSlots(slots, type, changedRef) {
  if (!Array.isArray(slots)) return;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s?.type) continue;
    if (typeof type === 'string' ? s.type === type : type(s)) {
      slots[i] = null;
      changedRef.changed = true;
    }
  }
}

/** Retire le kit magique legacy (hotbar) tant que le kit valise n'est pas fini. */
export function stripLegacyIntroKit(inv, scenario) {
  if (!inv || typeof inv !== 'object') return false;
  const sc = scenario || {};
  if (sc.completed || sc.step === 'act1_done') return false;
  const beats = migrateIntroBeats(sc);
  if (isIntroKitDone(beats)) return false;
  const changedRef = { changed: false };
  const isFood = (s) => s.type.startsWith('food_');
  _stripTypeFromSlots(inv.hotbar, isFood, changedRef);
  if (Array.isArray(inv.bag) && inv.bag.length) {
    const next = inv.bag.filter((s) => !s?.type || !s.type.startsWith('food_'));
    if (next.length !== inv.bag.length) changedRef.changed = true;
    inv.bag = next;
  }
  if (!beats.pickedRock) _stripTypeFromSlots(inv.hotbar, 'tool_caillou', changedRef);
  if (!beats.pickedTorch) _stripTypeFromSlots(inv.hotbar, 'tool_torche', changedRef);
  if (inv.bag?.length) {
    if (!beats.pickedRock) {
      const next = inv.bag.filter((s) => s?.type !== 'tool_caillou');
      if (next.length !== inv.bag.length) changedRef.changed = true;
      inv.bag = next;
    }
    if (!beats.pickedTorch) {
      const next = inv.bag.filter((s) => s?.type !== 'tool_torche');
      if (next.length !== inv.bag.length) changedRef.changed = true;
      inv.bag = next;
    }
  }
  if (inv.equip && typeof inv.equip === 'object') {
    for (const slot of Object.keys(inv.equip)) {
      const s = inv.equip[slot];
      if (!s?.type) continue;
      if (s.type.startsWith('food_')) {
        inv.equip[slot] = null;
        changedRef.changed = true;
        continue;
      }
      if (!beats.pickedRock && s.type === 'tool_caillou') {
        inv.equip[slot] = null;
        changedRef.changed = true;
      }
      if (!beats.pickedTorch && s.type === 'tool_torche') {
        inv.equip[slot] = null;
        changedRef.changed = true;
      }
    }
  }
  return changedRef.changed;
}

/** @returns {'footprints'|'campfire'|'pier'|null} */
export function beatTriggeredByPosition(px, pz, beats, zoneOverrides = null) {
  const campfire = zoneOverrides?.campfire || INTRO_ZONE_CAMPFIRE;
  if (!beats?.footprints && inBeatZone(px, pz, INTRO_ZONE_FOOTPRINTS)) return 'footprints';
  if (beats?.footprints && !beats.campfire && inBeatZone(px, pz, campfire)) return 'campfire';
  if (beats?.campfire && !beats.pier && inBeatZone(px, pz, INTRO_ZONE_PIER)) return 'pier';
  return null;
}

/** @returns {'footprints'|'campfire'|null} */
export function beatTriggeredByReadable(signKind, beats) {
  if (!beats?.footprints && signKind === INTRO_READABLE_FOOTPRINTS) return 'footprints';
  if (beats?.footprints && !beats.campfire && signKind === INTRO_READABLE_CAMPFIRE) return 'campfire';
  return null;
}

export function inBeachExitApproachZone(px, pz) {
  return inBeatZone(px, pz, BEACH_EXIT_APPROACH_ZONE);
}
