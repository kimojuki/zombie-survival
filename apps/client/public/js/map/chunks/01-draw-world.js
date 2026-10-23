// Canvas fond + secteurs
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
