/**
 * PM2 — Infomaniak Node managé (sans Docker)
 *
 * Un process par défaut (AUTH_MODE=embedded) :
 *   pm2 start infra/ecosystem.config.cjs
 *   pm2 save
 *
 * Deux process si AUTH_MODE=standalone dans .env :
 *   zombie + zombie-auth
 *
 * Deploy auto : scripts/deploy-prod.sh
 * Doc : docs/INFOMANIAK_NODE.md
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

/** Lit une clé depuis .env (sans dépendance dotenv). */
function readEnvKey(key, fallback = '') {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return fallback;
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    if (k !== key) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  }
  return fallback;
}

const authMode = (readEnvKey('AUTH_MODE', 'embedded') || 'embedded').toLowerCase();
const gameName = readEnvKey('ZOMBIE_PM2_NAME', 'zombie') || 'zombie';
const authName = readEnvKey('ZOMBIE_PM2_AUTH_NAME', 'zombie-auth') || 'zombie-auth';

const sharedProdEnv = {
  NODE_ENV: 'production',
  TRUST_PROXY: readEnvKey('TRUST_PROXY', 'true') || 'true',
};

const apps = [
  {
    name: gameName,
    script: 'apps/server/index.js',
    cwd: rootDir,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '768M',
    kill_timeout: 60_000,
    listen_timeout: 15_000,
    env: { ...sharedProdEnv },
  },
];

if (authMode === 'standalone') {
  apps.push({
    name: authName,
    script: 'apps/auth-server/index.js',
    cwd: rootDir,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '384M',
    kill_timeout: 30_000,
    env: {
      NODE_ENV: 'production',
    },
  });
}

module.exports = { apps };
