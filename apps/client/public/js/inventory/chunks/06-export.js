// Export ZS.Inventory — extrait de inventory.js (IIFE)
window.ZS = window.ZS || {};
  ZS.Inventory = {
    init, tick, tryGrabNearest: grabNearest,
    spawnWorldItem, removeWorldItem, receivePickup, spawnStructure, collectBag,
    countItem, findItemSlot, addItem, addItemSlot, removeItem, removeStack, getStorageStacks, getStorageSlots, canAddItem, canAddStack, consumeOne,
    getInvSnapshot, syncToServer, applyAuthoritativeInv,
    placeActiveStructure, getActiveItem, hasDoorKey, removeDoorKey, installDoorLockOnNearestDoor, installDoorLockOnAimedDoor, getWeaponAmmo, decrementAmmo, reloadWeapon, wearActiveWeapon,
    getArmorValue, getMaxHealth, togglePanel, loadFromSave, loadRespawnKit,
    ensureStarterCaillou, ensureStarterTorche, ensureStarterRations, clear,
    hasItemType: _hasItemType,
    setSelfPlayerId,
  };
