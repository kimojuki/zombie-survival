# Déploiement — VM Ubuntu + Docker

**Cible prod** : une VM dédiée (4 vCPU / 12 Go RAM), **Ubuntu LTS**, tout le stack en **Docker Compose** — pas de MariaDB managé, pas de pm2 Node sur l'hôte.

Le même `infra/docker/docker-compose.yml` tourne :
- sur ton **PC dev** (simulation VM) ;
- sur la **VM prod** (déploiement réel).

Index : [DOCKER_PROD_SIM.md](./DOCKER_PROD_SIM.md) (dev local) · [RELEASE_PROCESS.md](./RELEASE_PROCESS.md)

---

## Architecture VM

```
Internet
  │  HTTPS (Cloudflare edge — TLS public)
  ▼
cloudflared (systemd sur la VM, tunnel sortant)
  │  http://127.0.0.1:443
  ▼
┌─────────────────────────────────────────────────────────┐
│  VM Ubuntu 4 CPU / 12 Go                                │
│  Docker Compose (infra/docker/)                         │
│                                                         │
│  nginx    :443, :4000  ← seule entrée HTTP locale       │
│     └─► game :3000      (interne)                       │
│            └─► auth :3001 (interne, jamais public)       │
│            └─► mariadb    (interne, volume persistant)  │
│                 ├─ zombie_auth_db                       │
│                 └─ zombie_game_db                       │
└─────────────────────────────────────────────────────────┘
```

| Composant | Où | Exposé Internet ? |
|-----------|-----|-------------------|
| Cloudflare | Edge | Oui (HTTPS) |
| cloudflared | Hôte VM (systemd) | Non (connexion sortante) |
| nginx | Conteneur | Non directement (localhost only si tunnel) |
| game / auth / MariaDB | Conteneurs | **Non** |

**Pas besoin d'ouvrir 443/4000 sur le firewall** si tu utilises **Cloudflare Tunnel** (cloudflared sort vers Cloudflare).

---

## Prérequis VM

| Ressource | Spec |
|-----------|------|
| OS | Ubuntu **24.04 LTS** (ou 26.04 quand dispo) |
| CPU / RAM | 4 vCPU, 12 Go |
| Disque | ≥ 40 Go SSD (monde + BDD + logs) |
| Accès | SSH clé (pas mot de passe root) |

---

## Installation initiale (une fois)

### 1. OS + Docker

```bash
# Mises à jour
sudo apt update && sudo apt upgrade -y

# Docker (official)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# reconnecter SSH

# Git
sudo apt install -y git ufw fail2ban
```

### 2. Pare-feu (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
# Pas de 443/4000 si cloudflared tunnel uniquement :
sudo ufw enable
sudo ufw status
```

Option : restreindre SSH à ton IP fixe :
```bash
sudo ufw allow from TON.IP.FIXE to any port 22
sudo ufw delete allow OpenSSH
```

### 3. fail2ban (SSH)

```bash
sudo systemctl enable --now fail2ban
```

### 4. Cloner le projet

```bash
sudo mkdir -p /opt/zombie-survival
sudo chown $USER:$USER /opt/zombie-survival
git clone git@github.com:VOTRE_ORG/zombie-survival.git /opt/zombie-survival
cd /opt/zombie-survival
git checkout dev   # ou master en prod stable
```

### 5. Config prod

```bash
cp infra/docker/.env.example infra/docker/.env
nano infra/docker/.env
```

**À changer obligatoirement** :
- `MARIADB_ROOT_PASSWORD`, `DB_PASS` — mots de passe forts
- `JWT_SECRET`, `AUTH_JWT_SECRET` — `openssl rand -hex 32`
- `RCON_PASSWORD`, `OWNER_USERS`
- `ZS_TEAM_URL=https://survival.badom.ch`

### 6. Premier déploiement

```bash
./infra/docker/scripts/deploy-vm.sh
```

Migration comptes (si import depuis ancienne DB) :
```bash
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env \
  exec game node tools/migrate-game-accounts-to-auth.mjs --apply
```

### 7. cloudflared (systemd)

```bash
# Installer cloudflared — voir https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
sudo cloudflared service install
# Config : /etc/cloudflared/config.yml
```

