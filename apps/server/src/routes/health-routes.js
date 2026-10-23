'use strict';

/**
 * Routes publiques de statut — /api/health, /api/public/status, etc.
 */
function registerHealthRoutes(app, deps) {
  const {
    getClientVersion,
    getServerReady,
    getBootStatus,
    getPlayerCount,
    gitCommit,
    invDebugBuild,
    serverRole,
    isQaServer,
    isDevServer,
    getAuthMode,
    isAuthStandalone,
    getDecorStats,
    rconEnabled,
    loadServersConfig,
    resolveServersForClient,
    clientPublic,
  } = deps;

  app.get('/api/client-version', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ version: getClientVersion() });
  });

  app.get('/api/public/status', (req, res) => {
    res.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    const online = getPlayerCount();
    const capacity = 250;
    const ready = getServerReady();
    res.json({
      ok: ready,
      ready,
      online,
      capacity,
      slotsRemaining: Math.max(0, capacity - online),
      fillPct: capacity > 0 ? Math.round((online / capacity) * 100) : 0,
      status: ready ? 'online' : 'starting',
      serverRole,
    });
  });

  app.get('/api/health', (req, res) => {
    const ready = getServerReady();
    if (!ready) {
      return res.status(503).json({
        ok: false,
        ready: false,
        status: 'starting',
        boot: { ...getBootStatus() },
      });
    }
    res.json({
      ok: true,
      ready: true,
      players: getPlayerCount(),
      uptime: Math.floor(process.uptime()),
      rcon: rconEnabled(),
      chat: true,
      commit: gitCommit,
      clientVersion: getClientVersion(),
      serverRole,
      decor: getDecorStats(),
      invDebugBuild,
    });
  });

  app.get('/api/server-info', (req, res) => {
    res.json({
      role: serverRole,
      qaEnabled: isQaServer(),
      devOnly: isDevServer(),
      guestEnabled: !isDevServer(),
      registerEnabled: !isDevServer(),
      authMode: getAuthMode(),
      handoffEnabled: isAuthStandalone(),
    });
  });

  app.get('/api/servers', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const origin = host ? `${proto}://${host}`.replace(/\/+$/, '') : '';
    const config = loadServersConfig(clientPublic, serverRole);
    res.json(resolveServersForClient(config, origin));
  });
}

module.exports = { registerHealthRoutes };
