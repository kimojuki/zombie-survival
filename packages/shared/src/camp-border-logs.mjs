/** Placement des rondins de lisière camp spawn — source partagée client / serveur. */

export const CAMP_BORDER_LOG = Object.freeze({
  SPAWN_CX: 0,
  SPAWN_CZ: -6,
  CLEAR_RX: 5.8,
  CLEAR_RZ: 5.2,
  GAP_CENTER: -Math.PI / 2,
  GAP_WIDTH: 0.52,
  RING_SCALE: 0.94,
  BASE_LOG_LEN: 0.42,
  LOG_R: 0.055,
  MIN_LOG_COUNT: 16,
});

function _ellipseWorld(a, rx, rz, cx, cz) {
  return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
}

function _ellipseTangentYaw(a, rx, rz) {
  return Math.atan2(-rx * Math.sin(a), rz * Math.cos(a));
}

function _ellipseArcLength(rx, rz, a0, a1, steps = 80) {
  let len = 0;
  let px = null;
  let pz = null;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (i / steps) * (a1 - a0);
    const x = rx * Math.cos(a);
    const z = rz * Math.sin(a);
    if (px !== null) len += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return len;
}

/**
 * @param {number} [cx]
 * @param {number} [cz]
 * @returns {{ x: number, z: number, rotY: number, scale: number, logLen: number }[]}
 */
export function computeCampBorderLogPlacements(cx, cz) {
  const cfg = CAMP_BORDER_LOG;
  cx = Number.isFinite(cx) ? cx : cfg.SPAWN_CX;
  cz = Number.isFinite(cz) ? cz : cfg.SPAWN_CZ;
  const ringRx = cfg.CLEAR_RX * cfg.RING_SCALE;
  const ringRz = cfg.CLEAR_RZ * cfg.RING_SCALE;
  const arcStart = cfg.GAP_CENTER + cfg.GAP_WIDTH;
  const arcSpan = Math.PI * 2 - cfg.GAP_WIDTH * 2;
  const arcLen = _ellipseArcLength(ringRx, ringRz, arcStart, arcStart + arcSpan);
  const logCount = Math.max(cfg.MIN_LOG_COUNT, Math.round(arcLen / cfg.BASE_LOG_LEN));
  const logLen = arcLen / logCount;
  const scale = logLen / cfg.BASE_LOG_LEN;
  const out = [];

  for (let i = 0; i < logCount; i++) {
    const tMid = (i + 0.5) / logCount;
    const a = arcStart + tMid * arcSpan;
    const [x, z] = _ellipseWorld(a, ringRx, ringRz, cx, cz);
    out.push({
      x,
      z,
      rotY: _ellipseTangentYaw(a, ringRx, ringRz),
      scale,
      logLen,
    });
  }
  return out;
}
