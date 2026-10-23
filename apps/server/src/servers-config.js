'use strict';

const fs = require('fs');
const path = require('path');

const PLACEHOLDER_PROD = '__PROD__';
const PLACEHOLDER_TEAM = '__TEAM__';
/** Preview Infomaniak semi-prod (branche main) — pote */
const DEFAULT_PROD_URL = 'https://3k51myccypp.preview.infomaniak.website';

function _readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function _normalizeUrl(url) {
  if (url == null || url === '' || url === '@current') return '';
  return String(url).replace(/\/+$/, '');
}

/**
 * @param {string} clientPublicDir
 * @param {string} [serverRole='prod']
 */
function loadServersConfig(clientPublicDir, serverRole = 'prod') {
  const filePath = path.join(clientPublicDir, 'servers.json');
  const base = _readJsonFile(filePath) || { defaultId: 'auto', servers: [] };

  const teamUrl = _normalizeUrl(process.env.ZS_TEAM_URL || 'https://survival.badom.ch');
  const prodUrl = _normalizeUrl(
    process.env.ZS_PROD_URL || (serverRole === 'prod' ? '' : DEFAULT_PROD_URL),
  );

  const servers = (base.servers || []).map((s) => {
    let url = s.url;
    if (url === PLACEHOLDER_TEAM) url = teamUrl;
    else if (url === PLACEHOLDER_PROD) {
      url = prodUrl || (serverRole === 'prod' ? '' : '');
    } else {
      url = _normalizeUrl(url);
    }
    return {
      id: s.id,
      name: s.name,
      role: s.role || 'prod',
      url,
      description: s.description || '',
      badge: s.badge || String(s.role || 'prod').toUpperCase(),
    };
  });

  return {
    defaultId: base.defaultId || 'auto',
    servers,
    teamUrl,
    prodUrl,
    prodUrlConfigured: !!prodUrl,
    serverRole,
  };
}

/**
 * @param {ReturnType<typeof loadServersConfig>} config
 * @param {string} [requestOrigin] e.g. https://survival.badom.ch
 */
function resolveServersForClient(config, requestOrigin) {
  const origin = _normalizeUrl(requestOrigin || '');
  const { serverRole, prodUrlConfigured } = config;

  const servers = config.servers.map((s) => {
    let url = s.url;
    if (url && origin && url === origin) url = '';
    const prodUrlMissing = s.id === 'prod' && !prodUrlConfigured && serverRole !== 'prod';
    return { ...s, url, prodUrlMissing };
  });

  let defaultId = config.defaultId;
  if (defaultId === 'auto') {
    const byRole = servers.find((s) => s.role === serverRole);
    defaultId = byRole?.id || servers[0]?.id || 'prod';
  }

  return {
    defaultId,
    servers,
    prodUrlConfigured,
    serverRole,
  };
}

module.exports = {
  PLACEHOLDER_PROD,
  PLACEHOLDER_TEAM,
  DEFAULT_PROD_URL,
  loadServersConfig,
  resolveServersForClient,
};
