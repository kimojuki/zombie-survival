/**
 * FrameRunner — exécute les workers décor selon le plan scheduler (priorité + budget).
 */

export function createFrameRunner() {
  let _balancedAcc = 0;

  /**
   * @param {object} opts
   * @param {number} opts.budgetMs — budget décor restant
   * @param {number} opts.t0 — performance.now() début tick
   * @param {object|null} opts.plan — résultat BacklogScheduler.evaluate
   * @param {object} opts.workers — { lod, defer, vis, loaders }
   */
  function runDecorWorkers(opts) {
    const budgetMs = opts.budgetMs ?? 0;
    const t0 = opts.t0 ?? performance.now();
    const plan = opts.plan;
    const w = opts.workers ?? {};
    if (budgetMs <= 0) return { ran: false, priority: null };

    const deferN = plan?.pressure?.defer ?? 0;
    const priority = plan?.criticalSurge ? 'defer' : (plan?.priority ?? 'balanced');

    const withinBudget = () => performance.now() - t0 < budgetMs;
    const runLod = () => { if (withinBudget() && w.lod) w.lod(); };
    const runDefer = () => { if (w.defer) w.defer(Math.max(0, budgetMs - (performance.now() - t0))); };
    const runVis = () => { if (withinBudget() && w.vis) w.vis(); };
    const runLoaders = () => {
      if (withinBudget() && w.loaders) w.loaders();
    };

    if (priority === 'lod') {
      runLod();
      if (deferN > 120 && withinBudget()) runDefer();
      if (withinBudget()) runVis();
      if (withinBudget()) runLoaders();
    } else if (priority === 'defer') {
      runDefer();
      if (withinBudget()) runVis();
      if (withinBudget()) runLoaders();
    } else {
      const phase = (_balancedAcc++ % 3);
      if (phase === 0) { runLod(); runDefer(); runVis(); runLoaders(); }
      else if (phase === 1) { runDefer(); runLod(); runVis(); runLoaders(); }
      else { runVis(); runLod(); runDefer(); runLoaders(); }
    }

    return { ran: true, priority };
  }

  function resetBalancedRotation() {
    _balancedAcc = 0;
  }

  return {
    runDecorWorkers,
    resetBalancedRotation,
  };
}
