# ADR 0001: Branch Strategy

## Status

Accepted

## Context

The project needs a stable production branch while the game undergoes major restructuring.

## Decision

Use `feature/* -> dev -> master`.

- `master` is production.
- `dev` is staging and integration.
- Feature branches start from `dev`.
- `dev -> master` requires green CI, smoke checks and manual validation.

## Consequences

Work can be broken on `dev` during planned migrations, but production remains protected.
