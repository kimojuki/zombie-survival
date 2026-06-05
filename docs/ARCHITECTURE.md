# Architecture client / serveur

Vue d'ensemble pour onboarding et reviews PR.

---

## Schéma

```
┌─────────────────────────────────────────────────────────────┐
│  Navigateur (public/)                                       │
│  game.html → scripts ZS.* (ordre fixe, CACHE_BUST)         │
│                                                             │
│  game.js ── boucle render + input                           │
│  world.js ─ terrain, jour/nuit, végétation                  │
│  road_network.js ─ graphe routes (client build)             │
│  vehicles.js ─ carcasses le long des routes                 │
│  network.js ─ Socket.io sync                                │
│  rcon.js ─ console admin UI                                 │
│  sector_*.js ─ contenu monde par zone                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.io (JWT auth)
                       │ REST /api/auth/*
┌──────────────────────▼──────────────────────────────────────┐
│  server.js                                                    │
│  • players, zombies, items, structures (Maps en mémoire)   │
│  • Zombie AI tick 100ms + jour/nuit partagé                  │
│  • Loot bâtiments, butins de mort, structures joueurs        │
│  • RCON (src/rcon.js)                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  src/db.js — SQLite (dev) ou MySQL/MariaDB (prod)            │
│  Table players : position, health, kills, inventory JSON     │
└─────────────────────────────────────────────────────────────┘
```

---

## Chargement client (`game.html`)

Ordre des scripts (important) :

1. `noise.js` — hauteur terrain
2. `road_network.js` — **avant** buildings
3. `buildings.js`, `vehicles.js`, secteurs, `world.js`
4. `rcon.js`, `network.js`, `game.js`

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

### Contrôles

| Plateforme | Déplacement | Caméra | Tir |
|------------|-------------|--------|-----|
| **PC** | WASD / flèches | Pointer lock (clic zone jeu) | Clic gauche |
| **Mobile** | Joystick gauche | Glisser zone droite | Bouton 🔫 |

### Chat joueurs

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat` | client → serveur | texte (max 200 car.) → callback `{ ok }` |
| `chat-message` | serveur → tous | `{ from, message, ts }` |

Raccourcis : **Entrée** ou **T** pour ouvrir, **Entrée** pour envoyer, **Échap** pour fermer.

Sur PC, les zones tactiles `#left-zone` / `#right-zone` sont désactivées (`body.mode-desktop`).

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
