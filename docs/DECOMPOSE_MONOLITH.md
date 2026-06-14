# Décomposition du monolithe game-server

Objectif : **un conteneur par rôle sur une seule VM**, et retirer progressivement la logique du gros `apps/server/index.js`.

Index : [VM_DEPLOY.md](./VM_DEPLOY.md) · [DOCKER_PROD_SIM.md](./DOCKER_PROD_SIM.md) · [ARCHITECTURE_TIERS.md](./ARCHITECTURE_TIERS.md)

---

## Cible prod (décision actuelle)

**Une VM Ubuntu** — pas de migration 2 VM pour l’instant.

```
Cloudflare (TLS)
       │
 cloudflared
       │
┌──────┴──────────────────────────────────────┐
│  VM unique (Docker Compose)                 │
│  nginx :443  →  game :3000  →  auth :3001   │
│                      │              │       │
│                      └──────┬───────┘       │
│                        mariadb :3306        │
│  bind mount ZS_DATA_DIR/mariadb, backups    │
└─────────────────────────────────────────────┘
```

| Rôle | Conteneur | Code | DB |
|------|-----------|------|-----|
| Edge HTTP | `nginx` | `infra/docker/nginx/` | — |
| Jeu + WebSocket | `game` | `apps/server/` | `zombie_game_db` |
| Comptes / sessions | `auth` | `apps/auth-server/` | `zombie_auth_db` |
| Persistance | `mariadb` | `infra/docker/mariadb/` | les deux |

Fichier compose **prod + dev sim** : `infra/docker/docker-compose.yml`.

Les fichiers `docker-compose.db.yml` / `docker-compose.app.yml` restent une **option** (simulation multi-réseau sur un PC) — **pas** la cible prod immédiate.

---

## Auth : déjà extrait

| Avant (monolithe) | Après |
|-------------------|--------|
| Routes `/api/auth/*` inline dans `index.js` | `apps/server/src/routes/auth-routes.js` |
| Login/register/guest dans le game DB | `apps/auth-server/` + `AUTH_MODE=standalone` |
| JWT game mélangé aux handlers HTTP | `auth-handoff.js`, `auth-player-link.js`, `auth-proxy.js` |

**Docker** : `AUTH_MODE=standalone` par défaut dans le compose.

**Dev bare metal** (`npm start` sans auth container) : `AUTH_MODE=embedded` conserve les handlers legacy dans `auth-embedded.js` (`@deprecated`).

---

## Roadmap décomposition `index.js`

Ordre suggéré — chaque étape = module + tests + doc, sans changer le contrat client.

