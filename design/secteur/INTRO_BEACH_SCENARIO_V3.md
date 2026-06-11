# Intro plage — scénario v3 « Épaves et empreintes »

**Statut** : **validé par questionnaire Bruno** (2026-06-09). Remplace le flux « objet → objet → objet » de la v2.  
**Objectif** : une **mission** avec intrigue, pas une checklist de loot. Les outils arrivent **parce que l’histoire y mène**, pas parce que le joueur a ramassé l’objet précédent.

### Décisions validées

| Sujet | Choix |
|-------|--------|
| Ton | **Amnésie + énigme** — K. inconnu, notes cryptiques |
| Rythme | **Court** — caillou après ~8 m et **1 indice** (traces ou bouteille) |
| Décor indices | **Monde unique** — même piste pour tous les joueurs |
| K. | **PNJ vivant plus tard** (secteur forêt) — pas de révélation acte 1 |

---

## Synopsis (30 secondes)

Tu t’éveilles sur la plage sans souvenir. La marée monte. Plus loin, des **traces dans le sable** mènent vers un **feu encore chaud** et des **affaires abandonnées** — quelqu’un est passé par là, très récemment. Ta mission : **comprendre ce qui s’est passé** et **récupérer ce qu’il a laissé** avant que la nuit ou la forêt ne te rattrape.

Le combat zombie (acte 2–3 existant) devient la **conséquence** de cette piste : tu suis le sentier vers l’ouest parce que les indices le disent, pas parce qu’un HUD te l’ordonne.

---

## Ce qui ne va pas (v2)

| Problème | v2 actuelle |
|----------|-------------|
| Trop direct | Caillou → torche → valise en ~10 m, spawn au pickup |
| Pas d’enjeu | Aucune raison RP de bouger entre les objets |
| Pas de monde | Les props n’existaient pas avant toi |
| Pas de tension | Tout est devant toi, visible d’un coup |

---

## Pilier design

1. **Intrigue d’abord, loot ensuite** — chaque objet = récompense d’une **enquête locale** (regarder, lire, avancer).
2. **Le monde précède le joueur** — indices **partagés** (débris seed) + indices **personnels** (piste du « précédent naufragé »).
3. **Pas de HUD quête exploration** — bulles **pensée** / **lecture** seulement ; la mission est implicite dans l’environnement.
4. **Déclencheurs par zone**, pas par ramassage — avancer dans le scénario = **distance + action** (lire, fouiller), pas « j’ai pris X donc spawn Y ».
5. **Kit complet toujours atteint avant le sentier** — caillou, torche, eau, sandwich acquis **avant** `walk_west`, sur **~25–30 m** total et **3–5 min** (rythme **court** validé).

---

## Structure — 4 séquences (mission « Épaves et empreintes »)

### Séquence 0 — Réveil *(existant, enrichi)*

| Beat | Déclencheur | Joueur | Technique |
|------|-------------|--------|-----------|
| `intro_wake` | Connexion / respawn intro | Overlay réveil | `SpawnIntro` |
| `intro_stand` | Bouton Se relever | Se lève, caméra vers **zone vague** (pas le caillou) | yaw vers mer + traces lointaines |
| `breathe` | Fin animation | Regarde autour (yaw + 3 m) | existant |

**Pensée** : *« La tête tourne. Le bruit des vagues… rien d’autre. »*

---

### Séquence 1 — « Quelqu’un était là » *(exploration guidée par décor)*

**Mission affichée** (bulle unique, pas HUD) : *« Des traces sur le sable. D’où viennent-elles ? »*

Le joueur doit **marcher ~6–8 m** le long de la laisse de mer (vers ouest-nord-ouest). Le chemin est **lisible sans flèche** :

| Élément | Type | Rôle narratif |
|---------|------|----------------|
| `spawn_beach_footprint_trail` | **Nouveau prefab** (décor partagé seed, 1× monde) | Traînée d’empreintes humaines + traînée de cordage dans le sable |
| `spawn_beach_wreck_debris` | Existant (seed) | Contexte : naufrage récent |
| `spawn_beach_message_bottle` | **Nouveau prefab** lisible (monde) | Message froissé : *« Si tu lis ça — ne suis pas le feu seul. Prends ce que tu peux. — K. »* |

