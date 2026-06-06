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
│  • RCON (apps/server/src/rcon.js)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  apps/server/src/db.js — SQLite dev ou MySQL/MariaDB prod    │
│  Table players : position, health, kills, inventory JSON     │
└─────────────────────────────────────────────────────────────┘
```

---

## Chargement client (`apps/client/game.html`)

Ordre des scripts legacy (important) dans `apps/client/src/bootstrap/legacy-modules.js` :

1. `noise.js`, `camp_textures.js`, `buildings.js`
2. `trails.js`, `spawn_clearing.js`, `proc_spawn.js` — **spawn + sentier refonte**
3. `world.js`, `game.js` — pas de secteurs legacy

Le pipeline `RoadNetwork.buildMeshes` / secteurs est **désactivé** pendant la refonte (voir `legacy-modules.js`).

Le premier client connecté envoie au serveur :
- `world-colliders` — collision zombies
- `world-water-zones` — ralentissement eau
- `loot-buildings` — empreintes bâtiments pour loot

---

## Autorité serveur vs client

| Système | Autorité | Notes |
|---------|----------|-------|
| Position joueur | Hybride | Client envoie `move`, serveur rebroadcast |
| Zombies | Serveur | IA, dégâts, respawn |
| Tir / hit | Serveur | Raycast vs zombies |
| Jour/nuit | Serveur | `_worldTime`, sync via `zombie-tick` |
| Inventaire / survie | Client + persist | `inventory-sync`, `survival-sync` |
| Routes / terrain | Client | Généré localement, identique pour tous |
| Admin RCON | Serveur | Commandes via socket ou API |
| Décor monde | Serveur | `decorItems` Map ; sync spawn/remove aux clients |

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
- **Sentiers (refonte)** : `ZS.Trails.registerFlatten(pts)` avant terrain, `ZS.Trails.buildMesh(scene, pts)` après — voir `trails.js` + `SPAWN_TRAIL_PTS`
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
