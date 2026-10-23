// Loaders arbres/props differees
async function _fetchDeferredTreesBatch() {
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (_treeDefer.loading || !_treeDefer.hasMore) return;
    const lp = getLocalXZ();
    const th = _lodMidStreamThresholds();
    if (_lodMidRingPendingCount(lp.x, lp.z) > th.high) return;
    _treeDefer.loading = true;
    if (_resetFetchOffsetIfMoved(_treeDefer.sx, _treeDefer.sz)) _treeDefer.offset = 0;
    const minR = _deferTreeRadius();
    const limit = _inStreamSoftStart()
      ? (ZS._isMobile ? 16 : 24)
      : (ZS._isMobile ? 64 : 100);
    try {
      const res = await fetch(
        `/api/world/decor-trees?x=${encodeURIComponent(_treeDefer.sx)}&z=${encodeURIComponent(_treeDefer.sz)}`
        + `&minR=${minR}&limit=${limit}&offset=${_treeDefer.offset}`,
      );
      if (!res.ok) {
        _treeDefer.hasMore = false;
        return;
      }
      const json = await res.json();
      const list = (json.items || []).filter((d) => d?.id && !decorItems.has(d.id));
      for (let i = 0; i < list.length; i++) _treeDefer.queue.push(list[i]);
      _treeDefer.offset = json.nextOffset ?? (_treeDefer.offset + list.length);
      _treeDefer.hasMore = !!json.hasMore;
    } catch (e) {
      console.warn('[sync] fetch arbres lointains', e);
      _treeDefer.hasMore = false;
    } finally {
      _treeDefer.loading = false;
    }
  }

  function _beginDeferredTrees(sx, sz) {
    _resetTreeDefer();
    _treeDefer.sx = sx;
    _treeDefer.sz = sz;
    _treeDefer.active = true;
    ZS.LoadLog?.post?.('deferred-trees-start', { x: Math.round(sx), z: Math.round(sz) });
    _fetchDeferredTreesBatch();
  }

  async function _fetchDeferredPropsBatch() {
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (_propDefer.loading || !_propDefer.hasMore) return;
    _propDefer.loading = true;
    if (_resetFetchOffsetIfMoved(_propDefer.sx, _propDefer.sz)) _propDefer.offset = 0;
    const minR = _deferTreeRadius();
    const limit = ZS._isMobile ? 48 : 80;
    try {
      const res = await fetch(
        `/api/world/decor-props?x=${encodeURIComponent(_propDefer.sx)}&z=${encodeURIComponent(_propDefer.sz)}`
        + `&minR=${minR}&limit=${limit}&offset=${_propDefer.offset}`,
      );
      if (res.status === 404) {
        _propDefer.hasMore = false;
        return;
      }
      if (!res.ok) {
        _propDefer.hasMore = false;
        return;
      }
      const json = await res.json();
      const list = json.items || [];
      for (let i = 0; i < list.length; i++) _queueDeferredProp(list[i]);
      _propDefer.offset = json.nextOffset ?? (_propDefer.offset + list.length);
      _propDefer.hasMore = !!json.hasMore;
      ZS.DevLog?.sync?.('decor-props-batch', {
        count: list.length,
        offset: _propDefer.offset,
        hasMore: _propDefer.hasMore,
        pending: _decorSpawnDefer.pending.length,
      });
    } catch (e) {
      console.warn('[sync] fetch props lointains', e);
      _propDefer.hasMore = false;
    } finally {
      _propDefer.loading = false;
    }
  }

  function _beginDeferredProps(sx, sz) {
    _resetPropDefer();
    _propDefer.sx = sx;
    _propDefer.sz = sz;
    _propDefer.active = true;
    ZS.LoadLog?.post?.('deferred-props-start', {
      x: Math.round(sx),
      z: Math.round(sz),
      pendingDecor: _decorSpawnDefer.pending.length,
    });
    _fetchDeferredPropsBatch();
  }

  function _tickDeferredPropLoader() {
    if (_postSpawnVisualBusy()) return;
    if (!_decorTickHeavyAllowed()) return;
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (!_propDefer.active) return;
    if (_propDefer.hasMore && !_propDefer.loading) {
      _fetchDeferredPropsBatch();
    }
    if (!_propDefer.hasMore && !_propDefer.loading) _propDefer.active = false;
  }

  function _tickDeferredTreeLoader() {
    if (_postSpawnVisualBusy() || _initVisRevealBusy()) return;
    if (!_decorTickHeavyAllowed()) return;
    const block = _deferLoaderBlockReason();
    if (block) {
      _setTreeFetchGate(block);
      return;
    }
    _setTreeFetchGate('');
    if (!_treeDefer.active) return;
    const lp = getLocalXZ();
    const lodMid = _lodMidRingPendingCount(lp.x, lp.z);
    const th = _lodMidStreamThresholds();
    if (lodMid > th.high) return;
    let maxSpawn = ZS._isMobile ? 3 : 6;
    if (_inStreamSoftStart()) maxSpawn = Math.min(maxSpawn, ZS._isMobile ? 2 : 3);
    if (lodMid > th.pause * 0.85) maxSpawn = Math.min(maxSpawn, ZS._isMobile ? 3 : 5);
    if (_treeDefer.queue.length < 24 && _treeDefer.hasMore && !_treeDefer.loading) {
      _fetchDeferredTreesBatch();
    }
    if (!_treeDefer.queue.length) {
      if (!_treeDefer.hasMore && !_treeDefer.loading) {
        if (_treeDefer.active) {
          _treeDefer.active = false;
          _scheduleDeferredTreeResnap();
        }
      }
      return;
    }
    const t0 = performance.now();
    const budget = _decorTickBudgetMs() || 8;
    _beginColliderBatch();
    let n = 0;
    let qi = 0;
    while (qi < _treeDefer.queue.length && n < maxSpawn && performance.now() - t0 < budget) {
      const d = _treeDefer.queue[qi];
      const simpleLod = _treeSpawnSimpleLod(d, lp.x, lp.z);
      if (lodMid > th.pause && simpleLod) {
        qi++;
        continue;
      }
      _treeDefer.queue.splice(qi, 1);
      _spawnDecorItem(d, { simpleLod, fastGround: true });
      n++;
    }
    _endColliderBatch();
    if (n > 0 && ZS.LoadLog?.isEnabled?.()) {
      const now = performance.now();
      const done = !_treeDefer.queue.length && !_treeDefer.hasMore;
      if (done || now - _treeDeferLogLast >= 4000) {
        _treeDeferLogLast = now;
        ZS.LoadLog.post('deferred-trees-spawn', {
          spawned: n,
          queue: _treeDefer.queue.length,
          hasMore: _treeDefer.hasMore,
          done,
        });
      }
    }
  }
