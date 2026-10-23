# Stratégie refonte — client, serveur, scaling

Document de cadrage pour la refonte progressive. **Objectif : solidité et charge distribuable sans big bang.**

---

## Où on en est aujourd'hui

```
┌─────────────────────────────────────────┐
│  apps/server/index.js  (~6500 lignes)   │
│  • REST /api/auth/*                     │
│  • Socket.io : move, combat, chat, sync │
│  • Zombie AI, loot, inventaire, monde   │
│  • RCON, persistance SQLite/MySQL       │
└─────────────────────────────────────────┘
```

Un processus, un port (3000). Le client Vite proxy tout.  
**Bottleneck actuel observé en playtest : client** (defer, LOD, boot render) — pas le CPU serveur.

---

## Comment font « les pros » ?

Ce n'est **pas** login + game + chat en 3 machines dès le départ. C'est en général **3 étapes** :

### 1. Monolithe modulaire (indie / early access)

Un binaire, **frontières logiques** claires :

| Module | Rôle |
|--------|------|
| **Gateway** | Auth JWT, rate limit, routing vers la bonne shard |
| **Game session** | Socket gameplay, tick zombies, autorité monde |
| **Persistence** | DB, flush monde, snapshots |

Chat, login et gameplay peuvent rester **dans le même Socket.io** tant que le trafic chat < ~5 % du bandwidth.

### 2. Sharding horizontal (MMO / gros FPS open-world)

La vraie distribution de charge :

```
                    ┌──────────────┐
  Client ──────────►│ API Gateway  │  auth, matchmaking, server list
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Game shard S01    Game shard S02    Game shard beach
   (secteur forêt)  (ville)           (instance intro)
```

Chaque **shard** = un process (ou un pod) avec son état monde en mémoire + DB partitionnée ou snapshot par shard.

### 3. Services dédiés (scale / équipe large)

On **extrait** seulement quand les métriques le demandent :

| Service | Quand le séparer |
|---------|------------------|
| **Auth / accounts** | Multi-shard, SSO, anti-brute-force centralisé |
| **Chat** | Spam, modération, présence globale, cross-shard |
| **Game sim** | CPU tick saturé, isolation crash |
| **Asset CDN** | Toujours séparé (vous : client static + Vite build) |

Exemples réels :
- **Petits survival co-op** (Valheim-like) : 1 serveur dédié par partie, pas de login séparé.
- **MMO** : auth cluster + N realm servers + parfois chat relay (Redis pub/sub).
- **Fortnite / Apex** : matchmaking service + game server instances éphémères (pas de monde persistant unique).

**Zombie Survival** = monde persistant open-world, secteurs (S01, beach…) → modèle **monolithe modulaire → shards par secteur/instance**, pas 3 microservices dès maintenant.

---

## Recommandation pour ce projet

### Ne pas faire maintenant

- 3 processus séparés login / game / chat en local (complexité ops, debug, sessions Socket.io fragmentées).
- Rewrite serveur from scratch dans un autre repo.
- Microservices « parce que c'est pro ».

### Faire maintenant (aligné refonte en cours)

```
packages/shared/          ← contrats events, constants (existant)
apps/server/src/
  auth/                   ← login, JWT, sessions (extraire de index.js)
  gateway/                ← health, client-version, server list (SERVER_ROLE)
  game/                   ← socket handlers gameplay
  world/                  ← persist, decor, zombies tick
  chat/                   ← handler chat (thin, même socket au début)
apps/client/src/
  engine/                 ← frame, scheduler (E0 ✓)
  net/                    ← adapters socket, decor-pressure
  world/                  ← terrain, routes (client-side gen)
```

**Même process, modules testables.** Le chat reste un module ; le login reste REST + token sur le même host.

### Faire quand métriques / besoin

| Seuil indicatif | Action |
|-----------------|--------|
| > 30–50 joueurs simultanés sur un nœud | Profiler serveur, Redis adapter Socket.io |
| Monde trop gros en RAM / flush DB | **Shard par secteur** (S01 = process 1, beach = process 2) |
| Chat modération / cross-shard | Service chat + Redis pub/sub |
| Équipe > 2 devs backend full-time | CI deploy séparé auth vs game |

---

## Plan refonte révisé (client + serveur)

| Phase | Focus | Livrable |
|-------|--------|----------|
| **L0** ✓ | **Landing SEO** — vitrine Google, `/` indexable, `/play.html` login | index.html, robots, sitemap, JSON-LD |
| **C0** ✓ | Client engine (scheduler, runner, telemetry) | `src/engine/` |
| **C1** | Perf boot / defer / LOD stable | logs verts playtest |
| **C2** | `src/net/decor-pressure.js`, boot phases | moins de logique dans `network.js` |
| **S0** | Découper `index.js` : `auth`, `socket/events`, `world-persist` déjà partiels | imports clairs, tests |
| **S1** | **Game session** : un fichier = connect → game-init → tick handlers | traceId game-init |
| **S2** | **Shard config** : `SERVER_ROLE` + secteur autoritaire par instance | doc deploy multi-instance |
| **S3** | Socket.io Redis adapter (optionnel) | horizontal scale même shard |
| **S4** | Chat module isolé (même ou autre process) | si modération / charge |

Les phases **C*** et **S*** peuvent avancer **en parallèle** tant que `packages/shared` reste la source de vérité des events.

---

## Principe directeur

> **Séparer d'abord le code (modules), séparer les processus seulement quand la charge ou l'équipe l'exigent.**

La refonte client (engine, net) et la modularisation serveur (auth, game, world) vont dans le **même repo**, **même déploiement**, **tests npm** à chaque étape.

---

## Références

- [ARCHITECTURE.md](./ARCHITECTURE.md) — état actuel
- [V2 client détail](../apps/client/src/README.md)
- [QA_WORKFLOW.md](./QA_WORKFLOW.md) — SERVER_ROLE dev/qa/prod
