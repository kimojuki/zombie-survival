# S01 — Placement décor seed (cabanes, coffres, POI)

Guide pour placer des objets **à l'intérieur** ou **autour** des bâtiments S01 sans reproduire les erreurs du coffre cabane #1 (invisible, mauvaise hauteur, mauvaise orientation).

Référence validée playtest : **coffre `s01:cabin01:chest`** @ cabane `building_survivor_shack` (Bruno, 2026-06-08).

---

## Fichiers clés

| Rôle | Fichier |
|------|---------|
| Liste seed S01 | `packages/shared/src/s01-world-placements.mjs` |
| Ancres POI validées | `packages/shared/src/s01-poi.mjs` (`S01_CABIN01_PROTO`, exclusions build) |
| Exemple coffre intérieur | `packages/shared/src/s01-cabin01-chest.mjs` |
| Pivot porte shack | `packages/shared/src/survivor-shack-door.mjs` (`pivotZ: -2.10`) |
| Local → monde XZ | `packages/shared/src/collider-resolve.mjs` → `decorLocalToWorld()` |
| Boot / reseed serveur | `apps/server/index.js` → `ensureS01World()` |
| Spawn client + yaw coffre | `apps/client/public/js/spawn_clearing.js` |
| Hauteur S01 + resnap | `apps/client/public/js/network.js` → `_s01DecorGroundY`, `_resnapS01Decor` |
| Tests | `tests/s01-cabin01-chest.test.mjs`, `tests/s01-placements.test.mjs` |
| Vérif SQLite locale | `node tools/check-s01-decor.mjs` |
| **Orientation prefabs** | [DECOR_PREFAB_ORIENTATION.md](DECOR_PREFAB_ORIENTATION.md) · `packages/shared/src/decor-prefab-orientation.mjs` |

---

## Workflow (un POI à la fois)

1. Valider l'ancre en jeu (position + `rotY` du bâtiment) → noter dans `s01-poi.mjs`.
2. Ajouter **un** placement dans `computeS01DecorPlacements()`.
3. Pour un objet **dans** un shack : module dédié `s01-<poi>-<objet>.mjs` (éviter imports circulaires avec `s01-world-placements.mjs`).
4. Tests unitaires (position, yaw vers cible, champs seed).
5. **Redémarrer le serveur** (obligatoire si `packages/shared` change — `decorseed s01` seul ne recharge pas le code Node).
6. Incrémenter `apps/client/public/client-version.json` si JS client modifié.
7. Playtest : `tp repere` ou RCON `pos`, vérifier mesh + interaction + DB.

RCON utile :

```text
decorseed s01          # re-pousse les seeds S01 (code déjà chargé en mémoire)
decorseed s01 reset    # purge + reseed + broadcast clients connectés
```

---

## Repère local cabane `building_survivor_shack`

Convention mesh (`spawn_clearing.js` / shared `survivor-shack-*.mjs`) :

| Élément | Axe local Z | Notes |
|---------|-------------|--------|
| Porte (entrée joueur) | **−Z** (`pivotZ ≈ -2.10`) | Mur sud mesh, côté entrée |
| Mur « nord » (fonction `_buildSurvivorShackWallNorth`) | **+Z** (`z ≈ +2.04`) | Fond de la cabane |
| Sol | `y = floorY` ≈ `0.12` au-dessus du pad terrain | Voir `S01_CABIN01_CHEST_LOCAL.floorY` |

Le pivot décor du shack est le **centre du sol**. Les offsets `(lx, lz)` sont relatifs à ce pivot, tournés par `rotY` du shack.

---

## Position monde (XZ)

Toujours passer par `decorLocalToWorld(lx, 0, lz, { cx, cz, rotY })` — **ne pas** deviner les coords monde.

```javascript
import { decorLocalToWorld } from './collider-resolve.mjs';
import { S01_CABIN01_PROTO } from './s01-poi.mjs';

const anchor = { cx: S01_CABIN01_PROTO.x, cz: S01_CABIN01_PROTO.z, rotY: S01_CABIN01_PROTO.rotY };
const world = decorLocalToWorld(1.64, 0, 1.36, anchor); // coffre coin nord-est
```

---

## Orientation (rotY) — piège principal

