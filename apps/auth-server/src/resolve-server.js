'use strict';

const path = require('path');
const { loadServersConfig } = require('../../server/src/servers-config');

const CLIENT_PUBLIC = path.join(__dirname, '../../client/public');

function resolveServerEntry(serverId, serverRole) {
  const config = loadServersConfig(CLIENT_PUBLIC, serverRole);
  const entry = config.servers.find((s) => s.id === serverId);
  return { config, entry };
}

/** URL publique du front (landing, play, game) — toujours PORT=3000 / survival.badom.ch */
function publicFrontBaseUrl() {
  const fromEnv = (
    process.env.GAME_PUBLIC_URL
    || process.env.ZS_PUBLIC_URL
    || process.env.ZS_TEAM_URL
    || ''
  ).replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const port = process.env.PORT || process.env.GAME_PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

function resolveGameHandoffUrl(serverId, serverRole, requestOrigin) {
  const { entry } = resolveServerEntry(serverId, serverRole);
  if (!entry) return null;

  // Handoff → game.html sur le front public (:3000), jamais sur AUTH_PORT interne
  let base = publicFrontBaseUrl();
  if (!base && entry.url) base = entry.url.replace(/\/+$/, '');
  if (!base && requestOrigin && !/127\.0\.0\.1|localhost/i.test(requestOrigin)) {
    base = requestOrigin.replace(/\/+$/, '');
  }
  if (!base) base = publicFrontBaseUrl();

  return `${base}/game.html`;
}

module.exports = {
  CLIENT_PUBLIC,
  publicFrontBaseUrl,
  resolveServerEntry,
  resolveGameHandoffUrl,
};
