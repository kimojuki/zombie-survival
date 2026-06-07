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

### In Progress — World polish (Phase 2+)

- Grille rues S02/S03 dans `RoadNetwork`.
- Plus de variantes véhicules (bus, camions) dans `vehicles.js`.
- Manual test: spawn trail → town junction, highway, barrières virages, FPS mobile.
