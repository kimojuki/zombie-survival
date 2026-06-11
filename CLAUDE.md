# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on this repository.

## Project

**Zombie Survival** — mobile-first 3D FPS open-world multiplayer zombie game (French UI).

- **Client:** Three.js (CDN), Vite app under `apps/client` with legacy `window.ZS` scripts in `apps/client/public/js`
- **Server:** Node.js + Express + Socket.io (`apps/server/index.js`)
- **Database:** SQLite for local dev (`DB_CLIENT=sqlite`), MySQL/MariaDB for production
- **Design docs:** `design/` target, legacy docs may still exist under `worlDesign/` during migration

## Commands

```bash
npm install
npm start          # server: http://localhost:3000
npm run dev:server # nodemon server
npm run dev:client # Vite client: http://localhost:5173
npm run lint
npm test
npm run build
npm run test:smoke
```

Copy `.env.example` → `.env` for local development.

## Documentation (update on every feature)

| Doc | When to update |
|-----|----------------|
| `DEV_TRACKER.md` | **Always** — every work session |
| `README.md` | Setup, onboarding changes |
| `CONTRIBUTING.md` | Workflow, Definition of Done |
| `docs/DEPLOY.md` | Prod deploy, pm2, cron, webhook |
| `docs/ARCHITECTURE.md` | Client/server flow, chat, sync |
| `docs/RCON.md` | Admin commands, flags, API |
| `docs/ROAD_NETWORK.md` | Roads, terrain corridors, spawn paths |
| `docs/WALL_CLOCK.md` | Horloge cabane : mesh, angles, sens horaire, pièges Three.js |
| `docs/BUILDING_COLLIDERS.md` | Prefabs bâtiment : pivot mesh/collider, debug, pièges |
| `design/BUILDING_PREFABS.md` | Registre pièces cabane S01 (workflow progressif) |
| `.env.example` | New environment variables |

## Key files

| File | Role |
|------|------|
| `apps/server/index.js` | Auth, zombie AI, loot, multiplayer sync, RCON hooks |
| `apps/server/src/rcon.js` | Admin command registry |
| `apps/server/src/db.js` | Dual SQLite/MySQL data layer |
| `apps/client/public/client-version.json` | Version client (cache bust auto) |
| `apps/client/game.html` | Legacy game HTML shell |
| `apps/client/public/js/game.js` | Main loop, movement, shooting |
| `apps/client/public/js/world.js` | Terrain, day/night, vegetation, water |
| `apps/client/public/js/road_network.js` | **Road graph** — single source of truth |
| `packages/shared/src/constants.mjs` | Shared route/event constants |
| `DEV_TRACKER.md` | **Keep updated** with every local work session |

## Workflow IA (Bruno, Georges)

En cas de **doute de design** : questionnaire à choix multiples (+ option « Autre »), pas d’hypothèse longue. Voir **`docs/AI_WORKFLOW.md`** et la règle `.cursor/rules/ai-questionnaire.mdc`.

## Conventions

- Roads: sectors declare `roads: []` in `registerSector` — **no** direct `ribbon()` calls
- Build order: `resolve → flatten → terrain → buildAll → buildMeshes` (see `world.js`)
- Loot buildings: `registerLoot(category, cx, cz, w, d)`
- First connected client sends colliders, water zones, loot buildings to server
- Increment `version` in `apps/client/public/client-version.json` after legacy client JS/CSS changes
- Do not commit `.env`, `database/*.sqlite`, or `notes-local/`
- Branch flow: `feature/* -> dev -> master`; never merge `dev` to `master` without green checks and validation.
- Keep `server.js` as a compatibility wrapper only; new server work belongs under `apps/server`.

## MCP

The `claude-flow` MCP server is enabled for this project (see `.claude/settings.local.json`).
