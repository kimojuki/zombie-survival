import {
  INTRO_READABLE_CAMPFIRE,
  INTRO_READABLE_FOOTPRINTS,
  INTRO_SUITCASE_CAPACITY,
  beatTriggeredByPosition,
  beatTriggeredByReadable,
  defaultIntroBeats,
  isIntroKitDone,
  playerOwnsIntroItem,
} from '../../../packages/shared/src/intro-beach-beats.mjs';
import {
  introPersonalPosition,
  introPersonalRockPosition,
  introRockLookTarget,
  inIntroCampfirePickupZone,
  resolveIntroCampfireZone,
} from '../../../packages/shared/src/beach-intro-placements.mjs';

const INTRO_BEAT_TOAST = Object.freeze({
  footprints: 'Suis les traces vers l\'ouest — une torche fume encore.',
  campfire: 'Torche à ramasser au centre du cercle de pierres.',
  pier: 'Valise sous l\'épave de bois — fouille-la (E).',
  pier_after_torch: 'L\'épave de jetée est plus loin à l\'ouest — la valise est dessous.',
});

const SUITCASE_LOOT = Object.freeze([
  { type: 'food_eau_bouteille', qty: 1 },
  { type: 'food_sandwich', qty: 1 },
]);

export function createIntroBeachBeats(ctx) {
  const {
    items,
    decorItems,
    addGroundItem,
    removeGroundItem,
    addDecorItem,
    removeDecorItem,
    introDecorId,
    normPlayerId,
    nextItemId,
    notifyPlayer,
    log,
    addStackToInv,
    emitInvAuth,
  } = ctx;

  function _beats(p) {
    const sc = p.inv?.scenario;
    if (!sc.introBeats) sc.introBeats = defaultIntroBeats();
    return sc.introBeats;
  }

  function _clearPersonal(playerId) {
    const pid = normPlayerId(playerId);
    for (const [id, item] of items.entries()) {
      if (!item?.introPersonal) continue;
      if (normPlayerId(item.ownerPlayerId) !== pid) continue;
      removeGroundItem(id);
    }
    for (const [id, decor] of decorItems.entries()) {
      if (!decor?.introPersonal) continue;
      if (normPlayerId(decor.ownerPlayerId) !== pid) continue;
      removeDecorItem(id);
    }
  }

  function _syncIntroLootFlags(p) {
    const beats = _beats(p);
    let changed = false;
    if (!beats.pickedRock && playerOwnsIntroItem(p.inv, 'tool_caillou')) {
      beats.pickedRock = true;
      changed = true;
    }
    if (!beats.pickedTorch && playerOwnsIntroItem(p.inv, 'tool_torche')) {
      beats.pickedTorch = true;
      changed = true;
    }
    if (changed) p.dirty = true;
  }

  function _shouldSpawnRock(p) {
    const beats = _beats(p);
    if (beats.pickedRock || playerOwnsIntroItem(p.inv, 'tool_caillou')) return false;
    if (_hasPersonalGround(p, 'tool_caillou')) return false;
    return true;
  }

  function _hasPersonalTorch(p) {
    if (_hasPersonalGround(p, 'tool_torche')) return true;
    return _hasPersonalDecor(p, 'spawn_beach_starter_torch');
  }

  function _shouldSpawnTorch(p) {
    const beats = _beats(p);
    if (beats.pickedTorch || playerOwnsIntroItem(p.inv, 'tool_torche')) return false;
    if (_hasPersonalTorch(p)) return false;
    return true;
  }

  function _restorePersonalForBeats(p, beats) {
    // Caillou de réveil — devant le joueur dès le connect (pas après la zone empreintes).
    if (_shouldSpawnRock(p)) _spawnRock(p);
    if (!beats?.footprints) return;
    if (!beats.campfire) return;
    if (!_hasPersonalDecor(p, 'spawn_beach_burnt_note')) {
      const notePos = introPersonalPosition('burnt_note', p.id);
      if (notePos) {
        addDecorItem({
          id: introDecorId(p.id, 'note'),
          prefabId: 'spawn_beach_burnt_note',
          x: notePos.x,
          z: notePos.z,
          rotY: 0.2,
          ownerPlayerId: normPlayerId(p.id),
          introPersonal: true,
          introBeat: 'campfire',
          signKind: 'intro_burnt_note_k',
          grounded: true,
        });
      }
    }
    if (!beats.pier || beats.kitDone) return;
    _spawnSuitcaseOnly(p);
  }

  function _spawnRock(p) {
    if (!_shouldSpawnRock(p)) return null;
    const pos = introPersonalRockPosition(p.x, p.z, p.id);
    if (!pos) return null;
    return addGroundItem({
      id: nextItemId(),
      type: 'tool_caillou',
      qty: 1,
      x: pos.x,
      z: pos.z,
      durability: 80,
      ownerPlayerId: normPlayerId(p.id),
      introPersonal: true,
      introBeat: 'wake',
    });
  }

  function _hasPersonalGround(p, type) {
    const pid = normPlayerId(p.id);
    for (const item of items.values()) {
      if (!item?.introPersonal || item.type !== type) continue;
      if (normPlayerId(item.ownerPlayerId) === pid) return true;
    }
    return false;
  }

  function _spawnTorchOnly(p) {
    if (_hasPersonalTorch(p)) return null;
    const torchPos = introPersonalPosition('torch', p.id);
    if (!torchPos) return null;
    return addDecorItem({
      id: introDecorId(p.id, 'torch'),
      prefabId: 'spawn_beach_starter_torch',
      x: torchPos.x,
      z: torchPos.z,
      rotY: 0.15,
      ownerPlayerId: normPlayerId(p.id),
      introPersonal: true,
      introBeat: 'campfire',
      interactRole: 'intro_torch',
      grounded: true,
    });
  }

  function _spawnCampfirePersonal(p) {
    const notePos = introPersonalPosition('burnt_note', p.id);
    const out = [];
    if (notePos) {
      out.push(addDecorItem({
        id: introDecorId(p.id, 'note'),
        prefabId: 'spawn_beach_burnt_note',
        x: notePos.x,
        z: notePos.z,
        rotY: 0.2,
        ownerPlayerId: normPlayerId(p.id),
        introPersonal: true,
        introBeat: 'campfire',
        signKind: 'intro_burnt_note_k',
        grounded: true,
      }));
    }
    return out;
  }

  function _hasPersonalDecor(p, prefabId) {
    const pid = normPlayerId(p.id);
    for (const decor of decorItems.values()) {
      if (!decor?.introPersonal || decor.prefabId !== prefabId) continue;
      if (normPlayerId(decor.ownerPlayerId) === pid) return true;
    }
    return false;
  }

  function _spawnSuitcaseOnly(p) {
    if (_hasPersonalDecor(p, 'spawn_beach_starter_suitcase')) return null;
    return _spawnSuitcase(p);
  }

  function _spawnSuitcase(p) {
    const pos = introPersonalPosition('suitcase', p.id);
    if (!pos) return null;
    const storage = SUITCASE_LOOT.map((row) => ({ type: row.type, qty: row.qty }));
    while (storage.length < INTRO_SUITCASE_CAPACITY) storage.push(null);
    return addDecorItem({
      id: introDecorId(p.id, 'suitcase'),
      prefabId: 'spawn_beach_starter_suitcase',
      x: pos.x,
      z: pos.z,
      rotY: Math.atan2(p.x - pos.x, p.z - pos.z) + 0.3,
      ownerPlayerId: normPlayerId(p.id),
      introPersonal: true,
      introBeat: 'pier',
      storage,
      storageOpen: false,
      grounded: true,
    });
  }

  function _applyBeat(p, socket, beat) {
    const beats = _beats(p);
    if (beat === 'footprints' && !beats.footprints) {
      beats.footprints = true;
      _spawnRock(p);
      notifyPlayer?.(socket, { introBeat: 'footprints', toast: INTRO_BEAT_TOAST.footprints });
      log?.info?.('intro', 'beat footprints', { user: p.username });
    } else if (beat === 'campfire' && beats.footprints && !beats.campfire) {
      beats.campfire = true;
      _spawnCampfirePersonal(p);
      notifyPlayer?.(socket, { introBeat: 'campfire', toast: INTRO_BEAT_TOAST.campfire });
      log?.info?.('intro', 'beat campfire', { user: p.username });
    } else if (beat === 'pier' && beats.campfire && !beats.pier) {
      beats.pier = true;
      _spawnSuitcaseOnly(p);
      notifyPlayer?.(socket, { introBeat: 'pier', toast: INTRO_BEAT_TOAST.pier });
      log?.info?.('intro', 'beat pier', { user: p.username });
    } else {
      return false;
    }
    p.dirty = true;
    return true;
  }

  function ensure(p, socket) {
    const sc = p.inv?.scenario;
    if (!sc || sc.completed || sc.step === 'act1_done') return;
    if (isIntroKitDone(sc.introBeats)) return;
    if (!sc.introBeats) sc.introBeats = defaultIntroBeats();
    _syncIntroLootFlags(p);
    _clearPersonal(p.id);
    const beats = _beats(p);
    _restorePersonalForBeats(p, beats);
    p.dirty = true;
    if (socket) _tickBeats(p, socket);
  }

  function _introZoneOverrides() {
    return { campfire: resolveIntroCampfireZone(decorItems.values()) };
  }

  function _campfireZoneForDecor(decorId) {
    if (decorId) {
      const decor = decorItems.get(decorId);
      if (decor?.prefabId === 'spawn_beach_campfire_ring'
          && Number.isFinite(decor.x) && Number.isFinite(decor.z)) {
        return resolveIntroCampfireZone([decor]);
      }
    }
    return resolveIntroCampfireZone(decorItems.values());
  }

  function _tickBeats(p, socket) {
    const zones = _introZoneOverrides();
    for (let i = 0; i < 3; i++) {
      const beats = _beats(p);
      const beat = beatTriggeredByPosition(p.x, p.z, beats, zones);
      if (!beat || !_applyBeat(p, socket, beat)) break;
    }
    const beats = _beats(p);
    if (beats.campfire && beats.pier && !beats.kitDone && !_hasPersonalDecor(p, 'spawn_beach_starter_suitcase')) {
      _spawnSuitcaseOnly(p);
    }
  }

  function tick(p, socket) {
    const sc = p.inv?.scenario;
    if (!sc || sc.completed || sc.step === 'act1_done') return;
    if (isIntroKitDone(sc.introBeats)) return;
    _tickBeats(p, socket);
  }

  function onReadable(p, socket, signKind) {
    const sc = p.inv?.scenario;
    if (!sc || sc.completed || isIntroKitDone(sc.introBeats)) return false;
    const beats = _beats(p);
    const beat = beatTriggeredByReadable(signKind, beats);
    if (beat) return _applyBeat(p, socket, beat);
    if (signKind === INTRO_READABLE_FOOTPRINTS && beats.footprints && !beats.campfire) {
      notifyPlayer?.(socket, { toast: INTRO_BEAT_TOAST.footprints });
      return true;
    }
    if (signKind === INTRO_READABLE_CAMPFIRE && beats.campfire && !beats.pier) {
      notifyPlayer?.(socket, { toast: INTRO_BEAT_TOAST.campfire });
      return true;
    }
    return false;
  }

  function _onTorchAcquired(p, socket) {
    const beats = _beats(p);
    beats.pickedTorch = true;
    p.dirty = true;
    if (beats.campfire && !beats.pier) {
      _applyBeat(p, socket, 'pier');
    } else if (!beats.pier) {
      notifyPlayer?.(socket, { toast: INTRO_BEAT_TOAST.pier_after_torch });
    }
  }

  function onPickup(p, socket, item) {
    if (!item?.introPersonal) return false;
    const beats = _beats(p);
    if (item.type === 'tool_caillou') {
      beats.pickedRock = true;
      p.dirty = true;
      notifyPlayer?.(socket, { toast: INTRO_BEAT_TOAST.footprints });
    }
    if (item.type === 'tool_torche') {
      _onTorchAcquired(p, socket);
    }
    if (item.linkedDecorId) removeDecorItem(item.linkedDecorId);
    return true;
  }

  function _resolvePickupXZ(p, clientX, clientZ) {
    const sx = Number(clientX);
    const sz = Number(clientZ);
    if (Number.isFinite(sx) && Number.isFinite(sz)) {
      if (Math.hypot(sx - p.x, sz - p.z) <= 8) return { x: sx, z: sz };
    }
    return { x: p.x, z: p.z };
  }

  function _inCampfirePickupZone(p, clientX, clientZ, decorId) {
    const zone = _campfireZoneForDecor(decorId);
    const { x, z } = _resolvePickupXZ(p, clientX, clientZ);
    return inIntroCampfirePickupZone(x, z, zone);
  }

  function tryCampfireBeatNear(p, socket, clientX, clientZ, decorId) {
    const beats = _beats(p);
    if (beats.campfire) return true;
    if (!_inCampfirePickupZone(p, clientX, clientZ, decorId)) return false;
    if (!beats.footprints) {
      const hasRock = beats.pickedRock || playerOwnsIntroItem(p.inv, 'tool_caillou');
      if (!hasRock) return false;
      _applyBeat(p, socket, 'footprints');
    }
    return _applyBeat(p, socket, 'campfire');
  }

  function canPickupTorchDecor(p, decor) {
    if (!decor?.introPersonal || decor.prefabId !== 'spawn_beach_starter_torch') return false;
    if (normPlayerId(decor.ownerPlayerId) !== normPlayerId(p.id)) return false;
    const beats = _beats(p);
    if (!beats.campfire) return false;
    if (beats.pickedTorch || playerOwnsIntroItem(p.inv, 'tool_torche')) return false;
    return Math.hypot(decor.x - p.x, decor.z - p.z) <= 3.5;
  }

  function onTorchDecorPickup(p, socket, decor) {
    if (!canPickupTorchDecor(p, decor)) return false;
    const stack = { type: 'tool_torche', qty: 1 };
    if (!addStackToInv) return false;
    const res = addStackToInv(p.inv, stack);
    if (res.leftover > 0) return false;
    removeDecorItem(decor.id);
    _onTorchAcquired(p, socket);
    emitInvAuth?.(socket, p);
    return true;
  }

  function canPickupTorchAtCampfire(p, clientX, clientZ, decorId) {
    const beats = _beats(p);
    if (beats.pickedTorch || playerOwnsIntroItem(p.inv, 'tool_torche')) return false;
    if (!_inCampfirePickupZone(p, clientX, clientZ, decorId)) return false;
    const hasRock = beats.pickedRock || playerOwnsIntroItem(p.inv, 'tool_caillou');
    if (!hasRock) return false;
    if (!beats.footprints || !beats.campfire) return false;
    return true;
  }

  function onTorchCampfirePickup(p, socket, clientX, clientZ, decorId) {
    if (!canPickupTorchAtCampfire(p, clientX, clientZ, decorId)) return false;
    const stack = { type: 'tool_torche', qty: 1 };
    if (!addStackToInv) return false;
    const res = addStackToInv(p.inv, stack);
    if (res.leftover > 0) return false;
    const pid = normPlayerId(p.id);
    for (const [id, decor] of decorItems.entries()) {
      if (decor.prefabId !== 'spawn_beach_starter_torch') continue;
      if (normPlayerId(decor.ownerPlayerId) !== pid) continue;
      removeDecorItem(id);
    }
    _onTorchAcquired(p, socket);
    emitInvAuth?.(socket, p);
    return true;
  }

  function canPickup(p, item) {
    if (!item?.introPersonal) return true;
    const beats = _beats(p);
    if (item.introBeat === 'wake') {
      return normPlayerId(item.ownerPlayerId) === normPlayerId(p.id);
    }
    if (item.introBeat === 'footprints' && !beats.footprints) return false;
    if (item.introBeat === 'campfire' && !beats.campfire) return false;
    return normPlayerId(item.ownerPlayerId) === normPlayerId(p.id);
  }

  function onSuitcaseEmptied(p, socket, decor) {
    if (!decor?.introPersonal || decor.prefabId !== 'spawn_beach_starter_suitcase') return false;
    const beats = _beats(p);
    if (!beats.pier || beats.kitDone) return false;
    if (normPlayerId(decor.ownerPlayerId) !== normPlayerId(p.id)) return false;
    removeDecorItem(decor.id);
    beats.kitDone = true;
    p.dirty = true;
    notifyPlayer?.(socket, { introBeat: 'kit_done', starterLootComplete: true, toast: 'Kit de départ récupéré.' });
    log?.info?.('intro', 'kit done', { user: p.username });
    return true;
  }

  function canOpenStorage(p, decor) {
    if (!decor?.introPersonal) return true;
    if (decor.prefabId !== 'spawn_beach_starter_suitcase') return true;
    const beats = _beats(p);
    return beats.pier && normPlayerId(decor.ownerPlayerId) === normPlayerId(p.id);
  }

  function clearForPlayer(playerId) {
    _clearPersonal(playerId);
  }

  return {
    ensure,
    tick,
    onReadable,
    onPickup,
    introRockLookTarget,
    onSuitcaseEmptied,
    canPickup,
    canOpenStorage,
    clearForPlayer,
    isIntroKitDone,
    INTRO_SUITCASE_CAPACITY,
    tryCampfireBeatNear,
    onTorchDecorPickup,
    onTorchCampfirePickup,
  };
}
