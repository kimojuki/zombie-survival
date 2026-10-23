# Infomaniak — Node managé + PM2 (sans Docker)

Hébergement **Infomaniak Node.js** : Node + PM2 + MariaDB managé + Apache en reverse proxy.  
**Pas de Docker** sur cet environnement.

| Environnement | Stack | Doc |
|---------------|-------|-----|
| **Colègue / preview Infomaniak** | Node + pm2 + MariaDB cloud | **Ce fichier** |
| **VM équipe (Badom)** | Docker Compose | [VM_DEPLOY.md](./VM_DEPLOY.md) |
| **Dev local PC** | Node direct ou Docker sim | [DOCKER_PROD_SIM.md](./DOCKER_PROD_SIM.md) |

URL type : `https://3k51myccypp.preview.infomaniak.website`  
Chemin repo : `~/sites/jeu.zombieOfficel.ch/zombie-survival` (adapter selon Manager)

---

## Prérequis Manager Infomaniak

1. **Application Node.js** activée sur le site
2. **MariaDB** créée (noter host, user, password, nom de base)
3. Accès **SSH** au compte
4. **Node 20** si disponible (sinon nvm — voir ci-dessous)

---

## Installation (première fois)

```bash
ssh votre-user@ssh.infomaniak.com
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival   # adapter

git clone git@github.com:kimojuki/zombie-survival.git .   # si vide
git checkout master   # ou dev selon accord équipe

bash scripts/setup-infomaniak.sh
```

Le script :
- `npm ci --omit=dev`
- crée `.env` depuis `.env.infomaniak.example` si absent
- `pm2 start infra/ecosystem.config.cjs` + `pm2 save`

### Configurer `.env`

```bash
nano .env
```

Minimum à changer :

| Variable | Valeur |
|----------|--------|
| `JWT_SECRET` | `openssl rand -hex 32` |
| `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` | Manager MariaDB |
| `RCON_PASSWORD` | mot de passe admin |
| `OWNER_USERS` | pseudos propriétaires |
| `ZS_PROD_URL` | URL HTTPS du site |
| `TRUST_PROXY` | `true` |

**Auth recommandée (simple)** — laisser :

```env
AUTH_MODE=embedded
```

Un seul process pm2 (`zombie`). Comptes + invités dans la base **game** MySQL.

Redémarrer après édition :

```bash
pm2 restart zombie
pm2 logs zombie --lines 30
```

---

## Apache / WebSocket (Socket.io)

Sans proxy WebSocket, le jeu charge puis reste bloqué (polling 400).

1. Copier [`infra/htaccess.socketio.example`](../infra/htaccess.socketio.example) → **racine web** du domaine (`.htaccess`)
2. Remplacer `3000` par le `PORT` de `.env` (ou port assigné par Infomaniak)
3. `pm2 restart zombie`

---

## Commandes quotidiennes

```bash
# État
pm2 status
pm2 logs zombie --lines 50

# Health local
curl -s http://127.0.0.1:3000/api/health

# Redémarrage après modif .env
pm2 restart zombie
pm2 save
```

Scripts npm (depuis la racine du repo) :

```bash
npm run pm2:start      # premier démarrage
npm run pm2:restart    # redémarrage
npm run pm2:logs       # logs
npm run deploy:infomaniak   # = scripts/deploy-prod.sh
```

---

## Déploiement automatique (cron)

Identique à [DEPLOY.md](./DEPLOY.md) — le serveur suit `origin/master` (ou `dev` via `ZOMBIE_DEPLOY_BRANCH`).

```bash
crontab -e
```

```cron
*/2 * * * * ZOMBIE_APP_DIR=/home/clients/VOTRE_ID/sites/jeu.zombieOfficel.ch/zombie-survival /bin/bash /home/clients/VOTRE_ID/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/git-watch-deploy.sh >> $HOME/logs/zombie-deploy-cron.log 2>&1
```

Manuel :

```bash
bash scripts/deploy-prod.sh
```

