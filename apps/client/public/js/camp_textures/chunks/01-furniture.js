// Table, poêle, tapis
function _drawTableTopCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0x7ab1e01);

    ctx.fillStyle = '#b8875a';
    ctx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 28) {
      const shade = 168 + Math.floor(rng() * 28);
      ctx.fillStyle = `rgb(${shade + 12},${shade - 8},${shade - 32})`;
      ctx.fillRect(0, y + 1, S, 24);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const kx = rng() * S;
      const ky = rng() * S;
      ctx.fillStyle = 'rgba(60,40,25,0.35)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 4 + rng() * 8, 3 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 500; i++) {
      const v = (rng() - 0.5) * 18;
      ctx.fillStyle = `rgba(${184 + v | 0},${135 + v | 0},${90 + v | 0},${0.06 + rng() * 0.08})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Poêle cabane — fonte sombre + rouille. */
  function _drawStoveBodyCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xcab1e501);

    ctx.fillStyle = '#3a3c40';
    ctx.fillRect(0, 0, S, S);

    for (let i = 0; i < 900; i++) {
      const v = (rng() - 0.5) * 22;
      ctx.fillStyle = `rgba(${58 + v | 0},${60 + v | 0},${64 + v | 0},${0.08 + rng() * 0.12})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }

    for (let i = 0; i < 18; i++) {
      const kx = rng() * S;
      const ky = rng() * S;
      ctx.fillStyle = `rgba(120,70,40,${0.12 + rng() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 6 + rng() * 10, 4 + rng() * 6, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  /** Porte poêle — grille + vitre chaude. */
  function _drawStoveDoorCanvas() {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xcab1e502);

    ctx.fillStyle = '#2e3034';
    ctx.fillRect(0, 0, S, S);

    const glow = ctx.createRadialGradient(S * 0.5, S * 0.58, 8, S * 0.5, S * 0.58, S * 0.38);
    glow.addColorStop(0, 'rgba(255,140,60,0.55)');
    glow.addColorStop(0.45, 'rgba(180,70,30,0.25)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(S * 0.18, S * 0.22, S * 0.64, S * 0.62);

    ctx.strokeStyle = 'rgba(20,20,22,0.85)';
    ctx.lineWidth = 3;
    for (let y = 22; y < S - 18; y += 14) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(S - 18, y);
      ctx.stroke();
    }
    for (let x = 22; x < S - 18; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, S - 18);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(90,55,35,0.5)';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, S - 20, S - 20);
    return c;
  }

  /** Pieds / ceinture table — bois sombre usé. */
  function _drawTableLegCanvas() {
    const S = 128;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0x7ab1e02);

    ctx.fillStyle = '#4a3224';
    ctx.fillRect(0, 0, S, S);

    for (let x = 0; x < S; x += 24) {
      const shade = 68 + Math.floor(rng() * 22);
      ctx.fillStyle = `rgb(${shade + 8},${shade - 4},${shade - 12})`;
      ctx.fillRect(x + 1, 0, 20, S);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, S);
      ctx.stroke();
    }

    for (let i = 0; i < 280; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rng() * 0.1})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Tapis tissé cabane — laine brune, bordure et losanges centraux. */
  function _drawCabinRugCanvas() {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const rng = _rng(0xcab1e09);

    ctx.fillStyle = '#6a4a32';
    ctx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 5) {
      for (let x = 0; x < S; x += 5) {
        const n = rng();
        ctx.fillStyle = n < 0.5 ? '#5e402c' : '#745038';
        ctx.fillRect(x, y, 5, 5);
      }
    }

    const border = 22;
    ctx.fillStyle = '#3e2a1c';
    ctx.fillRect(0, 0, S, border);
    ctx.fillRect(0, S - border, S, border);
    ctx.fillRect(0, 0, border, S);
    ctx.fillRect(S - border, 0, border, S);

    ctx.strokeStyle = '#8a6848';
    ctx.lineWidth = 3;
    ctx.strokeRect(border + 6, border + 6, S - (border + 6) * 2, S - (border + 6) * 2);

    ctx.fillStyle = '#4a3224';
    const cx = S / 2;
    const cy = S / 2;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if ((i + j) % 2 !== 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx + i * 28, cy + j * 18 - 12);
        ctx.lineTo(cx + i * 28 + 14, cy + j * 18);
        ctx.lineTo(cx + i * 28, cy + j * 18 + 12);
        ctx.lineTo(cx + i * 28 - 14, cy + j * 18);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.07})`;
      ctx.fillRect(rng() * S, rng() * S, 2, 1);
    }
    return c;
  }

  /** Cadre bois — planches + lattes sombres. */
