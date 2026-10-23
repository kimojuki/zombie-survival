/**
 * DecorPressure — construction du plan backlog décor (ES module).
 * Appelé depuis network.js via ZS.Engine.DecorPressure (install.js).
 */
export function createDecorPressure(scheduler, telemetry) {
  /**
   * @param {object} ctx — voir BacklogScheduler.evaluate
   * @returns {object|null} plan
   */
  function evaluate(ctx) {
    const plan = scheduler?.evaluate(ctx) ?? null;
    if (plan) telemetry?.postBacklogSnapshot?.(plan);
    return plan;
  }

  return { evaluate };
}

/**
 * Forme documentée du contexte pression décor (pour migration network → net/).
 * @typedef {object} DecorPressureContext
 * @property {number} deferPending
 * @property {number} lodTotalPending
 * @property {number} lodNearPending
 * @property {number} lodMidPending
 * @property {number} lodUrgentPending
 * @property {boolean} streamActive
 * @property {boolean} initVisActive
 * @property {boolean} initVisDeferBlocked
 * @property {boolean} roadsBusy
 * @property {boolean} sectorDecorBusy
 * @property {boolean} sectorCooldown
 * @property {boolean} postSectorDrain
 * @property {boolean} streamSoft
 * @property {boolean} bootGrace
 * @property {number} recenterUntil
 * @property {boolean} recenterActive
 * @property {boolean} postSpawnVisualBusy
 * @property {boolean} frameRecovering
 * @property {boolean} deferForced
 * @property {boolean} isMobile
 * @property {number|null} fps
 */

export const DEFER_STREAM = Object.freeze({ PAUSE: 420, RESUME: 380 });
export const LOD_URGENT = Object.freeze({ PRESSURE: 40, SPAWN_PAUSE: 80, GATE: 50 });
