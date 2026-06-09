# Zombie Survival

Jeu 3D multijoueur survival/zombie — navigateur mobile-first, Three.js + Node.js + Socket.io.

## Démarrage rapide (nouveau dev)

```bash
git clone <repo>
cd zombie-survival
npm install
cp .env.example .env    # puis éditer .env (voir ci-dessous)
npm run dev:server      # API + Socket.io sur http://localhost:3000
npm run dev:client      # client Vite sur http://localhost:5173
```

Ouvrir **http://localhost:3000** pour le serveur intégré, **https://survival.badom.ch** via cloudflared (dev tunnel), ou **http://localhost:5173** pour le client Vite seul.

### `.env` minimal (dev local)

```env
PORT=3000
JWT_SECRET=dev_secret_local
DB_CLIENT=sqlite
SQLITE_PATH=database/local-dev.sqlite
LOG_LEVEL=debug

# Optionnel — console admin (voir docs/RCON.md)
RCON_PASSWORD=dev_admin_secret
ADMIN_USERS=votre_username
```

> Ne jamais committer `.env` ni `database/*.sqlite`.

### Prérequis

- **Node 20** recommandé (SQLite via `better-sqlite3`)
- Windows : `nvm use 20` ou chemin complet vers `node.exe` v20

---

## Documentation (à lire avant un push / review)

| Document | Contenu |
|----------|---------|
| [DEV_TRACKER.md](DEV_TRACKER.md) | Journal de dev, règles Git, checklist PR |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow `feature/* -> dev -> master`, Definition of Done |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) | Git équipe — travail parallèle, pull/push, fusion conflits |
| [SECURITY.md](SECURITY.md) | Secrets, données locales, signalement sécurité |
| [docs/RCON.md](docs/RCON.md) | Console admin in-game + API |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Prod Infomaniak, auto-deploy (cron / webhook) |
| [docs/ROAD_NETWORK.md](docs/ROAD_NETWORK.md) | Architecture routes/sentiers (2026-06) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Vue d'ensemble client/serveur |
| [docs/INVENTORY_CONSUMPTION.md](docs/INVENTORY_CONSUMPTION.md) | Inventaire authoritatif, `use-item`, debug `[inv-debug]` |
| [.env.example](.env.example) | Variables d'environnement commentées |
| [design/](design/) | Design monde cible ; migration depuis `worlDesign/` |

---

## Structure du projet

```
apps/
  server/
    index.js           # Serveur Express + Socket.io + zombies + RCON
    src/
      db.js            # SQLite (dev) / MySQL (prod)
      rcon.js          # Commandes admin serveur
      logger.js        # Logs structurés
  client/
    game.html          # Point d'entrée jeu legacy (CACHE_BUST ici)
    public/js/
    game.js            # Boucle principale
    world.js           # Terrain, jour/nuit, végétation
    road_network.js    # Graphe routier (source de vérité)
    vehicles.js        # Carcasses abandonnées le long des routes
    buildings.js       # Bâtiments, registre secteurs, B.carcass()
    sector_*.js        # S01 forêt … S05 militaire
    rcon.js            # Console admin in-game
    chat.js            # Chat multijoueur
    network.js         # Sync multijoueur
packages/shared/       # Constantes et contrats partagés
infra/                 # PM2 / déploiement
tools/visual-tests/    # Captures Playwright
```

---

## Après chaque session de dev

1. Mettre à jour **[DEV_TRACKER.md](DEV_TRACKER.md)** (obligatoire avant push)
2. Si nouvelle feature config → mettre à jour **`.env.example`**
3. Si feature admin / API → mettre à jour **`docs/RCON.md`**
4. Si routes/terrain → mettre à jour **`docs/ROAD_NETWORK.md`**
5. Incrémenter **`CACHE_BUST`** dans `apps/client/game.html` après changement JS client legacy
6. Redémarrer le serveur Node après modif **`apps/server/index.js`** (`pm2 restart zombie` en prod) — obligatoire pour le chat et les nouveaux handlers Socket.io
7. Vérifier `GET /api/health` → `"chat": true` si vous touchez au chat

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm start` | Lance `apps/server/index.js` |
| `npm run dev:server` | Nodemon serveur |
| `npm run dev:client` | Client Vite |
| `npm run lint` | ESLint |
| `npm test` | Tests Node |
| `npm run build` | Build Vite client |
| `npm run test:smoke` | Smoke `/api/health` |
| `npm run test:visual` | Captures Playwright FPS arm |

## Endpoints utiles

| URL | Description |
|-----|-------------|
| `GET /api/health` | État serveur (`ready`, `players`, `uptime`, **`chat`**, **`commit`**) |
| `POST /api/rcon` | Commandes admin (mot de passe requis) |
| `POST /api/auth/register` | Inscription |
| `POST /api/auth/login` | Connexion → JWT + `isAdmin` |
| `GET /api/auth/me` | Profil courant (Bearer JWT) |

---

## Équipe — bonnes pratiques PR

- Décrire le **pourquoi** dans le message de commit / description PR
- Lister les fichiers clés modifiés et les tests manuels effectués
- Ne pas inclure : `.env`, bases SQLite locales, `notes-local/`
- Référencer les docs mises à jour dans la description PR
- Workflow obligatoire : `feature/* -> dev -> master`
- `master` reste production ; pas de merge sans checks verts et validation sur `dev`
