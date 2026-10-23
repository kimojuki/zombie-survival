'use strict';

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db');
const {
  getPlayer,
  getPlayerById,
  createPlayer,
  savePlayerState,
  pool,
  ensureWorldSchema,
  ensurePlayersGuestSchema,
  ensureAccountIdSchema,
  DB_CLIENT,
  deleteWorldSleeper,
} = db;
const log = require('./logger');
const { createGuestPlayersService } = require('./guest-players');
const { createBootReport } = require('./boot-report');
const { createRcon } = require('./rcon');
const { createWorldPersist } = require('./world-persist');
const { createWorldBackupService } = require('./world-backup');
const { getServerRole, isDevServer, isQaServer } = require('./server-role');
const { createQaChecklist } = require('./qa-checklist');
const { loadServersConfig, resolveServersForClient } = require('./servers-config');
const { createAdminRoadStore } = require('./admin-road-ops');
const invOps = require('./inventory-ops');
const {
  applyAdminDecorPatch,
  applyAdminDecorStoragePatch,
  adminDecorSnapshot,
  buildAdminDecorCreateItem,
} = require('./admin-decor-ops');
const prefabCatalogReviews = require('./prefab-catalog-reviews');
const { invSnapshot: invDebugSnapshot, logInv: logInvDebug } = require('./inv-debug');
const {
  resolveConnectHealthFlags,
  connectHealthValue,
  shouldEmitDeathOnConnect,
} = require('./player-connect-health');
const {
  isStaleWorldSleeper,
  resolveConnectSurvival,
  sleeperPlayersTableSurvival,
} = require('./player-connect-restore');
const {
  isFelledTreeDecor,
  decorTreesBeyond,
  decorPropsBeyond,
  decorItemsNearPlayer,
} = require('./decor-game-init');
const {
  ensureChestGrid,
  chestFilledCount,
  moveStorageTransfer,
  lootMoveTransfer,
} = require('./storage-ops');
const {
  tickPlayerSurvival,
  tickSleeperSurvival,
  catchUpSleeperSurvival,
} = require('./survival-tick');
const craftQueueMod = require('./craft-queue');
const { isAuthStandalone, getAuthMode } = require('./auth-mode');
const { createAuthProxy } = require('./auth-proxy');
const { exchangeHandoffWithAuth } = require('./auth-handoff');
const { registerClientStatic } = require('./client-static');
const { createServerConfig, authFromHeader: verifyAuthFromHeader } = require('./server-config');
const { createGameStack } = require('./game/create-game-stack');
const { registerHttpRoutes } = require('./register-http-routes');
const { buildHttpRouteContext } = require('./build-http-route-context');
const { buildSocketContext } = require('./build-socket-context');
const { buildServerRuntimeContext } = require('./build-server-runtime-context');
const { createServerRuntime } = require('./server-runtime');
const { registerSocketHandlers } = require('./socket/register-sockets');
const { createGameSocketBindings } = require('./socket/build-socket-bindings');
const { initRolesBridge } = require('./roles-bridge');
const { createPlayerRolesService } = require('./player-roles');
const { compactZombiesForSync } = require('./game/zombie-sync');

const INV_DEBUG_SERVER_BUILD = '20260613-survival-disconnect-snapshot';

/**
 * Bootstrap complet du game-server (HTTP + WebSocket + runtime).
 */
