/**
 * Point d'entrée moteur client v2 — chargé avant les scripts legacy (game.html).
 */
import { ENGINE_VERSION, BootPhase, DEFER, LOD_MID, DecorPriority } from './constants.js';
import { createBacklogScheduler } from './backlog-scheduler.js';
import { createFrameRunner } from './frame-runner.js';
import { createTelemetry } from './telemetry.js';
import { createBudgetGovernor } from './budget-governor.js';
import { createWorldContentLoader } from './world-content-loader.js';
import { createDecorPressure } from '../net/decor-pressure.js';
import { createSpatialChunkStreamer } from './spatial-chunk-streamer.js';
import { CHUNK_SIZE } from './spatial-chunk-keys.js';
import { isP0GameplayDecor } from './content-priority.js';
import { createDecorGapMonitor } from './decor-gap-monitor.js';
import { createLodGapMonitor } from './lod-gap-monitor.js';

export function installEngine(ZS) {
  if (!ZS) throw new Error('installEngine requires ZS facade');
  if (ZS.Engine?.version) return ZS.Engine;

  const BacklogScheduler = createBacklogScheduler();
  const FrameRunner = createFrameRunner();
  const BudgetGovernor = createBudgetGovernor();
  const ContentLoader = createWorldContentLoader();
  const ChunkStreamer = createSpatialChunkStreamer({ chunkSize: CHUNK_SIZE });
  const Telemetry = createTelemetry(ZS);
  const DecorPressure = createDecorPressure(BacklogScheduler, Telemetry);

  const DecorGapMonitor = createDecorGapMonitor(ZS);
  const LodGapMonitor = createLodGapMonitor(ZS);

  ZS.Engine = {
    version: ENGINE_VERSION,
    BootPhase,
    DecorPriority,
    BacklogScheduler,
    FrameRunner,
    BudgetGovernor,
    ContentLoader,
    ChunkStreamer,
    DecorPressure,
    Telemetry,
    DecorGapMonitor,
    LodGapMonitor,
    CHUNK_SIZE,
    isP0GameplayDecor,
  };

  // Compat legacy — retiré quand network.js n'importe plus ZS.BacklogScheduler directement
  ZS.BacklogScheduler = BacklogScheduler;

  Telemetry.markEngineReady();
  ZS.DecorGapMonitor = DecorGapMonitor;
  ZS.LodGapMonitor = LodGapMonitor;
  return ZS.Engine;
}

if (typeof window !== 'undefined') {
  window.ZS = window.ZS || {};
  installEngine(window.ZS);
}
