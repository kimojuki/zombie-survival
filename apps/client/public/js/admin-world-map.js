// Carte admin — monde zoomable, POI / décor / joueurs (hover + filtres).
(function () {
  'use strict';

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

  function _drawPaper(ctx) {
    const { w, h } = view;
    const bg = ctx.createRadialGradient(w * 0.45, h * 0.5, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#1a2a22');
    bg.addColorStop(1, '#0d1511');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  function _drawSectors(ctx) {
    for (const sec of data?.sectors || []) {
      const tl = _mapToScreen((sec.xMin + _worldCfg().offsetX) * _worldCfg().scale, (sec.zMin + _worldCfg().offsetZ) * _worldCfg().scale);
      const br = _mapToScreen((sec.xMax + _worldCfg().offsetX) * _worldCfg().scale, (sec.zMax + _worldCfg().offsetZ) * _worldCfg().scale);
      const x = tl.x;
      const y = tl.y;
      const w = br.x - tl.x;
      const h = br.y - tl.y;
      ctx.fillStyle = sec.status === 'open' ? (sec.fill || '#2a5010') + 'cc' : (sec.fill || '#444') + '99';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = sec.stroke || '#1a5a10';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(231,241,234,0.85)';
      ctx.font = 'bold 11px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sec.label || sec.id, x + w / 2, y + 14);
      if (sec.status === 'locked') {
        ctx.fillStyle = 'rgba(255,125,125,0.75)';
        ctx.font = '10px Consolas, monospace';
        ctx.fillText('VERROUILLÉ', x + w / 2, y + 26);
      }
    }
  }

  function _drawRoads(ctx) {
    const cfg = _worldCfg();
    for (const road of data?.roads || []) {
      const pts = road.pts;
      if (!pts || pts.length < 2) continue;
      ctx.strokeStyle = road.id === 'river' ? '#3060aa' : '#7a5828';
      ctx.lineWidth = Math.max(1, (road.width || 3) * view.zoom * 0.35);
      ctx.globalAlpha = road.id === 'river' ? 0.55 : 0.8;
      ctx.beginPath();
      if (road.bezier && pts.length >= 4) {
        const p0 = _mapToScreen((pts[0][0] + cfg.offsetX) * cfg.scale, (pts[0][1] + cfg.offsetZ) * cfg.scale);
        ctx.moveTo(p0.x, p0.y);
        const p1 = _mapToScreen((pts[1][0] + cfg.offsetX) * cfg.scale, (pts[1][1] + cfg.offsetZ) * cfg.scale);
        const p2 = _mapToScreen((pts[2][0] + cfg.offsetX) * cfg.scale, (pts[2][1] + cfg.offsetZ) * cfg.scale);
        const p3 = _mapToScreen((pts[3][0] + cfg.offsetX) * cfg.scale, (pts[3][1] + cfg.offsetZ) * cfg.scale);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      } else {
        for (let i = 0; i < pts.length; i++) {
          const sp = _mapToScreen((pts[i][0] + cfg.offsetX) * cfg.scale, (pts[i][1] + cfg.offsetZ) * cfg.scale);
          if (i === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function _drawExclusionZones(ctx) {
    for (const p of data?.pois || []) {
      if (p.category !== 'exclusion' || !p.r) continue;
      const mp = _worldToMap(p.x, p.z);
      const sp = _mapToScreen(mp.x, mp.y);
      const r = p.r * _worldCfg().scale * view.zoom;
      ctx.strokeStyle = 'rgba(255,159,107,0.45)';
      ctx.fillStyle = 'rgba(255,159,107,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function _drawPrecisionMark(ctx, sp, color, r) {
    ctx.fillStyle = color;
    ctx.fillRect(sp.x, sp.y, 1, 1);
    if (view.zoom < 1.2) return;
    const arm = Math.min(5, Math.max(2, 6 / Math.pow(view.zoom, 0.75)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp.x - arm, sp.y);
    ctx.lineTo(sp.x + arm, sp.y);
    ctx.moveTo(sp.x, sp.y - arm);
    ctx.lineTo(sp.x, sp.y + arm);
    ctx.stroke();
    if (view.zoom >= 3 && r > 1.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function _clusterMarkers(list) {
    if (view.zoom >= CLUSTER_ZOOM_THRESHOLD) return list;
    const cell = 32 / Math.max(0.4, view.zoom);
    const buckets = new Map();
    const out = [];
    for (const m of list) {
      if (!CLUSTER_LAYERS.has(m.layer)) {
        out.push(m);
        continue;
      }
      const bx = Math.floor(m.x / cell);
      const bz = Math.floor(m.z / cell);
      const key = `${m.layer}:${bx}:${bz}`;
      let b = buckets.get(key);
      if (!b) {
        b = { layer: m.layer, sx: 0, sz: 0, n: 0, sample: m };
        buckets.set(key, b);
      }
      b.sx += m.x;
      b.sz += m.z;
      b.n += 1;
    }
    for (const b of buckets.values()) {
      out.push({
        layer: b.layer,
        x: b.sx / b.n,
        z: b.sz / b.n,
        label: b.n > 1 ? `×${b.n}` : (b.sample.label || ''),
        id: b.sample.id,
        meta: { cluster: true, count: b.n },
        source: b.n > 1 ? 'cluster' : b.sample.source,
        precise: b.n === 1,
      });
    }
    return out;
  }

  function _drawMarkers(ctx) {
    let list = _clusterMarkers(_markers());
    if (list.length > MAX_DRAW_MARKERS) {
      if (!_drawCapWarned && _mode === 'ingame') {
        _drawCapWarned = true;
        console.warn('[admin-map] trop de marqueurs visibles — activez moins de filtres', list.length);
      }
      list = list.slice(0, MAX_DRAW_MARKERS);
    }
    const byLayer = [...list].sort((a, b) => (LAYER_META[a.layer]?.z || 0) - (LAYER_META[b.layer]?.z || 0));
    for (const m of byLayer) {
      const lm = LAYER_META[m.layer] || LAYER_META.other;
      const mp = _worldToMap(m.x, m.z);
      const sp = _mapToScreen(mp.x, mp.y);
      const r = _screenRadius(m.layer);
      const hovered = hoverHit === m;
      const dashed = !!lm.dashed || m.meta?.placeholder;

      if (dashed) {
        ctx.strokeStyle = lm.color;
        ctx.lineWidth = hovered ? 2 : 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, Math.max(r, 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (m.meta?.cluster && m.meta.count > 1) {
        const cr = Math.max(r + 2, 5 + Math.log10(m.meta.count) * 3);
        ctx.fillStyle = lm.color;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, cr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = '600 10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(m.meta.count), sp.x, sp.y);
      } else if (r > 1.2) {
        ctx.fillStyle = lm.color;
        ctx.strokeStyle = hovered ? '#ffffff' : 'rgba(0,0,0,0.45)';
        ctx.lineWidth = hovered ? 2 : 1;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (m.meta?.precise !== false || m.source === 'poi' || m.source === 'decor' || m.source === 'player') {
        _drawPrecisionMark(ctx, sp, lm.color, r);
      }

      const showLabel = view.zoom >= 0.45 && (
        m.layer === 'poi-live' || m.layer === 'player' || m.layer === 'gate'
        || m.layer === 'building' || m.layer === 'sign' || m.layer === 'storage'
      );
      if (showLabel) {
        const text = String(m.label).slice(0, 32);
        const fontPx = _labelFontPx();
        const tx = sp.x + r + 6;
        const ty = sp.y + 1;
        ctx.font = `600 ${fontPx}px system-ui, "Segoe UI", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillText(text, tx + 1, ty + 1);
        ctx.fillStyle = 'rgba(248,252,248,0.98)';
        ctx.fillText(text, tx, ty);
      }
    }
  }

  function _drawPulse(ctx) {
    if (!_pulse || Date.now() > _pulse.until) return;
    const mp = _worldToMap(_pulse.x, _pulse.z);
    const sp = _mapToScreen(mp.x, mp.y);
    const t = (Date.now() % 1000) / 1000;
    const r = 6 + t * 22;
    ctx.strokeStyle = `rgba(255, 210, 70, ${0.95 - t * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 220, 100, 0.35)';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function _animTick() {
    if (!_pulse || Date.now() > _pulse.until) {
      _pulse = null;
      anim = 0;
      _draw();
      return;
    }
    _draw();
    anim = requestAnimationFrame(_animTick);
  }

  function pulseAt(wx, wz, ms = 6000) {
    if (!Number.isFinite(wx) || !Number.isFinite(wz)) return;
    _pulse = { x: wx, z: wz, until: Date.now() + ms };
    if (!anim) anim = requestAnimationFrame(_animTick);
    else _draw();
  }

  function _drawHud(ctx) {
    const cx = view.w / 2;
    const cy = view.h / 2;
    const wpos = _screenToWorld(cx, cy);
    const total = _markers().length;
    const hudW = _mode === 'ingame' ? 280 : 210;
    const hudH = _mode === 'ingame' ? 56 : 42;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(8, 8, hudW, hudH);
    ctx.fillStyle = '#94a79b';
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`zoom ${(view.zoom * 100).toFixed(0)}% · ${total} pt`, 14, 24);
    ctx.fillText(`centre x=${_fmtNum(wpos.x)} z=${_fmtNum(wpos.z)}`, 14, 40);
    if (_mode === 'ingame') {
      ctx.fillStyle = total > MAX_DRAW_MARKERS ? '#ffaa66' : '#7a9a88';
      ctx.fillText(total > MAX_DRAW_MARKERS ? `cap ${MAX_DRAW_MARKERS} — réduire filtres` : 'dbl-clic vide = TP', 14, 54);
    }
    if (_mode === 'ingame') {
      ctx.strokeStyle = 'rgba(255,220,120,0.55)';
      ctx.lineWidth = 1;
      const s = 10;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx, cy + s);
      ctx.stroke();
    }
  }

  function _draw() {
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, view.w, view.h);
    _drawPaper(ctx);
    _drawSectors(ctx);
    _drawRoads(ctx);
    if (layers.has('exclusion')) _drawExclusionZones(ctx);
    _drawMarkers(ctx);
    _drawPulse(ctx);
    _drawHud(ctx);
  }

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
}());
