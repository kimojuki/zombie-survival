#!/usr/bin/env node
/**
 * Backup fichiers DB avant deploy — évite perte progression si rollback nécessaire.
 * Appelé par scripts/deploy-prod.sh ; utilisable en local : npm run backup:pre-deploy
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function copySqliteFiles(srcPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const base = path.basename(srcPath);
  const files = [srcPath, `${srcPath}-wal`, `${srcPath}-shm`];
  let copied = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const dest = path.join(destDir, path.basename(f));
    fs.copyFileSync(f, dest);
    copied += 1;
  }
  return { copied, destDir, base };
}

function resolveSqlitePath() {
  const raw = process.env.SQLITE_PATH || 'database/local-dev.sqlite';
  return path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
}

function backupMysql(outFile) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const pass = process.env.DB_PASS || '';
  const db = process.env.DB_NAME || 'zombie_mobile_db';
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const passPart = pass ? `-p"${pass.replace(/"/g, '\\"')}"` : '';
  execSync(
    `mysqldump -h "${host}" -P "${port}" -u "${user}" ${passPart} --single-transaction "${db}" > "${outFile}"`,
    { stdio: 'inherit', shell: true },
  );
  return outFile;
}

function main() {
  loadEnvFile();
  const client = (process.env.DB_CLIENT || 'mysql').toLowerCase();
  const backupRoot = path.join(ROOT, 'database', 'backups');
  const tag = `pre-deploy-${stamp()}`;

  console.log(`[pre-deploy-backup] start client=${client} tag=${tag}`);

  if (client === 'sqlite') {
    const sqlitePath = resolveSqlitePath();
    if (!fs.existsSync(sqlitePath)) {
      console.warn(`[pre-deploy-backup] WARN: sqlite not found (${sqlitePath}) — skip`);
      process.exit(0);
    }
    const destDir = path.join(backupRoot, tag);
    const result = copySqliteFiles(sqlitePath, destDir);
    console.log(`[pre-deploy-backup] OK sqlite copied=${result.copied} → ${destDir}`);
    process.exit(0);
  }

  if (client === 'mysql') {
    const outFile = path.join(backupRoot, `${tag}.sql`);
    try {
      backupMysql(outFile);
      const size = fs.statSync(outFile).size;
      console.log(`[pre-deploy-backup] OK mysql dump ${size} bytes → ${outFile}`);
      process.exit(0);
    } catch (err) {
      console.error(`[pre-deploy-backup] ERROR mysqldump failed: ${err.message}`);
      console.error('[pre-deploy-backup] Faites un backup manuel avant deploy (API full backup ou Infomaniak snapshot)');
      process.exit(1);
    }
  }

  console.warn(`[pre-deploy-backup] WARN: unknown DB_CLIENT=${client} — skip`);
  process.exit(0);
}

main();
