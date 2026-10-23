#!/usr/bin/env bash
# Backup MariaDB (auth + game) — fichiers dans $ZS_DATA_DIR/backups/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.yml --env-file $ENV_FILE"
STAMP="$(date +%Y%m%d-%H%M%S)"

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

DATA="${ZS_DATA_DIR:-$DOCKER_DIR/data}"
if [[ "$DATA" != /* ]]; then
  DATA="$(cd "$DOCKER_DIR" && mkdir -p "$DATA" && cd "$DATA" && pwd)"
fi
BACKUP_DIR="$DATA/backups"
mkdir -p "$BACKUP_DIR"

OUT="$BACKUP_DIR/vm-docker-$STAMP.sql"
echo "[backup-vm] dump -> $OUT"

$COMPOSE exec -T mariadb mysqldump -u root -p"${MARIADB_ROOT_PASSWORD}" \
  --single-transaction --routines \
  --databases zombie_auth_db zombie_game_db > "$OUT"

gzip -f "$OUT"
echo "[backup-vm] OK ${OUT}.gz"

# Rétention : garder 14 derniers (optionnel)
ls -1t "$BACKUP_DIR"/vm-docker-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
