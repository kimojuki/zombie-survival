# Processus de release — sans perte de progression

Ce document définit **comment publier des mises à jour régulières** tout en garantissant que **la progression joueur n'est jamais perdue** par un deploy ou une migration.

Index : [RELEASE_NOTES.md](./RELEASE_NOTES.md) · [DEPLOY.md](./DEPLOY.md) · [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Principes (non négociables)

1. **Données joueurs = sacré** — position, inventaire, survie, kills, sleepers, constructions persistantes.
2. **Migrations additives** — `ALTER TABLE … ADD COLUMN` avec défaut ; jamais `DROP` / `DELETE FROM players` en prod sans backup + validation explicite.
3. **Backup avant chaque deploy prod** — automatique via `tools/pre-deploy-backup.mjs` (intégré à `deploy-prod.sh`).
4. **Notes de version à jour** — [RELEASE_NOTES.md](./RELEASE_NOTES.md) + entrée [CHANGELOG.md](../CHANGELOG.md) avant merge `dev → master`.
5. **Front public = `:3000`** — deploy ne touche pas au tunnel Cloudflare ; restart pm2 seulement après backup.

---

## Ce qui est persisté (référence)

| Donnée | Stockage | Sauvegarde |
|--------|----------|------------|
| Compte + mot de passe | `players` | `savePlayerState` au disconnect + tick |
| Position, santé, kills, inventaire | `players` | `_persistPlayer` / disconnect |
| Joueur déconnecté (offline) | `world_sleepers` | sleeper + survie catch-up |
| Invité non engagé | `players` (trial) | Purge volontaire si quitte avant 8 min |
| Monde (décor, structures, loot) | `world_*` | `world-persist` flush |
| Backup admin complet | `database/backups/*.json` | API `/api/admin/backups` kind=`full` |

Fichiers clés : `apps/server/src/db.js`, `world-persist.js`, `world-backup.js`, disconnect handler dans `index.js`.

---

## Cadence recommandée

| Fréquence | Action |
|-----------|--------|
| **Chaque session dev** | `DEV_TRACKER.md` |
| **Chaque PR vers `dev`** | Tests verts ; migration additive si DB |
| **Avant merge `dev → master`** | Release notes + bump `client-version.json` si JS client |
| **Chaque deploy prod** | Backup auto + smoke `/api/health` + 1 reconnect test compte réel |
| **Hebdo (early access)** | Release mineure documentée même si correctifs seuls |

---

## Checklist release (avant merge `dev → master`)

### 1. Code & tests

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build` (si changement client Vite/build)
- [ ] `npm run release:check` (agrégateur)

### 2. Persistance & migrations

- [ ] Changement DB = fonction `ensure*Schema()` idempotente (pattern `ensurePlayersGuestSchema`)
- [ ] Pas de script wipe monde sans fichier marqueur explicite (ex. `.world_clean_slate_*`) **et** accord équipe
- [ ] Inventaire / survie : migration à la **connexion** (`game-init`), pas destruction silencieuse
- [ ] Test manuel : compte test → jouer → disconnect → restart serveur → reconnect → même inv/position

### 3. Documentation

- [ ] [RELEASE_NOTES.md](./RELEASE_NOTES.md) — section « En cours » remplie puis datée au deploy
- [ ] [CHANGELOG.md](../CHANGELOG.md) — entrée technique
- [ ] [DEV_TRACKER.md](../DEV_TRACKER.md) — session Completed
- [ ] `.env.example` si nouvelles variables
- [ ] `client-version.json` incrémenté si JS/CSS client legacy

### 4. Deploy prod

- [ ] Annoncer maintenance courte si restart nécessaire (Discord / in-game si disponible)
- [ ] `deploy-prod.sh` exécuté (backup auto)
- [ ] `/api/health` → `ok`, `commit` attendu
- [ ] Reconnect 1–2 comptes réels : inventaire + position OK
- [ ] Section RELEASE_NOTES datée et « En cours » vidée

---

## Deploy & backup

### Automatique (prod Infomaniak)

`scripts/deploy-prod.sh` appelle **`node tools/pre-deploy-backup.mjs`** avant `pm2 restart` :

- **SQLite** : copie `database/*.sqlite` (+ `-wal` / `-shm`) → `database/backups/pre-deploy-<timestamp>/`
- **MySQL** : `mysqldump` si disponible → `database/backups/pre-deploy-<timestamp>.sql`

Les fichiers `.env` et `database/` ne sont **jamais** supprimés par `git clean` (déjà dans deploy-prod.sh).

### Manuel (avant gros changement)

1. Console admin ou API : `POST /api/admin/backups` body `{ "kind": "full", "label": "pre-migration-YYYY-MM-DD" }`
2. Télécharger via `GET /api/admin/backups/:id/download`
3. Conserver hors serveur ( équipe )

### Rollback

```bash
# 1. Restaurer backup (admin UI import ou copie SQLite)
# 2. Revenir au commit précédent
git reset --hard <commit-prev>
pm2 restart zombie
# 3. Vérifier reconnect joueur test
```

---

## Règles de migration code

### ✅ Autorisé

```js
// Colonne nullable ou avec DEFAULT — ignore erreur si existe
await pool.execute('ALTER TABLE players ADD COLUMN foo INTEGER NOT NULL DEFAULT 0');
```

```js
// Migration inventaire à la connexion
function _gameInitPayload(player) {
  const inv = _ensureSlotGrid(_normalizeInv(player.inventory));
  …
}
```

### ❌ Interdit en prod sans procédure exceptionnelle

- `DELETE FROM players` / `TRUNCATE`
- `DROP COLUMN` sans export + restore plan
- Reset spawn global (`world_clean_slate`) sans backup full
- Deploy sans backup quand `db.js` ou `world-persist.js` modifié

---

## Communication joueurs (early access)

Sur la landing / Discord / notes de version :

- **Correctifs** : « Inventaire / connexion / perf »
- **Nouveautés** : une phrase claire
- **Maintenance** : « Redémarrage ~1 min — progression sauvegardée » (vrai seulement si checklist respectée)

---

## Scripts npm

| Commande | Rôle |
|----------|------|
| `npm run release:check` | lint + test + rappels release notes |
| `npm run backup:pre-deploy` | Backup local manuel (même logique que prod) |

---

## Responsabilités

| Rôle | Action |
|------|--------|
| Dev auteur PR | Migration additive + test reconnect |
| Reviewer | Vérifie section « Données joueurs » dans RELEASE_NOTES |
| Deploy prod | Vérifie log backup dans `zombie-deploy.log` |
