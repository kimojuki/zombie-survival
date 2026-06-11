/**
 * Horloges décor — conversion worldTime → angles aiguilles (Three.js rotation.z).
 * worldTime : 0–1 (0 = minuit, 0.25 = lever, 0.5 = midi, 0.75 = coucher).
 */

/**
 * @param {number} worldTime
 * @returns {{ hourZ: number, minuteZ: number, hour24: number, minute: number }}
 */
export function worldTimeToClockHands(worldTime) {
  const t = ((Number(worldTime) % 1) + 1) % 1;
  const totalMinutes = t * 24 * 60;
  const minute = totalMinutes % 60;
  const twoPi = Math.PI * 2;
  return {
    // (totalMinutes % 720) : position 12 h sans double comptage minute/heure.
    hourZ: ((totalMinutes % 720) / 720) * twoPi,
    minuteZ: (minute / 60) * twoPi,
    hour24: (totalMinutes / 60) % 24,
    minute: Math.floor(minute),
    totalMinutes,
  };
}

/**
 * Avance rotation.z selon un delta temps (sens horaire, cadran face −Z).
 * @param {number} currentZ
 * @param {number} dMinutes
 * @param {number} periodMinutes — 60 (minute) ou 720 (heure 12 h)
 * @returns {number}
 */
export function advanceClockHandRotationZ(currentZ, dMinutes, periodMinutes) {
  const twoPi = Math.PI * 2;
  return currentZ - (dMinutes / periodMinutes) * twoPi;
}
