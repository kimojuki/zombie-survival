// Lisière rondins + mesh sol camp — extrait de spawn_clearing.js (IIFE)
function buildCampGround(scene, cx, cz, baseY, B) {
    const M = _campMats();
    const stone = M ? M.stone() : new THREE.MeshLambertMaterial({ color: 0x6a6458 });
    const gapCenter = CAMP_GAP_CENTER;
    const gapWidth = CAMP_GAP_WIDTH;
    const groundRx = CLEAR_RX * 0.98;
    const groundRz = CLEAR_RZ * 0.98;
    const ringRx = CLEAR_RX * 0.94;
    const ringRz = CLEAR_RZ * 0.94;
    const arcStart = gapCenter + gapWidth;
    const arcSpan = Math.PI * 2 - gapWidth * 2;

    const shape = new THREE.Shape();
    const groundSteps = 56;
    for (let i = 0; i <= groundSteps; i++) {
      const a = arcStart + (i / groundSteps) * arcSpan;
      const p = _shapeEllipsePoint(a, groundRx, groundRz);
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    }
    const tongue = _shapeEllipsePoint(
      CAMP_GAP_CENTER,
      groundRx * 0.38,
      groundRz * 1.05
    );
    shape.lineTo(tongue.x, tongue.y);
    shape.closePath();

    const gGeo = new THREE.ShapeGeometry(shape, 4);
    gGeo.rotateX(-Math.PI / 2);
    const gPos = gGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const lx = gPos.getX(i);
      const lz = gPos.getZ(i);
      const x = cx + lx;
      const z = cz + lz;
      gPos.setY(i, getDecorGroundHeight(x, z, { layer: 'camp' }));
    }
    gGeo.computeVertexNormals();
    const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({
      map: _groundTex,
      color: 0xffffff,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -10,
    }));
    ground.position.set(cx, 0, cz);
    ground.renderOrder = 3;
    ground.receiveShadow = true;
    scene.add(ground);
    ZS.registerGroundMesh?.(ground);

    const arcLen = _ellipseArcLength(ringRx, ringRz, arcStart, arcStart + arcSpan);
    const logCount = Math.max(16, Math.round(arcLen / 0.42));
    const rockEvery = Math.max(4, Math.round(logCount / 10));

    for (let i = 0; i < logCount; i += rockEvery) {
      const tMid = (i + 0.5) / logCount;
      const a = arcStart + tMid * arcSpan;
      const [px, pz] = _ellipseWorld(a, ringRx, ringRz, cx, cz);
      const outA = Math.atan2((pz - cz) / ringRz, (px - cx) / ringRx);
      const sx = cx + Math.cos(outA) * (ringRx + 0.28);
      const sz = cz + Math.sin(outA) * (ringRz + 0.28);
      const sy = getDecorGroundHeight(sx, sz, { layer: 'terrain' });
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.10 + (i % 2) * 0.025, 0), stone);
      rock.position.set(sx, sy + 0.06, sz);
      rock.rotation.set(i * 0.25, i * 0.45, 0);
      rock.castShadow = true;
      scene.add(rock);
    }

  }
