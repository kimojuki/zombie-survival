# Architecture client / serveur

Vue d'ensemble pour onboarding et reviews PR.

---

## Schéma

```
┌─────────────────────────────────────────────────────────────┐
│  Navigateur (apps/client)                                  │
│  game.html → Vite + scripts ZS.* legacy                    │
│                                                             │
│  game.js ── boucle render + input                           │
│  world.js ─ terrain, jour/nuit, végétation                  │
│  road_network.js ─ graphe routes (client build)             │
│  vehicles.js ─ carcasses le long des routes                 │
│  network.js ─ Socket.io sync                                │
│  rcon.js ─ console admin UI                                 │
│  spawn_clearing.js ─ prefabs décor camp + clairière spawn   │
│  camp_textures.js ─ textures bois/toile (prefabs décor)     │
│  sector_*.js ─ contenu monde par zone                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.io (JWT auth)
                       │ REST /api/auth/*
┌──────────────────────▼──────────────────────────────────────┐
│  apps/server/index.js                                        │
│  • players, zombies, items, structures (Maps en mémoire)   │
│  • Zombie AI tick 100ms + jour/nuit partagé                  │
│  • Loot bâtiments, butins de mort, structures joueurs        │
│  • Persistance monde autoritaire → BDD (flush ~500 ms)       │
│  • RCON (apps/server/src/rcon.js)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  apps/server/src/db.js — SQLite dev ou MySQL/MariaDB prod    │
│  players : position, health, kills, inventory JSON           │
│  world_decor / world_structures / world_items / world_meta   │
│  world_zombies / world_sleepers                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Chargement client (`apps/client/game.html`)

### Version client et cache

Source unique : `apps/client/public/client-version.json` (`version`).

1. Au chargement, le client appelle `GET /api/client-version` (no-store).
2. Si la version diffère de `localStorage.zs_client_version` → purge `caches` + rechargement forcé (`?v=…&_=…`).
3. CSS, `loading.js` et tous les scripts legacy reçoivent `?v=<version>`.
4. `game.html` est servi avec `Cache-Control: no-store` ; les assets JS/CSS en `no-cache`.

**Après un changement JS/CSS client** : incrémenter uniquement `client-version.json` (plus besoin de Ctrl+F5 manuel).

Ordre des scripts legacy (important) dans `apps/client/src/bootstrap/legacy-modules.js` :

1. `noise.js`, `camp_textures.js`, `buildings.js`
2. `road_network.js`, `trails.js`, `spawn_clearing.js`, `vehicle_prefabs.js`, `proc_roads.js`, `proc_spawn.js` — **spawn + sentier + RN + épaves**
3. `world.js`, `game.js` — pas de secteurs legacy (`sector_*.js` non chargés)

Pipeline monde (`world.js`) : `registerTerrain` → `applyRoadFlattening` → `buildTerrain` → `buildAll` → `RoadNetwork.buildMeshes(scene, ZS.B.M)`.

Le premier client connecté envoie au serveur :
- `world-colliders` — collision zombies
- `world-water-zones` — ralentissement eau
- `loot-buildings` — empreintes bâtiments pour loot

---

## Autorité serveur vs client

| Système | Autorité | Notes |
|---------|----------|-------|
| Position joueur | Hybride | Client envoie `move`, serveur rebroadcast |
| Zombies | Serveur + BDD | IA tick 100 ms ; positions ~5 s (`world_zombies`) |
| Tir / hit | Serveur | Raycast vs zombies |
| Jour/nuit | Serveur + BDD | `_worldTime` dans `world_meta` |
| Inventaire / survie / craft | Serveur | `inventory-authoritative`, `survival-update`, `craft-queue` |
| Routes / terrain | Client | Généré localement, identique pour tous |
| Admin RCON | Serveur | Commandes via socket ou API |
| Décor monde | Serveur + BDD | Arbres, rochers, épaves, barrières, builds — IDs `seed_*` ; chop/mine/portes persistés |
| Joueur endormi | Serveur + BDD | `world_sleepers` (corps déco + inventaire) |
| Constructions joueur | Serveur + BDD | `place-decor-prefab` → `world_decor` |
| Loot / drops au sol | Serveur + BDD | `world_items` ; TTL 30 min sauf loot bâtiments |
| Colliders / eau / loot bâtiments | Client → serveur + BDD | Premier client ; snapshot `world_meta` |

### Décor camp et textures (`camp_textures.js`)

Les **prefabs décor** (caisses, sacs, bedroll, établi, abri, poteaux…) sont des meshes procéduraux texturés avec les PNG du dossier `apps/client/public/textures/camp/` :

| Texture | Usage |
|---------|--------|
| `wood_planks_light.png` | Planches, caisses, établi, bûches |
| `wood_planks.png` | Montants / cadres bois foncé |
| `olive_canvas.png` | Toile, sacs, couvertures |
| `trail_forest.png` | Sentiers piéton (`type: trail` dans RoadNetwork) |
| `spawn_ground.png` | Patch sol clairière spawn |

API client : `ZS.CampTextures.load(url, repeatX, repeatY)` et `ZS.CampTextures.materials()` (cache partagé avec `mapgen.js`).

Pose in-game / admin :
- **Prefabs** : `ZS.spawnDecorPrefab(scene, prefabId, x, y, z)` — liste via `ZS.listDecorPrefabs()`
- **Items posés** : `ZS.spawnDecorItem(scene, type, x, y, z)` — réutilise `getItemModel()` (loot équipable ≠ prefab bois/toile)
- **Sentiers (refonte)** : `proc_roads.js` génère le tracé (`buildTrailTowardRoad`) ; `ZS.Trails.buildMesh` + jonction `RoadNetwork` — voir [docs/ROAD_NETWORK.md](ROAD_NETWORK.md)
- **RCON** : `decoradd prefab …` — voir [docs/RCON.md](RCON.md)

### Contrôles

| Plateforme | Déplacement | Caméra | Tir |
|------------|-------------|--------|-----|
| **PC** | WASD / flèches | Pointer lock (clic zone jeu) | Clic gauche |
| **Mobile** | Joystick gauche | Glisser zone droite | Bouton 🔫 |

### Chat joueurs

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat` | client → serveur | texte (max 200 car.) → callback `{ ok }` ou `{ error }` |
| `chat-message` | serveur → tous | `{ from, message, ts, senderId }` |

