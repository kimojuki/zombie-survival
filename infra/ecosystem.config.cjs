/**
 * PM2 — prod Infomaniak (exemple)
 * Usage : pm2 start infra/ecosystem.config.cjs
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
