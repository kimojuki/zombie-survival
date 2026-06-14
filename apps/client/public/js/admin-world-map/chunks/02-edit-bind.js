// Resize + edit panel — admin-world-map.js
function _resize() {
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect?.width || 800));
    const h = Math.max(280, Math.floor(rect?.height || 500));
    if (w === view.w && h === view.h) return;
    view.w = w;
    view.h = h;
    canvas.width = w;
    canvas.height = h;
    _draw();
  }

  async function _fetchMap() {
    const res = await fetch('/api/admin/world-map', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Carte indisponible');
    return json;
  }

  async function refresh() {
    data = await _fetchMap();
    if (!view.zoom || view.zoom === 1) _fitView();
    _draw();
    return data;
  }

  function _decorIdFromHit(hit) {
    if (!hit) return null;
    if (hit.source === 'decor') return hit.meta?.id || hit.id;
    if (hit.source === 'poi') return hit.meta?.decorId || null;
    return null;
  }

  function _depMsg(text, kind) {
    if (!editUi?.msg) return;
    editUi.msg.textContent = text || '';
    editUi.msg.className = 'dep-msg' + (kind ? ` ${kind}` : '');
  }

  function _closeEditPanel() {
    selectedDecorId = null;
    selectedItem = null;
    if (editUi?.panel) editUi.panel.classList.add('hidden');
    if (editUi?.layout) editUi.layout.classList.remove('has-panel');
    _depMsg('');
  }

  function _numInput(label, key, value, step = '0.01') {
    const v = Number.isFinite(value) ? value : '';
    return `<label class="dep-field"><span>${label}</span>`
      + `<input name="${key}" type="number" step="${step}" value="${v}"></label>`;
  }

  function _renderEditForm(item, hit) {
    if (!editUi?.body) return;
    const pid = item?.prefabId || hit?.meta?.prefabId || '—';
    const readonly = [
      `<div><b>id</b> ${item?.id || hit?.meta?.decorId || '—'}</div>`,
      `<div><b>prefab</b> ${pid}</div>`,
      item?.placementKey ? `<div><b>seed</b> ${item.placementKey}</div>` : '',
      item?.createdBy ? `<div><b>créé par</b> ${item.createdBy}</div>` : '',
      item?.immutable ? '<div><b>immuable</b> oui (admin peut modifier)</div>' : '',
      item?.storageSummary
        ? `<div><b>coffre</b> ${item.storageSummary.filled}/${item.storageSummary.capacity} slots</div>` : '',
    ].filter(Boolean).join('');

    let fields = '<div class="dep-section">Position</div><div class="dep-grid">';
    fields += _numInput('x', 'x', item?.x ?? hit?.meta?.x, '0.01');
    fields += _numInput('z', 'z', item?.z ?? hit?.meta?.z, '0.01');
    fields += _numInput('y', 'y', item?.y, '0.01');
    fields += _numInput('baseY', 'baseY', item?.baseY, '0.01');
    fields += '</div><div class="dep-section">Orientation & taille</div><div class="dep-grid">';
    fields += _numInput('rotY', 'rotY', item?.rotY ?? hit?.meta?.rotY, '0.001');
    fields += _numInput('rotX', 'rotX', item?.rotX, '0.001');
    fields += _numInput('rotZ', 'rotZ', item?.rotZ, '0.001');
    fields += _numInput('scale', 'scale', item?.scale ?? 1, '0.01');
    fields += '</div>';

    if (pid.startsWith('wreck_')) {
      fields += '<div class="dep-section">Épave</div><div class="dep-grid">';
      fields += `<label class="dep-field"><span>variant</span><select name="wreckVariant">`
        + ['rust', 'olive', 'navy', 'beige', 'burnt'].map((v) =>
          `<option value="${v}"${item?.wreckVariant === v ? ' selected' : ''}>${v}</option>`).join('')
        + '</select></label>';
      fields += _numInput('wreckTilt', 'wreckTilt', item?.wreckTilt, '0.01');
      fields += _numInput('wreckWheels', 'wreckWheels', item?.wreckWheels, '1');
      fields += _numInput('wreckSink', 'wreckSink', item?.wreckSink, '0.01');
      fields += '</div>';
    }

    if (pid.startsWith('build_') || pid === 'storage_chest') {
      fields += '<div class="dep-section">Construction</div><div class="dep-grid">';
      fields += _numInput('buildLevel', 'buildLevel', item?.buildLevel, '1');
      fields += _numInput('groundLift', 'groundLift', item?.groundLift, '0.01');
      fields += '</div>';
    }

    if (pid === 'storage_chest' && (item?.shackAnchor || item?.shackFloorY != null)) {
      const a = item.shackAnchor || {};
      fields += '<div class="dep-section">Ancre cabane (coffre)</div><div class="dep-grid">';
      fields += _numInput('shackAnchor.x', 'shackAnchor.x', a.x, '0.01');
      fields += _numInput('shackAnchor.z', 'shackAnchor.z', a.z, '0.01');
      fields += _numInput('shackAnchor.rotY', 'shackAnchor.rotY', a.rotY, '0.001');
      fields += _numInput('shackFloorY', 'shackFloorY', item?.shackFloorY, '0.01');
      fields += '</div>';
    }

    if (pid.startsWith('road_barrier_rail')) {
      fields += '<div class="dep-section">Barrière</div><div class="dep-grid">';
      fields += _numInput('railLen', 'railLen', item?.railLen, '0.1');
      fields += '</div>';
    }

    editUi.body.innerHTML = `<div class="dep-readonly">${readonly}</div>${fields}`;
    if (editUi.save) editUi.save.disabled = !item?.id;
    if (editUi.delete) editUi.delete.disabled = !item?.id;
    if (editUi.copyRcon) editUi.copyRcon.disabled = !item?.id;
  }

  function _collectPatch() {
    if (!editUi?.body) return {};
    const patch = {};
    const num = (key) => {
      const el = editUi.body.querySelector(`[name="${key}"]`);
      if (!el || el.value === '') return;
      const v = Number(el.value);
      if (Number.isFinite(v)) patch[key] = v;
    };
    ['x', 'z', 'y', 'baseY', 'rotX', 'rotY', 'rotZ', 'scale', 'groundLift', 'buildLevel',
      'wreckTilt', 'wreckWheels', 'wreckSink', 'railLen', 'shackFloorY'].forEach(num);
    const varEl = editUi.body.querySelector('[name="wreckVariant"]');
    if (varEl?.value) patch.wreckVariant = varEl.value;
    const ax = editUi.body.querySelector('[name="shackAnchor.x"]');
    const az = editUi.body.querySelector('[name="shackAnchor.z"]');
    const ar = editUi.body.querySelector('[name="shackAnchor.rotY"]');
    if (ax && az && ax.value !== '' && az.value !== '') {
      patch.shackAnchor = {
        x: Number(ax.value),
        z: Number(az.value),
        rotY: Number(ar?.value) || 0,
      };
    }
    return patch;
  }

  async function _fetchDecorDetail(id) {
    const res = await fetch(`/api/admin/decor/${encodeURIComponent(id)}`, {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Chargement impossible');
    return json.item;
  }

  async function _openEditPanel(hit) {
    if (!editUi?.panel) return;
    const decorId = _decorIdFromHit(hit);
    editUi.panel.classList.remove('hidden');
    if (editUi.layout) editUi.layout.classList.add('has-panel');
    editUi.title.textContent = hit.label || hit.id || 'Objet';
    editUi.sub.textContent = hit.layer ? `Couche : ${LAYER_META[hit.layer]?.label || hit.layer}` : '';
    _depMsg('Chargement…');

    if (!decorId) {
      selectedDecorId = null;
      selectedItem = null;
      _renderEditForm(null, hit);
      if (editUi.save) editUi.save.disabled = true;
      if (editUi.delete) editUi.delete.disabled = true;
      _depMsg('Pas de décor serveur — POI design ou joueur (lecture seule).', 'err');
      return;
    }

    try {
      selectedDecorId = decorId;
      selectedItem = await _fetchDecorDetail(decorId);
      _renderEditForm(selectedItem, hit);
      _depMsg('');
    } catch (err) {
      _depMsg(err.message || String(err), 'err');
    }
  }

  async function _saveDecor() {
    if (!selectedDecorId) return;
    const patch = _collectPatch();
    _depMsg('Enregistrement…');
    try {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(selectedDecorId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec sauvegarde');
      selectedItem = json.item;
      _renderEditForm(selectedItem, null);
      await refresh();
      _depMsg(`Enregistré (${(json.changed || []).join(', ') || 'ok'})`, 'ok');
    } catch (err) {
      _depMsg(err.message || String(err), 'err');
    }
  }

  async function _deleteDecor() {
    if (!selectedDecorId) return;
    if (!window.confirm(`Supprimer ${selectedDecorId} ?`)) return;
    _depMsg('Suppression…');
    try {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(selectedDecorId)}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec suppression');
      _closeEditPanel();
      await refresh();
    } catch (err) {
      _depMsg(err.message || String(err), 'err');
    }
  }
