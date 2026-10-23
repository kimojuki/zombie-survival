'use strict';

const crypto = require('crypto');

/** Aligné sur packages/shared/src/auth-contract.mjs HANDOFF_TTL_SECONDS */
const HANDOFF_TTL_SECONDS = 60;

function hashExchangeCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateExchangeCode() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateSessionId() {
  return crypto.randomUUID();
}

function exchangeExpiresAt(ttlSeconds = HANDOFF_TTL_SECONDS) {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function isExchangeExpired(sessionRow) {
  if (!sessionRow?.exchange_expires) return true;
  return Date.now() > new Date(sessionRow.exchange_expires).getTime();
}

function isExchangeUsed(sessionRow) {
  return !!sessionRow?.exchange_used_at;
}

function isSessionRevoked(sessionRow) {
  return !!sessionRow?.revoked_at;
}

function isSessionExpired(sessionRow) {
  if (!sessionRow?.expires_at) return true;
  return Date.now() > new Date(sessionRow.expires_at).getTime();
}

module.exports = {
  hashExchangeCode,
  generateExchangeCode,
  generateSessionId,
  exchangeExpiresAt,
  isExchangeExpired,
  isExchangeUsed,
  isSessionRevoked,
  isSessionExpired,
  HANDOFF_TTL_SECONDS,
};
