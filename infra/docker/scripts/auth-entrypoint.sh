#!/bin/sh
set -e
echo "[auth-entrypoint] waiting for MariaDB..."
node infra/docker/scripts/wait-mysql.mjs
echo "[auth-entrypoint] starting auth server..."
exec node apps/auth-server/index.js
