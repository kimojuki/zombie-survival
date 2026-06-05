/**
 * PM2 — prod Infomaniak (exemple)
 * Usage : pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'zombie',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
    // Optionnel — webhook auto-deploy (voir docs/DEPLOY.md)
    // {
    //   name: 'zombie-deploy-hook',
    //   script: 'scripts/webhook-deploy.js',
    //   cwd: __dirname,
    //   instances: 1,
    //   autorestart: true,
    // },
  ],
};
