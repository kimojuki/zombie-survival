# Audit monolithes — server + client

Objectif : repérer les gros fichiers, prioriser le découpage, éviter les régressions wiring (`catchUpSleeperSurvival`, `_decorStats`, etc.).

Commande : `npm run audit:monoliths`

Index : [DECOMPOSE_MONOLITH.md](./DECOMPOSE_MONOLITH.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Seuils

| Seuil | Action |
|-------|--------|
| **> 2000 lignes** | Priorité haute — domaine entier à extraire |
| **500–2000** | Découpage par sous-domaine |
| **< 500** | OK si rôle unique ; sinon fusionner petits modules voisins |

---

## Serveur (`apps/server`) — état actuel

| Lignes | Fichier | Rôle | Prochaine étape |
|--------|---------|------|-----------------|
| ✅ ~11 | `index.js` | Entrée | — |
| ✅ ~48 | `src/socket/register-sockets.js` | Orchestration Socket.io | — |
| ✅ ~789 | `src/socket/handlers/decor-handlers.js` | plus gros handler extrait | stable |
| ✅ ~135 | `src/rcon.js` | Orchestration RCON | — |
| ✅ 6× | `src/rcon/commands/*.js` | Commandes par domaine | — |
| ✅ ~104 | `src/routes/admin-routes.js` | Orchestration REST admin | — |
| ✅ 8× | `src/routes/admin/*.js` | Map, joueurs, roads, décor, backups… | — |
| ~540 | `src/db.js` | SQLite + MySQL | Séparer `db/sqlite.js` / `db/mysql.js` (optionnel) |
| ~500 | `src/game/create-game-stack.js` | Wiring game | Stable — ne grossir que via sous-factories |
| ~450 | `src/game/world-loops.js` | Boucles temps réel | Garder ; valider deps (`npm run audit:game-deps`) |
| ~280 | `src/build-socket-context.js` | Contexte socket | Réduire quand handlers extraits |
| ~220 | `src/build-server-runtime-context.js` | Contexte runtime | Idem |

### Roadmap serveur (ordre suggéré)

1. ✅ **`register-sockets.js`** → `socket/handlers/*` (11 fichiers, orchestration ~48 lignes)
2. ✅ **`rcon.js`** → `rcon/commands/{core,world,zombie,player,decor,qa}.js` + `rcon/helpers.js`
3. ✅ **`admin-routes.js`** → `routes/admin/*` (8 modules + helpers)
4. **Client legacy** — ✅ `network.js`, `spawn_clearing.js`, `world.js`, `player.js`, `inventory.js`, `game.js` → chunks + `bundle:client`

---

## Client legacy (`apps/client/public/js`)

| Lignes | Fichier | Prochaine étape |
|--------|---------|-----------------|
| ~4550 | `network.js` | **Généré** — 17 chunks · `npm run bundle:network` |
| ~3545 | `spawn_clearing.js` | **Généré** — 15 chunks · `npm run bundle:spawn-clearing` |
| ~2412 | `world.js` | **Généré** — 11 chunks · `npm run bundle:world` |
| ~2840 | `player.js` | **Généré** — 9 chunks · `npm run bundle:player` |
| ~2320 | `inventory.js` | **Généré** — 8 chunks · `npm run bundle:inventory` |
| ~1510 | `road_network.js` | **Généré** — 9 chunks · `npm run bundle:road-network` |
| ~1910 | `urban_prefabs.js` | **Généré** — 8 chunks · `npm run bundle:urban-prefabs` |
| ~1730 | `admin-live-decor.js` | **Généré** — 9 chunks · `npm run bundle:admin-live-decor` |
| ~2195 | `game.js` | **Généré** — 14 chunks · `npm run bundle:game` |
| ~1100 | `leisure_prefabs.js` | **Généré** — 6 chunks · `npm run bundle:leisure-prefabs` |
| ~1190 | `decor_colliders.js` | **Généré** — 6 chunks · `npm run bundle:decor-colliders` |
| ~1185 | `fps_arm_tuner.js` | **Généré** — 5 chunks · `npm run bundle:fps-arm-tuner` |
| ~1005 | `audio.js` | **Généré** — 5 chunks · `npm run bundle:audio` |
| ~1030 | `sector_02_town.js` | **Généré** — 6 chunks · `npm run bundle:sector-02-town` |
| ~980 | `admin-world-map.js` | **Généré** — 5 chunks · `npm run bundle:admin-world-map` |
| ~960 | `forest_decor.js` | **Généré** — 4 chunks · `npm run bundle:forest-decor` |
| ~830 | `beach_textures.js` | **Généré** — 3 chunks · `npm run bundle:beach-textures` |
| ~800 | `build_anchors.js` | **Généré** — 3 chunks · `npm run bundle:build-anchors` |
| ~775 | `admin-hub.js` | **Généré** — 4 chunks · `npm run bundle:admin-hub` |
| ~744 | `sector_05_military.js` | **Généré** — 4 chunks · `npm run bundle:sector-05-military` |
| ~731 | `prefab-catalog-preview.js` | **Généré** — 4 chunks · `npm run bundle:prefab-catalog-preview` |
| ~688 | `beach_decor.js` | **Généré** — 3 chunks · `npm run bundle:beach-decor` |
| ~674 | `sector_01_forest.js` | **Généré** — 4 chunks · `npm run bundle:sector-01-forest` |
| ~627 | `ui.js` | **Généré** — 3 chunks · `npm run bundle:ui` |
| ~570 | `map.js` | **Généré** — 3 chunks · `npm run bundle:map` |
| ~552 | `craft.js` | **Généré** — 3 chunks · `npm run bundle:craft` |
| ~608 | `noise.js` | **Généré** — 4 chunks · `npm run bundle:noise` |
| ~594 | `camp_textures.js` | **Généré** — 3 chunks · `npm run bundle:camp-textures` |
| ~588 | `admin-live-roads.js` | **Généré** — 3 chunks · `npm run bundle:admin-live-roads` |
| ~577 | `tree_prefabs.js` | **Généré** — 4 chunks · `npm run bundle:tree-prefabs` |
| ~562 | `admin-zone-overlay.js` | **Généré** — 3 chunks · `npm run bundle:admin-zone-overlay` |
| ~545 | `mapgen.js` | **Généré** — 3 chunks · `npm run bundle:mapgen` |
| ~544 | `sector_03_maincity.js` | **Généré** — 4 chunks · `npm run bundle:sector-03-maincity` |
| ~526 | `buildings.js` | **Généré** — 3 chunks · `npm run bundle:buildings` |
| ~441 | `urban_prefabs/chunks/01-build-outdoor.js` | Props rue | stable |
| ~466 | `admin-live-decor/chunks/04-methods-catalog.js` | Catalogue admin | stable |
| ~690 | `player/chunks/03-fps-part1-pose.js` | Poses FPS | sous-découpage optionnel |
| ~475 | `inventory/chunks/05-ui-part1-drag.js` | Drag hotbar | stable |
| ~801 | `spawn_clearing/chunks/01-props-part2a-cabin-furniture.js` | Mobilier cabine | sous-découpage optionnel |
| ~497 | `network/chunks/02-decor-part2-stream-gates.js` | Stream décor | stable |

Le client reste **legacy `window.ZS`** jusqu'à migration Vite ; découper sans changer l'API globale.

---

## Shared (`packages/shared`)

| Lignes | Fichier | Note |
|--------|---------|------|
| ~617 | `decor-prefab-orientation.mjs` | Données — acceptable |
| Autres | < 400 | OK |

---

## Outils

| Script | Rôle |
|--------|------|
| `npm run audit:monoliths` | Liste fichiers > seuil |
| `npm run audit:game-deps` | Vérifie deps world-loops + socket (anti crash wiring) |
| `npm run bundle:client` | Regénère network + spawn_clearing + world + player + inventory + game |
| `npm run bundle:client:all` | 34 modules chunkés (core + prefabs + admin + secteurs + textures + terrain + UI…) |

---

## Règles après chaque extraction

1. `npm test` vert  
2. `npm run audit:game-deps` sans erreur  
3. Entrée `DEV_TRACKER.md`  
4. Mettre à jour ce doc si priorités changent
