# Server Modules

`apps/server/index.js` is currently the compatibility entrypoint containing the existing Express, Socket.io and game-state logic.

New server work should land in these folders:

- `api/`: Express route registration and middleware.
- `socket/`: Socket.io event registration.
- `game/`: authoritative game simulation, zombies, loot and world state.
- `db/`: database adapters and persistence helpers.

During the migration, preserve these external contracts:

- `GET /api/health`
- auth routes under `/api/auth/*`
- `POST /api/rcon`
- existing Socket.io event names
- SQLite local development and MySQL/MariaDB production compatibility
