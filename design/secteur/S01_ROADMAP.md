# S01 — Roadmap placement POI

Workflow incrémental : **1 objet validé → playtest → ✅ → suivant**.

Guide technique détaillé (position, rotY, hauteur, pièges) : **[docs/S01_DECOR_PLACEMENT.md](../../docs/S01_DECOR_PLACEMENT.md)**.

---

## Ancres validées en jeu

| POI | `placementKey` | Position | `rotY` | Statut |
|-----|----------------|----------|--------|--------|
| Cabane #1 | `s01:cabin01:shack` | `(165.1, 7.1)` | `0.55` | ✅ mesh 7/7 |
| Coffre cabane #1 | `s01:cabin01:chest` | local `(1.64, 1.36)` → monde via `cabin01ChestWorldXZ()` | `cabin01ChestFaceDoorRotY()` | ✅ playtest (coin NE, 10 cm murs) |

Loot coffre : `S01_CABIN_CHEST_LOOT` (haricots, eau, 3 planches).

---

## Pipeline en cours (Bruno)

| # | Étape | Statut |
|---|--------|--------|
| 1 | Cabane `building_survivor_shack` (7 pièces + colliders) | ✅ |
| 2 | Coffre loot intérieur `storage_chest` | ✅ |
| 3 | Route terre depuis sentier | ⏳ |
| 4 | Cabane #2, station essence, … | ⏳ |

---

## Commandes playtest rapides

```text
tp repere          # proche cabane #1 (RCON)
decorseed s01      # complète seeds S01 manquants (serveur déjà à jour)
node tools/check-s01-decor.mjs   # vérif SQLite : 2 rows cabin01, rotY ~0.55
```

Après changement `packages/shared` : **redémarrer le serveur** (pas seulement `decorseed`).
