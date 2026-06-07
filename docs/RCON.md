# Console RCON Admin

Console d'administration serveur pour debug, tests et gestion en live.

Deux accès :
- **In-game** : terminal dans le navigateur (` ou F2)
- **HTTP API** : `POST /api/rcon` (scripts, CI, monitoring)

---

## Configuration (`.env`)

```env
# Mot de passe requis pour les non-admins listés
RCON_PASSWORD=change_me_strong_password

# Comptes toujours admin (sans mot de passe), séparés par des virgules
ADMIN_USERS=alice,bob

# Dev SQLite uniquement — true = tous les joueurs admin (déconseillé)
RCON_AUTO_ADMIN=false
```

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `RCON_PASSWORD` | Recommandé | Active RCON in-game + API. Sans elle, seuls `ADMIN_USERS` peuvent utiliser la console. En SQLite local, défaut `dev` si absent. |
| `ADMIN_USERS` | Optionnel | Usernames (login jeu) avec accès admin automatique. |
| `RCON_AUTO_ADMIN` | Optionnel | Uniquement actif si `RCON_AUTO_ADMIN=true` **et** `DB_CLIENT=sqlite`. Sinon, seuls `ADMIN_USERS` sont admin. |

**Sécurité prod :** utiliser un mot de passe fort, ne pas committer `.env`, limiter `ADMIN_USERS` aux ops/dev.

---

## In-game

1. Lancer le jeu avec un compte listé dans `ADMIN_USERS`
2. **Desktop** : **`` ` ``** ou **F2**
3. **Mobile** : Menu **☰** (haut droite) → **Console dev**
4. Taper `help`, `day`, `status`, etc.

La console bloque joystick et boutons jeu tant qu'elle est ouverte. Sur mobile : clavier tactile + bouton **⏎** pour envoyer.

**Dev local** : `ADMIN_USERS=Bruno` + `RCON_AUTO_ADMIN=false` → seul Bruno est admin.

**Auth admin côté client** :
- Login/register renvoient `isAdmin` → `localStorage.zombie_is_admin`
- `GET /api/auth/me` (Bearer JWT) — vérifie le statut au chargement de `game.html`
- Menu mobile ☰ : bouton « Console dev » si admin (`ZS.Rcon.refreshMenu`)

### Événements Socket.io (client)

| Event serveur → client | Effet |
|------------------------|-------|
| `world-time` | Sync heure après `day`/`night`/`time` |
| `server-flags` | Sync drapeaux (`autoday`, `zombies`…) |
| `admin-tp` | Téléportation forcée |
| `server-announce` | Bannière message global (`say`) |

| Event client → serveur | Effet |
|------------------------|-------|
| `rcon-auth` | Authentification mot de passe |
| `rcon` | Exécution commande → callback `{ ok, lines[] }` |

---

## API HTTP

```bash
curl -X POST http://localhost:3000/api/rcon \
  -H "Content-Type: application/json" \
  -H "X-RCON-Password: votre_mot_de_passe" \
  -d '{"cmd":"status"}'
```

Réponse :

```json
{
  "ok": true,
  "lines": [
    "Joueurs: 2 | Zombies: 70 | Items: 45 | Structures: 3",
    "Temps: 50.0% (jour) | Uptime: 3600s",
    "Flags: autoday=true zombies=true spawn=true loot=true"
  ]
}
```

Erreurs : `403` (mauvais mot de passe), `503` (RCON non configuré ou serveur en démarrage).

---

## Commandes

### Aide & état

| Commande | Description |
|----------|-------------|
| `help` | Liste toutes les commandes |
| `help tp` | Filtre par mot-clé |
| `status` | Stats serveur (joueurs, zombies, uptime, flags) |
| `players` | Joueurs en ligne + position + HP + kills |
| `whoami` | Infos session admin courante |
| `flags` | Tous les drapeaux serveur |

### Temps / jour-nuit

| Commande | Description |
|----------|-------------|
| `time` | Affiche l'heure (0–1) |
| `time 0.42` | Fixe l'heure (0=minuit, 0.25=aube, 0.5=midi, 0.75=crépuscule) |
| `day` | Midi (0.5) |
| `night` | Minuit (0.0) |
| `dawn` | Aube (0.25) |
| `dusk` | Crépuscule (0.75) |
| `autoday on` / `autoday off` | Cycle automatique (~10 min / cycle) |

### Zombies

| Commande | Description |
|----------|-------------|
| `zombies on` / `zombies off` | Active/désactive l'IA (freeze si off) |
| `nospawn on` / `nospawn off` | Bloque/active le respawn après un kill |
| `clearzombies` | Supprime tous les zombies |
| `zombieseed` | Complète la population jusqu'à 70 (prefabs par secteur) |
| `zombieseed reset` | Vide puis repeuple (horde spawn + zones) |
| `spawnzombies 10` | Ajoute N zombies aléatoires (max 200, prefabs pondérés) |
| `zombieprefabs` | Liste les archétypes (`walker`, `runner`, `brute`) |
| `spawnzombie zombie_runner 3` | Spawn 3 runners près de vous |
| `spawnzombie zombie_brute 1 12 -8` | Spawn 1 brute à la position x z |
| `zombielist` | Liste les zombies actifs (id, prefab, HP, pos) |
| `killzombie nearest` | Supprime le zombie le plus proche |
| `killzombie 42` | Supprime le zombie #42 |

### Joueurs

| Commande | Description |
|----------|-------------|
| `tp 14 -18` | TP soi-même |
| `tp alice 0 -5` | TP un joueur (nom partiel OK) |
| `bring bob` | TP un joueur vers vous |
| `goto alice` | TP vers un joueur |
| `heal` / `heal bob` | Soigne à 100 HP |
| `kill bob` | Tue un joueur |
| `god on` / `god off` | Invincibilité |
| `give alice food_conserves 5` | Donne un objet (types = `ZS.ITEMS` dans `items.js`) |
| `kick bob` | Déconnecte un joueur |

### Monde & serveur

| Commande | Description |
|----------|-------------|
| `say Message global` | Annonce à tous les joueurs |
| `save` | Sauvegarde forcée de tous les joueurs connectés |
| `loot status` | État du loot bâtiments |
| `loot regen` | Régénère le loot monde |
| `loot clear` | Supprime le loot généré |

### Objets monde (prefabs + items posés)

Objets visibles par tous les joueurs, synchronisés via `decorItems` au `game-init` et events Socket.io `decor-item-spawn` / `decor-item-remove`. Tout objet posé durablement passe par un prefab (`kind=prefab`) ou un item de jeu posé comme décor (`kind=item`).

| Commande | Description |
|----------|-------------|
| `decorprefabs` | Liste les prefabs (`spawn_campfire`, `spawn_supply_crate`, `storage_chest`, `building_survivor_shack`, …) |
| `decoritems [filtre]` | Liste les items de jeu posables comme objet décor |
| `decoradd prefab spawn_border_log [x z] [rotY] [scale]` | Pose un rondin de lisière (scale ≈ longueur / 0.42 m) |
| `decoradd prefab storage_chest [here\|x z] [rotY] [scale]` | Pose un coffre prefab interactif : `E` / bouton tactile pour déposer ou reprendre des items |
| `decoradd prefab building_survivor_shack [here\|x z] [rotY] [scale]` | Cabane — **sans x/z** = devant vous (`0 1` = rotY 0, scale 1 devant vous) |
| `decoradd prefab <id> [here\|x z] [rotY] [scale]` | Prefab décor/bâtiment — mots-clés position : `here`, `.`, `@`, `devant`, `ici` |
| `decoradd prefab wreck_sedan [x z] [rotY] [scale] [variant] [tilt] [wheels] [sink]` | Épave — variants : `rust`, `olive`, `navy`, `beige`, `burnt` |
| `decorseed wrecks` | Ajoute les épaves seed si absentes (sans redémarrer le serveur) |
| `decorseed wrecks reset` | Supprime toutes les épaves seed et les replace aux positions du gabarit |
| `decorseed trees` | Ajoute les arbres prefab forêt si absents (~63) |
| `decorseed trees reset` | Supprime les arbres seed et les replace |
| `decoradd <type> [x z] [rotY] [scale]` | Pose un item de jeu comme prop (`food_conserves`, `tool_hachette`, …) — modèle 3D `getItemModel()` |
| `decorlist` | Liste les décors actifs (id, kind, position) |
| `decorremove <id>` | Supprime un décor par id |

**Prefabs** : meshes procéduraux avec textures PNG dans `apps/client/public/textures/camp/` (`wood_planks_light.png`, `wood_planks.png`, `olive_canvas.png`). Module client : `camp_textures.js` → `ZS.CampTextures.materials()`. Le premier bâtiment est `building_survivor_shack`, avec collisions via `decor_colliders.js` et porte interactive (`E` / bouton tactile), synchronisée par Socket.io. Le prefab `storage_chest` ouvre son couvercle, affiche une grille de 27 slots et stocke ses piles dans `decorItems.storage` côté serveur.

**Seed spawn** : décors camp + ~60 rondins (`spawn_border_log`) + **8 épaves** le long de `town_main` / `city_highway` (`packages/shared/src/road-wrecks.mjs`).

**Épaves** : prefabs `wreck_sedan` / `wreck_pickup` — textures procédurales (`vehicle_textures.js`), collision décor, sync multijoueur comme les autres prefabs.

Tests automatisés : `node tools/rcon-test.mjs` (inclut `decoradd`, `decorprefabs`, etc.).

### Client local (pas envoyé au serveur)

| Commande | Description |
|----------|-------------|
| `clear` | Efface l'écran console |
| `close` / `exit` | Ferme la console |

---

## Drapeaux serveur (`serverFlags`)

| Flag | Défaut | Effet |
|------|--------|-------|
| `autoDay` | `true` | Avance `_worldTime` dans le tick zombie |
| `zombieAI` | `true` | IA chase/wander ; si `false`, zombies figés |
| `zombieSpawn` | `true` | Respawn 4s après un kill |
| `lootEnabled` | `true` | Génération loot au chargement des bâtiments |

Modifiables via commandes RCON ; broadcast `server-flags` aux clients.

---

## Fichiers source

| Fichier | Rôle |
|---------|------|
| `apps/server/src/rcon.js` | Registre et exécution des commandes |
| `apps/server/index.js` | Auth admin, flags, handlers socket `rcon` / `rcon-auth`, seed décor spawn |
| `apps/client/public/js/rcon.js` | UI terminal in-game |
| `apps/client/public/js/network.js` | Handlers `world-time`, `admin-tp`, `server-announce`, sync `decorItems` |
| `apps/client/public/js/spawn_clearing.js` | Prefabs décor camp (`spawnDecorPrefab`, `DECOR_PREFABS`) |
| `apps/client/public/js/camp_textures.js` | Textures bois/toile partagées pour prefabs décor |

---

## Tests manuels (checklist PR)

- [ ] `auth` avec bon/mauvais mot de passe
- [ ] `status` et `players` avec 1+ joueur connecté
- [ ] `day` / `night` — visuel jour/nuit change pour tous
- [ ] `autoday off` puis `time 0.75` — heure reste fixe
- [ ] `zombies off` — zombies ne bougent plus
- [ ] `nospawn on` — kill zombie ne respawn pas
- [ ] `tp` — téléportation visible
- [ ] `say` — bannière affichée
- [ ] `decorprefabs` — liste les prefabs, dont `building_survivor_shack`
- [ ] `decoritems eau` — liste les items posables filtrés
- [ ] `decoradd prefab spawn_supply_crate 2 -6` — caisse texturée visible pour tous
- [ ] `decoradd prefab building_survivor_shack 16 -12 0.35 1` — cabane visible/collisionnée
- [ ] `decorlist` / `decorremove <id>` — gestion décor
- [ ] API `curl` avec `X-RCON-Password`
