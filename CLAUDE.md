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

## Key files

| File | Role |
|------|------|
| `server.js` | Auth, zombie AI, loot, multiplayer sync |
| `public/js/game.js` | Main loop, movement, shooting |
| `public/js/world.js` | Terrain, day/night, vegetation, water |
| `public/js/buildings.js` | Roads, building utils, sector registry |
| `public/js/sector_*.js` | World sectors (forest, town, maincity, military) |
| `src/db.js` | Dual SQLite/MySQL data layer |
| `DEV_TRACKER.md` | **Keep updated** with every local work session |

## Conventions

- Sectors register via `ZS.Buildings.registerSector({ build })`
- Loot buildings register via `registerLoot(category, cx, cz, w, d)`
- First connected client sends colliders, water zones, and loot buildings to the server
- Do not commit `.env`, `database/*.sqlite`, or `notes-local/`

## MCP

The `claude-flow` MCP server is enabled for this project (see `.claude/settings.local.json`).