async function bootstrapGameServer(serverDir) {
  log.info('inv-debug', 'server build', { build: INV_DEBUG_SERVER_BUILD });

  const guestPlayers = createGuestPlayersService({ db, log });
  const GUEST_COMMIT_MS = (parseInt(process.env.GUEST_COMMIT_MINUTES || '8', 10) || 8) * 60 * 1000;
  const worldPersist = createWorldPersist(db, log);
  const adminRoadStore = createAdminRoadStore(db, worldPersist, log);
  const qaChecklist = createQaChecklist(pool, DB_CLIENT);
  const SERVER_ROLE = getServerRole();
  const authProxy = createAuthProxy({ log });

  const cfg = createServerConfig(serverDir, { dbClient: DB_CLIENT });
  const ROOT_DIR = cfg.rootDir;
  const CLIENT_PUBLIC = cfg.clientPublic;
  const USE_CLIENT_BUILD = cfg.useClientBuild;
  const getClientVersion = cfg.getClientVersion;
  const PORT = cfg.port;
  const HOST = cfg.host;
  const JWT_SECRET = cfg.jwtSecret;
  const WORLD_RADIUS = cfg.worldRadius;
  const ZOMBIE_COUNT = cfg.zombieCount;
  const GIT_COMMIT = cfg.gitCommit;
  const OWNER_USERS = cfg.ownerUsers;
  const ADMIN_USERS = cfg.adminUsers;
  const RCON_AUTO_ADMIN = cfg.rconAutoAdmin;
  const RCON_PASSWORD = cfg.rconPassword;

  function authFromHeader(req) {
    return verifyAuthFromHeader(req, JWT_SECRET);
  }

  let playerRoles = null;
  async function initPlayerRoles() {
    await initRolesBridge();
    playerRoles = createPlayerRolesService(pool, {
      ownerUsers: OWNER_USERS,
      rconAutoAdmin: RCON_AUTO_ADMIN,
      log,
    });
    await playerRoles.load();
    return playerRoles;
  }

  if (OWNER_USERS.size) {
    log.debug('boot', 'owner accounts configured', { users: [...OWNER_USERS], autoAll: RCON_AUTO_ADMIN });
  }

  const app = express();
  const server = http.createServer(app);
  if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  const io = new Server(server, {
    cors: { origin: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  app.use(express.json());
  registerClientStatic(app, {
    express,
    fs,
    path,
    log,
    getClientVersion,
    useClientBuild: USE_CLIENT_BUILD,
    clientRoot: cfg.clientRoot,
    clientDist: cfg.clientDist,
    clientSrc: cfg.clientSrc,
    clientPublic: CLIENT_PUBLIC,
  });

  const {
    normalizeInv,
    ensureSlotGrid,
    findStackByType,
    resolveUseItemStack,
    cloneInv,
    flattenInv,
    iterInvStacks,
    playerHasDoorKey,
    takeInvSlot,
    removeFromSlot,
    addStackToInv,
    addStackToInvOnce,
    tryAddSlotToInv,
    removeStackFromInv,
    consumeInvType,
    consumeDoorKey,
    countInvType,
    playerOwnsItemType,
    moveInvSlot,
    wearInvTool,
  } = invOps;

  const stack = createGameStack({
    serverDir,
    io,
    log,
    db,
    worldPersist,
    savePlayerState,
    guestPlayers,
    guestCommitMs: GUEST_COMMIT_MS,
    getPlayerRoles: () => playerRoles,
    ownerUsers: OWNER_USERS,
    rconAutoAdmin: RCON_AUTO_ADMIN,
    zombieCount: ZOMBIE_COUNT,
    rootDir: ROOT_DIR,
    fs,
    path,
    createRcon,
    qaChecklist,
    sleeperPlayersTableSurvival,
    isQaServer,
    serverRole: SERVER_ROLE,
    invDebugBuild: INV_DEBUG_SERVER_BUILD,
    isFelledTreeDecor,
    decorTreesBeyond,
    decorPropsBeyond,
    decorItemsNearPlayer,
    normalizeInv,
    ensureSlotGrid,
    cloneInv,
    wearInvTool,
    ensureChestGrid,
    flattenInv,
    countInvType,
    removeStackFromInv,
    addStackToInv,
  });

  const infra = {
    app,
    express,
    bcrypt,
    jwt,
    JWT_SECRET,
    log,
    authProxy,
    guestPlayers,
    getPlayer,
    getPlayerById,
    createPlayer,
    savePlayerState,
    isDevServer,
    isQaServer,
    SERVER_ROLE,
    GUEST_COMMIT_MS,
    authFromHeader,
    exchangeHandoffWithAuth,
    getClientVersion,
    GIT_COMMIT,
    invDebugBuild: INV_DEBUG_SERVER_BUILD,
    getAuthMode,
    isAuthStandalone,
    loadServersConfig,
    resolveServersForClient,
    CLIENT_PUBLIC,
    io,
    RCON_PASSWORD,
    ADMIN_USERS,
    playerRoles,
    OWNER_USERS,
    adminRoadStore,
    worldPersist,
    prefabCatalogReviews,
    createWorldBackupService,
    db,
    pool,
    DB_CLIENT,
    ROOT_DIR,
    WORLD_RADIUS,
    lazyMods: stack.lazyMods,
    deleteWorldSleeper,
    buildAdminDecorCreateItem,
    adminDecorSnapshot,
    applyAdminDecorPatch,
    applyAdminDecorStoragePatch,
    qaChecklist,
    decorTreesBeyond,
    decorPropsBeyond,
    decorItemsNearPlayer,
    pathToFileURL,
    resolveConnectHealthFlags,
    connectHealthValue,
    shouldEmitDeathOnConnect,
    resolveConnectSurvival,
    isStaleWorldSleeper,
    sleeperPlayersTableSurvival,
    craftQueueMod,
    invDebugSnapshot,
    logInvDebug,
    compactZombiesForSync,
    flattenInv,
    normalizeInv,
    invOps: {
      normalizeInv,
      ensureSlotGrid,
      findStackByType,
      resolveUseItemStack,
      cloneInv,
      iterInvStacks,
      playerHasDoorKey,
      takeInvSlot,
      removeFromSlot,
      addStackToInv,
      addStackToInvOnce,
      tryAddSlotToInv,
      removeStackFromInv,
      consumeInvType,
      consumeDoorKey,
      countInvType,
      playerOwnsItemType,
      moveInvSlot,
      wearInvTool,
      ensureChestGrid,
      chestFilledCount,
      lootMoveTransfer,
      moveStorageTransfer,
    },
    server,
    path,
    fs,
    pool,
    USE_CLIENT_BUILD,
    ZOMBIE_COUNT,
    RESOURCE_REGEN_URL: stack.mods.urls.RESOURCE_REGEN_URL,
    ensureWorldSchema,
    ensurePlayersGuestSchema,
    ensureAccountIdSchema,
    createBootReport,
    initPlayerRoles,
    getPlayerRoles: () => playerRoles,
    tickPlayerSurvival,
    tickSleeperSurvival,
    catchUpSleeperSurvival,
    STARTING_SAVE: stack.STARTING_SAVE,
    PORT,
    HOST,
  };

  let worldBoot;
  registerHttpRoutes(app, express, buildHttpRouteContext({
    stack,
    infra,
    getWorldBoot: () => worldBoot,
  }));

  const spatial = {
    playerVisibleZombies: undefined,
    rebuildPlayerSpatialGrid: undefined,
    broadcastPlayerMove: undefined,
  };

  registerSocketHandlers(createGameSocketBindings(() => buildSocketContext({ stack, infra, spatial })));

  stack.bootScenario();

  const gameRuntime = createServerRuntime(buildServerRuntimeContext({ stack, infra, spatial }));
  worldBoot = gameRuntime.worldBoot;
  spatial.playerVisibleZombies = gameRuntime.playerVisibleZombies;
  spatial.rebuildPlayerSpatialGrid = gameRuntime.rebuildPlayerSpatialGrid;
  spatial.broadcastPlayerMove = gameRuntime.broadcastPlayerMove;

  gameRuntime.startResourceRegen(io, stack.decorItems, stack.decorCore.makeDecorItem, worldPersist);
  gameRuntime.startServer();

  return { app, server, io, stack, gameRuntime };
}

module.exports = { bootstrapGameServer };
