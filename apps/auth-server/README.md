# Auth Server (service interne)

Processus **interne** — logique comptes/sessions/handoff. **Non exposé** sur Cloudflare.

## Architecture ports

```
Cloudflare  survival.badom.ch
       │
       ▼
  PORT 3000  ← apps/server (front + socket.io + API jeu)
       │       index.html, play.html, game.html
       │       proxy /api/auth/* → auth interne (Phase B)
       │
       └──► 127.0.0.1:AUTH_PORT (3001)  ← apps/auth-server (DB auth seule)
```

| Port | Process | Exposé public |
|------|---------|---------------|
| **3000** | `apps/server` — landing, play, game, socket | **Oui** (Cloudflare, Infomaniak) |
| **3001** | `apps/auth-server` — login, sessions, exchange | **Non** (127.0.0.1 only) |
| **5173** | Vite dev client (optionnel) | Non |

## Démarrage local

```bash
# Terminal 1 — front public + jeu
npm run dev:server    # :3000

# Terminal 2 — auth interne (Phase B+ avec AUTH_MODE=standalone)
npm run dev:auth      # 127.0.0.1:3001
```

Variables (`.env.example`) :

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | 3000 | **Front public** (survival.badom.ch) |
| `AUTH_PORT` | 3001 | Auth interne |
| `AUTH_HOST` | 127.0.0.1 | Ne pas binder 0.0.0.0 en prod |
| `ZS_TEAM_URL` | survival.badom.ch | URL handoff `game.html` |
| `AUTH_JWT_SECRET` | = `JWT_SECRET` | Partagé auth + game |

## API (appelée via proxy :3000 en standalone)

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Créer compte → handoff vers `:3000/game.html` |
| `POST /api/auth/login` | Connexion → handoff |
| `POST /api/auth/exchange` | Code → JWT game (server-to-server ou via handoff proxy) |

Contrat : `packages/shared/src/auth-contract.mjs`

Index : [ROADMAP_PLANS.md](../../docs/ROADMAP_PLANS.md)
