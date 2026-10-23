'use strict';

const API_ROUTES = Object.freeze({
  health: '/api/health',
  publicStatus: '/api/public/status',
  rcon: '/api/rcon',
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    guest: '/api/auth/guest',
    upgradeGuest: '/api/auth/upgrade-guest',
    me: '/api/auth/me',
  },
});

module.exports = { API_ROUTES };
