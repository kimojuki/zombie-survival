# S01 — Forêt de départ : vision & roadmap

Document de référence : [`START_FOREST.md`](./START_FOREST.md)  
Vision globale : [`WORLD_OVERVIEW.md`](../WORLD_OVERVIEW.md)

---

## Principe de placement (décision équipe)

> **Les coordonnées de la doc map v1 ne s’appliquent plus.**  
> On ne synchronise pas le code sur d’anciens `(x, z)`. On place **un POI à la fois**, en jeu, au tâtonnement.

### Workflow par POI

| Étape | Action |
|-------|--------|
| 1 | Définir l’**intention** (ex. « première cabane visible depuis le sentier ») |
| 2 | **Explorer** en jeu (admin) : relief, arbres, lisibilité, distance depuis plage/sentier |
| 3 | **Proposer** une position ; ajuster rotY / aplat terrain si besoin |
| 4 | **Coder** : 1 entrée dans `computeS01DecorPlacements()` + ancre `s01-poi.mjs` + exclusion build |
| 5 | **Tester** : collision, loot, interaction, multijoueur, pas de chevauchement arbre/rocher |
| 6 | **Noter** la position validée ci-dessous (section *Ancres validées*) |
| 7 | Passer au POI suivant |

Outils : carte **M**, RCON `tp check <id>`, `decorseed`, redémarrage serveur, Ctrl+F5 client.

---

## Ancres validées (à remplir au fur et à mesure)

| ID | Intention | x | z | Date | Notes |
|----|-----------|---|---|------|-------|
| `trail_end` | Fin sentier forêt | ~14 | ~-18 | 2026-06-08 | Validé playtest — **ajuster plus tard** si besoin (`BEACH_TRAIL_PTS`) |
| `trail_mouth` | Bouche sentier / sortie plage | *(code)* | *(code)* | 2026-06-08 | Panneau + torche déjà en place (`beach-sign-placements`) — pas de seed POI |
| `cabin01` | Première cabane (`building_survivor_shack`) | 165.1 | 7.1 | 2026-06-08 | `rotY: 0.55`, seed `s01:cabin01:shack` — prefab 7/7 ✅ |

Référence terrain **fiable** (code, pas doc v1) :

| Élément | Source |
|---------|--------|
| Spawn plage | `BEACH_SPAWN` |
| Sentier | `BEACH_TRAIL_PTS` |
| Limites S01 | `SECTOR_01` |
| Rivière | `s01_terrain.js` |

---

## Vision collègue (intentions — pas des coords)

| Thème | Intention |
|-------|-----------|
| **Rôle** | Seul secteur ouvert — découverte / survie début |
| **Parcours** | Plage → sentier terre à travers la forêt → POI dispersés (pas de clairière dédiée) |
| **Ambiance** | Dense en arbres, calme près spawn, cabanes isolées |
| **Danger** | Walkers en forêt ; safe = plage (+ hub si un jour posé) |
| **POI** | Pont ouest, cabanes, essence, carrefour, hub/camp *optionnels* |
| **Gameplay** | Loot coffres, craft, cuisson, repos |
| **Densité** | Jamais vide > 20–30 s sans repère (WORLD_OVERVIEW) |

---

## État actuel (juin 2026)

### ✅ En place

- Périmètre S01 + murs collision
- Plage, spawn, sentier (`BEACH_TRAIL_PTS`), panneau + torche
- Forêt dense : arbres + rochers (hors sable) ; palmiers sur plage
- Zombies walkers zone `forest`
- Interactions serveur (feu, repos, coffres) — **sans decor** tant que seed vide
- Prefabs `s01_prefabs.js`, rivière terrain, exclusions plage

### ⚠️ Volontairement vide

- `computeS01DecorPlacements()` → `[]` ; purge `s01:*` au boot
- Exclusions build POI v1 **désactivées** jusqu’à ancrage réel (`S01_BUILD_EXCLUSION_POIS`)
- Routes forêt `S01_DIRT_ROADS` vides — à tracer **après** POI

