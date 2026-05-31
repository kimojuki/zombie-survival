// Paper Map — item ramassable, overlay canvas style carte militaire vieillie
(function () {
  'use strict';

  // Position de l'item dans le monde (salle de briefing militaire)
  const SPAWN_X = -240, SPAWN_Z = -226;

  let _state, _scene, _itemMesh = null;
  let _found  = localStorage.getItem('zs_map_found') === '1';
  let _open   = false;

  // ── Projection monde → canvas ─────────────────────────────────────────────
  // Monde visible : X de -310 à +290, Z de -300 à +120
  const S   = 1.35;                 // pixels par unité monde
  const OX  = 310, OZ = 300;       // (x=-310 → canvasX=0, z=-300 → canvasY=0)
  function cx(x) { return (x + OX) * S; }
  function cy(z) { return (z + OZ) * S; }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init(state, scene) {
    _state = state;
    _scene = scene;
    if (!_found) _spawnItem();
    _bindKeys();
  }

  function tick() {
    if (_itemMesh) {
      _itemMesh.rotation.y += 0.018;
      _itemMesh.position.y  = _itemMesh.userData.baseY + Math.sin(Date.now() * 0.002) * 0.12;
    }
    if (!_found && _itemMesh) {
      if (Math.hypot(_state.player.x - SPAWN_X, _state.player.z - SPAWN_Z) < 2.2)
        _pickup();
    }
  }

  // ── Item monde ────────────────────────────────────────────────────────────

  function _spawnItem() {
    const y  = ZS.getTerrainHeight(SPAWN_X, SPAWN_Z);
    const g  = new THREE.Group();
    const pm = new THREE.MeshLambertMaterial({ color: 0xd4b468 });
    const dm = new THREE.MeshLambertMaterial({ color: 0x8a6030 });
    // Feuille pliée
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.34), pm);
    g.add(sheet);
    // Coins cornés
    for (const [ox, oz] of [[-0.18,-0.14],[0.18,-0.14],[-0.18,0.14],[0.18,0.14]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), dm);
      c.position.set(ox, 0.01, oz); g.add(c);
    }
    // Halo doré
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.03, 12),
      new THREE.MeshLambertMaterial({ color: 0xffdd44, transparent: true, opacity: 0.28 })
    );
    ring.position.y = 0.22; g.add(ring);
    const pl = new THREE.PointLight(0xffcc44, 1.8, 6);
    pl.position.y = 0.5; g.add(pl);

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

  // ── Overlay ───────────────────────────────────────────────────────────────

  function toggleMap() { _open ? _close() : _open_(); }

  function _open_() {
    _open = true;
    document.getElementById('map-overlay').style.display = 'flex';
    _draw();
  }
  function _close() {
    _open = false;
    document.getElementById('map-overlay').style.display = 'none';
  }

  function _bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyM')          toggleMap();
      if (e.code === 'Escape' && _open) _close();
    });
    const closeBtn = document.getElementById('map-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', _close);
      closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); _close(); }, { passive: false });
    }
    const overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.addEventListener('click',      (e) => { if (e.target === overlay) _close(); });
      overlay.addEventListener('touchstart', (e) => { if (e.target === overlay) _close(); }, { passive: true });
    }
  }

  // ── Dessin ────────────────────────────────────────────────────────────────

  function _draw() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // ── Fond papier vieilli ──
    const bg = ctx.createRadialGradient(W*0.45, H*0.5, 20, W*0.5, H*0.5, W*0.75);
    bg.addColorStop(0, '#e2d49e'); bg.addColorStop(0.5, '#cdb86a'); bg.addColorStop(1, '#a89040');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Taches d'eau / café
    for (const [tx,ty,tr,ta] of [[90,75,58,0.05],[W-110,H-75,44,0.06],[W-50,90,28,0.05],[55,H-90,35,0.04]]) {
      const rg = ctx.createRadialGradient(tx,ty,0,tx,ty,tr);
      rg.addColorStop(0, `rgba(100,70,30,${ta*2})`); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(tx,ty,tr,tr*0.65,0.4,0,Math.PI*2); ctx.fill();
    }
    // Lignes de pli
    ctx.strokeStyle = 'rgba(90,60,20,0.18)'; ctx.lineWidth = 1;
    for (const fx of [W*0.33, W*0.67]) { ctx.beginPath(); ctx.moveTo(fx,0); ctx.lineTo(fx,H); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0,H*0.5); ctx.lineTo(W,H*0.5); ctx.stroke();
    // Bordures usées
    ctx.strokeStyle = 'rgba(80,50,15,0.5)'; ctx.lineWidth = 7;
    ctx.strokeRect(4,4,W-8,H-8);
    ctx.strokeStyle = 'rgba(80,50,15,0.2)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(12,12,W-24,H-24);

    // ── Grille militaire ──
    ctx.strokeStyle = 'rgba(80,60,20,0.10)'; ctx.lineWidth = 0.8;
    for (let gx = 0; gx < W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for (let gz = 0; gz < H; gz += 50) { ctx.beginPath(); ctx.moveTo(0,gz); ctx.lineTo(W,gz); ctx.stroke(); }

    // ── Terrain de base (légère couleur herbe) ──
    ctx.fillStyle = 'rgba(100,130,65,0.12)';
    ctx.fillRect(cx(-300), cy(-260), 400*S, 350*S);

    // ── Rivière ──
    ctx.save(); ctx.strokeStyle = '#3060aa'; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx(-97),cy(-265));
    ctx.bezierCurveTo(cx(-115),cy(-180),cx(-88),cy(-40),cx(-105),cy(90));
    ctx.stroke(); ctx.restore();
    // Label rivière
    ctx.save(); ctx.translate(cx(-104),cy(-80)); ctx.rotate(-1.1);
    ctx.fillStyle='rgba(30,60,140,0.7)'; ctx.font=`italic ${Math.round(9*S)}px Georgia,serif`;
    ctx.textAlign='center'; ctx.fillText('Rivière',0,0); ctx.restore();

    // ── Route principale E-O ──
    ctx.strokeStyle='#7a5828'; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(cx(110),cy(0)); ctx.lineTo(cx(-300),cy(0)); ctx.stroke();
    ctx.strokeStyle='#d4be70'; ctx.lineWidth=1.5; ctx.setLineDash([12,8]);
    ctx.beginPath(); ctx.moveTo(cx(100),cy(0)); ctx.lineTo(cx(-295),cy(0)); ctx.stroke();
    ctx.setLineDash([]);

    // Route vers zone militaire
    ctx.strokeStyle='#7a5828'; ctx.lineWidth=2.5; ctx.setLineDash([7,5]);
    ctx.beginPath(); ctx.moveTo(cx(-177),cy(-5));
    ctx.bezierCurveTo(cx(-186),cy(-30),cx(-196),cy(-55),cx(-200),cy(-80));
    ctx.stroke(); ctx.setLineDash([]);

    // ── ZONE 01 — Forêt ──
    ctx.save(); ctx.globalAlpha=0.42;
    const fgr = ctx.createRadialGradient(cx(0),cy(0),10,cx(0),cy(0),90*S);
    fgr.addColorStop(0,'#2a5010'); fgr.addColorStop(1,'rgba(40,80,20,0.5)');
    ctx.fillStyle=fgr;
    ctx.beginPath(); ctx.ellipse(cx(0),cy(0),95*S,80*S,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle='#1a3a08'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(cx(0),cy(0),95*S,80*S,0,0,Math.PI*2); ctx.stroke();
    // Symboles arbres
    ctx.fillStyle='#1a3a08';
    for (const[tx,tz] of [[-25,-25],[10,-35],[30,-10],[-35,20],[20,28],[-10,15],[0,-12],[15,5],[-28,-8]]) {
      const px=cx(tx),py=cy(tz);
      ctx.beginPath(); ctx.moveTo(px,py-8); ctx.lineTo(px-5,py+4); ctx.lineTo(px+5,py+4); ctx.closePath(); ctx.fill();
    }

    // ── ZONE 02 — Small Town ──
    ctx.save(); ctx.globalAlpha=0.38;
    const tgr=ctx.createLinearGradient(cx(-295),cy(-55),cx(-125),cy(55));
    tgr.addColorStop(0,'#6a5040'); tgr.addColorStop(1,'#8a7060');
    ctx.fillStyle=tgr;
    ctx.fillRect(cx(-295),cy(-55),170*S,110*S); ctx.restore();
    ctx.strokeStyle='#4a3020'; ctx.lineWidth=2;
    ctx.strokeRect(cx(-295),cy(-55),170*S,110*S);
    // Bâtiments symboliques
    ctx.fillStyle='#5a3e28';
    for (const[bx,bz,bw,bd] of [
      [-285,-44,11,9],[-270,-42,9,8],[-255,-43,10,9],[-238,-41,8,9],
      [-283,6,12,8],[-265,8,9,8],[-248,5,11,9],[-228,8,9,8],
      [-267,-14,6,6],[-250,-12,8,6],[-233,-14,6,7],
    ]) ctx.fillRect(cx(bx),cy(bz),bw*S,bd*S);

    // ── ZONE 05 — Military ──
    ctx.save(); ctx.globalAlpha=0.45;
    const mgr=ctx.createLinearGradient(cx(-275),cy(-240),cx(-125),cy(-80));
    mgr.addColorStop(0,'#3a5428'); mgr.addColorStop(1,'#4a6030');
    ctx.fillStyle=mgr;
    ctx.fillRect(cx(-275),cy(-240),150*S,160*S); ctx.restore();
    ctx.strokeStyle='#2a3a18'; ctx.lineWidth=3; ctx.setLineDash([10,4]);
    ctx.strokeRect(cx(-275),cy(-240),150*S,160*S); ctx.setLineDash([]);
    // Bâtiments militaires
    ctx.fillStyle='#2a3818';
    for (const[bx,bz,bw,bd] of [
      [-211,-200,22,14],[-264,-199,20,13],[-154,-199,14,10],
      [-209,-234,18,12],[-248,-232,12,9],[-156,-231,10,8],
    ]) ctx.fillRect(cx(bx),cy(bz),bw*S,bd*S);
    // Héliport
    ctx.strokeStyle='#2a3818'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx(-147),cy(-213),8*S,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx(-150),cy(-213)); ctx.lineTo(cx(-144),cy(-213)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx(-147),cy(-216)); ctx.lineTo(cx(-147),cy(-210)); ctx.stroke();
    // Tour de comm (triangle = tour)
    ctx.fillStyle='#1a2210';
    ctx.beginPath(); ctx.moveTo(cx(-163),cy(-237)); ctx.lineTo(cx(-159),cy(-222)); ctx.lineTo(cx(-167),cy(-222)); ctx.closePath(); ctx.fill();
    // Clôture de périmètre (pointillé)
    ctx.strokeStyle='rgba(30,50,15,0.7)'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
    ctx.strokeRect(cx(-275)+2,cy(-240)+2,150*S-4,160*S-4); ctx.setLineDash([]);

    // ── ZONE 03 — Main City (CX=-20, CZ=-185 | X:-85→+45, Z:-250→-120) ──
    ctx.save(); ctx.globalAlpha=0.42;
    const mcgr=ctx.createLinearGradient(cx(-85),cy(-250),cx(45),cy(-120));
    mcgr.addColorStop(0,'#5a5868'); mcgr.addColorStop(1,'#6a6878');
    ctx.fillStyle=mcgr;
    ctx.fillRect(cx(-85),cy(-250),130*S,130*S); ctx.restore();
    ctx.strokeStyle='#3a3848'; ctx.lineWidth=2;
    ctx.strokeRect(cx(-85),cy(-250),130*S,130*S);
    // Grille de rues
    ctx.strokeStyle='rgba(200,190,160,0.38)'; ctx.lineWidth=1.2;
    for(const sx of [-65,-20,35]) { ctx.beginPath(); ctx.moveTo(cx(sx),cy(-250)); ctx.lineTo(cx(sx),cy(-120)); ctx.stroke(); }
    for(const sz of [-240,-185,-135]) { ctx.beginPath(); ctx.moveTo(cx(-85),cy(sz)); ctx.lineTo(cx(45),cy(sz)); ctx.stroke(); }
    // Bâtiments Main City
    ctx.fillStyle='#3a3a48';
    for(const[bx,bz,bw,bd] of [
      [-63,-249,16,11],[-4,-248,22,12],[29,-247,8,7],
      [-63,-128,15,11],[-4,-133,16,10],[29,-131,8,7],
      [-38,-191,20,15],[29,-212,9,8],
      [-68,-216,13,9],[-68,-172,12,9],
    ]) ctx.fillRect(cx(bx),cy(bz),bw*S,bd*S);
    // Route accès forêt → Main City (plein nord)
    ctx.strokeStyle='#7a5828'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(cx(0),cy(-5)); ctx.bezierCurveTo(cx(-5),cy(-50),cx(-12),cy(-90),cx(-20),cy(-120)); ctx.stroke();
    ctx.setLineDash([]);

    // ── Zone inconnue (nord) — papier déchiré ──
    ctx.save(); ctx.globalAlpha=0.18;
    ctx.fillStyle='#8a6a30';
    for (const[px2,py2,r2] of [[cx(-50),cy(-240),25],[cx(50),cy(-230),20],[cx(-150),cy(-265),30]]) {
      ctx.beginPath(); ctx.arc(px2,py2,r2,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=0.09; ctx.fillStyle='#3a2010';
    ctx.font=`bold 16px Georgia`; ctx.textAlign='center';
    ctx.fillText('? ? ?', cx(-50), cy(-250));
    ctx.fillText('INCONNU', cx(-50), cy(-235));
    ctx.restore();

    // ── Labels ──
    ctx.shadowColor='rgba(255,230,150,0.9)'; ctx.shadowBlur=8;
    // Forêt
    ctx.fillStyle='#0e2804'; ctx.textAlign='center';
    ctx.font=`bold ${Math.round(12.5*S)}px Georgia,serif`;
    ctx.fillText('FORÊT DE DÉPART',cx(0),cy(-48));
    ctx.font=`${Math.round(9*S)}px Georgia,serif`;
    ctx.fillText('[ SECTEUR 01 ]',cx(0),cy(-35));
    // Town
    ctx.fillStyle='#2a1808';
    ctx.font=`bold ${Math.round(11.5*S)}px Georgia,serif`;
    ctx.fillText('SMALL TOWN',cx(-210),cy(-8));
    ctx.font=`${Math.round(8.5*S)}px Georgia,serif`;
    ctx.fillText('[ SECTEUR 02 ]',cx(-210),cy(4));
    // Main City
    ctx.fillStyle='#12121e';
    ctx.font=`bold ${Math.round(11.5*S)}px Georgia,serif`;
    ctx.fillText('MAIN CITY',cx(-20),cy(-196));
    ctx.font=`${Math.round(7.5*S)}px Georgia,serif`;
    ctx.fillText('[ SECTEUR 03 ]',cx(-20),cy(-185));
    // Military
    ctx.fillStyle='#0e1e06';
    ctx.font=`bold ${Math.round(12*S)}px Georgia,serif`;
    ctx.fillText('⚠ ZONE MILITAIRE',cx(-200),cy(-182));
    ctx.font=`${Math.round(8.5*S)}px Georgia,serif`;
    ctx.fillText('[ SECTEUR 05 ]',cx(-200),cy(-169));
    ctx.fillText('ACCÈS RESTREINT',cx(-200),cy(-157));
    ctx.shadowBlur=0;

    // ── Position joueur ──
    const px2 = _state?.player?.x ?? 0;
    const pz2 = _state?.player?.z ?? 0;
    const pcx=cx(px2), pcy=cy(pz2);
    ctx.fillStyle='rgba(220,30,10,0.35)';
    ctx.beginPath(); ctx.arc(pcx,pcy,11,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ff2200'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pcx-14,pcy); ctx.lineTo(pcx+14,pcy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pcx,pcy-14); ctx.lineTo(pcx,pcy+14); ctx.stroke();
    ctx.fillStyle='#ff2200'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(pcx,pcy,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#cc1100'; ctx.font=`bold 9px Arial,sans-serif`; ctx.textAlign='left';
    ctx.fillText('◄ VOUS ÊTES ICI',pcx+8,pcy-4);

    // ── Boussole ──
    _drawCompass(ctx, W-68, 68, 42);

    // ── Légende ──
    _drawLegend(ctx, 18, H-120);

    // ── Barre d'échelle ──
    const sx=cx(-300)+10, sy=H-25, sl=100*S;
    ctx.strokeStyle='#3a2010'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+sl,sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx,sy-5); ctx.lineTo(sx,sy+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+sl,sy-5); ctx.lineTo(sx+sl,sy+5); ctx.stroke();
    ctx.fillStyle='#3a2010'; ctx.font=`10px Georgia`; ctx.textAlign='center';
    ctx.fillText('100 m',sx+sl/2,sy-7);

    // ── Titre ──
    ctx.fillStyle='#2a1808';
    ctx.font=`bold ${Math.round(11*S)}px Georgia,serif`;
    ctx.textAlign='center';
    ctx.fillText('CARTE TACTIQUE — ZONE DE SURVIE', W/2, 24);
    ctx.font=`${Math.round(7.5*S)}px Georgia,serif`;
    ctx.fillStyle='rgba(80,40,10,0.7)';
    ctx.fillText('DOCUMENT CONFIDENTIEL — NE PAS DIVULGUER', W/2, 37);

    // ── Tampon CLASSIFIÉ ──
    ctx.save();
    ctx.translate(W-108, H-75); ctx.rotate(-0.38);
    ctx.strokeStyle='rgba(160,20,20,0.55)'; ctx.lineWidth=2.5;
    ctx.strokeRect(-50,-16,100,32);
    ctx.fillStyle='rgba(160,20,20,0.55)';
    ctx.font=`bold 13px Arial,sans-serif`; ctx.textAlign='center';
    ctx.fillText('CLASSIFIÉ',0,6);
    ctx.restore();
  }

  function _drawCompass(ctx, x, y, r) {
    ctx.fillStyle='rgba(200,180,120,0.55)';
    ctx.strokeStyle='#5a3010'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // Nord rouge
    ctx.fillStyle='#cc2222';
    ctx.beginPath(); ctx.moveTo(x,y-r*0.82); ctx.lineTo(x-r*0.14,y+r*0.12); ctx.lineTo(x+r*0.14,y+r*0.12); ctx.closePath(); ctx.fill();
    // Sud sombre
    ctx.fillStyle='#2a2010';
    ctx.beginPath(); ctx.moveTo(x,y+r*0.82); ctx.lineTo(x-r*0.14,y-r*0.12); ctx.lineTo(x+r*0.14,y-r*0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#3a2010'; ctx.font=`bold ${r*0.36}px Georgia,serif`; ctx.textAlign='center';
    ctx.fillText('N',x,y-r*1.2); ctx.fillText('S',x,y+r*1.3);
    ctx.fillText('E',x+r*1.25,y+4); ctx.fillText('O',x-r*1.25,y+4);
  }

  function _drawLegend(ctx, x, y) {
    ctx.strokeStyle='#8a6030'; ctx.lineWidth=1;
    ctx.strokeRect(x-5, y-18, 130, 112);
    ctx.fillStyle='rgba(200,175,100,0.6)'; ctx.fillRect(x-4,y-17,129,111);
    const items = [
      ['#2a5010','F','Forêt'],['#5a4030','B','Zone urbaine'],
      ['#3a5428','M','Zone militaire'],['#3060aa','R','Rivière'],
      ['#7a5828','=','Route'],['#ff2200','●','Votre position'],
    ];
    ctx.font=`10px Georgia,serif`; ctx.textAlign='left';
    items.forEach(([col,sym,label],i) => {
      ctx.fillStyle=col; ctx.fillText(sym, x+3, y+i*16);
      ctx.fillStyle='#3a2010'; ctx.fillText(label, x+20, y+i*16);
    });
  }

  window.ZS = window.ZS || {};
  ZS.Map = { init, tick, toggleMap };
}());
