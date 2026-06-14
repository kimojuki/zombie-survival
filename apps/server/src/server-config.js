'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClientVersionLoader } = require('./client-version');

function parseUserSet(envKey) {
  return (process.env[envKey] || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function readGitCommit(serverDir) {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: serverDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Config serveur — env, chemins client, owners, JWT.
 */
function createServerConfig(serverDir, { dbClient }) {
  const rootDir = path.resolve(serverDir, '../..');
  const clientRoot = path.join(rootDir, 'apps/client');
  const clientSrc = path.join(clientRoot, 'src');
  const clientDist = path.join(rootDir, 'build/client');
  const clientPublic = path.join(clientRoot, 'public');

  const useClientBuild =
    process.env.USE_CLIENT_BUILD === 'true'
    || (process.env.NODE_ENV === 'production'
      && fs.existsSync(path.join(clientDist, 'index.html')));

  const getClientVersion = () => {
    const dir = useClientBuild ? clientDist : clientPublic;
    return createClientVersionLoader(dir).load();
  };

  const ownerUsers = new Set([
    ...parseUserSet('OWNER_USERS'),
    ...parseUserSet('ADMIN_USERS'),
  ]);

  const rconAutoAdmin = process.env.RCON_AUTO_ADMIN === 'true'
    && dbClient === 'sqlite';

  const rconPassword = process.env.RCON_PASSWORD
    || (dbClient === 'sqlite' ? 'dev' : '');

  return {
    rootDir,
    clientRoot,
    clientSrc,
    clientDist,
    clientPublic,
    useClientBuild,
    getClientVersion,
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'dev_secret_CHANGE_ME',
    worldRadius: 290,
    zombieCount: 70,
    gitCommit: readGitCommit(serverDir),
    ownerUsers,
    adminUsers: ownerUsers,
    rconAutoAdmin,
    rconPassword,
  };
}

function authFromHeader(req, jwtSecret) {
  const jwt = require('jsonwebtoken');
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

module.exports = { createServerConfig, authFromHeader, parseUserSet };
