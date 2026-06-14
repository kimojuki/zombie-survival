# Migration client v2 — moteur progressif

Refonte **in-repo** : le jeu reste bootable à chaque étape. Le legacy `public/js` diminue ; le nouveau code vit sous `apps/client/src/`.

## Principes

1. **Une frame = un plan** — `BacklogScheduler.evaluate(ctx)` puis `FrameRunner.runDecorWorkers(...)`.
2. **Observabilité dès le jour 1** — `Engine.Telemetry` (phases boot, snapshots backlog, sections frame).
3. **Contrats stables** — `packages/shared` pour serveur ↔ client ; pas de rewrite protocole.
4. **Pas de big bang** — chaque PR migre un vertical slice testable.

## Structure cible

```
apps/client/src/
  engine/           ← frame plan, scheduler, telemetry, runner (E0 fait)
  net/              ← sync décor, socket adapters (à venir)
  world/            ← terrain, routes (extraire depuis public/js)
  bootstrap/        ← ordre de chargement legacy
packages/shared/    ← contrats gameplay (existant)
apps/client/public/js/  ← legacy ZS.* (rétrécit)
```

## Ordre de migration

| Phase | Contenu | Statut |
|-------|---------|--------|
| **E0** | `src/engine/` + tests + boot import | **Fait** |
| **E1** | WorldContentLoader + BudgetGovernor + queue décor | **Fait (L2a)** |
| **E2** | Gates defer/stream → BudgetGovernor + drainDecorRing | **Fait (L2c)** |
| E3 | Extraire `_buildBacklogPlan` ctx → `src/net/decor-pressure.js` | Partiel |
| E4 | Boot phases unifiées (`init-vis`, `spawnReady`) | À faire |
| E5 | Logs serveur structurés game-init (`traceId`) | À faire |
| E6 | TypeScript sur `engine/` + `shared/` | À faire |

## Boot (game.html)

```
wait-server → import /src/engine/install.js → legacy scripts → game.js
```

`install.js` expose `window.ZS.Engine` et l’alias compat `window.ZS.BacklogScheduler`.

## Tests

```bash
npm test -- tests/engine-backlog-scheduler.test.mjs
```

## Références

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [V2_REFONTE_STRATEGY.md](./V2_REFONTE_STRATEGY.md) — client + serveur + scaling
- [apps/client/src/README.md](../apps/client/src/README.md)
