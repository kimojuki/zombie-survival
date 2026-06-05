#!/usr/bin/env bash
# Watcher cron — vérifie origin/master et lance deploy-prod.sh si nouveau commit
# Crontab exemple (toutes les 2 min) :
# */2 * * * * /bin/bash $HOME/sites/jeu.zombieOfficel.ch/zombie-survival/scripts/git-watch-deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/deploy-prod.sh"
