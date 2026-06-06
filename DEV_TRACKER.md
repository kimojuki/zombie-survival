# Dev Tracker

## Rules

- All project work done locally should be logged in this file.
- Local-only development infrastructure must never be committed if it is machine-specific or environment-specific.
- The local SQLite database is for development only and must never be pushed, included in a PR, or merged upstream.
- The local `.env` file is for development only and must never be pushed.
- Before opening a future PR, review this tracker and separate:
  - gameplay/code changes intended for upstream
  - local-only development setup that must stay out of Git

## Documentation (obligatoire avant push)

Chaque feature ou refonte doit laisser une trace pour l'équipe :

| Action | Fichier(s) |
|--------|------------|
| Toute session de dev | **DEV_TRACKER.md** — section datée « Completed » |
| Nouvelle variable `.env` | **.env.example** — commentaire + exemple |
| Feature admin / API | **docs/RCON.md** |
| Routes / terrain / spawn | **docs/ROAD_NETWORK.md** |
| Archi client/serveur | **docs/ARCHITECTURE.md** |
| Onboarding / setup | **README.md** |
| Changement JS client | **apps/client/game.html** → incrémenter `CACHE_BUST` |

Index complet : [README.md](README.md#documentation-à-lire-avant-un-push--review)

## Checklist PR (pour les collègues)

Copier dans la description de PR :

- [ ] **DEV_TRACKER.md** mis à jour (date + résumé)
- [ ] **Docs techniques** mises à jour si le comportement/config change
- [ ] **`.env.example`** à jour si nouvelles variables
- [ ] **`CACHE_BUST`** incrémenté si JS client modifié
- [ ] Tests manuels listés (spawn, multijoueur, admin, etc.)
- [ ] Pas de `.env`, SQLite, `notes-local/` dans le commit
- [ ] Message de commit / PR explique le **pourquoi**, pas seulement le quoi

## Workflow

- After every server change, restart the local dev server so the game is testable at `http://localhost:3000`.
- Prefer `npm run dev:server` (nodemon) for auto-reload and `npm run dev:client` for Vite client work.
- Local SQLite (`better-sqlite3`) requires **Node 20** on this machine — use `nvm use 20` or run:
  `& "$env:LOCALAPPDATA\nvm\v20.19.4\node.exe" apps/server/index.js`
- **Ctrl+F5** dans le navigateur après changement JS (cache bust)

## 2026-06-06

### Completed — Porte interactive cabane prefab (2026-06-06) — Georges

- **Prefab** : `building_survivor_shack` — porte séparée avec pivot (`survivorShackDoorPivot`) et état ouvert/fermé.
- **Interaction** : touche `E` desktop + bouton tactile contextuel à portée.
- **Sync** : Socket.io `decor-door-toggle` → `decor-door-state`, état persistant dans `decorItems`.
- **Collisions** : collider de porte actif uniquement quand la porte est fermée, puis resynchronisé au serveur.
- **Cache bust** : `20260606-shack-door-interact-30`

### Completed — Caillou centré entre les deux mains (2026-06-06)

- **FPS** : pivot `sharedItem` — rocher placé au milieu des deux paumes (plus ancré main droite).
- **Cache bust** : `20260606-tool-caillou-center-31`

### Completed — Caillou : frappe rotative `rock_slam` (2026-06-06)

- **Melee** : wind-up court puis rotation épaules/coudes/poignets vers l'avant et le bas (plus de simple translation).
- **Idle** : bras un peu plus écartés, poignets inclinés vers le rocher.
- **Cache bust** : `20260606-tool-caillou-slam-30`

### Completed — Fix toit cabane (pans inclinés corrects) (2026-06-06)

- **Prefab** : `building_survivor_shack` — remplace BufferGeometry cassé par 2 pans + pignons + faîtière alignés sur les murs.
- **Cache bust** : `20260606-shack-roof-fix-29`

### Completed — Merge origin/dev toit cabane + caillou (2026-06-06)

- **Merge** : commit collègue `4d639bb` (toit `building_survivor_shack`) + caillou two-hand/thrust + decoradd devant joueur.
- **Cache bust** : `20260606-merge-dev-28`

### Completed — Fix toit cabane prefab RCON (2026-06-06) — Georges

- **Prefab** : `building_survivor_shack` — toit refait en géométrie pignon dédiée au lieu de deux plaques inclinées inversées.

### Completed — Caillou : pose écartée + frappe deux mains (2026-06-06)

- **Idle** : bras écartés, coudes/poignets inclinés — une main de chaque côté du caillou.
- **Melee** : anim `thrust_forward` — les deux bras poussent le rocher vers l'avant.

### Completed — decoradd devant le joueur (2026-06-06)

- **RCON** : `decoradd prefab building_survivor_shack 0 1` = rotY + scale **devant vous** (plus confondu avec x/z camp).
- **Mots-clés** : `here`, `.`, `@`, `devant`, `ici` pour forcer la position relative.
- **Bâtiments** : placement à 8 m devant le joueur, orientation = votre `rotY` si non précisée.

### Completed — Caillou tenu à deux mains (2026-06-06)

- **FPS** : grip `tool_caillou` en `twoHanded` — bras gauche visible, caillou centré entre les paumes.
- **Prefab** : `buildHandRock` élargi/aplatie, point de prise au centre.

### Completed — Merge `origin/dev` + intégration locale (2026-06-06)

- **Merge** : commit collègue `1cd6124` (`building_survivor_shack`, `decoritems`) fusionné avec zombies/trees/caillou/collisions.
- **Conflits résolus** : `game.html` (CACHE_BUST), `apps/server/index.js` (`decorPrefabs` = trees + cabane).
- **Cache bust** : `20260606-merge-dev-25`
- **Tests** : `npm test`, `node tools/rcon-test.mjs` (incl. `decoradd prefab building_survivor_shack`).

### Completed — RCON prefab bâtiment + listing items (2026-06-06)

- **Prefab bâtiment** : `building_survivor_shack` ajouté côté client (`spawn_clearing.js`) avec collisions dédiées (`decor_colliders.js`).
- **RCON objets** : `decoradd prefab building_survivor_shack ...`, `decorlist`, `decorremove` couvrent maintenant le premier bâtiment ; `decoritems [filtre]` liste les items posables.
- **Tests** : `tools/rcon-test.mjs` couvre `decorprefabs building`, `decoritems`, placement item, placement prefab et placement bâtiment.
- **Docs** : `docs/RCON.md` mis à jour.
- **Cache bust** : `20260606-rcon-prefab-building-01`

## 2026-06-05

### Completed — Item starter `tool_caillou` (2026-06-06)

- **Item** : caillou de départ (hotbar slot 1) — mêlée basique + récolte bois sur arbres prefab.
- **Visuels** : `rock_textures.js` + `rock_prefab.js` (main + sol jeté / decor RCON).
- **Gameplay** : 10 dmg zombie, 1 dmg/coup arbre, +2 bois à l'abattage, durabilité 80 ; PC (clic) + mobile (bouton tir).
- **Serveur** : `STARTING_ITEMS`, `ensureStarterRock()` si inventaire vide, loot pool.
- **Cache bust** : `20260606-tool-caillou-23`

### Completed — Arbres prefab RCON + seed forêt (2026-06-06)

- **Prefabs** : `tree_oak`, `tree_pine`, `tree_birch`, `tree_dead` — `tree_prefabs.js` (atlas écorce/feuillage, `treeSeed` déterministe).
- **Seed** : ~63 arbres forêt via `packages/shared/src/tree-placements.mjs` ; `ensureWorldTrees()` au boot.
- **RCON** : `decorprefabs tree`, `decoradd prefab tree_oak …`, `decorseed trees` / `decorseed trees reset`.
- **Gameplay** : abattage hache sync multijoueur (`decor-fell`) ; colliders cylindriques ; secteur forêt sans spawn procédural local.
- **Cache bust** : `20260606-tree-prefabs-22`

### Completed — Population zombie + collisions décors (2026-06-06)

- **Peuplement** : `ensureZombiePopulation()` — complète jusqu'à 70 zombies (plus de skip si 1 seul en mémoire) ; horde de 18 autour du spawn forêt (35–110 m) ; prefabs pondérés par secteur (`pickZombiePrefabForZone`).
- **Maintien** : top-up automatique toutes les 2 min si kills ; RCON `zombieseed` / `zombieseed reset`.
- **Collisions zombie ↔ décors** : `packages/shared/src/collider-resolve.mjs` (box orientées rotY/rotZ, épaves composées) ; serveur utilise `collideRadius` par prefab.
- **Sync colliders** : client renvoie `world-colliders` après spawn décors (game-init + decor-item-spawn/remove) ; serveur fusionne la couche `decorId`.
- **Cache bust** : `20260606-zombie-populate-21`

### Completed — Zombies prefab RCON + combat (2026-06-06)

- **Shared** : `packages/shared/src/zombie-prefabs.mjs` — `zombie_walker`, `zombie_runner`, `zombie_brute` (HP, dégâts, vitesse, detectRange, hitRadius).
- **Client** : `zombie_prefabs.js` — visuels procéduraux par archétype ; barre HP relative au maxHealth.
- **RCON** : `zombieprefabs`, `spawnzombie`, `zombielist`, `killzombie` (+ `spawnzombies` / `clearzombies` existants).
- **Combat** : tir/mêlée serveur utilise `hitRadius` par prefab ; dégâts zombie utilisent `damage`/`attackCd` par entité.
- **Collision joueur** : cylindres `collideRadius` par prefab (`resolvePlayerCollision` client).
- **Cache bust** : `20260606-spawn-trail-refonte-20`

### Completed — Épaves prefab RCON + textures apocalypse (2026-06-06)

- **Prefabs** : `wreck_sedan`, `wreck_pickup` — textures procédurales (`vehicle_textures.js`).
- **Seed** : 8 épaves sur `town_main` / `city_highway` (`packages/shared/src/road-wrecks.mjs`).
- **RCON** : `decoradd prefab wreck_sedan x z rotY scale variant tilt wheels sink`.
- **Cache bust** : `20260606-spawn-trail-refonte-16`
- **Fix seed** : `ensureRoadWrecks()` au boot + RCON `decorseed wrecks` / `decorseed wrecks reset`
- **Placements** : 2 épaves à la jonction sentier, 5 le long de `town_main` vers l'ouest (~30 m), 1 sur `city_highway`
- **Collision épaves** : collider enregistré après build avec `baseY` terrain + box alignée carrosserie

### Session push `dev` — spawn, sentier, RN 2 voies (2026-06-06)

Résumé livré sur `dev` (cache bust `20260606-spawn-trail-refonte-15`) :

| Zone | Livrable |
|------|----------|
| Camp | prefabs RCON, sol/languette, rondins `spawn_border_log` |
| Sentier | `trails.js` + `buildTrailTowardRoad` → jonction au point RN le plus proche du camp |
| RN | `proc_roads.js` — `town_main` 8,4 m (2 voies, ligne jaune), `city_highway` 12 m |
| Pipeline | `road_network.js` + `world.js` flatten → terrain → meshes |
| **Prochain** | *(à définir)* secteurs bâtiments, grille rues S02/S03 |

### Completed — RN 2 voies + bande jaune centrale (2026-06-06)

- **`town_main`** : largeur 6,2 m → **8,4 m** (2 voies).
- **Ligne centrale** : ruban jaune continu aligné sur l'axe route (`_buildLaneOverlay` refait).
- **Cache bust** : `20260606-spawn-trail-refonte-15`

### Completed — Sentier vers point RN le plus proche du camp (2026-06-06)

- **`buildTrailTowardRoad`** : courbe camp → point `town_main` le plus proche de la bouche (~33 m, ouest).
- Fini le tracé manuel vers l'est `(56,-58)` ; génération auto dans `proc_roads.js`.
- **Cache bust** : `20260606-spawn-trail-refonte-14`

### Completed — Jonction sentier au point le plus proche sur la RN (2026-06-06)

- **`computeTrailRoadJoin`** : distance minimale sentier ↔ polyligne `town_main`.
- **`trimTrailForJoin`** : bouche d'approche + fin au point le plus proche (pas coord fixe).
- **Patch jonction** : 3 rangées (arrière → bouche → accotement route).
- **Cache bust** : `20260606-spawn-trail-refonte-13`

### Completed — Sentier naturel + jonction RN sans z-fighting (2026-06-06)

- **Tracé** : ~18 points de contrôle, courbe Chaikin, approche tangentielle vers `(56,-58)`.
- **Mesh** : `trails.js` s'arrête 2,2 m avant la route (`skipEnd`) ; hauteur blend vers asphalte.
- **Jonction** : patch éventail `RoadNetwork` pour `spawn_trail` (visual false, junction seule).
- **Cache bust** : `20260606-spawn-trail-refonte-12`

### Completed — RN + sentier éloignés ×2 du camp (2026-06-06)

- **Jonction** : `(28,-32)` → `(56,-58)` (~76 m du camp).
- **Sentier** : prolongé (~75 m) ; tracé RN est ajusté.
- **Cache bust** : `20260606-spawn-trail-refonte-11`

### Completed — Fix RN asphalte (texture blanche + éloignement camp) (2026-06-06)

- **Texture** : `buildMeshes(scene, ZS.B.M)` — matériaux asphalte/barrières corrects.
- **Position** : RN décalée au sud (`z ≈ -32` près du spawn) ; jonction sentier `(28, -32)`.
- **Sentier** : prolongé (~42 m) pour rejoindre la nouvelle jonction.
- **Cache bust** : `20260606-spawn-trail-refonte-10`

### Completed — RN nationale asphalte + sentier prolongé (~34 m) (2026-06-06)

- **Sentier** : prolongé jusqu'à `(14, -18)` — jonction avec la RN est→ouest.
- **Routes** : `proc_roads.js` — `town_main` (6,2 m, texture `road_asphalt.png`) + `city_highway` (12 m vers grande ville).
- **Pipeline** : `road_network.js` rechargé ; `world.js` — flatten → terrain → buildAll → `buildMeshes`.
- **spawn_trail** : flatten RoadNetwork (`visual: false`) ; mesh sentier reste `trails.js`.
- **Cache bust** : `20260606-spawn-trail-refonte-09`

### Completed — Sentier camp prolongé (~22 m, courbe naturelle) (2026-06-06)

- **`SPAWN_TRAIL_PTS`** : 20 points — sortie languette, arc doux est puis inflexion ouest (sentier piéton réaliste).
- **Docs** : `ROAD_NETWORK.md` aligné refonte (`trails.js`, `spawn_border_log`, API actuelle).
- **Cache bust** : `20260606-spawn-trail-refonte-08`

### Completed — Fix sentier spawn (triangles + double texture) (2026-06-06)

- **Bug** : grand triangle marron (triangulation cassée aux coudes/taper), ovale « dirt » sous le mesh (corridor route = tint atlas terrain).
- **`noise.js`** : `registerTrailCorridor` — aplatit le terrain sans `isInRoadCorridor` (pas de teinte dirt).
- **`trails.js`** : échantillonnage continu le long du polyline ; plus de `prevRow` cassé aux angles ; largeur 1.55 m.
- **`proc_spawn`** : patch terrain camp réduit (6×5.5 m) + `registerClearingDisc` ; sentier via trail corridor.
- **`spawn_clearing`** : sol camp texturé (ellipse + gap sud) ; pierres bordure en dodécaèdres sombres.
- **Cache bust** : `20260606-spawn-trail-refonte-03`

### Completed — Fix lisière camp (rondins + herbe + jointure sentier) (2026-06-06)

- **Sol camp** : arc ellipse corrigé (signe Z shape Three.js), gap sud propre, couverture 98 % de la clairière.
- **Rondins** : tangente ellipse (`atan2`) + espacement uniforme sur l'arc (26 rondins).
- **Herbe verte** : terrain enfoncé sous la clairière + teinte dirt dans `isInClearingDisc` pour éviter le z-fight.
- **Sentier** : premier point à la bouche sud (-10.78), `taperStart` réduit pour jointure fluide.
- **Cache bust** : `20260606-spawn-trail-refonte-04`

### Completed — Couches décor : props sur sol camp (couche 2) (2026-06-06)

- **`getDecorGroundHeight(x, z)`** : terrain + relèvement camp (+0.07) ou sentier (+0.08) selon la zone.
- Branché sur `spawnDecorPrefab`, `spawnDecorItem`, `getEffectiveFloorHeight` (joueur), init spawn, loot au sol, mesh sentier.
- **Cache bust** : `20260606-spawn-trail-refonte-05`

### Completed — Languette camp + anneau rondins tangent (2026-06-06)

- **Jointure** : languette de sol (triangle sud) alignée sur la bouche du sentier ; `taperStart: 0` ; points trail recalculés depuis la languette.
- **Rondins** : rotation `YXZ` (tangents à l'ellipse), longueur = arc ÷ N pour se toucher (~0.42 m, ~60 rondins).
- **Cache bust** : `20260606-spawn-trail-refonte-06`

### Completed — Rondins lisière → prefab RCON + collision (2026-06-06)

- **`spawn_border_log`** : prefab client + collider box orientée (`decor_colliders.js`), scale = longueur / 0.42 m.
- **Seed serveur** : anneau généré via `packages/shared/src/camp-border-logs.mjs` (~60 décors sync multijoueur).
- **RCON** : `decoradd prefab spawn_border_log …`, `decorremove`, `decorlist` — comme les autres prefabs camp.
- **Cache bust** : `20260606-spawn-trail-refonte-07`

### Completed — Sentier spawn refonte (sans legacy RoadNetwork) (2026-06-06)

- **Retrait** : `road_network.js`, `vehicles.js`, `sector_*.js` retirés du chargement client ; plus de `buildMeshes` / routes ville.
- **`trails.js`** : ruban sentier autonome (`registerFlatten`, `buildMesh`, `sample`, `isNear`) + texture `trail_forest.png`.
- **Spawn** : `proc_spawn.build` → lisière camp + sentier ~8 m + pierres de bordure ; décor camp reste seed serveur / RCON.
- **Ordre** : aplatissement sentier (`SpawnZone.registerTerrain`) → terrain → `buildAll` spawn-only.
- **Cache bust** : `20260606-spawn-trail-refonte-02`

### Completed — Sentier spawn texturé + pipeline routes restauré (2026-06-06) — annulé (rebranchage legacy)

- **Fix critique** : `road_network.js`, `vehicles.js` et secteurs `sector_*.js` remis dans `legacy-modules.js` ; `registerSector` et `buildWorld` restaurés (flatten → terrain → meshes).
- **Texture** : `textures/camp/trail_forest.png` (sentier forêt piétiné) + matériau `M.trail` / `CampTextures.materials().trail()`.
- **API** : `trails.js` → `ZS.Trails.define({ id, pts, width, taperStart, taperEnd })`.
- **Spawn** : `SPAWN_TRAIL_PTS` courbe naturelle (~10 pts) ; clairière `spawn_clearing` + sentier `spawn_trail` (type `trail`, 1.85 m).
- **Docs** : `docs/ROAD_NETWORK.md`, `docs/ARCHITECTURE.md`
- **Cache bust** : `20260606-spawn-trail-01`

### Completed — Textures camp bois/toile sur prefabs décor (2026-06-06)

- **`camp_textures.js`** : module partagé (`wood_planks_light.png`, `wood_planks.png`, `olive_canvas.png`) — matériaux réutilisables pour tout décor camp.
- **Prefabs** : caisses, sac, bedroll, établi, abri, poteaux, pile de bois, souches et lisière utilisent les textures bois/toile (comme `mapgen.js` avant le passage prefab).
- **Retrait** : approche atlas `items.png` sur prefabs/décor (mauvaise piste).
- **Fichiers** : `camp_textures.js`, `spawn_clearing.js`, `mapgen.js`, `legacy-modules.js`, `game.html`
- **Docs** : `docs/RCON.md` (commandes décor), `docs/ARCHITECTURE.md` (prefabs + textures camp)
- **Cache bust** : `20260606-camp-textures-01`

### Completed — Textures atlas items.png sur décor et loot (2026-06-06) — annulé

- **`item_textures.js`** : module atlas `items.png` (grille 12×6) avec mapping type → cellule, `makeItemSprite()` et `addItemSprite()`.
- **Décor RCON** : `spawnDecorItem()` utilise le sprite atlas quand disponible (bouteille, conserve, hachette au spawn camp).
- **Loot sol** : `_makePickupMesh()` affiche la texture atlas au lieu du cube/GLB procédural.
- **Prefabs camp** : `spawn_drink_set`, `spawn_supply_crate` (conserve), `spawn_backpack` texturés via atlas.
- **Fichiers** : `apps/client/public/js/item_textures.js`, `player.js`, `inventory.js`, `spawn_clearing.js`, `legacy-modules.js`, `game.html`
- **Cache bust** : `20260606-item-textures-01`

### Completed â€” Refonte ciel jour/nuit (2026-06-06)

- **Soleil / lune** : sprites célestes stabilisés ; direction correcte quand on tourne la caméra ; plus de dérive au déplacement.
- **Profondeur** : `depthTest: true` conservé pour éviter le rendu au premier plan devant arbres, murs et toits.
- **Étoiles** : ajout d’un champ d’étoiles nocturne sur `skyRoot`, recentré sur la caméra en translation uniquement, sans suivre sa rotation comme un HUD.
- **Nuages** : refonte de `spawnClouds()` vers une couche céleste sur `skyRoot` avec dérive lente en azimut, teinte et opacité pilotées par `sunY`.
- **Pièges évités** : pas d’objets célestes au-delà de `camera.far`, pas de `depthTest: false`, pas de parentage caméra pour les couches qui doivent rester “dans le monde”.
- **Fichiers** : `apps/client/public/js/world.js`, `apps/client/game.html`
- **Cache bust** : `20260606-sky-12`

### Completed â€” Spawn camp ground texture (2026-06-06)

- **Skill** : usage de `imagegen` pour produire une texture de sol dédiée au campement.
- **Asset** : ajout de `apps/client/public/textures/camp/spawn_ground.png`.
- **Spawn** : `apps/client/public/js/spawn_clearing.js` utilise maintenant cette texture sur le patch de sol de la clairière.
- **Objectif** : remplacer le rendu “terre plate horrible” par une terre tassée plus crédible et plus lisible pour la refonte du spawn.
- **Cache bust** : `20260606-spawn-02`

### Completed â€” Réutilisation items en décor + RCON décors (2026-06-06)

- **Helper client** : ajout de `ZS.spawnDecorItem()` dans `apps/client/public/js/player.js` pour poser un item existant comme prop de décor à partir de son `type`.
- **Réutilisation** : même pipeline de modèle que pickup / item en main (`ZS.getItemModel`) — un item peut servir de loot, d’équipement visuel et de décoration.
- **Spawn** : validation du flux dans `apps/client/public/js/spawn_clearing.js` avec bouteille, conserve et hachette posées comme décor.
- **RCON** : ajout de `decoradd`, `decorlist`, `decorremove` dans `apps/server/src/rcon.js`.
- **Sync réseau** : `decorItems` envoyés au `game-init` + events `decor-item-spawn` / `decor-item-remove` dans `apps/client/public/js/network.js`.
- **Cache bust** : `20260606-items-decor-02`
- **Prefabs décor** : ajout de `ZS.spawnDecorPrefab()` / `ZS.listDecorPrefabs()` dans `apps/client/public/js/spawn_clearing.js`.
- **Spawn** : le camp du spawn repose maintenant sur des prefabs décor réutilisables, plus sur des meshes posés en dur dans `buildCampLayout()`.
- **RCON** : `decoradd` accepte aussi `decoradd prefab <id> ...` et `decorprefabs` liste les prefabs disponibles.
- **Sync réseau** : `apps/client/public/js/network.js` gère maintenant les décors `item` et `prefab`.
- **Cache bust** : `20260606-items-decor-04`

### Completed — Collisions décors prefab / item (2026-06-06)

- **`decor_colliders.js`** : hitboxes par prefab et type d'item ; rotY + scale.
- **`world.js`** : colliders décor fusionnés dans `getColliders()`.
- **`game.js`** : collision box avec rotation Y.
- **Cache bust** : `20260606-decor-collide-01`

### Completed — Plateformes décor (saut + station debout) (2026-06-06)

- **`getStandHeight()`** : le sol effectif inclut le dessus des décors (caisses, souches…) si saut possible (~1,55 m).
- **`shouldSkipDecorSideCollision()`** : plus de glissement latéral pendant l'atterrissage sur un prop.
- **Cache bust** : `20260606-decor-stand-01`

### Completed

- Started the studio restructure on `dev` and kept `master` documented as production only.
- Moved server runtime to `apps/server/index.js` with root `server.js` compatibility wrapper.
- Moved browser app to `apps/client`, legacy scripts/assets to `apps/client/public`, and previews to the Vite client root.
- Added `packages/shared`, `infra`, `tools/visual-tests`, `.github`, `.cursor/rules`, `docs/adr` and `design`.
- Added Vite, ESLint, Prettier, EditorConfig, Playwright dependency, CI workflow, Dependabot, smoke tests and shared constants.
- Added `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, PR/issue templates and studio workflow AI rules.
- Added ADRs for branch strategy, Vite, the temporary `window.ZS` facade, client/server separation and skins/rigs strategy.

### Validation Notes

- Full validation is tracked in the restructuring task and must include `npm run lint`, `npm test`, `npm run build`, `npm run test:smoke` and visual checks where possible.

### Fix post-restructuration — jeu local

- **Symptôme** : `EPERM: operation not permitted, stat 'public/game.html'` au lancement.
- **Cause** : ancien serveur Node encore actif (servait `public/`) + dossier `public/` corrompu/inaccessible après migration Windows.
- **Correctif** : routes explicites vers `apps/client` (`index.html`, `game.html`, previews), assets depuis `apps/client/public`, modules bootstrap via `/src`, build prod seulement si `NODE_ENV=production` ou `USE_CLIENT_BUILD=true`.
- **Action dev** : redémarrer le serveur (`npm run dev:server` ou `npm start`) puis ouvrir `http://localhost:3000`.

## Local-only Files

- `.env`
- `database/local-dev.sqlite`
- `database/local-dev.sqlite-wal`
- `database/local-dev.sqlite-shm`

These are intentionally ignored by Git for local development.

## 2026-06-04

### Context

- Private repository cloned locally into `D:\Projects\zombie-survival`.
- Goal: make the game runnable locally for development and future PR work.

### Completed

- Installed Node dependencies with `npm install`.
- Verified the project serves the frontend locally on port `3000`.
- Diagnosed login failure as a missing local MySQL/MariaDB service.
- Reworked the data layer in `src/db.js` to support:
  - `sqlite` local development mode by default
  - `mysql` compatibility for later shared/deployment environments
- Added automatic SQLite initialization for local player persistence.
- Added `.env.example` documenting both local SQLite and optional MySQL config.
- Added SQLite ignore rules in `.gitignore`.
- Created a local `.env` configured for SQLite development.
- Verified local registration and login now work against SQLite.

### Important Notes

- The SQLite setup is a local development convenience, not a deployment decision.
- If upstream should remain MySQL-only, the SQLite support may later need to be discussed before PR.
- The current local environment is now sufficient to test the game manually in a browser.
- A local-only personal notes workspace is now used under `notes-local/` and must never be included in PR work.

### Completed (visual & gameplay pass — 2026-06-04)

- **Roads:** seamless asphalt/dirt textures; lane markings and edge lines drawn as code overlays (not baked in bitmap); ribbon mesh follows terrain with cross-segment subdivision; shoulder strips; `registerFlatPath()` in `noise.js` to flatten terrain under roads.
- **Terrain & vegetation:** `terrain_atlas.png` and `tree_atlas.png` added; grass/dirt UV mapping on terrain mesh; Minecraft-style vertical grass tufts; tree bark/leaf atlases on trunks and foliage.
- **River & water gameplay:** river mesh follows terrain width; animated water surface; player water contact (overlay, movement slow, reduced jump); survival thirst recovery in water; water zones synced to server → zombie slow factor in river.
- **Sector tweaks:** forest road paths adjusted; small-town main road uses `roadBroken` material; main-city highway guardrails rebuilt per segment with skip zones at intersections.
- **Housekeeping:** `notes-local/` added to `.gitignore`; `CLAUDE.md` updated to reflect actual project state.
- **River z-fighting fix:** `registerRiverChannel()` carves a 14 m bed along the full course; water surface is flat and ~0.48 m above the bed (not glued to terrain); grass/trees excluded from the channel.
- **River swim fix:** buoyancy + depth clamp so the player cannot pass under the water plane; jump swims up; opaque river bed mesh blocks view from below.
- **Prod 503 hotfix:** default MySQL + lazy-load SQLite (`1982c99`).

### Completed (real flat roads — 2026-06-04)

- **`applyRoadFlattening()`** runs before `buildTerrain()` — terrain carved flat under every road (asphalt/dirt/path) with shoulders and smooth blend.
- **Road registry per sector:** `FOREST_ROADS`, `TOWN_ROADS`, `CITY_ROADS`, `MILITARY_ROADS` declared at load time → single source for flatten + ribbon mesh.
- **`registerFlatPath`:** skips river channel; uses pre-river height; denser sampling for highways.
- **Visual banks** restored on dirt/path (lighter) for road-edge transition.

### Completed — Console RCON mobile + admin Bruno (2026-06-05)

- **Menu mobile** : ☰ → « Console dev » (admins uniquement, `ZS._isMobile`).
- **Mobile UX** : plein écran, input 16px (clavier iOS), bouton Envoyer, safe-area, joystick désactivé.
- **Sécurité dev** : `ADMIN_USERS=Bruno`, `RCON_AUTO_ADMIN=false` — plus d'admin auto pour tous.
- **Cache bust** : `20260605r`

### Completed — Route principale + jonction sentier (2026-06-05)

- **`town_main`** : route asphaltée est→ouest (88,-26 → -295,0), barrières métal, ligne centrale, épaulements.
- **`city_highway`** : autoroute S02→ville (-104,-9 → -20,-122), 12 m, barrières.
- **Ouverture spawn** : sentier termine au sud de la route (14,-21) ; patch jonction + gap barrières ; panneau décalé.
- **Supprimé** : `registerFlatZone` town (-177,0) ; glissières manuelles S03 (doublon).
- **Cache bust** : `20260605q`

### Completed — Spawn refonte visuelle (2026-06-05)

- **Cause** : clairière = ruban linéaire (forme flèche) + `registerFlatZone` rectangulaire → bords durs, z-fighting, transitions moches.
- **Fix** : `registerClearingDisc` (noise.js) — aplatissement elliptique radial ; `defineClearing` + mesh disque (road_network.js).
- **Sentier** : Chaikin + taper à l'entrée, cross-section terrain, cassure aux virages serrés.
- **Décor** : lisière rondins/pierres, cairn de sortie, suppression barre bloquante, props repositionnés.
- **Cache bust** : `20260605o`

### Completed — Routes brick 0→1 (2026-06-05)

- **Reset** : ancien `road_network.js` (~550 lignes) supprimé ; module minimal reconstruit.
- **Brick 0** : `spawn_clearing` + `spawn_trail`.
- **Brick 1** : `town_main` + `city_highway` — voir section « Route principale » ci-dessus.

### Completed (console RCON admin — 2026-06-05)

- **`src/rcon.js`** : registre de commandes serveur (help, status, players, time/day/night, autoday, zombies, nospawn, tp, kick, give, heal, god, save, loot, say…).
- **In-game** : `public/js/rcon.js` — console terminal (` ou F2), auth via `auth <password>` ou liste `ADMIN_USERS`.
- **API externe** : `POST /api/rcon` avec header `X-RCON-Password` ou `body.password`.
- **Config** : `RCON_PASSWORD`, `ADMIN_USERS` dans `.env` / `.env.example`.
- **Flags serveur** : `autoDay`, `zombieAI`, `zombieSpawn`, `lootEnabled` — synchronisés aux clients.
- **Doc** : [docs/RCON.md](docs/RCON.md)

### Completed (road network refonte — 2026-06-05)

- **`public/js/road_network.js`** : graphe unique (Node/Edge), Chaikin + densification, profil largeur unifié (flatten = mesh = `isNearRoad`), patches jonction fan, `buildMeshes()` centralisé.
- **`noise.js`** : `registerRoadCorridorVar()` — halfW variable le long des polylignes.
- **`buildings.js` / `world.js`** : pipeline `resolve → flatten → terrain → buildAll → buildMeshes` ; secteurs n'appellent plus `ribbon()` directement.
- **S01–S05** : ~27 arêtes migrées ; jonction spawn `(14,-18)` partagée ; arête `spawn_clearing` remplace les disques `buildCampGround`.
- **`spawn_clearing.js`** : sentier → `(14,-18)` ; `_onPath` via `isNearRoad` ; un seul panneau jonction.
- **Cache bust** : `20260605j` dans `game.html`.
- **Doc** : [docs/ROAD_NETWORK.md](docs/ROAD_NETWORK.md)

### Fix (RCON saisie impossible — 2026-06-05)

- **Cause** : `public/js/rcon.js` désactivait le champ input tant que l'utilisateur n'était pas authentifié — impossible de taper `auth dev` (boucle).
- **Fix client** : input toujours actif ; `exitPointerLock()` + focus à l'ouverture ; touches jeu bloquées quand console ouverte ; inventaire ignoré si RCON ouvert.
- **Fix serveur** : `RCON_AUTO_ADMIN=true` en SQLite (`.env`) — admin auto à la connexion, `rconPreAuth` dans `game-init`.
- **Usage** : redémarrer serveur → Ctrl+F5 → `` ` `` → taper `help` directement (ou `day`, `status`, etc.)
- **Cache bust** : `20260605m`

### Fix (RCON commandes — 2026-06-05)

- **Cause** : `.env` sans `RCON_PASSWORD` → serveur rejetait toutes les commandes ; ancien serveur sans route `/api/rcon`.
- **Fix** : mot de passe `dev` par défaut en `DB_CLIENT=sqlite` ; `RCON_PASSWORD=dev` ajouté au `.env` local ; ack Socket.io avec timeout ; messages client plus clairs.

### Completed (documentation équipe — 2026-06-05)

- **README.md** — onboarding, structure projet, liens docs, checklist push
- **docs/ARCHITECTURE.md** — schéma client/serveur, autorité, secteurs
- **docs/RCON.md** — config, commandes, API, tests PR
- **docs/ROAD_NETWORK.md** — pipeline routes, API, nœuds, tests PR
- **DEV_TRACKER.md** — règles doc obligatoires + checklist PR
- **CLAUDE.md** — fichiers clés à jour (road_network, rcon)
- **Cache bust RCON** : `20260605k` dans `game.html`

### Completed — Auto-deploy prod (2026-06-06)

- **`scripts/deploy-prod.sh`** : `git pull` + `npm ci` si besoin + `pm2 restart zombie` + logs `~/logs/zombie-deploy.log`
- **`scripts/git-watch-deploy.sh`** : pour crontab (vérifie toutes les 2 min)
- **`scripts/webhook-deploy.js`** : webhook GitHub instantané (optionnel)
- **Doc** : [docs/DEPLOY.md](docs/DEPLOY.md)

### Completed — Compteur joueurs en ligne HUD (2026-06-06)

- **👥 N** en haut à droite, à gauche de ☠️ kills.
- **Serveur** : `onlineCount` dans `game-init`, event `players-online` à chaque connect/disconnect.
- **Cache bust** : `20260606n`

### Completed — Chat au-dessus du clavier mobile (2026-06-06)

- **`visualViewport`** : `#chat-wrap` remonte quand le clavier s’ouvre (`body.chat-keyboard`).
- **Cache bust** : `20260606m`

### Completed — Deploy auto robuste (reset hard) (2026-06-06)

- **`deploy-prod.sh`** : `git reset --hard origin/master` au lieu de `git pull` (plus de conflits locaux).
- **`scripts/fix-prod-once.sh`** : réparation unique pour le collègue (merge abort / deploy-prod.sh modifié).
- **Cron** : doc chemin Infomaniak complet + `ZOMBIE_APP_DIR`.
- **Ne pas** `git config` sur le serveur — stratégie pull intégrée au script.

### Completed — Bras FPS style Minecraft + anims par objet (2026-06-06)

- **Rig articulé** : épaule → coude → poignet → paume (cubes distincts, pouce) ; objet sur `itemPivot` devant la paume (plus fusionné).
- **Anims par style** : `swing_down` (hache/pioche), `swing_side` (couteau/machette), `swing_overhead` (batte), `thrust`/`stab` (lance/couteau), `drink`/`bite`/`bandage`/`inject`/`apply` (consommables).
- **GRIPS** retunés : pose coin bas-droite type Minecraft, offsets objet plus loin de la main.
- **Cache bust** : `20260606q`

### Completed — Fix bras FPS + utilisation clic gauche (2026-06-06)

- **Rig** : `itemHolder` attaché à la main du bras droit (`itemPivot` pour l’objet) — main et objet cohérents.
- **GRIPS** retunés : poses épaule + offset local objet (nourriture en paume, armes à feu deux mains).
- **Anim `use`** : boire/manger/soigner (montée vers la bouche).
- **PC clic gauche** : consomme nourriture/médical et recharge munitions (comme le bouton Utiliser mobile).
- **Cache bust** : `20260606p`

### Completed — Refactor bras FPS + animations (2026-06-06)

- **`public/js/player.js`** : table **GRIPS** (`GRIP_CATEGORIES` + `GRIP_TYPES`) — poses item/bras par catégorie et overrides par type ; `getGrip(type)` source de vérité FPS + 3e personne.
- **Rig modulaire** : épaule → avant-bras → main (`grip` / `hold`), bras gauche deux mains.
- **Moteur d’anim** : `triggerArmAnim`, `tickArmAnim`, `tickFPSArms` (idle, marche, recul, mêlée, coup de poing, rechargement).
- **`public/js/game.js`** : remplace `_tickSwing` (rotation globale) ; reload visuel branché sur `temps_rechargement`.
- **`public/js/network.js`** : poses distantes et attaques lues depuis `getGrip` / `userData.grip`.
- **Cache bust** : `20260606o`

### Completed — Bouton chat mobile à droite (2026-06-06)

- **`#chat-btn`** : haut droite, sous le menu ☰ (`top: 56px`, `right: 12px`) — retiré de la colonne gauche.
- **Cache bust** : `20260606l`

### Completed — Fix auto-deploy + health commit (2026-06-06)

- **`/api/health`** : champ `commit` (hash git) pour vérifier la version prod.
- **`deploy-prod.sh`** : PATH nvm/pm2 pour cron, logs fetch/pull explicites.
- **`docs/DEPLOY.md`** : premier deploy manuel obligatoire, dépannage cron.

### Completed — Push équipe : chat + deploy + doc (2026-06-06)

- **Chat** : sync multijoueur (`senderId`), UI discrète bas gauche, bouton 💬 mobile, Entrée/T PC, reprise pointer lock.
- **Deploy** : `scripts/deploy-prod.sh`, cron, `docs/DEPLOY.md`, `ecosystem.config.cjs`.
- **Doc** : README, ARCHITECTURE, DEPLOY, DEV_TRACKER, CLAUDE.md.
- **Cache bust** : `20260606j` — **prod** : `git pull` + `pm2 restart zombie` après merge.

### Completed — Chat discret bas gauche (2026-06-06)

- **UI** : fil de texte sans carte ni fond (ombre portée) ; ~3 lignes mobile / ~4 PC.
- **Saisie** : barre compacte uniquement en mode `chat-open` (💬 mobile, Entrée/T PC).
- **Cache bust** : `20260606j`

### Completed — Fix chat multijoueur + reprise pointer lock (2026-06-06)

- **Cause racine** : serveur Node non redémarré → handler `socket.on('chat')` absent (test local reproduit ; OK après restart).
- **Sync messages** : `senderId` (socket.id) côté serveur ; listener dans `chat.js` ; anti-doublon par session.
- **Diagnostic** : `/api/health` → `chat: true` ; timeout 4 s si le serveur ne répond pas à `emit('chat')`.
- **Login** : JWT avec `player.username` depuis la DB.
- **PC** : reprise pointer lock après envoi / fermeture chat.
- **Cache bust** : `20260606i`
- **Action prod** : `git push` + `pm2 restart zombie` obligatoire après modif `server.js`.

### Completed — Bouton chat mobile (2026-06-06)

- **`#chat-btn`** : icône 💬 avec craft / inventaire / carte (gauche, `bottom: 330px`), visible uniquement en `mode-mobile`.
- **`#chat-toggle`** masqué sur mobile ; PC inchangé (Entrée / T).
- **`#chat-send-btn`** : envoi tactile dans la ligne de saisie (mobile).
- **Cache bust** : `20260606g`

### Completed — Chat multijoueur (2026-06-06)

- **`public/js/chat.js`** : panneau chat (Entrée / T), historique 50 lignes, envoi socket.
- **Serveur** : event `chat` → broadcast `chat-message` à tous (rate limit 800 ms, 200 car. max).
- **UI** : coin haut-gauche PC, bas-gauche mobile ; libère pointer lock à l'ouverture.
- **Fix PC Entrée** : envoi sans vider le champ ; echo optimiste ; capture clavier anti-conflit.
- **Cache bust** : `20260606f`

### Completed — Branche dev + rig joueur articulé procédural (2026-06-06)

- **Git** : création/push de la branche `dev` (`origin/dev`) pour isoler les tests avant merge futur vers `master`.
- **Rig** : remplacement du modèle joueur “membres blocs simples” par un squelette procédural hiérarchique (`hips/spine/chest/head`, épaules/coudes/poignets/mains, hanches/genoux/chevilles).
- **FPS** : remplacement du bras FPS isolé par une chaîne articulée épaule → coude → poignet → main, avec `itemHolder` sous la main droite.
- **Objets** : attache locale et distante unifiée sur le holder de main ; compat réseau conservée via `limbs.rArm` et `rig.rightItemHolder`.
- **Skins** : ajout de `skinSlots` par partie du corps + `ZS.applyHumanoidPalette()` pour préparer skins/palettes sans réécrire le rig.
- **Tests visuels** : Chromium multi-états (`arm-empty`, bouteille, use, hachette, melee, pistolet, reload).
- **Cache bust** : `20260606z`

### Completed — Fix pose bras MC (applySwingOffset + bras -Z) (2026-06-06)

- **Cause** : Euler calibrés `(0.68, 0.26, -0.06)` + bras `-Y` → bande diagonale fine, main au centre, invisible après bug matrice.
- **Fix** : `HeldItemRenderer.applySwingOffset` via `Matrix4` (repos = translate `0.56,-0.52,-0.72` seul) ; géométrie bras vers **-Z** (arc FPP MC) ; items sur `itemPivot` avec `_MC_ITEM_HOLD` adapté.
- **Outil** : `scripts/capture-fps-arm.mjs` + `public/arm-preview.html` → screenshots Chromium dans `notes-local/screenshots/`.
- **Cache bust** : `20260606x`

### Completed — Fix transform bras MC (matrices vanilla) (2026-06-06)

- **Cause** : Euler `(-100°, 45°, -65°)` incorrect — bras penché vers la gauche / main au centre écran.
- **Fix** : pile `Matrix4` comme `ItemInHandRenderer` — `translate(0.56,-0.52,-0.72)` puis `rot Y45° Z-15° X-35°`, swing `applySwingOffset`, consommables `applyEatOrDrinkTransformation`.
- **Géométrie** : bras HumanoidModel 0.25×0.75×0.25, pivot épaule, pend `-Y`.
- **Cache bust** : `20260606u`

### Completed — Bras FPS style Minecraft (2026-06-06)

- **Refonte** : un seul bloc bras (4×12×4 Steve) + manche bleu, pivot `HeldItemRenderer` `(0.56, -0.52, -0.72)` rot `(-100°, 45°, -65°)`.
- **Anims MC** : swing `sqrt(sin)` attaque, consommation montée vers bouche (`pow` easing), plus de rig articulé 3 segments.
- **Cache bust** : `20260606t`

### Completed — Bras FPS articulé + anims consommables (2026-06-06)

- **Repos en V** : `_REST_EMPTY` / `_REST_HOLD` / `_REST_AIM` — épaule, coude, poignet pliés (plus de bras tendu vers l'avant).
- **Mains nues** : `hideUpper` masque le haut du bras, ne laisse qu'une mini épaule alignée au corps.
- **Boire / manger** : objet levé vers la bouche (`liftY`/`liftZ`, `tiltX` positif), pas vers le sol ; joints poignet/coude synchronisés.
- **Mêlée** : hache/outils — frappe vers l'avant (`swing_down` + thrust coude/poignet).
- **Cache bust** : `20260606s`

### Completed — Fix bras FPS invisibles (2026-06-06)

- **Cause** : rig bras construit le long de **-Y** (pendant vers le bas) + position épaule trop basse → géométrie hors champ caméra ; `_applyGripPose` sortait avant de positionner `rArm` si `itemHolder` introuvable.
- **Fix** : rig Minecraft orienté **-Z** (avant), position épaule `[0.26, -0.30, -0.38]`, référence `rArm.userData.itemHolder`, pose bras appliquée même sans objet en main.
- **Cache bust** : `20260606r`

### Completed — Contrôles PC / pointer lock (2026-06-06)

- **Cause** : `#left-zone` / `#right-zone` (45 %+55 % écran) interceptaient les clics souris sur PC → pointer lock jamais demandé, caméra bloquée.
- **Fix** : `mode-desktop` / `mode-mobile` sur `<body>` (détection `pointer: fine` + largeur, pas seulement `ontouchstart`).
- **PC** : zones tactiles + boutons tir/saut masqués ; clic zone de jeu → pointer lock ; overlay « Cliquez pour jouer » ; curseur crosshair / none.
- **Mobile** : inchangé (joystick + zone regard).
- **Cache bust** : `20260606d`

### Completed — Véhicules + barrières (2026-06-06)

- **`public/js/vehicles.js`** : système centralisé de carcasses (`WRECKS`) placées via `RoadNetwork.sampleAlong`.
- **`B.carcass()`** : rouille, inclinaison, pneus manquants, carrosserie calcinée.
- **Nettoyage secteurs** : suppression de ~50 `B.car()` éparpillés (S01–S03, parkings, immeubles).
- **Barrières autoroute** : poteaux en continu le long de la polyligne ; rails alignés en 3D (quaternion) entre poteaux.
- **Fix S05** : `mg` non défini dans `_buildVehicles` après refactor.
- **Cache bust** : `20260606c`

### Completed — RCON menu mobile + auth admin (2026-06-05)

- **`GET /api/auth/me`** — statut admin au chargement jeu.
- Login/register → `isAdmin` + `localStorage.zombie_is_admin`.
- Menu ☰ → « Console dev » câblé dans `game.js`, visible pour `ADMIN_USERS`.
- **Cache bust** : `20260605t`

### In Progress — World polish (Phase 2+)

- Grille rues S02/S03 dans `RoadNetwork`.
- Plus de variantes véhicules (bus, camions) dans `vehicles.js`.
- Manual test: spawn trail → town junction, highway, barrières virages, FPS mobile.
