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
| Changement JS client | **apps/client/public/client-version.json** → incrémenter `version` |

Index complet : [README.md](README.md#documentation-à-lire-avant-un-push--review)

### Completed — zone feu intro dynamique (2026-06-11)

- **Cause** : beat torche / `need_campfire_beat` validaient encore `INTRO_ZONE_CAMPFIRE` fixe (252, -7.6) alors que le décor `spawn_beach_campfire_ring` avait été déplacé en admin.
- **Fix** : `resolveIntroCampfireZone` + `inIntroCampfirePickupZone` (shared) ; serveur lit `decorItems` et l’`id` envoyé par le client au pickup ; `beatTriggeredByPosition` accepte override zone campfire.
- Tests : décor déplacé accepté au nouveau centre, anciennes coords rejetées.

### Completed — fix ramassage torche intro (2026-06-11)

- **Cause** : `cloneInv`/`normalizeInv` supprimaient `scenario` → `pickedTorch` jamais sync client ; zone feu validée sur position serveur en retard.
- **Fix** : conserver `scenario` dans l'inv authoritatif ; client envoie x/z au pickup ; zone veilleuse élargie (4,5 m) ; merge beats optimiste.
- Version client : `20260611-torch-pickup-sync-fix`.

### Completed — correctifs Bugbot intro (2026-06-11)

- Sync `introBeats` via `mergeServerScenario` dans `applyAuthoritativeInv` ; debug snapshot utilise le même chemin.
- Messages torche : `need_campfire_beat` ; plus de re-émission `introBeat: campfire` après ramassage.
- Version client : `20260611-bugbot-intro-fixes`.

### Completed — veilleuse torche après scenario-reset (2026-06-11)

- **Cause** : reset scénario sans vider l'inventaire intro → torche masquée côté client ; beats `footprints`/`campfire` non déclenchés → `pickup_failed`.
- **Fix** : `scenario-reset` retire caillou/torche/nourriture intro + sync inv ; beats auto à la veilleuse si caillou en poche ; `syncIntroCampfireTorchVisibility` sur inv/scénario/décor.
- Version client : `20260611-campfire-torch-reset-fix`.

### Completed — caillou intro visible au réveil (2026-06-11)

- **Cause** : crépuscule trop sombre (`BEACH_INTRO_GOLDEN_TIME` 0.245), caillou loin (2,6 m), aucune consigne au réveil.
- **Fix** : lumière matinale 0.31 ; caillou à 1,75 m + halo/beacon ; textes réveil + hint E ; caméra vers le caillou tant qu'il n'est pas ramassé.
- Version client : `20260611-intro-rock-visibility`.

### Completed — veilleuse feu de camp intro (2026-06-11)

- **Cause** : retrait de la torche intégrée au cercle `spawn_beach_campfire_ring` — plus de flamme ni lumière ; torche personnelle parfois absente.
- **Fix** : torche allumée de nouveau dans le prefab veilleuse ; ramassage E via zone feu (`onTorchCampfirePickup`) sans décor personnel dupliqué ; masquage local après pickup.
- Version client : `20260611-campfire-torch-fix`.

### Completed — proue canot sauvetage (2026-06-11)

- **Fix** : cône de proue `spawn_beach_boat_hull` orienté vers l'avant (`rotation.z = -π/2`).
- Version client : `20260611-boat-hull-bow-fix`.

### Completed — fix torche intro veilleuse (2026-06-11) — remplacé

- Approche torche personnelle seule → régression veilleuse vide. Voir **veilleuse feu de camp intro** ci-dessus.

### Completed — épave bateau sur récif (2026-06-11)

- **Bateau au large** : récif visible + coque inclinée, proue écrasée, brèche flanc, mât cassé, débris flottants.
- Version client : `20260611-offshore-wreck-rock`.

### Completed — crabes plage (fuite + densité) (2026-06-11)

- **14–24 crabes** sur le sable (tailles/couleurs variées, pinces animées).
- **Fuite** à ~4 m du joueur — course paniquée, pattes qui battent, réinstallation plus loin.
- Version client : `20260611-beach-crabs-flee`.

### Completed — mouettes au sol plage (2026-06-11)

- **Mouettes au sol** : 6–11 sur le sable, s'envolent à ~6 m du joueur, vol en arc ~4–8 m, atterrissage ailleurs sur la plage.
- **Audio** : petit cri au décollage (`scatterSeagull`).
- Version client : `20260611-beach-ground-gulls`.

### Completed — bateau au large intro (2026-06-11)

- **Épave offshore** : prefab `spawn_beach_offshore_wreck` en eau (318, -7.4) — bateau de l'accident visible depuis le réveil.
- **Canot** : `spawn_beach_boat_hull` reste le canot de sauvetage sur le sable.
- **Caméra intro** : regard vers le bateau au large + monologue court (infection à bord).
- **RCON** : `decorseed beach reset` inclut aussi les props intro (offshore).
- Version client : `20260611-offshore-wreck-intro`.

### Completed — plage vie + repère + golden hour (2026-06-11)

- **Repère** : coque `spawn_beach_boat_hull` seedée au réveil (292, -7.1) — visible depuis le cluster intro.
- **Vie** : `beach_ambient_life.js` — mouettes (billboards), crabes marée, brise herbe procédurale.
- **Audio** : cris mouettes synthétiques sur plage (`Audio.tickBeachLife`).
- **Golden hour** : lumière figée ~0.245 jusqu’à l’étape `walk_west` (`world.js` + `spawn_scenario.js` + `spawn_intro.js`).
- Version client : `20260611-beach-life-golden-hour`.
- **Appliquer** : Ctrl+F5 + `decorseed beach reset`.

### Completed — plage immersion décor (2026-06-11)

- **4 scènes seed** : réveil (bouée, pêche), piste (snorkel, picnic), veilleuse (lanterne, BBQ), ponton (canoë, paddle, barrières) — `beach-immersion-placements.mjs` (17 prefabs).
- **Palmiers** : 3 bosquets N/S/O (`palm-placements.mjs`) au lieu d’une grille uniforme.
- **Procédural** : ligne de marée + micro-décor zone réveil (`beach_decor.js`).
- **RCON** : `decorseed beach [reset]` inclut props base + immersion.
- Version client : `20260611-beach-immersion-decor`.

### Completed — accroupi PC : touche C (Ctrl+W Chrome) (2026-06-11)

- **Cause** : Chrome réserve **Ctrl+W** — JavaScript ne peut pas l’intercepter (contrairement à Firefox).
- **Fix** : accroupi PC = **C** en toggle (1× accroupi, 2× debout) · mobile inchangé (bouton ⬇).
- Version client : `20260611-crouch-toggle-c`.

### Completed — garde raccourcis navigateur en jeu (2026-06-11)

- **Garde** : F5, Ctrl+R, Alt+←/→, etc. via `browser-shortcuts-guard.js` (raccourcis onglets exclus — non bloquables).
- Version client : `20260611-browser-shortcuts-guard`.

### Completed — F8 : Calibrages UI sans doublon décor (2026-06-11)

- **Calibrages** renommé **Calibrages UI** (menu F8 + vue interne) — poses FPS / viewmodels uniquement.
- **Édition décor monde** retirée du registre `ZS.Calibration` ; chemin unique F8 → Monde & décor → Édition décor live.
- **F8** ferme aussi l’éditeur décor actif (plus via le registre calibrages).
- Version client : `20260611-calibrages-ui-only`.

### Completed — F8 : édition décor unifiée (2026-06-11)

- **Supprimé** : carte racine « Édition monde (E) », entrée Calibrages dupliquée, bouton Monde « Catalogue prefabs » (`admin-prefab-catalog-overlay.js` retiré du bundle).
- **Unique chemin** : F8 → Monde & décor → **Édition décor live** (catalogue, pose, E, sync).
- **Fix** : `prefab-catalog-preview.js` ne remplace plus `ZS.Network` entièrement (évitait crash `Network.tick` si overlay chargé).
- Version client : `20260611-f8-decor-live-unified`.

### Completed — fix crash ZS.Network.tick (2026-06-11)

- **Fix** : boucle jeu protégée si `tick` absent (cache client stale) · export réseau merge-safe · `loadScript` ne recharge plus network/game.
- Version client : `20260611-network-tick-fix`.

### Completed — pointer lock : erreurs console (2026-06-11)

- **Fix** : promesse `requestPointerLock` capturée, plus de re-lock auto hors clic (fermeture panneau / touche E), `SecurityError` silencieux.
- Version client : `20260611-pointer-lock-fix`.

### Completed — accroupissement joueur (2026-06-11)

- **PC** : **C** toggle accroupi (1× s'accroupir, 2× se relever) — Ctrl+W réservé par Chrome.
- **Mobile** : bouton **⬇** à droite (toggle) — vitesse réduite, caméra plus basse, sync multijoueur.
- Fichiers : `player_stance.js`, `player-stance.mjs`, `game.js`, `ui.js`, `network.js`, `style.css`.
- Version client : `20260611-player-crouch`.

### Completed — carte admin : double-clic TP (2026-06-11)

- **Fix** : clics sur la carte n'activent plus le pointer lock jeu — dbl-clic vide = TP fonctionne.
- Version client : `20260611-admin-map-dblclick`.

### Completed — éditeur décor : ciblage E (2026-06-11)

- **Fix** : E sélectionne à nouveau le décor visé — pick prioritaire sur la rotation en mode pose, visée souris sans pointer lock, `decorId` sur tous les meshes, pas de conflit inventaire.
- Version client : `20260611-decor-editor-pick-e`.

### Completed — toolkit admin tier 6 (2026-06-11)

- **Lot décor** : déplacement visuel groupé · nudge X/Z ±0,5 m · undo/redo lot (`batch_patch`).
- **Redo** : Ctrl+Y / bouton — pile redo couplée à l'undo (patch, storage, delete, lot).
- **Annonces** : `POST /api/admin/announce` + F8 Monde (`admin-server-announce.js`).
- **Carte** : clustering arbres/rochers au zoom faible · profils filtres sauvegardables (`admin-map-presets.js`).
- **Recherche** : ouvre la carte + pulse si fermée.
- Version client : `20260611-admin-toolkit-tier6`.

### Completed — toolkit admin tier 5 (2026-06-11)

- **Éditeur** : Ctrl+C/V copier-coller décor · Shift+E sélection multiple · suppression lot · snap rotation 15° · onglet Historique session.
- **Recherche** : pulse carte sur TP/éditer (si carte ouverte).
- **F8** : flags serveur live (`POST /api/admin/server-flags`) — zombies, loot, PvP, autoDay.
- Version client : `20260611-admin-toolkit-tier5`.

### Completed — toolkit admin tier 4 (2026-06-11)

- **Zones monde** : plage safe (contour cyan) + exclusions build POI/bouche sentier (rouge) · panneau couches · POI cabin01 sync `s01_bounds.js`.
- **Signets TP** : `admin-tp-bookmarks.js` — F8 Monde + éditeur décor · localStorage · max 24.
- **Coffre admin** : PATCH `clearStorage` / `storage[]` · boutons Vider / Loot test · undo coffre.
- **Undo** : pile 10 actions (create/delete/patch/storage).
- Version client : `20260611-admin-toolkit-tier4`.

### Completed — toolkit admin in-game tier 1–3 (2026-06-11)

- **Éditeur décor** : duplication (preview violette) · rotation Q/E · onglet **Chercher** (`GET /api/admin/decor/search`) · undo Ctrl+Z (`admin-decor-undo.js`, `POST /api/admin/decor/restore`) · inspecteur coffre lecture seule.
- **F8 Monde** : catalogue prefabs in-game (`admin-prefab-catalog-overlay.js`) · heure/cycle (`admin-world-time.js`, `GET/POST /api/admin/world-time`) · zones secteurs au sol (`admin-zone-overlay.js`) · mode vol V (`admin-fly.js`).
- Version client : `20260611-admin-toolkit-full`.

### Completed — carte admin in-game + filtres (2026-06-11)

- **F8 → Monde → Carte monde** : overlay plein écran (`admin-world-map-overlay.js`), réutilise `admin-world-map.js`.
- **Filtres** : arbres, palmiers, rochers, barrières, camp, items, other masqués par défaut ; compteur par couche + cap affichage 4000 pts.
- **Actions** : dbl-clic vide = TP · clic marqueur = Y aller / Éditer décor · centrer sur joueur.
- Version client : `20260611-admin-map-ingame`.

### Completed — admin téléportation « Aller ici » (2026-06-11)

- **T** (réticule verrouillé) ou bouton F8 → Monde / éditeur décor — TP sous le réticule via `POST /api/admin/teleport-here`.
- Auth `decor.edit` ou `players.manage` · grace anti-speedhack `_tpGraceUntil`.
- Fichiers : `admin-go-here.js`, `index.js`, `admin-hub.js`, `admin-live-decor.js`.
- Version client : `20260611-admin-go-here`.

### Completed — éditeur décor : déplacement visuel (2026-06-11)

- **Modifier** → bouton **Déplacer visuellement** : l'objet d'origine est masqué, preview bleue sous le réticule pendant que l'admin se déplace ; clic gauche = PATCH position ; molette = rotation ; clic droit = annuler.
- Après validation → panneau Modifier pour affinage (curseurs fins).
- Version client : `20260611-decor-editor-move-visual`.

### Completed — éditeur décor : catalogue + pose in-game (2026-06-11)

- **Catalogue** dans l’éditeur décor (F8 → Calibrages → Édition décor monde) : recherche, filtre catégorie, liste prefabs depuis `/api/admin/prefab-catalog`.
- **Preview** fantôme sous le réticule (raycast terrain) ; molette = rotation ; clic gauche = pose ; clic droit = annuler.
- **API** `POST /api/admin/decor` — création prefab live (sync `decor-item-spawn`).
- **Suppression** depuis l’onglet Modifier (permission `decor.delete`).
- Fichiers : `admin-live-decor.js`, `admin-decor-ops.js`, `world.js` (`raycastViewToGround`), `game.js`, `index.js`.
- **Doc** : `docs/RCON.md` (POST + workflow in-game), `docs/ARCHITECTURE.md`.
- Version client : `20260611-decor-editor-place-catalog`.

### Completed — éditeur décor : curseurs fins (2026-06-11)

- **Bug** : barres X/Z sur ±500 m → un pixel de curseur téléportait l'objet.
- **Fix** : fenêtre fine centrée sur la valeur (±4 m X/Z, ±2 m Y, etc.) · champ numérique pour coord exacte.
- **Client version** : `20260611-decor-editor-fine-sliders`.

### Completed — calibrage FPS unifié (dropdown interne) (2026-06-11)

- **UX admin** : une seule carte F8 « Calibrage FPS — bras & items » au lieu de 30+ menus.
- **Tuner** : menu déroulant par catégorie (référence, outils, mêlée, nourriture…) dans le panneau · `switchProfile` sans fermer.
- **Client version** : `20260611-fps-tuner-unified`.
- **Doc** : `docs/RCON.md` (hub calibrages), `fps_grip_calibration.js` catalogue grips.

### Completed — catalogue calibrages FPS tous items (2026-06-11)

- **Catalogue** : `fps_grip_calibration.js` — 30+ grips (outils, mêlée, nourriture, médical, armes) dérivés des poses validées (hachette / main vide / caillou).
- **Dérivation** : bras 1 main ← hachette > main vide > torche · bras 2 mains ← caillou · item sibling (`hache_pierre` ← hachette, etc.).
- **Admin F8** : calibrages groupés par catégorie, filtre recherche, bouton « Générer dérivés manquants ».
- **Live** : `loadFPSValidatedPoses` charge toutes les clés `zs_arm_tune_*` + legacy.
- **Client version** : `20260611-fps-grip-catalog`.

### Completed — tuner FPS : import bras entre presets (2026-06-11)

- **Bug** : charger preset « main vide » sur profil hachette ne positionnait pas les bras (`_applyGripPose` procédural écrasait la pose directe).
- **Fix** : `_FPS_GRIP_CHAIN_POSES` pour outils 1 main · `applyFPSGripTuneToArms` via pose directe · merge presets copie toujours les sections bras · boutons « Bras du preset » et « Copier bras validés ».
- **Client version** : `20260611-tuner-preset-arms`.

### Completed — fix persistance arbres abattus (2026-06-11)

- **Bug** : arbre coupé + disparu en session → au reload réapparaît debout ; un coup le fait tomber (serveur `woodRemaining=0`, client respawn debout).
- **Cause** : suppression serveur différée 90 s (`TREE_FALL_LINGER_MS`) avec persistance `woodRemaining=0` / `falling` entre-temps.
- **Fix** : delete DB + `removedSeedKeys` immédiat à l'abattage ; purge au boot ; filtre game-init / decor-trees / spawn client (`isFelledTreeDecor`).
- **Client version** : `20260611-tree-fell-persist`.

### Completed — fix anim caillou 2 mains (2026-06-11)

- **Bug** : pose calibrée OK au repos, mais `rock_slam` (et idle/marche) repassaient sur l’ancienne pose procédurale (`inGameplayAnim` bloquait `_FPS_TWO_HAND_POSES`).
- **Fix** : `_applyTwoHandGripVisual` — pose validée toujours en base ; offsets d’anim (`rArm`/`lArm`/`item`) appliqués par-dessus via `_applyChainAnimOffset`.
- **Client version** : `20260611-caillou-anim-pose`.

### Completed — calibrage caillou 2 mains (2026-06-10)

- **Fix** : pose bras D/G appliquée directement (plus écrasée par `_applyGripPose`).
- **Tuner** : sections bras gauche (`lShoulder`…), MC complets (PostY, RotZ, WristX, ElbowY…), centre + échelle caillou.
- **Client version** : `20260610-caillou-2mains-tuner`.

### Completed — dashboard joueurs UX rapide (2026-06-10)

- **Joueurs F8** : cartes cliquables, recherche instantanée, barre HP, panneau d’actions (amener / aller / soigner / expulser / copier pos).
- **API** : `POST /api/admin/players/:username/action` (`bring`, `goto`, `heal`, `kick`, `tp`).
- **Onglets** : En ligne + Rôles dans la même vue joueurs (panel élargi).
- **Hub** : pill « X en ligne », descriptions raccourcies, rôles déplacés dans Joueurs.
- **Client version** : `20260610-admin-players-ux`.

### Completed — système rôles CMS admin (2026-06-10)

- **Shared** : `packages/shared/src/roles.mjs` — rôles (`owner`, `super_admin`, `admin`, `moderator`, `builder`, `tester`, `player`), permissions granulaires, règles d'attribution.
- **Serveur** : table `player_roles`, module `player-roles.js`, APIs `GET/PUT/DELETE /api/admin/roles`, auth par permission sur routes admin + RCON (`rcon.dangerous` pour wipe/kill/clearzombies).
- **Env** : `OWNER_USERS` (+ `ADMIN_USERS` rétrocompat) = propriétaires non rétrogradables.
- **Client** : `admin-auth.js`, `admin-roles.js`, hub F8 filtré par permissions, badges rôle joueurs, sync socket `admin-role-update`.
- **Tests** : `tests/roles.test.mjs`.
- **Docs** : `docs/RCON.md`, `.env.example`.
- **Client version** : `20260610-admin-roles`.

### Completed — workflow IA questionnaire (2026-06-09)

- **Doc** : `docs/AI_WORKFLOW.md` — mode question/réponse à choix multiples (+ « Autre ») quand l’IA a un doute de design.
- **Règle Cursor** : `.cursor/rules/ai-questionnaire.mdc` (always apply).
- **Renvois** : `CLAUDE.md`, `CONTRIBUTING.md`.
- **Décision Bruno (Q1)** : pas de kit magique ; loot départ **propre à chaque joueur**.
- **Q2 spawn** : offset aléatoire plage (`pickBeachSpawn`) + **écart min 8–12 m** entre joueurs connectés simultanément.
- **Q2 items** : kit complet au sol près du spawn perso — caillou, torche, eau, sandwich.
- **Q2 visibilité** : terme retenu **« loot personnel »** — **tout le monde voit** les props de chaque joueur ; **seul le propriétaire** peut ramasser (read-only pour les autres). Pas d’instancing invisible.
- **Q3 décor** : **D1** — débris / affaires / bois flotté = **décor monde unique** ; seuls les **4 items kit** sont loot personnel par joueur.
- **Q3 moment** : scénario **intuitif et forcé** pour ramasser les 4 objets + **tuto interfaces** (inventaire, menus…) en parallèle du ramassage.
- **Q4 parcours** : **F3** — mini chemin 10–15 m, 1 objet + 1 leçon UI par stop.
- **Q4 UI** : ramassage (E), hotbar, inventaire, équiper, consommer faim/soif.
- **Q5 ordre** : **O1** caillou → torche → eau → sandwich.
- **Q5 leçons** : **L1** (mapping stop ↔ UI ci-dessus).
- **Spec** : `design/secteur/INTRO_BEACH_PLAYER.md`.
- **Brique 1 implémentée** : inventaire vide si intro · `ownerPlayerId` pickup serveur + client · spawn plage espacé (`pickBeachSpawnAwayFrom`, 10 m) · `playerId` dans `game-init`.
- **Client-version** : `20260609-intro-b1-loot-357`.
- **Brique 2 (partiel)** : spawn loot personnel intro — 4 objets séquentiels (caillou→torche→eau→sandwich) près du spawn ; décor monde (rochers) toujours non ramassable.
- **Client-version** : `20260609-intro-b2-starter-358`.

### Proposition — intro plage v3 « Épaves et empreintes » (2026-06-09)

- **Problème Bruno** : v2 trop directe (objets à la suite) — besoin d’**intrigue / mission**.
- **Doc** : `design/secteur/INTRO_BEACH_SCENARIO_V3.md` — 4 séquences, déclencheurs par **zone + lecture**, pas par pickup ; piste ~40–55 m ; mystère « K. » ; 6 prefabs proposés.
- **Validé Bruno** : ton **mystère** · rythme **court** (~8 m + 1 indice avant caillou) · indices **monde unique** · **K. = PNJ forêt** plus tard.
- **Implémenté** : beats zones + lecture (`intro-beach-beats.mjs`) · seed monde `beach_intro_v3` (4 prefabs) · prefabs client `beach_intro_prefabs.js` · catalogue + orientation · sortie plage (`trail_exit` → `read_exit_sign` → panneau) · tests.
- **Client-version** : `20260609-intro-v3-beats-360`.
- **Fix spawn vide (Bruno)** : spawn intro limité au cluster près de `BEACH_SPAWN` (`pickBeachSpawnForIntro`) · snap si position sauvegardée loin · beat `footprints` + caillou au connect dans la zone · empreintes agrandies · seed intro au connect si manquant.
- **Client-version** : `20260609-intro-v3-spawn-fix`.
- **Fix respawn caillou** : `ensure(p, socket)` au respawn intro · restauration loot personnel selon beats après clear · caillou ~3 m devant le joueur si respawn loin de la piste fixe.
- **Fix piste ponton/valise** : bouteille ne spoil plus la valise · toasts direction ouest · poteaux balise + ponton/feu agrandis · valise spawn toujours après beat veilleuse (zone feu).
- **Client-version** : `20260609-intro-v3-trail-vis`.
- **UX intro Bruno** : regard au réveil → caillou 2,6 m devant · bouteille reculée sur la piste · torche allumée intégrée au cercle de pierres (veilleuse visible) · ponton = planches basses · pickup torche au centre du cercle.
- **Client-version** : `20260609-intro-v3-ux-rock-torch`.
- **Fix torche intro** : zone veilleuse élargie (r 11) · torche ramassable décalée + halo orange · re-spawn si beat campfire sans item · portée ramassage intro 3,2 m.
- **Client-version** : `20260609-intro-v3-torch-pickup`.
- **Fix valise intro** : spawn à la prise de torche + zone ponton élargie · valise sous l'épave (halo doré) · re-spawn si beat pier sans décor.
- **Client-version** : `20260609-intro-v3-suitcase-fix`.

### Audit S02 / Georges (2026-06-09)

- **`origin/dev`** : pas de push récent Georges — toujours 2 maisons (`smallcity_house_a/b`), pas de `house_c`.
- **Pharmacie / police / supermarché** : déjà dans `sector_02_town.js` (code local), mais **non chargé** en jeu → corrigé : `sector_02_town.js` dans `legacy-modules.js` + `registerSector` accepte les secteurs non-spawn.
- **Catalogue prefabs bâtiments** : `building_survivor_shack`, `smallcity_house_a`, `smallcity_house_b` — commerces S02 = meshes secteur (pas prefabs RCON).
- **Checklist intégration `smallcity_house_c`** (quand Georges pousse) : prefab dans `spawn_clearing.js`, colliders `decor_colliders.js`, META `decor-prefab-catalog.mjs`, portes serveur `DOOR_PREFABS`, test catalogue, placement `_buildHouses` S02.
- **Client-version** : `20260609-s02-town-wire`.

### Completed — intro plage v2 narrative (2026-06-09)

- **Parcours 3 étapes** : caillou au sol devant soi → torche allumée (prefab `spawn_beach_starter_torch` + ramassage) → valise échouée (`spawn_beach_starter_suitcase`, eau + sandwich dedans).
- **Réveil** : caméra orientée vers le caillou en se relevant + bulle RP (`intro_starter.js`).
- **Loot conteneur** : bouton **Tout prendre** dans `storage_ui` ; surplus tombe au sol si inventaire plein (`storage-take-all`).
- **Prefabs** : `beach_starter_prefabs.js` — feu animé (nuit) + valise surbrillance légère.
- **Serveur** : décor intro personnel (`introStarterDecor`, `ownerPlayerId`) ; valise vide = étape suivante / fin kit.
- **Tests** : `intro-starter-loot.test.mjs` (3 steps + yaw caillou).
- **Client-version** : `20260609-intro-v2-starter-359`.

### Completed — retours playtest intro (Bruno, 2026-06-09)

- **Écran mort PC** : curseur visible (`death-screen-open`, exit pointer lock) — plus besoin d'Échap pour cliquer Respawn.
- **Acte 2/3 au réveil** : respawn intro admin → spawn fixe `BEACH_SPAWN` + ancre scénario (`anchorX/Z`) pour breathe/explore (plus de skip si spawn aléatoire loin du ref).
- **HUD intro** : plus de guidage exploration (pas de « Va vers l'intérieur » / flèche) — HUD uniquement combat `fight` + loot ; repositionné en bas à droite (ne cache plus les PV).
- **Client-version** : `20260609-intro-ux-fixes-356`.

### Completed — simulation parcours joueur spawn → 1er gap (2026-06-09)

- **Pause catalogue prefabs** (#15 trail post, etc.) — reprise en mode parcours joueur depuis `intro_wake`.
- **Simulation** (coords + `checkPositionAdvance`) : spawn `(248,-8)` → réveil → breathe → explore → walk_west…
- **Props seed** : débris 5,8 m est · affaires 4,4 m · driftwood 7,8 m · panneau/torche ~5,5 m · bouche sentier 6 m — **tous &lt; 15 m** du spawn.
- **1er élément à améliorer** : étape **`explore`** (`EXPLORE_MIN_DIST=15`) — ne pilote pas vers les props ; fin explore à l’ouest (`x≤233`) saute quasi immédiatement en `silhouette` (`WALK_WEST_X=236`). Prochaine action = revoir la mécanique explore (jalons / distance / ordre), pas un nouveau prefab.

### Completed — panneau outils admin in-game (2026-06-09)

- **Menu hamburger admin** : « Outils admin » ouvre un panneau dédié (`admin-panel.js`) — extensible pour d'autres réglages de test.
- **Section Scénario** : toggle « Reset intro à chaque respawn » + bouton « Réinitialiser l'intro maintenant » (warning → mort sur place → respawn plage naturel).
- **Comportement** : toggle = préférence seule ; reset immédiat via `admin-intro-reset-now` (kill authoritaire + `adminIntroResetOnRespawn`).
- **Persistance locale** : `localStorage` `zs_admin_intro_reset_on_respawn`.
- **Client-version** : `20260609-admin-panel-354`.

### Completed — catalogue prefabs admin auto-sync (2026-06-09)

- **URL** : `/prefab-catalog.html` — réservée aux comptes admin (même auth JWT que WebRCON).
- **API** : `GET /api/admin/prefab-catalog`.
- **Auto-discovery** : `packages/shared/src/decor-prefab-discover.mjs` scanne `DECOR_PREFABS` + `registerDecorPrefab()` dans `apps/client/public/js` — **nouveau prefab = catalogue + RCON sans liste manuelle**.
- **Sync client** : event `decor-prefab-registry` (labels `def.label` via `ZS.getDecorPrefabMeta()`).
- **Métadonnées optionnelles** : `DECOR_PREFAB_META` dans `decor-prefab-catalog.mjs` (prioritaire sur l’inférence auto).
- **Tests** : `tests/decor-prefab-catalog.test.mjs`.
- **Aperçu 3D** : vignettes + modal interactif (`prefab-catalog-preview.js`) — rendu via `ZS.spawnDecorPrefab`.
- **Modal 3D v2 (2026-06-09)** : clic sur miniature → popup avec OrbitControls (rotation souris, zoom molette), recentrage, copie RCON, description/catégorie ; OrbitControls via importmap local (plus unpkg dynamique).
- **Fix aperçu catalogue** : cache-bust JS legacy via `client-version` (`?v=…`), `window.THREE = THREE` (namespace complet), message d’erreur explicite si prefab absent du client.
- **Prefab #1 catalogue enrichi** : `spawn_cabin_table` — table rustique cabane (textures `tableTop`/`tableLeg`, collider, mesh `_buildCabinTable`).
- **Prefab #2 catalogue** : `spawn_cabin_chair` — chaise bois assortée (réutilise textures table, mesh `_buildCabinChair`).
- **Prefab #3 catalogue** : `spawn_cabin_shelf` — étagère 3 niveaux + fond lattes, conserve/bocal décor (`_buildCabinShelf`).
- **Orientation prefabs** : `decor-prefab-orientation.mjs` + `docs/DECOR_PREFAB_ORIENTATION.md` — convention −Z, repères cabane/table/chaise/étagère/lit/coffre ; colonne **Orientation** catalogue admin + modale 3D.
- **Prefab #4 catalogue** : `spawn_cabin_stove` — poêle fonte + porte vitrée −Z, conduit +Z (`stoveBody`/`stoveDoor`, `_buildCabinStove`).
- **Poêle feu actif** : `ZS.attachStoveFire` (campfire.js) — flammes billboards + PointLight pulsée dans la vitre.
- **Aperçu catalogue animé** : `prefab-catalog-preview.js` — hooks `registerFireLight` / `registerBillboards` locaux, tick feu + billboards en modale et vignettes (feu de camp, poêle, torche plage, etc.) ; scène assombrie pour prefabs lumineux.
- **Prefab #5 catalogue** : `spawn_cabin_lantern` — lanterne suspendue chaîne + cage métal/vitre, `ZS.attachLanternFlame` (flammes + lueur).
- **Prefab #6 catalogue** : `spawn_cabin_wood_box` — caisse à bûches intérieur (bac bois, rondins, hache) — assortie poêle cabane.
- **Prefab #7 catalogue** : `spawn_cabin_rug` — tapis tissé laine (texture `cabinRug`, bordure, franges, bande −Z).
- **Prefab #8 catalogue** : `spawn_cabin_bench` — banc mural v2 : cleat mur + boulons, assise 3 planches, cubby bottes, dossier incliné, couverture.
- **Prefab #9 catalogue** : `spawn_cabin_basin` — lavabo cabane v2 : cuvette porcelaine encastrée, eau disque opaque (fix shimmer), robinet fer, sans barre métal traversante.
- **Prefab #10 catalogue** : `spawn_cabin_wall_clock` — horloge pendule murale, aiguilles dynamiques (`world_clock.js` + `worldTime`). Validé sens horaire ; doc complète : `docs/WALL_CLOCK.md` (pièges double minute, wrap 59→0, trio π/angles+/delta−).
- **Prefab #11 catalogue** : `spawn_cabin_coat_rack` — porte-manteau planche + patères, veste/casquette/écharpe.
- **Prefab #12 catalogue** : `spawn_beach_wreck_debris` — débris naufrage plage (planches, corde, filet, caisse) · catégorie admin `plage` · parcours joueur spawn rivage.
- **Prefab #13 catalogue** : `spawn_beach_washed_gear` — affaires échouées (sac, gourde, sandale, casquette) · étape « Explore le rivage ».
- **Seed plage spawn** : `beach-prop-placements.mjs` — débris + affaires + bois flotté bouche sentier · `decorseed beach` · `BEACH_SPAWN_PROPS`.
- **Prefab #14 catalogue** : `spawn_beach_driftwood` — rondin échoué repère vers sentier forêt.
- **Hub admin** : menu hamburger / sidebar — sections **Catalogue** + **Carte monde** (`/admin.html` alias).
- **Carte admin** : `GET /api/admin/world-map` + `admin-world-map.js` — zoom/pan, filtres couches, tooltip (pos exacte, seed, `decorremove`).
- **POI précis** : `admin-map-pois.mjs` — positions live serveur > seed S01 ; marqueurs rétrécissent au zoom + réticule précision.
- **Édition décor carte** : clic POI → panneau admin (`PATCH /api/admin/decor/:id`) — position, rotY, scale, épave, ancre coffre ; persist + sync in-game.
- **Carte admin zoom/POI** : zoom max 3600% ; seeds plage (panneau + torche) + coffre cabane en couches dédiées (stockage/signalisation) ; arbres/rochers/barrières masqués par défaut (plus en couche POI-live).
- **Sac de couchage cabane S01** : texture ripstop v2 ; seed cabane remplacé par **lit** `spawn_single_bed` (`s01-cabin01-bed.mjs`, coin NO).
- **Statique carte** : `packages/shared/src/admin-map-static.mjs` (secteurs, routes, POI S01).
- **Doc** : `docs/RCON.md`.

## Checklist PR (pour les collègues)

Copier dans la description de PR :

- [ ] **DEV_TRACKER.md** mis à jour (date + résumé)
- [ ] **Docs techniques** mises à jour si le comportement/config change
- [ ] **`.env.example`** à jour si nouvelles variables
- [ ] **`client-version.json`** à jour si JS/CSS client modifié
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

## 2026-06-07

### Docs — Workflow Git équipe + règles IA (2026-06-09)

- **IA** : `.cursor/rules/git-team-workflow.mdc` — pull début/fin session, fusion S01+S02, interdits
- **Humain** : `docs/GIT_WORKFLOW.md` — procédure Bruno+Georges, conflits, checklist push
- **Index** : `docs/README.md`, `studio-workflow.mdc` pointe vers les deux

### Fix — Restauration bounds S02 (Georges) fusionné avec S01 (2026-06-09)

- **Cause** : `sector-bounds.mjs` réduit à S01 seul dans cf49bd8 — passage serveur vers petite ville bloqué
- **Fix** : `SECTOR_02`, `PLAYABLE_AREAS`, couloir `s01_s02_corridor` restaurés (version d1aca90 Georges)
- **Règle** : `.cursor/rules/studio-workflow.mdc` — fusion Bruno+Georges, ne jamais écraser
- **Tests** : `sector-bounds.test.mjs` — redémarrer serveur après deploy shared

### Ajust — Coffre cabane #1 écart mur coin NE (2026-06-09)

- **Placement** : `WALL_CLEARANCE` 0.06 → 0.10 — local `(1.64, 1.36)` (+4 cm vers intérieur)
- **Playtest** : redémarrer serveur + `decorseed s01 reset` + Ctrl+F5

### Fix — Interaction coffre à travers murs cabane (2026-06-09)

- **Cause** : `hitDecorStorageRay` ne testait que les meshes coffre — le rayon traversait les murs shack
- **Client** : `_interactRayOccluded` — `hasHeadLineOfSight` + colliders décor avant le coffre (murs shack inclus)
- **Version** : `20260609-chest-los-309` — Ctrl+F5

### Completed — Raccourcis bureau serveur local (2026-06-09)

- **Scripts** : `tools/desktop/zs-server-{start,stop,restart}.bat` — Node 20 nvm, port 3000
- **Bureau** : `ZS - Demarrer serveur`, `ZS - Arreter serveur`, `ZS - Redemarrer serveur` (`.lnk`)
- **Regenerer** : `powershell -File tools/desktop/create-desktop-shortcuts.ps1`

### Completed — Cabane #1 loot coffre intérieur (2026-06-08)

- **Seed** : `s01:cabin01:chest` — `storage_chest` @ local `(0, 1.0)` face porte ; loot `S01_CABIN_CHEST_LOOT`
- **Shared** : `s01-cabin01-chest.mjs` ; `shackFloorY` + `shackAnchor` pour baseY sur dalle cabane
- **Exclusion build** : `cabin01` @ `(165.1, 7.1)` rayon 10 m
- **Version** : `20260608-cabin01-chest-302` — playtest Bruno coffre

### Fix — Coffre cabane invisible (2026-06-08)

- **Cause** : serveur non redémarré après ajout du seed → SQLite n’avait que `s01:cabin01:shack` (1 row)
- **Client** : `_resnapS01Decor` écrasait la hauteur du coffre avec le terrain au lieu de `shackAnchor` + `shackFloorY`
- **Shared** : `S01_CABIN01_PROTO` déplacé dans `s01-poi.mjs` (casse import circulaire placements ↔ chest)
- **RCON** : `decorseed s01 [reset]` pour reseeder sans reboot complet
- **Version** : `20260608-cabin01-chest-303` — redémarrer serveur + Ctrl+F5

### Fix — Orientation coffre cabane #1 (2026-06-08)

- **rotY local** : `Math.PI` — devant mesh vers porte sud (fond nord cabane)
- **Client** : `storage_chest` build réapplique `opts.rotY` sur le root (le seed seul ne pivotait pas le mesh)
- **Version** : `20260608-cabin01-chest-305` — `decorseed s01` + Ctrl+F5

### Fix — Orientation coffre v2 (2026-06-08)

- **Cause** : seed `shack.rotY + π` (≈3.69 en DB) — devant mesh (−Z) pointait vers le mur nord, pas la porte
- **Shared** : `cabin01ChestFaceDoorRotY()` — `atan2` vers pivot porte `SURVIVOR_SHACK_DOOR.pivotZ`
- **Client** : yaw sur le groupe mesh interne du coffre (`root.rotation.y = 0`), colliders via `_decorYawFromRoot`
- **Version** : `20260608-cabin01-chest-306` — `decorseed s01` + Ctrl+F5
- **Playtest** : ✅ orientation validée Bruno

### Fix — Interaction coffre vs porte par viseur (2026-06-09)

- **Cause** : `findNearestDecorStorage` prioritaire sur `findNearestDecorDoor` (proximité XZ)
- **Client** : `pickDecorInteractRay` / `hitDecorStorageRay` — mesh le plus proche sur rayon caméra
- **UI E** : mise à jour quand la caméra tourne (pas seulement déplacement joueur)
- **Verrou** : `installDoorLockOnAimedDoor` — porte sous le réticule
- **Version** : `20260608-interact-raycast-307`

### Décor — coffre cabane #1 coin nord-est (2026-06-09)

- **Placement** : `S01_CABIN01_CHEST_LOCAL` `(1.68, 1.40)` — coin fond + mur droit, 6 cm des murs intérieurs
- **Orientation** : toujours `cabin01ChestFaceDoorRotY()` (vise la porte depuis le coin)
- **Tests** : `s01-cabin01-chest.test.mjs` — clearance murs est/nord
- **Playtest** : redémarrer serveur + `decorseed s01` + Ctrl+F5

### Fix — building-debug cabane 9 colliders (2026-06-09)

- **Cause** : `SHACK_EXPECTED_COLLIDERS` restait à 5 (ancien palier pièces) alors que la cabane 7/7 en a 9
- **Client** : `building_debug.js` — `expected: 9`, hint vers `decor_colliders.js`
- **Version** : `20260608-shack-colliders-308`

### Docs — Placement décor S01 + coffre cabane (2026-06-09)

- **Guide** : `docs/S01_DECOR_PLACEMENT.md` — repère shack, rotY Three.js, `shackAnchor`/`shackFloorY`, pièges, checklist
- **Roadmap** : `design/secteur/S01_ROADMAP.md` — ancres validées cabane #1 + coffre
- **Index** : `docs/README.md`, `START_FOREST.md`, `ARCHITECTURE.md`, `RCON.md` (`decorseed s01`)
- **Outil** : `tools/check-s01-decor.mjs` affiche `rotY` + sanity check mur vs porte

### Completed — Hauteur porte small city (2026-06-08)

- **Porte** : vantail small city augmenté jusqu'au linteau pour supprimer le trou visible au-dessus.
- **Version** : `20260608-smallcity-door-height-284`

### Completed — Porte small city ouverte vers intérieur (2026-06-08)

- **Porte** : inversion du sens d'ouverture des entrées small city pour que le vantail s'ouvre vers l'intérieur de la maison.
- **Version** : `20260608-smallcity-door-inward-283`

### Completed — Alignement porte maisons small city (2026-06-08)

- **Porte** : vantail élargi et gond replacé sur le montant du cadre pour couvrir l'ouverture en position fermée.
- **Ouverture** : sens de rotation séparé pour entrée sud et entrée ouest afin que la porte s'ouvre/se ferme dans l'axe du passage.
- **Version** : `20260608-smallcity-door-swing-282`

### Completed — Interaction porte maisons small city (2026-06-08)

- **Client** : les portes small city assignent maintenant `doorPivot`, donc l'interaction `E` les détecte.
- **Serveur** : `smallcity_house_a/b` ajoutés aux prefabs de porte reconnus par `decor-door-toggle`.
- **Map** : maisons statiques S02 avec porte ouverte par défaut.
- **Version** : `20260608-smallcity-door-interact-281`

### Completed — Porte small city calquée building_survivor (2026-06-08)

- **Porte** : helper `_shackStyleDoor` basé sur la structure de porte `building_survivor_shack` (pivot, vantail, poignée).
- **Orientation** : porte placée en position fermée dans l'ouverture puis ouverte vers l'extérieur depuis son gond.
- **Version** : `20260608-smallcity-building-door-280`

### Completed — Porte maison alignée sur cabane (2026-06-08)

- **Porte** : pivot/gond et placement repris plus fidèlement de `building_survivor_shack`.
- **Alignement** : vantail centré dans l'ouverture avant rotation, puis ouvert depuis le montant.
- **Version** : `20260608-smallcity-shack-door-279`

### Completed — Porte maison inspirée cabane (2026-06-08)

- **Porte** : remplacement du panneau décalé par un vantail sur pivot, inspiré de `building_survivor_shack`.
- **Entrée** : porte placée dans l'ouverture, légèrement ouverte, sans bordure doublon.
- **Version** : `20260608-smallcity-shack-door-278`

### Completed — Porte visible + murs intérieurs complets (2026-06-08)

- **Porte** : ajout de vantaux ouverts plus visibles, avec matériau foncé et poignée.
- **Bordure** : suppression du petit cadre doublon autour de l'entrée.
- **Murs beiges** : cloisons intérieures prolongées jusqu'au plafond avec linteaux alignés.
- **Version** : `20260608-smallcity-door-wall-277`

### Completed — Entrée maisons Petite ville complétée (2026-06-08)

- **Entrée** : ajout d'une porte ouverte visuelle sur chaque modèle de maison.
- **Bordures** : cadres, seuils et linteaux renforcés autour des portes pour fermer les manques de mur.
- **Gameplay** : passage toujours non bloquant côté collisions.
- **Version** : `20260608-smallcity-entry-frame-276`

### Completed — Maisons Petite ville toit/sol/meubles (2026-06-08)

- **Toit** : ajout d'un plafond intérieur et de pans de toit plus larges pour supprimer l'ouverture visible.
- **Sol** : plancher renforcé + zones plates S02 sous les maisons statiques pour éviter la terre dans les pièces.
- **Objets** : sanitaires reculés/alignés pour ne plus traverser les murs.
- **Version** : `20260608-smallcity-floor-roof-275`

### Completed — Accès pièces maisons Petite ville (2026-06-08)

- **Intérieur** : cloisons segmentées avec passages ouverts entre salon, chambre et salle de bain.
- **Toit** : maison A corrigée avec deux vrais pans inclinés alignés sur la structure.
- **Collisions** : colliders internes segmentés, ouvertures non bloquantes au niveau joueur.
- **Version** : `20260608-smallcity-room-access-274`

### Completed — Maisons Petite ville agrandies + sortie (2026-06-08)

- **Prefabs** : `smallcity_house_a` / `smallcity_house_b` agrandis pour moins coincer le joueur.
- **Sortie** : retrait des panneaux pleins qui bloquaient visuellement l'entrée ; ajout de cadres de porte ouverts.
- **Collisions** : empreintes mises à jour avec ouverture praticable.
- **Version** : `20260608-smallcity-house-doors-273`

### Completed — Ouverture passage secteur 02 Petite ville (2026-06-08)

- **Secteurs** : `s02` passe en `open` côté shared + client.
- **Déplacement** : clamp jouable étendu à S01 + S02 + couloir de liaison route ouest.
- **Gate ouest** : panneau/barrière "bientôt" masqué pour la Petite ville ouverte.
- **Version** : `20260608-open-sector02-272`

### Completed — Fix chargement modules client 55/60 (2026-06-08)

- **Cause** : `legacy-modules.js` listait encore 5 scripts S01/terrain supprimés du checkout (`s01_prefabs.js`, `terrain_textures.js`, `s01_bounds.js`, `s01_roads.js`, `s01_terrain.js`).
- **Fix** : modules compat restaurés côté client ; `S01Bounds.isS01BuildBlocked` reste branché sur l'interdiction de build plage.
- **Test** : `tests/legacy-modules.test.mjs` vérifie que tous les scripts legacy existent.
- **Version** : `20260608-fix-legacy-modules-271`

### Completed — Fix boot local modules S01 manquants (2026-06-08)

- **Shared** : restauration de `s01-world-placements.mjs`, `s01-build-exclusions.mjs`, `s01-safe-zones.mjs`.
- **Comportement** : S01 reste en clean slate sans POI seed ; protection build/safe zone basée sur la plage spawn.
- **Test** : `tests/s01-modules.test.mjs`.

### Completed — Small city : deux maisons prefab (2026-06-08)

- **Prefabs** : `smallcity_house_a` et `smallcity_house_b` ajoutés au registre décor.
- **Contenu** : chaque maison contient salon, chambre, salle de bain, fenêtres et porte d'entrée/sortie.
- **Secteur 02** : deux anciennes maisons génériques remplacées par ces prefabs dans la Petite ville.
- **Collisions** : murs extérieurs, cloisons et porte disposent de colliders composés.
- **Version** : `20260608-smallcity-houses-270`

### Completed — Cabane S01 complète + doc + push (2026-06-08)

- **Prefab** `building_survivor_shack` : 7/7 pièces ✅ (sol, 4 murs, porte pivotée, toit)
- **Colliders** : 9 fermé ; porte ouverte = battant pivoté (`door-leaf-collider.mjs`)
- **Seed** : `s01:cabin01:shack` @ `(165.1, 7.1)`, `rotY: 0.55` ; dégagement arbres 10 m
- **Docs** : `design/BUILDING_PREFABS.md` (registre + suite S01), `docs/BUILDING_COLLIDERS.md`, `S01_ROADMAP.md`
- **Outils** : `building_debug.js`, `tools/debug-shack-*.mjs`, `tools/check-s01-decor.mjs`
- **Version** : `20260608-shack-roof-301`

### Completed — Cabane pièce 7 toit (2026-06-08)

- **Porte** ✅ playtest Bruno (battant ouvert collisionne le panneau)
- **Pièce 7** : 2 pans `rotX:±pitch` + faîtière + pignons `DoubleSide` ; colliders 2 boîtes inclinées `minY/maxY` 2.55→3.65
- **Shared** : `survivor-shack-roof.mjs` ; test `survivor-shack-roof.test.mjs`
- **Colliders totaux** : 9 (7 pièces + 2 pans toit)
- **Version** : `20260608-shack-roof-301` — toit ✅ playtest Bruno

### Completed — Porte ouverte : collision sur le battant pivoté (2026-06-08)

- **Bug** : porte ouverte = collider supprimé → on traverse le panneau visible
- **Fix** : `door-leaf-collider.mjs` — centre + `localRotY` autour du pivot ; `collider-resolve` + `world.js` + `decor_colliders.js`
- **Version** : `20260608-shack-dooropen-300`

### Completed — Cabane pièce 6 porte (2026-06-08)

- **Mur est** ✅ playtest Bruno
- **Pièce 6** : linteau `1.28×0.42` + battant `1.24×2.02` pivot `(-0.60, 0.08, -2.10)` ; collider `door:true`, `hd:0.28`
- **Interaction** : `doorPivot` sur root → `DECOR_DOORS` + toggle E (fermé = bloque, ouvert = libre)
- **Tests** : `survivor-shack-door.test.mjs` ; `decor-colliders` 7 colliders / toggle ouvert
- **Colliders totaux** : 7 fermé, 6 ouvert
- **Version** : `20260608-shack-door-299` — playtest Bruno porte

### Completed — Cabane pièce 5 mur est (+X) (2026-06-08)

- **Mur ouest** ✅ playtest Bruno
- **Pièce 5** : pan `0.18×2.55×4.15` @ `lx:2.54` ; collider `hw:0.22`, `hd:2.075` (miroir ouest)
- **Shared** : `survivor-shack-wall-east.mjs` ; test `survivor-shack-wall-east.test.mjs`
- **Colliders totaux** : 6 (sol + nord + 2× sud + ouest + est)
- **Version** : `20260608-shack-walle-298` — mur est ✅ playtest Bruno

### Completed — Cabane pièce 4 mur ouest (−X) (2026-06-08)

- **Mur sud** ✅ playtest Bruno
- **Pièce 4** : pan `0.18×2.55×4.15` @ `lx:-2.54` ; collider `hw:0.22`, `hd:2.075`
- **Shared** : `survivor-shack-wall-west.mjs` ; test `survivor-shack-wall-west.test.mjs`
- **Version** : `20260608-shack-wallw-297` — mur ouest ✅ playtest Bruno

### Completed — Cabane pièce 3 mur sud (−Z) + doc registre (2026-06-08)

- **Mur nord** ✅ playtest Bruno (rotY Three.js corrigé en 295)
- **Pièce 3** : 2 pans sud `lz:-2.04`, `lx:±1.61` — ouverture porte ~1.29 m au centre
- **Shared** : `survivor-shack-wall-south.mjs` ; tests `survivor-shack-wall-south.test.mjs`
- **Doc** : `design/BUILDING_PREFABS.md` (registre pièces + formule rotY + historique bugs)
- **Mur sud** ✅ playtest Bruno
- **Version** : `20260608-shack-walls-296`

### Completed — Fix rotY colliders ≠ Three.js (traversée mur cabane) (2026-06-08)

- **Cause** : `decorLocalToWorld` inversait le signe X vs `Object3D.rotation.y` → collision ~2,13 m décalée en X pour `rotY=0.55`
- **Fix** : formule Three.js dans `world.js`, `collider-resolve.mjs`, `survivor-shack-pad.mjs`, `sampleShackPadHeight`
- **Tests** : `survivor-shack-rotation.test.mjs` + test 0.55 dans `collider-resolve.test.mjs`
- **Version** : `20260608-threerot-fix-295`

### Completed — Fix game-init crash + mesure mesh/collider (2026-06-08)

- **Bug** : `ReferenceError: serverBuild is not defined` dans `_finalizeGameInit` → boucle retry game-init
- **Fix** : `invDebugBuild` ; `dumpShack` en `requestAnimationFrame` ; `updateMatrixWorld` avant mesure ; sync spec depuis root avant `buildDecorColliders`
- **Version** : `20260608-shack-col-fix-294`

### Completed — BuildingDebug + doc collisions prefab (2026-06-08)

- **Doc** : `docs/BUILDING_COLLIDERS.md` — pièges cabane, workflow, checklist nouvelle pièce
- **Debug** : `building_debug.js` — wireframes Shift+F8, `dumpShack()`, `probePlayer()`, compare mesh/collider
- **Fix alerte** : `consume_debug` ne compare plus `invDebugBuild` ↔ `clientVersion` (champs différents)
- **Version** : `20260608-building-debug-293`

### Completed — Cabane : sync colliders pivot + murs fantômes (2026-06-08)

- **Cause** : ancien `decor_colliders.js` (6 murs latéraux/sud/porte) en cache → collisions hors mesh (sol + mur nord seulement)
- **Fix** : `_syncDecorSpecFromRoot` ; mesh cabane sur `root` sans sous-groupe ; `_rebuildAllDecorColliders` après resnap S01
- **Version** : `20260608-shack-col-sync-292` — Ctrl+F5 obligatoire

### Completed — Cabane : sol terrain cabossé + collision mur nord (2026-06-08)

- **Sol** : `sampleShackPadHeight` — max terrain sur 4 coins + centre (`survivor-shack-pad.mjs`) ; spawn S01 + `_resnapS01Decor`
- **Mur nord** : collider `hd: 0.22`, sans bande `minY`/`maxY` (évite skip sur pente / rotY)
- **Tests** : `survivor-shack-pad.test.mjs` ; wall-north + decor-colliders mis à jour
- **Version** : `20260608-shack-pad-walln-291` — playtest Bruno mur nord

### Completed — Cabane : pièce 2 mur nord (+Z) (2026-06-08)

- **Sol** ✅ playtest Bruno
- **Mur nord** ✅ playtest Bruno (2026-06-08, après fix rotY 295)
- **Ajout** : `_buildSurvivorShackWallNorth` + `survivor-shack-wall-north.mjs`
- **Version** : `20260608-shack-walln-290`

### Completed — Cabane : reset progressif — pièce 1 sol (2026-06-08)

- **Décision** : reconstruction 1 élément / validation ; porte/murs/toit retirés temporairement
- **Pièce 1** : mesh sol seul + collider `survivor-shack-floor.mjs` (`minY`/`maxY` 0→0.12)
- **Version** : `20260608-shack-floor-289`

### Completed — Porte shack : collider ancré au pivot prefab (2026-06-08)

- **Règle** : offsets locaux `lx`/`lz` + `cx`/`cz` = pivot instance ; `packages/shared/src/survivor-shack-door.mjs`
- **Tests** : `survivor-shack-door.test.mjs` (2 emplacements, même déf locale)
- **Version** : `20260608-shack-door-288`

### Completed — Cabane : fix porte traversable (collider trop fin) (2026-06-08)

- **Cause** : `hd: 0.10` + cabane `rotY` → zone sans contact sur l’axe d’entrée ; resnap S01 sans refresh colliders
- **Fix** : `hd: 0.28` ; push si agent déjà dans la boîte (`collider-resolve`) ; `refreshDecorCollision` après resnap S01
- **Version** : `20260608-shack-door-287`

### Completed — Workflow prefabs bâtiment réutilisables (2026-06-08)

- **Règle** : une pièce = mesh + colliders + tests + fiche `design/BUILDING_PREFABS.md` ; validation playtest avant pièce suivante
- **Cursor** : `.cursor/rules/building-prefabs.mdc`
- **En cours** : porte shack 🔄 (pas encore ✅)

### Completed — Cabane : fix collider porte sur pente (2026-06-08)

- **Cause** : `minY`/`maxY` + garde `feetY < baseY - 0.35` désactivait la porte en approche basse (terrain S01)
- **Fix** : battant pleine hauteur sans bande verticale ; garde `baseY` seulement si `maxY` défini
- **Version** : `20260608-shack-door-286`

### Completed — Cabane : collider porte (fermée / ouverte) (2026-06-08)

- **Playtest 1/?** : battant `door: true` @ `(0.02, -2.10)` — actif fermé, retiré à l’ouverture
- **Version** : `20260608-shack-door-285`

### Completed — Cabane : zéro collider + pignons visibles (2026-06-08)

- **Mesh** : maison d’origine conservée ; pignons triangulaires en `DoubleSide` (faces invisibles depuis l’extérieur)
- **Colliders** : `building_survivor_shack: []` — ajout un par un en playtest
- **Version** : `20260608-shack-nocol-284`

### Completed — Cabane : revert toit + collisions simplifiées (2026-06-08)

- **Régression** : « étanchéité » avait rallongé les murs au-dessus du toit et cassé la pente ; colliders sol/toit inclinés = collisions fantômes
- **Fix** : mesh `_buildSurvivorShack` restauré (toit 2 pans + pignons d’origine) ; colliders = 5 murs fins + porte uniquement
- **Version** : `20260608-shack-revert-283`

### Completed — Cabane : étanchéité visuelle murs/toit (2026-06-08)

- **Fix** : coins pleins, linteau, soffites, plafond intérieur, chevauchement pans toit, pignons double face + remplissage
- **Version** : `20260608-shack-seal-282`

### Completed — Nametags masqués derrière murs (LOS) (2026-06-08)

- **Fix** : `hasHeadLineOfSight` (colliders décor, hauteur tête) ; nametags cachés si mur entre caméra et joueur
- **Version** : `20260608-nametag-los-281`

### Completed — Collisions cabane survivor_shack (2026-06-08)

- **Fix** : colliders sol/murs/fenêtre/porte/toit/pignons alignés sur `_buildSurvivorShack` ; `rotX` par définition pour pans toit
- **Version** : `20260608-shack-col-280`

### Completed — Dégagement arbres autour bâtiments S01 (2026-06-08)

- **Règle** : rayon 10 m autour de chaque `building_*` seed S01 — exclusion seed/regen + purge arbres au boot
- **Cabane #1** : clairière auto @ `(165.1, 7.1)`
- **Version** : `20260608-tree-clear-279`

### Completed — Cabane #1 posée (emplacement validé) (2026-06-08)

- **Playtest OK** : `(165.1, 7.1)` — repère retiré, `building_survivor_shack` seed `s01:cabin01:shack`
- **Version** : `20260608-cabin01-shack-278`

### Completed — Cabane #1 repère déplacé près plage (2026-06-08)

- **Playtest** : `(108,-11)` trop loin — nouvelle ancre **`(165.1, 7.1)`** (pos Bruno via RCON `players`)
- **Seed** : poteau + torche ; `tpcheck cabane` vue @ `(169.1, 7.1)`
- **Version** : `20260608-cabin01-165-277`

### Completed — Repère cabane #1 invisible depuis tpcheck cabane (2026-06-08)

- **Cause** : `rotY` vue sentier pointait à l’opposé (~-2.35 au lieu de ~1.04) ; hauteur S01 via `getTerrainHeight` seul
- **Fix** : rotY calculé vers `(108,-11)` ; `getDecorGroundHeight` + resnap post-sync ; torche `beach_exit_torch` à côté du poteau
- **Version** : `20260608-marker-vis-276`

### Completed — Fix double TP admin (move-correction) (2026-06-08)

- **Symptôme** : `tpcheck` téléporte puis renvoie ailleurs — repère invisible
- **Cause** : `lastX/lastZ` pas mis à jour au TP ; anti-cheat `move` / `move-correction` annule la position
- **Fix** : grace TP serveur + sync `lastX/lastZ` ; client `admin-tp` → `_syncPlayerPosToServer` ; notif si correction > 8 m
- **Version** : `20260608-tp-fix-275`

### Completed — Cabane #1 : repère poteau avant shack (2026-06-08)

- **Workflow** : `spawn_marker_right` @ `(108,-11)` clé `s01:cabin01:marker` — pas de cabane tant que repère non validé
- **RCON** : `tpcheck repere` — TP sur l’emplacement exact

### Completed — Fix tp check arguments invalides (2026-06-08)

- **Cause** : mauvais chemin import `s01-checkpoints.mjs` depuis `apps/server/src/rcon.js`
- **Fix** : `../../../packages/...` + commande `tpcheck cabane`

### Completed — Téléportation points de vérification S01 (2026-06-08)

- **RCON** : `tpcheck` / `tp check` — points S01 (`s01-checkpoints.mjs`)
- **Client** : `admin-tp` sync caméra + notif
- **Version** : `20260608-tp-check-274`

### Completed — Fix seed cabane S01 invisible (2026-06-08)

- **Cause** : `ensureS01World` purge + `markSeedRemoved` → reseed bloqué au boot suivant
- **Fix** : purge `reseed` sans marquer supprimé ; `unmarkSeed` avant seed ; cabane déplacée `(108, -11)` plus proche sentier

### Completed — Prototype cabane S01 (2026-06-08)

- **Placement** : `building_survivor_shack` @ `(108, -11)` — sud du sentier, sans aplat terrain
- **Seed** : `s01:cabin01:proto` ; redémarrer Node + Ctrl+F5

### Completed — Roadmap S01 Phase 1 validée (2026-06-08)

- **1.1** : fin sentier OK (`BEACH_TRAIL_PTS`) — note « ajuster plus tard » dans `S01_ROADMAP.md`
- **1.2** : pas de zone dégagée — sentier dans forêt dense suffit
- **1.3** : repère bouche plage = panneau + torche existants
- **2.1 pont** : reporté jusqu’à rivière validée ; **prochain** = première cabane (tâtonnement)

### Completed — Survie corps endormi (déco) (2026-06-08)

- **Règles** : déco → faim/soif baissent ; PV gelés ; infection/saignement en pause ; zombies ignorent les dormeurs ; PvP seul peut blesser/tuer un dormeur
- **Code** : `tickSleeperSurvival` + `catchUpSleeperSurvival` ; tick 1 s sur `sleepingPlayers` ; rattrapage boot + réveil ; `lastSurvivalTickAt` à la déco
- **Réveil** : mêmes PV qu’à la déco (sauf si tapé par un joueur) ; faim/soif rattrapées
- **Version** : `20260608-sleeper-survival-273`

### Completed — Fix 0 PV à la connexion (2026-06-08)

- **Symptôme** : reconnect avec 0 PV, mort au premier coup
- **Cause** : `health=0` persisté en DB après mort sans respawn ; pas d’écran de mort à la reconnexion
- **Hors-ligne vérifié** : zombies n’attaquent pas les corps endormis ; faim/soif ne tick pas offline
- **Fix** : `player-connect-health.js` — respawn plage si DB à 0 PV sans session ; `player-death` si mort en cours (refresh) ; sac de mort au disconnect si mort
- **Version** : `20260608-fix-connect-health-272`

### Completed — Placement S01 au tâtonnement (coords v1 obsolètes) (2026-06-08)

- **Décision** : ne plus suivre les `(x,z)` de la doc map v1 ; POI un par un en jeu
- **Doc** : `START_FOREST.md`, `S01_ROADMAP.md` — workflow + tableau *Ancres validées*
- **Code** : `S01_BUILD_EXCLUSION_POIS` vide jusqu’à ancrage réel ; placeholders commentés dans `s01-poi.mjs` ; seed décor S01 vide ; client `s01_bounds.js` sans POI ni zone safe camp v1 (plage seule)
- **Version** : `20260608-s01-placement-tatonnement-271`

### Completed — Roadmap S01 forêt de départ (2026-06-08)

- **Doc** : `design/secteur/S01_ROADMAP.md` — intentions, phases, ordre de travail

### Completed — Exclusion plage arbres forêt / rochers (2026-06-08)

- **Règle** : sable = palmiers + décor plage uniquement ; pas de chêne/pin/rochers minables sur la plage
- **Fix** : `isForestTerrainAllowed()` dans `beach-spawn.mjs` ; suppression zone `coastal_edge` + `beach_ring` ; lisière `forest_coast_west` ; regen arbres sans `coastal_edge`
- **Tests** : plage safe sand rejetée pour trees/rocks

### Completed — Densité forêt S01 arbres + rochers (2026-06-08)

- **Demande** : combler les zones vides de la forêt S01 (arbres + rochers minables sur tout le secteur)
- **Fix** : grille rect `forest_grid_*` / `forest_rocks_*` (9+1 cellules) ; filtre `isInsideSector01` + hors plage ; `treeTargetStanding` 580 ; `rockTargetWorld` 140 ; regen rochers limité aux zones forêt
- **Fichiers** : `tree-placements.mjs`, `rock-placements.mjs`, `resource-spawn.mjs`
- **Reseed** : redémarrer serveur ou RCON `decorseed trees reset` + `decorseed rocks reset`

### Completed — Fix PV à zéro après consommation (2026-06-08)

- **Symptôme** : sandwich / eau → barre de vie à 0
- **Cause** : `_syncArmor` écrasait `p.health` si `null` ; PV serveur jamais envoyés au `game-init` (localStorage obsolète)
- **Fix** : `_syncArmor` UI-only ; `health` dans `game-init` + ack `use-item` ; sync `survival-update` → localStorage
- **Version** : `20260608-fix-health-sync-270`

### Completed — Doc inventaire / consommation (2026-06-08)

- **Doc** : `docs/INVENTORY_CONSUMPTION.md` — flux `use-item`, bugs corrigés, debug `[inv-debug]`, checklist redémarrage serveur
- **Màj** : `ARCHITECTURE.md`, `CONTRIBUTING.md`, `README.md` (index docs)

### Completed — Diagnostic serveur non redémarré (2026-06-08)

- **Cause (logs)** : `invDebugBuild: undefined` sur `/api/health` alors que client `269` — process Node sur `:3000` tournait depuis ~55 min sans recharger `index.js` (uptime 3322 s)
- **Fix** : `serverBuild` / `invDebugBuild` dans `game-init` ; alerte UI si absent ou mismatch ; version `269`
- **Action dev** : tuer le node sur 3000 puis `npm run dev:server` (nodemon ne recharge pas toujours si lancé avant les edits)

### Completed — Handlers inventaire tôt + check version serveur (2026-06-08)

- **Cause (logs)** : `debug-snapshot-req` sans `debug-snapshot-res` — handlers `use-item` / `debug-inv-snapshot` enregistrés ~1200 lignes après `game-init` ; risque serveur Node non redémarré (build 267 absent)
- **Fix** : `_registerInvConsumeHandlers` juste après `players.set` ; inventaire canonisé (`_cloneInv`) à la connexion ; `invDebugBuild` sur `/api/health` ; client log `server-health` + alerte mismatch ; `serverBuild` dans les acks
- **Version** : `20260608-fix-inv-early-handlers-268`

### Completed — Fix perte nourriture ensureSlotGrid + use-item par type (2026-06-08)

- **Cause** : `ensureSlotGrid` vidait le sac sans sac équipé même si hotbar pleine → items perdus au `use-item` (`empty`)
- **Fix** : sac conserve les stacks non placés ; `findStackByType` ; `use-item` par type ; `cloneInv` migre ; `_emitInvAuth` à la connexion ; build `267`
- **Version** : `20260608-fix-inv-no-discard-267`

### Completed — Fix désync slot bag/hotbar consommation (2026-06-08)

- **Cause (logs)** : serveur envoyait nourriture en `bag`, client l’affichait en hotbar slot 2–3 ; `use-item` sur mauvais slot → `empty` + wipe sac
- **Fix** : `resolveUseItemStack` cherche par **type d’abord** ; migration dans `_gameInitPayload` ; client `_migrateBagToHotbarIfNoSac` ; `findItemSlot` à l’usage
- **Version** : `20260608-fix-inv-migrate-266`

### Completed — Debug inventaire / consommation corrélé (2026-06-08)

- **Client** : `consume_debug.js` — logs `[inv-debug]`, `ZS.ConsumeDebug.dump()`, compare client/serveur
- **Serveur** : `inv-debug.js` — logs `[inv-debug]` connect, game-init, use-item, `debug-inv-snapshot`
- **Corrélation** : `traceId` partagé client ↔ serveur sur `use-item` et snapshots
- **Version** : `20260608-inv-debug-265`

### Completed — Fix consommation v2 : sync authoritaire (2026-06-08)

- **Cause** : client ajoutait eau/sandwich en local (`ensureStarterRations`) sans sync serveur ; appel `use-item` retardé de 0,5 s ; ack sans inventaire/survie
- **Fix** : retrait starters client-side ; `use-item` immédiat + réponse `{ inventory, survival }` ; retry serveur si slot vide ; `ensureStarterRations` après `ensureSlotGrid`
- **Version** : `20260608-fix-consume-v2-264`

### Completed — Fix consommation : nourriture effacée du sac serveur (2026-06-08)

- **Cause** : `ensureSlotGrid` tronquait `bag` à 0 sans sac équipé → eau/sandwich supprimés côté serveur à chaque `use-item` ; client les affichait encore (overflow hotbar)
- **Fix** : overflow sac→hotbar (serveur + kit départ en hotbar) ; `resolveUseItemStack` vérifie le type ; migration à la connexion ; slot passé dans `_useHeldItem`
- **Version** : `20260608-fix-consume-bag-263`

### Completed — Sol forêt plus lumineux (2026-06-08)

- **terrain_textures.js** : base olive claire, mousse verte, taches lumière filtrée, litière dorée
- **world.js** : vertex colors forêt éclaircis, moins de lerps sombres, hemi rebond sol sous couvert
- **Version** : `20260608-forest-floor-bright-262`

### Completed — Fix game-init crash inventaire (2026-06-08)

- **Cause** : `Network.init` déclenchait `game-init` avant `Inventory.init` → `_scene` undefined dans `spawnWorldItem` → inventaire jamais chargé → consommation « désynchronisé »
- **Fix** : `Survival` + `Inventory.init` avant `Network.init` dans `game.js` ; garde `_scene` dans `spawnWorldItem`
- **Version** : `20260608-fix-game-init-inv-261`

### Completed — Texture sol forêt procédurale (2026-06-08)

- **terrain_textures.js** : atlas canvas (mousse, litière, aiguilles, humus + terre sentier)
- **world.js** : teintes forêt via `forestFloorWeight`, tiling plus fin en forêt
- **Version** : `20260608-forest-floor-tex-260`

### Completed — Fix consommation eau / sandwich (2026-06-08)

- **Cause** : nourriture en sac côté serveur, affichée en hotbar côté client (sans sac équipé) → slot vide au `use-item`
- **Fix** : slot actif hotbar + fallback recherche par `type` serveur ; kit départ en hotbar ; callback erreur client
- **Version** : `20260608-fix-consume-food-259`

### Completed — RCON worldwipe (2026-06-08)

- **`worldwipe`** : retire constructions joueur (build bois, structures, coffres/camp posés) — seed immuable conservé
- Options : `all` (décor manuel), `ground` (items au sol), `full`
- **index.js** : `wipePlayerWorld()` partagé boot + RCON

### Completed — Map propre : retrait POI S01 + builds joueurs (2026-06-08)

- **Seed S01 vide** : `computeS01DecorPlacements()` → `[]` (station, cabanes, pont, hub retirés)
- **Boot** : `_purgeAllS01Decor()` à chaque démarrage ; `_purgePlayerBuildsAndCampDecor()` une fois (`.world_clean_slate_20260608`)
- **Conservé** : plage, sentier, panneau + torche plage, arbres/rochers/épaves seed globaux

### Completed — Restauration plage + sentier d'origine (2026-06-08)

- **Sentier** : tracé original `BEACH_TRAIL_PTS` → jonction `[14,-18]` (plus le coude `[14,-8]` / fin `[0,-6]`)
- **Visuel** : `buildSpawnTrail` dans `proc_spawn.js` (mesh Trails) — plus de `spawn_trail` RoadNetwork
- **Terrain** : retrait `S01Terrain.registerWorld` (rivière + aplats POI) et routes S01 RN (`s01_roads` vide)
- **Conservé** : plage, panneau + torche bouche sentier (`beach-sign-placements.mjs`)
- **Version** : `20260608-beach-trail-restore-258`

### Completed — S01 : suppression campements + terrain naturel (2026-06-08)

- **Campements retirés** : plus de hub `(0,-6)` ni campement abandonné `(-20,33)` — decor seed, aplats terrain, routes secondaires et zone safe
- **Conservé** : sentier terre `spawn_trail`, carrefour `(28,-42)` (marqueurs pierres), cabanes N/S, station essence, pont
- **Serveur** : `_purgeS01CampDecor()` au boot — retire decor persisté `s01:hub:*` / `s01:camp:*`
- **Client** : `network.js` ignore ces clés ; `proc_spawn.js` sentier sync `BEACH_TRAIL_PTS` (plus de branche `[14,-18]`)
- **Tests** : `s01-placements`, `s01-build-exclusions`, `beach-spawn`
- **Version** : `20260608-s01-remove-camps-257`

### Completed — Fix crash serveur makeZombie (2026-06-08)

- **index.js** : `const z = buildZombieEntity({ x, z })` → TDZ ReferenceError au boot ; renommé `entity`

### Completed — Sentier terre seul + camp hub client (2026-06-08)

- **proc_spawn.js** : suppression ruban sable `buildSpawnTrail` (doublon RN) ; décor cailloux plage seulement
- **s01_terrain.js** : `buildHubCamp` à la fin du sentier `(0,-6)` — feu, établi, coffre, layout
- **network.js** : ignore seed serveur `s01:hub:*` (évite doublons) ; fallback campement abandonné seul
- **Version** : `20260608-trail-dirt-hub-camp-256`

### Completed — Torche guide panneau plage (2026-06-08)

- **beach-sign-placements.mjs** : prefab `beach_exit_torch` à côté du panneau sortie sentier
- **sign_prefabs.js** : poteau + flamme + `PointLight` (flicker via `registerFireLight`)
- **Version** : `20260608-beach-exit-torch-252`

### Completed — S01 forêt complète : POI seed + interactions (2026-06-08)

- **Shared** : `s01-world-placements.mjs`, `s01-roads.mjs`, `s01-river.mjs`, `s01-safe-zones.mjs`, `s01-build-exclusions.mjs`, `s01-poi.mjs`
- **Serveur** : `ensureS01World()` — decor immuables (hub, campement, cabanes, essence, pont), coffres loot, zones safe, zombies T1 forêt, cuisson/repos socket
- **Client** : `s01_terrain.js`, `s01_roads.js`, `s01_bounds.js`, `s01_prefabs.js` — rivière, routes terre, clairière, interactions établi/feu/couchage
- **Sentier** : termine sur clairière `(0, -6)` — `BEACH_TRAIL_PTS` sync
- **Tests** : `s01-placements.test.mjs`, `s01-build-exclusions.test.mjs`
- **Doc** : `design/secteur/START_FOREST.md`
- **Version** : `20260608-s01-forest-full-251`

### Completed — Murs secteur : coins et trous (2026-06-08)

- **sector_walls.js** : périmètre pleine longueur (sans PAD), portes filtrées par bord, coins renforcés, step 1,75 m.
- **Version** : `20260608-sector-walls-gap-250`

### Completed — Carte M : position joueur live (2026-06-08)

- **game.js** : `Map.tick(dt)` — le delta était absent (redraw jamais déclenché).
- **map.js** : redraw si déplacement ≥ 0,2 m ou toutes les 0,1 s carte ouverte.
- **Version** : `20260608-map-live-pos-249`

### Completed — Fix carte (M) PC (2026-06-08)

- **map.js** ajouté à `legacy-modules.js` (le chargement via `ZS.loadScript` était un no-op).
- **loading.js** : alias `ZS.loadScript`.
- **game.html** : bouton carte en optional chaining.
- **Version** : `20260608-map-fix-248`

### Completed — Collision murs secteur 01 (2026-06-08)

- **sector_walls.js** : segments `type:'seg'` dans `world._colliders` (plus `ZS.B` après buildAll) ; coords X/Z corrigées ; chunks 22 m ; trous aux portes.
- **world.js** : `registerSectorCollider`.
- **Version** : `20260608-sector-collision-247`

### Completed — Fix audio `setVolumes` manquant (2026-06-08)

- **audio.js** : implémente `setVolumes({ master, ambient, sfx })` (cassait tout `ZS.Audio` au chargement).
- **game.js** : init Craft/Audio en optional chaining.
- **Version** : `20260608-audio-setvol-245`

### Completed — Animation flamme torche en main (2026-06-08)

- **player.js** : billboards feu (3 couches + braises), textures procédurales, sway au mouvement, lumières synchronisées ; `tickTorchFx` ; extinction visuelle en eau (locale).
- **game.js** : tick chaque frame.
- **Version** : `20260608-torch-flame-244`

### Completed — Secteurs : murs denses + carte RP 10 secteurs (2026-06-08)

- **sectors.mjs** : registre unique `SECTORS_ALL` (S01–S10), `MAP_WORLD`, `MAP_ROADS`, `getSectorAt`.
- **sector-bounds.mjs** / **sector_bounds.js** : réexport + miroir client.
- **sector_walls.js** : espacement barrières `1.95 m` (chevauchement), ouvertures aux portes RP.
- **map.js** : refactor data-driven — tous les secteurs, routes, portes, position joueur (X/Z + secteur), refresh 4×/s.
- **Tests** : `tests/sectors.test.mjs`
- **Version** : `20260608-sectors-map-243`

### Completed — Ambiance torche (feu en main) (2026-06-08)

- **audio.js** : `tickHeldTorch` — boucle crépitement synthétique + pops ; coupe en eau / mort / mute.
- **game.js** : appel chaque frame si `tool_torche` en main.
- **Version** : `20260608-torch-fire-242`

### Completed — Ambiance forêt : faune optionnelle (2026-06-08)

- **audio.js** : `rustle_2` (serpent) retiré des rafales vent → option « Faune en forêt » (55–130 s, court/extrait).
- Rafales vent seules toutes les ~14–34 s, plus douces.
- Lit `forest_ambient.ogg` sous `forest_wind.mp3` ; volume forêt légèrement relevé.
- **Options** : toggle `forestCreatures` (défaut off, comme oiseaux).
- **Version** : `20260608-forest-audio-241`

### Completed — Périmètre secteur 01 forêt (2026-06-08)

- **sector-bounds.mjs** + **sector_bounds.js** : limites S01 (forêt + plage), clamp client/serveur.
- **sector_walls.js** : murs jersey + grillage + colliders ; portes « BIENTÔT » (E = easter egg).
- **map.js** : carte M alignée sur zone ouverte + secteurs grisés.
- **sign_ui** : texte `sector_coming_soon`.
- **Version** : `20260608-sector01-walls-240`

### Completed — Perf round 4 : LOD arbres + lumières + réseau (2026-06-07)

- **tree_prefabs** : `buildSimple` (2 meshes) pour arbres lointains ; upgrade auto < 42 m.
- **spawn_clearing** : LOD simple si distance > 42 m ou `simpleLod` ; `upgradeTreeLod`.
- **network** : arbres différés en LOD simple ; upgrade à l'approche.
- **game.js** : cull lumières O(n×k) ; skip tick chute arbres/rochers si inactif.
- **inventory** : ghost construction à ~20 Hz.
- **server** : `player-move` broadcast par proximité (150 m) ; `rotY` validé.
- **Version** : `20260607-perf-lod-239`

### Completed — Perf round 3 : culling décor + arbres stream (2026-06-07)

- **network.js** : visibilité décor par distance (`decorVisRadius`) ; arbres lointains paginés + spawn progressif.
- **server** : `GET /api/world/decor-trees` paginé (`limit`/`offset`, tri distance).
- **zombie.js** : anim/visibilité par distance ; fix dispose caches partagés.
- **network tick** : joueurs distants animés < 72 m ; `getLocalXZ` exporté.
- **world.js** : `waterStride` ; `isTreeVisPinned` pour arbres en chute.
- **spawn_clearing** : `castShadow` off sur arbres si profil sans ombres.
- **Version** : `20260607-perf-cull-238`

### Completed — Perf round 2 + autorité serveur (2026-06-07)

- **world.js** : `dayNightStride` (eau/nuages/feu sur frames allégées) ; eau emissive off si profil statique.
- **game.js** : overlay eau sans `blur` CSS ; fusil à pompe = 1 événement `shoot` (serveur résout 8 plombs).
- **forest/beach_decor** : ancres décor réduites selon tier (potato ~20 %).
- **tree_prefabs** : `_detailMul` par tier (potato 0.32).
- **weapon-stats.mjs** + **server** : dispersion serveur par plomb ; clamp `move` dans `WORLD_RADIUS` + Y borné.
- **server** : `zombie-tick` time-only throttlé à ~1 Hz si aucun changement.
- **Version** : `20260607-perf-auth-237`

### Completed — Perf mobile/tablette + options branchées (2026-06-07)

- **options.js** : auto tactile → `low` (téléphone/tablette) ; profils allégés (DPR, décor, terrain, brouillard, lumières).
- **world.js** : `applyGraphicsOptions` — nuages, étoiles, eau, frustum ombres ; océan scroll off en faible.
- **game.js** : culling lumières / billboards / ambiance selon profil (`lightCullEvery`, `biomeStride`).
- **options** : toggles immersion/audio appliqués via `_applyImmediate`.
- **Version** : `20260607-perf-mobile-236`

### Completed — Réglage pas sable / forêt (2026-06-07)

- **audio.js** : sable gain 0.46, clip court ; forêt = herbe + feuilles (plus de tissu), gain 0.7, pitch plus sourd.
- **Version** : `20260607-footsteps-tune-235`

### Completed — Sync audio multijoueur (2026-06-07)

- **Serveur** : `player-footstep` (surface, position serveur) ; `player-attack` enrichi (arme, x/z, horodatage).
- **Client** : pas des autres joueurs spatialisés ; tirs/mêlée à la position serveur ; coupe arbre/rocher + chute arbre + portes spatialisés.
- **audio.js** : `spatialAt`, `footstep` avec panoramique.
- **Version** : `20260607-audio-sync-234`

### Completed — Pas sentier & asphalte (2026-06-07)

- **noise.js** : `isInTrailCorridor` ; **road_network.js** : `getSurfaceAt` (asphalt/trail).
- **audio.js** : surfaces `trail` (gravier CC0) et `asphalt` (pas durs) ; gain/clip/rate dédiés.
- **Version** : `20260607-footsteps-trail-233`

### Completed — Pas sur bois (fondations) (2026-06-07)

- **build_anchors.js** : `isStandingOnFoundation(px, pz, feetY)` — détection dalle tous niveaux.
- **audio.js** : surface `wood` + échantillons CC0 ; gain/clip/rate adaptés au bois.
- **game.js** : passe la hauteur des pieds à `footstepSurface`.
- **Version** : `20260607-footsteps-wood-232`

### Completed — Volume pas sable réduit (2026-06-07)

- **audio.js** : `FOOTSTEP_GAIN.sand` 1.05 → 0.68.
- **Version** : `20260607-footsteps-sand-231`

### Completed — Ambiance biomes v2 (vent, oiseaux option, vagues distance) (2026-06-07)

- **Forêt** : boucle vent sans oiseaux (`forest_wind.mp3`, OGA CC0) ; cris d’oiseaux optionnels (Options → « Oiseaux en forêt », désactivé par défaut) ; bruissements de branches au vent toutes les ~7–23 s.
- **Plage** : volume des vagues selon `beachOceanProximity` — plus fort au bord de l’océan (est), atténué en s’éloignant vers l’intérieur du sable.
- **options.js / options_ui.js** : toggle `forestBirds`.
- **Version** : `20260607-biome-audio-230`

### Completed — Bruits de pas réalistes (footstep-samples) (2026-06-07)

- **audio.js** : remplacement de la synthèse procédurale par des échantillons par surface (sable, herbe, forêt, terre, eau peu profonde) ; alternance L/R, variation de pitch ; synthèse conservée en secours.
- **Assets** (`public/audio/sfx/footsteps/`) : Yo Frankie sand/grass (CC-BY Blender Foundation) ; C-Dogs OGA cloth/leather (CC0) ; 100 CC0 SFX v2 dirt/wet (CC0).
- **Version** : `20260607-footsteps-229`

### Completed — Options layout large PC/tablette (2026-06-07)

- **options_ui.js** : mobile inchangé (bottom sheet) ; PC/tablette = nav latérale + grille 2 col. + cartes.
- **Version** : `20260607-options-wide-228`

### Completed — Panneau Options (graphismes, audio, contrôles) (2026-06-07)

- **options.js** : presets Auto / Très faible / Faible / Moyen / Élevé, persistance `zs_options_v1`.
- **options_ui.js** + menu ☰ : panneau responsive mobile/tablette/PC.
- **Branché** : renderer, ombres, brouillard, décor, eau, lumières, audio, pas, head-bob, FOV, vignette survie, sensibilité, tactile.
- **Profil « Très faible »** : téléphones limités (décor minimal, pas d’ombres, distance courte).
- **Version** : `20260607-options-226`

### Completed — Pack immersion joueur (2026-06-07)

- **Audio** : pas (sable/forêt/herbe/eau), splash + filtre sous l'eau, ambiance atténuée en profondeur.
- **Visuel** : overlay eau selon profondeur, FOV sprint, head-bob caméra, brouillard teinté biome.
- **Survie** : vignette faim (ambre) / soif (bleu) / saignement (rouge pulsé).
- **Version** : `20260607-immersion-225`

### Completed — Ambiance audio biomes plage/forêt (2026-06-07)

- **audio.js** : boucles CC0 plage (vagues jasinski) + forêt (BigSoundBank #100), crossfade selon `beachCoastWeight`, secours synth.
- **Son ON par défaut** ; grognements zombies coupés (`ZOMBIE_SFX_ENABLED = false`).
- **game.js** : `updateBiomeAmbient` chaque frame.
- **Fichiers** : `public/audio/biomes/beach_waves.flac`, `forest_ambient.ogg`.
- **Version** : `20260607-biome-audio-224`

### Completed — Texture océan horizon plage (2026-06-07)

- **beach_textures.js** : `getOceanMaterial()` — dégradé côte→horizon, écume, vaguelettes, brume lointaine.
- **proc_spawn.js** : surface mer texturée + `registerWaterMaterial` ; maillage 24×28 pour vagues plus douces.
- **world.js** : défilement UV léger le long de la côte.
- **Version** : `20260607-ocean-tex-223`

### Completed — Badge HUD zone sûre plage (2026-06-07)

- **HUD** : `🛡️ Plage sûre` / `⚠️ Zone ouverte` à côté saignement/infection (`setZoneSafe`).
- **Version** : `20260607-zone-flag-222`

### Completed — Panneau plage ton RP survivants (2026-06-07)

- **sign_ui.js** : messages de Léo, Mina, Viktor… (plus de ton tutoriel / serveur).
- **Version** : `20260607-sign-rp-221`

### Completed — Construction interdite sur la plage (2026-06-07)

- **Build** : fondations, murs, portes, coffres, etc. refusés sur le sable protégé (client + serveur).
- **Shared** : `isBuildBlockedOnBeach` (emprise 3×3 m).
- **Version** : `20260607-beach-no-build-220`

### Completed — Panneau sortie plage (prefab + UI RP) (2026-06-07)

- **Prefab** `sign_beach_exit` — panneau 3D à la bouche du sentier ; `E` pour lire.
- **UI** `sign_ui.js` — popup planche (zone sûre, palmiers/caillou, craft, raccourcis).
- **Serveur** : seed `beach-sign-placements.mjs`, RCON `decorseed signs`, `decoradd prefab sign_beach_exit`.
- **Version** : `20260607-beach-sign-219`

### Completed — Zone sûre plage (anti spawn-kill) (2026-06-07)

- **PvP** : joueurs / endormis sur le sable de plage ignorés par le raycast et les dégâts (tirs extérieurs inclus).
- **Loot** : vol d’endormi (💤) interdit sur la plage ; cadavres (☠) autorisés.
- **Shared** : `isOnBeachSafeSand` (`beach-spawn.mjs`).

### Completed — Spawn plage aléatoire (respawn) (2026-06-07)

- **`pickBeachSpawn`** : point aléatoire sur le sable (poids côte + footprint), pas toujours le même pixel.
- **Serveur** : respawn mort, tué offline, nouveau compte, 1re connexion sans position sauvée.
- **Version** : `20260607-beach-spawn-rand-218`

### Completed — Tuer un joueur endormi (déco) (2026-06-07)

- **Combat** : coups/tirs infligent des dégâts aux corps endormis (`sleeper-hit` / `sleeper-death`) ; corps passe en état mort (☠) fouillable.
- **Reconnexion** : si tué pendant l’absence → respawn plage + kit départ ; sac mort au sol avec le loot restant.
- **Version** : `20260607-sleeper-kill-217`

### Completed — Fouille / coffre drag & drop bidirectionnel (2026-06-07)

- **Fouille** : déposer des objets sur le corps / dormeur (joueur → cible) + réorg. cible ; `lootMoveTransfer` serveur.
- **Coffre** : déjà supporté via `storage-move` ; hints UI mis à jour.
- **Version** : `20260607-loot-bidir-216`

### Completed — Login sans sélecteur serveur (2026-06-07)

- **`index.html`** : retrait prod/QA/dev picker — session toujours `dev` + origine courante ; cache bust jeu inchangé.
- **Version** : `20260607-login-dev-only-215`

### Completed — Drag & drop coffre + fouille (2026-06-07)

- **Client** : `PanelUI.bindTransferDrag` — glisser-déposer entre conteneurs (coffre ↔ inventaire, cible ↔ joueur).
- **Serveur** : `storage-move`, `sleep-loot-move` + `storage-ops.js` (grille coffre fixe, échanges).
- **Tests** : `tests/storage-ops.test.mjs`
- **Version** : `20260607-transfer-drag-214`

### Completed — Système UI panneaux unifié `PanelUI` (2026-06-07)

- **`panel_ui.js`** : factory partagée (`create`, `makeHeader`, `makeSlot`, `makeSplitBody`, grilles) — une modif = tous les menus.
- **CSS `.zs-panel`** : backdrops, headers, hints, hauteurs `--zs-panel-h` centralisés ; inventaire, craft, coffre, fouille, groupe, QA.
- **Refactor** : `storage_ui.js`, `sleep_loot.js`, headers `inventory.js` / `craft.js`, HTML groupe + QA.
- **Version** : `20260607-panel-ui-213`

### Completed — UI fouille corps / dormeur alignée inventaire (2026-06-07)

- **`sleep_loot.js`** : panneau sombre deux colonnes (cible : équipement + hotbar + sac | votre inventaire en lecture seule).
- **CSS** : `#sleep-loot-panel` partage les styles `#storage-panel` / `.stor-*`.
- **Version** : `20260607-loot-ui-212`

### Completed — UI coffre alignée inventaire (2026-06-07)

- **`storage_ui.js`** : panneau sombre (header, hint, slots `.inv-slot`), deux colonnes PC/tablette (coffre | inventaire joueur).
- **Retrait** : style Minecraft inline dans `game.js` + `chest_ui.js`.
- **CSS** : `#storage-panel` / `#storage-backdrop` dans `style.css` (même famille que `#inv-panel`).
- **Version** : `20260607-storage-ui-211`

### Fixed — PvP dégâts entre joueurs (2026-06-07)

- Rayon hit joueur 0.72 m, visée mêlée conserve origine caméra (désync client/serveur).
- Invincibilité intro scénario seulement pendant les étapes protégées (pas permanent hors acte 1).
- Poing envoie toujours `shoot` au serveur ; membres du même groupe exclus du PvP.
- **Version** : `20260607-pvp-fix-193`

### Fixed — Monde vide après chargement (arbres/zombies) (2026-06-07)

- **Cause** : handler `connect` vidait tout le décor pendant la 1re sync (`Network.preconnect` + socket parallèle au `buildWorld`) ; `disconnect` effaçait le buffer `game-init` ; reconnexion sans nouveau `game-init` (recovery Socket.io).
- **Fix client** : ne plus vider le monde sur `connect` tant que `_hadSpawnReady` est faux ; reset centralisé dans `_finalizeGameInit` ; garde anti double-sync ; buffer `game-init` conservé au disconnect.
- **Fix serveur** : `request-game-init` + helper `_gameInitPayload` pour resync après recovery.
- **Version** : `20260607-sync-fix-195`

### Fixed — Infection uniquement sur morsure zombie (2026-06-07)

- **Symptôme** : barre infection montait sans morsure, mort à 100 % sans coup de zombie clair.
- **Cause** : 25 % d'infection sur **chaque** coup zombie + 15 % sur dégâts PvP ; localStorage client pouvait afficher une infection fantôme.
- **Fix** : `packages/shared/src/survival.mjs` — morsure distincte des griffes (~32 % des attaques, ~68 % transmettent) ; PvP sans infection ; notif client sur `take-damage.infected`.
- **Tests** : `tests/survival-bite.test.mjs`
- **Version** : `20260607-infection-bite-196`

### Completed — Pilules anti-infection + seringue rare (2026-06-07)

- **Pilules** (`med_pilules_anti_infection`) : −20 infection, pause progression 150 s, loot zombie fréquent (~52 %, pool pondéré pilules).
- **Seringue** : guérison totale + 15 PV ; plus de drop zombie ; hôpital en loot rare seulement.
- **Visuel** : blister procédural au sol / en main, anim. prise, badge HUD « Antiviral actif ».
- **Serveur** : `infectionPausedUntil` dans survival-tick + `survival-update`.
- **Version** : `20260607-pills-197`

### Tuning — Faim / soif plus lentes (2026-06-07)

- **Avant** : ~12 min faim, ~8 min soif (depuis 80).
- **Après** : ~33 min faim (`0.04`/s), ~22 min soif (`0.06`/s) — constantes dans `packages/shared/src/survival.mjs`.
- **Version** : `20260607-survival-198`

### Completed — Endurance + sprint (Shift / mobile) (2026-06-07)

- **Barre ⚡** HUD ; sprint ×1,62 (pas en eau) ; drain 22/s, regen 14/s après 0,4 s.
- **PC** : `Shift` maintenu en marchant.
- **Mobile** : bouton ⚡ au-dessus du joystick (visible seulement en déplacement, non superposé aux boutons droite).
- **Boisson énergisante** : +35 endurance (serveur `bonus_endurance`).
- **Version** : `20260607-sprint-199`

### Completed — Rations survie (kit départ + loot zombie) (2026-06-07)

- **Item** `food_sandwich` (+32 faim, +8 soif) ; modèle 3D procédural.
- **Kit départ** : 1 eau + 1 sandwich en sac (`ensureStarterRations` si aucun aliment).
- **Loot zombie** : eau/sandwich/conserves pondérés (~50 % drop) + pilules/bandage/munitions.
- **Respawn** : rations incluses dans `STARTING_ITEMS`.
- **Version** : `20260607-rations-200`

### Fixed — Sprint mobile + badges HUD (2026-06-07)

- **Sprint** : `setPointerCapture`, plus de `pointerleave` / `disabled` ; bouton figé pendant l'appui (évite le jitter).
- **HUD** : badges saignement/infection descendus sous la barre d'endurance (`top: 132px`).
- **Version** : `20260607-sprint-ui-201`

### Fixed — Inventaire sac : déplacement refusé (2026-06-07)

- **Symptôme** : échange bouteille/sandwich (sac) → « Déplacement refusé » ; caillou (hotbar) OK.
- **Cause** : sac serveur compact (longueur 2) vs grille client (8 slots) → index hors limites.
- **Fix** : `ensureSlotGrid` dans `moveInvSlot` (hotbar 6 + sac selon équipement Dos).
- **Tests** : `inventory-ops.test.mjs`.

### Completed — Inventaire drag & drop (2026-06-07)

- **Déplacement** : glisser-déposer (souris + tactile) remplace le double-clic ; fantôme, surbrillance cible, fusion/échange inchangés.
- **Version** : `20260607-inv-drag-210`

### Completed — Inventaire PC / tablette + descriptions objets (2026-06-07)

- **Inventaire** : fenêtre taille fixe (comme artisanat) ; colonne **Détail** avec description de l'objet sélectionné.
- **Items** : champ `desc` pour chaque entrée du registre (`items.js`).
- **Mobile** : panneau inchangé (pas de colonne détail).
- **Version** : `20260607-inv-detail-209`

### Fixed — Panneau artisanat taille fixe PC / tablette (2026-06-07)

- **Craft** : hauteur uniforme quel que soit l'onglet (Matériaux, Outils, Armes…) — zone recettes scrollable ; mobile inchangé.
- **Version** : `20260607-craft-panel-208`

### Changed — HUD kills → joueurs tués (2026-06-07)

- **HUD** : retrait du compteur zombies (☠️) ; affichage **⚔️ joueurs tués** (`lifePlayerKills`, reset au respawn).
- **Serveur** : `playerKills` dans `game-init` et `score-update`.
- **Version** : `20260607-hud-pvp-207`

### Fixed — Sprint + regard caméra (mobile / tablette) (2026-06-07)

- **Sprint maintenu** : glisser le doigt sur ⚡ (même hors du bouton) tourne la caméra — plus bloqué en ligne droite.
- **Position ⚡** : décalé vers la gauche (`right: 82px`) pour marge au bord écran ; rechargement `right: 152px`.
- **Version** : `20260607-sprint-pos-206`

### Fixed — Bouton chat tablette (2026-06-07)

- **Symptôme** : 💬 absent sur tablette (iPad / Android tablet).
- **Cause** : tablette = `mode-desktop` sans `mode-mobile` → CSS masquait `#chat-btn` et le bouton Envoyer.
- **Fix** : afficher chat sur `mode-tablet` ; clavier virtuel + envoi tactile comme mobile.
- **Version** : `20260607-tablet-chat-204`

### Fixed — Sprint mobile (position) + bouton rechargement fantôme (2026-06-07)

- **Sprint** : fixé à droite au-dessus du bouton d'attaque (`bottom: 188px`), plus au-dessus du joystick.
- **Bouton ⟳** : c'était **Recharger** — affiché par erreur sur toutes les armes (CSS `display:flex !important`) ; visible uniquement avec une arme à feu, libellé **R**.
- **Version** : `20260607-sprint-pos-203`

### Fixed — Textures arbres (fluo jour/nuit) (2026-06-07)

- **Symptôme** : feuillage vert fluo sans atlas, jour et nuit.
- **Cause** : `emissive` = teinte verte forte (0.32) masquait la texture ; arbres chargés après le 1er `tickTreeLighting` gardaient l'émissif max.
- **Fix** : émissif subtil (`0x142010`, ~0.08), teinte via `color` + `map` ; sync jour/nuit à la création du matériau (`getFoliageDayBlend`).
- **Version** : `20260607-tree-tex-202`

### Fixed — Sync game-init : retry + pas de monde vide silencieux (2026-06-07)

- **Symptôme** : plage vide, pas d’arbres/zombies/inventaire ; le joueur peut bouger (sync échouée mais `_spawnReady` forcé).
- **Cause** : échec `game-init` (restarts nodemon, reconnexion) + catch qui libérait le joueur sans retry.
- **Fix** : retry auto `request-game-init` (8 essais), flush pending dès `init()`, resync après reconnexion, pas de reset loading pendant sync.
- **Données** : SQLite locale intacte (1755 décor, 768 arbres, 70 zombies) — pas de perte de travail.
- **Version** : `20260607-sync-fix-195`

### Fixed — Crash boot serveur spatial grid (2026-06-07)

- `import(SPATIAL_GRID_URL)` placé après la déclaration de la constante (TDZ).
- Serveur redémarré, health + smoke OK.

### Completed — Audit perf phase 5 chargement + arbres (2026-06-07)

- **Chargement** : socket parallèle au `buildWorld`, buffer `game-init` (`Network.preconnect`).
- **Client** : cache géométries/matériaux arbres (`tree_prefabs.js`).
- **Version** : `20260607-perf-phase5-192`

### Completed — Audit perf phase 4 (2026-06-07)

- **Serveur** : grille spatiale zombies pour sync rayon 110 m (broadcast multi-joueurs).
- **Client** : cache BoxGeometry + MeshLambertMaterial partagés (zombies, joueurs distants).
- **Version** : `20260607-perf-phase4-191`

### Completed — Audit perf phase 3 serveur autoritaire (2026-06-07)

- **Serveur** : delta sync zombies (updates + removed, snapshot 2 s), grille joueurs AI, DT wall-clock plafonné.
- **Client** : `Zombies.applyDelta`, `getCollidersForServer`, skip colliders si `worldCollidersReady`.
- **Shared** : `packages/shared/src/spatial-grid.mjs` + tests.
- **Version** : `20260607-perf-phase3-190`

### Completed — Audit perf phase 2 + chargement client (2026-06-07)

- **Doc** : `docs/PERFORMANCE.md` — pipeline boot, runtime, serveur, roadmap chargement.
- **Runtime** : grille colliders `getCollidersNear`, cache `getStandHeight`, mouvement 30 m.
- **Chargement** : yield chaque script legacy, `qa-panel`/`groups`/`map` différés, `ZS.loadScript`, sync zombie unique, log timing game-init.
- **Version** : `20260607-perf-phase2-189`

### Completed — Écran récap mort + notif RIP (2026-06-07)

- **Mort** : récap (zombies tués, joueurs tués, temps survécu) + bouton respawn ; stats par vie (`lifeZombieKills`, `lifePlayerKills`, `lifeStartedAt`).
- **Autres joueurs** : notif `RIP <pseudo>` à la mort d’un joueur.
- **Version** : `20260607-death-recap-188`

### Completed — Optimisations perf phase 1 (2026-06-07)

- **Audit** : `docs/PERFORMANCE.md` — roadmap mobile + sync mobs.
- **Client** : interpolation zombie (lerp), dispose GPU, `_cullLights` sans traverse, UI porte throttlée, vectors réutilisés.
- **Serveur** : `zombie-tick` par joueur (rayon 110 m), `zombie-hit` avec x/z/angle, fin persist zombie toutes les 5 s.
- **Version** : `20260607-perf-phase1-187`

### Completed — Fix fouille sleeper : caillou/torche recréés au réveil (2026-06-07)

- **Bug** : après fouille totale du corps endormi, caillou + torche réapparaissaient à la reconnexion (autres items correctement retirés).
- **Cause** : `ensureStarterRock` / `ensureStarterTorch` (serveur) et équivalents client sur inventaire vide.
- **Fix** : flag `wokeFromSleep` dans `game-init` — pas de kit de départ au réveil depuis sleeper.
- **Version** : `20260607-sleep-wake-no-starter-186`

### Completed — Fix fouille sleeper : items restaurés à la reconnexion (2026-06-07)

- **Bug** : après fouille du corps endormi (déco), le joueur reconnecté récupérait son inventaire d’origine.
- **Cause** : `_persistPlayer` à la déco écrasait la DB après le loot ; reconnexion pouvait ignorer l’état sleeper.
- **Fix** : inventaire sleeper autoritaire (`wakeInv`), pas de `_persistPlayer` à la déco si corps endormi, `_saveSleepingToDb` await au loot.

### Completed — Fix PvP bloqué par les zombies (2026-06-07)

- **Bug** : les dégâts entre joueurs ne passaient plus dès qu’un zombie était plus proche sur la ligne de tir (fréquent sur la plage).
- **Fix** : raycast joueurs en priorité quand PvP actif (`findPlayerShootTarget`), puis zombies ; `heal` RCON réinitialise `_deathHandled` ; reconnexion préserve l’état cadavre.
- **Tests** : `tests/combat.test.mjs` — joueur touché même si zombie plus proche sur le rayon.

### Completed — Fix « Interface de fouille indisponible » (2026-06-07)

- **Cause** : `chest_ui.js` parfois non chargé (cache bootstrap Vite) → `ZS.ChestUI` absent.
- **Fix** : grille Minecraft intégrée dans `sleep_loot.js` ; cache-bust sur import `legacy-modules.js`.
- **Version** : `20260607-loot-selfcontained-185`

### Completed — Fix fouille E : panneau invisible (2026-06-07)

- **Bug** : E libérait le curseur (écran gris) sans afficher le panneau — styles inline écrasés, toggle E fermait l'UI.
- **Fix** : CSS `#sleep-loot-panel` + classe `is-open`, masquer `pc-play-hint`, fouille prioritaire sur E, Échap pour fermer.
- **Version** : `20260607-loot-panel-fix-184`

### Completed — Fix hint « E — Fouiller » persistant (2026-06-07)

- **Bug** : le bouton restait affiché après respawn du corps (return anticipé sans masquer le bouton).
- **Version** : `20260607-fouiller-hint-fix-183`

### Completed — UI fouille style coffre Minecraft (2026-06-07)

- **`chest_ui.js`** : grille 9×, slots gris biseautés, compteur quantité (style coffre).
- **`sleep_loot.js`** : panneau haut = corps (équip + hotbar + sac), bas = votre inventaire ; clic pour prendre.
- **Échap** ferme la fouille ; curseur libéré comme le coffre.
- **Version** : `20260607-corpse-chest-ui-182`

### Completed — Fouille corps mort au sol (2026-06-07)

- **Mort** : inventaire conservé dans `_deathInv` — fouillable (E / bouton) avant respawn.
- **Respawn** : sac au sol uniquement pour les objets restants après fouille.
- **Client** : `findNearestLootable` (dormeurs + corps ☠), panneau fouille adapté.
- **Version** : `20260607-corpse-loot-181`

### Completed — Fix flash dégâts joueur (2026-06-07)

- **Bug** : le joueur touché restait rouge (materials partagés entre meshes du rig).
- **Fix** : `flashMeshMaterials` — une restauration par material unique, timer groupé.
- **Version** : `20260607-hit-flash-180`

### Completed — Mort : corps couché avant respawn (2026-06-07)

- **Phase couchée** : à la mort, le joueur s'allonge au sol (pose `applySleepPose`) jusqu'au clic Respawn.
- **Loot différé** : le sac `death_bag` apparaît au respawn, pas à la mort.
- **Multijoueur** : `player-death` broadcast → retrait avatar debout + corps ☠ ; `player-respawn` au respawn.
- **Version** : `20260607-death-corpse-179`

### Completed — Système de groupes (2026-06-07)

- **Serveur** : `apps/server/src/groups.mjs` — création, invitation, accept/refus, expulsion, quitter, dissoudre (max 6 membres).
- **Client** : menu ☰ → Groupe ; panneau overlay avec liste membres, invite joueurs en ligne, bannière invitation.
- **Events** : `group-create`, `group-invite`, `group-invite-respond`, `group-kick`, `group-leave`, `group-disband` ; sync `group-state`.
- **Shared** : `packages/shared/src/groups.mjs` + tests.
- **Version** : `20260607-groups-178`

### Completed — PvP + collisions joueurs (2026-06-07)

- **Collisions** : repoussement cylindrique entre joueurs locaux / distants / corps endormis (`resolveRemotePlayerCollision`).
- **PvP serveur** : raycast `shoot` touche joueurs + zombies (cible la plus proche) ; mort, loot sac, kills.
- **Shared** : `packages/shared/src/combat.mjs` + tests ; flag serveur `pvp` (RCON `pvp on|off`).
- **Version** : `20260607-pvp-collide-177`

### Completed — Fix respawn plage (2026-06-07)

- **Bug** : le client se réveillait avant `respawn-at` et renvoyait la position de mort → respawn au même endroit.
- **Fix** : attendre `respawn-at` côté client ; reset `lastX/lastZ` + grâce anti-cheat serveur ; scénario intro préservé à la mort.
- **Version** : `20260607-respawn-beach-176`

### Completed — Forêt : décor procédural dense (2026-06-07)

- **Textures** : `forest_textures.js` — mousse, écorce, fougères, champignons, litière, aiguilles, baies, rochers moussus.
- **Zone** : `forest_footprint.js` — ouest de la carte (hors plage, sentier, clairière, eau).
- **Props** : `forest_decor.js` — ~105/205 groupes + litière/cailloux/glands instanciés ; fougères, rondins, souches, champignons, buissons, débris rares.
- **Chargement** : différé en `requestIdleCallback` après la plage (`finishForestDecorAsync`).
- **Version** : `20260607-forest-decor-175`

### Completed — Intro plage Acte 1 : scénario guidé (2026-06-07)

- **Narration** : 3 actes (rivage → silhouette → premier zombie) ; réveil, exploration safe, combat au caillou, bandage garanti, épilogue.
- **Serveur** : `inventory.scenario` persisté ; zombie tutoriel gelé par joueur ; filtre sync plage ; pas de respawn après kill tutoriel.
- **Client** : `spawn_scenario.js` (HUD, dialogues, flèche ouest) ; silhouette sombre dans `zombie.js` ; `spawn_intro.js` branché sur le serveur.
- **Shared** : `packages/shared/src/scenario-beach.mjs` + tests ; events `scenario-advance` / `scenario-update`.
- **RCON** : `scenario-reset <joueur>` pour QA.
- **Version** : `20260607-beach-scenario-174`

### Completed — Chargement : terrain async à 32 % (2026-06-07)

- **Terrain** : génération par lignes avec `await rAF` ; grille 28/44 (ex. 72) ; maillage indexé corrigé.
- **Routes/eau** : tests rivière/route une fois par cellule (pas par triangle erroné).
- **Version** : `20260607-terrain-async-173`

### Completed — Chargement : plus de freeze à 22 % (2026-06-07)

- **Scripts** : injection par paires avec `rAF` entre chaque lot (Chrome ne bloque plus sur 46 modules d’un coup).
- **Monde** : `buildWorldAsync` avec yields ; décor plage en `requestIdleCallback` après le sable/mer.
- **Routes desktop** : `buildMeshes` aussi différé en idle.
- **Version** : `20260607-load-yield-172`

### Completed — Perf client : réduction lag (2026-06-07)

- **Terrain** : géométrie indexée, SEG 40/72 (ex. 55k verts non-indexés).
- **Eau** : normales recalculées 1×/5 frames ; éclairage foliage seulement si delta > 0.025.
- **Colliders** : cache par frame (`ZS._frameId`) — plus de double `slice()` par tick.
- **Lumières** : tri des PointLights max 1×/4 frames si caméra stable.
- **Plage** : pool 10 galets / 6 bois, géos partagées, ~60 % moins de props/instances.
- **Arbres** : LOD mesh (~22–48 % moins de feuillage selon plateforme).
- **Rendu** : pixel ratio 1.15 mobile / 1.5 desktop ; sync décor par chunks plus petits.
- **Version** : `20260607-perf-opt-171`

### Completed — Plage : petits détails texturés (2026-06-07)

- **Textures** : coquillages, bois/rondins, galets, herbes, algues, tissu, caisses, filets, rouille, corail, déchets, verre de mer, dollars des sables.
- **Densité** : ~280 groupes + ~940 instances (coquillages/galets/éclats bois) desktop ; allégé mobile.
- **Nouveaux props** : rondins courts, éclats bois, déchets (bouteille, canette, plastique), corde, verre poli.
- **Version** : `20260607-beach-detail-tex-170`

### Completed — Plage : texture sable + décor enrichi (2026-06-07)

- **Sable** : texture 256px procédurale, UV monde sur la dalle, bande rivage humide, sync jour/nuit.
- **Décor** : ~165 props (88 mobile) — surfboards, transats, mares, filets, barils, feu de camp, épave.
- **Version** : `20260607-beach-sand-decor-169`

### Completed — Arbres : plus de glow la nuit (2026-06-07)

- **Cause** : `emissive` fixe sur feuillage/troncs — visible dans le noir.
- **Fix** : registre `_litMats` + `tickTreeLighting(dayBlend)` appelé depuis `tickDayNight` ; emissive à 0 la nuit.
- **Version** : `20260607-tree-night-fix-168`

### Completed — Forêt : arbres plus détaillés (2026-06-07)

- **Chêne** : tronc segmenté, racines, branches latérales, hub de feuillage, touffes basses.
- **Pin** : étages décalés, branchettes latérales, cime, racines.
- **Bouleau** : écorce marquée, rameaux pendouillards, plus de masses foliaires.
- **Mort** : tronc segmenté + branches croisées.
- **Version** : `20260607-forest-trees-detail-167`

### Completed — Forêt : arbres plus lumineux (2026-06-07)

- **Chêne / pin / bouleau** : feuillage vert clair + emissive ; troncs éclaircis ; pas d'ombre portée sur le feuillage.
- **Arbre mort** : brun un peu plus lisible (emissive léger).
- **Helpers** : `_trunkMat` / `_leafMat` partagés avec les palmiers.
- **Version** : `20260607-forest-trees-light-166`

### Completed — Palmiers : jointures tronc sans espacement (2026-06-07)

- **Cause** : segments à 90 % de hauteur + anneaux scar dans le vide entre les morceaux.
- **Fix** : cylindres empilés pleine hauteur, rayons alignés joint à joint, scar fin en chevauchement.
- **Version** : `20260607-palm-trunk-fix-165`

### Completed — Palmiers + décor plage (2026-06-07)

- **Palmiers** : tronc clair segmenté, frondes lumineuses (emissive), noix de coco, herbes à la base.
- **Décor** : `beach_decor.js` — ~118 props (62 mobile) : coquillages, galets, bois flotté, parasols, serviettes, bouée, caisses, algues, etc.
- **Version** : `20260607-beach-palm-decor-164`

### Completed — Plage : sable invisible / terrain sombre (2026-06-07)

- **Cause** : normales inversées sur la couverture sable ; terre foncée sous la dalle ; enfoncement excessif ; double sink dans `proc_spawn`.
- **Fix** : hauteurs simplifiées (`BEACH_CAP_LIFT`) ; winding corrigé ; sable peint sur le terrain en secours ; emissive léger ; `minBw` 0.08.
- **Version** : `20260607-beach-visible-163`

### Completed — Plage : fix z-fight couche 1 / couche 2 (2026-06-07)

- **Cause** : fond de dalle sable coplanaire avec le terrain + 2e dalle rivage + `polygonOffset` ; sable peint sur le terrain sous la dalle.
- **Fix** : dalle = surface seule ; terrain enfoui avec marge (`BEACH_TERRAIN_GAP`) ; 1 seule couverture ; terre sous dalle (pas sable) ; hauteur plage sans double sink.
- **Version** : `20260607-beach-layer-fix-162`

### Completed — Palmiers : récolte bois jusqu'à l'abattage (2026-06-07)

- **Cause** : sync `decor-tree-chop` / `decor-tree-fell` en broadcast seulement — le joueur local gardait l'arbre debout avec `woodRemaining = 0` (coups sans loot).
- **Fix** : `io.emit` côté serveur ; chute forcée si bois épuisé (`applyRemoteTreeChop`) ; anti-doublon `registerChoppableTree` ; `tree_palm` dans `TREE_WOOD_MAX`.
- **Version** : `20260607-palm-chop-fix-161`

### Completed — Torche : éclairage réaliste renforcé (2026-06-07)

- **Faisceau** : `SpotLight` directionnel (cone ~35°, portée 32 m) là où le joueur regarde.
- **Halo** : `PointLight` proche (int. 18) + pool doux (int. 3.2, 44 m) ; flamme légèrement agrandie.
- **Culling** : lumières `playerTorch` toujours actives ; monde limité à N lumières.
- **Version** : `20260607-torch-light-160`

### Completed — Fix boutons HUD tablette (joystick vs UI) (2026-06-07)

- **Cause** : zones `#left-zone` / `#right-zone` en z-index 240 interceptaient les touches avant les boutons.
- **Fix** : zones en `pointer-events: none` ; `elementFromPoint` + rectangles HUD exclus du handler move/look.
- **Version** : `20260607-touch-ui-fix-159`

### Completed — Joystick : capture pointer globale (tablette) (2026-06-07)

- **Cause** : touches captées par le canvas plein écran — `#left-zone` jamais atteinte.
- **Fix** : `pointerdown/move/up` en capture sur `document` (gauche 44 % = move, droite = visée) ; détection `maxTouchPoints` prioritaire ; boot au 1er toucher.
- **Version** : `20260607-touch-capture-158`

### Completed — Fix joystick tablette (mode hybride) (2026-06-07)

- **Cause** : `input-touch` parfois absent sur tablette → `_setupJoystick` ne s’exécutait pas.
- **Fix** : `needsTouchControls()` / `detectTabletDevice()` ; init forcée si `mode-tablet` ; z-index zones tactiles ; CSS `display:flex` boutons tir.
- **Version** : `20260607-tablet-joyfix-157`

### Completed — Tablette hybride : contrôles tactiles + UI PC (2026-06-07)

- **Séparation** : `input-touch` (joystick, visée, boutons) vs `mode-desktop` / `mode-mobile` (inventaire, craft, chat).
- **Tablette** (`mode-tablet`) : `input-touch` + `mode-desktop` — pas le layout téléphone.
- **CSS** : zones tactiles liées à `.input-touch` ; chat/craft/inv restent PC sur tablette.
- **Version** : `20260607-tablet-hybrid-156`

### Completed — Tablette : contrôles tactiles + chargement allégé (2026-06-07)

- **Cause** : tablettes paysage (>900 px) ou iPadOS (UA « Macintosh ») classées en `mode-desktop` → joysticks/boutons masqués, hint « Cliquez pour jouer ».
- **Fix** : `device.js` + `detectTouchGameMode()` (iPad `maxTouchPoints`, Android tablette, tactile sans hover).
- **Filet** : `ui.js` force `mode-mobile` si tactile détecté après coup ; CSS masque `#pc-play-hint` en mobile.
- **Perf tactile** : terrain SEG 48, pas d’ombres ni étoiles, routes différées (`requestIdleCallback`), `shadowMap` off.
- **Version** : `20260607-tablet-touch-155`

### Completed — Chargement mobile : scripts parallèles + game-init allégé (2026-06-07)

- **Scripts** : fetch parallèle des 42 modules legacy puis exécution ordonnée (vs 42 allers-retours séquentiels).
- **Serveur** : `game-init` n’envoie plus tous les arbres — proches spawn seulement (100 m mobile / 180 m desktop) ; reste via `GET /api/world/decor-trees`.
- **Socket** : `auth.client = mobile|desktop` pour adapter le rayon côté serveur.
- **Mobile** : terrain SEG 64, ombres 512, moins d’étoiles/nuages, plage moins dense, lots décor 40.
- **Version** : `20260607-load-mobile-154`

### Completed — Chargement : terrain allégé + décors progressifs (2026-06-07)

- **Terrain** : `SEG` 144 → 96 (~55 % moins de sommets) ; cache `beachCoastWeight` par vertex.
- **Sync décor** : rochers/bâtiments/arbres proches spawn en priorité ; arbres lointains (>180 m) en arrière-plan après `_spawnReady`.
- **Batch** : chunks 128, `requestAnimationFrame` tous les 2 lots (au lieu de 64 + rAF à chaque lot).
- **Debug** : `window.__ZS_PERF = true` → logs `[world] terrain|buildings|roads` dans la console.
- **Version** : `20260607-load-opt-153`

### Completed — Palmiers plage `tree_palm` (2026-06-07)

- **Prefab** : `buildPalm` — tronc + frondes, choppable comme les arbres (`tree_*` pipeline).
- **Plage uniquement** : `palm-placements.mjs` — seed ~20, repousse cible 16–28, bois max 6.
- **Serveur** : `ensureBeachPalms`, `tickPalmSpawn`, compteurs forêt/palmiers séparés.
- **RCON** : `decorseed palms [reset]`, `decorprefabs palm`, `decoradd prefab tree_palm`.
- **Version** : `20260607-beach-palms-152`

### Completed — Plage : dalle sable épaisse 35 cm (2026-06-07)

- **Visuel** : couche 2 = volume (top + bottom + côtés), plus un plan fin — terrain couche 1 enfoncé sous la plage.
- **Collisions** : joueur sur le dessus de la dalle ; `getVisibleTerrainHeight` inclut l'enfoncement.
- **Z-fight** : `renderOrder` sable 8/9, terrain 0, polygonOffset renforcé.
- **Version** : `20260607-beach-slab-151`

### Completed — Plage : marche sur le mesh sable (couche 2) (2026-06-07)

- **Cause** : joueur posé sur le terrain herbe (couche 1) — mesh sable non enregistré comme sol.
- **Fix** : `getBeachSurfaceHeight()` + `registerGroundMesh` sable/rivage ; `getDecorGroundHeight` prend le max terrain/sable.
- **Version** : `20260607-beach-ground-150`

### Completed — Plage naturelle : bords adoucis + rivage opaque (2026-06-07)

- **Forme** : `beachCoastWeight()` — croissant côte est (fins N/S courbes, pas d'angle droit).
- **Couleur terrain** : dégradé sable/herbe ; plus de bande verte/brune entre océan et plage.
- **Rivage mouillé** : sable opaque (plus de transparence sur l'herbe).
- **Mesh sable** : vertices masqués hors croissant ; patch terrain sans clearing disc (évite terre marron).
- **Fichiers** : `beach_coast.js`, `beach-spawn.mjs`, `proc_spawn.js`, `world.js`, `noise.js`.
- **Version** : `20260607-beach-natural-149`

### Completed — Torche au kit de départ (2026-06-07)

- **Serveur** : `STARTING_ITEMS` hotbar slot 2 = `tool_torche` ; `ensureStarterTorch()` à la connexion si absent (rejoin de nuit).
- **Client** : `ensureStarterTorche()` secours après `game-init` ; respawn idem.
- **Version** : `20260607-starter-torch-148`

### Completed — Son coupé par défaut (2026-06-07)

- **Audio** : muet au premier lancement (`zs_audio_muted` absent → mute) ; menu ☰ pour réactiver.
- **Version** : `20260607-audio-muted-default-147`

### Completed — Mega-forêt S01 + côte sable pleine (2026-06-07)

- **Côte** : rectangle sable x244–295 (plus de bande herbe) ; eau chevauche le rivage.
- **Forêt** : ~750 arbres seed (+ zones north/south/west) ; regen cible 220, 8/tick.
- **Version** : `20260607-mega-forest-coast-146`

### Completed — Plage côte + forêt littorale (2026-06-07)

- **Visuel** : sable jusqu'au bord map (plus de bande herbe entre sable/eau) ; terrain mesh = couleur sable sous la plage.
- **Forêt** : zones `coastal_edge` / `coastal_littoral` — arbres dès la fin du sable.
- **Version** : `20260607-beach-coast-forest-145`

### Completed — Plage bord est map (2026-06-07)

- **Position** : côte est (`x≈272`), océan à l'horizon, ~250 m de sentier avant la clairière forêt.
- **Gameplay** : réveil sur la plage au bord → marche vers l'ouest → lisière → forêt S01.
- **Reset serveur** : `.beach_spawn_v3_east_edge` (one-shot).
- **Version** : `20260607-beach-east-edge-144`

### Completed — Fix stack overflow build_anchors (2026-06-07)

- **Symptôme** : `game-init failed RangeError: Maximum call stack size exceeded` → connexion Socket.io coupée.
- **Cause** : `_isCoherentDeck` ↔ `listAdjacentFoundations` en récursion infinie (fondation comptée comme sa propre voisine).
- **Fix** : voisins géométriques `_neighborsAtRaw` sans filtre cohérence ; exclusion cellule `< 0.35 m`.
- **Version** : `20260607-build-anchors-stackfix-143`

### Completed — Fix artisanat PC (layout) (2026-06-07)

- **Cause** : styles inline dans `craft.js` forçaient `width: 360px` (mobile) sur PC → grille 2 colonnes écrasée.
- **Fix** : layout 100 % CSS ; panneau desktop `780px`, onglets + grille, scrollbars propres.
- **Version** : `20260607-craft-desktop-fix-142`

### Completed — Plage spawn + intro réveil (2026-06-07)

- **Carte** : plage déplacée au bord est de la forêt S01 (`72,-8`), sentier vers clairière `(0,-6)`.
- **Visuels** : texture sable procédurale, océan large à l'est, sable mouillé, bois flotté.
- **Intro** : première connexion — réveil au sol, bulle scénario (mobile + PC), montée caméra puis contrôle.
- **Serveur** : reset unique `.beach_spawn_v2_forest_edge` pour repositionner les comptes existants.
- **Version** : `20260607-beach-intro-141`

### Completed — Repousse arbres/rochers accélérée (2026-06-07)

- **Regen** : intervalles 10 s / 12 s (ex. 25 / 35), batch 5 arbres + 3 rochers, cibles 85 / 75.
- **Arbres regen** : départ phase 2 (~50 % bois) au lieu de pousse vide.
- **Croissance** : `GROWTH_PHASE_MS` 45 s (ex. 120 s) ; tick regen serveur 5 s.
- **Version** : `20260607-resource-regen-faster-140`

### Completed — Serveurs multi-domaines (Badom + preview prod) (2026-06-07)

- **`GET /api/servers`** : liste dynamique, même origine = pas de redirect, auto-sélection par `SERVER_ROLE`.
- **`.env`** : `ZS_TEAM_URL` (défaut survival.badom.ch), `ZS_PROD_URL` optionnel (défaut = preview [3k51myccypp](https://3k51myccypp.preview.infomaniak.website))
- **Dev/QA** sur [survival.badom.ch](https://survival.badom.ch/) ; prod = [preview Infomaniak](https://3k51myccypp.preview.infomaniak.website/game.html) (branche `main`)
- **Version** : `20260607-multi-domain-servers-139`

### Completed — Workflow Dev / QA / Prod + checklist QA (2026-06-07)

- **Connexion** : choix du serveur (dev / QA / prod) via `servers.json` sur l'écran login.
- **SERVER_ROLE** : `dev` (admins only), `qa` (checklist menu ☰), `prod` (défaut).
- **QA** : campagnes, items à tester, verdicts ✓/✗ + feedback, stats testeurs, commandes RCON `qa …`.
- **Docs** : `docs/QA_WORKFLOW.md`, `.env.example` mis à jour.
- **Version** : `20260607-dev-qa-prod-138`

### Completed — Audit pass 8 : HP armure authoritatif (2026-06-07)

- **Fix anti-cheat / désync** : bonus de vie à l'équipement d'armure géré côté serveur (`syncArmorHealth` dans `item-effects.mjs`), plus de gain HP optimiste côté client.
- **Serveur** : `inventory-move` et `item-drop` (zone `equip`) émettent `survival-update` après changement d'armure ; drop équipement accepte la zone `equip`.
- **Tests** : +3 tests `syncArmorHealth` (125 tests total).
- **Version** : `20260607-armor-hp-authority-137`

### Completed — Auto purge cache client (version gate) (2026-06-07)

- **Source unique** : `apps/client/public/client-version.json` — remplace les `CACHE_BUST` manuels dans `game.html`.
- **API** : `GET /api/client-version` + champ `clientVersion` sur `/api/health`.
- **Client** : au boot, compare avec `localStorage` → purge caches + reload si update ; CSS/JS chargés avec `?v=version`.
- **Serveur** : `game.html` injecte `__CLIENT_VERSION__` ; assets JS/CSS en `no-cache`.
- **Version** : `20260607-client-version-gate-136`

### Completed — Audit pass 7 : cap zombie 70 + perf réseau (2026-06-07)

- **Perf critique** : trim des zombies excédentaires (persist/RCON > 70) — les plus éloignés des joueurs retirés au boot et toutes les 2 min.
- **Module** : `zombie-population.js` + tests unitaires.
- **Client** : `setWorldTime` sur `zombie-tick` seulement si delta > 0.0005.
- **Boot log** : affiche `zombies.size` réel + `zombieTarget`.
- **Cache bust** : `20260607-server-authority-135`

### Completed — Audit pass 6 : RCON barrières + tests robustes (2026-06-07)

- **RCON** : `road_barrier_post` / `road_barrier_rail` ajoutés à `decorprefabs`.
- **Client** : retrait fallback `removeItem('tool_verrou')` dans `network.js`.
- **Tests** : `rcon-test.mjs` — `decorremove` dynamique (id issu de `decoradd`).
- **Cache bust** : `20260607-server-authority-134`

### Completed — Audit pass 5 : nettoyage client + test survie (2026-06-07)

- **Verrou porte** : retrait du fallback client `removeItem('tool_verrou')` — inventaire serveur uniquement.
- **Carte** : `receivePickup('map')` ignoré (pas d'item inventaire).
- **Tests** : `survival-tick.test.mjs` (faim/soif, saignement, infection mortelle).
- **Cache bust** : `20260607-server-authority-133`

### Completed — Audit pass 4 : désynchro mort + perf réseau (2026-06-07)

- **Mort** : écran de mort uniquement via `player-death` (plus de double déclenchement client sur `take-damage`).
- **Respawn** : retrait du `take-damage` redondant → `survival-update` + `respawn-at`.
- **Survie** : broadcast `survival-update` seulement si valeurs affichées changent (faim/soif/infection/HP arrondis).
- **Zombies** : une seule raycast LOS par tick (réutilisation `hasLOS` pour morsure) ; skip LOS si joueur > 15 m ; snapshot compact sur `request-zombie-sync`.
- **Cache bust** : `20260607-server-authority-132`

### Completed — Perf & fluidité multijoueur (2026-06-07)

- **Inventaire** : coalescence `inventory-authoritative` ; tir/chop/mine regroupés ; hotbar patch partiel (slots modifiés seulement).
- **Zombies** : payload compact ; throttle terrain/HP client ; **fix `DETECT_RANGE`** (régression IA) ; LOS attaque optimisé ; morsure/infection **serveur**.
- **Survie** : plus de double `take-damage` faim/soif ; HP authoritatif sur coup zombie + `survival-update` immédiat.
- **Cache bust** : `20260607-server-authority-131`

### Completed — Audit post-migration authorité (2026-06-07)

- **Corrections** : typo RCON `kill` ; rollback `inventory-move` ; `weapon-reload` serveur ; durabilité outils serveur (`wearInvTool`, `durabilityMax` dans `weapon-stats.mjs`) ; équipement hotbar via `inventory-move` ; RCON `heal` → `survival-update` ; handler `item-add` retiré.
- **Nettoyage** : code craft client mort retiré.
- **Tests** : `craft-queue.test.mjs`, `wearInvTool` dans `inventory-ops.test.mjs`.
- **Vérif** : `npm test` 112 tests, `npm run lint` 0 erreurs, smoke OK.
- **Cache bust** : `20260607-server-authority-129`

### Completed — Migration serveur authoritatif (anti-cheat) (2026-06-07)

- **Inventaire** : `inventory-ops.js` ; plus de `inventory-sync` ; pickup/drop/deposit authoritatifs ; `inventory-move`, `inventory-authoritative`.
- **Survie** : tick serveur 1 s ; `use-item` ; `survival-update` ; mort via `player-death` serveur.
- **Craft** : `craft-recipes.mjs` + `craft-queue.js` ; events `craft-queue` / `craft-cancel`.
- **Combat** : `weapon-stats.mjs` ; `shoot` avec `weaponType` ; ammo débitée serveur.
- **Récolte** : chop/mine grantent items serveur (`toolType`).
- **Build** : placement consomme inv serveur ; fallback timeout client retiré.
- **Monde** : colliders décor client rejetés.
- **Docs** : `docs/ARCHITECTURE.md` section Server authority.
- **Tests** : `inventory-ops.test.mjs`, `item-effects.test.mjs`.
- **Cache bust** : `20260607-server-authority-127`

### Tuning — cycle jour/nuit 15 min / 15 min (2026-06-07)

- **Durée** : cycle complet 30 min (`_DAY_DURATION` / `_DAY_LENGTH_SEC` = 1800 s) — soleil au-dessus de l'horizon ≈ 15 min, en dessous ≈ 15 min.
- **Fichiers** : `apps/server/index.js`, `apps/client/public/js/world.js`, `docs/RCON.md`.
- **Cache bust** : `20260607-daynight-15m-126` (redémarrer le serveur Node pour appliquer côté serveur).

### Fix — panneau craft mobile transparent (2026-06-07)

- **Cause** : refactor craft (styles déplacés en CSS) sans cache-bust sur `style.css` → panneau sans fond opaque côté mobile.
- **Fix** : styles critiques réappliqués en inline sur `#craft-panel` / backdrop ; feuille mobile (bas d’écran, fond `#0a0906`) ; lignes recettes en classes CSS ; `style.css?v=…`.
- **Cache bust** : `20260607-craft-mobile-fix-125`

### Fix — coffre sur fondation : mesh dans le ciel (2026-06-07)

- **Cause** : `storage_chest` ignorait `resolveStructureBaseY` / anti-ciel (réservé aux murs/portes).
- **Fix** : même résolution hauteur que structures bois + sync `decor-floor-height` + clamp à la pose.
- **Cache bust** : `20260607-chest-foundation-y-124`

### Fix — verrou porte : clé au sol si inventaire plein (2026-06-07)

- **Cause** : `item-add` avant retrait client du verrou → inventaire plein, clé perdue ; drop serveur parfois absent (stack verrou non vidé).
- **Fix** : `_addStackToInv` + drop `struct_cle` au pied de la porte si reste ; sync `inventory-authoritative` ; notif « clé au sol ».
- **Cache bust** : `20260607-door-key-drop-123`

### UX — file craft mobile : HUD en haut (2026-06-07)

- **Problème** : progression fabrication en bas à gauche, sur les boutons ⚒/🎒/🗺️.
- **Fix** : `#craft-queue-hud` à droite des barres vie/faim/soif ; sous les barres sur très petit écran (<420px).
- **Cache bust** : `20260607-craft-hud-top-122`

### Completed — Persistance monde 100 % (BDD temps réel) (2026-06-07)

- **Toutes les entités décor** (arbres, rochers, épaves, barrières, constructions, coffres) → `world_decor` avec IDs stables `seed_*` + `placementKey`.
- **Arbres/rochers coupés/minés** : état sauvegardé ; suppressions enregistrées dans `world_meta.removedSeedKeys` (pas de respawn au reboot).
- **Boot** : chargement BDD **en premier**, puis seed idempotent uniquement pour les placements manquants (plus de `force: true` rochers).
- **Zombies** : table `world_zombies`, sync ~5 s + mort/spawn.
- **Joueurs endormis** : table `world_sleepers` (corps + inventaire au sol).
- **État monde** : colliders, eau, loot bâtiments, heure → `world_meta`.
- **Flush** : 500 ms (au lieu de 1,5 s).
- **Tests** : `tests/world-persist-full.test.mjs`.
- **Schéma** : `world_zombies`, `world_sleepers` dans `database/schema.sql`.

### Fix — déco joueur : doublon avatar debout + corps endormi (2026-06-07)

- **Cause** : à la déconnexion avec vie > 0, le serveur émettait `player-sleep` mais pas `player-leave` → les autres clients gardaient l'avatar debout en plus du corps 💤.
- **Fix serveur** : `player-leave` systématique avant `player-sleep` (sauf handoff / reconnexion même compte).
- **Fix client** : sur `player-sleep`, retrait filet de sécurité de l'avatar remote par pseudo.
- **Cache bust** : `20260607-sleep-leave-121`
- **Test manuel** : 2 clients, le 2e quitte devant le 1er → un seul corps endormi, pas d'avatar debout.

### Completed — Spawn plage (Rust) remplace camp forêt (2026-06-07)

- **Retiré** : clairière camp `(0,-6)`, sentier `spawn_trail` → `town_main`, seed décor camp serveur.
- **Nouveau** : plage côte **est** `(252, 8)` — sable + mer, spawn `(234, 8)` face l'intérieur.
- **Shared** : `packages/shared/src/beach-spawn.mjs` ; exclusions arbres/rochers/barrières mises à jour.
- **Serveur** : `BEACH_SPAWN` ; reset unique `.beach_spawn_v1_reset` pour téléporter les comptes existants.
- **Tests** : `tests/beach-spawn.test.mjs`.
- **Cache bust** : `20260607-beach-spawn-120`

### UX — coffre PC : mode souris (2026-06-07)

- **Ouverture coffre (E)** : `onUiPanelOpen` → quitte le pointer lock, curseur libre (comme inventaire/craft).
- **Fermeture** (×, fond, Échap, ramassage coffre) : `onUiPanelClose` → retour mode jeu si aucun autre panneau ouvert.
- **Cache bust** : `20260607-storage-mouse-mode-119`

### Completed — Expiration loot au sol 30 min (2026-06-07)

- **Butin de mort** : sac 30 min puis disparition (déjà en place, consolidé).
- **Drops transitoires** : jet inventaire, drop zombie, overflow/casse coffre, clé/verrou → `expiresAt` +30 min dans `_addGroundItem` ; purge ~60 s + au boot BDD.
- **Exception** : loot **bâtiments** (`loot: true`) — pas de timer, jusqu'au ramassage.
- **Tests** : `tests/world-ground-items.test.mjs`.

### Completed — Persistance constructions joueur en BDD (2026-06-07)

- **Tables** : `world_decor` (prefabs posés : murs, sols, portes, coffres…), `world_structures` (fallback legacy), `world_items` (loot au sol), `world_meta` (compteurs).
- **Sauvegarde** : debounce ~1,5 s sur pose, contenu coffre, verrous, dégâts, loot/drops, retrait ; flush à l'arrêt serveur.
- **Boot** : seeds procéduraux d'abord, puis rechargement constructions + objets au sol ; pas de regen loot bâtiments si déjà en BDD.
- **Exclus** : arbres, rochers, épaves, spawn camp (non rejoués depuis BDD) ; objets au sol **expirés** purgés au chargement.
- **Fichiers** : `apps/server/src/world-persist.js`, `apps/server/src/db.js`, `database/schema.sql`
- **MySQL prod** : `ensureWorldSchema()` crée les tables au démarrage si absentes.

### Fix — ramassage coffre : inventaire non mis à jour (2026-06-07)

- **Cause** : course `inventory-sync` / `storage-pickup` ; sync client surtout via event `inventory-authoritative` (parfois ignoré).
- **Fix** : snapshot inv dans la requête (comme verrou porte) ; inventaire renvoyé dans l'ack + event ; `applyAuthoritativeInv` côté client.
- **Cache bust** : `20260607-chest-pickup-sync-118`

### Fix — retrait coffre plein : overflow au sol (2026-06-07)

- **Ramassage coffre (E maintenu)** : plus besoin de vider le coffre ; contenu + coffre vont dans l'inventaire, le surplus est **droppé au sol** (persistant, visible).
- **Serveur** : `_addStackToInv` partiel ; clés/durabilité conservées sur les drops.

### Completed — Récupération coffre (maintenir E, PC) (2026-06-07)

- **PC** : maintenir **E** ~2 s près d'un coffre vide → `struct_storage_chest` dans l'inventaire ; appui court = ouvrir (inchangé).
- **Serveur** : socket `storage-pickup` (coffre vide, place inventaire, `decor-item-remove`).
- **Client** : hold unifié verrou/coffre (`_interactHold`), barre « Récupération du coffre… », UI « maintenir E = ramasser ».
- **Cache bust** : `20260607-storage-pickup-hold-116`

### Fix — verrou : clé obligatoire + casser la porte sans clé (2026-06-07)

- **Retrait verrou (E maintenu ~2 s)** : uniquement avec la **clé** correspondante (plus le propriétaire sans clé).
- **Sans clé** : frapper la porte verrouillée (mêlée, outils, poings) — 50 PV, notif « Porte endommagée » puis destruction.
- **Shared** : `getDoorBreakDamage`, `LOCKED_DOOR_BREAK_HP`, `isLockableDoorPrefab`.
- **Serveur** : `build-hit` accepte portes verrouillées ; `decor-door-unlock` exige la clé.
- **Client** : `hitDecorDoorRay` (cabanes), UI « Verrouillée · frapper pour casser ».
- **Cache bust** : `20260607-door-key-break-115`

### Fix — retrait verrou porte (barre qui se reset) (2026-06-07)

- **Cause** : répétition auto de `KeyE` relançait `_interactDoorHoldStart()` → `_doorUnlockHold.t` remis à 0 ; inventaire appelait aussi `_useActiveItem()` à chaque repeat.
- **Fix** : ignorer `e.repeat` pour le hold ; ne pas réinitialiser si même `decorId` ; `ZS.isDoorUnlockHoldActive()` pour bloquer l'usage inventaire pendant le maintien.
- **Cache bust** : `20260607-door-unlock-hold-114`

### Fix — Zombies à travers les murs (2026-06-07)

- **Cause** : aggro/attaque basés sur la distance seule → dégâts et bras à travers les murs construits.
- **Fix serveur** : ligne de vue via `hasLineOfSight` (colliders) ; aggro/perte de cible derrière mur ; portée mêlée 1,35 m ; flag `meleeReach` pour l'anim client.
- **Shared** : `segmentBlockedByColliders` / `hasLineOfSight` dans `collider-resolve.mjs` + tests.
- **Cache bust** : `20260607-zombie-los-113`

### Completed — File de craft temporisée (2026-06-07)

- **Fabrication** : plus instantanée — durée par catégorie (2,5–8 s), un objet à la fois.
- **File** : bouton « File · Xs » consomme les ressources à l'ajout ; HUD compact + liste dans le panneau craft.
- **Inventaire** : impossible d'ajouter en file sans place pour le résultat (y compris objets déjà en attente) ; livraison bloquée si inventaire rempli pendant le craft.
- **Cache bust** : `20260607-craft-queue-112`

### Completed — UI inventaire PC (2026-06-07)

- **PC uniquement** : panneau ~860px, colonne équipement (Tête/Torso/Mains/Dos) + barre d'action avec touches 1–6 + sac en grille 8 colonnes scrollable.
- **Mobile** : grille compacte inchangée visuellement (4 equip, 6 hotbar, 5 sac).
- **Fichiers** : `apps/client/public/js/inventory.js`, `apps/client/public/css/style.css`
- **Cache bust** : `20260607-inv-desktop-111`

### Completed — UI craft PC avec onglets (2026-06-07)

- **PC uniquement** (`mode-desktop`) : panneau élargi, barre latérale à onglets (Matériaux, Outils, Armes, Construction, Soins), grille de cartes recette avec badge « craftable ».
- **Mobile** : liste plate inchangée (même rendu qu'avant).
- **Fichiers** : `apps/client/public/js/craft.js`, `apps/client/public/css/style.css`
- **Cache bust** : `20260607-craft-desktop-110`

### Fix — Coffre posé au sol au lieu de la fondation (2026-06-07)

- **Cause** : `_placementTransform()` utilisait `getDecorGroundHeight` pour les coffres (`decorPrefab`), sans tenir compte des fondations enregistrées.
- **Fix** : hauteur via `BuildAnchors.resolveStructureBaseY` (fondation sous la visée) ; spawn prefab respecte `opts.baseY` ; resync réseau coffre depuis `d.y`.
- **Cache bust** : `20260607-chest-foundation-109`

### Completed — Jet de clé au sol (2026-06-07)

- **Jet** : bouton 🗑 Jeter conserve le `lockId` → objet ramassable multijoueur avec la bonne clé.
- **Visuel** : modèle procédural doré posé à plat au sol (halo + rotation comme les autres loots).
- **Serveur** : `item-drop` refuse une clé sans `lockId` ; spawn via `_dropWorldItem`.
- **Cache bust** : `20260607-key-drop-108`

### Fix — verrou porte sans effet v2 (2026-06-07)

- **Cause** : appel réseau silencieux (ack socket parfois absent) + inventaire non vu par un serveur non redémarré.
- **Fix** : `installDoorLockOnNearestDoor()` dans l'inventaire (socket direct), notif « Verrouillage… », event `door-lock-result`, timeout explicite.
- **Cache bust** : `20260607-verrou-fix-107`

### Fix — verrou porte sans effet (2026-06-07)

- **Cause** : inventaire crafté côté client jamais synchronisé → serveur rejetait « Pas de verrou » sans retour visible fiable.
- **Fix** : snapshot inventaire dans `decor-door-lock` / `unlock` ; sync après craft ; messages notif explicites.
- **Cache bust** : `20260607-verrou-fix-106`

### Completed — Craft verrou : 2 planches (2026-06-07)

- **Verrou** : 2 planches (plus de ferraille / clous).
- **Cache bust** : `20260607-verrou-craft-105`

### Completed — Verrou & clé sur portes (2026-06-07)

- **Items** : `tool_verrou` (craft 2 planches) et `struct_cle` (clé liée à un `lockId`, créée à la pose).
- **Pose** : verrou en main + E près d'une porte (`build_door_wood` / grande porte) → consomme le verrou, accroche le cadenas, donne la clé au poseur.
- **Ouverture** : porte verrouillée → clé correspondante requise (serveur `decor-door-toggle`).
- **Retrait** : maintenir E ~2 s (propriétaire ou détenteur de la clé) → récupère le verrou, retire la clé matching.
- **Mort** : `lockId` conservé dans le butin (`flattenInv`).
- **Cache bust** : `20260607-door-lock-104`

### Completed — Plafond en bois (2026-06-07)

- **Item** : `struct_plafond_bois` (« Plafond en Bois ») — prefab `build_ceiling_wood`, craft 4 planches.
- **Placement** : snap centre fondation, `baseY = fondation.baseY + LEVEL_H` (collé au sommet du mur).
- **Ancrages** : repère vert au centre haut de chaque fondation ; `registerUpperFloor` + fondation niveau+1 au-dessus pour étage futur.
- **Collider** : dalle horizontale 3×3 (bloque saut depuis l'intérieur).
- **Cache bust** : `20260607-ceiling-wood-103`

### Completed — Craft grande porte : planches seules (2026-06-07)

- **Grande Porte** : 10 planches (plus de clous / ferraille).
- **Cache bust** : `20260607-grande-porte-craft-102`

### Completed — Fix collision porte build fermée (2026-06-07)

- **Cause** : colliders = montants + linteau seulement ; ouverture 1,8 / 2,4 m libre ; boxes fines traversables de l'intérieur.
- **Fix** : battant (`door: true`, retiré si `doorOpen`) ; repousse joueur depuis l'intérieur d'une box orientée ; resync colliders après toggle.
- **Cache bust** : `20260607-door-collider-101`

### Completed — Fix ancrage murs sur fondations voisines (2026-06-07)

- **Cause** : fondation voisine surélevée (cluster unifié) rejetée par `_isCoherentDeck` → aucun snap sur ses bords ; repères verts affichés quand même.
- **Fix** : accepter dalles alignées sur voisine ; snap perpendiculaire au bord + secours visée joueur ; bords partagés entre fondations masqués (pas de mur intérieur).
- **Cache bust** : `20260607-wall-edge-snap-100`

### Completed — Murs à embrasure (porte / grande porte) (2026-06-07)

- **Items** : `struct_mur_embrasure_porte` (« Mur à embrasure (porte) ») et `struct_mur_embrasure_grande_porte` (« Mur à embrasure (grande porte) »).
- **Prefabs** : `build_doorway_wood` (ouverture 1,8 m) et `build_large_doorway_wood` (2,4 m) — cadre sans battant, même snap/placement que les murs.
- **Craft** : 5 planches (porte) / 7 planches (grande porte), entre mur plein et porte complète.
- **Colliders** : montants + linteau (`decor_colliders.js`) ; passage libre au centre.
- **Cache bust** : `20260607-doorway-walls-99`

### Completed — Fix régression décor flottant (camp/arbres) (2026-06-07)

- **Cause** : fallback `baseY` depuis `d.y` pour **tous** les prefabs → `y: 0` serveur ( défaut ) utilisé au lieu de `getDecorGroundHeight` (~9 m au-dessus du terrain spawn).
- **Fix** : `baseY` explicite uniquement pour `build_*_wood` ; spawn ignore `opts.baseY` sans `buildKind`.
- **Cache bust** : `20260607-decor-ground-fix-98`

### Completed — Fix murs flottants au-dessus fondation (2026-06-07)

- **Cause** : murs utilisaient `y` client / terrain sans reprendre la dalle ; snap renvoyait le `level` fondation corrompu ; `d.y > 0.25` ignorait les hauteurs négatives.
- **Fix** : `resolveStructureBaseY` (fondation la plus proche) à la pose, au snap et au spawn ; sync hauteur serveur pour tous les `build_*_wood`.
- **Cache bust** : `20260607-wall-foundation-deck-97`

### Completed — Fix fondation ciel plafond absolu (2026-06-07)

- **Cause racine** : `clampFloorDeckY` laissait passer y=18 si `buildLevel` élevé ; double enregistrement registre (spawn + callback) ; pas de plafond relief max (~7,5 m).
- **Fix v3** : plafond `MAP_TERRAIN_MAX` ; `resolveFloorDeckY` unique (pose + spawn) ; callback inventaire sans re-registre ; sync `decor-floor-height` serveur.
- **Cache bust** : `20260607-floor-hard-ceiling-96`

### Completed — Fix régression fondation dans le ciel v2 (2026-06-07)

- **Cause racine** : fondations corrompues en base (`y` ciel + `buildLevel` 6–8) restaient « cohérentes » ; le snap reprenait leur niveau et élevait les nouvelles dalles.
- **Fix** : `_isCoherentDeck` sans confiance au `level` stocké ; `registerFoundation` recalcule le niveau depuis Y clampé ; snap/unified utilise l'étage UI (`_buildLevel`) ; spawn re-clamp avec niveau 0 si données serveur aberrantes ; `sanitizeAllFoundations` au sync.
- **Cache bust** : `20260607-floor-sky-level-fix-95`

### Completed — Fix régression fondation dans le ciel (2026-06-07)

- **Cause** : fix murs (`_isCoherentDeck`) n’était pas appliqué aux clusters fondation ; `clampFloorDeckY` sauté si `snapped` ou `opts.baseY` ; `_clusterTargetY` utilisait `_effectiveFloorLevel` → terrain + niveau × 2,6 m.
- **Fix** : filtre incohérent sur voisins/ancres/cluster ; clamp toujours à la pose et au spawn ; hauteur unifiée via `buildLevel` explicite (terrain max, pas inférence niveau voisin).
- **Cache bust** : `20260607-floor-clamp-always-94`

### Completed — Murs accrochés à la fondation (2026-06-07)

- **Cause** : snap mur trop court (1,75 m), filtre `level` bloquait les fondations surélevées, `baseY` non envoyé au serveur pour les murs → respawn au sol.
- **Fix v2** : fondations « ciel » ignorées (`_isCoherentDeck`) + `clampStructureBaseY` sur murs/portes (régression ciel).
- **Cache bust** : `20260607-wall-sky-filter-93`

### Completed — Fix hauteur voisin pente (2026-06-07)

- **Cause** : `clampFloorDeckY` ramenait la 2ᵉ dalle à la hauteur **locale** du terrain, annulant l'unification avec la 1ʳᵉ fondation sur pente.
- **Fix** : clamp anti-ciel seulement ; hauteur unifiée inclut le `baseY` des voisins cohérents ; pas de clamp après snap voisin.
- **Cache bust** : `20260607-floor-slope-unify-91`

### Completed — Fix fondation dans le ciel (2026-06-07)

- **Cause** : `buildLevel` inféré depuis `y / 2.6` au chargement → niveau 6–8 → hauteur terrain + 15–20 m ; snap voisin reprenait ce `baseY`.
- **Fix** : `clampFloorDeckY` + `_effectiveFloorLevel` ; plus d'inférence `y/2.6` ; clamp à la pose et au spawn.
- **Cache bust** : `20260607-floor-sky-clamp-90`

### Completed — Dégâts aux constructions en bois (2026-06-07)

- **Résistance** : pièces `build_*_wood` — 100 PV (unité caillou) ; caillou +1/coup, hache pierre +2/coup → 100 ou 50 coups.
- **Shared** : `packages/shared/src/build-damage.mjs` + tests `tests/build-damage.test.mjs`.
- **Serveur** : socket `build-hit` (portée, validation outil, `build-damage` / `decor-item-remove`).
- **Client** : détection `hitDecorBuildRay` (visée écran) **avant** récolte bois/pierre ; notif `Structure endommagée (x/100)`.
- **Fix** : le caillou récoltait bois/pierre en cone XZ et bloquait les coups sur fondation.
- **Cache bust** : `20260607-build-damage-ray-89`

### Completed — Fix snap fondation sur pente (2026-06-07)

- **Symptôme** : 2ᵉ fondation plus basse + décalée sur pente au lieu de s’aligner à la même hauteur.
- **Cause** : rayon snap 1,75 m trop court (ancrages voisins à ±3 m) + grille monde avant snap + `const rotY` non réassignable.
- **Fix v1** : snap directionnel depuis la fondation visée, rayon `SNAP_R_FLOOR` 4,5 m, essai sur visée brute avant grille.
- **Fix v2 (hauteur)** : `findAdjacentFloorHeight` — cellule voisine reprend toujours le `baseY` du voisin ; enregistrement optimiste dès l’accusé serveur ; `registerFoundation` utilise `opts.baseY`.
- **Fix v3 (spawn)** : `resolveFloorDeckY` appliqué dans `spawnDecorPrefab` + fantôme — le voisin déjà posé impose sa hauteur même si le client/envoi serveur avait la hauteur terrain ; supports calculés sur `getTerrainHeight`.
- **Fix v4 (max unifié)** : fondations qui se touchent → hauteur = **max** du groupe connexe (terrain + voisins) ; les dalles plus basses sont remontées au spawn.
- **Fix v5 (réconciliation globale)** : `reconcileAllFoundationHeights` remonte **toutes** les fondations existantes d’un même groupe (au chargement, à chaque pose, et tant qu’une fondation est en main).
- **Fix v6 (hauteur sol)** : hauteur unifiée = **max du terrain** sous chaque cellule du groupe (plus de max des `baseY` stockés / raycast) ; réaligne aussi vers le bas les dalles trop hautes.
- **Cache bust** : `20260607-floor-terrain-height-87`

### Completed — Repères d'ancrage visibles en mode construction (2026-06-06)

- **Piquets retirés** des fondations posées (prefab + fantôme).
- **Affichage** : repères verts sur les bords des fondations proches uniquement avec mur/porte/fondation en main.
- **Cache bust** : `20260606-anchor-guides-only-81`

### Completed — Fondations voisines : même hauteur + armatures (2026-06-06)

- **Snap hauteur** : une fondation collée à une autre reprend son `baseY` (plus le terrain local).
- **Supports** : poteaux aux 4 coins + croisillons + diagonales si le vide sous la dalle > 20 cm.
- **Sync** : `baseY` / `buildLevel` / `supportGroundY` envoyés au serveur pour le prefab `build_floor_wood`.
- **Cache bust** : `20260606-foundation-supports-80`

### Completed — Ancrages fondation (4 bords) (2026-06-06)

- **Registre** : `build_anchors.js` — chaque fondation expose 4 points mur (milieu bord) + 4 points extension fondation voisine.
- **Snap** : murs/portes sur bord ; nouvelles fondations sur centre adjacent ; fantôme vert si accroché.
- **Visuel** : piquets bois au milieu de chaque bord sur le prefab fondation.
- **Tests** : `tests/build-anchors.test.mjs`.
- **Cache bust** : `20260606-build-anchors-79`

### Completed — Fondation : 2 planches (2026-06-06)

- **Craft** : `struct_plancher_bois` = **2 Planches** (plus 5 bois brut).
- **Cache bust** : `20260606-craft-fondation-78`

### Completed — Rééquilibrage recettes craft (2026-06-06)

- **Outils** : lance bois 10 bois ; hache/pioche pierre 7 bois + 10 pierre ; torche 5 bois + 2 tissus.
- **Matériaux** : corde = 5 tissus ; bandage = 2 tissus ; `res_chiffon` affiché « Tissu ».
- **Arc artisanal** : remplace lance artisanale (15 bois + 1 corde) ; item `wpn_arc_artisanal`.
- **Build** : fondation 2 planches ; coffre 15 bois (murs/portes/escalier restent en planches).
- **Cache bust** : `20260606-craft-balance-77`

### Completed — Build lvl 1 : planches seules (2026-06-06)

- **Fondation** (`struct_plancher_bois`) : **5 Planches** — plus de clous ; label « Fondation (Planches) ».
- **Mur / porte / escalier bois** : planches uniquement (6 / 4 / 8) ; grande porte + coffre gardent clous/ferraille.
- **Pose** : prefab Georges `build_floor_wood` via `place-decor-prefab` ; aperçu fantôme grille 3×3 m.
- **Contrôles** : hotbar → **Placer** (mobile) ; PC clic gauche ou clic droit ; **PageUp/Down** = étage.
- **Cache bust** : `20260606-build-lvl1-planches-76`

### Completed — Merge dev Georges (construction + coffre) + UI PC local (2026-06-06)

- **Remote** : `e90d2f0` coffre craftable/cassable + `2a61d0d` prefabs build/collisions (Georges).
- **Local fusionné** : barre chargement, sync spawn, rochers snap, chat/raccourcis PC, craft Q, inv/carte mode souris.
- **Conflits résolus** : `game.html`, `network.js` (`isSpawnReady` + storage API), `spawn_clearing.js` (`hitDecorStorage` + snap rochers).
- **Tests** : 50/50 verts.
- **Cache bust** : `20260606-merge-build-ui-75`

### Completed — Fix registre collisions structures fallback (2026-06-06)

- **Cause racine** : `spawnStructure()` ajoutait les colliders dans le tableau retourné par `ZS.getColliders()`, qui est une copie ; les collisions disparaissaient donc immédiatement.
- **Fix** : les structures legacy/fallback s'enregistrent maintenant via `ZS.registerDecorColliders('structure_<id>', cols)`.
- **Sync** : après spawn structure, le client resynchronise les colliders monde vers le serveur.
- **Cache bust** : `20260606-build-collider-registry-60`

### Completed — Build collisions renforcées + portes agrandies (2026-06-06)

- **Murs** : épaisseur visuelle/collision augmentée pour éviter de traverser les prefabs et le fallback `place-structure`.
- **Portes** : ouverture standard élargie (`1.8 m`) et grande porte élargie (`2.4 m`) ; montants plus épais et colliders alignés.
- **Escaliers** : ajout de colliders latéraux pour ne plus traverser les côtés tout en gardant la rampe praticable.
- **Tests** : régressions ajoutées pour murs simples, murs prefab, montants de porte et côtés d'escalier.
- **Cache bust** : `20260606-build-solid-walls-59`

### Completed — Fix collisions structures build (2026-06-06)

- **Bug** : les murs/portes build pouvaient être traversés si le déplacement plaçait le centre du joueur dans une box fine.
- **Fix physique** : résolution de collision box corrigée côté client (`world.js`) et partagé serveur/zombies (`collider-resolve.mjs`) pour repousser aussi depuis l'intérieur de la box.
- **Colliders** : murs/portes build ont une hauteur solide explicite (`maxY`) et restent synchronisés via `decorItems`.
- **Tests** : régression ajoutée sur un mur build fin.
- **Cache bust** : `20260606-build-collision-58`

### Completed — Fix refus placement build + fallback compatible (2026-06-06)

- **Bug** : `Placement refusé` pouvait apparaître quand le serveur refusait/remboursait une pose build prefab.
- **Fix client** : fallback automatique vers `place-structure` pour les éléments build si l'ack prefab échoue, timeout, ou ancien remboursement serveur.
- **Serveur** : validation distance build assouplie pour éviter les faux refus liés au décalage de position réseau.
- **Cache bust** : `20260606-build-place-fallback-57`

### Completed — Fix pose build prefab avec accusé serveur (2026-06-06)

- **Bug** : les éléments build pouvaient afficher `+1 Plancher en Bois` parce que le serveur refusait la pose et remboursait l'item.
- **Fix** : `place-decor-prefab` répond maintenant par callback `ok/error`; le client retire l'item seulement après confirmation.
- **Input** : clic gauche et clic droit placent une structure tenue en main ; le menu contextuel est bloqué pendant la construction.
- **Cache bust** : `20260606-build-place-ack-56`

### Completed — Placement build au clic gauche (2026-06-06)

- **PC** : quand une structure est tenue en main, le clic gauche place directement l'élément au lieu de faire une attaque.
- **API client** : `ZS.Inventory.placeActiveStructure()` expose le placement actif à `game.js`.
- **Cache bust** : `20260606-build-left-click-55`

### Completed — Build joueur migré en prefabs (2026-06-06)

- **Prefabs build** : sol, mur, escalier, porte et grande porte passent par `decorItems` (`build_floor_wood`, `build_wall_wood`, `build_stair_wood`, `build_door_wood`, `build_large_door_wood`).
- **Placement** : les items `struct_*` gardent le snap grille/étage mais utilisent maintenant `place-decor-prefab` côté serveur.
- **Gameplay** : sols et escaliers enregistrent toujours les surfaces/rampes praticables ; portes build utilisent l'interaction d'ouverture/fermeture existante.
- **Compat** : `spawnStructure` reste disponible pour les anciennes structures déjà synchronisées.
- **Cache bust** : `20260606-build-prefabs-54`

### Completed — Coffre cassable + drops contenu (2026-06-06)

- **Interaction** : frapper un `storage_chest` avec poing/arme/outil l'endommage ; au 3e coup il se casse.
- **Détection** : hit melee assoupli (portée/cône) pour que le coffre proche soit fiable à toucher.
- **Drops** : le serveur supprime le prefab et fait tomber au sol le contenu du coffre + `struct_storage_chest`.
- **Serveur** : Socket.io `storage-hit`, compteur `breakHits` autoritaire côté `decorItems`.
- **Cache bust** : `20260606-storage-chest-hit-53`

### Completed — Craft du coffre portable (2026-06-06)

- **Recette** : `struct_storage_chest` craftable depuis le panneau artisanat avec `8 Planche`, `12 Clous`, `2 Ferraille`.
- **Gameplay** : les joueurs peuvent fabriquer un coffre, le mettre en hotbar, puis le poser comme prefab `storage_chest`.
- **Cache bust** : `20260606-storage-chest-craft-41`

### Completed — Coffre portable plaçable depuis l'inventaire (2026-06-06)

- **Item** : `struct_storage_chest` ajouté à `ZS.ITEMS` (catégorie `structure`, hotbar/inventaire).
- **Placement joueur** : sélection hotbar → bouton **Placer** ; aperçu coffre devant le joueur puis création serveur du prefab `storage_chest`.
- **Serveur** : Socket.io `place-decor-prefab` validé côté serveur, avec remboursement de l'item si placement refusé.
- **RCON test** : `give kimojuki struct_storage_chest 1` pour tester localement.
- **Cache bust** : `20260606-storage-chest-item-40`

### Completed — Coffre prefab + stockage (Georges, merge dev)

- **Prefab** : `storage_chest` — interaction E / bouton, panneau slots 3×9, sync `storage-*` Socket.io.
- **Anim** : couvercle animé (`storage-state`), ouverture locale immédiate.
- Voir aussi sections persistance / sommeil / regen ci-dessous.

### Completed — Rochers monde + visuel (2026-06-06)

- **Seed** : `ensureWorldRocks()` ajoute rocher par rocher (clé `zoneId+rockSeed`) avec test `isSpawnPointClear` — plus de skip global si un seul regen existe.
- **Carte** : zones forêt, ville, main city, militaire (`ROCK_ZONES` + `ROCK_EXCLUSIONS` bâtiments).
- **Visuel** : boulders/outcrops plus gros, `groundLift` auto pour ne plus être enfoncés ; camp anchors agrandis.
- **RCON** : `decorseed rocks reset` pour forcer le re-seed.
- **Cache bust** : `20260606-rock-world-map-54`

### Completed — Rochers ancrés au sol (snap bbox) (2026-06-06)

- **Fix lévitation** : suppression du double `groundLift` + relevé visuel ; `_snapMinableRockToGround()` aligne le bas du mesh sur la surface après spawn.
- **Cache bust** : `20260606-rock-ground-snap-58`

### Completed — Rochers : hauteur mesh terrain (raycast) (2026-06-06)

- **Cause résiduelle** : `getDecorGroundHeight()` utilisait `getTerrainHeight()` brut sans le `-0.14` clairière appliqué au mesh terrain → rochers ~14 cm au-dessus du sol visible.
- **Fix** : `getVisibleTerrainHeight()` + `raycastTerrainHeight()` sur `_terrainMesh` ; `getDecorGroundHeight()` et snap utilisent cette hauteur ; bbox snap sur `boulderVisual` uniquement.
- **Cache bust** : `20260606-rock-ground-snap-59`

### Completed — Rochers : alignement visuel local + raycast sol (2026-06-06)

- **Cause** : `Box3.setFromObject()` sous-estimait le bas des dodeca (lévitation ~30 % hauteur rocher) ; surface décor parfois au-dessus du mesh terrain seul (camp / sentier).
- **Fix** : `_alignRockVisualToGround()` (bbox serrée en espace local root) ; `raycastGroundHeight()` sur terrain + sol camp + sentier ; re-snap après `game-init`.
- **Cache bust** : `20260606-rock-ground-snap-60`

### Completed — Rochers : bbox 8 coins (meshes inclinés) (2026-06-06)

- **Cause** : bbox snap ne prenait que 4 coins (y=min) — chunks dodeca inclinés → bas réel plus bas, lévitation persistante.
- **Fix** : 8 coins AABB par mesh ; cache bust `20260606-rock-ground-snap-61`.

### Completed — Fix zombies frappent à distance + rochers au sol (2026-06-06)

- **Zombies** : dégâts ignorés côté client avant `game-init` ; sync position forcée après spawn ; serveur n'attaque qu'après 1er `move` (`posSynced`) ; garde anti-spawn spawn retirée ; distance recalculée après chase.
- **Rochers** : `settleVisualBottom()` sur vertices réels dans `rock_world_prefabs.js` ; re-snap frame suivante.
- **Cache bust** : `20260606-rock-zombie-sync-62`

### Completed — Rochers : snap vertices monde + rotY (2026-06-06)

- **Cause** : `root.position.y = surface` sans mesurer le bas réel du mesh ; offset local `visual.position.y` invalide avec `rotY` aléatoire → lévitation ~1–3× hauteur rocher (visible sur capture).
- **Fix** : `_rockWorldMinY()` parcourt tous les vertices en coords monde ; ajuste `root.position.y` pour coller au sol ; snap après `registerMinableRock`.
- **Cache bust** : `20260606-rock-world-vertices-63`

### Completed — Rochers enfoncés dans le sol (2026-06-06)

- **Visuel** : enfoncement ~12 % de la hauteur du mesh (7–28 cm selon taille) pour un affleurement réaliste.
- **Cache bust** : `20260606-rock-embed-64`

### Completed — Rochers plus enfoncés (2026-06-06)

- **Visuel** : enfoncement porté à ~18 % hauteur (12–40 cm).
- **Cache bust** : `20260606-rock-embed-65`

### Completed — Rochers : pas de spawn sur props (2026-06-06)

- **Cause** : ancres camp dans la clairière ; rayon décor rocher trop petit vs scale ; rondins de lisière comptés comme props de 2,1 m.
- **Fix** : ancres déplacées hors ellipse camp ; `isRockAnchorClear` / `isRockSpawnClear` avec rayon scale ; rayons props affinés (`spawn_border_log`, souches) ; validation boot serveur (`ensureCampRocks` skip si overlap).
- **Ancres** : spawn path `(22, 6)`, trail `(-9, 2)`, est `(16, -5)`, ouest `(-11.5, -9)`.
- **Cache bust** : `20260606-rock-clearance-66` (client) — **redémarrer le serveur** pour re-seed.

### Completed — Écran de chargement fiable + % (2026-06-06)

- **`loading.js`** : barre de progression 0–100 %, phases (serveur, scripts, auth, monde, socket, sync, finalisation).
- **Serveur** : `/api/health` expose `boot.phase` + `boot.progress` pendant le seed (zombies → décor → rochers → arbres).
- **Client** : l'écran reste jusqu'à `game-init` + spawn décor par lots + resnap rochers + colliders ; mouvement bloqué tant que `!isSpawnReady`.
- **Cache bust** : `20260606-loading-screen-70`

### Completed — Touche Q → panneau craft PC (2026-06-06)

- **Client** : `KeyQ` ouvre/ferme l'artisanat (remplace `C`) ; ignoré si chat/RCON/champ texte actif.
- **Cache bust** : `20260606-craft-key-q-71`

### Completed — Inventaire / craft → mode souris PC (2026-06-06)

- **Ouverture** : libère le pointer lock (curseur visible).
- **Fermeture** : reprend le mode jeu automatiquement si aucun autre panneau ouvert.
- **Cache bust** : `20260606-ui-mouse-mode-72`

### Completed — Chat PC : raccourcis coupés (2026-06-06)

- **`ZS.Chat.shortcutsBlocked`** + `stopPropagation` sur l'input ; inventaire, craft, carte, reload ignorés pendant la saisie.
- **Cache bust** : `20260606-chat-shortcuts-73`

### Completed — Carte PC touche M (2026-06-06)

- **`KeyM`** ouvre/ferme la carte tactique ; **Échap** ferme ; ignoré si chat/RCON/champ texte actif.
- **Mode souris** : libère le pointer lock à l'ouverture, reprend le jeu à la fermeture (comme inventaire/craft).
- **Cache bust** : `20260606-map-key-m-74`

### Completed — Fix barre 24 % + combat au spawn (2026-06-06)

- **Barre** : `loading.js` en `<head>` ; phases réétalonnées 0–100 % ; sync décor monte jusqu'à ~92 %.
- **Combat** : resync zombies (`request-zombie-sync`) avant `_spawnReady` ; mêlée serveur depuis `p.x/p.z` ; coups bloqués avant sync complète.
- **Fix** : `_syncPlayerPosToServer` utilisait `state` au lieu de `_state` ; resync zombies non bloquante.
- **Perf sync** : colliders envoyés 1× en fin de batch (plus ~200× par objet) ; snap rochers différé ; barrières RN ignorées côté client.
- **Cache bust** : `20260606-loading-screen-70`

### Completed — Fix rochers monde force boot + resync API (2026-06-06)

- **Serveur** : `ensureWorldRocks({ force: true })` à chaque boot (purge + re-seed 65 rochers) ; `kind: 'prefab'` garanti sur tous les décors.
- **API** : `GET /api/world/decor-rocks` pour resync client si game-init incomplet.
- **Client** : spawn prefab même sans `kind` ; resync API automatique si 0 rocher rendu.
- **Cache bust** : `20260606-rock-world-fix-57`

### Completed — Fix rochers monde + diagnostic (2026-06-06)

- **Cause racine** : ancien `ensureWorldRocks()` voyait les `zoneId` des **arbres** et ne seedait jamais les rochers carte.
- **Fix serveur** : `seedWorldRockPlacements()` (~65 rochers, emplacements libres) ; boot **rochers avant arbres**.
- **Diagnostic** : `/api/health` → `decor.worldRocks` ; console `[decor] rochers monde synchronisés: N` ; RCON `decorseed rocks reset`.
- **Visuel monde** : meshes rochers plus visibles (`rock_world_prefabs.js` uniquement — caillou main intact).
- **Cache bust** : `20260606-rock-world-fix-56`

### Completed — Rochers monde + visuel camp (2026-06-06)

- **Seed monde** : `seedWorldRockPlacements()` cherche des emplacements libres (65 cibles, 11 zones forêt/ville/militaire) au lieu de positions fixes bloquées par les arbres.
- **Visuel** : rochers plus gros, relevés au-dessus du sol (`groundLift` proportionnel à l’échelle) ; camp re-seed à chaque boot.
- **Exclusions** : `isRockSpawnClear()` — pas de rocher sur bâtiments / camp / sentier / autres décors.
- **Cache bust** : `20260606-rock-world-map-55`

### Completed — Fix rochers monde jamais seedés (2026-06-06)

- **Cause** : `ensureWorldRocks()` testait `zoneId` sur tous les décors — les arbres ont aussi un `zoneId`, donc les rochers monde n'étaient jamais ajoutés au boot.
- **Fix** : ne compter que les prefabs minables (`rock_*`, `spawn_stone`) avec `zoneId` et sans `anchorId` ; reset idem.
- **Camp** : `ensureCampRocks()` ne déduplique plus par proximité (évite faux positifs) ; `spawn_stone` visible sur le sentier (`starter_spawn_path`).
- **Cache bust** : `20260606-rock-spawn-fix-53`

### Completed — Repousse arbres (croissance) + rochers aléatoires (2026-06-06)

- **Arbres** : spawn progressif (pousse phase 0 → adulte phase 4), scale + bois + collider synchronisés ; seed initial = adultes.
- **Croissance** : 2 min / phase (`GROWTH_PHASE_MS`), sync `decor-tree-grow`.
- **Rochers** : repousse aléatoire taille adulte, évite chevauchement décors (`resource-spawn.mjs`).
- **Serveur** : tick regen 10 s (`resource-regen.mjs`) — cibles 72 arbres / 18 rochers monde.
- **Cache bust** : `20260606-resource-regen-47`

### Completed — Colliders rochers synchronisés à la récolte (2026-06-06)

- **Fix** : `_updateRockColliders()` recalcule le cylindre de collision avec le même ratio que le mesh (`0.22 + 0.78 × pierre restante`).
- **Hitbox récolte** : rayon de visée `_rockHitRadius()` réduit aussi avec le rocher.
- **Cache bust** : `20260606-rock-collider-46`

### Completed — Fix spawn rochers pierre visibles au départ (2026-06-06)

- **Cause** : seed camp initial sans `rock_boulder` sur serveurs déjà seedés ; rochers procéduraux loin du spawn / exclus du sentier.
- **Fix** : `CAMP_ROCK_ANCHORS` (3 rochers fixes près du sentier) + `ensureCampRocks()` au boot et `decorseed rocks`.
- **Visuel** : boulders plus gros ; colliders `rock_boulder` / `rock_outcrop`.
- **Cache bust** : `20260606-rock-spawn-45`

### Completed — Inventaire PC : touche Tab (2026-06-06)

- **PC** (`mode-desktop`) : **Tab** ouvre/ferme l'inventaire (comme **I**), `preventDefault` pour éviter le focus navigateur.
- **Cache bust** : `20260606-inv-tab-44`

### Completed — Récolte pierre + crafts Rust-like au spawn (2026-06-06)

- **Ressource** : `res_pierre` — nœuds minables (`rock_boulder`, `rock_outcrop`, `spawn_stone`) ; rétrécissement visuel progressif puis disparition.
- **Récolte** : caillou / pioche / hache en pierre → `mineRock()` client + sync `decor-mine` serveur (`decor-rock-mine` / `decor-rock-depleted`).
- **Crafts** (panneau C) : lance en bois, hache en pierre, pioche en pierre, lance en pierre (upgrade depuis lance bois).
- **Spawn** : gros `rock_boulder` près du camp ; hachette au sol retirée (progression craft pure).
- **Shared** : `rock-stone.mjs`, `rock-placements.mjs` ; RCON `decorseed rocks [reset]`.
- **Cache bust** : `20260606-rock-harvest-43`

- **Fix collisions rails (v3 — root cause)** : `clearDecorColliders()` au reconnect socket effaçait les hitboxes RN ; registre statique `getBarrierColliders()` fusionné dans `getColliders()`.
- **Cache bust** : `20260606-road-barriers-fix-42`

- **Fix collisions rails (v2)** : colliders segment `type:'seg'` entre poteaux (r=0.14 m) — fiable sur pentes ; plus de box orientée fine.
- **Cache bust** : `20260606-road-barriers-seg-41`

- **Fix collisions barrières** : rails — `minY` retiré, longueur seule (`railLen`) scale `hw` ; `rotX` pris en compte ; poteaux `r=0.09`.
- **Cache bust** : `20260606-road-barriers-col-40`

- **Fix orientation** : rail le long de Z local + quaternion `setFromUnitVectors` (comme l'ancien `_buildBarriers`).
- **Cache bust** : `20260606-road-barriers-rot-39`

### Completed — Fix glissières disparues : build client prefabs (2026-06-06)

- **Cause** : `_buildBarriers` vidé côté client ; seed serveur seul ne suffit pas (serveur pas redémarré / pas de sync visuelle fiable).
- **Fix** : `barrier_prefabs.buildRoadBarriers()` — prefabs posés au build RN (`road_network.js`), rails inclinés (`rotX`).
- **Réseau** : ignore `road_barrier_*` du `game-init` (évite doublons avec le build local).
- **Cache bust** : `20260606-road-barriers-client-38`

### Completed — Barrières routières en prefabs + collisions (2026-06-06)

- **Prefabs** : `road_barrier_post` + `road_barrier_rail` (`barrier_prefabs.js`).
- **Placements** : `packages/shared/src/road-barriers.mjs` — `town_main` + `city_highway`, pas 2,6 m, gap jonction sentier.
- **Collisions** : poteau cylindrique + rail box orienté (`railLen` → scale collider).
- **Seed** : boot serveur + `decorseed barriers [reset]` ; meshes procéduraux retirés de `road_network.js`.
- **Cache bust** : `20260606-road-barriers-prefab-37`

### Completed — Fix animation coffre immédiate (2026-06-06)

- **UX** : le couvercle du `storage_chest` démarre l'animation dès l'interaction locale, avant confirmation serveur.
- **Anim** : vitesse dédiée au couvercle (`CHEST_ANIM_SPEED`) et fermeture locale immédiate à la fermeture du panneau.
- **Cache bust** : `20260606-storage-chest-lid-39`

### Completed — Coffre : couvercle animé + UI slots (2026-06-06)

- **Animation** : `storage_chest` a maintenant un couvercle séparé avec pivot arrière ; ouverture/fermeture synchronisée par `storage-state`.
- **UI** : panneau façon coffre Minecraft — grille 3×9 pour le coffre, inventaire 3×9 et hotbar en slots carrés.
- **Capacité** : coffre porté à 27 piles pour correspondre à la grille.
- **Cache bust** : `20260606-storage-chest-slots-38`

### Completed — Coffre prefab avec stockage d'items (2026-06-06)

- **Prefab** : `storage_chest` — coffre procédural bois/métal, listable/posable/supprimable via RCON (`decorprefabs`, `decoradd`, `decorremove`).
- **Gameplay** : interaction `E` / bouton tactile à portée ; panneau coffre avec dépôt depuis hotbar/sac et retrait vers inventaire.
- **Sync** : Socket.io `storage-open`, `storage-deposit`, `storage-withdraw`, `storage-update` ; contenu stocké dans `decorItems.storage` côté serveur.
- **Collisions/tests** : collider dédié `storage_chest` + couverture `decor-colliders` et RCON.
- **Cache bust** : `20260606-storage-chest-37`

### Completed — Fix porte cabane : interaction + taille + anim + son (2026-06-06)

- **Bug** : `doorPivot` sur le groupe enfant → jamais enregistré dans `DECOR_DOORS` (E / bouton mobile inopérants).
- **Visuel** : porte agrandie (1,24 × 2,02 m) pour remplir l'ouverture du mur.
- **Anim** : `tickDecorDoors` — rotation progressive (~0,5 s) ; son `door()` ouverture / fermeture.
- **UI** : portée 3,2 m ; bouton mobile + hint desktop « E — Ouvrir ».
- **Cache bust** : `20260606-shack-door-fix-36`

### Completed — Porte interactive cabane prefab (2026-06-06) — Georges

- **Prefab** : `building_survivor_shack` — porte séparée avec pivot (`survivorShackDoorPivot`) et état ouvert/fermé.
- **Interaction** : touche `E` desktop + bouton tactile contextuel à portée.
- **Sync** : Socket.io `decor-door-toggle` → `decor-door-state`, état persistant dans `decorItems`.
- **Collisions** : collider de porte actif uniquement quand la porte est fermée, puis resynchronisé au serveur.
- **Cache bust** : `20260606-shack-door-interact-30`

### Completed — Fix anim bras coupe arbre (2026-06-06)

- **Cause** : `addItem` → `_renderHotbar` → `setHandItem` réinitialisait l'anim FPS à chaque `+1 Bois`.
- **Fix** : `updateHandItem` ignore le re-equip si le type en main est déjà le même.
- **Cache bust** : `20260606-tree-chop-anim-33`

### Completed — Récolte bois progressive + chute d'arbre (2026-06-06)

- **Stock bois** : chaque prefab arbre (`tree_oak` 8, `tree_pine` 10, `tree_birch` 6, `tree_dead` 3) — extrait coup par coup.
- **Gameplay** : `+N Bois brut` à chaque impact ; arbre tombe vers l'avant quand stock épuisé ; tronc disparaît après 90 s.
- **Audio** : `chopWood()` (impact bois) + `treeFall()` (impact au sol) — plus le bruit mêlée zombie sur arbre.
- **Sync** : socket `decor-chop` / `decor-tree-chop` / `decor-tree-fell` (remplace `decor-fell`).
- **Shared** : `packages/shared/src/tree-wood.mjs` + tests.
- **Cache bust** : `20260606-tree-wood-chop-32`

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

### Completed — Persistance position + sommeil / fouille (2026-06-06)

- **Position sauvegardée** : `game-init` utilise la position serveur (`data.spawn`) au lieu d'écraser avec `SpawnZone` procédural.
- **Déconnexion** : joueur vivant → corps endormi (`player-sleep`) visible couché ; inventaire persisté en mémoire serveur + DB.
- **Reconnexion** : reprise position/inventaire (`player-wake`), le corps disparaît pour les autres.
- **Fouille** : `E` (PC) ou bouton action (mobile) près d'un dormeur → panneau `sleep_loot.js`, vol item par item (`sleep-loot-take`).
- **Cache bust** : `20260606-sleep-persist-49`

### Fix — position écrasée au refresh (2026-06-06)

- **Cause racine** : le client envoyait `move` au spawn par défaut (0.4, 7) *avant* `game-init`, ce qui réécrivait la position DB à chaque F5.
- **Client** : `sendMove` bloqué jusqu'à `game-init` (`_spawnReady`).
- **Serveur** : ignore les moves « spawn » pendant 4 s si la position restaurée est loin ; id joueur depuis la DB ; save fallback par username.
- **Cache bust** : `20260606-pos-persist-51`

### Fix — bouton Réapparaître (2026-06-06)

- **Cause** : survie (infection/faim/soif) non réinitialisée au clic → retour instantané à l'écran mort.
- **Fix** : `Survival.reset()` au respawn client + `respawn-at` serveur ; touch mobile sur le bouton.
- **Cache bust** : `20260606-respawn-fix-50`

### Fix — persistance position au refresh (2026-06-06)

- **Handoff session** : nouvelle socket reprend la position live de l'ancienne au refresh (course déco/connect).
- **SQLite** : chemin DB résolu depuis la racine projet (`database/local-dev.sqlite`).
- **Auto-save** : position forcée toutes les 15 s même sans changement d'inventaire.
- **Client** : caméra/avatar repositionnés dès `game-init`.

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

### Completed — parcours intro plage étalé (2026-06-09)

- **Spawn intro** : cluster est plage (`cx:278`, `rx:14`, `rz:24`) + tirage aléatoire biaisé océan — plus près du panneau sortie.
- **Piste v3** : empreintes `266` → bouteille `254` → veilleuse `246` → ponton `243` (~8–12 m entre étapes, ~23 m total).
- **Zones beats** : rayons réduits (`r:7–7.5`) pour éviter les chevauchements.
- **Cache bust** : `20260609-intro-path-spread`

### Completed — catalogue prefabs urbains v1 (2026-06-09)

- **17 prefabs** `spawn_urban_*` + `spawn_prop_*` dans `urban_prefabs.js` — rue, logistique, intérieur commerce.
- **Catégorie admin** `ville` · colliders · orientation · aperçu catalogue · auto-discovery RCON.
- **Cache bust** : `20260609-urban-prefabs-v2`
- **v2 refonte** : comptoir L (caisse, vitre, tiroir), canapé 3 places (coussins/tissu), palettes EUR + cartons.
- **Prochaine passe** : mobilier bureau, signalisation ville, variantes dégradées, `smallcity_house_c` (Georges).

### Completed — pose torche calibrée tuner (2026-06-09)

- Pose validée in-game → `_FPS_ABSOLUTE_POSES.tool_torche` ; grip `absolutePose`.
- Fix bouton Valider (JSON visible + copie). Cache `20260609-torch-pose-v1`.

### Completed — menu admin F8 + hub calibrages (2026-06-09)

- **F8** → `AdminHub` (calibrages, scénario, RCON). Registre `ZS.Calibration.register()`.
- Bras/torche + placeholders (main vide, caillou, armes, distant). Cache `20260609-admin-hub`.

### Completed — CMS admin + poses caillou/outil/distant (2026-06-10)

- **Hub F8** restructuré (Monde, Joueurs, Calibrages, Scénario, RCON) — sections CMS.
- **Joueurs** : `GET /api/admin/players` + panneau live (refresh 5s).
- **Calibrages actifs** : caillou 2 mains, hachette/outils, bras joueur distant 3e personne.
- `applyFPSGripTuneToArms`, `applyFPSRemoteTune`, validate live. Cache `20260610-admin-cms-poses`.

### Completed — valider pose = effet immédiat en jeu (2026-06-10)

- **Valider** appelle `applyFPSValidatedPose` : patch mémoire (`_FPS_ABSOLUTE_POSES`, grips, idle/marche) + refresh bras.
- Au chargement : `loadFPSValidatedPoses` depuis `localStorage` (torche + main vide).
- Main vide validée utilisateur intégrée en défaut. Cache `20260610-validate-live`.

### Completed — fix presets cross-profil + bras dérivés torche (2026-06-10)

- **Bug** : liste presets vide en main vide (`_refreshPresetSelect` avant assignation du panneau) — corrigé.
- Migration auto : poses validées profil → presets globaux ; **Valider** enregistre aussi un preset.
- Main vide / `_FPS_RIGHT_RELAXED` / `_FPS_CHAIN_RELAXED` : orientations bras dérivées de la torche calibrée.
- Cache `20260610-preset-fix-torch-derived`.

### Completed — presets calibrage bras FPS (2026-06-10)

- Tuner : **Sauver / Charger / Supprimer** presets nommés (`localStorage` `zs_arm_tuner_presets`).
- Presets partagés entre profils (torche ↔ main vide) : fusion des champs compatibles (bras, item, idle, marche).
- Cache `20260610-arm-presets`.

### Completed — fix fermeture dashboard admin + calibrages (2026-06-10)

- **✕ / Fermer** et `AdminHub.close()` appellent `Calibration.closeActive()` — panneaux latéraux (tuner pose, édition décor) retirés du DOM.
- `ArmTuner.hide()` : nettoyage orphelin `#zs-arm-tuner` + restauration pose inventaire (`updateHandItem`). Cache `20260610-admin-close-fix`.

### Completed — calibrage main vide FPS (2026-06-10)

- **F8** → Calibrages → **Bras FPS — main vide** : sliders repos + idle/marche, checkbox preview marche live.
- `_FPS_ABSOLUTE_POSES.empty_hand` + `_FPS_EMPTY_ANIM` ; tuner multi-profils (`tool_torche` / `empty_hand`).
- Cache `20260610-arm-empty-tuner`.

### Completed — pose torche FPS validée (2026-06-10)

- Calibrage tuner `tool_torche` intégré dans `_FPS_ABSOLUTE_POSES` + `DEFAULT_POSE` tuner.
- Cache `20260610-torch-pose`.

### Completed — édition décor monde live admin (2026-06-09)

- **F8** → Calibrages → **Édition décor monde** : mode admin avec visée réticule + **E** pour cibler un prefab synchronisé.
- Panneau latéral droit (`admin-live-decor.js`) : position / rotation / échelle (+ champs épave/build selon prefab).
- Preview locale immédiate + `PATCH /api/admin/decor/:id` debouncé → `decor-item-spawn` pour tous les clients.
- `pickDecorAdminRay` sur tous les décors réseau ; pointer lock conservé en mode édition. Cache `20260609-admin-live-decor`.

### Completed — tuner in-game bras FPS (2026-06-09)

- Grille supprimée. `fps_arm_tuner.js` : sliders épaule/coude/poignet/torche, **F8** ou `?armTuner=1`, **Valider** → JSON copié.
- Cache `20260609-arm-tuner`.

### Completed — fix orientation bras FPS vers l'avant (2026-06-09)

- Base relâchée `rx≈0.16` (chaîne −Z = horizontal avant), plus `rx≈1.08` qui pointait vers le haut.
- Overlays grip/hold recalculés ; torche verticale (`item.rx ≈ -1.22`, GLB `−π/2`).
- Cache `20260609-fps-arm-forward`.

### Completed — caillou en main plus petit + prise deux mains (2026-06-09)

- Taille FPS ~÷2 (`_fit` 0.68, mesh `buildHandRock` compact).
- Grip `tool_caillou` : mains convergentes, poignets tournés vers le caillou (shared pivot centré).
- Cache `20260609-rock-hand-v2`.

### Completed — pose relâchée bras FPS tous grips (2026-06-09)

- Base unique `_FPS_*_RELAXED` + overlay `_FPS_ARM_AIM` (grip/hold) : même repos naturel pour tous les items, visée inchangée.
- `_ANIM_BASE` idle/walk : balancement marche + sway idle sur main vide, armes, outils, nourriture, deux mains.
- Cache `20260609-fps-arm-all-poses`.

### Completed — pose relâchée bras FPS main vide (2026-06-09)

- `_FPS_RIGHT_EMPTY` : bras le long du corps (épaule basse, coude plié ~0.78 rad), plus tendu vers le réticule.
- `tickFPSArms` : balancement marche/course (épaule + coude + léger déplacement Z/Y) ; idle léger sway latéral.
- Cache `20260609-fps-arm-relaxed`.

### Completed — refonte visuelle bras FPS (2026-06-09)

- Cubes Minecraft → cylindres (bras), sphère épaule, main (paume, pouce, doigts), poignets manche. Pose main vide inchangée. Cache `20260609-fps-arm-visual-v2`.

### Completed — fix orientation bras FPS main vide (2026-06-09)

- Pose dédiée `_FPS_RIGHT_EMPTY` + flag `GRIP_EMPTY.emptyHand` : bras le long de −Z (vers l'avant) au lieu d'une pile verticale. Grips items inchangés.
- Cache `20260609-fps-arm-empty`.

### Completed — batch prefabs loisirs v4 (+20) (2026-06-09)

- **217 prefabs** — plage/camp/parc : kubb, disc golf, parasol plage, SUP, brasero, douche solaire, chariot enfant, etc.
- Cache `20260609-leisure-prefabs-v4`.

### Completed — batch prefabs loisirs v3 (+20) (2026-06-09)

- **197 prefabs** — jeux (roulette, craps, skee-ball, plateau société), sport (mur escalade, tir à l'arc, skis, haltères, badminton, lacrosse), loisirs (micro, BBQ, télescope, bascule, manège, ukulélé…).
- Cache `20260609-leisure-prefabs-v3`.

### Completed — batch prefabs loisirs v2 (+20) (2026-06-09)

- **177 prefabs** — jeux (shuffleboard, air hockey, croquet, fers), sport (volley, baseball, boxe, hockey, kayak, VTT), loisirs (camping, batterie, clavier, balançoire, bac à sable, trampoline, canoë).
- Cache `20260609-leisure-prefabs-v2`.

### Completed — batch prefabs loisirs v1 (+20) (2026-06-09)

- **Nouveau module** `leisure_prefabs.js` — 3 catégories catalogue : **jeux** (baby-foot, ping-pong, poker, flipper, pétanque…), **sport** (basket, foot, tennis, golf, surf…), **loisirs** (tente, hamac, pêche, guitare, toboggan).
- **157 prefabs** catalogue total (+20). Cache `20260609-leisure-prefabs-v1`.

### Completed — revue catalogue : commentaire « à refaire » (2026-06-09)

- Clic **À refaire** → dialogue obligatoire (min. 3 car.) ; persistance SQLite/MySQL dans `world_meta.prefabCatalogReviews` (objet `{ status, comment, updatedAt, by }`).
- API `PUT /api/admin/prefab-catalog/review` accepte `comment` ; GET renvoie `reworkDetails`.
- Liste bannière + colonne revue + modal 3D affichent la note.

### Completed — batch prefabs ville v8 (+20) (2026-06-09)

- **137 prefabs ville** — +20 : sport (vélo appart, banc muscu), commerce (caisse, frigo vitrine, îlot cuisine), santé (fauteuil dentiste, perfuseur), bureau (tableau blanc, liège, tour PC, TV murale), urbain (borne EV, benne tri, panneau LED, téléphone public).
- Cache `20260609-urban-prefabs-v8`.

### Completed — batch prefabs ville v7 (+20) (2026-06-09)

- **117 prefabs ville** — +20 : commerce (auvent, boulangerie, portant), santé (lit hôpital, brancard, fauteuil roulant), loisirs (billard, arcade, machine à sous, treadmill), équipement (congélateur, meuble cuisine, RIA, dos d'âne), divers (lit bébé, lampe bureau, chauffage).
- Cache `20260609-urban-prefabs-v7`.

### Completed — batch prefabs ville v6 (+20) (2026-06-09)

- **97 prefabs ville** — +20 : buanderie (sèche-linge, LV, planche), SDB (douche, urinoir, miroir), école (pupitre, casiers), commerce (snacks, panier), terrasse (transat, parasol), rue (Jersey, égout, étendoir), divers (piano, barbier, diable, radiateur, ventilateur).
- Cache `20260609-urban-prefabs-v6`.

### Completed — batch prefabs ville v5 (+20) (2026-06-09)

- **77 prefabs ville** — +20 : SDB (WC, lavabo, pharmacie), salon (table basse, table manger), dortoir (lit superposé, matelas), bureau (classeur, imprimante, fontaine), sécurité (coffre, extincteur), rue (pompe essence, parcmètre, horloge, parabole), logistique (palette, carton).
- Cache `20260609-urban-prefabs-v5`.

### Completed — batch prefabs ville v4 (+20) (2026-06-09)

- **57 prefabs ville** — +20 : chambre (lit, chevet, commode, tapis, lampadaire), cuisine (micro, cuisinière, évier), salle de bain (baignoire), rue (ATM, cabine, abri bus, pique-nique, déchets, caisse, générateur, jerricans, BBQ, armoire outils, clim).
- Cache `20260609-urban-prefabs-v4`.

### Completed — batch prefabs ville v3 (+20) (2026-06-09)

- **37 prefabs ville** au total — +20 : rue (STOP, journaux, caddie, distributeur, barrière, panneau, propane, pneus, brouette, vélo) + intérieur (bureau, chaise, armoire, table/chaise cuisine, bibliothèque, TV, lave-linge, étagère métal, établi).
- **Colliders + META + orientation** · cache `20260609-urban-prefabs-v3`.

### Completed — revue qualité catalogue prefabs (2026-06-09)

- **Boutons** Valider / À refaire par prefab (table + modal aperçu 3D).
- **Persistance** SQLite/MySQL `world_meta.prefabCatalogReviews` — survit redémarrage serveur.
- **API** : `PUT /api/admin/prefab-catalog/review` · bannière + filtre « À refaire » · `reworkList` dans GET catalogue.
- **Cache bust** : `20260609-prefab-catalog-reviews`

### Completed — persistance intro (caillou / déco-reco) (2026-06-09)

- **Bug** : à la reconnexion, `ensure()` respawnait le caillou même s'il était en inventaire ; l'inventaire intro pouvait être vidé au connect.
- **Fix** : flags `pickedRock` / `pickedTorch` dans `introBeats` + détection inventaire ; `shouldResetIntroInventoryOnConnect` ; sauvegarde DB immédiate à la déconnexion.
- **Fix caillou réveil** : spawn dès `ensure()` (beat `wake`, ~2,6 m devant le joueur) — plus besoin d’atteindre la zone empreintes.

### Completed — interaction viseur intro plage (2026-06-09)

- **Bug** : en visant la valise, E ouvrait la note brûlée (proximité XZ avant raycast).
- **Fix client** : `hitDecorSignRay` + `pickDecorInteractRay` compare coffre / porte / panneau par distance sur le rayon caméra ; `game.js` priorise le viseur pour E et le bouton mobile.
- **Cache bust** : `20260609-interact-raycast`

### In Progress — World polish (Phase 2+)

- Grille rues S02/S03 dans `RoadNetwork`.
- Plus de variantes véhicules (bus, camions) dans `vehicles.js`.
- Manual test: spawn trail → town junction, highway, barrières virages, FPS mobile.
