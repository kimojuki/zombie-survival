# ADR 0002: Vite Client Tooling

## Status

Accepted

## Context

The browser client was loaded through raw HTML script tags. The project needs modern builds, CI validation and a path toward ES modules.

## Decision

Introduce Vite under `apps/client` while preserving legacy scripts in `apps/client/public/js`.

## Consequences

The client can now be built in CI. Legacy modules can migrate gradually without blocking the full restructure.