**UI (discret, bas gauche)** — pas de panneau ni fond : fil de texte (~3 lignes mobile, ~4 PC) avec ombre portée. La saisie n’apparaît qu’en mode `chat-open`.

| Plateforme | Ouvrir la saisie | Envoyer | Fermer |
|------------|------------------|---------|--------|
| **PC** | **Entrée** ou **T** | **Entrée** | **Échap** |
| **Mobile** | bouton **💬** (haut droite, sous ☰) | **➤** ou Entrée clavier | re-clic **💬** ou **Échap** |

Après envoi sur PC, le **pointer lock** reprend automatiquement.

**Serveur** : rate limit 800 ms par joueur. **`GET /api/health`** expose `"chat": true` si le handler est actif — **redémarrer Node** (`pm2 restart zombie`) après toute modif de `apps/server/index.js`.

Anti-doublon client : ignore l’écho serveur via `senderId` (socket.id), pas via le pseudo.

Sur PC, les zones tactiles `#left-zone` / `#right-zone` sont désactivées (`body.mode-desktop`).

---

## Bras FPS et items en main (`player.js`)

Source de vérité : table **GRIPS** (`GRIP_CATEGORIES` + overrides `GRIP_TYPES`).

| API | Rôle |
|-----|------|
| `getGrip(type)` | Pose item + bras + params d’animation |
| `updateHandItem(fpsGroup, type)` | Applique le grip et charge le modèle (procédural + GLB) |
| `tickFPSArms(fpsGroup, dt, { moving, speed })` | Idle (respiration) + bob marche |
| `triggerArmAnim(fpsGroup, kind, type, opts?)` | `recoil` \| `melee` \| `punch` \| `reload` |
| `tickArmAnim(fpsGroup, dt)` | Joue l’anim en cours (offsets sur item/bras, pas rotation du groupe racine) |
| `setRemoteHandItem(mesh, type)` | Item en main 3e personne + `userData.grip` pour `network.js` |

**Boucle** (`game.js`) : après `updateMovement`, appeler `tickFPSArms` puis `tickArmAnim`.

