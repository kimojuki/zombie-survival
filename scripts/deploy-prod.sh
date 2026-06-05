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

# Cron = PATH minimal : charger nvm / pm2 / node
export PATH="$HOME/.local/bin:$HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
for _node_bin in "$HOME"/.nvm/versions/node/*/bin; do
  [ -d "$_node_bin" ] && PATH="$_node_bin:$PATH"
done
export PATH

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
log "=== deploy start (branch=$BRANCH, pm2=$PM2_NAME, dir=$APP_DIR) ==="

if ! git fetch origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
  log "ERROR: git fetch failed — vérifiez accès GitHub (deploy key / token)"
  exit 1
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
log "local=$LOCAL remote=$REMOTE"

if [ "$LOCAL" = "$REMOTE" ]; then
  log "already up to date ($LOCAL)"
  exit 0
fi

log "pull $LOCAL -> $REMOTE"
git pull origin "$BRANCH" 2>&1 | tee -a "$LOG_FILE"

if git diff "$LOCAL" "$REMOTE" --name-only 2>/dev/null | grep -qE '^(package\.json|package-lock\.json)$'; then
  log "npm install (dépendances modifiées)"
  if [ -f package-lock.json ]; then
    npm ci --omit=dev 2>&1 | tee -a "$LOG_FILE"
  else
    npm install --omit=dev 2>&1 | tee -a "$LOG_FILE"
  fi
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "ERROR: pm2 introuvable dans PATH ($PATH)"
  exit 1
fi

pm2 restart "$PM2_NAME" 2>&1 | tee -a "$LOG_FILE"
NEW=$(git rev-parse --short HEAD)
log "pm2 restart $PM2_NAME OK — commit $NEW"
log "=== deploy done ==="
