# Contributing

Zombie Survival uses a strict staging workflow so `master` can stay production-ready.

## Branch Strategy

- `master` is production.
- `dev` is the shared staging branch.
- Feature work starts from `dev` on `feature/<scope>`.
- Pull requests merge `feature/* -> dev`.
- `dev -> master` happens only after lint, tests, build, smoke checks and manual validation.

Never push secrets, SQLite local databases, `notes-local/`, generated screenshots or build output.

## Daily Git (équipe parallèle)

Voir **[docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)** : `git pull` au début, `git pull` avant `git push`, fusionner les changements des deux devs (S01 + S02) sans écraser. Règles IA : `.cursor/rules/git-team-workflow.mdc`.

## Definition Of Done

- The change is scoped and documented.
- `npm run lint`, `npm test`, `npm run build` pass, or the PR explains why a check could not run.
- Relevant docs are updated: `DEV_TRACKER.md` always, plus architecture/deploy/RCON/road docs as needed.
- Client JavaScript changes update the cache bust value in `apps/client/game.html` while legacy scripts are still used.
- Server changes preserve `/api/health`, auth routes, Socket.io events and SQLite/MySQL compatibility.

## Local Workflow

```bash
npm install
cp .env.example .env
npm run dev:server
npm run dev:client
```

After **server** changes (`apps/server/`), restart Node — a running process does not pick up edits until restart. Verify `GET /api/health` returns `invDebugBuild` matching `apps/client/public/client-version.json`, then hard-refresh the browser (Ctrl+F5). See [docs/INVENTORY_CONSUMPTION.md](docs/INVENTORY_CONSUMPTION.md) for inventory / consumption debugging.

Use `npm run test:smoke` for server boot checks and `npm run test:visual` for the FPS arm preview captures.

## Workflow IA (équipe)

Décisions gameplay / UX en doute → **questionnaire à choix multiples** (option « Autre »). Détail : **[docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)**.

## Review Rules

- No direct merge to `master`.
- No bypassing CI or review checks.
- No unrelated refactors in feature PRs.
- Commit messages should explain the reason for the change.
