// Layers + markers — admin-world-map.js
const LAYER_META = {
    player: { label: 'Joueurs', color: '#9fdf7a', screenPx: 6, z: 50 },
    'poi-live': { label: 'POI (live/seed)', color: '#ffd27a', screenPx: 5, z: 48 },
    'poi-design': { label: 'POI design (placeholder)', color: '#d8b45f', screenPx: 4, z: 36, dashed: true },
    exclusion: { label: 'Exclusions build', color: '#ff9f6b', screenPx: 3, z: 34 },
    gate: { label: 'Portails', color: '#8ec8ff', screenPx: 5, z: 42 },
    building: { label: 'Bâtiments', color: '#e8a04a', screenPx: 4, z: 45 },
    storage: { label: 'Stockage', color: '#5fd4d4', screenPx: 4, z: 44 },
    sign: { label: 'Panneaux', color: '#ffe066', screenPx: 4, z: 43 },
    wreck: { label: 'Épaves', color: '#b08060', screenPx: 4, z: 41 },
    barrier: { label: 'Barrières', color: '#a0a8b0', screenPx: 3, z: 35 },
    camp: { label: 'Camp / build', color: '#c8d4c0', screenPx: 3, z: 33 },
    palm: { label: 'Palmiers', color: '#4db88a', screenPx: 2, z: 20 },
    tree: { label: 'Arbres', color: '#2d8a4a', screenPx: 1.5, z: 18 },
    rock: { label: 'Rochers', color: '#8a8078', screenPx: 2, z: 22 },
    item: { label: 'Items décor', color: '#d0d8d0', screenPx: 3, z: 32 },
    other: { label: 'Autre', color: '#94a79b', screenPx: 3, z: 30 },
  };

  let canvas = null;
  let tooltip = null;
  let token = '';
  let data = null;
  let view = { centerX: 0, centerY: 0, zoom: 1, w: 800, h: 500 };
  /** Couches masquées par défaut — évite milliers de points (arbres, rochers, barrières…). */
  const DEFAULT_LAYERS_OFF = new Set([
    'tree', 'rock', 'palm', 'barrier', 'camp', 'item', 'other', 'poi-design',
  ]);
  /** Profil carte in-game (encore plus strict — POI + bâtiments + joueurs). */
  const INGAME_DEFAULT_ON = [
    'player', 'poi-live', 'gate', 'building', 'storage', 'sign', 'wreck', 'exclusion',
  ];
  const MAX_DRAW_MARKERS = 4000;
  const CLUSTER_LAYERS = new Set(['tree', 'rock', 'palm', 'barrier', 'camp', 'item']);
  const CLUSTER_ZOOM_THRESHOLD = 0.52;
  let layers = new Set(Object.keys(LAYER_META).filter((k) => !DEFAULT_LAYERS_OFF.has(k)));
  let _mode = 'page';
  let _onMarkerClick = null;
  let _onMapDblClick = null;
  let _drawCapWarned = false;
  let dragging = false;
  let dragStart = null;
  let hoverHit = null;
  let anim = 0;
  let _pulse = null;
  let onRefresh = null;
  let editUi = null;
  let selectedDecorId = null;
  let selectedItem = null;
  let pointerDown = null;
  let didDrag = false;

  function _worldCfg() {
    return data?.world || { scale: 1.35, offsetX: 310, offsetZ: 300 };
  }

  function _worldToMap(wx, wz) {
    const w = _worldCfg();
    return { x: (wx + w.offsetX) * w.scale, y: (wz + w.offsetZ) * w.scale };
  }

  function _mapToScreen(mx, my) {
    return {
      x: (mx - view.centerX) * view.zoom + view.w / 2,
      y: (my - view.centerY) * view.zoom + view.h / 2,
    };
  }

  function _screenToMap(sx, sy) {
    return {
      x: (sx - view.w / 2) / view.zoom + view.centerX,
      y: (sy - view.h / 2) / view.zoom + view.centerY,
    };
  }

  function _screenToWorld(sx, sy) {
    const m = _screenToMap(sx, sy);
    const w = _worldCfg();
    return {
      x: m.x / w.scale - w.offsetX,
      z: m.y / w.scale - w.offsetZ,
    };
  }

  /** Taille police labels POI — grandit au zoom pour rester lisible. */
  function _labelFontPx() {
    const z = Math.max(1, view.zoom);
    return Math.max(12, Math.min(17, 11 + Math.log2(z) * 2.4));
  }

  /** Taille écran des marqueurs — diminue quand on zoome pour garder la précision. */
  function _screenRadius(layer) {
    const lm = LAYER_META[layer] || LAYER_META.other;
    const base = lm.screenPx ?? 4;
    const z = Math.max(1, view.zoom);
    return Math.max(1, base / Math.pow(z, 0.92));
  }

  function _isMapNoisePrefab(pid) {
    if (!pid) return true;
    if (pid.startsWith('tree_')) return true;
    if (pid.startsWith('rock_') || pid === 'spawn_stone' || pid === 'spawn_flat_stone') return true;
    if (pid.startsWith('road_barrier_')) return true;
    if (pid.startsWith('spawn_')) return true;
    return false;
  }

  function _poiPlacementKeys() {
    const keys = new Set();
    for (const p of data?.pois || []) {
      if (p.placementKey) keys.add(p.placementKey);
    }
    return keys;
  }

  function _decorCoveredByPoi(d) {
    const pk = d.placementKey;
    return !!pk && _poiPlacementKeys().has(pk);
  }

  function _fitView() {
    const w = _worldCfg();
    const x0 = (w.xMin + w.offsetX) * w.scale;
    const x1 = (w.xMax + w.offsetX) * w.scale;
    const y0 = (w.zMin + w.offsetZ) * w.scale;
    const y1 = (w.zMax + w.offsetZ) * w.scale;
    view.centerX = (x0 + x1) / 2;
    view.centerY = (y0 + y1) / 2;
    const zw = Math.max(1, x1 - x0);
    const zh = Math.max(1, y1 - y0);
    view.zoom = Math.min(view.w / zw, view.h / zh) * 0.9;
  }

  function _markers() {
    if (!data) return [];
    const out = [];
    for (const p of data.pois || []) {
      if (_isMapNoisePrefab(p.prefabId)) continue;
      out.push({
        layer: p.category || 'poi',
        x: p.x,
        z: p.z,
        label: p.label,
        id: p.id,
        meta: p,
        source: 'poi',
        precise: p.precise !== false,
      });
    }
    for (const g of data.gates || []) {
      out.push({
        layer: 'gate',
        x: g.x,
        z: g.z,
        label: g.title || g.id,
        id: g.id,
        meta: g,
        source: 'gate',
      });
    }
    for (const d of data.decor || []) {
      const layer = d.layer || 'other';
      if (!layers.has(layer)) continue;
      if (_decorCoveredByPoi(d)) continue;
      out.push({
        layer,
        x: d.x,
        z: d.z,
        label: d.prefabId || d.type || d.id,
        id: d.id,
        meta: d,
        source: 'decor',
      });
    }
    for (const p of data.players || []) {
      out.push({
        layer: 'player',
        x: p.x,
        z: p.z,
        label: p.username,
        id: p.id,
        meta: p,
        source: 'player',
      });
    }
    return out.filter((m) => layers.has(m.layer));
  }

  function _hitTest(sx, sy) {
    const hits = [];
    for (const m of _markers()) {
      const mp = _worldToMap(m.x, m.z);
      const sp = _mapToScreen(mp.x, mp.y);
      const r = _screenRadius(m.layer);
      if (Math.hypot(sp.x - sx, sp.y - sy) <= r + 3) hits.push({ m, sp, r });
    }
    if (!hits.length) return null;
    hits.sort((a, b) => (LAYER_META[b.m.layer]?.z || 0) - (LAYER_META[a.m.layer]?.z || 0));
    return hits[0].m;
  }

  function _fmtNum(n, digits = 2) {
    return Number.isFinite(n) ? n.toFixed(digits) : '—';
  }

  function _tooltipHtml(hit) {
    if (!hit) return '';
    const meta = hit.meta || {};
    const lines = [`<b>${hit.label || hit.id}</b>`];
    if (hit.source === 'decor') {
      lines.push(`<span class="dim">id</span> ${meta.id}`);
      lines.push(`<span class="dim">ref</span> ${meta.prefabId || meta.type || '—'}`);
      lines.push(`<span class="dim">pos</span> x=${_fmtNum(meta.x)} z=${_fmtNum(meta.z)}`);
      if (Number.isFinite(meta.rotY)) lines.push(`<span class="dim">rotY</span> ${meta.rotY.toFixed(2)}`);
      if (Number.isFinite(meta.scale) && meta.scale !== 1) lines.push(`<span class="dim">scale</span> ${meta.scale.toFixed(2)}`);
      if (meta.placementKey) lines.push(`<span class="dim">seed</span> ${meta.placementKey}`);
      if (meta.createdBy) lines.push(`<span class="dim">par</span> ${meta.createdBy}`);
      if (meta.immutable) lines.push('<span class="tag">immuable</span>');
      lines.push(`<span class="dim">RCON</span> decorremove ${meta.id}`);
    } else if (hit.source === 'player') {
      lines.push(`<span class="dim">joueur</span> ${meta.username}`);
      lines.push(`<span class="dim">pos</span> x=${_fmtNum(meta.x)} z=${_fmtNum(meta.z)}`);
      if (Number.isFinite(meta.health)) lines.push(`<span class="dim">PV</span> ${Math.round(meta.health)}`);
    } else if (hit.source === 'gate') {
      lines.push(`<span class="dim">cible</span> ${meta.target || '—'}`);
      lines.push(`<span class="dim">pos</span> x=${_fmtNum(meta.x)} z=${_fmtNum(meta.z)}`);
      if (meta.subtitle) lines.push(`<span class="dim">${meta.subtitle}</span>`);
    } else if (hit.source === 'poi') {
      lines.push(`<span class="dim">pos</span> x=${_fmtNum(meta.x)} z=${_fmtNum(meta.z)}`);
      if (meta.prefabId) lines.push(`<span class="dim">prefab</span> ${meta.prefabId}`);
      if (meta.decorId) lines.push(`<span class="dim">decor</span> ${meta.decorId}`);
      if (meta.placementKey) lines.push(`<span class="dim">seed</span> ${meta.placementKey}`);
      if (Number.isFinite(meta.rotY)) lines.push(`<span class="dim">rotY</span> ${meta.rotY.toFixed(3)}`);
      if (meta.source === 'live') lines.push('<span class="tag ok">position serveur</span>');
      else if (meta.source === 'seed') lines.push('<span class="tag ok">seed partagé</span>');
      if (meta.placeholder) lines.push('<span class="tag warn">placeholder design</span>');
      if (meta.decorId) lines.push(`<span class="dim">RCON</span> decorremove ${meta.decorId}`);
    } else {
      lines.push(`<span class="dim">pos</span> x=${_fmtNum(meta.x)} z=${_fmtNum(meta.z)}`);
      if (meta.note) lines.push(`<span class="dim">${meta.note}</span>`);
      if (meta.r) lines.push(`<span class="dim">r</span> ${meta.r} m`);
    }
    lines.push(`<span class="dim">couche</span> ${LAYER_META[hit.layer]?.label || hit.layer}`);
    return lines.join('<br>');
  }
