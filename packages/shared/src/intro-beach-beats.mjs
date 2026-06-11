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
