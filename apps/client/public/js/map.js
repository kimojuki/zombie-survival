// Carte tactique RP — item ramassable + overlay canvas (touche M)
(function () {
  'use strict';

  const SPAWN_X = -240;
  const SPAWN_Z = -226;

  let _state, _scene, _itemMesh = null;
  let _found = localStorage.getItem('zs_map_found') === '1';
  let _open = false;
  let _drawAcc = 0;

  function _worldCfg() {
    const w = ZS.SectorBounds?.MAP_WORLD;
    return w || { scale: 1.35, offsetX: 310, offsetZ: 300 };
  }

  function cx(x) {
    const w = _worldCfg();
    return (x + w.offsetX) * w.scale;
  }

  function cy(z) {
    const w = _worldCfg();
    return (z + w.offsetZ) * w.scale;
  }

  function init(state, scene) {
    _state = state;
    _scene = scene;
    if (!_found) _spawnItem();
    _bindKeys();
  }

  function tick(dt) {
    if (_itemMesh) {
      _itemMesh.rotation.y += 0.018;
      _itemMesh.position.y = _itemMesh.userData.baseY + Math.sin(Date.now() * 0.002) * 0.12;
    }
    if (!_found && _itemMesh) {
      if (Math.hypot(_state.player.x - SPAWN_X, _state.player.z - SPAWN_Z) < 2.2) _pickup();
    }
    if (_open) {
      _drawAcc += dt || 0;
      if (_drawAcc >= 0.25) {
        _drawAcc = 0;
        _draw();
      }
    }
  }

  function _spawnItem() {
    const y = ZS.getTerrainHeight(SPAWN_X, SPAWN_Z);
    const g = new THREE.Group();
    const pm = new THREE.MeshLambertMaterial({ color: 0xd4b468 });
    const dm = new THREE.MeshLambertMaterial({ color: 0x8a6030 });
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.34), pm);
    g.add(sheet);
    for (const [ox, oz] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), dm);
      c.position.set(ox, 0.01, oz);
      g.add(c);
    }
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.03, 12),
      new THREE.MeshLambertMaterial({ color: 0xffdd44, transparent: true, opacity: 0.28 }),
    );
    ring.position.y = 0.22;
    g.add(ring);
    const pl = new THREE.PointLight(0xffcc44, 1.8, 6);
    pl.position.y = 0.5;
    g.add(pl);
    g.position.set(SPAWN_X, y + 0.65, SPAWN_Z);
    g.userData.baseY = y + 0.65;
    _scene.add(g);
    _itemMesh = g;
  }

  function _pickup() {
    _found = true;
    localStorage.setItem('zs_map_found', '1');
    _scene.remove(_itemMesh);
    _itemMesh = null;
    ZS.Inventory.receivePickup('map');
  }

  function toggleMap() { _open ? _close() : _open_(); }

  function _open_() {
    _open = true;
    document.getElementById('map-overlay').style.display = 'flex';
    _draw();
    ZS.onUiPanelOpen?.();
  }

  function _close() {
    _open = false;
    document.getElementById('map-overlay').style.display = 'none';
    ZS.onUiPanelClose?.();
  }

  function _onKeyDown(e) {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.() || ZS.Rcon?.isOpen?.()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'Escape' && _open) {
      e.preventDefault();
      _close();
      return;
    }
    if (e.code !== 'KeyM') return;
    if (e.repeat) return;
    e.preventDefault();
    toggleMap();
  }

  function _bindKeys() {
    document.addEventListener('keydown', _onKeyDown);
    const closeBtn = document.getElementById('map-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', _close);
      closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _close(); }, { passive: false });
    }
    const overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) _close(); });
      overlay.addEventListener('touchstart', (e) => { if (e.target === overlay) _close(); }, { passive: true });
    }
  }

  function _drawPaperBg(ctx, W, H) {
    const bg = ctx.createRadialGradient(W * 0.45, H * 0.5, 20, W * 0.5, H * 0.5, W * 0.75);
    bg.addColorStop(0, '#e2d49e');
    bg.addColorStop(0.5, '#cdb86a');
    bg.addColorStop(1, '#a89040');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const [tx, ty, tr, ta] of [[90, 75, 58, 0.05], [W - 110, H - 75, 44, 0.06], [W - 50, 90, 28, 0.05], [55, H - 90, 35, 0.04]]) {
      const rg = ctx.createRadialGradient(tx, ty, 0, tx, ty, tr);
      rg.addColorStop(0, `rgba(100,70,30,${ta * 2})`);
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(tx, ty, tr, tr * 0.65, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(90,60,20,0.18)';
    ctx.lineWidth = 1;
    for (const fx of [W * 0.33, W * 0.67]) {
      ctx.beginPath();
      ctx.moveTo(fx, 0);
      ctx.lineTo(fx, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,50,15,0.5)';
    ctx.lineWidth = 7;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.strokeStyle = 'rgba(80,50,15,0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.strokeStyle = 'rgba(80,60,20,0.10)';
    ctx.lineWidth = 0.8;
    for (let gx = 0; gx < W; gx += 50) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gz = 0; gz < H; gz += 50) {
      ctx.beginPath();
      ctx.moveTo(0, gz);
      ctx.lineTo(W, gz);
      ctx.stroke();
    }
  }

  function _drawRoads(ctx) {
    const roads = ZS.SectorBounds?.MAP_ROADS || [];
    for (const road of roads) {
      const pts = road.pts;
      if (!pts || pts.length < 2) continue;
      if (road.bezier && pts.length >= 4) {
        ctx.save();
        ctx.strokeStyle = road.id === 'river' ? '#3060aa' : '#7a5828';
        ctx.lineWidth = road.width || 3;
        ctx.globalAlpha = road.id === 'river' ? 0.55 : 0.85;
        ctx.beginPath();
        ctx.moveTo(cx(pts[0][0]), cy(pts[0][1]));
        ctx.bezierCurveTo(cx(pts[1][0]), cy(pts[1][1]), cx(pts[2][0]), cy(pts[2][1]), cx(pts[3][0]), cy(pts[3][1]));
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.strokeStyle = '#7a5828';
      ctx.lineWidth = road.width || 3;
      ctx.lineCap = 'round';
      ctx.setLineDash(road.dashed ? [7, 5] : []);
      ctx.beginPath();
      ctx.moveTo(cx(pts[0][0]), cy(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(cx(pts[i][0]), cy(pts[i][1]));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function _drawSectorPattern(ctx, sec, x0, y0, w, h) {
    const pat = sec.pattern || 'default';
    if (pat === 'forest') {
      ctx.fillStyle = '#1a3a08';
      const trees = [[-25, -25], [10, -35], [30, -10], [-35, 20], [20, 28], [0, -12], [72, -18], [120, 5], [180, -20]];
      for (const [tx, tz] of trees) {
        const px = cx(tx);
        const py = cy(tz);
        if (px < x0 || px > x0 + w || py < y0 || py > y0 + h) continue;
        ctx.beginPath();
        ctx.moveTo(px, py - 7);
        ctx.lineTo(px - 4, py + 3);
        ctx.lineTo(px + 4, py + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#d4c878';
      ctx.fillRect(cx(238), cy(-82), 58 * _worldCfg().scale, 164 * _worldCfg().scale);
      ctx.fillStyle = '#3060aa';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(cx(292), cy(-90), 12 * _worldCfg().scale, 180 * _worldCfg().scale);
      ctx.restore();
      ctx.fillStyle = '#8a5020';
      ctx.font = `bold ${Math.round(8 * _worldCfg().scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('SPAWN PLAGE', cx(252), cy(-2));
    } else if (pat === 'town') {
      ctx.fillStyle = '#5a3e28';
      for (const [bx, bz, bw, bd] of [
        [-285, -44, 11, 9], [-270, -42, 9, 8], [-255, -43, 10, 9], [-238, -41, 8, 9],
        [-283, 6, 12, 8], [-265, 8, 9, 8], [-248, 5, 11, 9], [-228, 8, 9, 8],
        [-267, -14, 6, 6], [-250, -12, 8, 6],
      ]) {
        ctx.fillRect(cx(bx), cy(bz), bw * _worldCfg().scale, bd * _worldCfg().scale);
      }
    } else if (pat === 'city') {
      ctx.strokeStyle = 'rgba(200,190,160,0.38)';
      ctx.lineWidth = 1.2;
      for (const sx of [-65, -20, 35]) {
        ctx.beginPath();
        ctx.moveTo(cx(sx), cy(sec.zMin));
        ctx.lineTo(cx(sx), cy(sec.zMax));
        ctx.stroke();
      }
      for (const sz of [-240, -185, -135]) {
        ctx.beginPath();
        ctx.moveTo(cx(sec.xMin), cy(sz));
        ctx.lineTo(cx(sec.xMax), cy(sz));
        ctx.stroke();
      }
      ctx.fillStyle = '#3a3a48';
      for (const [bx, bz, bw, bd] of [
        [-63, -249, 16, 11], [-4, -248, 22, 12], [29, -247, 8, 7],
        [-38, -191, 20, 15], [-68, -216, 13, 9],
      ]) {
        ctx.fillRect(cx(bx), cy(bz), bw * _worldCfg().scale, bd * _worldCfg().scale);
      }
    } else if (pat === 'military') {
      ctx.fillStyle = '#2a3818';
      for (const [bx, bz, bw, bd] of [
        [-211, -200, 22, 14], [-264, -199, 20, 13], [-154, -199, 14, 10],
        [-209, -234, 18, 12], [-248, -232, 12, 9],
      ]) {
        ctx.fillRect(cx(bx), cy(bz), bw * _worldCfg().scale, bd * _worldCfg().scale);
      }
      ctx.strokeStyle = '#2a3818';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx(-147), cy(-213), 8 * _worldCfg().scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,50,15,0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
      ctx.setLineDash([]);
    } else if (pat === 'lake') {
      ctx.fillStyle = 'rgba(40,90,140,0.45)';
      ctx.beginPath();
      ctx.ellipse(cx(-72), cy(-86), 28 * _worldCfg().scale, 18 * _worldCfg().scale, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pat === 'farm') {
      ctx.fillStyle = '#8a9a48';
      for (const [fx, fz] of [[80, -20], [120, 10], [160, -40], [90, 30], [140, -5]]) {
        ctx.fillRect(cx(fx), cy(fz), 14 * _worldCfg().scale, 10 * _worldCfg().scale);
      }
    } else if (pat === 'coast') {
      ctx.fillStyle = 'rgba(50,90,120,0.35)';
      ctx.fillRect(cx(sec.xMax - 18), cy(sec.zMin), 16 * _worldCfg().scale, (sec.zMax - sec.zMin) * _worldCfg().scale);
    } else if (pat === 'mountain' || pat === 'wasteland') {
      ctx.fillStyle = 'rgba(60,50,40,0.12)';
      ctx.font = 'bold 14px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('? ? ?', x0 + w * 0.5, y0 + h * 0.45);
    } else if (pat === 'industrial') {
      ctx.fillStyle = '#3a3830';
      for (const [bx, bz, bw, bd] of [[-80, 80, 18, 12], [-40, 95, 22, 14], [10, 88, 16, 10]]) {
        ctx.fillRect(cx(bx), cy(bz), bw * _worldCfg().scale, bd * _worldCfg().scale);
      }
    }
  }

  function _drawSector(ctx, sec) {
    const S = _worldCfg().scale;
    const x0 = cx(sec.xMin);
    const y0 = cy(sec.zMin);
    const w = (sec.xMax - sec.xMin) * S;
    const h = (sec.zMax - sec.zMin) * S;
    const isOpen = sec.status === 'open';
    const isUnknown = sec.status === 'unknown';

    ctx.save();
    const alpha = isOpen ? 0.52 : isUnknown ? 0.2 : 0.28;
    ctx.globalAlpha = alpha;
    if (sec.fill2) {
      const gr = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
      gr.addColorStop(0, sec.fill);
      gr.addColorStop(1, sec.fill2);
      ctx.fillStyle = gr;
    } else {
      ctx.fillStyle = sec.fill;
    }
    ctx.fillRect(x0, y0, w, h);
    ctx.restore();

    ctx.strokeStyle = sec.stroke;
    ctx.lineWidth = isOpen ? 3 : 2;
    if (!isOpen) ctx.setLineDash(isUnknown ? [6, 6] : [8, 5]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);

    if (!isOpen) _drawSectorPattern(ctx, sec, x0, y0, w, h);

    const cxm = (sec.xMin + sec.xMax) * 0.5;
    const czm = (sec.zMin + sec.zMax) * 0.5;
    ctx.textAlign = 'center';
    ctx.fillStyle = isOpen ? '#0e2804' : isUnknown ? '#3a3020' : '#2a1808';
    ctx.font = `bold ${Math.round((isOpen ? 11 : 10) * S)}px Georgia,serif`;
    ctx.fillText(sec.labelEn || sec.label, cx(cxm), cy(czm) - 6);
    ctx.font = `${Math.round(8 * S)}px Georgia,serif`;
    if (isOpen) {
      ctx.fillText(`[ SECTEUR ${String(sec.num).padStart(2, '0')} — OUVERT ]`, cx(cxm), cy(czm) + 8);
    } else if (isUnknown) {
      ctx.fillStyle = 'rgba(50,40,30,0.8)';
      ctx.fillText('INCONNU', cx(cxm), cy(czm) + 8);
    } else {
      ctx.fillStyle = 'rgba(40,40,48,0.85)';
      ctx.font = `bold ${Math.round(9 * S)}px Georgia,serif`;
      ctx.fillText('BIENTÔT', cx(cxm), cy(czm) + 6);
      ctx.font = `${Math.round(7 * S)}px Georgia,serif`;
      ctx.fillText(`[ SECTEUR ${String(sec.num).padStart(2, '0')} ]`, cx(cxm), cy(czm) + 18);
    }
  }

  function _drawGates(ctx) {
    const gates = ZS.SectorBounds?.SECTOR_01_GATES || [];
    const S = _worldCfg().scale;
    for (const g of gates) {
      const px = cx(g.x);
      const py = cy(g.z);
      ctx.fillStyle = 'rgba(200,160,40,0.85)';
      ctx.beginPath();
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px - 5, py + 4);
      ctx.lineTo(px + 5, py + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5a4010';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#3a2810';
      ctx.font = `${Math.round(7 * S)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('PORTE', px, py + 14);
    }
  }

  function _drawPlayer(ctx) {
    const px = _state?.player?.x ?? 0;
    const pz = _state?.player?.z ?? 0;
    const pcx = cx(px);
    const pcy = cy(pz);
    const sector = ZS.SectorBounds?.getSectorAt?.(px, pz);

    ctx.fillStyle = 'rgba(220,30,10,0.35)';
    ctx.beginPath();
    ctx.arc(pcx, pcy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff2200';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pcx - 14, pcy);
    ctx.lineTo(pcx + 14, pcy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pcx, pcy - 14);
    ctx.lineTo(pcx, pcy + 14);
    ctx.stroke();
    ctx.fillStyle = '#ff2200';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pcx, pcy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cc1100';
    ctx.font = 'bold 9px Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('◄ VOUS', pcx + 8, pcy - 10);
    ctx.fillText(`X ${Math.round(px)}  Z ${Math.round(pz)}`, pcx + 8, pcy + 2);
    if (sector) {
      ctx.fillStyle = sector.status === 'open' ? '#1a5010' : '#4a3020';
      ctx.font = '8px Georgia,serif';
      ctx.fillText(sector.label, pcx + 8, pcy + 13);
    }
  }

  function _drawCompass(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(200,180,120,0.55)';
    ctx.strokeStyle = '#5a3010';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.82);
    ctx.lineTo(x - r * 0.14, y + r * 0.12);
    ctx.lineTo(x + r * 0.14, y + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a2010';
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.82);
    ctx.lineTo(x - r * 0.14, y - r * 0.12);
    ctx.lineTo(x + r * 0.14, y - r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2010';
    ctx.font = `bold ${r * 0.36}px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.fillText('N', x, y - r * 1.2);
    ctx.fillText('S', x, y + r * 1.3);
    ctx.fillText('E', x + r * 1.25, y + 4);
    ctx.fillText('O', x - r * 1.25, y + 4);
  }

  function _drawLegend(ctx, x, y) {
    ctx.strokeStyle = '#8a6030';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5, y - 18, 148, 128);
    ctx.fillStyle = 'rgba(200,175,100,0.6)';
    ctx.fillRect(x - 4, y - 17, 147, 127);
    const items = [
      ['#2a5010', 'S01', 'Zone ouverte'],
      ['#6a5040', 'S02–S08', 'Bientôt'],
      ['#5a5a58', 'S09–S10', 'Inconnu'],
      ['#7a5828', '=', 'Routes'],
      ['#ff2200', '●', 'Votre position'],
    ];
    ctx.font = '10px Georgia,serif';
    ctx.textAlign = 'left';
    items.forEach(([col, sym, label], i) => {
      ctx.fillStyle = col;
      ctx.fillText(sym, x + 3, y + i * 16);
      ctx.fillStyle = '#3a2010';
      ctx.fillText(label, x + 32, y + i * 16);
    });
  }

  function _draw() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const S = _worldCfg().scale;

    _drawPaperBg(ctx, W, H);

    const mw = ZS.SectorBounds?.MAP_WORLD;
    if (mw) {
      ctx.fillStyle = 'rgba(100,130,65,0.10)';
      ctx.fillRect(cx(mw.xMin), cy(mw.zMin), (mw.xMax - mw.xMin) * S, (mw.zMax - mw.zMin) * S);
    }

    _drawRoads(ctx);

    const sectors = (ZS.SectorBounds?.SECTORS_ALL || []).slice().sort((a, b) => {
      const rank = { unknown: 0, locked: 1, open: 2 };
      return (rank[a.status] || 0) - (rank[b.status] || 0);
    });
    for (const sec of sectors) _drawSector(ctx, sec);

    _drawGates(ctx);
    _drawPlayer(ctx);
    _drawCompass(ctx, W - 68, 68, 42);
    _drawLegend(ctx, 18, H - 136);

    const sx = cx(-300) + 10;
    const sy = H - 25;
    const sl = 100 * S;
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sl, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy - 5);
    ctx.lineTo(sx, sy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + sl, sy - 5);
    ctx.lineTo(sx + sl, sy + 5);
    ctx.stroke();
    ctx.fillStyle = '#3a2010';
    ctx.font = '10px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('100 m', sx + sl / 2, sy - 7);

    ctx.fillStyle = '#2a1808';
    ctx.font = `bold ${Math.round(11 * S)}px Georgia,serif`;
    ctx.textAlign = 'center';
    ctx.fillText('CARTE TACTIQUE — SECTEURS DE SURVIE', W / 2, 24);
    ctx.font = `${Math.round(7.5 * S)}px Georgia,serif`;
    ctx.fillStyle = 'rgba(80,40,10,0.7)';
    ctx.fillText('DOCUMENT CONFIDENTIEL — 10 SECTEURS RECENSÉS', W / 2, 37);

    ctx.save();
    ctx.translate(W - 108, H - 75);
    ctx.rotate(-0.38);
    ctx.strokeStyle = 'rgba(160,20,20,0.55)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-50, -16, 100, 32);
    ctx.fillStyle = 'rgba(160,20,20,0.55)';
    ctx.font = 'bold 13px Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLASSIFIÉ', 0, 6);
    ctx.restore();
  }

  window.ZS = window.ZS || {};
  ZS.Map = { init, tick, toggleMap };
}());
