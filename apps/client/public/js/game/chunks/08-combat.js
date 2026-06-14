// Tir, mêlée, récolte — extrait de game.js (async IIFE)
  // ── Combat : tir, mêlée, abattage d'arbres ─────────────────────────────────
  const FIRE_INTERVAL = {
    wpn_pistolet: 0.28, pistol: 0.28, wpn_fusil_pompe: 0.85, wpn_fusil_chasse: 1.10,
  };
  let _lastAttack  = 0;     // s — dernière attaque
  let _reloadUntil = 0;     // s — fin du rechargement en cours
  const _now = () => performance.now() / 1000;

  function _muzzleFlash() {
    const holder = fpsArms.getObjectByName('itemHolder');
    ZS.muzzleFlash(holder);
  }

  function _sendShot(baseDir, disp, weaponType) {
    const dx = baseDir.x + (Math.random() - 0.5) * disp;
    const dz = baseDir.z + (Math.random() - 0.5) * disp;
    const cam = _cameraWorldPos();
    ZS.Network.sendShoot(cam.x, cam.z, dx, dz, weaponType);
  }

  function _startReload(def) {
    if (_now() < _reloadUntil) return;
    if (ZS.isArmAnimActive?.(fpsArms)) return;
    if (ZS.Inventory.getWeaponAmmo() >= (def.capacite_chargeur || 12)) return;
    if (ZS.Inventory.countItem(def.type_munition_accepte) <= 0) { ZS.UI.showNotif('Pas de munitions'); return; }
    const t = def.temps_rechargement || 2;
    _reloadUntil = _now() + t;
    ZS.UI.showNotif('Rechargement…');
    const item = ZS.Inventory.getActiveItem();
    if (item) ZS.triggerArmAnim(fpsArms, 'reload', item.type, { dur: t });
    setTimeout(() => ZS.Inventory.reloadWeapon(), t * 1000);
  }

  function _fireGun(item, def) {
    const n = _now();
    if (n < _reloadUntil) return;
    if (n - _lastAttack < (FIRE_INTERVAL[item.type] || 0.3)) return;
    if ((item.ammo || 0) <= 0) {
      if (ZS.Inventory.countItem(def.type_munition_accepte) > 0) _startReload(def);
      else ZS.UI.showNotif('Pas de munitions');
      return;
    }
    _lastAttack = n;
    _muzzleFlash();
    ZS.Audio.gunshot(item.type);
    _playSwing('recoil', item.type);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction.clone();
    const disp = def.dispersion_balle || 0.05;
    // Un seul événement — le serveur résout les 8 plombs (autoritaire).
    _sendShot(dir, item.type === 'wpn_fusil_pompe' ? Math.max(disp, 0.25) : disp, item.type);
    if ((item.ammo || 0) <= 0 && ZS.Inventory.countItem(def.type_munition_accepte) > 0) _startReload(def);
  }

  // Coup de poing à mains nues (aucune arme en main)
  const FIST = { degats_impact: 8, portee_metre: 1.6, cadence_attaque: 0.5 };
  function _fistPunch() {
    const n = _now();
    if (n - _lastAttack < FIST.cadence_attaque) return;
    _lastAttack = n;
    _playSwing('punch', null);
    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const cam = _cameraWorldPos();
    const decorHit = _tryDamageDecorRay('__fist__', FIST.portee_metre + 1.2);
    const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
    ZS.Audio.melee(decorHit ? 0.85 : (hitDist < FIST.portee_metre + 0.8 ? 0.9 : 0.4));
    // Toujours envoyer au serveur (PvP prioritaire côté serveur même si décor touché localement).
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z, '__fist__');
  }

  function _canHarvestWood(type, def) {
    if (!def) return false;
    if (type === 'wpn_hache_combat' || type === 'tool_hachette' || type === 'tool_hache_pierre') return true;
    return def.type_recolte === 'Bois' && def.degats_impact > 0;
  }

  function _canHarvestStone(type, def) {
    if (type === 'tool_caillou') return true;
    if (type === 'tool_pioche_pierre' || type === 'tool_pioche') return true;
    if (type === 'tool_hache_pierre') return true;
    return def?.type_recolte === 'Pierre' && def.degats_impact > 0;
  }

  function _canDamageBuild(type) {
    return type === 'tool_caillou' || type === 'tool_hache_pierre';
  }

  function _canBreakLockedDoor(type) {
    if (!type) return false;
    if (type === '__fist__') return true;
    if (_canDamageBuild(type)) return true;
    if (type === 'tool_hachette' || type === 'wpn_hache_combat') return true;
    const def = ZS.ITEMS?.[type];
    return (def?.category === 'melee' || def?.category === 'tool') && (def.degats_impact || 0) > 0;
  }

  function _isLockedDoorWithoutKey(meta) {
    return !!meta?.locked && !_hasDoorKey(meta.lockId);
  }

  function _tryDamageDecorRay(itemType, maxDist) {
    if (!ZS.hitDecorBuildRay && !ZS.hitDecorDoorRay) return false;
    raycaster.setFromCamera(screenCenter, camera);
    raycaster.far = maxDist;

    const buildHit = ZS.hitDecorBuildRay?.(raycaster, maxDist);
    if (buildHit?.decorId) {
      const meta = ZS.getDecorDoorMeta?.(buildHit.decorId);
      const lockedNoKey = _isLockedDoorWithoutKey(meta);
      if (lockedNoKey && _canBreakLockedDoor(itemType)) {
        ZS.Network.requestBuildHit(buildHit.decorId, itemType);
        return true;
      }
      if (!lockedNoKey && _canDamageBuild(itemType)) {
        ZS.Network.requestBuildHit(buildHit.decorId, itemType);
        return true;
      }
    }

    const doorHit = ZS.hitDecorDoorRay?.(raycaster, maxDist);
    if (doorHit?.decorId && _isLockedDoorWithoutKey(doorHit) && _canBreakLockedDoor(itemType)) {
      ZS.Network.requestBuildHit(doorHit.decorId, itemType);
      return true;
    }
    return false;
  }

  function _chopWoodYield(type, def) {
    if (type === 'tool_hachette') return 2;
    if (type === 'tool_hache_pierre') return 2;
    if (type === 'wpn_hache_combat') return 1;
    if (type === 'tool_caillou') return 1;
    return Math.max(1, Math.floor((def?.efficacite_recolte || 1) * 0.8));
  }

  function _mineStoneYield(type, def) {
    if (type === 'tool_caillou') return 1;
    if (type === 'tool_pioche_pierre' || type === 'tool_pioche') return 3;
    if (type === 'tool_hache_pierre') return 1;
    return Math.max(1, Math.floor((def?.efficacite_recolte || 1) * 0.6));
  }

  function _meleeSwing(item, def) {
    const n = _now();
    if (n - _lastAttack < (def.cadence_attaque || 0.5)) return;
    _lastAttack = n;
    _playSwing('melee', item.type);

    raycaster.setFromCamera(screenCenter, camera);
    const dir = raycaster.ray.direction;
    const range = def.portee_metre || 1.2;
    const cam = _cameraWorldPos();
    const harvestRange = Math.max(range + 1.2, 2.4);
    let harvested = false;

    // Dégâts construction / porte verrouillée sans clé
    if (ZS.hitDecorBuildRay || ZS.hitDecorDoorRay) {
      raycaster.far = harvestRange + 1.5;
      if (_tryDamageDecorRay(item.type, harvestRange + 1.5)) {
        harvested = true;
        ZS.Audio.chopWood(0.88);
      }
    }

    // Récolter de la pierre sur un rocher devant soi
    if (!harvested && _canHarvestStone(item.type, def) && ZS.mineRock) {
      const mine = ZS.mineRock(
        cam.x, cam.z, dir.x, dir.z,
        harvestRange,
        _mineStoneYield(item.type, def),
      );
      if (mine?.hit) {
        harvested = true;
        ZS.Audio.chopWood(0.95);
        if (mine.stoneTaken > 0) {
          ZS.UI.showNotif('+' + mine.stoneTaken + ' Pierre');
        }
        if (mine.depleted) ZS.UI.showNotif('Rocher épuisé');
        if (mine.decorId) {
          ZS.Network.notifyDecorMine(mine.decorId);
        }
      }
    }

    // Outils / armes : récolter du bois sur un arbre devant soi
    if (!harvested && _canHarvestWood(item.type, def) && ZS.chopTree) {
      const chop = ZS.chopTree(
        cam.x, cam.z, dir.x, dir.z,
        harvestRange,
        _chopWoodYield(item.type, def),
      );
      if (chop?.hit) {
        harvested = true;
        ZS.Audio.chopWood(1.0);
        if (chop.woodTaken > 0) {
          ZS.UI.showNotif('+' + chop.woodTaken + ' Bois brut');
        }
        if (chop.felled) ZS.UI.showNotif('Arbre abattu');
        if (chop.decorId) {
          ZS.Network.notifyDecorChop(chop.decorId, dir.x, dir.z);
        }
      }
    }

    if (!harvested) {
      const hitDist = ZS.Zombies.nearestDist(cam.x, cam.z);
      ZS.Audio.melee(hitDist < range + 0.8 ? 1.0 : 0.45);
    }

    // Frappe les zombies dans la portée (rayon latéral large = coup de mêlée balayant)
    // + recul : un coup au corps à corps repousse le zombie en arrière.
    ZS.Network.sendShoot(cam.x, cam.z, dir.x, dir.z, item.type);
    ZS.Inventory.wearActiveWeapon();
  }

  function _useHeldItem() {
    const item = ZS.Inventory.getActiveItem();
    if (!item) return false;
    const def = ZS.ITEMS[item.type];
    if (!def) return false;
    if (def.category === 'food' || def.category === 'medical') {
      if (ZS.Survival.useItem(item.type, ZS.Inventory?.findItemSlot?.(item.type))) {
        const dur = (ZS.getGrip(item.type)?.anim?.use?.dur)
          ?? (def.category === 'medical' ? (def.temps_utilisation || 1.5) : 0.5);
        ZS.triggerArmAnim(fpsArms, 'use', item.type, { dur });
      }
      return true;
    }
    if (def.category === 'ammo') {
      ZS.Inventory.reloadWeapon();
      return true;
    }
    return false;
  }

  function attack() {
    if (state.player.dead) return;
    if (ZS.BedSleep?.isActive?.()) return;
    if (ZS.AdminLiveDecor?.isPlacing?.() || ZS.AdminLiveRoads?.isPlacing?.() || ZS.AdminFly?.isActive?.()) return;
    if (ZS.AdminWorldMapOverlay?.isOpen?.()) return;
    if (ZS.SpawnIntro?.blocksInput?.()) return;
    if (ZS.Loading?.isActive?.() || !ZS.Network?.isSpawnReady?.()) return;
    const item = ZS.Inventory.getActiveItem();
    const def  = item ? ZS.ITEMS[item.type] : null;
    if (def && def.category === 'structure') {
      ZS.Inventory.placeActiveStructure?.();
      return;
    }
    if (def && (def.category === 'food' || def.category === 'medical' || def.category === 'ammo')) {
      _useHeldItem();
      return;
    }
    if (def && def.category === 'firearm') { _fireGun(item, def); return; }
    if (def && def.category === 'melee')   { _meleeSwing(item, def); return; }
    // Outils offensifs (hachette, marteau, pioche…) → frappent aussi les zombies
    if (def && def.category === 'tool' && def.degats_impact) { _meleeSwing(item, def); return; }
    if (!def) _fistPunch();   // mains vides → coup de poing
  }
