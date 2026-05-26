content = """# 🧟 Guide de Développement : Zombie FPS Open World (Mobile-Only)

Ce document détaille les instructions techniques pour créer un jeu de zombie 3D multijoueur spécifiquement optimisé pour les navigateurs mobiles (Android & iOS).

Ce sont les instruction pour le debut de la création du jeu. Il est important de noté que d'autre feature seront dans un seconde temps.
---

## 🛠️ 1. Architecture Technique (Mobile Web)

L'objectif est d'avoir un jeu fluide sans installation, accessible via une simple URL.

* **Moteur 3D :** [Three.js](https://threejs.org/) (Standard pour la 3D sur navigateur).
* **Contrôles :** `nipplejs` ou `Phaser-style virtual joysticks` pour le tactile.
* **Serveur :** **Node.js** avec **Socket.io** (Indispensable pour le multijoueur).
* **Base de Données :** **MariaDB** (Stockage robuste de la progression).

---

##  graphisme
Tu va t'occuper de faire toute les assets. Les personnage et zombie sont en format carré comme minecraft mais l'univers est normal, avec des courbe, etc.. pas un monde carré.

## 🗄️ 3. Configuration MariaDB


Table optimisée pour la 3D à la première personne. On enregistre la position XYZ et la rotation Y (le regard horizontal).

```sql
CREATE DATABASE zombie_mobile_db;
USE zombie_mobile_db;

CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pos_x FLOAT DEFAULT 0.0,
    pos_y FLOAT DEFAULT 1.0, -- Altitude de départ
    pos_z FLOAT DEFAULT 0.0,
    rot_y FLOAT DEFAULT 0.0, -- Angle de vue (Look)
    health INT DEFAULT 100,
    inventory JSON,          -- Items, munitions, etc.
    last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

