# Horloge murale cabane (`spawn_cabin_wall_clock`)

Documentation des difficultés rencontrées et de la solution validée pour les **aiguilles dynamiques** synchronisées sur `worldTime` (cycle jour/nuit du jeu).

---

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `apps/client/public/js/spawn_clearing.js` | Mesh `_buildCabinWallClock` — cadran, repères, pivots aiguilles |
| `apps/client/public/js/world_clock.js` | Client : `worldTimeToClockHands`, `applyWallClockHands` |
| `packages/shared/src/world-clock.mjs` | Formules partagées + tests unitaires |
| `apps/client/public/js/world.js` | Tick jour/nuit → `applyWallClockHands(_wallClocks, _timeOfDay)` |
| `apps/client/public/js/prefab-catalog-preview.js` | Aperçu 3D catalogue admin (temps accéléré) |
| `tests/world-clock.test.mjs` | Régression angles + delta rotation |

Orientation décor : `docs/DECOR_PREFAB_ORIENTATION.md` — cadran **−Z**, dos **+Z** au mur.

---

## Convention temps jeu

- `worldTime` : `0`–`1` (0 = minuit, `0.25` = lever, `0.5` = midi, `0.75` = coucher).
- Cycle réel : **1800 s** (30 min réel = 24 h jeu).
- Exposé client : `ZS.getWorldTime()` / `ZS.setWorldTime()` (`world.js`).

```js
totalMinutes = (worldTime % 1) * 24 * 60
```

---

## Géométrie mesh (Three.js)

```
g (pivot décor, rotY placement)
└─ dial (plan XY, z ≈ −0.01)
   ├─ face (CircleGeometry, rotation.y = π → normale vers −Z)
   ├─ repères 12 h (tick.rotation.z = −a)
   ├─ handsRoot (rotation.y = π  ← CRITIQUE pour le sens horaire)
   │  ├─ hourPivot   → rotation.z appliquée ici
   │  └─ minutePivot → rotation.z appliquée ici
   └─ axe central (pin)
```

- **Face cadran** : côté **−Z** local (vers la pièce quand le dos +Z est au mur).
- **Aiguilles** : meshes sur **+Y** au repos (= 12 h quand `rotation.z = 0`).
- **`face.rotation.y = π`** : oriente le disque blanc vers le joueur (sinon face invisible / dans le mur).
- **`handsRoot.rotation.y = π`** : inverse l’axe effectif de `rotation.z` pour que le sens horaire mathématique corresponde au sens horaire visuel sur le cadran.

Sans `handsRoot.rotation.y = π`, les positions peuvent sembler correctes à un instant T, mais l’animation tourne à l’envers (50→40→30 au lieu de 0→10→20).

---

## Formules d’angles (position à un instant T)

### ✅ Solution validée

```js
hourZ   = ((totalMinutes % 720) / 720) * 2π   // 720 min = 12 h
minuteZ = ((totalMinutes % 60)  / 60)  * 2π
```

### ❌ Piège : double comptage des minutes (heure)

Ancienne formule incorrecte :

```js
hour12 = (totalMinutes / 60) % 12   // contient déjà la fraction de minute !
hourZ  = ((hour12 + minute / 60) / 12) * 2π   // minute comptée DEUX FOIS
```

**Symptôme** : vers 59 min, la petite aiguille était trop avancée ; à la passage de l’heure elle **sautait en arrière**, pendant que la grande aiguille semblait parfois avancer d’un cran puis reculer — incohérence totale entre les deux aiguilles.

**Règle** : une seule source pour la position 12 h : `(totalMinutes % 720) / 720`.

---

## Animation : ne pas recoller l’angle brut chaque frame

### ❌ Piège : `rotation.z = angle` à chaque tick

Les angles cible utilisent `% 60` et `% 720`. À chaque passage **59 → 0 min** (ou minuit sur 12 h), l’angle cible saute de ~`2π` à `0`. Three.js interprète alors un **tour complet en arrière** au lieu d’avancer de quelques minutes.

**Symptôme** : grande aiguille qui fait un cercle arrière toutes les ~60 min de jeu ; petite aiguille qui recule à chaque tour d’heure.

