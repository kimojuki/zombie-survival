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
| [DEPLOY.md](DEPLOY.md) | Prod Infomaniak, cron / webhook auto-deploy |
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
