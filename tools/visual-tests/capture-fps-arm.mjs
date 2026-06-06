/**
 * Capture screenshots of FPS arm preview (Chromium headless).
 * Usage: npm run test:visual
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dir, '..', '..');
const outDir = join(rootDir, 'notes-local', 'screenshots');
const visualPort = process.env.VISUAL_PORT || '3200';
const baseUrl = process.env.BASE_URL || `http://localhost:${visualPort}`;

async function waitForServer(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server not ready at ' + baseUrl);
}

async function capture(page, name, query = '') {
  await page.goto(`${baseUrl}/arm-preview.html${query}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__ARM_PREVIEW_READY__ === true, { timeout: 30000 });
  await page.waitForTimeout(200);
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log('Saved', path);
  return path;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  let serverProc = null;
  try {
    await fetch(`${baseUrl}/api/health`);
  } catch {
    console.log('Starting server…');
    serverProc = spawn(process.execPath, ['server.js'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: visualPort,
      },
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(25000);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await capture(page, 'arm-empty', '');
  await capture(page, 'arm-bottle', '?item=food_eau_bouteille');
  await capture(page, 'arm-bottle-use', '?item=food_eau_bouteille&anim=use');
  await capture(page, 'arm-hatchet', '?item=tool_hachette');
  await capture(page, 'arm-hatchet-melee', '?item=tool_hachette&anim=melee');
  await capture(page, 'arm-pistol', '?item=wpn_pistolet');
  await capture(page, 'arm-pistol-reload', '?item=wpn_pistolet&anim=reload');

  await browser.close();
  if (serverProc) serverProc.kill();

  await writeFile(join(outDir, 'latest.txt'), new Date().toISOString() + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