### Convention Three.js (prefabs décor)

- Devant du mesh = axe local **−Z** (coffre : serrure / couvercle côté `z < 0`).
- `rotation.y = θ` → direction monde du devant : `(−sin θ, −cos θ)` en XZ.

### Erreur fréquente

**Ne pas** poser `rotY: shack.rotY + Math.PI` « pour regarder la porte » sans calcul.

Pour le coffre au coin nord-est (`lx ≈ 1.64`, `lz ≈ 1.36`) :

| `rotY` seed | Effet |
|-------------|--------|
| `shack.rotY` (≈ 0.55) | Devant (−Z) vers la porte — **correct** |
| `shack.rotY + π` (≈ 3.69) | Devant vers le mur nord — **incorrect** (bug playtest) |

La formule `shack.rotY + π` et `shack.rotY` sont **opposées** (dot product ≈ −1 vs +1). Tester en code, pas à l'intuition.

### Pattern recommandé : viser un point cible

```javascript
export function cabin01ChestFaceDoorRotY(shack, chestLocal) {
  const anchor = { cx: shack.x, cz: shack.z, rotY: shack.rotY };
  const pos = decorLocalToWorld(chestLocal.lx, 0, chestLocal.lz, anchor);
  const door = decorLocalToWorld(0, 0, SURVIVOR_SHACK_DOOR.pivotZ, anchor);
  const dx = door.x - pos.x;
  const dz = door.z - pos.z;
  return Math.atan2(-dx, -dz); // Three.js −Z forward
}
```

Réutiliser ce motif pour tout objet qui doit « regarder » une porte, un feu, un PNJ, etc.

### Test unitaire obligatoire (orientation)

```javascript
const fwd = { x: -Math.sin(rotY), z: -Math.cos(rotY) };
const dx = target.x - pos.x, dz = target.z - pos.z;
const dot = (fwd.x * dx + fwd.z * dz) / Math.hypot(dx, dz);
assert.ok(dot > 0.99); // devant pointe vers la cible
```

---

## Hauteur (Y) — objets **dans** la cabane

Le terrain sous le shack est bosselé ; le sol intérieur suit le **pad** du shack, pas `getDecorGroundHeight(x, z)` au pied de l'objet.

Champs seed à fournir :

```javascript
{
  shackAnchor: { x, z, rotY },  // même ancre que le shack
  shackFloorY: 0.12,            // offset au-dessus du pad (épaisseur sol mesh)
}
```

Côté client (`network.js` → `_spawnDecorItem`) :

```javascript
baseY = ZS.sampleShackPadHeight(anchor.x, anchor.z, anchor.rotY) + shackFloorY;
```

`_resnapS01Decor()` doit utiliser la **même** logique (sinon l'objet s'enfonce ou flotte après sync terrain).

---

## Prefab `storage_chest` — particularité client

Le yaw est appliqué sur le **groupe mesh interne**, pas sur le root :

```javascript
// spawn_clearing.js
storage_chest: { build(root, opts = {}) {
  root.rotation.y = 0;
  _buildStorageChest(root, 0, 0, 0, opts.rotY ?? 0);
}},
```

`_decorYawFromRoot()` lit `root.children[0].rotation.y` pour les colliders / `decorSpec`.

**Pour un nouveau prefab** : soit tout sur `root.rotation.y` (comme la cabane), soit documenter explicitement si le yaw est sur un enfant (comme le coffre).

---

## Persistance serveur

| Situation | Action |
|-----------|--------|
| Nouveau placement dans `computeS01DecorPlacements()` | Redémarrer serveur → boot appelle `ensureS01World()` (purge + reseed) |
| Code shared déjà chargé, données manquantes | `decorseed s01` |
| Forcer reposition / loot reset | `decorseed s01 reset` |

Vérifier SQLite locale :

```bash
node tools/check-s01-decor.mjs
```

Attendu coffre cabane #1 : **2 lignes** (`shack` + `chest`), `rotY ≈ 0.55` (pas `3.69`).

---

## Checklist avant ✅ playtest

