'use strict';

/** Joueurs en ligne, actions, rôles — extrait de admin-routes.js */
function registerAdminPlayerRoutes(env) {
  const { app, express } = env;
  const {
    log,
    io,
    authFromHeader,
    hasPerm,
    authPayload,
    getRcon,
    rconPassword,
    getPlayers,
    getDecorItems,
    getWorldWaterZones,
    getLootBuildings,
    playerRoles,
    ownerUsers,
    adminRoadStore,
    worldPersist,
    prefabCatalogReviews,
    getDecorPrefabCatalogCache,
    reloadDecorPrefabCatalog,
    decorPrefabs,
    nextDecorId,
    buildAdminDecorCreateItem,
    adminDecorSnapshot,
    applyAdminDecorPatch,
    applyAdminDecorStoragePatch,
    removeDecorItem,
    emitStorageUpdate,
    emitSurvivalUpdate,
    reloadWorldFromDatabase,
    isDecorImmutable,
    getPlacementKey,
    flushWorldPersistCounters,
    worldRadius,
    sectorBoundsMod,
    getWorldTime,
    setWorldTime,
    serverFlags,
    dayDurationSec,
    adminAuth,
    adminDecorAuth,
    adminAuthAny,
    findOnlinePlayer,
    adminSyncPlayerPos,
    marker,
    getWorldBackup,
    adminDecorLayer,
    ADMIN_MAP_STATIC_URL,
    ADMIN_MAP_POIS_URL,
    DECOR_PREFAB_CATALOG_URL,
    PREFAB_CATALOG_REVIEWS_URL,
  } = env;

  app.get('/api/admin/players', (req, res) => {
      const user = adminAuth(req, res, 'players.view');
      if (!user) return;
      const online = [];
      for (const [socketId, p] of getPlayers().entries()) {
        online.push({
          socketId,
          id: p.id,
          username: p.username,
          x: +p.x.toFixed(1),
          y: +p.y.toFixed(1),
          z: +p.z.toFixed(1),
          health: p.health,
          kills: p.kills ?? 0,
          rotY: p.rotY,
          equipped: p.equipped || null,
          isSelf: p.username.toLowerCase() === user.username.toLowerCase(),
          ...authPayload(p.username),
        });
      }
      online.sort((a, b) => a.username.localeCompare(b.username));
      res.json({
        ok: true,
        players: online,
        count: online.length,
        viewer: user.username,
        canManage: hasPerm(user.username, 'players.manage'),
        canRoles: hasPerm(user.username, 'players.roles'),
        updatedAt: Date.now(),
      });
    });
  
    app.post('/api/admin/players/:username/action', (req, res) => {
      const user = adminAuth(req, res, 'players.manage');
      if (!user) return;
      const target = findOnlinePlayer(req.params.username);
      if (!target) return res.status(404).json({ ok: false, error: 'Joueur introuvable ou hors ligne' });
      const actor = findOnlinePlayer(user.username);
      const action = String(req.body?.action || '').trim().toLowerCase();
      let message = '';
  
      switch (action) {
        case 'bring': {
          if (!actor) return res.status(400).json({ ok: false, error: 'Vous devez être connecté en jeu' });
          target.x = actor.x;
          target.y = actor.y;
          target.z = actor.z + 2;
          target.dirty = true;
          adminSyncPlayerPos(target);
          message = `${target.username} amené à votre position`;
          break;
        }
        case 'goto': {
          if (!actor) return res.status(400).json({ ok: false, error: 'Vous devez être connecté en jeu' });
          actor.x = target.x;
          actor.y = target.y;
          actor.z = target.z + 2;
          actor.dirty = true;
          adminSyncPlayerPos(actor);
          message = `Téléporté vers ${target.username}`;
          break;
        }
        case 'heal': {
          target.health = 100;
          if (target._deathHandled) {
            target._deathHandled = false;
            delete target._deathInv;
            delete target._deathPos;
            delete target._deathEquipped;
          }
          if (!target.survival) target.survival = {};
          target.survival.saignement = false;
          target.dirty = true;
          const sock = io.sockets.sockets.get(target.socketId);
          if (sock) emitSurvivalUpdate(sock, target);
          message = `${target.username} soigné (100 HP)`;
          break;
        }
        case 'kick': {
          const sock = io.sockets.sockets.get(target.socketId);
          if (sock) sock.disconnect(true);
          message = `${target.username} expulsé`;
          break;
        }
        case 'tp': {
          const x = Number(req.body?.x);
          const z = Number(req.body?.z);
          if (!Number.isFinite(x) || !Number.isFinite(z)) {
            return res.status(400).json({ ok: false, error: 'Coordonnées x/z requises' });
          }
          target.x = x;
          target.z = z;
          target.dirty = true;
          adminSyncPlayerPos(target);
          message = `${target.username} → ${x.toFixed(1)}, ${z.toFixed(1)}`;
          break;
        }
        default:
          return res.status(400).json({ ok: false, error: 'Action invalide (bring, goto, heal, kick, tp)' });
      }
  
      log.info('admin', 'player action', { by: user.username, target: target.username, action });
      res.json({
        ok: true,
        action,
        target: target.username,
        message,
        player: action === 'kick' ? null : {
          username: target.username,
          x: +target.x.toFixed(1),
          y: +target.y.toFixed(1),
          z: +target.z.toFixed(1),
          health: target.health,
        },
      });
    });
  
    app.get('/api/admin/roles', (req, res) => {
      const user = adminAuth(req, res, 'players.roles');
      if (!user) return;
      res.json({
        ok: true,
        catalog: playerRoles.getCatalog(),
        assignments: playerRoles.listAssignments(),
        owners: [...ownerUsers],
        me: authPayload(user.username),
        updatedAt: Date.now(),
      });
    });
  
    app.get('/api/admin/roles/me', (req, res) => {
      const user = authFromHeader(req);
      if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
      res.json({ ok: true, ...authPayload(user.username), username: user.username });
    });
  
    app.put('/api/admin/roles/:username', async (req, res) => {
      const user = adminAuth(req, res, 'players.roles');
      if (!user) return;
      const target = String(req.params.username || '').trim();
      const roleId = String(req.body?.role || '').trim().toLowerCase();
      if (!target) return res.status(400).json({ ok: false, error: 'username requis' });
      const check = playerRoles.canManageRole(user.username, roleId, target);
      if (!check.ok) return res.status(403).json({ ok: false, error: check.error });
      try {
        const auth = await playerRoles.setRole(target, roleId, user.username);
        for (const [sid, p] of getPlayers().entries()) {
          if (p.username.toLowerCase() === target.toLowerCase()) {
            io.to(sid).emit('admin-role-update', { ...auth, username: p.username });
          }
        }
        log.info('roles', 'api assign', { target, role: roleId, by: user.username });
        res.json({ ok: true, username: target.toLowerCase(), ...auth });
      } catch (err) {
        const code = err.code === 'ENV_OWNER' ? 403 : 400;
        res.status(code).json({ ok: false, error: err.message });
      }
    });
  
    app.delete('/api/admin/roles/:username', async (req, res) => {
      const user = adminAuth(req, res, 'players.roles');
      if (!user) return;
      const target = String(req.params.username || '').trim();
      if (!target) return res.status(400).json({ ok: false, error: 'username requis' });
      const check = playerRoles.canRevoke(user.username, target);
      if (!check.ok) return res.status(403).json({ ok: false, error: check.error });
      try {
        await playerRoles.clearRole(target);
        const auth = authPayload(target);
        for (const [sid, p] of getPlayers().entries()) {
          if (p.username.toLowerCase() === target.toLowerCase()) {
            io.to(sid).emit('admin-role-update', { ...auth, username: p.username });
          }
        }
        res.json({ ok: true, username: target.toLowerCase(), ...auth });
      } catch (err) {
        res.status(403).json({ ok: false, error: err.message });
      }
    });
}

module.exports = { registerAdminPlayerRoutes };
