'use strict';

const VALID_ROLES = new Set(['dev', 'qa', 'prod']);

function getServerRole() {
  const role = (process.env.SERVER_ROLE || 'prod').toLowerCase();
  return VALID_ROLES.has(role) ? role : 'prod';
}

function isDevServer() {
  return getServerRole() === 'dev';
}

function isQaServer() {
  return getServerRole() === 'qa';
}

function isProdServer() {
  return getServerRole() === 'prod';
}

module.exports = {
  VALID_ROLES,
  getServerRole,
  isDevServer,
  isQaServer,
  isProdServer,
};
