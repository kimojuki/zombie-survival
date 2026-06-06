# Déploiement production (Infomaniak)

URL preview actuelle : `https://3k51myccypp.preview.infomaniak.website`  
Chemin serveur : `~/sites/jeu.zombieOfficel.ch/zombie-survival`

Commande manuelle habituelle (normalement **inutile** si le cron tourne) :

```bash
bash ~/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/deploy-prod.sh
```

> Sur Infomaniak le chemin réel est souvent  
> `/home/clients/XXXX/sites/jeu.zombieOfficel.ch/zombie-survival`  
> (voir `dir=` dans `~/logs/zombie-deploy.log`).

---

## Option A — Cron (recommandé, simple)

Vérifie Git toutes les 2 minutes et redémarre **seulement** s'il y a un nouveau commit sur `master`.

Le script **`deploy-prod.sh`** fait `git fetch` + **`git reset --hard origin/master`** (pas de `git pull` merge).  
Les modifs locales accidentelles sur le serveur (ex. édition manuelle de `deploy-prod.sh`) sont **écrasées** — c'est voulu en prod.

> **Important :** le cron est une config **une seule fois en SSH** sur le serveur Infomaniak.

### 1. Réparation unique (si erreur « would be overwritten by merge »)

```bash
cd /home/clients/VOTRE_ID/sites/jeu.zombieOfficel.ch/zombie-survival
bash scripts/fix-prod-once.sh
```

Ou à la main :

```bash
git fetch origin master
git reset --hard origin/master
chmod +x scripts/*.sh
bash scripts/deploy-prod.sh
```

### 2. Premier déploiement (si repo jamais synchronisé)

```bash
ssh votre-user@infomaniak
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival   # adapter le chemin
bash scripts/fix-prod-once.sh
```

Vérifier : `curl -s https://3k51myccypp.preview.infomaniak.website/api/health`  
→ `"chat": true` et `"commit": "…"`.

### 3. Crontab (auto-deploy — plus de commandes manuelles)

```bash
crontab -e
```

**Infomaniak** — utiliser le chemin **complet** (copier depuis `deploy-prod.log`) :

```cron
*/2 * * * * ZOMBIE_APP_DIR=/home/clients/VOTRE_ID/sites/jeu.zombieOfficel.ch/zombie-survival /bin/bash /home/clients/VOTRE_ID/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/git-watch-deploy.sh >> $HOME/logs/zombie-deploy-cron.log 2>&1
```

**Workflow dev :** `feature/* -> dev -> master`. Le serveur de prod ne suit que `master`; `dev` doit passer CI, smoke tests et validation manuelle avant merge prod.

### 4. Vérifier que le cron tourne

```bash
crontab -l
tail -30 ~/logs/zombie-deploy-cron.log
tail -30 ~/logs/zombie-deploy.log
```

---

## Option B — Webhook GitHub (instantané)

Si le serveur peut recevoir un POST (reverse proxy ou port local exposé).

### 1. Secret dans `.env` prod

```env
DEPLOY_WEBHOOK_SECRET=une_longue_chaine_aleatoire
DEPLOY_WEBHOOK_PORT=9090
```

### 2. Lancer le listener (pm2)

```bash
pm2 start scripts/webhook-deploy.js --name zombie-deploy-hook
pm2 save
```

### 3. GitHub → Settings → Webhooks → Add

| Champ | Valeur |
|-------|--------|
| Payload URL | `https://votre-domaine/deploy` (proxy vers `127.0.0.1:9090/deploy`) |
| Content type | `application/json` |
| Secret | même valeur que `DEPLOY_WEBHOOK_SECRET` |
| Events | **Just the push event** |

Le webhook n'agit que sur la branche `master` (ou `ZOMBIE_DEPLOY_BRANCH`).

---

## Variables optionnelles

| Variable | Défaut | Description |
|----------|--------|-------------|
| `ZOMBIE_APP_DIR` | `~/sites/jeu.zombieOfficel.ch/zombie-survival` | Racine du repo |
| `ZOMBIE_PM2_NAME` | `zombie` | Nom process pm2 |
| `ZOMBIE_DEPLOY_BRANCH` | `master` | Branche suivie |
| `ZOMBIE_DEPLOY_LOG_DIR` | `~/logs` | Logs déploiement |
| `TRUST_PROXY` | `true` derrière proxy | Express (Infomaniak **ou** cloudflared) |

## Environnements

| URL | Rôle | Backend |
|-----|------|---------|
| `http://localhost:3000` | Dev direct (PC) | Node local |
| `https://survival.badom.ch` | **Dev partagé** (tunnel) | cloudflared → `127.0.0.1:3000` |
| `https://3k51myccypp.preview.infomaniak.website` | **Prod / preview** | Infomaniak (pm2 + Apache) |

Ne pas mélanger les sessions : le JWT de la preview Infomaniak **≠** celui du serveur local. Se reconnecter sur chaque URL.

---

## Dev local via cloudflared (`survival.badom.ch`)

Symptômes : `[world] build` OK, puis chargement infini, `socket.io polling 400`, WebSocket fermé.

