'use strict';

/**
 * Séquence de boot — timing par étape + résumé final pour la console et les fichiers log.
 */
function createBootReport(log) {
  const t0 = Date.now();
  const steps = [];

  function banner(meta = {}) {
    log.banner('Zombie Survival — démarrage serveur', {
      node: process.version,
      pid: process.pid,
      cwd: process.cwd(),
      env: process.env.NODE_ENV || 'development',
      ...meta,
    });
  }

  async function step(name, fn, opts = {}) {
    const label = opts.label || name;
    const tStep = Date.now();
    log.info('boot', `▶ ${label}`);
    try {
      const result = await fn();
      const ms = Date.now() - tStep;
      const extra = result && typeof result === 'object' && !Array.isArray(result) ? result : {};
      steps.push({ step: name, label, ms, ok: true, ...extra });
      log.info('boot', `✓ ${label}`, { ms, ...extra });
      return result;
    } catch (err) {
      const ms = Date.now() - tStep;
      const errMsg = err?.message || String(err);
      steps.push({ step: name, label, ms, ok: false, error: errMsg });
      log.error('boot', `✗ ${label}`, { ms, err: errMsg });
      if (opts.critical) throw err;
      return null;
    }
  }

  function finish(extra = {}) {
    const totalMs = Date.now() - t0;
    const failed = steps.filter((s) => !s.ok);
    log.bootSummary({
      totalMs,
      steps: steps.map(({ label, ms, ok, error }) => ({ step: label, ms, ok, error })),
      failed: failed.length,
      ...extra,
    });
    return { totalMs, steps, failed };
  }

  return { banner, step, finish, steps };
}

module.exports = { createBootReport };