```yaml
tunnel: zombie-prod
credentials-file: /etc/cloudflared/zombie-prod.json

ingress:
  - hostname: survival.badom.ch
    service: http://127.0.0.1:443
    originRequest:
      httpHostHeader: survival.badom.ch
  - service: http_status:404
```

```bash
sudo systemctl enable --now cloudflared
```

---

## Persistance des données (bind mount hôte)

**Choix : bind mount** (pas volume Docker opaque) — progression joueurs + monde dans MariaDB sur disque hôte.

| Chemin VM (`ZS_DATA_DIR=/var/lib/zombie-survival`) | Contenu |
|----------------------------------------------------|---------|
| `mariadb/` | Fichiers InnoDB — **sacré** |
| `backups/` | Dumps SQL (`backup-vm.sh`) |
| `logs/` | Logs game |

```bash
# VM prod — une fois
sudo mkdir -p /var/lib/zombie-survival/{mariadb,backups,logs}
sudo chown -R $USER:$USER /var/lib/zombie-survival
echo 'ZS_DATA_DIR=/var/lib/zombie-survival' >> infra/docker/.env
```

### Opérations safe vs dangereuses

| Commande | Données |
|----------|---------|
| `docker compose up -d --build` | ✅ conservées |
| `docker compose down` | ✅ conservées (bind mount) |
| `deploy-vm.sh` | ✅ backup SQL avant rebuild |
| Crash conteneur / reboot VM | ✅ `restart: unless-stopped` + données sur disque |
| `docker compose down -v` | ⛔ **interdit** (legacy named volumes) |
| `rm -rf $ZS_DATA_DIR/mariadb` | ⛔ perte totale |

Le game flush joueurs + monde sur **SIGTERM** (`stop_grace_period: 60s`).

### Backup cron (VM)

```cron
0 4 * * * /opt/zombie-survival/infra/docker/scripts/backup-vm.sh >> /var/log/zombie-backup.log 2>&1
```

Copier `backups/*.sql.gz` offsite (rsync, S3, snapshot disque VM).

### Migration ancien volume Docker nommé

Si tu avais `mariadb_data` avant le bind mount :

```bash
./infra/docker/scripts/migrate-volume-to-bind.sh zs-vm_mariadb_data
```

---

## Mises à jour (routine)

```bash
cd /opt/zombie-survival
git pull origin dev
./infra/docker/scripts/deploy-vm.sh
```

Le script :
1. backup MariaDB (`mysqldump` via conteneur)
2. `docker compose build` + `up -d`
3. smoke `/api/health` via nginx local

---

## Commandes utiles

```bash
# État
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env ps

# Logs
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env logs -f game

# Backup manuel
./infra/docker/scripts/backup-vm.sh

# Arrêt propre
docker compose -f infra/docker/docker-compose.yml --env-file infra/docker/.env down
```

---

## Sécurité — checklist équipe

| Item | Statut |
|------|--------|
| SSH clé uniquement (`PasswordAuthentication no`) | ☐ |
| UFW actif, pas de ports jeu ouverts si tunnel CF | ☐ |
| fail2ban SSH | ☐ |
| `infra/docker/.env` hors Git, chmod 600 | ☐ |
| Secrets JWT uniques prod | ☐ |
| MariaDB non exposée (réseau Docker internal) | ☐ |
| auth :3001 non publié sur l'hôte | ☐ |
| Mises à jour auto sécurité (`unattended-upgrades`) | ☐ |
| Backups BDD réguliers (cron + offsite) | ☐ |

---

## Dev local = même stack

Sur Windows (Docker Desktop) :

```bat
copy infra\docker\.env.example infra\docker\.env
npm run docker:sim:up
cloudflared tunnel run zombie-dev
```

→ [DOCKER_PROD_SIM.md](./DOCKER_PROD_SIM.md)

---

## Ancien mode Infomaniak / pm2

`infra/ecosystem.config.cjs` et `scripts/deploy-prod.sh` (pm2) restent pour la **preview legacy** le temps de la migration. **Nouvelle prod = VM + Docker uniquement.**

---

## Évolution (multi-shard)

Même VM ou VM supplémentaires : ajouter un service `game-2` + frontend nginx `:4001`. Auth + MariaDB auth restent centralisés ou répliqués selon charge.