| Phase | Module cible | Contenu retiré de `index.js` |
|-------|--------------|------------------------------|
| ✅ Auth HTTP | `src/routes/auth-routes.js` | `/api/auth/*`, handoff, `/me` |
| ✅ Health / status | `src/routes/health-routes.js` | `/api/health`, `/api/public/status`, `/api/servers` |
| ✅ Admin REST | `src/routes/admin-routes.js` | `/api/admin/*`, `/api/rcon`, hub décor/backups |
| ✅ World HTTP | `src/routes/world-routes.js` | `/api/world/decor-*` |
| ✅ Dev / QA | `src/routes/dev-routes.js` | `/api/dev/*`, `/api/qa/*` |
| ✅ Socket.io | `src/socket/register-sockets.js` | middleware auth + `connection` + tous les events |
| ✅ Player session | `src/game/player-session.js` | `game-init` payload, sleepers/items proches |
| ✅ World boot | `src/game/world-boot.js` | load persist, boot steps, shutdown, reload backup |
| ✅ World loops | `src/game/world-loops.js` | intervals zombie AI/sync, survie, craft, loot expiry, spatial player move |
| ✅ World seed | `src/game/world-seed.js` | `ensure*` décor (routes, plage, arbres, rochers, S01) |
| ✅ World wipe | `src/game/world-wipe.js` | `wipePlayerWorld`, clean slate boot |
| ✅ Zombie spawn | `src/game/zombie-spawn.js` | `makeZombie`, population, collision, constantes AI |
| ✅ Player combat | `src/game/player-combat.js` | PvP/PvE, mort, tir, loot zombie, life stats |
| ✅ Ground items | `src/game/ground-items.js` | drops au sol, spawn/remove, TTL |
| ✅ Building loot | `src/game/building-loot.js` | `LOOT_TABLES`, `generateLoot`, `lootQty` |
| ✅ Decor core | `src/game/decor-core.js` | `makeDecorItem`, remove, purge, immuable, stats |
| ✅ Player sleep | `src/game/player-sleep.js` | sleepers, bed sleep, persist, loot fouille |
| ✅ Player inventory | `src/game/player-inventory.js` | persist, inv-auth, storage, starter kit, guest commit |
| ✅ Beach spawn | `src/game/beach-spawn.js` | spawn plage, intro cluster, safe sand, build block |
| ✅ Player auth session | `src/game/player-auth-session.js` | normPlayerId, rôles, handoff socket |
| ✅ Player survival | `src/game/player-survival.js` | emit survie, item-effects, armure |
| ✅ Scenario runtime | `src/game/scenario-runtime.js` | groups, intro beats, scénario plage (lazy) |
| ✅ Client static | `src/client-static.js` | pages HTML + assets Vite/prod |
| ✅ World clock | `src/game/world-clock.js` | temps mondial, flags, boot, eau |
| ✅ Player interact | `src/game/player-interact.js` | portes proches, distXZ |
| ✅ Zombie sync | `src/game/zombie-sync.js` | compact snapshot sync |
| ✅ Server RCON | `src/server-rcon.js` | catalog prefabs + init RCON |
| ✅ HTTP routes wiring | `src/register-http-routes.js` | auth, health, admin, world, dev |
| ✅ Server runtime | `src/server-runtime.js` | regen, loops, boot séquence |
| ✅ Socket bindings | `src/socket/build-socket-bindings.js` | contexte lazy Socket.io |
| ✅ Game state | `src/game/game-state.js` | Maps, compteurs, prefabs décor |
| ✅ Shared mod imports | `src/game/shared-mod-imports.js` | promises ESM combat/survival/beach/S01… |
| ✅ Starter kit | `src/game/player-starter-kit.js` | DEFAULT_SURVIVAL, STARTING_SAVE, BENCH_SAVE |
| ✅ Server config | `src/server-config.js` | env, chemins client, owners, JWT, git commit |
| ✅ Decor query | `src/game/decor-query.js` | helpers décor paginé (beyond/near player) |
| ✅ Game stack | `src/game/create-game-stack.js` | wiring modules game + RCON + session |
| ✅ HTTP context | `src/build-http-route-context.js` | deps `registerHttpRoutes` |
| ✅ Socket context | `src/build-socket-context.js` | objet contexte Socket.io |
| ✅ Runtime context | `src/build-server-runtime-context.js` | loops + boot `createServerRuntime` |
| ✅ Bootstrap | `src/bootstrap-game-server.js` | orchestration HTTP + WS + runtime |
| ✅ Entry | `index.js` (~10 lignes) | `bootstrapGameServer(__dirname)` |
| ✅ Socket handlers | `socket/handlers/*` (11 fichiers) | `register-sockets.js` ~48 lignes orchestration |
| ✅ RCON commands | `rcon/commands/*` + `rcon/helpers.js` | `rcon.js` ~135 lignes orchestration |
| ✅ Admin REST | `routes/admin/*` (8 modules) | `admin-routes.js` ~104 lignes orchestration |
| 36 | Client legacy | `network.js`, `spawn_clearing.js`, `world.js`, `player.js`, `inventory.js`, `game.js` → chunks + `bundle:client` — voir [MONOLITH_AUDIT.md](./MONOLITH_AUDIT.md) |

Index audit complet : [MONOLITH_AUDIT.md](./MONOLITH_AUDIT.md)

Règles :

- Le **process game** reste le point d’entrée WebSocket et la logique temps réel.
- Ce qui a son **propre conteneur** (auth) ne doit plus avoir de chemin « embedded » en prod — embedded = dev legacy uniquement.
- Extraire par **routes / domaine**, pas par copier-coller de milliers de lignes d’un coup.

---

## Checklist après chaque extraction

1. `npm test` vert  
2. `npm run docker:sim:test:443` si stack Docker locale active  
3. Entrée datée dans `DEV_TRACKER.md`  
4. Mettre à jour ce doc (table roadmap)

---

## Références code

```
apps/server/index.js          # monolithe — rétrécir
apps/server/src/routes/       # HTTP par domaine
apps/auth-server/             # conteneur auth
infra/docker/docker-compose.yml
```
