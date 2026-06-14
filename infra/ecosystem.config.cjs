/**
 * PM2 — LEGACY preview Infomaniak (Node sur hôte, sans Docker)
 *
 * NOUVELLE PROD : VM Ubuntu + Docker Compose
 *   docs/VM_DEPLOY.md · infra/docker/docker-compose.yml
 *
 * Ancien mode (deprecated) :
 *   pm2 start infra/ecosystem.config.cjs --only zombie
 */
const path = require('path');
const rootDir = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'zombie',
      script: 'apps/server/index.js',
      cwd: rootDir,
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
      },
    },
    // Optionnel — webhook auto-deploy (voir docs/DEPLOY.md)
    // {
    //   name: 'zombie-deploy-hook',
    //   script: 'scripts/webhook-deploy.js',
    //   cwd: rootDir,
    //   instances: 1,
    //   autorestart: true,
    // },
  ],
};
