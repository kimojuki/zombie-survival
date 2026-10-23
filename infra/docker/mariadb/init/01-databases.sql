-- Deux bases séparées (auth + game) — même instance MariaDB, comme Infomaniak cloud
CREATE DATABASE IF NOT EXISTS zombie_auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS zombie_game_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- L'utilisateur est créé par MARIADB_USER dans docker-compose ; droits sur les deux bases
GRANT ALL PRIVILEGES ON zombie_auth_db.* TO 'zs_app'@'%';
GRANT ALL PRIVILEGES ON zombie_game_db.* TO 'zs_app'@'%';
FLUSH PRIVILEGES;
