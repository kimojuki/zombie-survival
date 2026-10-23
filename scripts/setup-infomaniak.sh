#!/usr/bin/env bash
# Première installation sur Infomaniak Node managé (sans Docker)
# Usage : bash scripts/setup-infomaniak.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"

export PATH="$HOME/.local/bin:$HOME/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi

log() { echo "[setup-infomaniak] $*"; }

log "dir=$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  log "ERROR: node introuvable — activer Node.js dans le Manager Infomaniak ou nvm"
  exit 1
fi

NODE_VER="$(node -p "process.versions.node")"
log "node v$NODE_VER"
case "$(node -p "process.version.match(/^v(\\d+)/)[1]")" in
  18|19|20|21|22) ;;
  *) log "WARN: Node 20+ recommandé (engines package.json >=20)" ;;
esac
# Infomaniak : pas de g++ → il faut des prebuilds (Node 20.4 trop vieux pour better-sqlite3 / vite)
NODE_MINOR="$(node -p "const [a,b]=process.versions.node.split('.').map(Number); a===20?b:999")"
if [ "${NODE_MINOR}" -lt 19 ] 2>/dev/null; then
  log "WARN: Node $NODE_VER < 20.19 — sur Infomaniak préfère: nvm install 20 && nvm alias default 20"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "pm2 absent — installation globale…"
  npm install -g pm2
fi

if [ ! -f .env ]; then
  if [ -f .env.infomaniak.example ]; then
    cp .env.infomaniak.example .env
    log "Créé .env depuis .env.infomaniak.example — ÉDITER avant prod (JWT, DB, RCON)"
  else
    cp .env.example .env
    log "Créé .env depuis .env.example — ÉDITER avant prod"
  fi
else
  log ".env déjà présent — conservé"
fi

mkdir -p database/backups logs/server "$HOME/logs"

log "npm ci (production)"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

PM2_NAME="${ZOMBIE_PM2_NAME:-zombie}"
ECOSYSTEM="$APP_DIR/infra/ecosystem.config.cjs"

log "pm2 start ($PM2_NAME)"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$ECOSYSTEM"
else
  pm2 start "$ECOSYSTEM"
fi
pm2 save

PORT=3000
if [ -f .env ]; then
  _p=$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r" '"'" || true)
  [ -n "$_p" ] && PORT="$_p"
fi

sleep 2
if command -v curl >/dev/null 2>&1; then
  HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || true)
  if echo "$HEALTH" | grep -q '"chat"'; then
    log "health OK: $HEALTH"
  else
    log "WARN: health inattendu ($HEALTH) — vérifier .env DB et pm2 logs $PM2_NAME"
  fi
fi

log "=== setup terminé ==="
log "Suite : docs/INFOMANIAK_NODE.md (Apache .htaccess, MariaDB, cron deploy)"
log "Logs : pm2 logs $PM2_NAME"
log "Deploy manuel : bash scripts/deploy-prod.sh"
