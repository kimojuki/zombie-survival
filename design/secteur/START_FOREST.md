# SECTOR 01 — START FOREST

Zone de spawn (plage est + forêt de départ). **Seul secteur ouvert** — périmètre muré côté client/serveur.

## Limites jouables (code actuel)

| Axe | Min | Max |
|-----|-----|-----|
| X | -94 | 295 (bord carte / océan) |
| Z | -118 | 106 |

Source : `packages/shared/src/sector-bounds.mjs`

Portes RP « Bientôt » : ouest (vers S02), nord (vers S03), sud (exploration).

---

## ⚠️ Coordonnées POI (map v1 — obsolètes)

Les positions `(x, z)` des anciennes versions de la carte **ne sont plus valides**. La géométrie a changé (plage est, sentier, rivière, forêt dense).

**Ne pas** recopier les coords depuis d’anciennes docs ou `s01-poi.mjs` sans validation en jeu.

Chaque POI est placé **un par un**, au tâtonnement :

1. Se connecter en admin, marcher sur le terrain
2. Noter la position ressentie (carte **M**, logs serveur, ou RCON `pos`)
3. Ajouter **un seul** placement dans `s01-world-placements.mjs`
4. Mettre à jour l’ancre dans `s01-poi.mjs` + exclusion build 10 m
5. Redémarrer serveur / `decorseed`, tester, ajuster

La liste ci-dessous décrit **quoi** placer, pas **où** :

| POI (intention) | Contenu typique |
|-----------------|-----------------|
| Fin sentier | fin actuelle `BEACH_TRAIL_PTS` OK — ajuster plus tard si besoin |
| Bouche sentier (plage) | panneau + torche *(déjà placés)* |
| Spawn plage (réveil) | débris + affaires échouées — seed `beach-prop-placements.mjs` (`decorseed beach`) |
| Hub / clairière équipée | feu, établi, coffre *(optionnel, plus tard)* |
| Carrefour forêt | jonction routes terre, repère visuel |
| Campement abandonné | abri, caisses, coffre loot *(optionnel)* |
| Cabane nord / sud | shack + coffre |
| Station essence | station, épave, coffre |
| Pont ouest | rivière, barrières RP vers S02 |

Positions validées en jeu → noter dans `S01_ROADMAP.md` section **Ancres validées**.

---

## Règles gameplay

- **Zones safe** : plage (sable protégé) ; autre safe (ex. hub) **uniquement** après placement validé
- **Forêt** : zombies T1 (walkers)
- **Construction** : libre sauf plage, 10 m autour de chaque POI seed actif, bouche sentier
- **Interactions** : établi (craft), feu (cuisson), couchage (repos), coffres (loot) — sur decor seed

## Ambiance

- calme près du spawn / zones safe
- beaucoup d’arbres, rochers forêt (hors plage — palmiers seuls sur sable)
- petites cabanes, routes terre, rivière ouest

## Gameplay

loot basique dans les coffres seed (quand POI posés)

## Technique

- Placements : `packages/shared/src/s01-world-placements.mjs` (ajout **incrémental**)
- Seed boot : `ensureS01World()` dans `apps/server/index.js`
- Routes : `packages/shared/src/s01-roads.mjs` — tracé après POI, pas depuis doc v1
- Rivière : `s01_terrain.js` / `s01-river.mjs`
- **Objets dans / près d'un shack** (position, rotY, hauteur, pièges) : **[docs/S01_DECOR_PLACEMENT.md](../../docs/S01_DECOR_PLACEMENT.md)**

## Parcours joueur — sentier plage → forêt (audit UX)

Flux après l’intro plage (tous les joueurs) :

| Phase | Repère | Assets | Ressenti cible |
|-------|--------|--------|----------------|
| Réveil | spawn `(248, -8)` | intro, `beach_decor`, ambient life | Riche, guidé |
| Sable → bouche | `BEACH_TRAIL_PTS[0]` `(242, -8)` | sentier mesh + pierres bordure | Transition OK |
| **Corridor forêt** | segments `x < ~175` → `(14, -18)` | `forest_trail_decor` (bordures), arbres seed hors ±4 m | Sol vivant, chemin lisible |
| Clairière | `(0, -6)` → hub | camp seed, clearing ring | Respiration |
| POI cabane | `s01:cabin01` `(165, 7)` | shack + coffre + lit seed | Routes dirt : sentier `(85,-6)` → cabane → clairière `(0,-6)` |

**Gaps comblés (brique 1)** : micro-déco procédurale sur **tout le footprint S01** (grille + scatter) + sur-densité corridor sentier ; clairance arbres ±4 m ; sentier légèrement plus clair.

**Phase 2 (planifiée)** : `forest_ambient_life`, props seed narratifs (`forest-immersion-placements`).

Debug playtest : filtre console `zs-dev`, catégorie `trail-decor`, `ZS.DevLog.dump()` après marche sentier.

## Roadmap

Voir **[S01_ROADMAP.md](./S01_ROADMAP.md)** — ancres validées + phases.
