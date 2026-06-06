# Road Network — reconstruction progressive

> Reset 2026-06-05 : ancien système (28 arêtes, patches jonction lourds) supprimé. Reconstruction brique par brique.

---

## État actuel (2026-06-06) — refonte progressive

> **Mode refonte** : spawn + sentier + **RN nationale asphalte** actifs.  
> Secteurs bâtiments (S02–S05) et véhicules restent dans le repo (legacy) mais **ne sont pas chargés**.

### Actif (spawn + routes)

| Élément | Module |
|---------|--------|
| Camp décor (prefabs RCON) | serveur seed + `spawn_clearing.js` |
| Lisière bois / herbes camp | `proc_spawn.build` → `buildCampGround`, `buildCampProps` |
| Sentier ~35 m | `buildTrailTowardRoad` → point le plus proche de la bouche camp sur `town_main` |
| RN traversante est→ouest | `proc_roads.js` → `town_main` (asphalte **8,4 m**, 2 voies, ligne jaune) |
| Autoroute grande ville | `proc_roads.js` → `city_highway` (12 m, `(-104,-9)` → `(-20,-122)`) |
| Rondins lisière | prefab `spawn_border_log` (seed serveur, RCON, collision) |
| Épaves route | prefabs `wreck_sedan` / `wreck_pickup` (seed + RCON, textures procédurales) |
| Texture sentier | `textures/camp/trail_forest.png` |
| Texture asphalte | `/img/road_asphalt.png` (`B.M.road`) |

### Legacy (conservé, non chargé)

| ID | Fichier | Statut |
|----|---------|--------|
| Secteurs S02–S05 (bâtiments) | `sector_*.js` | ⏸ non chargés |
| Véhicules épaves | `vehicle_prefabs.js` + seed `road-wrecks.mjs` | ✅ prefabs RCON |

### Arêtes actives (RoadNetwork)

| ID | Source | Tracé | Largeur | Type |
|----|--------|-------|---------|------|
| `spawn_trail` | `SPAWN_TRAIL_PTS` | camp → point le plus proche sur `town_main` | 1,55 m | trail (flatten only) |
| `town_main` | `proc_roads.js` | est→ouest | 8,4 m | asphalt + ligne jaune |
| `city_highway` | `proc_roads.js` | `(-104,-9)` → `(-20,-122)` | 12 m | asphalt |

Routes S02 résidentielles / grille S03 / S05 : **pas encore** dans `RoadNetwork` (trottoirs manuels ou `roads: []`).

### Pipeline build (refonte spawn)

```
proc_spawn.registerTerrain  — clairière + patch terrain camp
proc_roads.registerTerrain  — town_main, city_highway, spawn_trail (join auto)
applyRoadFlattening()       — resolve + corridors
buildTerrain()
buildAll()                  — camp, sentier (trails.js), décor
buildMeshes()               — asphalte, ligne jaune, barrières, jonction sentier
```

(Véhicules / carcasses : prochaine brique — `vehicles.js` non chargé.)

### Barrières autoroute (prefabs `road_barrier_*`)

- **Visuel + collisions client** : `barrier_prefabs.buildRoadBarriers()` appelé depuis `road_network._buildBarriers` au build des meshes RN.
- Placements alignés sur les arêtes **résolues** (`town_main`, `city_highway`) — pas 2,6 m, gap jonction sentier.
- Prefabs : `road_barrier_post`, `road_barrier_rail` (`barrier_prefabs.js`) ; colliders dans `decor_colliders.js`.
- Seed serveur optionnel (`decorseed barriers`) — le client ignore les `road_barrier_*` réseau pour éviter les doublons.
- Seed serveur au boot + RCON `decorseed barriers [reset]`.
- Collisions : cylindre (poteau) + box orientée (`railLen` = longueur rail).
- **Gap** à la jonction sentier→`town_main` (rayon 7,5 m).
- Meshes procéduraux retirés de `road_network.js` (plus de doublon visuel).

### Véhicules (`vehicle_prefabs.js` + `packages/shared/src/road-wrecks.mjs`)

