/**
 * Utilitaires partagés — bench socket + bench navigateur.
 */
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(__dir, '..');

dotenv.config({ path: join(rootDir, '.env') });

export const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

/** Événement client → serveur pour la position (ne pas confondre avec player-move broadcast). */
export const SOCKET_CLIENT_MOVE = 'move';

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[i];
}

export function numStats(values) {
  const nums = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!nums.length) return null;
  return {
    min: nums[0],
    max: nums[nums.length - 1],
    avg: Math.round(nums.reduce((s, v) => s + v, 0) / nums.length),
    p50: pct(nums, 0.5),
    p95: pct(nums, 0.95),
  };
}

export function warnBenchEnv() {
  if (process.env.PERF_LOCAL_BENCH !== '1') {
    console.warn('[bench] PERF_LOCAL_BENCH=1 requis dans .env (SQLite localhost)');
  }
}

export async function waitForHealth(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ready) return data;
    } catch { /* retry */ }
    await sleep(500);
  }
  throw new Error(`Serveur non prêt : ${baseUrl}/api/health`);
}

export async function fetchHealth() {
  try {
    const r = await fetch(`${baseUrl}/api/health`);
    return await r.json();
  } catch {
    return null;
  }
}

export async function benchToken(slot) {
  const res = await fetch(`${baseUrl}/api/dev/bench-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`bench-token slot ${slot}: ${res.status} ${body.error || res.statusText}`);
  }
  return body;
}

/** Vérifie bench-token + purge sleepers zsbench avant le bench. */
export async function preflightBench() {
  warnBenchEnv();
  const health = await waitForHealth();
  try {
    await benchToken(998);
  } catch (err) {
    throw new Error(
      `${err.message}\n→ Redémarre le serveur sur ${baseUrl} avec PERF_LOCAL_BENCH=1 (SQLite).`,
    );
  }
  try {
    const res = await fetch(`${baseUrl}/api/dev/bench-reset`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.purged) {
      console.log('[bench] sleepers zsbench purgés', body.purged);
    }
  } catch { /* optionnel si serveur ancien */ }
  return health;
}

/** Pagination décor comme un client qui explore. */
export async function fetchDecorPages(x, z, minR = 320) {
  const out = { treePages: 0, propPages: 0, bytes: 0, treeItems: 0, propItems: 0 };
  let offset = 0;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(
      `${baseUrl}/api/world/decor-trees?x=${x}&z=${z}&minR=${minR}&offset=${offset}&limit=80`,
    );
    const data = await r.json().catch(() => ({}));
    out.treePages++;
    out.bytes += JSON.stringify(data).length;
    out.treeItems += data.count || 0;
    if (!data.hasMore) break;
    offset = data.nextOffset ?? offset + (data.count || 0);
  }
  offset = 0;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(
      `${baseUrl}/api/world/decor-props?x=${x}&z=${z}&minR=${minR}&offset=${offset}&limit=60`,
    );
    const data = await r.json().catch(() => ({}));
    out.propPages++;
    out.bytes += JSON.stringify(data).length;
    out.propItems += data.count || 0;
    if (!data.hasMore) break;
    offset = data.nextOffset ?? offset + (data.count || 0);
  }
  return out;
}

/** Échantillonne /api/health pendant le bench (pic joueurs, décor). */
export class HealthSampler {
  constructor(intervalMs = 2000) {
    this.intervalMs = intervalMs;
    this.samples = [];
    this.peakPlayers = 0;
    this._timer = null;
  }

  start() {
    const tick = async () => {
      const h = await fetchHealth();
      if (!h?.ready) return;
      this.samples.push({
        t: Date.now(),
        players: h.players ?? 0,
        decor: h.decor?.total ?? h.decor?.count ?? null,
        uptime: h.uptime,
      });
      if ((h.players ?? 0) > this.peakPlayers) this.peakPlayers = h.players;
    };
    tick();
    this._timer = setInterval(tick, this.intervalMs);
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  summary() {
    const players = this.samples.map((s) => s.players).filter(Number.isFinite);
    return {
      samples: this.samples.length,
      peakPlayers: this.peakPlayers,
      players: numStats(players),
    };
  }
}

/** Budgets de régression vs run précédent (ratio max ou delta ms). */
export const DEFAULT_REGRESSION_BUDGETS = {
  spawnReadyP50Ratio: 1.25,
  syncDecorP50Ratio: 1.3,
  syncCollidersP50Ratio: 1.35,
  syncCollidersP50MinMs: 2500,
  fpsWalkP50MinAbs: 3,
  gameInitP95Ratio: 1.2,
  /** Sous ce seuil, game-init p95 est considéré « bruit » (variance bench socket). */
  gameInitP95MinMs: 500,
  fpsWalkP50MinRatio: 0.85,
  drawCallsMaxRatio: 1.15,
  meshVisibleRatioMax: 0.92,
};

export function meshVisibleRatio(snapshot) {
  const meshes = snapshot?.scene?.meshes;
  const visible = snapshot?.scene?.meshVisible;
  if (!Number.isFinite(meshes) || meshes <= 0 || !Number.isFinite(visible)) return null;
  return Math.round((visible / meshes) * 1000) / 1000;
}

export function avgMeshVisibleRatio(clients, phase = 'snapshotWalk') {
  const ratios = (clients || [])
    .map((c) => meshVisibleRatio(c[phase]))
    .filter(Number.isFinite);
  if (!ratios.length) return null;
  return Math.round((ratios.reduce((s, v) => s + v, 0) / ratios.length) * 1000) / 1000;
}

function deltaPct(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function pickMetric(obj, path) {
  let v = obj;
  for (const k of path) {
    if (v == null) return null;
    v = v[k];
  }
  return Number.isFinite(v) ? v : null;
}

/** Compare le rapport courant au précédent (latest ou history). */
export function compareBenchReports(prev, curr, budgets = DEFAULT_REGRESSION_BUDGETS) {
  if (!prev || !curr) return { hasPrevious: false, deltas: [], regressions: [] };

  const metrics = [
    { key: 'spawnReadyP50', path: ['browsers', 'spawnReadyMs', 'p50'], label: 'spawn p50', unit: 'ms', higherIsWorse: true },
    { key: 'syncDecorP50', path: ['browsers', 'syncDecorMs', 'p50'], label: 'sync décor p50', unit: 'ms', higherIsWorse: true },
    { key: 'syncCollidersP50', path: ['browsers', 'syncCollidersMs', 'p50'], label: 'colliders p50', unit: 'ms', higherIsWorse: true },
    { key: 'gameInitP95', path: ['socket', 'gameInit', 'p95'], label: 'game-init p95', unit: 'ms', higherIsWorse: true },
    { key: 'fpsWalkP50', path: ['browsers', 'fpsWalk', 'p50'], label: 'FPS marche p50', unit: '', higherIsWorse: false },
    { key: 'drawCalls', path: ['browsers', 'drawCallsWalkAvg'], label: 'draw calls', unit: '', higherIsWorse: true },
    { key: 'meshVisibleRatio', path: ['browsers', 'meshVisibleRatioAvg'], label: 'mesh visible ratio', unit: '', higherIsWorse: true },
  ];

  const deltas = [];
  const regressions = [];
  const warnings = [];

  for (const m of metrics) {
    const before = pickMetric(prev, m.path);
    const after = pickMetric(curr, m.path);
    if (!Number.isFinite(before) && !Number.isFinite(after)) continue;
    const entry = {
      key: m.key,
      label: m.label,
      before,
      after,
      deltaPct: deltaPct(after, before),
      unit: m.unit,
    };
    deltas.push(entry);

    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;

    if (m.key === 'spawnReadyP50' && after > before * budgets.spawnReadyP50Ratio) {
      regressions.push(`${m.label} ${after}${m.unit} > ${Math.round(before * budgets.spawnReadyP50Ratio)}${m.unit}`);
    } else if (m.key === 'syncDecorP50' && after > before * budgets.syncDecorP50Ratio) {
      regressions.push(`${m.label} ${after}${m.unit} > ${Math.round(before * budgets.syncDecorP50Ratio)}${m.unit}`);
    } else if (m.key === 'syncCollidersP50'
      && after > before * (budgets.syncCollidersP50Ratio ?? 1.35)
      && after >= (budgets.syncCollidersP50MinMs ?? 2500)) {
      regressions.push(`${m.label} ${after}${m.unit} > ${Math.round(before * (budgets.syncCollidersP50Ratio ?? 1.35))}${m.unit}`);
    } else if (m.key === 'gameInitP95'
      && after > before * budgets.gameInitP95Ratio
      && after >= (budgets.gameInitP95MinMs ?? 500)) {
      regressions.push(`${m.label} ${after}${m.unit} > ${Math.round(before * budgets.gameInitP95Ratio)}${m.unit}`);
    } else if (m.key === 'fpsWalkP50'
      && before >= (budgets.fpsWalkP50MinAbs ?? 3)
      && after < before * budgets.fpsWalkP50MinRatio) {
      regressions.push(`${m.label} ${after} < ${Math.round(before * budgets.fpsWalkP50MinRatio * 10) / 10}`);
    } else if (m.key === 'drawCalls' && after > before * budgets.drawCallsMaxRatio) {
      warnings.push(`${m.label} ${after} > ${Math.round(before * budgets.drawCallsMaxRatio)} (variance caméra)`);
    } else if (m.key === 'meshVisibleRatio'
      && Number.isFinite(before)
      && after > budgets.meshVisibleRatioMax
      && after > before) {
      warnings.push(`${m.label} ${after} > budget ${budgets.meshVisibleRatioMax}`);
    }
  }

  return {
    hasPrevious: true,
    previousAt: prev.capturedAt,
    deltas,
    regressions,
    warnings,
  };
}

export async function loadPreviousBenchReport(latestPath) {
  try {
    const raw = await readFile(latestPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function buildScore(report) {
  const socketOk = report.socket?.successRate ?? 100;
  const fpsP50 = report.browsers?.fpsWalk?.p50 ?? report.browsers?.fpsSampledDuringWalk?.p50 ?? 0;
  const spawnP50 = report.browsers?.spawnReadyMs?.p50 ?? 0;
  const walkM = report.browsers?.walkDistanceAvgM ?? 0;
  const drawCalls = report.browsers?.drawCallsWalkAvg ?? 0;
  const initP95 = report.socket?.gameInit?.p95 ?? 0;

  const browserCap = fpsP50 >= 25 ? 50 : fpsP50 >= 15 ? 25 : fpsP50 >= 8 ? 12 : fpsP50 >= 3 ? 5 : 2;
  const socketCap = initP95 <= 500 ? 300 : initP95 <= 2000 ? 100 : initP95 <= 5000 ? 50 : 25;

  return {
    realisticBrowserPlayers: browserCap,
    realisticSocketBots: socketCap,
    bottleneck: fpsP50 < 15 ? 'client-gpu' : initP95 > 3000 ? 'server-game-init' : 'balanced',
    notes: [
      `FPS p50 ${fpsP50} → ~${browserCap} navigateurs réalistes (estimation)`,
      `game-init p95 ${initP95}ms → ~${socketCap} bots socket`,
      `spawn p50 ${Math.round(spawnP50 / 1000)}s, décor sync p50 ${report.browsers?.syncDecorMs?.p50 ?? '—'}ms`,
      `marche moyenne ${walkM}m, draw calls ${drawCalls}`,
    ],
  };
}

export function formatBenchMarkdown(report) {
  const v = report.verdict;
  const s = report.score;
  const cmp = report.compare;
  const lines = [
    `# Bench réaliste — ${report.capturedAt}`,
    '',
    `**Verdict:** ${v.pass ? 'PASS' : 'FAIL'}${v.reasons?.length ? ` (${v.reasons.join('; ')})` : ''}`,
    '',
    '## Résumé',
    '',
    `| Métrique | Valeur |`,
    `|----------|--------|`,
    `| Durée | ${Math.round(report.durationMs / 1000)} s |`,
    `| Socket | ${report.socket?.connected ?? '—'}/${report.socket?.attempted ?? '—'} |`,
    `| game-init p95 | ${report.socket?.gameInit?.p95 ?? '—'} ms |`,
    `| Clients Chromium | ${report.browsers?.count ?? 0} |`,
    `| Spawn p50 | ${report.browsers?.spawnReadyMs?.p50 ?? '—'} ms |`,
    `| Sync décor p50 | ${report.browsers?.syncDecorMs?.p50 ?? '—'} ms |`,
    `| Colliders p50 | ${report.browsers?.syncCollidersMs?.p50 ?? '—'} ms |`,
    `| FPS marche p50 | ${report.browsers?.fpsWalk?.p50 ?? '—'} |`,
    `| Draw calls | ${report.browsers?.drawCallsWalkAvg ?? '—'} |`,
    `| Mesh visible ratio | ${report.browsers?.meshVisibleRatioAvg ?? '—'} |`,
    `| Marche moy. | ${report.browsers?.walkDistanceAvgM ?? '—'} m |`,
    '',
    '## Capacité estimée',
    '',
    `- Navigateurs réalistes : **~${s?.realisticBrowserPlayers ?? '?'}**`,
    `- Bots socket (réseau) : **~${s?.realisticSocketBots ?? '?'}**`,
    `- Goulot : **${s?.bottleneck ?? '?'}**`,
    '',
  ];
  if (cmp?.hasPrevious && cmp.deltas?.length) {
    lines.push('## Delta vs précédent', '');
    lines.push(`Référence : ${cmp.previousAt}`, '');
    for (const d of cmp.deltas) {
      const sign = Number.isFinite(d.deltaPct) ? (d.deltaPct > 0 ? '+' : '') + d.deltaPct + '%' : '—';
      lines.push(`- ${d.label}: ${d.before ?? '—'} → ${d.after ?? '—'} (${sign})`);
    }
    lines.push('');
    if (cmp.regressions?.length) {
      lines.push('**Régressions détectées :**', '');
      for (const r of cmp.regressions) lines.push(`- ${r}`);
      lines.push('');
    }
    if (cmp.warnings?.length) {
      lines.push('**Avertissements (non bloquants) :**', '');
      for (const w of cmp.warnings) lines.push(`- ${w}`);
      lines.push('');
    }
  }
  if (s?.notes?.length) {
    lines.push('## Notes', '');
    for (const n of s.notes) lines.push(`- ${n}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildVerdict(report, thresholds) {
  const reasons = [];
  const t = thresholds;

  if (report.socket?.attempted) {
    const rate = report.socket.connected / report.socket.attempted;
    if (rate < t.minSocketSuccess) {
      reasons.push(`socket success ${Math.round(rate * 100)}% < ${Math.round(t.minSocketSuccess * 100)}%`);
    }
    const p95 = report.socket.gameInit?.p95 ?? report.socket.gameInit?.msP95;
    if (Number.isFinite(p95) && p95 > t.maxInitP95Ms) {
      reasons.push(`game-init p95 ${p95}ms > ${t.maxInitP95Ms}ms`);
    }
  }

  if (report.browsers?.count) {
    const minFps = report.browsers.fpsWalk?.min;
    if (Number.isFinite(minFps) && minFps < t.minFpsWalk) {
      reasons.push(`FPS walk min ${minFps} < ${t.minFpsWalk}`);
    }
    const notMoved = report.browsers.clients?.filter((c) => c.walkDistanceM != null && c.walkDistanceM < t.minWalkM);
    if (notMoved?.length) {
      reasons.push(`${notMoved.length} client(s) n'ont pas marché (< ${t.minWalkM}m)`);
    }
    const spawnP95 = report.browsers.spawnReadyMs?.p95;
    if (Number.isFinite(spawnP95) && spawnP95 > t.maxSpawnReadyMs) {
      reasons.push(`spawn ready p95 ${spawnP95}ms > ${t.maxSpawnReadyMs}ms`);
    }
  }

  if (report.compare?.regressions?.length) {
    for (const r of report.compare.regressions) {
      reasons.push(`régression: ${r}`);
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    thresholds: t,
  };
}
