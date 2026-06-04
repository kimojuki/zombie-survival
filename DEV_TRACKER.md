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

### Next Suggested Steps

- Test the full browser flow:
  - register
  - login
  - load into world
  - verify movement, HUD, zombies, inventory, and respawn
- Clean up text encoding issues visible in the French UI strings.
- Split local setup work from gameplay/product work when preparing future PRs.
