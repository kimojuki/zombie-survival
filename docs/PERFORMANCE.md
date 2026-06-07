# Performance & sync — audit et roadmap

Objectif : **60 FPS stable sur mobile**, RAM maîtrisée, **chargement fluide**, **serveur autoritaire**.

---

## 1. Chargement client (boot → jouable)

### Pipeline actuel

| Étape | % barre | Fichiers | Problème / note |
|-------|---------|----------|-----------------|
| Health serveur | 0–12 | `game.html` `waitForServer` | Poll 1 s × jusqu'à 120 — OK dev |
| Version client | — | `/api/client-version` | Cache-bust auto |
| Scripts legacy | 12–22 | `legacy-modules.js` (~48 modules) | Fetch parallèle + eval séquentiel — **freeze possible** |
| Auth | 22–28 | `game.js` `/api/auth/me` | |
| Monde local | 28–48 | `world.js` `buildWorldAsync` | Terrain, routes, végétation procédurale — **coûteux** |
| Socket | 48–58 | `network.js` connect | |
| `game-init` sync | 58–92 | `network.js` `_finalizeGameInit` | Décor batch, colliders, structures |
| Finalize | 92–100 | colliders serveur, spawn ready | |

### Goulots identifiés

1. **~48 scripts IIFE** exécutés d'affilée — chaque module parse + run (mitigé : `yieldToMain` **chaque** script).
2. **`buildWorldAsync`** — génération terrain + meshes camp/forêt avant toute connexion socket.
3. **`_finalizeGameInit`** — spawn décor proche en lots (`chunk` 36 mobile / 56 desktop) ; resync rochers API si échec.
4. **`world-colliders`** — envoi de **tous** les colliders au serveur au boot (`game.js`) — payload lourd.
5. **Double sync zombies** — corrigé : un seul `syncAll` après init scénario.
6. **`qa-panel.js`** — retiré du chemin critique ; chargé si `qaEnabled` après spawn.

### Phase chargement — implémentée (phase 2 + 5)

- `yieldToMain()` à **chaque** script (moins de freeze long).
- `qa-panel.js` différé (serveur QA uniquement).
- `groups.js` différé à la connexion socket ; `map.js` après `buildWorld`.
- `ZS.loadScript()` partagé (`loading.js`) — dédup fetch + eval.
- **Socket parallèle** : `Network.preconnect()` pendant `buildWorld` + buffer `game-init`.
- Log `[sync] game-init total X ms` + `[socket] connect X ms (parallel)`.
- Zombies : sync unique post-scénario.
- **~46 scripts** au boot (était ~48).

### Phase chargement — recommandée

1. **Découper legacy** : core vs différé (`rcon` admin-only, textures prefab lazy).
2. **`buildWorldAsync` progressive** : terrain minimal → sync → détail décor en arrière-plan.
3. **Colliders serveur simplifiés** : grille / zones au lieu du dump complet.
4. **Arbres lointains** : déjà partiel via `_fetchDeferredTrees` — étendre / réduire rayon `game-init`.
5. **Service Worker** cache scripts versionnés (hors scope actuel).
6. **Code-split Vite** : migrer modules hors IIFE globaux.

### Mesures manuelles chargement

- Chrome Performance : marquer `DOMContentLoaded` → `game-init total`.
- Mobile : pas de freeze > 300 ms pendant barre 12–22 %.
- `[world] build X ms` dans console — cible < 3 s mobile.

---

## 2. Runtime client (FPS / RAM)

| Zone | Fréquence | Statut |
|------|-----------|--------|
| Boucle jeu | 60 FPS rAF | OK |
| Zombies affichés | 10 Hz cible + **lerp** | Phase 1 ✓ |
| Joueurs distants | 20 Hz + lerp 12×dt | OK |
| Collisions mouvement | Par frame | **Grille 16 m** phase 2 ✓ |
| Hauteur sol | Par frame | **Cache 0,2 m** phase 2 ✓ |
| Lumières | Cull 4 frames | Torches sans traverse phase 1 ✓ |
| UI porte | ~10 Hz | Phase 1 ✓ |
| Arbres décor | Prefabs coupables | Géo/mat cache phase 5 ✓ |
| Rigs zombie | Géo/mat partagés | Phase 4 ✓ |

### Phase 1 — implémentée

- Interpolation zombie, `zombie-hit` x/z/angle, sync rayon 110 m.
- `_cullLights` sans `scene.traverse`.
- UI porte throttlée, vectors réutilisés, dispose zombie.

### Phase 2 — implémentée (runtime)

- `getCollidersNear(px, pz, r)` — grille spatiale 16 m.
- `getStandHeight` cache + colliders proches seulement.
- Mouvement utilise `getCollidersNear(30 m)`.

### Phase 4 — implémentée (client)

- **Cache géométries** `BoxGeometry` + **matériaux** `MeshLambertMaterial` partagés (`player.js`) — moins de RAM/GC à chaque zombie/joueur distant.

### Phase 5 — implémentée (client)

- **Socket parallèle** + buffer `game-init` (`network.js` `preconnect`).
- **Arbres** : cache `Cylinder`/`Cone`/`Sphere`/`Dodecahedron` + matériaux écorce/feuillage (`tree_prefabs.js`).

### Phase 6 — restant

- Instancing draw calls arbres lointains (non coupables).
- Eau en shader (`world.js`).
- Billboards noms joueurs.

---

## 3. Serveur (sync / CPU)

| Zone | Tick | Statut |
|------|------|--------|
| Zombie AI | 100 ms | OK autoritaire |
| `zombie-tick` | Par joueur 110 m | Phase 1 ✓ |
| `zombie-tick` delta | Updates + `removed` | Phase 3 ✓ |
| Snapshot complet | Toutes les 2 s | Phase 3 ✓ |
| Persist zombies 5 s | Supprimé | Phase 1 ✓ |
| Survival | 1 s / joueur | Charge modérée |
| Nearest player AI | Grille 32 m | Phase 3 ✓ |
| DT zombie | Wall-clock plafonné 250 ms | Phase 3 ✓ |
| `world-colliders` boot | Terrain seul + skip si DB | Phase 3 ✓ |

### Phase 3 — implémentée (serveur autoritaire)

- **Delta sync** : `{ full: false, zombies, removed }` entre snapshots ; `{ time }` seul si rien n'a changé.
- **Snapshot** : `full: true` toutes les 20 ticks (2 s) — réconciliation client.
- **Grille joueurs** : `spatial-grid.mjs` — AI nearest player sans O(z×p).
- **DT** : `wallDt` plafonné si event loop en retard (pas de téléport zombie).
- **`worldCollidersReady`** dans `game-init` — client n'envoie plus le dump décor.

### Phase 4 — implémentée (serveur autoritaire)

- **Grille zombies 32 m** : `_zombiesNear` / broadcast sans scan O(z) par joueur.

### Recommandé serveur (reste)

- Colliders boot depuis DB seul (sans attendre client).

---

## 4. Tests de régression

1. **Chargement** : barre 0→100 % sans écran gris > 0,5 s ; log `game-init total`.
2. **Mouvement** : pas de traverse arbres/murs ; sauts sur caisses OK.
3. **Zombies** : déplacement fluide ; knockback immédiat au coup.
4. **Mobile 10 min** : RAM stable, FPS jouable.
5. **QA server** : panneau QA s'ouvre après chargement différé.

---

## 5. RCON / flags

- `zombieAI off` — snapshots sans sim.
- `nospawn` — population zombies.
