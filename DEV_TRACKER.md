# Dev Tracker

## Rules

- All project work done locally should be logged in this file.
- Local-only development infrastructure must never be committed if it is machine-specific or environment-specific.
- The local SQLite database is for development only and must never be pushed, included in a PR, or merged upstream.
- The local `.env` file is for development only and must never be pushed.
- Before opening a future PR, review this tracker and separate:
  - gameplay/code changes intended for upstream
  - local-only development setup that must stay out of Git

## Local-only Files

- `.env`
- `database/local-dev.sqlite`
- `database/local-dev.sqlite-wal`
- `database/local-dev.sqlite-shm`

These are intentionally ignored by Git for local development.

## 2026-06-04

### Context

- Private repository cloned locally into `D:\Projects\zombie-survival`.
- Goal: make the game runnable locally for development and future PR work.

### Completed

- Installed Node dependencies with `npm install`.
- Verified the project serves the frontend locally on port `3000`.
- Diagnosed login failure as a missing local MySQL/MariaDB service.
- Reworked the data layer in `src/db.js` to support:
  - `sqlite` local development mode by default
  - `mysql` compatibility for later shared/deployment environments
- Added automatic SQLite initialization for local player persistence.
- Added `.env.example` documenting both local SQLite and optional MySQL config.
- Added SQLite ignore rules in `.gitignore`.
- Created a local `.env` configured for SQLite development.
- Verified local registration and login now work against SQLite.

### Important Notes

- The SQLite setup is a local development convenience, not a deployment decision.
- If upstream should remain MySQL-only, the SQLite support may later need to be discussed before PR.
- The current local environment is now sufficient to test the game manually in a browser.
- A local-only personal notes workspace is now used under `notes-local/` and must never be included in PR work.

### Completed (visual & gameplay pass — 2026-06-04)

- **Roads:** seamless asphalt/dirt textures; lane markings and edge lines drawn as code overlays (not baked in bitmap); ribbon mesh follows terrain with cross-segment subdivision; shoulder strips; `registerFlatPath()` in `noise.js` to flatten terrain under roads.
- **Terrain & vegetation:** `terrain_atlas.png` and `tree_atlas.png` added; grass/dirt UV mapping on terrain mesh; Minecraft-style vertical grass tufts; tree bark/leaf atlases on trunks and foliage.
- **River & water gameplay:** river mesh follows terrain width; animated water surface; player water contact (overlay, movement slow, reduced jump); survival thirst recovery in water; water zones synced to server → zombie slow factor in river.
- **Sector tweaks:** forest road paths adjusted; small-town main road uses `roadBroken` material; main-city highway guardrails rebuilt per segment with skip zones at intersections.
- **Housekeeping:** `notes-local/` added to `.gitignore`; `CLAUDE.md` updated to reflect actual project state.
- **River z-fighting fix:** `registerRiverChannel()` carves a 14 m bed along the full course; water surface is flat and ~0.48 m above the bed (not glued to terrain); grass/trees excluded from the channel.

### Next Suggested Steps

- Manual browser test pass: roads, river, water movement, zombie slow in water, terrain visuals on mobile.
- Clean up text encoding issues visible in the French UI strings.
- When ready: open a PR separating local-only SQLite setup from gameplay/visual changes if upstream prefers MySQL-only.
- Remaining world sectors still undocumented in code: farm, industrial, coast, lake, wasteland, mountain.
