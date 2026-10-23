# Orientation des prefabs décor

Référence **devant / derrière / gauche / droite** pour placer les objets en jeu, en seed S01 et dans le catalogue admin.

Code source : `packages/shared/src/decor-prefab-orientation.mjs`  
Placement intérieur cabane : [S01_DECOR_PLACEMENT.md](S01_DECOR_PLACEMENT.md)

---

## Convention Three.js (tous les prefabs décor)

| Axe local | Sens |
|-----------|------|
| **−Z** | **Devant** du mesh (direction « forward » par défaut) |
| **+Z** | **Derrière** |
| **+X** | **Droite** |
| **+Y** | **Haut** |
| Pivot | **Centre du sol** sous l'objet (sauf bâtiments : pivot sol du bâtiment) |

Avec `rotation.y = rotY` :

- Direction monde du devant (XZ) : `(−sin(rotY), −cos(rotY))`
- Pour **viser** un point `(targetX, targetZ)` depuis `(x, z)` :

```javascript
import { decorRotYFaceTarget } from '../packages/shared/src/decor-prefab-orientation.mjs';

const rotY = decorRotYFaceTarget(x, z, targetX, targetZ);
// équivalent : Math.atan2(-(targetX - x), -(targetZ - z))
```

Test unitaire recommandé :

```javascript
const fwd = decorForwardWorldXZ(rotY);
const dx = targetX - x, dz = targetZ - z;
const dot = (fwd.x * dx + fwd.z * dz) / Math.hypot(dx, dz);
assert.ok(dot > 0.99); // devant pointe vers la cible
```

---

## Repère cabane `building_survivor_shack`

| Côté local | Emplacement | Notes |
|------------|-------------|--------|
| **−Z** | Porte / entrée joueur | `SURVIVOR_SHACK_DOOR.pivotZ ≈ −2.10` |
| **+Z** | Mur nord (fond) | `_buildSurvivorShackWallNorth` |
| **−X** | Mur ouest | |
| **+X** | Mur est | |

Seed cabane #1 : `(165.1, 7.1)`, `rotY ≈ 0.55`.

---

## Mobiliers cabane (catalogue enrichi)

| Prefab | Devant | Derrière | Notes placement |
|--------|--------|----------|-----------------|
| `spawn_cabin_table` | **−Z** (côté assiette) | +Z (gobelet) | Plateau quasi symétrique ; rotY pour orienter vers porte ou chaises |
| `spawn_cabin_chair` | **−Z** (assise) | +Z (dossier) | Face à la table : devant −Z vers le plateau |
| `spawn_cabin_shelf` | **−Z** (face ouverte) | +Z (lattes, **contre mur**) | Dos +Z collé au mur |
| `spawn_cabin_stove` | **−Z** (porte vitrée) | +Z (conduit fumée) | Dos +Z vers mur ; porte −Z vers pièce |
| `spawn_cabin_lantern` | **−Z** (face vitrée) | +Z | Suspendue plafond ; pivot sol sous la cage |
| `spawn_cabin_wood_box` | **−Z** (face ouverte) | +Z (fond) | Près poêle ; dos contre mur |
| `spawn_cabin_rug` | **−Z** (bande décor) | +Z | Sol centre pièce ; bande vers table/porte |
| `spawn_cabin_bench` | **−Z** (assise) | +Z (dossier) | Mur ouest/nord — dos contre mur |
| `spawn_cabin_basin` | **−Z** (cuvette) | +Z (miroir) | Coin eau — dos contre mur |
| `spawn_cabin_wall_clock` | **−Z** (cadran) | +Z | Mur intérieur ~1,45 m — voir [`WALL_CLOCK.md`](./WALL_CLOCK.md) (aiguilles dynamiques) |
| `spawn_cabin_coat_rack` | **−Z** (patères) | +Z | Près porte — dos au mur |
| `spawn_beach_wreck_debris` | **−Z** (détail) | +Z | Sol plage — scène naufrage près spawn |
| `spawn_beach_washed_gear` | **−Z** (sac, gourde) | +Z | Sol plage — affaires personnelles échouées |
| `spawn_beach_driftwood` | **−Z** (branche) | +Z | Bouche sentier — rondin vers forêt |
| `spawn_single_bed` | **+Z** (tête / oreiller) | −Z (pieds) | ⚠️ **Exception** : tête = +Z, pas −Z |
| `storage_chest` | **−Z** (serrure / couvercle) | +Z | rotY via `cabin01ChestFaceDoorRotY()` |

---

## Autres prefabs documentés

| Prefab | Devant | Derrière |
|--------|--------|----------|
| `spawn_workbench` | −Z (outils) | +Z |
| `spawn_lean_to` | −Z (ouverture) | +Z |
| `spawn_bedroll` | +Z (capuche) | −Z |
| `build_door_wood` | −Z (poignée) | +Z (charnière) |
| `sign_beach_exit` | −Z (face lisible) | +Z |

Prefabs non listés : supposés **−Z forward** jusqu'à documentation explicite dans `decor-prefab-orientation.mjs`.

---

## Checklist avant seed S01

- [ ] Identifier **devant** du mesh dans l'aperçu 3D catalogue (colonne **Orientation**)
- [ ] Calculer `rotY` avec `decorRotYFaceTarget` ou helper dédié (`cabin01ChestFaceDoorRotY`, etc.)
- [ ] Test `dot > 0.99` vers cible (porte, table, mur)
- [ ] Objets **contre mur** : dos (+Z ou autre) vers le mur, pas le devant
- [ ] Documenter tout nouveau prefab dans `decor-prefab-orientation.mjs` + ce fichier

---

## Voir aussi

- [S01_DECOR_PLACEMENT.md](S01_DECOR_PLACEMENT.md) — hauteur shack, seeds, pièges coffre
- [RCON.md](RCON.md) — `decoradd prefab … here [rotY] [scale]`
- Catalogue admin `/prefab-catalog.html` — colonne Orientation + aperçu 3D
