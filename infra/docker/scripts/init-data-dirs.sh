#!/usr/bin/env bash
# Crée les dossiers de données persistantes (bind mount hôte).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$DOCKER_DIR/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$DOCKER_DIR/.env"
  set +a
fi

DATA="${ZS_DATA_DIR:-$DOCKER_DIR/data}"
if [[ "$DATA" != /* ]]; then
  DATA="$(cd "$DOCKER_DIR" && cd "$DATA" 2>/dev/null && pwd || echo "$DOCKER_DIR/$DATA")"
fi

mkdir -p "$DATA/mariadb" "$DATA/backups" "$DATA/logs"
echo "[init-data-dirs] OK $DATA"
ls -la "$DATA"
