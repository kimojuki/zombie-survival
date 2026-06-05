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

**Workflow dev :** `git push origin master` → sous 2 min, le serveur sync + `pm2 restart zombie` **sans intervention**.

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
