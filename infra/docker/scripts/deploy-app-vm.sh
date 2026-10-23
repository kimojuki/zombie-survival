#!/usr/bin/env bash
# Déploiement VM App — nginx + game + auth (DB distante via DB_HOST).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.app.yml --env-file $ENV_FILE"

cd "$ROOT"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: cp .env.app.example .env"; exit 1; }

bash "$SCRIPT_DIR/init-data-dirs.sh"

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${DB_HOST:?DB_HOST requis dans .env}"

echo "=== deploy-app-vm start (DB_HOST=$DB_HOST) ==="

bash "$SCRIPT_DIR/backup-vm.sh" 2>/dev/null || echo "WARN: backup skip (db peut être distant)"

echo "=== edge (site public) ==="
node "$ROOT/tools/docker/sync-edge-www.mjs"
docker compose -f "$DOCKER_DIR/docker-compose.edge.yml" --env-file "$ENV_FILE" up -d

$COMPOSE build
$COMPOSE up -d

for i in $(seq 1 30); do
  if curl -sf -H 'Host: survival.badom.ch' http://127.0.0.1:443/api/health | grep -q '"chat":true'; then
    echo "=== deploy-app-vm OK ==="
    exit 0
  fi
  sleep 3
done
echo "ERROR: health timeout"
$COMPOSE ps
exit 1