**Multijoueur** : `network.js` utilise `grip.remote` (pose visée deux mains) et `grip.anim` pour les gestes d’attaque distants.

---

## Secteurs monde

| ID | Fichier | Zone approximative |
|----|---------|-------------------|
| S01 | `sector_01_forest.js` | Spawn `(0, -6)`, forêt départ |
| S02 | `sector_02_town.js` | Petite ville `(-177, 0)` |
| S03 | `sector_03_maincity.js` | Main city `(-20, -185)` |
| S05 | `sector_05_military.js` | Base `(-200, -160)` |

Pas de S04 pour l'instant.

---

## Variables d'environnement

Voir [.env.example](../.env.example) — copier vers `.env` local.

| Groupe | Variables |
|--------|-----------|
| Serveur | `PORT`, `JWT_SECRET` |
| BDD | `DB_CLIENT`, `SQLITE_PATH` ou `DB_HOST`… |
| Logs | `LOG_LEVEL`, `LOG_*_MS` |
| Admin | `RCON_PASSWORD`, `ADMIN_USERS` |

---

## Logs serveur

Module `src/logger.js` — niveaux : `error`, `warn`, `info`, `debug`, `trace`.

En dev : `LOG_LEVEL=debug` recommandé.

---

## Fichiers à ne pas committer

- `.env`
- `database/*.sqlite*`
- `notes-local/`
- `.inventory_reset_*_done` (marqueurs one-shot)

Voir `.gitignore`.

---

## Server authority (anti-cheat)

Depuis 2026-06-07, le serveur est **source de vérité** pour l'inventaire, la survie, le craft, le combat et la récolte.

### Pattern intent → validate → snapshot

```
Client emit(intent) → Serveur valide → mute p.inv / p.survival
                  → inventory-authoritative / survival-update
```

| Domaine | Events client | Réponse serveur |
|---------|---------------|-----------------|
| Inventaire | `item-pickup`, `item-drop`, `inventory-move`, `use-item`, `weapon-reload` | `inventory-authoritative` |
| Survie | *(aucun push)* | `survival-update` (tick 1 s) |
| Craft | `craft-queue`, `craft-cancel` | `craft-queue-state`, `craft-complete` |
| Combat | `shoot` + `weaponType`, `weapon-reload` | stats `weapon-stats.mjs` ; usure via `wearInvTool` |
| Récolte | `decor-chop`, `decor-mine` + `toolType` | grant items serveur |
| Construction | `place-structure`, `place-decor-prefab` | consume inv avant spawn |
| Mort | *(serveur only)* | `player-death` |

### Rejetés / ignorés

- `inventory-sync` — log debug, ignoré
- `survival-sync` — ignoré
- `player-died` client — ignoré (mort via tick survie / zombies)
- Snapshot `inv` dans lock/unlock porte — supprimé

### Modules

| Fichier | Rôle |
|---------|------|
| `apps/server/src/inventory-ops.js` | `_addStackToInv`, `_removeFromSlot`, etc. |
| `apps/server/src/survival-tick.js` | Faim/soif/infection/dégâts |
| `apps/server/src/craft-queue.js` | File craft par joueur |
| `packages/shared/src/item-effects.mjs` | Effets consommables |
| `packages/shared/src/craft-recipes.mjs` | Recettes partagées |
| `packages/shared/src/weapon-stats.mjs` | Dégâts/portée/cadence |

### Mouvement

`move` : anti-teleport léger (max ~11 u/s × 1.5). Rejet → `move-correction`. Client envoie max 20 Hz.

### Performance réseau / client

| Optimisation | Détail |
|--------------|--------|
| Inventaire | `_scheduleInvAuth` coalesce les emits dans le même tick Node |
| Tir / récolte | ammo + usure outil → un seul `inventory-authoritative` |
| Client inv | `applyAuthoritativeInv` préserve le slot hotbar actif (pas de reset UI) |
| Zombies | `zombie-tick` payload compact ; client throttle hauteur terrain |
| Survie | dégâts faim/soif via `survival-update` (pas de double `take-damage`) |
| Morsure zombie | infection/saignement roll serveur + `survival-update` immédiat |

### Monde

`world-colliders` : terrain first-client only ; plus de merge décor client.

