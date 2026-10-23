'use strict';

// Compatibility entrypoint: production and older scripts can still run
// `node server.js` while the actual server lives in apps/server.
require('./apps/server');
