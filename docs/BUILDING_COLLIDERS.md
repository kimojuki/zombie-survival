# Bâtiments prefab — mesh, pivot et collisions

Guide pour éviter de répéter les erreurs cabane (`building_survivor_shack`) sur les prochains objets.

## Règle d’or

**Un prefab = un pivot unique = mêmes offsets pour mesh ET colliders.**

| Couche | Fichier(s) | Coordonnées |
|--------|------------|-------------|
| Mesh | `spawn_clearing.js` → `_build…` | Locales au **root** du décor (`position` + `rotation.y` sur le root) |
| Colliders | `decor_colliders.js` + `packages/shared/src/survivor-shack-*.mjs` | `lx` / `lz` relatifs au pivot ; monde = `cx,cz,rotY,baseY` |
| Placement S01 | `s01-world-placements.mjs` | `x, z, rotY` monde |

**Ne jamais** : sous-groupe interne avec `rotation.y` si les colliders sont ancrés au root parent.

## Registre pièces cabane

Tableau à jour : [design/BUILDING_PREFABS.md](../design/BUILDING_PREFABS.md).

## Workflow progressif (cabane S01)

Documenté dans `DEV_TRACKER.md` — une pièce à la fois :

1. Mesh pièce N
2. Collider pièce N (`packages/shared` + miroir client)
3. Test Bruno en jeu
4. ✅ → pièce N+1

Retirer du tableau `PREFAB_COLLIDERS` / `_survivorShackColliderDefs()` toute pièce dont le mesh n’existe plus encore.

## Pièges rencontrés (cabane)

### 1. Murs fantômes (colliders orphelins)

**Symptôme** : parois invisibles décalées / mauvaise rotation ; le mur visible ne bloque pas.

**Cause** : ancien `decor_colliders.js` (6 murs + porte) encore en cache navigateur alors que le mesh n’a que sol + mur nord.

**Prévention** :

- Incrémenter `apps/client/public/js/client-version.json` à chaque changement JS
- **Ctrl+F5** après chaque session
- Vérifier en console : `ZS.BuildingDebug.dumpShack()` → `colliderCount` = registre [design/BUILDING_PREFABS.md](../design/BUILDING_PREFABS.md)
- Test unitaire `decor-colliders.test.mjs` : pas de `lx: ±2.54` ni `lz: -2.04`

### 2. Pivot décor ≠ pivot Three.js

**Symptôme** : collisions décalées après resnap terrain.

**Cause** : `decorSpec.x/z/baseY/rotY` pas resynchronisé depuis `root.position` / `root.rotation.y`.

**Fix** : `_syncDecorSpecFromRoot()` avant chaque `refreshDecorCollision`.

### 3. Terrain cabossé — sol flottant

**Symptôme** : dalle plane qui clippe / flotte aux coins.

**Cause** : `baseY` = hauteur au centre seul.

**Fix** : `sampleShackPadHeight()` — max terrain sur 4 coins + centre (`survivor-shack-pad.mjs`).

### 4. Convention rotY ≠ Three.js (cause racine cabane)

**Symptôme** : mur visible traversable ; mur invisible décalé de ~`2 × lz × sin(rotY)` en X (ex. 2,13 m pour `lz=2.04`, `rotY=0.55`) ; même Z.

**Cause** : `decorLocalToWorld` utilisait `x' = x·cos − z·sin` alors que Three.js fait `x' = x·cos + z·sin`, `z' = −x·sin + z·cos`.

**Fix** : aligner `world.js`, `collider-resolve.mjs`, `survivor-shack-pad.mjs`, `sampleShackPadHeight`.

**Test** : `tests/survivor-shack-rotation.test.mjs`, `collider-resolve.test.mjs` (Three.js 0.55).

### 5. Mur trop fin + rotation

**Symptôme** : traversée du mur avec `rotY ≠ 0`.

**Cause** : `hd` ≈ demi-épaisseur mesh seulement ; tunneling sur l’axe d’approche.

**Fix** : `colliderHalfDepth` ≥ mesh/2 + marge (~0.22 pour mur 0.18) ; éviter `minY`/`maxY` sur murs pleine hauteur en pente.

### 6. Porte ouverte — panneau traversable

**Symptôme** : l’entrée est libre mais on traverse le battant ouvert.

**Cause** : `if (raw.door && spec.doorOpen) continue` supprimait tout collider porte.

**Fix** : `door-leaf-collider.mjs` — centre du battant tourné autour du pivot + `localRotY` ; résolution dans `collider-resolve.mjs` et `world.js`.

### 7. Toit incliné — collisions fantômes au sol

**Symptôme** : blocage invisible dans la cabane après ajout du toit.

**Cause** : boîtes `rotX` sans bande verticale → volume trop bas en projection XZ.

**Fix** : `minY`/`maxY` sur les pans (ex. 2.55→3.65 local) — voir `survivor-shack-roof.mjs`.

### 8. Fausse alerte « VERSION MISMATCH »

**Symptôme** : console `inv-debug VERSION MISMATCH` alors que le client est à jour.

**Cause** : `invDebugBuild` (tag debug inventaire serveur) comparé à `clientVersion` (JS client) — champs différents.

**Action** : comparer `clientVersion` ↔ `__ZS_CLIENT_VERSION` ; redémarrer `npm run dev:server` seulement si `/api/health` sans `invDebugBuild`.

## Debug en jeu

Module : `building_debug.js` (filtre console : `building-debug`).

```js
ZS.BuildingDebug.enable();
ZS.BuildingDebug.showWireframes(true);   // magenta = colliders, vert = mesh
ZS.BuildingDebug.dumpShack();              // spec + colliders + écarts mesh
ZS.BuildingDebug.probePlayer();            // quel collider bloque ici ?
ZS.BuildingDebug.listNearPlayer(8);        // colliders proches
```

Raccourci : **Shift+F8** = toggle wireframes.

Script local : `node tools/debug-shack-wall-col.mjs`

## Checklist nouvelle pièce bâtiment

- [ ] Constantes partagées `packages/shared/src/<prefab>-<piece>.mjs`
- [ ] Mesh sur le **root** (pas de double rotation)
- [ ] Collider : `lx,lz,hw,hd` miroir exact du mesh
- [ ] `buildDecorColliders` test + count attendu
- [ ] `client-version.json` bump + Ctrl+F5
- [ ] `DEV_TRACKER.md` + entrée dans ce doc si nouveau piège
- [ ] Playtest : `ZS.BuildingDebug.compareShackMesh()` delta &lt; 0.15 m
