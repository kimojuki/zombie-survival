#!/usr/bin/env bash
# Déploiement prod Infomaniak — git pull + pm2 restart
# Usage : ./scripts/deploy-prod.sh
# Variables optionnelles : ZOMBIE_APP_DIR, ZOMBIE_PM2_NAME, ZOMBIE_DEPLOY_BRANCH

set -euo pipefail

APP_DIR="${ZOMBIE_APP_DIR:-$HOME/sites/jeu.zombieOfficel.ch/zombie-survival}"
PM2_NAME="${ZOMBIE_PM2_NAME:-zombie}"
BRANCH="${ZOMBIE_DEPLOY_BRANCH:-master}"
LOG_DIR="${ZOMBIE_DEPLOY_LOG_DIR:-$HOME/logs}"
LOCK_FILE="${ZOMBIE_DEPLOY_LOCK:-/tmp/zombie-deploy.lock}"
LOG_FILE="$LOG_DIR/zombie-deploy.log"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

if [ ! -d "$APP_DIR/.git" ]; then
  log "ERROR: repo introuvable ($APP_DIR)"
  exit 1
fi

exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "SKIP: déploiement déjà en cours"
  exit 0
fi

cd "$APP_DIR"
log "=== deploy start (branch=$BRANCH, pm2=$PM2_NAME) ==="

git fetch origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "already up to date ($LOCAL)"
  exit 0
fi

log "pull $LOCAL -> $REMOTE"
git pull origin "$BRANCH"

if git diff "$LOCAL" "$REMOTE" --name-only 2>/dev/null | grep -qE '^(package\.json|package-lock\.json)$'; then
  log "npm install (dépendances modifiées)"
  if [ -f package-lock.json ]; then
    npm ci --omit=dev 2>&1 | tee -a "$LOG_FILE"
  else
    npm install --omit=dev 2>&1 | tee -a "$LOG_FILE"
  fi
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "ERROR: pm2 introuvable dans PATH"
  exit 1
fi

pm2 restart "$PM2_NAME"
log "pm2 restart $PM2_NAME OK"
log "=== deploy done ==="
