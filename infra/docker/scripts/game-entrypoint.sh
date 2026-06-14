#!/bin/sh
set -e
echo "[game-entrypoint] waiting for MariaDB..."
node infra/docker/scripts/wait-mysql.mjs
echo "[game-entrypoint] starting game server..."
exec node apps/server/index.js
