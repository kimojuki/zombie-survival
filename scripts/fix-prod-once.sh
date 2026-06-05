#!/usr/bin/env bash
# Réparation unique prod — conflits git locaux + premier sync auto-deploy
# Usage (SSH Infomaniak) :
#   cd ~/sites/jeu.zombieOfficel.ch/zombie-survival   # ou chemin clients/…/sites/…
#   bash scripts/fix-prod-once.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"

echo "=== fix-prod-once ($APP_DIR) ==="

export GIT_TERMINAL_PROMPT=0
git fetch origin master
git reset --hard origin/master
git clean -fd --exclude=.env --exclude=database 2>/dev/null || true
chmod +x scripts/deploy-prod.sh scripts/git-watch-deploy.sh scripts/fix-prod-once.sh 2>/dev/null || true

bash scripts/deploy-prod.sh

echo ""
echo "Vérifiez : curl -s https://VOTRE-DOMAINE/api/health"
echo "Attendu : \"chat\":true,\"commit\":\"…\""
echo ""
echo "Cron (crontab -e) — adapter le chemin APP_DIR :"
echo "*/2 * * * * ZOMBIE_APP_DIR=$APP_DIR /bin/bash $APP_DIR/scripts/git-watch-deploy.sh >> \$HOME/logs/zombie-deploy-cron.log 2>&1"
