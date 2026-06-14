// Nametags + visibilite decor
function _findNameTag(mesh) {
    if (!mesh) return null;
    if (mesh.userData.nameTag) return mesh.userData.nameTag;
    for (let i = 0; i < mesh.children.length; i++) {
      const ch = mesh.children[i];
      if (ch?.isSprite && ch.userData?.isNameTag) return ch;
    }
    return null;
  }

  function _updateNameTagVisibility(mesh, camX, camZ, camHeadY) {
    const tag = _findNameTag(mesh);
    if (!tag) return;
    if (!mesh.visible) {
      tag.visible = false;
      return;
    }
    const tx = mesh.position.x;
    const tz = mesh.position.z;
    const dist = Math.hypot(tx - camX, tz - camZ);
    if (dist < 1.5) {
      tag.visible = true;
      return;
    }
    const targetHeadY = mesh.position.y + 1.55;
    const headY = Math.max(camHeadY, targetHeadY) - 0.08;
    const cols = ZS.getCollidersNear?.(
      (camX + tx) * 0.5,
      (camZ + tz) * 0.5,
      dist * 0.5 + 8,
    ) || [];
    tag.visible = ZS.hasHeadLineOfSight
      ? ZS.hasHeadLineOfSight(camX, camZ, tx, tz, cols, headY, { endpointShrink: 0.35 })
      : true;
  }

  function _tickNameTagOcclusion(camX, camZ, camHeadY) {
    _nameTagLosAcc++;
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 92) return;
    if (_initVisRevealBusy()) return;
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    const stride = (fps != null && fps < 16) || _isSectorLoadBusy() ? 5 : 3;
    if (_nameTagLosAcc % stride !== 0) return;
    remotePlayers.forEach((rp) => _updateNameTagVisibility(rp.mesh, camX, camZ, camHeadY));
    sleepingBodies.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
    deathCorpses.forEach((entry) => _updateNameTagVisibility(entry.mesh, camX, camZ, camHeadY));
  }

  function _decorVisStride() {
    const n = decorItems.size;
    let stride;
    if (_inBootGrace()) stride = 24;
    else if (_postSpawnVisualBusy()) stride = 64;
    else if (n > 2500) stride = 28;
    else if (n > 2200) stride = 22;
    else if (n > 1400) stride = 12;
    else if (n > 800) stride = 8;
    else stride = 4;
    if (_sectorDecorCooldown() || _inPostSectorDrainSoft()) stride += 10;
    const deferN = _decorSpawnDefer.pending.length;
    if (deferN > 350) stride += 8;
    else if (deferN > 200) stride += 4;
    if (_lodPendingCount() > LOD_BACKLOG_MID) stride += 4;
    return stride;
  }

  function _decorVisBatchSize(n) {
    const fps = ZS.PerfMonitor?.getStats?.()?.fps;
    let batch = n;
    if (n <= 1200) return n;
    if (n > 2500) batch = 260;
    else if (n > 2000) batch = 320;
    else batch = 420;
    if (fps != null && fps < 16) batch = Math.floor(batch * 0.65);
    else if (fps != null && fps < 20) batch = Math.floor(batch * 0.82);
    if (_isSectorLoadBusy()) batch = Math.floor(batch * 0.75);
    return batch;
  }

  function _updateDecorVisEntry(entry, id, px, pz, visR2) {
    if (!entry?.root || _isPinnedDecor(entry.data, id)) {
      if (entry?.root) entry.root.visible = true;
      return;
    }
    const dx = (entry.data?.x ?? entry.root.position.x) - px;
    const dz = (entry.data?.z ?? entry.root.position.z) - pz;
    const d2 = dx * dx + dz * dz;
    entry.root.visible = d2 <= visR2;
  }

  function _tickDecorVisibility(px, pz) {
    if (_tickInitVisReveal(px, pz)) return;
    const fpsStats = ZS.PerfMonitor?.getStats?.();
    if (fpsStats?.frameMsMax != null && fpsStats.frameMsMax > 100) return;
    if (fpsStats?.frameMsP95 != null && fpsStats.frameMsP95 > 85) return;
    if (fpsStats?.fps != null && fpsStats.fps < 12) return;
    _decorVisAcc++;
    const stride = _decorVisStride();
    const moved2 = Number.isFinite(_decorVisLastPx)
      ? (px - _decorVisLastPx) ** 2 + (pz - _decorVisLastPz) ** 2
      : Infinity;
    const stationary = moved2 < 2.25;
    const effectiveStride = stationary ? stride * 3 : stride;
    if (_decorVisAcc % effectiveStride !== 0) return;
    _decorVisLastPx = px;
    _decorVisLastPz = pz;
    const t0 = performance.now();
    const visR2 = _decorVisRadius2();
    const n = decorItems.size;
    const batchAll = n <= 1200;
    if (batchAll) {
      decorItems.forEach((entry, id) => _updateDecorVisEntry(entry, id, px, pz, visR2));
    } else {
      if (!_decorVisRing || _decorVisRing.length !== n) {
        _decorVisRing = [];
        decorItems.forEach((entry, id) => _decorVisRing.push([id, entry]));
        _decorVisCursor = 0;
      }
      const batch = _decorVisBatchSize(n);
      const len = _decorVisRing.length;
      let processed = 0;
      let i = _decorVisCursor;
      while (processed < batch && processed < len) {
        const row = _decorVisRing[i];
        if (row) _updateDecorVisEntry(row[1], row[0], px, pz, visR2);
        i++;
        processed++;
        if (i >= len) i = 0;
      }
      _decorVisCursor = i;
    }
    const ms = performance.now() - t0;
    if (ms >= 25 && ZS.LoadLog?.isEnabled?.()) {
      ZS.LoadLog.post('decor-visibility-tick', {
        ms: Math.round(ms),
        decorCount: decorItems.size,
      });
    }
  }
