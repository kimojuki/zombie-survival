// buildWorld, buildWorldAsync — extrait de world.js (IIFE)
function _yieldFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  async function _buildWorldCore(scene, onProgress, asyncMode) {
    const LL = ZS.LoadLog;
    const _perf = typeof performance !== 'undefined' && (window.__ZS_PERF || LL?.isEnabled?.());
    const _t0 = _perf ? performance.now() : 0;
    let _t = _t0;
    LL?.stepStart?.('world-core');
    _scene = scene;
    _skyRoot = new THREE.Group();
    _skyRoot.name = 'skyRoot';
    scene.background = new THREE.Color(0x5ab2d8);
    scene.fog = new THREE.Fog(0x5ab2d8, 95, 170);   // coupe alignée sur camera.far (175)

    scene.add(_skyRoot);
    _ambientLight = new THREE.AmbientLight(0xfff8e7, 0.65);
    scene.add(_ambientLight);

    // Lumière hémisphérique : donne une teinte ciel/sol pour rendre l'ambiance plus naturelle
    _hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2a4a18, 0.30);
    scene.add(_hemiLight);

    const _mobileBuild = _isMobileBuild();
    const _buildProf = _optsProfile();
    _sunLight = new THREE.DirectionalLight(0xfff5dd, 1.4);
    _sunLight.castShadow = _buildProf ? !!_buildProf.shadows : !_mobileBuild;
    const _shadowMap = _buildProf?.shadowMapSize ?? (_mobileBuild ? 512 : 1024);
    _sunLight.shadow.mapSize.width  = _shadowMap;
    _sunLight.shadow.mapSize.height = _shadowMap;
    _sunLight.shadow.camera.near    = 1;
    _sunLight.shadow.camera.far     = 220;
    // Frustum d'ombre serré qui SUIT le joueur (voir setShadowCenter) → passe d'ombre
    // bien moins coûteuse (peu de casters) et ombres nettes partout sur la carte.
    _sunLight.shadow.camera.left    = -58;
    _sunLight.shadow.camera.right   = 58;
    _sunLight.shadow.camera.top     = 58;
    _sunLight.shadow.camera.bottom  = -58;
    _sunLight.shadow.bias           = -0.0004;
    _sunLight.shadow.normalBias     = 0.03;
    scene.add(_sunLight);
    scene.add(_sunLight.target);   // nécessaire pour orienter l'ombre vers le joueur

    _moonLight = new THREE.DirectionalLight(0x6677bb, 0);
    scene.add(_moonLight);

    _sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _sunTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    }));
    _sunSprite.scale.set(18, 18, 1);
    _sunSprite.frustumCulled = false;
    _sunSprite.renderOrder = 0;
    scene.add(_sunSprite);

    _moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _moonTex, color: 0xffffff, transparent: true, depthWrite: false, depthTest: true,
    }));
    _moonSprite.scale.set(12, 12, 1);
    _moonSprite.frustumCulled = false;
    _moonSprite.renderOrder = 0;
    scene.add(_moonSprite);
    if (_buildProf ? _buildProf.stars : !_mobileBuild) spawnStars();
    spawnClouds();

    onProgress?.(0.08, 'Ciel et éclairage');
    LL?.mark?.('world-sky');
    onProgress?.(0.06, 'Routes');
    if (ZS.AdminRoads?.prefetch) await ZS.AdminRoads.prefetch();
    if (ZS.S01Terrain?.registerWorld) ZS.S01Terrain.registerWorld();
    if (ZS.SpawnZone?.registerTerrain) ZS.SpawnZone.registerTerrain();
    if (ZS.Roads?.registerTerrain) ZS.Roads.registerTerrain();
    if (ZS.S01Roads?.registerRoads) ZS.S01Roads.registerRoads();
    if (ZS.AdminRoads?.registerRoads) ZS.AdminRoads.registerRoads();
    if (ZS.Buildings?.applyRoadFlattening) ZS.Buildings.applyRoadFlattening();
    onProgress?.(0.22, 'Terrain');
    LL?.stepStart?.('world-terrain');
    if (asyncMode) {
      await buildTerrainAsync(scene, (t) => onProgress?.(0.22 + t * 0.28, 'Terrain'));
    } else {
      await buildTerrainAsync(scene);
    }
    if (_perf) {
      const terrainMs = Math.round(performance.now() - _t);
      console.log('[world] terrain', terrainMs, 'ms');
      LL?.stepEnd?.('world-terrain', { ms: terrainMs });
      _t = performance.now();
    } else {
      LL?.stepEnd?.('world-terrain');
    }
    if (asyncMode) await _yieldFrame();
    onProgress?.(0.55, 'Plage et camp');
    LL?.stepStart?.('world-buildings');
    const buildingColliders = ZS.Buildings.buildAll(scene, { deferBeachDecor: true });
    if (_perf) {
      const buildMs = Math.round(performance.now() - _t);
      console.log('[world] buildings', buildMs, 'ms');
      LL?.stepEnd?.('world-buildings', { ms: buildMs });
      _t = performance.now();
    } else {
      LL?.stepEnd?.('world-buildings');
    }
    // Routes / décor plage-forêt : différés après game-init (buildMeshes ~100s bloquait le sync).
    if (_perf) {
      const totalMs = Math.round(performance.now() - _t0);
      console.log('[world] total', totalMs, 'ms');
      LL?.stepEnd?.('world-core', { ms: totalMs });
    } else {
      LL?.stepEnd?.('world-core');
    }
    for (const c of buildingColliders) _colliders.push(c);
    ZS.buildSectorWalls?.(scene);
    tickDayNight(0);
    applyGraphicsOptions(_optsProfile());
    return buildingColliders;
  }

  /** Attend que le ring LOD urgent se vide (timeout pour ne pas bloquer indéfiniment). */
  async function _waitLodUrgentBelow(max, timeoutMs) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      const n = ZS.Network?.getLodUrgentPending?.() ?? 0;
      if (n <= max) return n;
      await _yieldFrame();
      const s = ZS.PerfMonitor?.getStats?.();
      if (s?.frameMsP95 > 95 || (s?.fps != null && s.fps < 13)) {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    }
    return ZS.Network?.getLodUrgentPending?.() ?? -1;
  }

  let _postSpawnVisualsStarted = false;

  /** Routes + décor plage/forêt — après game-init pour ne pas bloquer le sync. */
  function runPostSpawnVisualBuilds(scene) {
    if (_postSpawnVisualsStarted) return;
    _postSpawnVisualsStarted = true;
    const s = scene || _scene;
    if (!s) return;
    const LL = ZS.LoadLog;
    LL?.mark?.('post-spawn-visuals-scheduled');

    const idle = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 2500 })
      : (fn) => setTimeout(fn, 120);

    idle(async () => {
      LL?.mark?.('post-spawn-visuals-start');
      try {
        if (ZS.RoadNetwork?.buildMeshesAsync) {
          LL?.stepStart?.('road-meshes');
          const t0 = performance.now();
          ZS.BarrierPrefabs?.resetBarrierColliders?.();
          if (ZS.B?.whenRoadTexturesReady) {
            LL?.mark?.('road-textures-wait');
            await ZS.B.whenRoadTexturesReady();
          }
          const deferN = ZS._backlogPlan?.pressure?.defer
            ?? ZS.Network?.getDeferPendingCount?.()
            ?? 0;
          const lodMid = ZS._backlogPlan?.pressure?.lodMid ?? 999;
          const roadHeavy = deferN > 480 && lodMid > 140;
          const roadBudget = roadHeavy
            ? (ZS._isMobile ? 6 : 9)
            : (ZS._roadBuildBudgetMs ?? (ZS._isMobile ? 9 : 12));
          await ZS.RoadNetwork.buildMeshesAsync(s, ZS.B.M, {
            ribbonStep: roadHeavy ? 0.55 : 0.42,
            laneStep: roadHeavy ? 0.72 : 0.58,
            budgetMs: roadBudget,
            cols: ZS._isMobile ? 3 : 4,
            skipShoulder: false,
            skipLaneOverlay: roadHeavy,
            deferLaneOverlay: !roadHeavy,
            skipBarriers: roadHeavy,
            deferBarriers: false,
            fastGround: true,
            resnapMeshes: false,
            refineNormals: false,
          });
          const ms = Math.round(performance.now() - t0);
          console.log('[world] roads', ms, 'ms (post-spawn async)');
          LL?.stepEnd?.('road-meshes', { ms, async: true });
          await _yieldFrame();
        } else if (ZS.RoadNetwork?.buildMeshes) {
          LL?.stepStart?.('road-meshes');
          const t0 = performance.now();
          ZS.BarrierPrefabs?.resetBarrierColliders?.();
          ZS.RoadNetwork.buildMeshes(s, ZS.B.M);
          const ms = Math.round(performance.now() - t0);
          console.log('[world] roads', ms, 'ms (post-spawn)');
          LL?.stepEnd?.('road-meshes', { ms });
          await _yieldFrame();
        }
        if (ZS.SpawnZone?.finishBeachDecorAsync) {
          const urgentLeft = await _waitLodUrgentBelow(64, 3500);
          LL?.mark?.('beach-decor-wait-urgent', { urgentLeft });
          LL?.stepStart?.('beach-decor-deferred');
          ZS._sectorDecorBusy = true;
          try {
            await ZS.SpawnZone.finishBeachDecorAsync(s);
          } finally {
            ZS._sectorDecorBusy = false;
            ZS._markSectorDecorCooldown?.();
          }
          LL?.stepEnd?.('beach-decor-deferred');
          await _yieldFrame();
        }
        if (ZS.finishForestDecorAsync) {
          const urgentLeft = await _waitLodUrgentBelow(48, 6000);
          LL?.mark?.('forest-decor-wait-urgent', { urgentLeft });
          LL?.stepStart?.('forest-decor-deferred');
          ZS._sectorDecorBusy = true;
          try {
            await ZS.finishForestDecorAsync(s);
          } finally {
            ZS._sectorDecorBusy = false;
            ZS._markSectorDecorCooldown?.();
          }
          LL?.stepEnd?.('forest-decor-deferred');
        }
        LL?.postSummary?.('post-spawn-visuals');
      } catch (e) {
        console.warn('[world] post-spawn visuals', e);
        LL?.mark?.('post-spawn-visuals-error', { err: String(e?.message || e) });
      }
    });
  }

  function buildWorld(scene) {
    _buildWorldCore(scene, null, false);
  }

  async function buildWorldAsync(scene, onProgress) {
    onProgress?.(0, 'Préparation');
    await _yieldFrame();
    await _buildWorldCore(scene, onProgress, true);
    onProgress?.(0.92, 'Finalisation');
    await _yieldFrame();
    onProgress?.(1, 'Monde prêt');
  }
