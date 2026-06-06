'use strict';

const API_ROUTES = Object.freeze({
  health: '/api/health',
  rcon: '/api/rcon',
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    me: '/api/auth/me',
  },
});

module.exports = { API_ROUTES };
