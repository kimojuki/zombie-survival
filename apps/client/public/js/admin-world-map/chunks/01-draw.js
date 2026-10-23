// Canvas draw + pulse — admin-world-map.js
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
