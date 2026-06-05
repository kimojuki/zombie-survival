# Déploiement production (Infomaniak)

URL preview actuelle : `https://3k51myccypp.preview.infomaniak.website`  
Chemin serveur : `~/sites/jeu.zombieOfficel.ch/zombie-survival`

Commande manuelle habituelle :

```bash
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival && git pull && pm2 restart zombie
```

---

## Option A — Cron (recommandé, simple)

Vérifie Git toutes les 2 minutes et redémarre **seulement** s'il y a un nouveau commit sur `master`.

> **Important :** le cron est une config **une seule fois en SSH** sur le serveur Infomaniak.  
> Un `git push` depuis votre PC **ne configure pas** le cron automatiquement.  
> Les scripts `scripts/deploy-prod.sh` doivent **exister sur le serveur** (après au moins un `git pull` manuel).

### 1. Premier déploiement manuel (obligatoire une fois)

```bash
ssh votre-user@infomaniak
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival
git pull origin master
chmod +x scripts/deploy-prod.sh scripts/git-watch-deploy.sh
mkdir -p ~/logs
bash scripts/deploy-prod.sh
pm2 restart zombie
```

Vérifier : `curl -s https://3k51myccypp.preview.infomaniak.website/api/health`  
→ doit contenir `"chat": true` et `"commit": "36b2a1e"` (ou plus récent).

### 2. Rendre les scripts exécutables (si pas déjà fait)

```bash
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival
chmod +x scripts/deploy-prod.sh scripts/git-watch-deploy.sh
mkdir -p ~/logs
```

### 3. Tester le script à la main

```bash
bash scripts/deploy-prod.sh
tail -20 ~/logs/zombie-deploy.log
```

### 4. Crontab

```bash
crontab -e
```

Ajouter (adapter le chemin `$HOME` si besoin) :

```cron
*/2 * * * * /bin/bash $HOME/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/git-watch-deploy.sh >> $HOME/logs/zombie-deploy-cron.log 2>&1
```

**Workflow dev :** `git push origin master` → sous 2 min max, le serveur pull + `pm2 restart zombie`.

### 5. Vérifier que le cron tourne

```bash
crontab -l
tail -30 ~/logs/zombie-deploy-cron.log
tail -30 ~/logs/zombie-deploy.log
```

Si `zombie-deploy-cron.log` n'existe pas ou est vide → le cron n'est **pas** installé ou le chemin est faux.

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
cd ~/sites/jeu.zombieOfficel.ch/zombie-survival
git status
git reset --hard origin/master   # ⚠️ écrase les modifs locales serveur
bash scripts/deploy-prod.sh
```

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
