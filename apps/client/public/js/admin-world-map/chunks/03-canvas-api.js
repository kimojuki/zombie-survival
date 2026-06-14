// Canvas events + API map — admin-world-map.js
function _bindEditPanel() {
    if (!editUi) return;
    editUi.close?.addEventListener('click', _closeEditPanel);
    editUi.save?.addEventListener('click', () => _saveDecor());
    editUi.delete?.addEventListener('click', () => _deleteDecor());
    editUi.copyRcon?.addEventListener('click', async () => {
      if (!selectedDecorId) return;
      const cmd = `decorremove ${selectedDecorId}`;
      try {
        await navigator.clipboard.writeText(cmd);
        _depMsg('RCON copié : ' + cmd, 'ok');
      } catch {
        _depMsg('Copie échouée', 'err');
      }
    });
  }

  function _bindCanvas() {
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const before = _screenToMap(e.offsetX, e.offsetY);
      view.zoom = Math.max(0.06, Math.min(36, view.zoom * factor));
      const after = _screenToMap(e.offsetX, e.offsetY);
      view.centerX += before.x - after.x;
      view.centerY += before.y - after.y;
      _draw();
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dragging = true;
      didDrag = false;
      pointerDown = { x: e.clientX, y: e.clientY };
      dragStart = { x: e.clientX, y: e.clientY, cx: view.centerX, cy: view.centerY };
    }, true);
    window.addEventListener('mousemove', (e) => {
      if (dragging && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.hypot(dx, dy) > 4) didDrag = true;
        view.centerX = dragStart.cx - dx / view.zoom;
        view.centerY = dragStart.cy - dy / view.zoom;
        _draw();
        return;
      }
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = _hitTest(sx, sy);
      if (hit !== hoverHit) {
        hoverHit = hit;
        _draw();
      }
      if (tooltip) {
        if (hit) {
          tooltip.innerHTML = _tooltipHtml(hit);
          tooltip.classList.remove('hidden');
          tooltip.style.left = `${Math.min(rect.width - 280, sx + 14)}px`;
          tooltip.style.top = `${Math.min(rect.height - 120, sy + 14)}px`;
        } else {
          tooltip.classList.add('hidden');
        }
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (canvas && pointerDown && !didDrag) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        if (sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height) {
          const hit = _hitTest(sx, sy);
          if (hit) {
            if (_mode === 'ingame' && _onMarkerClick) _onMarkerClick(hit, { sx, sy });
            else _openEditPanel(hit);
          }
        }
      }
      dragging = false;
      dragStart = null;
      pointerDown = null;
      didDrag = false;
    });
    canvas.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (_mode === 'ingame') {
        const sx = e.offsetX;
        const sy = e.offsetY;
        const hit = _hitTest(sx, sy);
        if (!hit && _onMapDblClick) {
          const w = _screenToWorld(sx, sy);
          _onMapDblClick(w.x, w.z);
          return;
        }
      }
      _fitView();
      _draw();
    });
  }

  function setLayers(enabled) {
    layers = new Set(enabled);
    _drawCapWarned = false;
    _draw();
  }

  function getLayers() {
    return new Set(layers);
  }

  function toggleLayer(id, on) {
    if (on) layers.add(id);
    else layers.delete(id);
    _drawCapWarned = false;
    _draw();
  }

  function getLayerMeta() {
    return LAYER_META;
  }

  function getMarkerCount() {
    return _markers().length;
  }

  function getMapStats() {
    return data?.stats || null;
  }

  function centerOnWorld(wx, wz, zoom) {
    const mp = _worldToMap(wx, wz);
    view.centerX = mp.x;
    view.centerY = mp.y;
    if (Number.isFinite(zoom)) view.zoom = zoom;
    _draw();
  }

  function centerOnPlayer(zoom = 3.2) {
    const lp = window.ZS?.Network?.getLocalXZ?.();
    if (!lp) return false;
    centerOnWorld(lp.x, lp.z, zoom);
    return true;
  }

  function screenCenterWorld() {
    return _screenToWorld(view.w / 2, view.h / 2);
  }
