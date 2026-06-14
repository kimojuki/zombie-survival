'use strict';

function isLocalhostReq(req) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Routes dev/bench (Playwright load-test) + QA checklist — localhost / SQLite only.
 */
function registerDevRoutes(app, deps) {
  const {
    log,
    jwt,
    JWT_SECRET,
    getPlayer,
    createPlayer,
    savePlayerState,
    bcrypt,
    authPayload,
    serverRole,
    isQaServer,
    authFromHeader,
    qaChecklist,
    getSleepingPlayers,
    deleteWorldSleeper,
    beachSpawn,
    benchSave,
    isBenchUsername,
    getScenarioBeach,
  } = deps;

  function benchLocalAllowed(req) {
    if (process.env.PERF_LOCAL_BENCH !== '1') return false;
    if ((process.env.DB_CLIENT || '').toLowerCase() !== 'sqlite') return false;
    return isLocalhostReq(req);
  }

  function benchSpawnForSlot(slot) {
    const angle = (slot * 0.618033988) * Math.PI * 2;
    const r = 6 + (slot % 16) * 2.2;
    return {
      x: beachSpawn.x + Math.cos(angle) * r,
      y: beachSpawn.y,
      z: beachSpawn.z + Math.sin(angle) * r,
      rotY: beachSpawn.rotY,
    };
  }

  function parsePlayerInv(raw) {
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch {
      return {};
    }
  }

  async function ensureBenchPlayerReady(player, slot) {
    const scenMod = await getScenarioBeach();
    const spawn = benchSpawnForSlot(slot);
    const inv = parsePlayerInv(player.inventory);
    if (scenMod.isAct1Done(inv.scenario)) return player;
    inv.scenario = {
      act: 'beach',
      step: 'act1_done',
      completed: true,
      version: 2,
      tutorialZombieId: null,
      tutorialKilled: false,
    };
    await savePlayerState(
      player.id,
      spawn.x, spawn.y, spawn.z, spawn.rotY,
      player.health ?? 100,
      player.kills ?? 0,
      JSON.stringify(inv),
      player.username,
    );
    return getPlayer(player.username);
  }

  app.post('/api/dev/perf-login', async (req, res) => {
    if (process.env.PERF_LOCAL_BENCH !== '1') {
      return res.status(404).json({ error: 'disabled' });
    }
    if ((process.env.DB_CLIENT || '').toLowerCase() !== 'sqlite') {
      return res.status(403).json({ error: 'sqlite only' });
    }
    if (!isLocalhostReq(req)) {
      return res.status(403).json({ error: 'localhost only' });
    }
    const username = String(req.body?.username || process.env.PERF_USER || '').trim();
    if (!username) return res.status(400).json({ error: 'username required' });
    try {
      const player = await getPlayer(username);
      if (!player) return res.status(404).json({ error: 'Joueur introuvable' });
      const token = jwt.sign(
        { id: player.id, username: player.username },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
      res.json({
        token,
        username: player.username,
        ...authPayload(player.username),
        serverRole,
      });
    } catch (err) {
      log.error('auth', 'perf-login failed', { username, err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/dev/bench-token', async (req, res) => {
    if (!benchLocalAllowed(req)) {
      return res.status(404).json({ error: 'disabled' });
    }
    const slot = parseInt(req.body?.slot, 10);
    if (!Number.isFinite(slot) || slot < 0 || slot > 999) {
      return res.status(400).json({ error: 'slot 0–999 required' });
    }
    const username = `zsbench_${String(slot).padStart(4, '0')}`;
    try {
      let player = await getPlayer(username);
      if (!player) {
        const hash = await bcrypt.hash(`bench-${slot}-${JWT_SECRET}`, 12);
        await createPlayer(username, hash, benchSave, benchSpawnForSlot(slot));
        player = await getPlayer(username);
      }
      if (!player) return res.status(500).json({ error: 'bench user create failed' });
      player = await ensureBenchPlayerReady(player, slot);
      if (!player) return res.status(500).json({ error: 'bench user prepare failed' });
      const token = jwt.sign(
        { id: player.id, username: player.username },
        JWT_SECRET,
        { expiresIn: '1h' },
      );
      res.json({ token, username, slot });
    } catch (err) {
      log.error('auth', 'bench-token failed', { username, err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/dev/bench-reset', async (req, res) => {
    if (!benchLocalAllowed(req)) {
      return res.status(404).json({ error: 'disabled' });
    }
    let purged = 0;
    try {
      for (const [key, sleep] of [...getSleepingPlayers().entries()]) {
        if (!isBenchUsername(sleep.username)) continue;
        getSleepingPlayers().delete(key);
        await deleteWorldSleeper(key).catch(() => {});
        purged++;
      }
      res.json({ ok: true, purged, sleepersRemaining: getSleepingPlayers().size });
    } catch (err) {
      log.error('auth', 'bench-reset failed', { err: err.message });
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/qa/checklist', async (req, res) => {
    if (!isQaServer()) return res.status(404).json({ ok: false, error: 'QA indisponible sur ce serveur' });
    const user = authFromHeader(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
    try {
      const data = await qaChecklist.listItemsForTester(user.username);
      res.json({ ok: true, ...data });
    } catch (err) {
      log.error('qa', 'checklist failed', { err: err.message });
      res.status(500).json({ ok: false, error: 'Erreur serveur' });
    }
  });

  app.post('/api/qa/verdict', async (req, res) => {
    if (!isQaServer()) return res.status(404).json({ ok: false, error: 'QA indisponible sur ce serveur' });
    const user = authFromHeader(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Non authentifié' });
    const { itemId, verdict, feedback } = req.body || {};
    try {
      const result = await qaChecklist.submitVerdict(itemId, user.username, verdict, feedback);
      if (!result.ok) {
        const status = result.err === 'feedback_required' ? 400 : 409;
        return res.status(status).json(result);
      }
      res.json(result);
    } catch (err) {
      log.error('qa', 'verdict failed', { err: err.message });
      res.status(500).json({ ok: false, error: 'Erreur serveur' });
    }
  });
}

module.exports = { registerDevRoutes };
