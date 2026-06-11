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

# Propriétaires (rôle owner — non rétrogradables via CMS)
OWNER_USERS=alice,bob
# Alias rétrocompat (= fusionné avec OWNER_USERS)
ADMIN_USERS=alice,bob

# Dev SQLite uniquement — true = tous les joueurs admin (déconseillé)
RCON_AUTO_ADMIN=false
```

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `RCON_PASSWORD` | Recommandé | Active RCON in-game + API. Sans elle, seuls `ADMIN_USERS` peuvent utiliser la console. En SQLite local, défaut `dev` si absent. |
| `OWNER_USERS` | Optionnel | Propriétaires du serveur (rôle `owner`, toutes permissions). |
| `ADMIN_USERS` | Optionnel | Alias rétrocompat — même effet que `OWNER_USERS`. |
| `RCON_AUTO_ADMIN` | Optionnel | Uniquement actif si `RCON_AUTO_ADMIN=true` **et** `DB_CLIENT=sqlite`. Sinon, seuls les propriétaires / rôles DB comptent. |

**Sécurité prod :** utiliser un mot de passe fort, ne pas committer `.env`, limiter `OWNER_USERS` aux ops/dev.

---

## Rôles & permissions (CMS F8)

Rôles persistés en base (`player_roles`) + propriétaires `.env` :

| Rôle | Usage typique |
|------|----------------|
| `owner` | Propriétaire — tout (via `.env` ou attribution) |
| `super_admin` | Co-admin — tout sauf nommer un autre propriétaire |
| `admin` | CMS standard (décor, joueurs, calibrages, RCON) |
| `moderator` | Joueurs connectés + kick/tp via RCON |
| `builder` | Édition décor live uniquement |
| `tester` | Calibrages + scénario intro |
| `player` | Défaut — pas d'accès hub |

**API** (JWT Bearer) :
- `GET /api/admin/roles` — catalogue + attributions (`players.roles`)
- `PUT /api/admin/roles/:username` — `{ "role": "admin" }`
- `DELETE /api/admin/roles/:username` — repasse en joueur standard
- `GET /api/admin/roles/me` — rôle courant + permissions

**In-game** : F8 → **Rôles & permissions** (si `players.roles`). Mise à jour live via socket `admin-role-update`.

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
| `autoday on` / `autoday off` | Cycle automatique (~30 min / cycle : 15 min jour + 15 min nuit) |

### Zombies

| Commande | Description |
|----------|-------------|
| `zombies on` / `zombies off` | Active/désactive l'IA (freeze si off) |
| `nospawn on` / `nospawn off` | Bloque/active le respawn après un kill |
| `pvp on` / `pvp off` | Active/désactive les dégâts entre joueurs |
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
| `tpcheck` | Liste les points de vérification S01 |
| `tpcheck cabane` | TP vers la vue cabane #1 (recommandé) |
| `tp check cabane` | Alias de `tpcheck cabane` |
| `tp check cabane_pied` | TP au pied de la cabane |
| `tp check sentier` | TP bouche du sentier (panneau) |
| `tp check fin_sentier` | TP fin du sentier forêt |
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
| `worldwipe` | Supprime constructions joueur (murs/sols bois, coffres posés, structures) — seed immuable conservé |
| `worldwipe all` | + tout décor posé manuellement (`decoradd`, hors seed immuable) |
| `worldwipe ground` | + objets au sol (drops, loot ramassable) |
| `worldwipe full` | Équivalent `all` + `ground` |

### Objets monde (prefabs + items posés)

Objets visibles par tous les joueurs, synchronisés via `decorItems` au `game-init` et events Socket.io `decor-item-spawn` / `decor-item-remove`. Tout objet posé durablement passe par un prefab (`kind=prefab`) ou un item de jeu posé comme décor (`kind=item`).

| Commande | Description |
|----------|-------------|
| `decorprefabs` | Liste les prefabs (`spawn_campfire`, `storage_chest`, `building_survivor_shack`, `smallcity_house_a`, …) |
| **Hub admin** | **`/prefab-catalog.html`** ou **`/admin.html`** — menu latéral (catalogue prefabs + **carte monde**). Auth JWT admin. |
| **Catalogue prefabs** | `GET /api/admin/prefab-catalog` — auto-sync, aperçu 3D, **colonne Orientation** (devant/dos). Auth : `prefab.catalog` **ou** `decor.edit` (builders). **Revue qualité** : Valider / À refaire (commentaire obligatoire min. 3 car. pour « à refaire »), liste `reworkList` + détails `reworkDetails` (SQLite `world_meta`). `PUT /api/admin/prefab-catalog/review` body `{ prefabId, status: "validated"|"rework"|null, comment?: string }`. Voir [DECOR_PREFAB_ORIENTATION.md](DECOR_PREFAB_ORIENTATION.md). |
| **Carte monde admin** | `GET /api/admin/world-map` — secteurs, routes, POI, tous les `decorItems`, joueurs en ligne. UI : `admin-world-map.js` (zoom, pan, filtres, clic = panneau édition). |
| **Édition décor admin (API)** | `GET/PATCH/DELETE /api/admin/decor/:id` — modifier position, orientation, scale, épave, ancre coffre ; sync clients via `decor-item-spawn`. |
| **Pose décor admin (API)** | `POST /api/admin/decor` — body JSON `{ prefabId, x, z, rotY?, scale?, … }` — crée un prefab posé (équivalent `decoradd prefab …`). Permission `decor.edit`. Réponse `{ ok, item }` + broadcast live. |
| **Édition décor in-game** | F8 → Monde & décor → **Édition décor live** (`admin-live-decor.js`) — catalogue prefabs intégré, onglet **Poser** : preview fantôme, **clic gauche** pose, **Q/E** ou **molette** rotation ; **Modifier** : **E** cible, **Déplacer visuellement** (bleu), **Dupliquer** (violet), curseurs fins, **Supprimer** ; **Chercher** : `GET /api/admin/decor/search?q=&layer=` ; **undo** Ctrl+Z (`admin-decor-undo.js`, restore via `POST /api/admin/decor/restore`). Catalogue web séparé : `/prefab-catalog.html`. |
| **Recherche décor (API)** | `GET /api/admin/decor/search?q=&layer=&limit=` — résultats légers (id, prefab, coords, layer). Auth `decor.edit`. |
| **Restauration décor (API)** | `POST /api/admin/decor/restore` body `{ item: {…snapshot…} }` — annule une suppression admin. Auth `decor.edit`. |
| **Heure monde (API)** | `GET /api/admin/world-state` · `POST /api/admin/world-time` body `{ time?: 0–1, preset?: dawn\|day\|dusk\|night, autoDay?: bool }` — broadcast `world-time`. F8 → Monde : panneau curseur + presets (`admin-world-time.js`). |
| **Téléportation admin** | `POST /api/admin/teleport-here` body `{ x, z, y?, rotY? }` — auth `decor.edit` ou `players.manage`. In-game : **T** ou F8 → Monde → **Aller ici** (`admin-go-here.js`) — visez le sol sous le réticule. |
| **Carte monde in-game** | F8 → Monde & décor → **Carte monde** (`admin-world-map-overlay.js`) — overlay zoomable, **filtres stricts** (arbres/rochers/barrières/camp masqués par défaut), compteur par couche, dbl-clic vide = TP, clic POI = éditer décor. Auth `world.map` ou `decor.edit`. |
| **Zones monde in-game** | F8 → Monde → **Zones monde** (`admin-zone-overlay.js`) — secteurs · plage safe (cyan) · exclusions build (rouge) · panneau couches. |
| **Signets TP** | F8 → Monde — signets nommés (position joueur ou réticule) · `admin-tp-bookmarks.js` · localStorage. |
| **Coffre admin (API)** | `PATCH /api/admin/decor/:id` patch `{ clearStorage: true }` ou `{ storage: […grille…] }` — prefabs coffre uniquement. |
| **Mode vol admin** | F8 → Monde → **Mode vol** ou touche **V** (`admin-fly.js`) — noclip, Espace/Ctrl vertical, Shift sprint. |
| **Flags serveur (API)** | `GET /api/admin/world-state` inclut `serverFlags` · `POST /api/admin/server-flags` body `{ zombieAI?, zombieSpawn?, lootEnabled?, pvp?, autoDay? }` — broadcast `server-flags`. F8 → Monde : toggles live. |
| **Éditeur copier/coller** | **Ctrl+C** copie le décor ciblé · **Ctrl+V** colle (preview + clic gauche) · **Shift+E** multi-sélection · suppression lot · **Déplacer lot** / nudge ±0,5 m. |
| **Undo / redo** | **Ctrl+Z** / **Ctrl+Y** — piles 10 (patch, storage, delete, lot). |
| **Annonce serveur (API)** | `POST /api/admin/announce` body `{ message }` — broadcast `server-announce` (équivalent `say`). F8 → Monde. |
| **Carte — clustering** | Zoom faible : regroupement arbres/rochers/barrières par tuile (compteur ×N). |
| **Carte — profils filtres** | Presets intégrés + sauvegarde localStorage dans l'overlay carte. |
| `decoritems [filtre]` | Liste les items de jeu posables comme objet décor |
| `decoradd prefab spawn_border_log [x z] [rotY] [scale]` | Pose un rondin de lisière (scale ≈ longueur / 0.42 m) |
| `decoradd prefab storage_chest [here\|x z] [rotY] [scale]` | Pose un coffre prefab interactif : `E` / bouton tactile pour déposer ou reprendre des items |
| `decoradd prefab building_survivor_shack [here\|x z] [rotY] [scale]` | Cabane — **sans x/z** = devant vous (`0 1` = rotY 0, scale 1 devant vous) |
| `decoradd prefab smallcity_house_a [here\|x z] [rotY] [scale]` | Maison Petite ville avec salon, chambre, salle de bain, fenêtres et porte |
| `decoradd prefab <id> [here\|x z] [rotY] [scale]` | Prefab décor/bâtiment — mots-clés position : `here`, `.`, `@`, `devant`, `ici` |
| `decoradd prefab wreck_sedan [x z] [rotY] [scale] [variant] [tilt] [wheels] [sink]` | Épave — variants : `rust`, `olive`, `navy`, `beige`, `burnt` |
| `decorseed wrecks` | Ajoute les épaves seed si absentes (sans redémarrer le serveur) |
| `decorseed wrecks reset` | Supprime toutes les épaves seed et les replace aux positions du gabarit |
| `decorseed trees` | Ajoute les arbres prefab forêt si absents (~63) |
| `decorseed trees reset` | Supprime les arbres seed et les replace (hors palmiers) |
| `decorseed palms` | Ajoute les palmiers plage (`tree_palm`) si absents (~20) |
| `decorseed palms reset` | Supprime les palmiers seed et les replace sur le sable |
| `decorseed beach` | Props narratifs spawn plage + **décor immersion** (4 scènes loisirs) + épave offshore intro |
| `decorseed beach reset` | Supprime les props `beach_spawn_props` + `beach_immersion_v1` et les replace |
| `scenario-reset <joueur>` | Réinitialise l’intro plage (beats, caillou/torche/nourriture intro retirés de l’inv) — QA torche/veilleuse |
| `decorseed s01` | Complète / repositionne les POI S01 seedés (`computeS01DecorPlacements`) |
| `decorseed s01 reset` | Purge tout decor `s01:*` puis reseed + sync clients |
| `decoradd prefab tree_palm [here\|x z] [rotY] [scale]` | Pose un palmier — récoltable (bois), croissance progressive |
| `decoradd <type> [x z] [rotY] [scale]` | Pose un item de jeu comme prop (`food_conserves`, `tool_hachette`, …) — modèle 3D `getItemModel()` |
| `decorlist` | Liste les décors actifs (id, kind, position) |
| `decorremove <id>` | Supprime un décor par id |

**Prefabs** : meshes procéduraux avec textures PNG dans `apps/client/public/textures/camp/` (`wood_planks_light.png`, `wood_planks.png`, `olive_canvas.png`). Module client : `camp_textures.js` → `ZS.CampTextures.materials()`. Le premier bâtiment est `building_survivor_shack`, avec collisions via `decor_colliders.js` et porte interactive (`E` / bouton tactile), synchronisée par Socket.io. Le secteur Petite ville utilise aussi `smallcity_house_a` / `smallcity_house_b` (salon, chambre, salle de bain, fenêtres, porte). Le prefab `storage_chest` ouvre son couvercle, affiche une grille de 27 slots et stocke ses piles dans `decorItems.storage` côté serveur.

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
