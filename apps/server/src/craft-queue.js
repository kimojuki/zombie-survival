'use strict';

function ensureCraftQueue(p) {
  if (!Array.isArray(p.craftQueue)) p.craftQueue = [];
  if (p.craftActive == null) p.craftActive = null;
  if (!p._craftJobSeq) p._craftJobSeq = 0;
}

function canAffordRecipe(inv, recipe, countInvType) {
  for (const [type, qty] of Object.entries(recipe.ingredients)) {
    if (countInvType(inv, type) < qty) return false;
  }
  return true;
}

function consumeRecipeIngredients(inv, recipe, removeStackFromInv) {
  for (const [type, qty] of Object.entries(recipe.ingredients)) {
    if (!removeStackFromInv(inv, type, qty)) return false;
  }
  return true;
}

function enqueueCraft(p, recipeId, ops, recipeMod) {
  ensureCraftQueue(p);
  const recipe = recipeMod.findCraftRecipe(recipeId);
  if (!recipe) return { ok: false, err: 'unknown_recipe' };
  if (p.craftQueue.length >= recipeMod.CRAFT_MAX_QUEUE) return { ok: false, err: 'queue_full' };
  if (!canAffordRecipe(p.inv, recipe, ops.countInvType)) {
    return { ok: false, err: 'insufficient_resources' };
  }
  if (!consumeRecipeIngredients(p.inv, recipe, ops.removeStackFromInv)) {
    return { ok: false, err: 'consume_failed' };
  }
  const job = {
    id: ++p._craftJobSeq,
    recipeId: recipe.id,
    result: recipe.result,
    qty: recipe.qty || 1,
    duration: recipeMod.defaultCraftDuration(recipe),
    remaining: 0,
    state: 'waiting',
  };
  p.craftQueue.push(job);
  return { ok: true, job };
}

function cancelCraftJob(p, jobId, ops, recipeMod) {
  ensureCraftQueue(p);
  const idx = p.craftQueue.findIndex((j) => j.id === jobId && j.state === 'waiting');
  if (idx < 0) return { ok: false, err: 'not_found' };
  const job = p.craftQueue.splice(idx, 1)[0];
  const recipe = recipeMod.findCraftRecipe(job.recipeId);
  if (recipe) {
    for (const [type, qty] of Object.entries(recipe.ingredients)) {
      ops.addStackToInv(p.inv, { type, qty });
    }
  }
  return { ok: true };
}

function tickCraftQueues(players, dt, ops) {
  for (const p of players.values()) {
    ensureCraftQueue(p);
    if (p.craftActive) {
      const job = p.craftActive;
      job.remaining -= dt;
      if (job.remaining <= 0) {
        const res = ops.addStackToInv(p.inv, { type: job.result, qty: job.qty });
        p.craftActive = null;
        p._craftPendingComplete = { job, leftover: res.leftover };
      }
    } else if (p.craftQueue.length > 0) {
      const job = p.craftQueue[0];
      if (job.state === 'waiting') {
        job.state = 'active';
        job.remaining = job.duration;
        p.craftActive = job;
        p.craftQueue.shift();
      }
    }
  }
}

function getCraftQueueState(p) {
  ensureCraftQueue(p);
  const active = p.craftActive
    ? { ...p.craftActive, state: 'active' }
    : null;
  return {
    queue: p.craftQueue.map((j) => ({ ...j })),
    active,
  };
}

module.exports = {
  enqueueCraft,
  cancelCraftJob,
  tickCraftQueues,
  getCraftQueueState,
};
