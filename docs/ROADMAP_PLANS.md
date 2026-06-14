# Roadmap — plans actifs (Zombie Survival)

Document **unique** de référence. Les anciens plans Cursor obsolètes ou terminés ont été retirés (juin 2026).

Index : [V2_REFONTE_STRATEGY.md](./V2_REFONTE_STRATEGY.md) · [V2_CLIENT_MIGRATION.md](./V2_CLIENT_MIGRATION.md) · [DEV_TRACKER.md](../DEV_TRACKER.md)

---

## En cours / prochain

### 1. Serveur Auth séparé (multi-shard)

**Objectif** : DB comptes/sessions sur processus auth **interne** ; front public inchangé sur **:3000** (`survival.badom.ch`).

```
survival.badom.ch → Cloudflare → :3000 (landing + play + game + socket)
                                      └─ proxy /api/auth/* → 127.0.0.1:3001 (auth-server)
```

| Étape | Statut | Détail |
|-------|--------|--------|
| Phase 0 — play register + invité | **Fait** | Onglets Invité / Connexion / Inscription ; guest sur monolithe :3000 |
| A — `apps/auth-server` + auth DB | **Fait** | Service interne :3001, sessions + handoff |
| B — handoff + proxy auth | **Fait** (code) | Valider : [TEST_STANDALONE.md](./TEST_STANDALONE.md) |
| C — front reste sur :3000 | **Fait** | Pas de portail séparé |
| D — split DB accounts | **Fait (local)** | `npm run migrate:accounts-to-auth` |
| E — deploy VM Docker | **Cible prod** | [VM_DEPLOY.md](./VM_DEPLOY.md) · `infra/docker/` |
| E legacy — pm2 Infomaniak | Déprécié | `infra/ecosystem.config.cjs` (preview ancienne) |
| **Docker prod sim** | **Fait** | mono-VM · split db/app : [ARCHITECTURE_TIERS.md](./ARCHITECTURE_TIERS.md) |
| G — VM db séparée | **Prêt** | `docker-compose.db.yml` + `docker-compose.app.yml` |

Détail technique : voir sections « Migration serveur Auth » dans l’historique des sessions DEV_TRACKER (2026-06-13).

### 2. Client v2 — moteur & net

| Phase | Statut | Fichier cible |
|-------|--------|---------------|
| E0 engine (scheduler, telemetry) | **Fait** | `apps/client/src/engine/` |
| E1 WorldContentLoader + BudgetGovernor | **Fait** | `world-content-loader.js`, `design/RESOURCE_LOADING.md` |
| E2 BudgetGovernor gates + drainDecorRing | **Fait** | `decor-pressure.js`, `network/chunks/` |
| E3 SpatialChunkStreamer 64 m (forêt/plage) | **Fait** | `spatial-chunk-streamer.js` |
| E4 Routes chunkées 64 m | **Fait** | `road_network/chunks/09-road-chunks.js` |
| E5 Workers IO hors main thread | À faire | `src/net/` |
| E3 boot phases unifiées | À faire | init-vis, spawnReady |
| E4 traceId game-init serveur | À faire | logs structurés |
| E5 TypeScript engine/shared | Backlog | — |

### 3. Serveur monolithe modulaire (avant multi-process)

| Module | Statut |
|--------|--------|
| `inventory-ops`, `world-persist`, socket events partiels | Fait |
| Extraire `auth/` (routes guest/register restent en embedded jusqu’à Phase A auth) | Partiel |
| Extraire `game/` connect → game-init | À faire |
| `AUTH_MODE=embedded` par défaut | Recommandé |

---

## Backlog gameplay / monde

| Sujet | Priorité | Notes |
|-------|----------|-------|
| **World polish** — routes épousent relief, trottoirs, fondations bâtiments | P2 | Plan `world_polish_pass` ; ne pas aplatir massivement |
| **Rig joueur 3e personne** — squelette unifié FPS/TPS | P3 | Remplacer bras FPS isolé (`refonte_rig_joueur`) |
| **Scénario plage v2** — silhouette + zombie tutoriel scripté | P3 | Intro actuelle = beats/tutoriel ; pas le scénario 3 actes complet |
| **Chat / Redis / shard S02** | P4 | Quand métriques > 30–50 joueurs/nœud |

---

## Terminé (archivé — ne plus rouvrir en plan Cursor)

- Restructuration studio (Vite, CI, apps/packages)
- Migration serveur autoritaire (inventaire, survie, craft, combat)
- Réseau routier unique (`road_network.js`, S01–S05)
- S01 forêt complète (POI, rivière, safe zones, micro-déco sentier)
- Palmiers plage, prefabs, regen
- Landing SEO + responsive + early access + guest auth play
- Refactor bras FPS (grips, anim engine)

---

## Plans supprimés (autre projet / hors repo)

Les plans Cursor suivants **ne concernaient pas** ce dépôt (jeu worms/rogue 2D) et ont été supprimés du dossier Cursor :

`rogue_concept_paper`, `audit_dégâts_multijoueur`, `bot_pathfinding_*`, `planification_bots_pro`, `refonte_ia_bots*`, `optimisation_performances_jeu`, `système_de_chapeaux`, `terrain_et_grottes`.
