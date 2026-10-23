# Architecture de chargement des ressources — Zombie Survival

Document de référence pour la migration progressive vers un pipeline **World Streamer** unifié (client Three.js + sync Socket.io).

**Statut :** migration en cours (juin 2026)  
**Code moteur :** `apps/client/src/engine/`  
**Legacy (en retrait) :** `apps/client/public/js/network/chunks/` — gates dispersés

---

## 1. Problème actuel

Le client hydrate le monde via **~15 conditions indépendantes** (defer, LOD, stream, sector, init-vis, frame-recover, postSpawnVisualBusy…). Chaque optimisation défensive ajoute un gate ; ils se bloquent mutuellement → zone spawn incomplète, colliders à 60–100 s, sentier/props absents.

**Anti-pattern :** N gates × M queues = starvation oscillante.  
**Pattern pro :** 1 orchestrateur × 1 priority queue × budgets frame partagés.

---

## 2. Architecture cible

```
StreamingSource (joueur)
        │
        ▼
WorldContentLoader ──► PriorityQueue (heap par score)
        │                      │
        ▼                      ▼
BudgetGovernor          Job types: collider, decor-spawn, lod, road, forest…
        │
        ▼
FrameRunner (existant) + workers legacy (transition)
```

### Anneaux de priorité (2D autour du joueur)

| Anneau | Rayon | Objectif | Délai cible |
|--------|-------|----------|-------------|
| **CRITICAL** | 0–80 m | Gameplay-ready (colliders + interact) | < 2 s après spawnReady |
| **NEAR** | 80–160 m | Meshes LOD0 + décor stream | < 5 s |
| **FAR** | 160–320 m | LOD1, props, arbres API | async budgeté |
| **STREAM** | > 320 m | Fetch paginé serveur | exploration |

Constantes : `apps/client/src/engine/content-rings.js`

### États d'un job

```
Requested → Loaded → GameplayReady → Visible → (Unload)
```

- **Gameplay-ready** : collider + registre interact — peut précéder le mesh HD.
- **Render-ready** : mesh visible dans la scène.

---

## 3. Composants moteur (v2)

| Module | Fichier | Rôle |
|--------|---------|------|
| **WorldContentLoader** | `world-content-loader.js` | Queue décor, scoring, batch selection |
| **SpatialChunkStreamer** | `spatial-chunk-streamer.js` | Couches forêt/plage 64 m, visibilité, LRU hooks |
| **BudgetGovernor** | `budget-governor.js` | Budget ms/frame par type de job |
| **ContentPriority** | `content-priority.js` | Score distance + anneau + tags P0 |
| **ContentRings** | `content-rings.js` | Rayons CRITICAL / NEAR / FAR |
| **BacklogScheduler** | `backlog-scheduler.js` | Pression defer/LOD/stream (existant) |
| **FrameRunner** | `frame-runner.js` | Ordre workers par plan (existant) |
| **Telemetry** | `telemetry.js` | Snapshots LoadLog |

Exposé via `window.ZS.Engine` (`install.js`).

---

## 4. Phases boot → gameplay

### A — Boot (0–15 s)

1. Shell + auth + scripts legacy  
2. Terrain + eau + ciel  
3. Socket + `game-init` snapshot metadata  
4. **spawnReady** quand anneau CRITICAL gameplay-ready — **pas** quand 950 décor sont instanciés

### B — Spawn zone (0–5 s post-spawn)

Ordre strict :

1. P0 terrain sous les pieds  
2. P1 sentier / routes proches (`ENABLE_CODEGEN_TRAIL_MESH`)  
3. P2 colliders zone spawn (`_registerSpawnZoneCollidersSync`)  
4. P3 flush defer CRITICAL (`_flushSpawnZoneDeferSpawn`)  
5. P4 post-spawn visual (roads, beach, forest) — budgeté, non bloquant pour spawnReady

### C — Gameplay continu

Chaque frame `network.tick` :

1. `BacklogScheduler.evaluate(ctx)` → plan  
2. `BudgetGovernor.frameBudget(ctx, plan)` → ms restants  
3. `FrameRunner.runDecorWorkers` + `ContentLoader.drainDecorBatch`  
4. Telemetry snapshot (8 s)

---

## 5. Tags gameplay (P0)

Objets **jamais** bloqués par LOD forêt ou stream gate :

- Sentier plage (`trail`, `BEACH_TRAIL`)  
- Palmiers / props intro spawn  
- Coffres / interact zone tutoriel  
- Colliders murs sector bounds proches

Tag : `p0-gameplay` → boost score dans `content-priority.js`.

---

## 6. Plan de migration (lots)

