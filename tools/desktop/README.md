# Scripts bureau — Zombie Survival dev

Raccourcis Windows pour gérer la stack locale sans terminal manuel.

## Raccourcis (bureau)

| Raccourci | Action |
|-----------|--------|
| **ZS - Démarrer serveurs** | Game `:3000` + Vite `:5173` (2 fenêtres) |
| **ZS - Arrêter serveurs** | Stop `:3000`, `:5173`, `:3001` |
| **ZS - Redémarrer serveurs** | Stop → start (après changements `apps/server`) |
| **ZS - Statut serveurs** | Ports + `/api/health` |
| **ZS - Démarrer (+ auth)** | Game standalone + Vite + auth `:3001` (3 fenêtres) |

Recréer les raccourcis :

```powershell
powershell -ExecutionPolicy Bypass -File tools\desktop\create-desktop-shortcuts.ps1
```

## Ports

| Port | Service | Cloudflare |
|------|---------|------------|
| **3000** | Game + landing + play + socket | Oui (`survival.badom.ch`) |
| **5173** | Vite dev (proxy API → 3000) | Non |
| **3001** | Auth interne | Non |

## Config

Éditer [`zs-server-env.bat`](zs-server-env.bat) :

- `ZS_PROJECT` — chemin repo
- `ZS_START_VITE=1` — lancer Vite avec le game
- `ZS_START_AUTH=1` — auth-server (ou raccourci « + auth ») → game en `AUTH_MODE=standalone`

Guide test : [docs/TEST_STANDALONE.md](../../docs/TEST_STANDALONE.md)