Le deploy :
1. `git fetch` + `reset --hard origin/<branche>`
2. `npm ci` si `package.json` modifié
3. **backup BDD** (`tools/pre-deploy-backup.mjs`) — bloque si échec
4. `pm2 restart` (ou premier `pm2 start` si absent)
5. smoke `/api/health`

---

## Auth standalone (optionnel, 2 process)

Si vous voulez le même modèle que Docker (auth-server séparé) :

```env
AUTH_MODE=standalone
AUTH_PORT=3001
AUTH_INTERNAL_URL=http://127.0.0.1:3001
AUTH_JWT_SECRET=...
AUTH_INTERNAL_KEY=...
# + credentials MySQL auth (base séparée ou même serveur)
```

Puis :

```bash
pm2 start infra/ecosystem.config.cjs   # démarre zombie + zombie-auth
pm2 save
```

Par défaut l'équipe Infomaniak utilise **`embedded`** (plus simple, un process).

---

## Node version (nvm)

**Recommandé : Node ≥ 20.19** (idéalement la dernière 20.x LTS).

Sur Infomaniak, `g++` est souvent **interdit** : les modules natifs (`better-sqlite3`, parfois `bcrypt`) doivent donc trouver un **binaire précompilé**. Node **20.4.0** est trop vieux → pas de prebuild → `npm ci` échoue → `Cannot find module 'dotenv'`.

`better-sqlite3` est en **`optionalDependencies`** (prod = MySQL uniquement). Un échec de compile SQLite ne doit plus bloquer `npm ci`.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20          # dernière 20.x (ex. 20.19+)
nvm alias default 20
nvm use 20
node -v                 # vérifier >= 20.19
hash -r
# Recharger pm2 avec ce node :
pm2 kill
npm install -g pm2
bash scripts/setup-infomaniak.sh
```

Les scripts deploy chargent nvm automatiquement pour le cron.

---

## Différences vs Docker (VM)

| | Infomaniak Node | VM Docker |
|--|-----------------|-----------|
| Process | pm2 sur hôte | conteneurs |
| MariaDB | **Cloud managé** Infomaniak | conteneur local |
| Auth | `embedded` (1 proc) recommandé | `standalone` (game + auth) |
| Nginx / TLS | Apache Infomaniak | nginx conteneur + cloudflared |
| Backup | `database/backups/` + dumps Manager | `backup-vm.sh` |

Les **bundles client** (`network.js`, etc.) sont **commités** — pas besoin de `npm run build` sur le serveur sauf si vous activez `USE_CLIENT_BUILD=true`.

---

## Dépannage

| Symptôme | Action |
|----------|--------|
| `npm ci` échoue sur `better-sqlite3` / `g++: Permission denied` | Passer Node ≥ 20.19 (`nvm install 20`) ; SQLite est optionnel — re-pull master puis `rm -rf node_modules && npm ci --omit=dev` |
| `Cannot find module 'dotenv'` | `npm ci` a échoué avant la fin → corriger Node / reinstaller deps (voir ci-dessus) |
| `better-sqlite3` crash au boot | `.env` → `DB_CLIENT=mysql` (pas sqlite en prod) |
| `Process or Namespace zombie not found` | Premier start : `pm2 start infra/ecosystem.config.cjs` puis `pm2 save` |
| Health sans `"chat":true` | `pm2 restart zombie` après deploy |
| Socket.io 400 / WS failed | `.htaccess` WebSocket + `TRUST_PROXY=true` |
| 401 `/api/auth/me` | Déconnexion — JWT d'un autre environnement |
| Cron ne deploy pas | `tail ~/logs/zombie-deploy-cron.log` — PATH pm2 / deploy key Git |
| Gap décor / LOD | Vérifier `client-version.json` dans la réponse health |

---

## Checklist release (Infomaniak)

1. Merge sur la branche suivie (`master` ou `dev`)
2. Attendre cron ou `bash scripts/deploy-prod.sh`
3. `curl -s https://VOTRE-DOMAINE/api/health` → `"chat":true`, `"commit":"…"`
4. Jeu : **Ctrl+F5** (cache bust `game.html`)
5. Notes joueurs : [RELEASE_NOTES.md](./RELEASE_NOTES.md)

Voir aussi [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) — backup avant restart pm2.
