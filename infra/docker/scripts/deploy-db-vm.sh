#!/usr/bin/env bash
# Déploiement VM BDD — MariaDB seul.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.db.yml --env-file $ENV_FILE"

[[ -f "$ENV_FILE" ]] || { echo "ERROR: cp .env.db.example .env"; exit 1; }

bash "$SCRIPT_DIR/init-data-dirs.sh"

echo "=== deploy-db-vm start ==="
$COMPOSE up -d

for i in $(seq 1 20); do
  if $COMPOSE exec -T mariadb mariadb-admin ping -h 127.0.0.1 -u root -p"${MARIADB_ROOT_PASSWORD}" --silent 2>/dev/null; then
    echo "=== deploy-db-vm OK ==="
    exit 0
  fi
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
  sleep 2
done
echo "ERROR: mariadb not healthy"
exit 1
