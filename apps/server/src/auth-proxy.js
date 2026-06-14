'use strict';

const { getAuthInternalUrl, getAuthInternalKey } = require('./auth-mode');

/**
 * @param {object} deps
 * @param {object} [deps.log]
 */
function createAuthProxy(deps = {}) {
  const { log } = deps;
  const baseUrl = getAuthInternalUrl();

  return async function authProxy(req, res) {
    const targetUrl = `${baseUrl}${req.originalUrl}`;
    const headers = {
      'Content-Type': req.get('content-type') || 'application/json',
      Accept: 'application/json',
    };
    if (req.get('authorization')) headers.Authorization = req.get('authorization');
    const fwd = req.get('x-forwarded-for');
    if (fwd) headers['X-Forwarded-For'] = fwd;
    else if (req.ip) headers['X-Forwarded-For'] = req.ip;
    if (req.get('user-agent')) headers['User-Agent'] = req.get('user-agent');
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    if (host) headers['X-Forwarded-Host'] = host;
    if (proto) headers['X-Forwarded-Proto'] = proto;

    const internalKey = getAuthInternalKey();
    if (internalKey) headers['X-Auth-Internal'] = internalKey;

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = JSON.stringify(req.body ?? {});
    }

    try {
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });
      const text = await upstream.text();
      res.status(upstream.status);
      const ct = upstream.headers.get('content-type');
      if (ct) res.set('Content-Type', ct);
      res.send(text);
    } catch (err) {
      log?.error?.('auth', 'proxy failed', { url: targetUrl, err: err.message });
      res.status(502).json({ error: 'Serveur auth indisponible', code: 'auth_upstream_down' });
    }
  };
}

module.exports = { createAuthProxy };
