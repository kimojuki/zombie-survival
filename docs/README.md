# Documentation technique

Index pour l'équipe — à maintenir à jour à chaque push.

## Guides

| Document | Sujet |
|----------|-------|
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Git équipe — pull/push, fusion parallèle, conflits |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Client/serveur, sync, secteurs, `.env` |
| [RCON.md](RCON.md) | Console admin in-game, API, commandes, flags |
| [ROAD_NETWORK.md](ROAD_NETWORK.md) | Routes, sentiers, terrain, spawn |
| [S01_DECOR_PLACEMENT.md](S01_DECOR_PLACEMENT.md) | Seed S01 : position, rotY, hauteur intérieur shack, checklist |
| [DECOR_PREFAB_ORIENTATION.md](DECOR_PREFAB_ORIENTATION.md) | Devant / derrière / rotY — convention −Z et repères par prefab |
| [ARCHITECTURE_TIERS.md](ARCHITECTURE_TIERS.md) | **3 tiers** — VM app + VM db, compose split |
| [VM_DEPLOY.md](VM_DEPLOY.md) | Prod VM Ubuntu + Docker (mono ou split) |
| [DOCKER_PROD_SIM.md](DOCKER_PROD_SIM.md) | Simuler la VM sur PC dev (Docker) |
| [DEPLOY.md](DEPLOY.md) | Legacy Infomaniak / pm2 (migration en cours) |
| [adr/](adr/) | Décisions d'architecture |

## Ailleurs dans le repo

| Document | Sujet |
|----------|-------|
| [../README.md](../README.md) | Démarrage rapide, structure, checklist push |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Workflow `feature/* -> dev -> master` |
| [../DEV_TRACKER.md](../DEV_TRACKER.md) | Journal de dev + règles obligatoires |
| [../.env.example](../.env.example) | Variables d'environnement |
| [../design/](../design/) | Design monde, items, secteurs |

## Règle d'équipe

**Avant chaque PR :** mettre à jour le journal dans `DEV_TRACKER.md` et les docs concernées (voir checklist dans ce fichier).
