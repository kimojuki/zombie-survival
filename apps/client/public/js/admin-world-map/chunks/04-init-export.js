// Init + AdminWorldMap export — admin-world-map.js
function init(opts) {
    canvas = opts.canvas;
    tooltip = opts.tooltip;
    token = opts.token || '';
    onRefresh = opts.onStats;
    editUi = opts.editPanel || null;
    _mode = opts.mode === 'ingame' ? 'ingame' : 'page';
    _onMarkerClick = opts.onMarkerClick || null;
    _onMapDblClick = opts.onMapDblClick || null;
    _drawCapWarned = false;
    if (Array.isArray(opts.defaultLayers) && opts.defaultLayers.length) {
      layers = new Set(opts.defaultLayers);
    } else if (_mode === 'ingame') {
      layers = new Set(INGAME_DEFAULT_ON);
    }
    if (!canvas) return;
    _resize();
    _bindEditPanel();
    _bindCanvas();
    window.addEventListener('resize', _resize);
    return refresh().then((d) => {
      onRefresh?.(d);
      return d;
    });
  }

  function destroy() {
    cancelAnimationFrame(anim);
    window.removeEventListener('resize', _resize);
    _mode = 'page';
    _onMarkerClick = null;
    _onMapDblClick = null;
    _drawCapWarned = false;
    canvas = null;
    tooltip = null;
    data = null;
    editUi = null;
  }

  window.AdminWorldMap = {
    init,
    refresh,
    destroy,
    setLayers,
    getLayers,
    toggleLayer,
    getLayerMeta,
    getMarkerCount,
    getMapStats,
    centerOnWorld,
    centerOnPlayer,
    screenCenterWorld,
    INGAME_DEFAULT_ON,
    DEFAULT_LAYERS_OFF: [...DEFAULT_LAYERS_OFF],
    fitView: () => { _fitView(); _draw(); },
    closeEditPanel: _closeEditPanel,
    pulseAt,
  };
