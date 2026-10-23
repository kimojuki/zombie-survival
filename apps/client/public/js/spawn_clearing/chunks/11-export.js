// Exports ZS + upgradeTreeLod — extrait de spawn_clearing.js (IIFE)
window.ZS = window.ZS || {};
  ZS.buildClearingRing  = buildClearingRing;
  ZS.buildSpawnTrail     = buildSpawnTrail;
  ZS.buildSpawnTrailDecor = buildSpawnTrailDecor;
  ZS.buildClearingExit   = buildClearingExit;
  ZS.SPAWN_TRAIL_PTS     = SPAWN_TRAIL_PTS;
  ZS.getSpawnTrailMouth  = getSpawnTrailMouth;
  ZS.buildCampGround    = buildCampGround;
  ZS.buildCampLayout    = buildCampLayout;
  ZS.buildCampProps     = buildCampProps;
  ZS.buildSpawnCamp     = buildSpawnCamp;
  ZS.spawnDecorPrefab   = spawnDecorPrefab;
  function upgradeTreeLod(root, prefabId, buildOpts = {}) {
    if (!root?.userData?.simpleLod) return false;
    const prefab = DECOR_PREFABS[prefabId];
    if (!prefab) return false;
    while (root.children.length) root.remove(root.children[0]);
    prefab.build(root, buildOpts);
    root.userData.simpleLod = false;
    if (!ZS.Options?.getProfile?.()?.shadows) {
      root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    }
    return true;
  }

  ZS.registerDecorPrefab = registerDecorPrefab;
  ZS.getDecorPrefabMeta = getDecorPrefabMeta;
  ZS.upgradeTreeLod = upgradeTreeLod;
  ZS.listDecorPrefabs   = listDecorPrefabs;
  ZS.findNearestDecorDoor = findNearestDecorDoor;
  ZS.setDecorDoorLockState = setDecorDoorLockState;
  ZS.setDecorDoorState    = setDecorDoorState;
  ZS.refreshDecorCollision = _refreshDecorCollision;
  ZS.unregisterDecorDoor  = unregisterDecorDoor;
  ZS.findNearestDecorStorage = findNearestDecorStorage;
  ZS.findNearestDecorInteract = findNearestDecorInteract;
  ZS.unregisterDecorInteract = unregisterDecorInteract;
  ZS.findNearestDecorSign = findNearestDecorSign;
  ZS.hitDecorStorage        = hitDecorStorage;
  ZS.hitDecorStorageRay     = hitDecorStorageRay;
  ZS.hitDecorSignRay        = hitDecorSignRay;
  ZS.hitDecorBuild          = hitDecorBuild;
  ZS.hitDecorBuildRay       = hitDecorBuildRay;
  ZS.hitDecorDoorRay        = hitDecorDoorRay;
  ZS.pickDecorInteractRay   = pickDecorInteractRay;
  ZS.pickDecorAdminRay      = pickDecorAdminRay;
  ZS.getDecorDoorForInteract = getDecorDoorForInteract;
  ZS.getDecorStorageForInteract = getDecorStorageForInteract;
  ZS.getDecorSignForInteract = getDecorSignForInteract;
  ZS.getDecorDoorMeta       = getDecorDoorMeta;
  ZS.setDecorStorageState    = setDecorStorageState;
  ZS.unregisterDecorStorage  = unregisterDecorStorage;
  ZS.unregisterDecorSign     = unregisterDecorSign;
  ZS.registerDecorSign       = registerDecorSign;
  ZS.unregisterDecorBuild    = unregisterDecorBuild;
  ZS.tickDecorDoors       = tickDecorDoors;
  ZS.getDecorGroundHeight = getDecorGroundHeight;
  ZS.sampleShackPadHeight = sampleShackPadHeight;
  ZS.getDecorSurfaceLift  = getDecorSurfaceLift;
  ZS.resyncBuildFloorMesh = _resyncBuildFloorMesh;
  ZS.reconcileAllBuildFloors = reconcileAllBuildFloors;
  ZS.buildFloorSupports   = _buildFloorSupports;
  ZS.resnapMinableRock    = resnapMinableRock;
  ZS.resnapAllMinableRocks = resnapAllMinableRocks;
  ZS.setDeferRockSnap = setDeferRockSnap;
  ZS.CAMP_GROUND_LIFT     = CAMP_GROUND_LIFT;
  ZS.TRAIL_SURFACE_LIFT   = TRAIL_SURFACE_LIFT;
