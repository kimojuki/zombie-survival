/** Constantes partagées du moteur client (boot + décor backlog). */

export const ENGINE_VERSION = '1.4.1';

export const BootPhase = Object.freeze({
  SCRIPTS: 'scripts',
  WORLD: 'world',
  SYNC: 'sync',
  INIT_VIS: 'init-vis',
  STEADY: 'steady',
});

export const DEFER = Object.freeze({ PAUSE: 420, RESUME: 380 });

export const LOD_MID = Object.freeze({
  boot: { pause: 200, high: 280 },
  sector: { pause: 125, high: 215 },
  normal: { pause: 105, high: 175 },
});

export const DecorPriority = Object.freeze({
  LOD: 'lod',
  DEFER: 'defer',
  BALANCED: 'balanced',
});