---

## Roadmap (par intention, pas par coordonnée)

### Phase 0 — Fondations ✅

Limites, plage, végétation, inventaire, exclusion forêt/plage.

### Phase 1 — Parcours lisible ✅ (décisions juin 2026)

| # | Tâche | Statut | Notes |
|---|--------|--------|-------|
| 1.1 | Fin du sentier (`BEACH_TRAIL_PTS`) | ✅ OK pour l’instant | Revoir en playtest ; modifier le tracé si la jonction ne convient plus |
| 1.2 | Zone dégagée (herbe / ring) | ⏭️ **Non retenu** | Parcours plage → sentier **dans** la forêt dense = correct ; pas de clairière artificielle |
| 1.3 | Premier repère (bouche sentier) | ✅ **Déjà en place** | Panneau + torche à la sortie plage (`beach-sign-placements`) — pas de seed S01 à ajouter |

### Phase 2 — POI un par un (ordre suggéré)

Chaque ligne = **un sprint**, une PR, une ancre notée.

| Ordre | POI | Statut | Critère de placement |
|-------|-----|--------|----------------------|
| 2.1 | Pont / porte ouest | ⏸️ **Plus tard** | Uniquement quand la **rivière** sera validée en jeu ; ne pas placer avant |
| 2.2 | Première cabane | ✅ **Posée** | `(165.1, 7.1)` — prefab progressif 7 pièces ; loot / route à ajouter |
| 2.3 | Deuxième cabane | Autre quadrant forêt, pas trop proche |
| 2.4 | Station essence | Zone « route », épave, loot utilitaire |
| 2.5 | Carrefour terre | Là où les chemins se croisent **naturellement** |
| 2.6 | Hub équipé *(option)* | Seulement si le parcours le justifie |
| 2.7 | Campement abandonné *(option)* | Éloigné, ambiance exploration |

Après chaque POI : route terre **vers le suivant** si ça a du sens (pas de grille v1).

### Phase 3 — Gameplay

- Zone safe alignée sur POI réellement posés
- Pas de zombies / vol endormi en safe
- Interactions sur decor seed
- Walkers éventuellement affaiblis T1

### Phase 4 — Atmosphère

- Décor client forêt, poteaux, épaves hors plage, audio

### Phase 5 — Finition

- Portes RP, tutoriel scénario, QA S01

---

## Ordre de travail recommandé

```
Phase 1 — fait (sauf ajustement sentier si besoin)
  • Fin sentier : OK (~BEACH_TRAIL_PTS dernier point) — réouvrir si playtest négatif
  • Pas de zone dégagée
  • Repère bouche plage : panneau + torche (existant)

Phase 2 — suite
  1. ~~Première cabane~~ ✅ `cabin01:shack` @ 165.1, 7.1
  2. Loot cabane #1 (coffre) + route terre depuis sentier ← PROCHAIN
  3. Deuxième cabane + route terre si besoin
  3. Station essence
  4. Carrefour + routes restantes
  5. Rivière validée → pont ouest / porte S02
  6. Hub / camp seulement si validé en playtest
```

---

## Fichiers à toucher par POI

| Fichier | Rôle |
|---------|------|
| `s01-world-placements.mjs` | +1 placement `s01:xxx` |
| `s01-poi.mjs` | ancre `{ x, z }` + entrée `S01_BUILD_EXCLUSION_POIS` |
| `s01_terrain.js` | `registerFlatZone` si besoin |
| `s01-roads.mjs` | segment route **après** les deux points connus |
| `S01_ROADMAP.md` | ligne *Ancres validées* |
| `client-version.json` | si JS client modifié |

---

## Commandes

```bash
# RCON (admin) — exemples utiles au placement
# pos / teleport selon commandes dispo
decorseed trees reset   # si arbres gênent le POI

npm test -- tests/s01-build-exclusions.test.mjs
```

Redémarrer Node après changement serveur / shared.
