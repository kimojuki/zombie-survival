'use strict';

const fs = require('fs');
const path = require('path');

function createClientVersionLoader(clientPublicDir) {
  const filePath = path.join(clientPublicDir, 'client-version.json');

  function load() {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      const version = String(data.version || data.build || '').trim();
      return version || 'dev';
    } catch {
      return 'dev';
    }
  }

  return { load, filePath };
}

module.exports = { createClientVersionLoader };
