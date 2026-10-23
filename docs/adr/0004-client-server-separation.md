# ADR 0004: Client And Server Separation

## Status

Accepted

## Context

Server code, client assets and tooling were mixed at the repository root.

## Decision

Use:

- `apps/server` for Express, Socket.io, DB, RCON and game-state server logic.
- `apps/client` for the browser game and previews.
- `packages/shared` for shared contracts.
- `infra` for deployment/runtime configuration.
- `tools` for local automation.

## Consequences

Ownership boundaries are clearer and CI can validate client/server paths independently.
