# ADR 0003: Temporary ZS Facade

## Status

Accepted

## Context

Client gameplay modules currently communicate through `window.ZS`. Rewriting every module at once would be high risk.

## Decision

Keep `window.ZS` as a temporary compatibility facade while new code is organized under `apps/client/src`.

## Consequences

The game remains bootable during migration. New modules should avoid adding unnecessary global state.
