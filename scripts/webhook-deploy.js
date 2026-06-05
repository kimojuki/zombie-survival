#!/usr/bin/env node
/**
 * Webhook GitHub → déploiement auto (alternative au cron).
 * Écoute en local ; exposer via reverse proxy Infomaniak si besoin.
 *
 * .env prod :
 *   DEPLOY_WEBHOOK_SECRET=...   (secret GitHub webhook)
 *   DEPLOY_WEBHOOK_PORT=9090    (défaut 9090)
 *
 * pm2 : pm2 start scripts/webhook-deploy.js --name zombie-deploy-hook
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SECRET = process.env.DEPLOY_WEBHOOK_SECRET || '';
const PORT = parseInt(process.env.DEPLOY_WEBHOOK_PORT || '9090', 10);
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy-prod.sh');
const BRANCH = process.env.ZOMBIE_DEPLOY_BRANCH || 'master';

let deploying = false;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [webhook] ${msg}`);
}

function verifySignature(rawBody, sigHeader) {
  if (!SECRET || !sigHeader) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch {
    return false;
  }
}

function runDeploy() {
  if (deploying) {
    log('deploy already running — skip');
    return Promise.resolve({ ok: true, skipped: true });
  }
  deploying = true;
  return new Promise((resolve) => {
    execFile('bash', [DEPLOY_SCRIPT], { timeout: 120000 }, (err, stdout, stderr) => {
      deploying = false;
      if (stdout) log(stdout.trim());
      if (stderr) log(stderr.trim());
      if (err) {
        log(`deploy failed: ${err.message}`);
        resolve({ ok: false, error: err.message });
      } else {
        log('deploy triggered OK');
        resolve({ ok: true });
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, deploying }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (!SECRET) {
    res.writeHead(503);
    res.end('DEPLOY_WEBHOOK_SECRET not configured');
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const sig = req.headers['x-hub-signature-256'];

  if (!verifySignature(raw, sig)) {
    log('invalid signature');
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    res.writeHead(400);
    res.end('Bad JSON');
    return;
  }

  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    res.writeHead(200);
    res.end('ignored event');
    return;
  }

  const ref = payload.ref || '';
  const wantRef = `refs/heads/${BRANCH}`;
  if (ref !== wantRef) {
    log(`ignore push on ${ref}`);
    res.writeHead(200);
    res.end('ignored branch');
    return;
  }

  const result = await runDeploy();
  res.writeHead(result.ok ? 200 : 500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

server.listen(PORT, '127.0.0.1', () => {
  log(`listening on 127.0.0.1:${PORT} (POST /deploy, GET /health)`);
  if (!SECRET) log('WARN: DEPLOY_WEBHOOK_SECRET empty — webhook disabled until configured');
});