**Déclencheur** `beat_footprints` : joueur entre dans rayon 4 m des traces **ou** lit la bouteille (**un seul** de ces deux indices suffit — rythme court).  
→ Bulle : *« Des pas… récents. Quelqu’un a quitté la plage par là. »*  
→ **Spawn personnel** : `tool_caillou` semi-enfoui au bord des traces (~8 m du spawn).

**Leçon UI** (bulle tuto, acquittement doux) : ramassage **E**.

---

### Séquence 2 — « La veilleuse » *(lumière = mystère, pas GPS)*

Le joueur suit les traces **~8–10 m** supplémentaires. De jour : **fumée** fine ; de nuit : **lueur** visible à ~15 m.

| Élément | Type | Rôle |
|---------|------|------|
| `spawn_beach_starter_torch` | Existant (personnel) | Torche plantée dans un cercle de pierres — **déjà là** quand la zone se révèle |
| `spawn_beach_campfire_ring` | **Nouveau prefab** | Cercle de cailloux + cendres ; la torche est au centre |
| `spawn_beach_burnt_note` | **Nouveau prefab** lisible (personnel) | *« J’ai laissé la torche allumée. La valise est sous le ponton cassé. Désolé. »* |

**Déclencheur** `beat_campfire` : rayon 6 m du ring **ou** lecture du mot brûlé.  
→ La torche + note **apparaissent** (fade-in décor personnel — pas de pop au pickup du caillou).  
→ Bulle : *« Un feu de veille… encore chaud. Il voulait qu’on le trouve. »*

**Leçon UI** : hotbar + équiper torche (optionnel avant suite).

---

### Séquence 3 — « Sous le ponton » *(loot conteneur = apprentissage)*

Les traces reprennent **~8 m** vers une **charpente de bois** (ponton cassé ou gros `spawn_beach_driftwood` narratif).

| Élément | Type | Rôle |
|---------|------|------|
| `spawn_beach_starter_suitcase` | Existant (personnel) | Valise coincée sous la charpente, **légère surbrillance** |
| `spawn_beach_pier_wreck` | **Nouveau prefab** | 3–4 m de jetée cassée, demi-enfouie — **silhouette forte** |

**Déclencheur** `beat_suitcase` : rayon 5 m du ponton **après** `beat_campfire` (double condition : histoire + position).  
→ Valise **visible** (décor personnel). Pas de spawn si le joueur n’a pas encore trouvé le feu (évite speedrun diagonal).

**Interaction** : fouiller valise → eau + sandwich.  
**Leçon UI** : panneau loot + **Tout prendre** (déjà implémenté).

**Pensée finale kit** : *« De l’eau, un sandwich… et un prénom sur le mot : K. Qui c’est ? »*

→ Transition naturelle vers `explore` / `walk_west` : *« Le sentier part vers la forêt. Les traces aussi. »*

---

### Séquence 4 — Actes 2–3 *(inchangés dans l’esprit)*

- `walk_west` → silhouette → combat → bandage → épilogue.  
- Le **caillou** est l’arme tutoriel (déjà prévu).  
- **K.** = PNJ forêt plus tard — acte 1 ne fait que semer le doute (initiales, ton des notes).

---

## Parcours spatial (vue schématique)

```
        MER (+X est)
           ~
    [SPAWN réveil]
         |
    ~ ~ empreintes ~ ~  (~8 m)
         |
    [bouteille] [débris seed]
         |
    ( O ) feu + torche  (~8 m)
         |
    ~ ~ vers ponton ~ ~  (~8 m)
         |
    [===ponton===]
       [valise]
         |
    ----- sentier walk_west -----> forêt
```

**Distance totale kit** : ~25–30 m le long de la côte (rythme court — pas une ligne d’objets devant le nez).

---

## Nouveaux assets proposés

### Prefabs décor

