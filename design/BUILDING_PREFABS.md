# Registre prefabs bâtiment — workflow progressif

Cabane S01 `building_survivor_shack` @ `(165.1, 7.1)`, `rotY: 0.55`, seed `s01:cabin01:shack`.

**Règle** : 1 mesh + 1 (ou N) collider(s) → playtest Bruno → ✅ → pièce suivante.

Voir aussi : [docs/BUILDING_COLLIDERS.md](../docs/BUILDING_COLLIDERS.md) (pièges techniques).

## Convention rotation (obligatoire)

Colliders et mesh partagent le pivot `root` (`position`, `rotation.y`).  
Transformation locale → monde XZ (**identique Three.js**) :

```
wx = cx + lx·cos(rotY) + lz·sin(rotY)
wz = cz − lx·sin(rotY) + lz·cos(rotY)
```

Fichiers : `world.js`, `collider-resolve.mjs`, `survivor-shack-pad.mjs`, `sampleShackPadHeight`.

## Pièces `building_survivor_shack`

| # | Pièce | Shared | Mesh | Colliders | Statut |
|---|-------|--------|------|-----------|--------|
| 1 | Sol | `survivor-shack-floor.mjs` | `_buildSurvivorShackFloor` | 1 boîte `lz:0`, `minY/maxY` 0→0.12 | ✅ Bruno |
| 2 | Mur nord (+Z) | `survivor-shack-wall-north.mjs` | `_buildSurvivorShackWallNorth` | 1 boîte `lz:2.04`, `hd:0.22` | ✅ Bruno |
| 3 | Mur sud (−Z) | `survivor-shack-wall-south.mjs` | `_buildSurvivorShackWallSouth` | 2 pans `lz:-2.04`, `lx:±1.61` (ouverture porte) | ✅ Bruno |
| 4 | Mur ouest (−X) | `survivor-shack-wall-west.mjs` | `_buildSurvivorShackWallWest` | 1 boîte `lx:-2.54`, `hd:2.075` | ✅ Bruno |
| 5 | Mur est (+X) | `survivor-shack-wall-east.mjs` | `_buildSurvivorShackWallEast` | 1 boîte `lx:2.54`, `hd:2.075` | ✅ Bruno |
| 6 | Porte | `survivor-shack-door.mjs` + `door-leaf-collider.mjs` | `_buildSurvivorShackDoor` (linteau + pivot) | 1 boîte battant — fermé @ `lz:-2.10` ; ouvert = pivotée (`localRotY`) | ✅ Bruno |
| 7 | Toit | `survivor-shack-roof.mjs` | `_buildSurvivorShackRoof` (2 pans + faîtière + pignons) | 2 boîtes `rotX:±pitch`, `minY/maxY` 2.55→3.65 | ✅ Bruno |

**Statut global** : cabane **7/7 validée** — `client-version` `20260608-shack-roof-301`, **9 colliders** (porte fermée).

## Fichiers (source de vérité)

| Rôle | Chemin |
|------|--------|
| Assemblage mesh | `apps/client/public/js/spawn_clearing.js` → `_buildSurvivorShack*` |
| Colliders client | `apps/client/public/js/decor_colliders.js` → `_survivorShackColliderDefs()` |
| Constantes pièces | `packages/shared/src/survivor-shack-*.mjs`, `door-leaf-collider.mjs` |
| Collision partagée | `packages/shared/src/collider-resolve.mjs` |
| Pad terrain | `survivor-shack-pad.mjs` + `sampleShackPadHeight()` |
| Placement S01 | `s01-world-placements.mjs` → `S01_CABIN01_PROTO`, seed `cabin01:shack` |
| Debug | `apps/client/public/js/building_debug.js` |
| Tests | `tests/survivor-shack-*.test.mjs`, `door-leaf-collider.test.mjs`, `decor-colliders.test.mjs` |

## Rôle S01 — cabane #1 (`cabin01:shack`)

| Élément | Valeur |
|---------|--------|
| Position validée | `(165.1, 7.1)`, `rotY: 0.55` |
| Seed monde | `s01:cabin01:shack` (persisté `world_decor`) |
| Dégagement arbres | `S01_BUILDING_TREE_CLEAR_R` = 10 m |
| Exclusion build | 10 m via `s01-build-exclusions.mjs` quand POI actif |

### Suite prévue (gameplay / contenu)

1. **Loot intérieur** — coffre `storage_chest` ou caisses starter dans la cabane (seed `cabin01:*`)
2. **Safe zone optionnelle** — si la cabane devient « refuge débutant » (`s01-safe-zones.mjs`)
3. **Deuxième cabane** — réutiliser le même prefab, autre ancre (`cabin02`), workflow identique
4. **Détails visuels optionnels** — fenêtre ouest, renforts murs, literie (sans casser les 9 colliders)
5. **Route terre** — segment `s01-roads.mjs` depuis sentier / carrefour vers la cabane une fois le parcours validé
6. **Prefab template** — ce modèle sert de **référence** pour les prochains bâtiments RCON (`decoradd prefab building_survivor_shack`)

Voir [design/secteur/S01_ROADMAP.md](secteur/S01_ROADMAP.md) — Phase 2.2.

## Debug playtest

```js
ZS.BuildingDebug.dumpShack()       // colliderCount attendu = pièces validées
ZS.BuildingDebug.showWireframes(true)  // Shift+F8
```

Tests : `npm test` — `survivor-shack-*.test.mjs`, `decor-colliders.test.mjs`.

## Historique bugs (ne pas répéter)

| Bug | Symptôme | Fix |
|-----|----------|-----|
| Cache JS ancien | Murs fantômes `lx:±2.54` | Ctrl+F5 + `client-version.json` |
| rotY ≠ Three.js | Décalage ~2,13 m en X | Formule cos/sin ci-dessus |
| Pivot désync | Collision après resnap | `_syncDecorSpecFromRoot` |
| Terrain cabossé | Sol flotte | `sampleShackPadHeight` |
| `hd` trop fin | Traversée avec rotY | `hd ≥ 0.22` sur murs 0.18 |
| Porte ouverte sans collider | On traverse le panneau | `door-leaf-collider.mjs` + `localRotY` |
| Toit incliné fantôme | Collision au sol dans la cabane | `minY/maxY` 2.55→3.65 sur pans `rotX` |
