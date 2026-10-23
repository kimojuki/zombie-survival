#!/usr/bin/env bash
# Migration one-shot : volume Docker nommé → bind mount hôte (si ancien stack).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"

# shellcheck disable=SC1090
set -a
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
set +a

DATA="${ZS_DATA_DIR:-$DOCKER_DIR/data}"
if [[ "$DATA" != /* ]]; then
  DATA="$(cd "$DOCKER_DIR" && mkdir -p "$DATA" && cd "$DATA" && pwd)"
fi

VOL="${1:-zs-vm_mariadb_data}"
if ! docker volume inspect "$VOL" >/dev/null 2>&1; then
  echo "[migrate-volume] volume '$VOL' introuvable — rien à migrer"
  exit 0
fi

if [[ -n "$(ls -A "$DATA/mariadb" 2>/dev/null)" ]]; then
  echo "ERROR: $DATA/mariadb non vide — migration manuelle requise"
  exit 1
fi

echo "[migrate-volume] $VOL -> $DATA/mariadb"
docker run --rm \
  -v "$VOL:/from:ro" \
  -v "$DATA/mariadb:/to" \
  alpine sh -c 'cp -a /from/. /to/ && chown -R 999:999 /to'
echo "[migrate-volume] OK — redémarrer compose"