| ID | Description | Collide | Interact |
|----|-------------|---------|----------|
| `spawn_beach_footprint_trail` | Emprises + traînée corde dans sable | non | non |
| `spawn_beach_message_bottle` | Bouteille verre + parchemin | oui léger | lire (sign UI) |
| `spawn_beach_campfire_ring` | Cercle pierres + cendres | oui | non |
| `spawn_beach_burnt_note` | Papier carbonisé sur pierre | non | lire |
| `spawn_beach_pier_wreck` | Jetée cassée 3 m | oui | non |

### Textes lisibles (shared `beach-intro-readables.mjs`)

- `bottle_note_k` — bouteille  
- `burnt_note_k` — mot au feu  
- (futur) panneau déjà seed `sign_beach_exit` — cohérence plus tard

### Items (pas de nouveaux obligatoires acte 1)

Kit inchangé : `tool_caillou`, `tool_torche`, `food_eau_bouteille`, `food_sandwich`.  
Option plus tard : `item_note_lisez_ca` (inventaire lisible) — pas requis v3.

---

## Mission joueur (objectifs implicites)

| # | Objectif | Validé quand |
|---|----------|--------------|
| M1 | Comprendre qu’un autre survivant est passé avant toi | `beat_footprints` |
| M2 | Trouver sa veilleuse | `beat_campfire` + torche ramassée |
| M3 | Récupérer ses provisions | valise vide / take-all |
| M4 | Suivre la piste vers l’intérieur | `walk_west` (existant) |

Pas de journal UI v1 — uniquement bulles + lectures.

---

## Technique — remplacer la chaîne `starterLootStep`

### Aujourd’hui (v2)

```
pickup caillou → spawn torche → pickup torche → spawn valise
```

### v3 proposé

```
scenario.introBeats = {
  footprints: false,
  campfire: false,
  suitcase: false,
}
```

| Beat | Condition serveur | Effet |
|------|-------------------|-------|
| `footprints` | dist(anchor, footprints) < 4 **ou** read `bottle_note_k` | spawn caillou personnel ; unlock zone feu |
| `campfire` | `footprints` && dist(campfire) < 6 **ou** read `burnt_note_k` | reveal torche + note ; unlock zone ponton |
| `suitcase` | `campfire` && dist(pier) < 5 | reveal valise |
| `kit_done` | valise vide | `starterLootComplete` ; autoriser `walk_west` tutoriel |

**MP** : empreintes + bouteille + ponton = **monde partagé** (1× seed) ; caillou, torche, valise, notes personnelles = **ownerPlayerId** (visible tous, interact owner).

**Anti-rush** : pas de valise si `campfire` false (même si le joueur court au ponton).

---

## Phasage implémentation

| Phase | Contenu | Risque |
|-------|---------|--------|
| **A — Design** | Valider ce doc + questionnaire | — |
| **B — Beats** | `intro-beats.mjs` shared + triggers serveur | moyen |
| **C — Prefabs** | 4–6 nouveaux prefabs plage | art léger |
| **D — Placements** | `beach-intro-placements.mjs` (positions monde + offsets perso) | terrain |
| **E — Narration** | Bulles + sign UI textes | faible |
| **F — Tuto UI** | Leçons E / hotbar / loot (brique 3) | faible |
| **G — Nettoyage** | Retirer spawn séquentiel v2 | faible |

---

## Ton RP (échantillon)

- **Pas** de quête explicite « Ramasse le caillou ».  
- **Oui** à la curiosité : bouteille, fumée, valise sous bois.  
- Mystère **K.** laissé ouvert — pas de révélation acte 1.  
- Multijoueur : chacun vit la même enquête sur le **même décor** ; ses affaires personnelles sont les siennes.

---

## Références code actuel

- Scénario : `packages/shared/src/scenario-beach.mjs`
- Loot v2 : `packages/shared/src/intro-starter-loot.mjs` → à remplacer par `intro-beach-beats.mjs`
- Prefabs intro : `beach_starter_prefabs.js`
- Spec joueur v1 : `design/secteur/INTRO_BEACH_PLAYER.md` (à mettre à jour après validation)
