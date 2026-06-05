# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on this repository.

## Project

**Zombie Survival** — mobile-first 3D FPS open-world multiplayer zombie game (French UI).

- **Client:** Three.js (CDN), vanilla JS modules under `public/js/` (namespace `ZS.*`)
- **Server:** Node.js + Express + Socket.io (`server.js`)
- **Database:** SQLite for local dev (`DB_CLIENT=sqlite`), MySQL/MariaDB for production
- **Design docs:** `worlDesign/` (world sectors, items, roads)

## Commands

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # nodemon
```

Copy `.env.example` → `.env` for local development.

## Documentation (update on every feature)

| Doc | When to update |
|-----|----------------|
| `DEV_TRACKER.md` | **Always** — every work session |
| `README.md` | Setup, onboarding changes |
| `docs/DEPLOY.md` | Prod deploy, pm2, cron, webhook |
| `docs/DEPLOY.md` | Prod deploy, pm2, cron, webhook |
| `docs/ARCHITECTURE.md` | Client/server flow, chat, sync |
| `docs/RCON.md` | Admin commands, flags, API |
| `docs/ROAD_NETWORK.md` | Roads, terrain corridors, spawn paths |
| `.env.example` | New environment variables |

## Key files

| File | Role |
|------|------|
| `server.js` | Auth, zombie AI, loot, multiplayer sync, RCON hooks |
| `src/rcon.js` | Admin command registry |
| `public/js/game.js` | Main loop, movement, shooting |
| `public/js/world.js` | Terrain, day/night, vegetation, water |
| `public/js/road_network.js` | **Road graph** — single source of truth (flatten + mesh + queries) |
| `public/js/buildings.js` | Building utils, sector registry → RoadNetwork |
| `public/js/sector_*.js` | World sectors (forest, town, maincity, military) |
| `public/js/rcon.js` | In-game admin console UI |
| `public/js/chat.js` | Multiplayer chat (discrete feed + input) |
| `public/js/network.js` | Socket.io client sync |
| `src/db.js` | Dual SQLite/MySQL data layer |
| `DEV_TRACKER.md` | **Keep updated** with every local work session |

## Conventions

- Roads: sectors declare `roads: []` in `registerSector` — **no** direct `ribbon()` calls
- Build order: `resolve → flatten → terrain → buildAll → buildMeshes` (see `world.js`)
- Loot buildings: `registerLoot(category, cx, cz, w, d)`
- First connected client sends colliders, water zones, loot buildings to server
- Increment `CACHE_BUST` in `game.html` after client JS changes
- Do not commit `.env`, `database/*.sqlite`, or `notes-local/`

## MCP

The `claude-flow` MCP server is enabled for this project (see `.claude/settings.local.json`).