- [ ] Position XZ via `decorLocalToWorld`, pas à la main
- [ ] `rotY` vérifié par `atan2` vers cible + test `dot > 0.99`
- [ ] Objet intérieur : `shackAnchor` + `shackFloorY`
- [ ] Client : `client-version.json` incrémenté si `spawn_clearing.js` / `network.js`
- [ ] Serveur redémarré après changement `packages/shared`
- [ ] `node tools/check-s01-decor.mjs` — 2 rows, `rotY` cohérent
- [ ] `npm test` — `tests/s01-cabin01-chest.test.mjs` vert
- [ ] En jeu : mesh visible, bonne hauteur, bon sens, interaction `E` / loot

---

## Erreurs rencontrées (coffre cabane #1)

| Symptôme | Cause | Fix |
|----------|--------|-----|
| Coffre absent | Serveur pas redémarré après ajout seed | Restart + boot `s01 world added count:2` |
| Coffre sous le sol / flottant | `_resnapS01Decor` utilisait le terrain brut | `shackAnchor` + `shackFloorY` |
| Orientation inchangée malgré seed | `rotY` serveur ignoré par build coffre | Yaw sur mesh interne + `opts.rotY` |
| Toujours vers le mur | DB `rotY ≈ shack+π` | `cabin01ChestFaceDoorRotY()` → `≈ shack.rotY` |
| `decorseed` sans effet sur rotY | Ancien code encore en mémoire | **Restart serveur** après edit shared |

---

## Interaction (E) — viseur, pas proximité

Dans la cabane, porte et coffre peuvent être proches : l’UI et la touche **E** utilisent le **réticule** (`pickDecorInteractRay`), pas `findNearestDecorStorage`.

| Fonction | Rôle |
|----------|------|
| `hitDecorStorageRay` | Raycast → coffre visé |
| `hitDecorDoorRay` | Raycast → porte visée |
| `pickDecorInteractRay` | Le hit le plus proche sur le rayon gagne |
| `_interactRayOccluded` | LOS colliders décor — bloque coffre à travers murs (pas le coffre cible) |
| `ZS.pickWorldInteract` | Raycast caméra (défini dans `game.js`) |

---

## Prochains objets cabane #1

| Objet | Devant / dos | Suggestion seed |
|-------|----------------|-----------------|
| Table `spawn_cabin_table` | Devant **−Z** (assiette) · dos +Z | Centre pièce, rotY vers porte ou chaises |
| Chaise `spawn_cabin_chair` | Devant **−Z** (assise) · dossier +Z | Face table : devant −Z vers plateau |
| Étagère `spawn_cabin_shelf` | Face **−Z** · dos **+Z** contre mur | Mur ouest ou nord, dos collé au mur |
| Poêle `spawn_cabin_stove` | Porte **−Z** · conduit **+Z** | Mur nord/est — dos vers mur, porte vers salle |
| Lanterne `spawn_cabin_lantern` | Face **−Z** · quasi symétrique | Centre pièce ou au-dessus table — pivot sol |
| Caisse bûches `spawn_cabin_wood_box` | Ouverture **−Z** · dos **+Z** | Près poêle — dos au mur, face vers pièce |
| Tapis `spawn_cabin_rug` | Bande **−Z** · quasi symétrique | Centre pièce ou sous table — bande vers porte |
| Banc `spawn_cabin_bench` | Assise **−Z** · dossier **+Z** | Mur ouest — dos collé, face vers pièce |
| Lavabo `spawn_cabin_basin` | Face **−Z** · dos **+Z** | Mur est/ouest — coin eau intérieur |
| Lit `spawn_single_bed` | Tête **+Z** · pieds −Z | Coin NO — déjà seed `s01:cabin01:bed` |
| Coffre `storage_chest` | Serrure **−Z** | `cabin01ChestFaceDoorRotY()` |
| Second coffre | −Z forward | Nouveau `placementKey`, réutiliser `shackAnchor` / `floorY` |
| Route terre | — | Hors shack — `getDecorGroundHeight`, pas `shackFloorY` |

Référence complète : [DECOR_PREFAB_ORIENTATION.md](DECOR_PREFAB_ORIENTATION.md).

Voir aussi : [design/secteur/START_FOREST.md](../design/secteur/START_FOREST.md), [design/secteur/S01_ROADMAP.md](../design/secteur/S01_ROADMAP.md).
