# Intro plage — spec joueur (validée par questionnaires 2026-06-09)

Source : questionnaires Bruno + `docs/AI_WORKFLOW.md`.

## Principes

- **Pas de kit magique** en hotbar au réveil.
- **Multijoueur** : loot départ **personnel** (visible par tous, **ramassage réservé au propriétaire**).
- **Décor narratif** (débris, affaires, bois flotté seed) = **monde unique partagé** (D1).
- **Pas de HUD quête** exploration ; tuto = ramassage + interfaces.

## Spawn

- Point de base : plage (`pickBeachSpawn` / offset autour de `BEACH_SPAWN`).
- **Écart min 8–12 m** entre joueurs connectés en même temps sur le sable.
- Ancre scénario `anchorX/Z` = position de réveil du joueur.

## Kit départ (4 objets personnels)

| Stop | Objet | Leçon UI |
|------|--------|----------|
| 1 | `tool_caillou` | Ramassage au sol (E) |
| 2 | `tool_torche` | Hotbar — sélection slot |
| 3 | `food_eau_bouteille` | Inventaire (panneau sac) |
| 4 | `food_sandwich` | Consommer faim/soif (+ équiper torche entre stops 2–3 si retenu) |

- **Parcours** : mini chemin ~10–15 m autour du spawn perso (F3), **ordre forcé** O1.
- **Association leçons** : L1 (une bulle / gate par stop).

## Scénario technique (à brancher)

- Étapes intro existantes (`intro_wake` → …) + sous-étapes loot `loot_caillou` … ou flags `scenario.starterLoot`.
- Blocage avancement tant que stop courant non ramassé + leçon UI acquittée.

## Implémentation (ordre)

1. ✅ **Brique 1** — inventaire vide intro ; `ownerPlayerId` + pickup owner-only (visible tous) ; spawn plage espacé 10 m.
2. ✅ Spawn des 4 pickups séquentiels le long du mini-parcours (`intro-starter-loot.mjs`). ⏳ bulles tuto UI.
3. ⏳ Bulles tuto UI (E, hotbar, sac, consommer, équiper torche).

## Non couvert (questionnaires suivants)

- Texte réveil v2, heure du jour intro, jalons `explore` sans distance 15 m.
