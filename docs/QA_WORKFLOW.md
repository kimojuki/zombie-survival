# Workflow Dev → QA → Prod

Choix du serveur à la connexion — liste servie par **`GET /api/servers`** (domaine courant + variables `.env`).

## Setup actuel (équipe Badom)

| Environnement | Hébergement | Rôle |
|---------------|-------------|------|
| **Dev + QA** | [survival.badom.ch](https://survival.badom.ch/) | Alterner `SERVER_ROLE=dev` ou `qa` sur la même machine |
| **Prod (semi-prod)** | Preview Infomaniak du pote | `SERVER_ROLE=prod` sur branche `main` |

### Variables `.env`

```env
SERVER_ROLE=qa                    # ou dev / prod selon l'instance
TRUST_PROXY=true                  # Cloudflare + Infomaniak
ZS_TEAM_URL=https://survival.badom.ch
ZS_PROD_URL=https://3k51myccypp.preview.infomaniak.website   # optionnel — défaut intégré si absent
```

- **`ZS_TEAM_URL`** — cible Dev/QA (défaut `https://survival.badom.ch`)
- **`ZS_PROD_URL`** — preview Infomaniak (semi-prod). Sur le serveur prod du pote, laisser vide : le jeu utilise le domaine courant.
- **URL vide** dans l'API = « rester sur ce domaine » → fonctionne sur **n'importe quel hôte** sans reconfigurer le client.

Le login **auto-sélectionne** Dev/QA/Prod selon le `SERVER_ROLE` de l'instance courante.

## Rôles serveur (`SERVER_ROLE`)

| Rôle | Variable | Accès | Usage |
|------|----------|-------|--------|
| **Dev** | `SERVER_ROLE=dev` | Admins uniquement (`ADMIN_USERS`) | Développement continu |
| **QA** | `SERVER_ROLE=qa` | Tous les joueurs | Validation des nouveautés |
| **Prod** | `SERVER_ROLE=prod` | Tous (défaut) | Version stable |

## Déploiement local (3 instances)

```bash
# Terminal 1 — dev
set SERVER_ROLE=dev&& set PORT=3000&& npm run dev:server

# Terminal 2 — QA
set SERVER_ROLE=qa&& set PORT=3001&& npm run dev:server

# Terminal 3 — prod
set SERVER_ROLE=prod&& set PORT=3002&& npm run dev:server
```

Configurer `apps/client/public/servers.json` avec les URLs (`localhost:3000`, `3001`, `3002`).

En production, chaque sous-domaine pointe vers une instance avec le bon `SERVER_ROLE`.

## Checklist QA (joueurs)

Sur le serveur **QA**, menu ☰ → **Checklist QA** :

- Liste des éléments **en attente** ou **à retester** (après correction)
- **✓** — validé
- **✗** — problème (commentaire obligatoire → stocké côté serveur)
- Classement des testeurs les plus actifs

Mode **retest complet** : tous les items reviennent aux testeurs (même déjà validés).

## Commandes admin (RCON / console dev)

Sur le serveur QA (ou dev avec accès RCON) :

| Commande | Action |
|----------|--------|
| `qa new "Sprint 8"` | Nouvelle campagne QA |
| `qa new "Sprint 8" full` | Campagne + retest complet |
| `qa add "Titre" "Description"` | Ajouter un item à tester |
| `qa list` | Liste campagne + statuts |
| `qa failures` | Retours négatifs des testeurs |
| `qa testers` | Classement participation |
| `qa fix <id>` | Remettre un item en attente après correction |
| `qa full on\|off` | Activer/désactiver retest complet |
| `qa close` | Fermer la campagne active |

## API

- `GET /api/server-info` — rôle du serveur courant
- `GET /api/qa/checklist` — items à tester (auth, QA only)
- `POST /api/qa/verdict` — `{ itemId, verdict: "pass"|"fail", feedback? }`

## Cycle recommandé

1. **Dev** — implémentation + tests auto + validation admin
2. **QA** — `qa new` + `qa add …` → testeurs valident via le menu
3. Corrections sur **dev** → `qa fix <id>` → retest ciblé
4. Tout vert → déploiement **prod** (merge `dev` → `master`, deploy prod)
5. **Dev** reprend le cycle suivant
