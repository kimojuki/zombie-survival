// Murs de périmètre secteur 01 — visuel RP + colliders (segments) enregistrés dans world.js

(function () {

  'use strict';



  const BARRIER_SPAN = 2.35;

  const STEP = 1.95;

  const PAD = 0.35;

  const GATE_HALF = 5.5;

  const WALL_R = 0.72;
  const SEG_CHUNK = 22;



  const _concreteMat = new THREE.MeshLambertMaterial({ color: 0x8a8880 });

  const _metalMat = new THREE.MeshLambertMaterial({ color: 0x5a5e62 });

  const _wireMat = new THREE.MeshLambertMaterial({

    color: 0x4a5248,

    transparent: true,

    opacity: 0.55,

    side: THREE.DoubleSide,

  });

  const _warnMat = new THREE.MeshLambertMaterial({ color: 0xc9a020 });



  function _terrainY(x, z) {

    return ZS.getDecorGroundHeight?.(x, z)

      ?? ZS.getTerrainHeight?.(x, z)

      ?? 0;

  }



  function _registerWallCollider(col) {

    if (ZS.registerSectorCollider) {

      ZS.registerSectorCollider(col);

      return;

    }

    ZS.B?.addCollider?.(col);

  }



  function _subtractGaps(a0, a1, gaps) {

    let spans = [[a0, a1]];

    for (let g = 0; g < gaps.length; g++) {

      const ga = gaps[g][0];

      const gb = gaps[g][1];

      const next = [];

      for (let i = 0; i < spans.length; i++) {

        const a = spans[i][0];

        const b = spans[i][1];

        if (gb <= a || ga >= b) {

          next.push([a, b]);

          continue;

        }

        if (a < ga) next.push([a, ga]);

        if (b > gb) next.push([gb, b]);

      }

      spans = next;

    }

    return spans;

  }



  function _gateGapsForEdge(edge, bounds, gates) {

    const gaps = [];

    for (let i = 0; i < gates.length; i++) {

      const g = gates[i];

      if (edge === 'west') gaps.push([g.z - GATE_HALF, g.z + GATE_HALF]);

      else if (edge === 'north') gaps.push([g.x - GATE_HALF, g.x + GATE_HALF]);

      else if (edge === 'south') gaps.push([g.x - GATE_HALF, g.x + GATE_HALF]);

    }

    return gaps;

  }



  function _chunkSpan(a0, a1) {
    const out = [];
    let a = a0;
    while (a < a1 - 0.01) {
      const b = Math.min(a1, a + SEG_CHUNK);
      out.push([a, b]);
      a = b;
    }
    return out;
  }

  function _addSegCollidersAlongZ(x, z0, z1, gaps) {
    const spans = _subtractGaps(z0, z1, gaps);
    for (let i = 0; i < spans.length; i++) {
      const chunks = _chunkSpan(spans[i][0], spans[i][1]);
      for (let j = 0; j < chunks.length; j++) {
        const a = chunks[j][0];
        const b = chunks[j][1];
        if (b - a < 0.4) continue;
        _registerWallCollider({
          type: 'seg',
          x0: x,
          z0: a,
          x1: x,
          z1: b,
          r: WALL_R,
          maxY: 4.6,
          sectorWall: true,
        });
      }
    }
  }

  function _addSegCollidersAlongX(z, x0, x1, gaps) {
    const spans = _subtractGaps(x0, x1, gaps);
    for (let i = 0; i < spans.length; i++) {
      const chunks = _chunkSpan(spans[i][0], spans[i][1]);
      for (let j = 0; j < chunks.length; j++) {
        const a = chunks[j][0];
        const b = chunks[j][1];
        if (b - a < 0.4) continue;
        _registerWallCollider({
          type: 'seg',
          x0: a,
          z0: z,
          x1: b,
          z1: z,
          r: WALL_R,
          maxY: 4.6,
          sectorWall: true,
        });
      }
    }
  }



  function _jerseyBarrier(parent, x, z, rotY, y) {

    const g = new THREE.Group();

    g.position.set(x, y, z);

    g.rotation.y = rotY;

    const base = new THREE.Mesh(new THREE.BoxGeometry(BARRIER_SPAN, 0.92, 0.52), _concreteMat);

    base.position.y = 0.46;

    base.castShadow = false;

    base.receiveShadow = true;

    g.add(base);

    const top = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.38, 0.48), _concreteMat);

    top.position.set(0, 1.02, 0.04);

    top.rotation.z = 0.08;

    g.add(top);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.06), _metalMat);

    rail.position.y = 1.28;

    g.add(rail);

    parent.add(g);

    return g;

  }



  function _fencePanel(parent, x, z, rotY, y, w) {

    const g = new THREE.Group();

    g.position.set(x, y, z);

    g.rotation.y = rotY;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.1, 5), _metalMat);

    postL.position.set(-w * 0.5, 1.05, 0);

    const postR = postL.clone();

    postR.position.x = w * 0.5;

    g.add(postL, postR);

    for (let i = 0; i < 4; i++) {

      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), _metalMat);

      bar.position.y = 0.55 + i * 0.38;

      g.add(bar);

    }

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.55), _wireMat);

    mesh.position.y = 1.05;

    g.add(mesh);

    parent.add(g);

  }



  function _boardTexture(title, line1, line2) {

    const canvas = document.createElement('canvas');

    canvas.width = 512;

    canvas.height = 384;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d4c090';

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#5a3818';

    ctx.lineWidth = 12;

    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = '#1a1008';

    ctx.textAlign = 'center';

    ctx.font = 'bold 38px Georgia, serif';

    ctx.fillText(title, canvas.width / 2, 72);

    ctx.font = 'bold 52px Georgia, serif';

    ctx.fillStyle = '#8a2020';

    ctx.fillText('BIENTÔT', canvas.width / 2, 148);

    ctx.font = '24px Georgia, serif';

    ctx.fillStyle = '#3d2814';

    ctx.fillText(line1, canvas.width / 2, 200);

    ctx.fillText(line2, canvas.width / 2, 236);

    ctx.font = 'italic 20px Georgia, serif';

    ctx.fillStyle = '#5c4028';

    ctx.fillText('Équipe de survie — mise à jour à venir', canvas.width / 2, 290);

    ctx.font = 'bold 18px Arial';

    ctx.fillStyle = '#7a4a28';

    ctx.fillText('E — Lire', canvas.width / 2, canvas.height - 28);

    const tex = new THREE.CanvasTexture(canvas);

    tex.colorSpace = THREE.SRGBColorSpace;

    return tex;

  }



  function _buildGateSign(scene, gate) {

    const y = _terrainY(gate.x, gate.z);

    const root = new THREE.Group();

    root.position.set(gate.x, y, gate.z);

    root.rotation.y = gate.rotY || 0;



    const pole = new THREE.MeshLambertMaterial({ color: 0x5a3d22 });

    _jerseyBarrier(root, -1.8, 0, 0, 0);

    _jerseyBarrier(root, 1.8, 0, 0, 0);



    const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6), pole);

    pL.position.set(-0.85, 1.3, 0);

    const pR = pL.clone();

    pR.position.x = 0.85;

    root.add(pL, pR);



    const plank = new THREE.MeshLambertMaterial({

      map: _boardTexture(gate.title, gate.subtitle, 'Secteur en construction'),

    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 0.08), plank);

    board.position.set(0, 1.85, 0.12);

    board.rotation.x = -0.03;

    root.add(board);



    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.1), _warnMat);

    stripe.position.set(0, 2.55, 0.1);

    root.add(stripe);



    root.userData.isReadableSign = true;

    root.userData.signKind = 'sector_coming_soon';

    root.userData.gateTarget = gate.target;

    scene.add(root);



    const decorId = `sector_gate_${gate.id}`;

    root.userData.decorId = decorId;

    ZS.registerDecorSign?.(decorId, {

      root,

      signKind: 'sector_coming_soon',

      gateTarget: gate.target,

      title: gate.title,

      subtitle: gate.subtitle,

    });

  }



  function _skipAtGate(edge, x, z, gates, bounds) {

    for (let i = 0; i < gates.length; i++) {

      const g = gates[i];

      if (edge === 'west' && Math.abs(bounds.xMin - x) < 1.5) {

        if (Math.abs(z - g.z) < GATE_HALF) return true;

      }

      if (edge === 'north' && Math.abs(bounds.zMin - z) < 1.5) {

        if (Math.abs(x - g.x) < GATE_HALF) return true;

      }

      if (edge === 'south' && Math.abs(bounds.zMax - z) < 1.5) {

        if (Math.abs(x - g.x) < GATE_HALF) return true;

      }

    }

    return false;

  }



  /** Mur ouest/est : X fixe, Z variable */

  function _wallAlongZ(parent, xFixed, z0, z1, step, gates, bounds) {

    const len = z1 - z0;

    const n = Math.max(1, Math.ceil(len / step));

    let placed = 0;

    for (let i = 0; i <= n; i++) {

      const t = i / n;

      const z = z0 + len * t;

      const x = xFixed;

      if (_skipAtGate('west', x, z, gates, bounds)) continue;

      const y = _terrainY(x, z);

      _jerseyBarrier(parent, x, z, Math.PI / 2, y);

      if (placed % 4 === 1) _fencePanel(parent, x, z, Math.PI / 2, y, 2.6);

      placed++;

    }

    _addSegCollidersAlongZ(xFixed, z0, z1, _gateGapsForEdge('west', bounds, gates));

  }



  /** Mur nord/sud : Z fixe, X variable */

  function _wallAlongX(parent, zFixed, x0, x1, step, gates, bounds, edge) {

    const len = x1 - x0;

    const n = Math.max(1, Math.ceil(len / step));

    let placed = 0;

    for (let i = 0; i <= n; i++) {

      const t = i / n;

      const x = x0 + len * t;

      const z = zFixed;

      if (_skipAtGate(edge, x, z, gates, bounds)) continue;

      const y = _terrainY(x, z);

      _jerseyBarrier(parent, x, z, 0, y);

      if (placed % 4 === 2) _fencePanel(parent, x, z, 0, y, 2.6);

      placed++;

    }

    _addSegCollidersAlongX(zFixed, x0, x1, _gateGapsForEdge(edge, bounds, gates));

  }



  function buildSectorWalls(scene) {

    if (!scene || !ZS.SectorBounds?.SECTOR_01) return;

    const s = ZS.SectorBounds.SECTOR_01;

    const gates = ZS.SectorBounds.SECTOR_01_GATES || [];

    const root = new THREE.Group();

    root.name = 'sector01Walls';

    scene.add(root);



    const z0 = s.zMin + PAD;

    const z1 = s.zMax - PAD;

    const x0 = s.xMin + PAD;

    const x1 = s.xMax - PAD;



    _wallAlongZ(root, s.xMin, z0, z1, STEP, gates, s);

    _wallAlongX(root, s.zMin, x0, x1, STEP, gates, s, 'north');

    _wallAlongX(root, s.zMax, x0, x1, STEP, gates, s, 'south');



    for (let i = 0; i < gates.length; i++) _buildGateSign(scene, gates[i]);



    ZS.invalidateColliderCache?.();

    console.info('[sector] murs secteur 01 — colliders enregistrés');

  }



  window.ZS = window.ZS || {};

  ZS.buildSectorWalls = buildSectorWalls;

}());