- Prefabs **`wreck_sedan`** / **`wreck_pickup`** — textures peinture procédurale (`vehicle_textures.js` : rust, olive, navy, beige, burnt).
- Seed serveur : 8 épaves le long de `town_main` et `city_highway` (file d'attente apocalypse près du spawn).
- RCON : `decoradd prefab wreck_sedan x z rotY 1 rust 0.15 2` — variant, tilt, roues, sink optionnels.
- Collisions : `decor_colliders.js` (box, sautables).

Legacy `vehicles.js` : stub vide (remplacé par prefabs décor).

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `public/js/proc_roads.js` | Définition `town_main` + `city_highway` (refonte progressive) |
| `public/js/road_network.js` | Graphe, flatten, meshes, barrières, `sampleAlong` |
| `public/js/trails.js` | API `ZS.Trails` — ruban sentier (`registerFlatten`, `buildMesh`, `sample`, `isNear`) |
| `public/js/spawn_clearing.js` | `SPAWN_TRAIL_PTS`, `getDecorGroundHeight`, prefabs camp |
| `packages/shared/src/camp-border-logs.mjs` | Placement anneau `spawn_border_log` (seed serveur) |
| `textures/camp/trail_forest.png` | Texture sentier forêt (ruban `type: trail`) |
| `packages/shared/src/road-barriers.mjs` | Placements barrières RN (seed serveur) |
| `public/js/barrier_prefabs.js` | Visuels poteau + rail |
| `public/js/buildings.js` | `B.carcass()`, registre secteurs → `defineEdge` |
| `public/js/noise.js` | `registerClearingDisc`, `registerRoadCorridor` |
| `public/js/world.js` | Orchestration : flatten → terrain → buildAll → meshes → véhicules |
| `public/js/sector_01_forest.js` | Clearing + `spawn_trail` |
| `public/js/sector_02_town.js` | `town_main` |
| `public/js/sector_03_maincity.js` | `city_highway` |

---

## API

```javascript
// Sentiers refonte (spawn)
ZS.Trails.registerFlatten(SPAWN_TRAIL_PTS, { width, shoulder, blend })
ZS.Trails.buildMesh(scene, pts, { width, taperStart, taperEnd, step })
ZS.Trails.sample(pts, t)   // t ∈ [0, 1]
ZS.Trails.isNear(pts, x, z, margin)

// RoadNetwork (actif — refonte spawn)
ZS.RoadNetwork.defineClearing({ id, cx, cz, rx, rz, blend? })
ZS.RoadNetwork.defineEdge({ id, pts, width, type, smooth?, line?, lineSolid?, broken?, barriers?, taperStart?, taperEnd? })
ZS.RoadNetwork.resolve()
ZS.RoadNetwork.applyFlattening()
ZS.RoadNetwork.buildMeshes(scene, ZS.B.M)
ZS.RoadNetwork.isNearRoad(x, z, margin)
ZS.RoadNetwork.sampleAlong('town_main', 0.42)  // t ∈ [0, 1]
ZS.RoadNetwork.getResolvedEdges()
ZS.RoadNetwork.computeTrailRoadJoin(trailPts, roadPts, opts)
ZS.RoadNetwork.trimTrailForJoin(trailPts, join, leadIn)
ZS.RoadNetwork.buildTrailTowardRoad(mouth, roadPts, opts)
ZS.RoadNetwork.nearestPointOnRoad(roadPts, x, z)
```

```javascript
// Décor camp — voir docs/RCON.md
// prefab spawn_border_log : rotY = tangente, scale = longueur / 0.42 m
```

---

## Roadmap briques suivantes

| Brique | Contenu | Statut |
|--------|---------|--------|
| **0** | Spawn clearing + sentier | ✅ |
| **1** | `town_main` + jonction spawn | ✅ |
| **1b** | `city_highway` S03 | ✅ |
| **2** | Grille rues S02/S03 dans RoadNetwork | ⏳ |
| **3** | Patches jonction multi-arêtes | ⏳ |
| **4** | Routes S05 militaire | ⏳ |
| **5** | Carcasses le long des routes (`vehicle_prefabs.js`) | ✅ |

---

## Tests manuels (refonte spawn + RN)

1. **Ctrl+F5** — `CACHE_BUST` = `20260606-spawn-trail-refonte-15`
2. Camp `(0, -6)` — sol texturé, languette sud, rondins `spawn_border_log`
3. Sentier ~35 m — courbe naturelle vers le **passage le plus proche** de `town_main` (ouest, ~33 m)
4. Jonction sentier → RN — patch lisse, pas de z-fighting sur l'asphalte
5. `town_main` — **8,4 m**, 2 voies, **ligne jaune centrale** continue, barrières
6. `city_highway` — branche vers grande ville (12 m), barrières
7. Pas d'arbres sur les routes (`isNearRoad`)
8. Épaves `wreck_*` sur `town_main` près du spawn — textures rouille / calcinées, sync multijoueur
