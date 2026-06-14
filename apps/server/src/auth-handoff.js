'use strict';

const { getAuthInternalUrl, getAuthInternalKey } = require('./auth-mode');

async function exchangeHandoffWithAuth(code, { serverId } = {}) {
  const url = `${getAuthInternalUrl()}/api/auth/exchange`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const internalKey = getAuthInternalKey();
  if (internalKey) headers['X-Auth-Internal'] = internalKey;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, serverId }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

module.exports = { exchangeHandoffWithAuth };
