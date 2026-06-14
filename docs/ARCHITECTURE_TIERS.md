# Architecture conteneurs — Zombie Survival

**Un conteneur par rôle sur une VM unique** (prod actuelle). Découpe du monolithe game : [DECOMPOSE_MONOLITH.md](./DECOMPOSE_MONOLITH.md).

Index : [VM_DEPLOY.md](./VM_DEPLOY.md) · [DOCKER_PROD_SIM.md](./DOCKER_PROD_SIM.md)

---

## Cible prod (1 VM)

```
                    Cloudflare (TLS)
                           │
                    cloudflared
                           │
┌──────────────────────────┴──────────────────────────┐
│  VM unique — Docker Compose                       │
│  nginx :443  →  game :3000  →  auth :3001         │
│                      └──────────┬──────────────     │
│                            mariadb :3306            │
│  bind mount ZS_DATA_DIR/mariadb, backups, logs    │
└─────────────────────────────────────────────────────┘
```

| Rôle | Conteneur | Données persistantes |
|------|-----------|----------------------|
| **Edge** | cloudflared (hôte) + nginx | — |
| **Game** | game | logs |
| **Auth** | auth | — |
| **DB** | mariadb | `ZS_DATA_DIR/mariadb` |

**Principe** : auth, game, nginx et MariaDB tournent en conteneurs séparés sur **la même VM** ; le code HTTP auth sort du monolithe `index.js`.

---

## Fichiers Docker

| Fichier | Usage | Contenu |
|---------|-------|---------|
| `docker-compose.yml` | **prod + dev sim** | nginx + game + auth + mariadb |
| `docker-compose.db.yml` | option | MariaDB seul |
| `docker-compose.app.yml` | option | nginx + game + auth (DB externe) |

---

## Option — 2 VM (non retenue pour l'instant)

Référence si un jour la charge ou la sécu impose de séparer db et app.

### 1. VM DB (en premier)

```bash
# Ubuntu, Docker, UFW
sudo ufw allow from APP_VM_PRIVATE_IP to any port 3306
sudo ufw allow OpenSSH
sudo ufw enable

git clone … /opt/zombie-survival
cd /opt/zombie-survival/infra/docker
cp .env.db.example .env
# éditer : mots de passe, ZS_DATA_DIR, DB_BIND=IP_PRIVEE_DB:3306

sudo mkdir -p /var/lib/zombie-survival/mariadb
./scripts/init-data-dirs.sh
docker compose -f docker-compose.db.yml up -d
```

### 2. VM App

```bash
cp .env.app.example .env
# DB_HOST=10.0.0.10  (IP privée VM db)
# mêmes DB_USER / DB_PASS que sur la VM db

docker compose -f docker-compose.app.yml up -d --build
cloudflared → http://127.0.0.1:443
```

### 3. Migration depuis mono-VM

1. `./scripts/backup-vm.sh` sur l'ancienne stack  
2. Restaurer sur VM db : `mysql < dump.sql`  
3. Lancer app avec `DB_HOST` pointant vers db  
4. `migrate:accounts-to-auth` si besoin  

---

## Dev local — simuler 2 VM sur 1 PC

```bat
cd infra\docker
copy .env.db.example .env
docker compose -f docker-compose.db.yml up -d

copy .env.app.example .env
docker compose -f docker-compose.app.yml up -d --build
```

`DB_HOST=mariadb` + réseau Docker partagé `zs-db-net`.

Pour le flux normal : `npm run docker:sim:up` (`docker-compose.yml` tout-en-un).

---

## Roadmap infra

| Étape | Statut | Quoi |
|-------|--------|------|
| **Conteneurs 1 VM** | **En cours** | nginx + game + auth + mariadb ; découpe monolithe |
| Split db 2 VM | option future | `docker-compose.db.yml` + `.app.yml` |
| VM auth dédiée | option future | auth isolé (compliance / charge) |
| Shard S02 | contenu + charge | 2ᵉ game + 2ᵉ `zombie_game_db` |
| Redis | chat cross-shard / >50 CCU | cache + pub/sub |

Priorité actuelle : stabiliser **1 VM + décomposition code**, pas le split multi-VM.
