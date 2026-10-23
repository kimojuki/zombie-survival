import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadServersConfig, resolveServersForClient } from '../apps/server/src/servers-config.js';

const PUBLIC = path.join(process.cwd(), 'apps/client/public');

test('loadServersConfig resolves team and prod placeholders', () => {
  const prevTeam = process.env.ZS_TEAM_URL;
  const prevProd = process.env.ZS_PROD_URL;
  process.env.ZS_TEAM_URL = 'https://survival.badom.ch';
  process.env.ZS_PROD_URL = 'https://preview-pote.infomaniak.com';

  const cfg = loadServersConfig(PUBLIC, 'qa');
  const dev = cfg.servers.find((s) => s.id === 'dev');
  const prod = cfg.servers.find((s) => s.id === 'prod');
  assert.equal(dev?.url, 'https://survival.badom.ch');
  assert.equal(prod?.url, 'https://preview-pote.infomaniak.com');

  if (prevTeam != null) process.env.ZS_TEAM_URL = prevTeam;
  else delete process.env.ZS_TEAM_URL;
  if (prevProd != null) process.env.ZS_PROD_URL = prevProd;
  else delete process.env.ZS_PROD_URL;
});

test('resolveServersForClient collapses same origin', () => {
  const prevTeam = process.env.ZS_TEAM_URL;
  process.env.ZS_TEAM_URL = 'https://survival.badom.ch';
  const cfg = loadServersConfig(PUBLIC, 'qa');
  const resolved = resolveServersForClient(cfg, 'https://survival.badom.ch');
  const qa = resolved.servers.find((s) => s.id === 'qa');
  assert.equal(qa?.url, '');
  assert.equal(resolved.defaultId, 'qa');
  if (prevTeam != null) process.env.ZS_TEAM_URL = prevTeam;
  else delete process.env.ZS_TEAM_URL;
});

test('prod default URL on team server when ZS_PROD_URL unset', () => {
  const prevProd = process.env.ZS_PROD_URL;
  delete process.env.ZS_PROD_URL;
  const cfg = loadServersConfig(PUBLIC, 'qa');
  const prod = cfg.servers.find((s) => s.id === 'prod');
  assert.equal(prod?.url, 'https://3k51myccypp.preview.infomaniak.website');
  assert.equal(cfg.prodUrlConfigured, true);
  if (prevProd != null) process.env.ZS_PROD_URL = prevProd;
});

test('prod on prod host uses current origin when ZS_PROD_URL unset', () => {
  const prevProd = process.env.ZS_PROD_URL;
  delete process.env.ZS_PROD_URL;
  const cfg = loadServersConfig(PUBLIC, 'prod');
  const prod = cfg.servers.find((s) => s.id === 'prod');
  assert.equal(prod?.url, '');
  if (prevProd != null) process.env.ZS_PROD_URL = prevProd;
});
