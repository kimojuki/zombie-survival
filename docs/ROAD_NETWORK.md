# Road Network — reconstruction progressive

> Reset 2026-06-05 : ancien système (28 arêtes, patches jonction lourds) supprimé. Reconstruction brique par brique.

---

## État actuel (2026-06-06) — refonte progressive

> **Mode refonte** : seul le **spawn + sentier court** est actif côté client.  
> `road_network.js`, secteurs et véhicules restent dans le repo (legacy) mais **ne sont plus chargés** tant que la refonte n’est pas prête.

### Actif (spawn)

| Élément | Module |
|---------|--------|
| Camp décor (prefabs RCON) | serveur seed + `spawn_clearing.js` |
| Lisière bois / herbes camp | `proc_spawn.build` → `buildCampGround`, `buildCampProps` |
| Sentier ~22 m (piétiné) | `trails.js` + `SPAWN_TRAIL_PTS` (courbe camp → forêt) |
| Rondins lisière | prefab `spawn_border_log` (seed serveur, RCON, collision) |
| Texture sentier | `textures/camp/trail_forest.png` |

### Legacy (conservé, non chargé)

| ID | Fichier | Statut |
|----|---------|--------|
| `spawn_trail` (RoadNetwork) | `road_network.js` | ⏸ non chargé |
| `town_main`, secteurs S02–S05 | `sector_*.js` | ⏸ non chargés |

### Arêtes actives (historique RoadNetwork — pause refonte)

| ID | Secteur | Tracé | Largeur | Type |
|----|---------|-------|---------|------|
| `spawn_clearing` | S01 | disque `(0,-6)` | ~5.8×5.2 m | clearing |
| `spawn_trail` | S01 | `SPAWN_TRAIL_PTS` → `(14,-19)` | 1.85 m | trail |
| `town_main` | S02 | `(88,-26)` → `(-295,0)` est→ouest | 6.2 m | asphalt |
| `city_highway` | S03 | `(-104,-9)` → `(-20,-122)` | 12 m | asphalt |

Routes S02 résidentielles / grille S03 / S05 : **pas encore** dans `RoadNetwork` (trottoirs manuels ou `roads: []`).

### Pipeline build

```
registerSector → defineClearing / defineEdge
resolve()           — snap jonctions (1 m), Chaikin optionnel
applyFlattening()   — registerRoadCorridor + disques clairière
buildTerrain()
buildAll()          — secteurs (bâtiments, props)
buildMeshes()       — rubans asphalt/dirt, lignes, barrières
Vehicles.buildAll() — carcasses le long des routes (vehicles.js)
végétation          — isNearRoad exclut arbres/herbes
```

### Barrières autoroute (`_buildBarriers`)

- Poteaux espacés tous les **2,6 m** le long de la **polyligne complète** (pas segment par segment).
- Rails alignés en **3D** entre deux poteaux (`Quaternion.setFromUnitVectors`).
- **Gaps** près des jonctions sentier→route (`_barrierGaps`, rayon 7,5 m).

### Véhicules (`public/js/vehicles.js`)

- **Source unique** pour les carcasses abandonnées (plus de `B.car()` éparpillé dans les secteurs).
- Placement via `RoadNetwork.sampleAlong(roadId, t)` + offset latéral (`side`, `lane`).
- Variantes : inclinaison, roues manquantes, carrosserie calcinée (`B.carcass()` dans `buildings.js`).
- Tableau `WRECKS` : ~10 épaves sur `town_main`, `spawn_trail`, `city_highway`.

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `public/js/road_network.js` | Graphe, flatten, meshes, barrières, `sampleAlong` |
| `public/js/trails.js` | API `ZS.Trails` — ruban sentier (`registerFlatten`, `buildMesh`, `sample`, `isNear`) |
| `public/js/spawn_clearing.js` | `SPAWN_TRAIL_PTS`, `getDecorGroundHeight`, prefabs camp |
| `packages/shared/src/camp-border-logs.mjs` | Placement anneau `spawn_border_log` (seed serveur) |
| `textures/camp/trail_forest.png` | Texture sentier forêt (ruban `type: trail`) |
| `public/js/vehicles.js` | Carcasses routières (config `WRECKS`) |
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

// Legacy RoadNetwork (non chargé en refonte)
ZS.RoadNetwork.defineClearing({ id, cx, cz, rx, rz, blend? })
ZS.RoadNetwork.defineEdge({ id, pts, width, type, smooth?, line?, broken?, barriers?, taperStart?, taperEnd? })
ZS.RoadNetwork.resolve()
ZS.RoadNetwork.applyFlattening()
ZS.RoadNetwork.buildMeshes(scene, ZS.B.M)
ZS.RoadNetwork.isNearRoad(x, z, margin)
ZS.RoadNetwork.sampleAlong('town_main', 0.42)  // t ∈ [0, 1]
ZS.RoadNetwork.getResolvedEdges()
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
| **5** | Plus de carcasses / bus / camions (vehicles.js) | ⏳ |

---

## Tests manuels

1. **Ctrl+F5** (vérifier `CACHE_BUST` dans `game.html`)
2. Spawn `(0, -6)` — clairière plate, languette sud, sentier ~22 m (courbe est puis retour ouest)
3. Rondins `spawn_border_log` — collision, `decorlist` ~166 décors au seed
4. `town_main` — asphalt, ligne centrale, barrières **alignées** avec poteaux dans les virages
5. `city_highway` — même test barrières
6. Carcasses visibles sur épaules (pas dans les immeubles)
7. Pas d'arbres sur les routes (`isNearRoad`)
