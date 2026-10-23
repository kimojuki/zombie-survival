# Changelog

Journal **technique** des changements. Notes **joueurs** : [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md).

Processus release (backup, migrations, checklist) : [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md).

Flux Git : `feature/* → dev → master`.

---

## Unreleased

### Added
- Processus release : `docs/RELEASE_NOTES.md`, `docs/RELEASE_PROCESS.md`, backup pre-deploy, `npm run release:check`.
- Auth-server Phase A (interne, non exposé Cloudflare).
- Moteur chargement client L3 (`apps/client/src/engine/`) : BacklogScheduler, BudgetGovernor, ContentLoader, ChunkStreamer, DecorGapMonitor, LodGapMonitor.
- Découpage `network.js` / `world.js` / monolithes admin en chunks + scripts `tools/bundle-*.mjs`.
- Landing / play (`play.html`, guest-auth, mode invité).
- Docker prod sim (`infra/docker/`, `docs/DOCKER_PROD_SIM.md`).
- Monde S01 étendu (routes chunkées, forêt 64 m, checkpoints, placements).

### Changed
- Architecture ports documentée : front public `:3000` / `survival.badom.ch`.
- **Infomaniak Node + PM2** documenté et scripts dédiés (`INFOMANIAK_NODE.md`, parallèle à VM Docker).
- `apps/server/index.js` allégé → `bootstrap-game-server`, `game/*`, `socket/handlers/*`, RCON modularisé.
- Performance exploration : surge prefetch/critical/gap, idle gap fill, lod-texture-surge (`client-version` `20260609-lod-texture-l3l`).

### Fixed
- Gaps décor idle (pending bloqué sans spawn), spam logs stream-pause, colliders post-boot lents.
- Arbres `simpleLod` proches : spawn mesh complet si backlog LOD/defer élevé.

---

## 2026-06-13 — guest-auth-play

**Client** : `20260613-guest-auth-play`

### Added
- Mode invité (`Invite_*`), inscription play, upgrade compte.
- `packages/shared/src/guest-auth.mjs`, colonnes `is_guest` / `guest_committed`.
- Landing early access, play responsive.

### Fixed
- Persistance disconnect inventaire/survie.
- Cailloux intro filtrés par propriétaire.

### Database
- Migration additive `players` (guest columns) — pas de wipe.

---

## 2026-06 — studio restructure

- Monorepo `apps/client`, `apps/server`, `packages/shared`.
- Vite, ESLint, Prettier, CI, smoke tests.
- Server authority (inventaire, survie, craft).

---

## Format

- **Added** — nouvelles features
- **Changed** — comportement existant
- **Fixed** — bugs
- **Database** — migrations (toujours préciser additive vs destructive)
