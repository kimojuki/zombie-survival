CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pos_x FLOAT DEFAULT 0.0,
    pos_y FLOAT DEFAULT 1.0,
    pos_z FLOAT DEFAULT 0.0,
    rot_y FLOAT DEFAULT 0.0,
    health INT DEFAULT 100,
    kills INT DEFAULT 0,
    inventory JSON,
    last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Constructions / coffres posés par les joueurs (JSON complet par decorId)
CREATE TABLE IF NOT EXISTS world_decor (
    id VARCHAR(96) PRIMARY KEY,
    payload JSON NOT NULL,
    created_by VARCHAR(64) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Fallback legacy place-structure (struct_* côté client)
CREATE TABLE IF NOT EXISTS world_structures (
    id INT PRIMARY KEY,
    payload JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Compteurs sérialisés (decorSeq, doorLockSeq, structureIdCounter, itemIdCounter)
CREATE TABLE IF NOT EXISTS world_meta (
    `key` VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Loots / drops / butins de mort au sol
CREATE TABLE IF NOT EXISTS world_items (
    id INT PRIMARY KEY,
    payload JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Zombies (positions / état autoritaire)
CREATE TABLE IF NOT EXISTS world_zombies (
    id INT PRIMARY KEY,
    payload JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Joueurs déconnectés (corps endormi + inventaire)
CREATE TABLE IF NOT EXISTS world_sleepers (
    player_id INT PRIMARY KEY,
    payload JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