| Lot | Scope | Statut | Fichiers touchés |
|-----|-------|--------|------------------|
| **L0** | Engine E0 (scheduler, frame runner) | ✅ Fait | `src/engine/backlog-scheduler.js` |
| **L1** | Spawn zone fixes (colliders sync, defer flush, sentier) | ✅ Fait | `network/chunks/06-game-init`, `proc_spawn` |
| **L2a** | WorldContentLoader + rings + budget + doc | ✅ Fait | `src/engine/world-content-loader.js` |
| **L2b** | Queue décor = ContentLoader (legacy adapter) | ✅ Fait | `network/chunks/02-decor-part2-stream-gates.js` |
| **L2c** | Gates → BudgetGovernor + drainDecorRing | ✅ Fait | `budget-governor.js`, `decor-pressure.js` |
| **L3** | Chunks spatial 64 m (forêt, plage, streamer) | ✅ Fait | `spatial-chunk-streamer.js`, `forest_decor`, `beach_decor` |
| **L3b** | Routes chunkées + unload hook | ✅ Fait | `road_network/chunks/09-road-chunks.js` |
| **L3c** | Exploration reload (prune soft, boost ré-entrée, chunks force) | ✅ Fait | `world-content-loader`, `budget-governor`, `network/chunks/02-*` |
| **L3d** | Prefetch prédictif (vélocité, lead anchor, stream/fetch devant) | ✅ Fait | `content-priority`, `backlog-scheduler`, `network/tick` |
| **L3e** | Decor gap trace (début/fin/durée manque décor) | ✅ Fait | `decor-gap-monitor.js`, `network/tick`, spawn hooks |
| **L3f** | Critical surge (spawn/stream boost anneau CRITICAL en retard) | ✅ Fait | `world-content-loader`, `backlog-scheduler`, `budget-governor`, `network/chunks/02-*` |
| **L3g** | Ring surge NEAR + spawn-only idle + gap travel-near | ✅ Fait | `content-rings`, `decor-gap-monitor`, `stream-gates` |
| **L3h** | Drain-first FAR disk + pendingFar metrics + gap stream pause | ✅ Fait | `world-content-loader`, `defer-queue`, `vis-init` |
| **L4** | Workers IO (fetch/decode hors main thread) | Prochain | `src/net/` |

Chaque lot = PR testable, `client-version.json` incrémenté, entrée DEV_TRACKER.

---

## 7. Métriques (LoadLog)

| Event | Cible spawn plage |
|-------|-------------------|
| `time_to_spawnReady` | < 3 s |
| `spawn-zone-colliders` | < 2 s, registered ≈ total |
| `spawn-zone-defer-flush` | pending CRITICAL < 50 @ T+10 s |
| `engine-content-snapshot` | defer critical < 20 @ T+5 s |
| `colliders_near_ms` | < 2000 ms (plus 106 s) |

---

## 8. API WorldContentLoader (L2a)

```js
const loader = ZS.Engine.ContentLoader;

loader.setStreamingSource(x, z, { vx, vz });
loader.setBootPhase('sync'); // scripts | world | sync | init-vis | steady

// Queue décor (remplace _decorSpawnDefer.pending)
loader.getDecorPending();       // Array ref stable
loader.resetDecor();
loader.pushDecor(d);
loader.pushDecorMany(list);

// Sélection batch (remplace ranked sort inline)
loader.selectDecorBatch(px, pz, { maxItems, spawnR2, streamR2 });
// → { picks: [{ index, d, ring, score }], ... }

loader.getStats();              // compteurs par anneau

// Spatial chunks (L3)
const chunks = ZS.Engine.ChunkStreamer;
chunks.ensureLayer('forest', { chunkSize: 64 });
chunks.registerChunk('forest', '3,0', { group, cx, cz });
chunks.tick(camX, camZ, 2);     // visibilité unifiée
chunks.prefetchKeysNear(x, z);  // lazy-load futur
```

---

## 9. Références industrie

- Unreal World Partition — streaming source + cellules  
- CryEngine — paks boot vs streaming disque  
- Unity Addressables — handles async + ref-count  
- Open-world browser (Three.js) — chunks 64–256 m, Workers, instancing  

Voir aussi : [docs/V2_CLIENT_MIGRATION.md](../docs/V2_CLIENT_MIGRATION.md), [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

---

## 10. Fichiers legacy → cible

| Legacy | Migration vers |
|--------|----------------|
| `_decorSpawnDefer` | `ContentLoader.getDecorPending()` |
| `_tickDecorSpawnDefer` ranked sort | `ContentLoader.selectDecorBatch()` |
| `_decorTickBudgetMs` | `BudgetGovernor.getDecorBudget()` |
| `_buildBacklogPlan` | `BacklogScheduler.evaluate` (fait) + `src/net/decor-pressure.js` (L3) |
| `_setStreamGate` × N | `BudgetGovernor.canWork('stream')` |
| `_flushSpawnZoneDeferSpawn` | `ContentLoader.drainRing('critical')` (L2c) |
