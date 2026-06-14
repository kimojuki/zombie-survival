#!/usr/bin/env bash
# Déploiement VM — backup puis rebuild (données bind mount conservées).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$DOCKER_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"
COMPOSE="docker compose -f $DOCKER_DIR/docker-compose.yml --env-file $ENV_FILE"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE manquant — cp infra/docker/.env.example infra/docker/.env"
  exit 1
fi

bash "$SCRIPT_DIR/init-data-dirs.sh"

echo "=== edge (site public — reste up pendant rebuild) ==="
node "$ROOT/tools/docker/sync-edge-www.mjs"
docker compose -f "$DOCKER_DIR/docker-compose.edge.yml" --env-file "$ENV_FILE" up -d

echo "=== deploy-vm start ==="

bash "$SCRIPT_DIR/backup-vm.sh" || {
  echo "WARN: backup failed — Ctrl+C pour annuler"
  sleep 5
}

$COMPOSE build
$COMPOSE up -d

echo "=== migration comptes game → auth ==="
$COMPOSE exec -T game node tools/migrate-game-accounts-to-auth.mjs --apply || echo "WARN: migrate accounts failed"

echo "=== attente health game ==="
for i in $(seq 1 30); do
  if curl -sf -H 'Host: survival.badom.ch' http://127.0.0.1:443/api/health | grep -q '"chat":true'; then
    echo "=== deploy-vm OK (health) — données: voir ZS_DATA_DIR ==="
    exit 0
  fi
  sleep 3
done

echo "ERROR: health check timeout"
$COMPOSE ps
exit 1
