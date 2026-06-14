# Intro plage — spec joueur (validée + implémentation v3, 2026-06-11)

Source : questionnaires Bruno + `INTRO_BEACH_SCENARIO_V3.md`.

## Principes

- **Pas de kit magique** en hotbar au réveil.
- **Multijoueur** : loot départ **personnel** (visible par tous, **ramassage réservé au propriétaire**).
- **Décor narratif** (empreintes, bouteille, ponton, feu) = **monde unique partagé** (`beach_intro_v3`).
- **HUD léger** exploration (objectif discret coin écran) ; bulles pensée pour la narration.
- **Pas de checklist quête** — progression par beats zones + lectures.

## Spawn

- Cluster réveil est (`pickBeachSpawnForIntro`) — écart **10 m** min entre joueurs (`BEACH_SPAWN_MIN_PLAYER_GAP`).
- Ancre scénario = position de réveil du joueur.

## Kit départ (4 objets personnels)

| Stop | Objet | Leçon UI |
|------|--------|----------|
| 1 | `tool_caillou` | Ramassage (`E` / bouton Ramasser) — bulle réveil |
| 2 | `tool_torche` | **Leçon hotbar** — `IntroLessons.onTorchAcquired()` |
| 3 | `food_eau_bouteille` | **Leçon sac** — `IntroLessons.onSuitcaseOpen()` à l'ouverture valise |
| 4 | `food_sandwich` | **Leçon consommer** — `IntroLessons.onKitDone()` après valise vidée |

- **Parcours** : ~25–30 m le long de la côte (empreintes → veilleuse → ponton).
- **Ordre beats** : footprints → campfire → pier → kit_done.

## Guidage joueur (2026-06-11)

- HUD actif : `breathe`, `explore`, `walk_west`, `silhouette`, `approach`, `fight`, `loot`.
- Hints `explore` dynamiques selon `introBeats` (caillou → veilleuse → valise → ouest).
- Toast + bulle à `kit_done` : « Suis le sentier vers l'ouest ».
- Golden hour figée communiquée : « L'aube reste suspendue sur la plage ».

## Technique

- Beats : `packages/shared/src/intro-beach-beats.mjs` + `apps/server/src/intro-beach-beats.mjs`
- Zone feu dynamique (déplacement admin) : `resolveIntroCampfireZone`
- Props monde seedés à la connexion intro : `ensureBeachIntroProps`
- Reset QA : `scenario-reset <joueur>`

## QA manuelle

1. Nouveau compte / `scenario-reset` → réveil → caillou visible → kit complet &lt; 8 min.
2. Mobile : textes « bouton Ramasser », pas « E » seul.
3. Après valise : HUD « Va vers l'intérieur » visible.
4. `decorseed beach reset` si props monde absents (vieille BDD).
