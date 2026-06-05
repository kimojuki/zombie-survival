# Road Network — reconstruction progressive

> Reset 2026-06-05 : ancien système (28 arêtes, patches jonction lourds) supprimé. Reconstruction brique par brique.

---

## État actuel (2026-06-06)

### Arêtes actives

| ID | Secteur | Tracé | Largeur | Type |
|----|---------|-------|---------|------|
| `spawn_clearing` | S01 | disque `(0,-6)` | ~5.8×5.2 m | clearing |
| `spawn_trail` | S01 | `SPAWN_TRAIL_PTS` → `(14,-21)` | 2.0 m | dirt |
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
| `public/js/spawn_clearing.js` | `SPAWN_TRAIL_PTS`, décor clairière/sentier |
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
ZS.RoadNetwork.defineClearing({ id, cx, cz, rx, rz, blend? })
ZS.RoadNetwork.defineEdge({ id, pts, width, type, smooth?, line?, broken?, barriers?, taperStart?, taperEnd? })
ZS.RoadNetwork.resolve()
ZS.RoadNetwork.applyFlattening()
ZS.RoadNetwork.buildMeshes(scene, ZS.B.M)
ZS.RoadNetwork.isNearRoad(x, z, margin)
ZS.RoadNetwork.sampleAlong('town_main', 0.42)  // t ∈ [0, 1]
ZS.RoadNetwork.getResolvedEdges()

ZS.Vehicles.buildAll(scene)   // après buildMeshes
ZS.B.carcass(scene, x, z, { rotY, tilt, sink, color, burnt, wheels })
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
2. Spawn `(0, -6)` — clairière plate, sentier dirt vers route
3. Jonction `(14,-21)` — pas de pic terrain, barrières avec gap
4. `town_main` — asphalt, ligne centrale, barrières **alignées** avec poteaux dans les virages
5. `city_highway` — même test barrières
6. Carcasses visibles sur épaules (pas dans les immeubles)
7. Pas d'arbres sur les routes (`isNearRoad`)
