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

## Roadmap

Voir **[S01_ROADMAP.md](./S01_ROADMAP.md)** — workflow placement + phases.