### Checklist

1. Serveur local actif : `npm run dev:server` (écoute `0.0.0.0:3000`).
2. Dans `.env` local : `TRUST_PROXY=true` (headers `X-Forwarded-*` du tunnel).
3. Tunnel actif : `cloudflared tunnel run …` pointant vers `http://127.0.0.1:3000`.
4. Config tunnel : voir [`infra/cloudflared.config.example.yml`](../infra/cloudflared.config.example.yml) — `disableChunkedEncoding: true` aide souvent Socket.io.
5. Se **connecter sur** `https://survival.badom.ch` (pas réutiliser un token obtenu sur la preview Infomaniak).

Commande rapide (sans fichier config, test) :

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

(Pour un hostname fixe `survival.badom.ch`, utiliser un tunnel nommé + ingress YAML.)

---

## Prod Infomaniak (`3k51myccypp.preview.infomaniak.website`)

`localhost` ou le tunnel dev peuvent fonctionner, mais la **preview** échoue si Apache ne proxifie pas les **WebSockets**.

Symptômes navigateur :
- `WebSocket connection to 'wss://…/socket.io/' failed`
- `socket.io/… polling … 400`
- chargement infini après `[world] build`

### Correctif Infomaniak (Apache)

1. Copier [`infra/htaccess.socketio.example`](../infra/htaccess.socketio.example) vers la **racine web** du domaine (`.htaccess`).
2. Remplacer `3000` par le port Node réel (`PORT` dans `.env` prod ou Manager Infomaniak).
3. Redémarrer l'app Node (`pm2 restart zombie`).

Le bloc `RewriteCond … websocket` est **obligatoire** — sans lui, seul HTTP passe et Socket.io casse.

### Erreur 401 sur `/api/auth/me`

Le JWT a été émis par **un autre environnement** (login preview Infomaniak vs tunnel dev vs localhost).

→ Menu ☰ → déconnexion, ou vider le stockage du site, puis **se reconnecter sur l’URL utilisée**.

## Structure Runtime

- Entrypoint serveur : `apps/server/index.js`
- Wrapper compatible : `server.js`
- Config PM2 : `infra/ecosystem.config.cjs`
- Client build : `npm run build` génère `build/client`
- Serveur intégré : sert `apps/client/dist` si présent, sinon `apps/client/public` + HTML de `apps/client`

---

## Sécurité

- Ne **jamais** exposer le webhook sans secret HMAC GitHub.
- Préférer écoute sur `127.0.0.1` + reverse proxy Infomaniak.
- Le cron ne fait que `git fetch` + `pull` : pas de port ouvert.
- `.env` prod reste hors Git (JWT, DB, RCON…).

---

## Dépannage

### Le serveur prod ne se met pas à jour tout seul

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `/api/health` sans `"chat"` ni `"commit"` | Vieux `server.js` encore en mémoire | SSH → `bash scripts/deploy-prod.sh` |
| Pas de fichier `~/logs/zombie-deploy-cron.log` | Cron **jamais** configuré | `crontab -e` (voir Option A) |
| Log cron : `pm2: command not found` | PATH cron trop court | Script mis à jour charge nvm ; refaire `git pull` + retester |
| Log : `would be overwritten by merge` | Fichiers modifiés à la main sur le serveur | `bash scripts/fix-prod-once.sh` (reset hard) |
| Log : `git fetch failed` | Repo privé sans credentials SSH | Configurer deploy key GitHub sur le serveur |
| Log : `already up to date` mais health ancien | mauvaise branche / mauvais dossier | `git remote -v` + `git log -1` en SSH |

**Vérification rapide depuis votre PC :**

```bash
curl -s https://3k51myccypp.preview.infomaniak.website/api/health
```

Attendu après deploy : `"chat":true,"commit":"36b2a1e"` (ou commit plus récent).

```bash
# État pm2
pm2 status
pm2 logs zombie --lines 50

# Derniers déploiements
tail -30 ~/logs/zombie-deploy.log

# Forcer un deploy
bash ~/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/deploy-prod.sh
```

Si `git pull` échoue (conflits locaux sur le serveur) :

```bash
bash scripts/fix-prod-once.sh
```

Équivalent manuel :

```bash
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival
git fetch origin master
git reset --hard origin/master
bash scripts/deploy-prod.sh
```

> **Ne pas** éditer les fichiers du repo directement sur le serveur prod — le cron écrase tout via `reset --hard`.

### Chat multijoueur inactif

1. Vérifier la réponse de **`GET /api/health`** — doit contenir `"chat": true`.
2. Si absent : le process Node n’a pas rechargé `server.js` → **`pm2 restart zombie`**.
3. Côté client : **Ctrl+F5** (vérifier `CACHE_BUST` dans `game.html`, actuellement `20260606j`).

---

## Checklist après push dev

1. `git push origin master`
2. Attendre cron (≤ 2 min) ou webhook instantané
3. Vérifier `~/logs/zombie-deploy.log`
4. Tester le jeu sur l'URL preview / prod
5. **Ctrl+F5** côté client (cache bust `game.html`)
