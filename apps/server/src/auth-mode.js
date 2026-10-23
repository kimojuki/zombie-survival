'use strict';

const AUTH_MODES = Object.freeze({ embedded: 'embedded', standalone: 'standalone' });

function getAuthMode() {
  const raw = (process.env.AUTH_MODE || AUTH_MODES.embedded).toLowerCase();
  return raw === AUTH_MODES.standalone ? AUTH_MODES.standalone : AUTH_MODES.embedded;
}

function isAuthStandalone() {
  return getAuthMode() === AUTH_MODES.standalone;
}

function getAuthInternalUrl() {
  return (process.env.AUTH_INTERNAL_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
}

function getAuthInternalKey() {
  return process.env.AUTH_INTERNAL_KEY || '';
}

module.exports = {
  getAuthMode,
  isAuthStandalone,
  getAuthInternalUrl,
  getAuthInternalKey,
};
