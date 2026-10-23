'use strict';

const express = require('express');
const path = require('path');
require('dotenv').config();

const log = require('../server/src/logger');
const authDb = require('./src/auth-db');
const { createSessionService } = require('./src/session-service');
const { createAuthGuestService } = require('./src/guest-service');
const { createAuthRoutes, createServersRoutes } = require('./src/routes/auth');
const { getServerRoleForAuth } = require('./src/access-control');

const app = express();
const PORT = parseInt(process.env.AUTH_PORT || '3001', 10);
const HOST = process.env.AUTH_HOST || '127.0.0.1';
const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'dev_secret_CHANGE_ME';
const SERVER_ROLE = getServerRoleForAuth();

if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '64kb' }));

const sessions = createSessionService({ db: authDb, jwtSecret: JWT_SECRET, log });
const guests = createAuthGuestService({ db: authDb, log });

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ready: true,
    service: 'auth-server',
    serverRole: SERVER_ROLE,
    db: authDb.DB_CLIENT,
  });
});

app.use('/api/auth', createAuthRoutes({ db: authDb, sessions, guests, log }));
app.use('/api', createServersRoutes({ log }));

// Auth-server = service interne uniquement. Le front public reste sur PORT=3000 (survival.badom.ch).
// Ne pas exposer AUTH_PORT sur Cloudflare — le game server :3000 proxy /api/auth/* en Phase B.

app.use((err, req, res, _next) => {
  log.error('auth', 'unhandled', { err: err.message, path: req.path });
  res.status(500).json({ error: 'Erreur serveur' });
});

async function start() {
  await authDb.ensureAuthSchema();
  const sqlitePath = authDb.pool?.path;
  log.info('boot', 'auth-server starting', {
    port: PORT,
    host: HOST,
    serverRole: SERVER_ROLE,
    db: authDb.DB_CLIENT,
    sqlite: sqlitePath,
  });
  app.listen(PORT, HOST, () => {
    log.info('boot', 'auth-server ready', {
      url: `http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`,
    });
  });
}

start().catch((err) => {
  log.error('boot', 'auth-server failed', { err: err.message });
  process.exit(1);
});

module.exports = { app, start };
