// Joueur + légende + export
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
