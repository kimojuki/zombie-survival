/**
 * Engine.Telemetry — logs structurés moteur (wrap LoadLog + snapshots backlog).
 */

const SNAPSHOT_INTERVAL_MS = 8000;

export function createTelemetry(ZS) {
  let _lastSnapshotAt = 0;
  let _bootPhase = 'scripts';

  function setBootPhase(phase) {
    _bootPhase = phase || 'scripts';
  }

  function getBootPhase() {
    return _bootPhase;
  }

  function postBacklogSnapshot(plan, extra) {
    const LL = ZS?.LoadLog;
    if (!LL?.isEnabled?.()) return;
    const now = performance.now();
    if (now - _lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
    _lastSnapshotAt = now;
    const p = plan?.pressure ?? {};
    const content = ZS?.Engine?.ContentLoader?.getStats?.() ?? null;
    const chunks = ZS?.Engine?.ChunkStreamer?.getStats?.() ?? null;
    LL.post('engine-backlog-snapshot', {
      bootPhase: _bootPhase,
      phase: plan?.phase ?? null,
      priority: plan?.priority ?? null,
      defer: p.defer,
      lod: p.lodTotal,
      lodNear: p.lodNear,
      lodMid: p.lodMid,
      lodPressure: p.lodPressure,
      urgent: p.lodUrgent,
      deferForced: !!plan?.deferForced,
      streamReason: plan?.reasons?.stream ?? null,
      contentCritical: content?.critical ?? null,
      contentPending: content?.pending ?? null,
      chunkForest: chunks?.layers?.forest?.total ?? null,
      chunkBeach: chunks?.layers?.beach?.total ?? null,
      chunkRoads: chunks?.layers?.roads?.total ?? null,
      ...extra,
    });
  }

  function postContentSnapshot() {
    const LL = ZS?.LoadLog;
    const loader = ZS?.Engine?.ContentLoader;
    if (!LL?.isEnabled?.() || !loader) return;
    LL.post('engine-content-snapshot', loader.getStats());
  }

  function markEngineReady() {
    ZS?.LoadLog?.mark?.('engine-ready', { version: ZS?.Engine?.version ?? null });
  }

  return {
    setBootPhase,
    getBootPhase,
    postBacklogSnapshot,
    postContentSnapshot,
    markEngineReady,
  };
}
