#!/usr/bin/env bash
# Déploiement prod Infomaniak — fetch + reset hard origin/master + pm2 restart
# Le serveur prod ne doit PAS garder de modifs locales sur les fichiers suivis.
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

export GIT_TERMINAL_PROMPT=0

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

_is_dirty() {
  ! git diff --quiet 2>/dev/null || return 0
  ! git diff --cached --quiet 2>/dev/null || return 0
  return 1
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
DIRTY=false
if _is_dirty; then DIRTY=true; fi

log "local=$LOCAL remote=$REMOTE dirty=$DIRTY"

if [ "$LOCAL" = "$REMOTE" ] && [ "$DIRTY" = false ]; then
  log "already up to date ($LOCAL)"
  exit 0
fi

if [ "$DIRTY" = true ]; then
  log "WARN: modifications locales sur le serveur — écrasées (reset --hard)"
  git status -s 2>&1 | tee -a "$LOG_FILE" || true
fi

if [ "$LOCAL" != "$REMOTE" ]; then
  log "sync $LOCAL -> $REMOTE"
else
  log "reset dirty tree at $LOCAL"
fi

PREV="$LOCAL"
git reset --hard "origin/$BRANCH" 2>&1 | tee -a "$LOG_FILE"
# Ne jamais supprimer .env ni database/ (untracked, hors Git)
git clean -fd --exclude=.env --exclude=database 2>/dev/null || true

if git diff "$PREV" "$REMOTE" --name-only 2>/dev/null | grep -qE '^(package\.json|package-lock\.json)$'; then
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

if command -v curl >/dev/null 2>&1; then
  _health_port=3000
  if [ -f .env ]; then
    _p=$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r" '"'" || true)
    [ -n "$_p" ] && _health_port="$_p"
  fi
  sleep 2
  HEALTH=$(curl -sf "http://127.0.0.1:${_health_port}/api/health" 2>/dev/null || true)
  if echo "$HEALTH" | grep -q '"chat":true'; then
    log "health OK ($HEALTH)"
  else
    log "WARN: health sans chat:true ($HEALTH)"
  fi
fi

log "=== deploy done ==="