### ✅ Solution : rotation cumulative par delta temps

```js
dMin = totalMinutes - clock._clockTotalMinutes
// passage minuit jeu : si dMin < −720, dMin += 1440

hourPivot.rotation.z   = advance(hourPivot.rotation.z,   dMin, 720)
minutePivot.rotation.z = advance(minutePivot.rotation.z, dMin, 60)
```

Première frame : snap direct `rotation.z = hourZ / minuteZ`.  
Si le temps recule (`setWorldTime` debug) : re-snap sur les angles cible.

État par horloge : `clock._clockTotalMinutes` (sur l’objet enregistré via `registerWallClock`).

---

## Sens horaire (le bug le plus trompeur)

Plusieurs faux correctifs ont été tentés :

| Tentative | Résultat |
|-----------|----------|
| Inverser uniquement le signe (`rotation.z = −angle`) sans `handsRoot π` | Positions parfois OK, sens **anti-horaire** |
| `handsRoot.rotation.y = π` + angles négatifs + delta **positif** | Toujours 50→40→30 (sens inverse) |
| Orienter la caméra catalogue / `rotY = π` sur le prefab | **Fausse piste** — face au cadran, le problème restait |
| Rotation cumulative seule (sans corriger signe + π) | Plus de sauts, mais sens encore faux |

### ✅ Combinaison finale validée

1. **Mesh** : `handsRoot.rotation.y = Math.PI`
2. **Snap initial** : `rotation.z = +hourZ`, `+minuteZ` (angles **positifs**)
3. **Animation** : `advanceClockHandRotationZ` **soustrait** le delta :

```js
function advanceClockHandRotationZ(currentZ, dMinutes, periodMinutes) {
  return currentZ - (dMinutes / periodMinutes) * 2π;
}
```

Avec `handsRoot π`, un delta **négatif** sur `rotation.z` produit un mouvement **horaire** visible (0→10→20→30).

**Ne pas changer un seul des trois points** sans retester les trois (position statique, sens animation, passage 59→61 min).

---

## Catalogue admin vs jeu

| Contexte | Comportement |
|----------|--------------|
| **Jeu** | `world.js` tick → `applyWallClockHands` ; `worldTime` serveur |
| **Catalogue** | `prefab-catalog-preview.js` accélère `_previewWorldTime += 1/(1800×30)` par frame (temps **monotone**, pas de `% 1` sur la variable preview) ; `worldTimeToClockHands` module toujours en interne |

L’aperçu catalogue utilise les **mêmes** `applyWallClockHands` et mesh — pas de branche spéciale caméra nécessaire une fois le trio π / angles+ / delta− en place.

---

## Enregistrement runtime

```js
const clockEntry = { hourHand: hourPivot, minuteHand: minutePivot, pendulum: pendulumPivot };
ZS.applyWallClockHands([clockEntry], worldTime);  // snap initial
ZS.registerWallClock(clockEntry);                   // liste tick world.js
```

---

## Tests de régression

```bash
node --test tests/world-clock.test.mjs
```

Couverture :

- Midi / minuit / 3 h / 6 h — positions correctes
- +15 min — `minuteZ` augmente
- Pas de double comptage 59→61 min sur `hourZ`
- `advanceClockHandRotationZ` — pas de tour arrière 59→61 min (delta soustrait)

---

## Checklist si tu touches à l’horloge

- [ ] Positions statiques correctes à 3 h, 6 h, 12 h (catalogue **et** jeu)
- [ ] Grande aiguille : 0→10→20→30 en accéléré (pas 50→40→30)
- [ ] Petite aiguille : avance lente et continue, pas de saut arrière à chaque heure
- [ ] Passage 59→01 min : pas de tour complet en arrière
- [ ] `client-version.json` incrémenté après modif JS
- [ ] Tests `world-clock.test.mjs` verts

---

## Résumé une ligne

**Cadran −Z · `handsRoot.rotation.y = π` · angles positifs · rotation cumulative avec delta soustrait · `hourZ = (totalMinutes % 720) / 720`.**
