'use strict';

require('dotenv').config();

const { bootstrapGameServer } = require('./src/bootstrap-game-server');

bootstrapGameServer(__dirname).catch((err) => {
  console.error('[boot] fatal', err);
  process.exit(1);
});
