'use strict';

const { registerAuthRoutes } = require('./routes/auth-routes');
const { registerHealthRoutes } = require('./routes/health-routes');
const { registerAdminRoutes } = require('./routes/admin-routes');
const { registerWorldRoutes } = require('./routes/world-routes');
const { registerDevRoutes } = require('./routes/dev-routes');

/**
 * Enregistre toutes les routes HTTP (auth, health, admin, world, dev).
 */
function registerHttpRoutes(app, express, ctx) {
  registerAuthRoutes(app, {
    bcrypt: ctx.bcrypt,
    jwt: ctx.jwt,
    JWT_SECRET: ctx.JWT_SECRET,
    log: ctx.log,
    authProxy: ctx.authProxy,
    getAuthPlayerLink: ctx.getAuthPlayerLink,
    guestPlayers: ctx.guestPlayers,
    getPlayer: ctx.getPlayer,
    createPlayer: ctx.createPlayer,
    isDevServer: ctx.isDevServer,
    isQaServer: ctx.isQaServer,
    SERVER_ROLE: ctx.SERVER_ROLE,
    GUEST_COMMIT_MS: ctx.GUEST_COMMIT_MS,
    authFromHeader: ctx.authFromHeader,
    authPayload: ctx.authPayload,
    devAccessPayload: ctx.devAccessPayload,
    canAccessDevServer: ctx.canAccessDevServer,
    introBeachSpawn: ctx.introBeachSpawn,
    startingSave: ctx.startingSave,
    beachSpawn: ctx.beachSpawn,
    exchangeHandoffWithAuth: ctx.exchangeHandoffWithAuth,
  });

  registerHealthRoutes(app, {
    getClientVersion: ctx.getClientVersion,
    getServerReady: ctx.getServerReady,
    getBootStatus: ctx.getBootStatus,
    getPlayerCount: ctx.getPlayerCount,
    gitCommit: ctx.gitCommit,
    invDebugBuild: ctx.invDebugBuild,
    serverRole: ctx.serverRole,
    isQaServer: ctx.isQaServer,
    isDevServer: ctx.isDevServer,
    getAuthMode: ctx.getAuthMode,
    isAuthStandalone: ctx.isAuthStandalone,
    getDecorStats: ctx.getDecorStats,
    rconEnabled: ctx.rconEnabled,
    loadServersConfig: ctx.loadServersConfig,
    resolveServersForClient: ctx.resolveServersForClient,
    clientPublic: ctx.clientPublic,
  });

  registerAdminRoutes(app, express, {
    log: ctx.log,
    io: ctx.io,
    authFromHeader: ctx.authFromHeader,
    hasPerm: ctx.hasPerm,
    authPayload: ctx.authPayload,
    getRcon: ctx.getRcon,
    rconPassword: ctx.rconPassword,
    getPlayers: ctx.getPlayers,
    getDecorItems: ctx.getDecorItems,
    getWorldWaterZones: ctx.getWorldWaterZones,
    getLootBuildings: ctx.getLootBuildings,
    playerRoles: ctx.playerRoles,
    ownerUsers: ctx.ownerUsers,
    adminRoadStore: ctx.adminRoadStore,
    worldPersist: ctx.worldPersist,
    prefabCatalogReviews: ctx.prefabCatalogReviews,
    getDecorPrefabCatalogCache: ctx.getDecorPrefabCatalogCache,
    reloadDecorPrefabCatalog: ctx.reloadDecorPrefabCatalog,
    decorPrefabs: ctx.decorPrefabs,
    nextDecorId: ctx.nextDecorId,
    buildAdminDecorCreateItem: ctx.buildAdminDecorCreateItem,
    adminDecorSnapshot: ctx.adminDecorSnapshot,
    applyAdminDecorPatch: ctx.applyAdminDecorPatch,
    applyAdminDecorStoragePatch: ctx.applyAdminDecorStoragePatch,
    removeDecorItem: ctx.removeDecorItem,
    emitStorageUpdate: ctx.emitStorageUpdate,
    emitSurvivalUpdate: ctx.emitSurvivalUpdate,
    reloadWorldFromDatabase: ctx.reloadWorldFromDatabase,
    isDecorImmutable: ctx.isDecorImmutable,
    getPlacementKey: ctx.getPlacementKey,
    createWorldBackupService: ctx.createWorldBackupService,
    backupServiceConfig: ctx.backupServiceConfig,
    flushWorldPersistCounters: ctx.flushWorldPersistCounters,
    worldRadius: ctx.worldRadius,
    sectorBoundsMod: ctx.sectorBoundsMod,
    getWorldTime: ctx.getWorldTime,
    setWorldTime: ctx.setWorldTime,
    serverFlags: ctx.serverFlags,
    dayDurationSec: ctx.dayDurationSec,
  });

  registerWorldRoutes(app, {
    getServerReady: ctx.getServerReady,
    decorTreesBeyond: ctx.decorTreesBeyond,
    decorPropsBeyond: ctx.decorPropsBeyond,
    decorNearPlayer: ctx.decorNearPlayer,
    getDecorItems: ctx.getDecorItems,
    isMinableRockPrefab: ctx.isMinableRockPrefab,
  });

  registerDevRoutes(app, {
    log: ctx.log,
    jwt: ctx.jwt,
    JWT_SECRET: ctx.JWT_SECRET,
    getPlayer: ctx.getPlayer,
    createPlayer: ctx.createPlayer,
    savePlayerState: ctx.savePlayerState,
    bcrypt: ctx.bcrypt,
    authPayload: ctx.authPayload,
    serverRole: ctx.serverRole,
    isQaServer: ctx.isQaServer,
    authFromHeader: ctx.authFromHeader,
    qaChecklist: ctx.qaChecklist,
    getSleepingPlayers: ctx.getSleepingPlayers,
    deleteWorldSleeper: ctx.deleteWorldSleeper,
    beachSpawn: ctx.beachSpawn,
    benchSave: ctx.benchSave,
    isBenchUsername: ctx.isBenchUsername,
    getScenarioBeach: ctx.getScenarioBeach,
  });
}

module.exports = { registerHttpRoutes };
