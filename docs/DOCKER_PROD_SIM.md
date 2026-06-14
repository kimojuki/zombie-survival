# Simulation VM Ubuntu prod (Docker local — même compose que la VM)

**TLS = Cloudflare uniquement.** L'origin (nginx) écoute en **HTTP** — pas de certificat local.

```
Joueur → Cloudflare HTTPS :443 → cloudflared → http://127.0.0.1:443 → **edge** (nginx)
                                                              ├─ static : / index css img
                                                              └─ proxy  : game:3000 (maintenance si down)
                                                              auth:3001 (interne)
                                                              mariadb (interne)
```

**Edge séparé** (`docker-compose.edge.yml`) — le site marketing reste en ligne pendant un rebuild game (pas de 502 Cloudflare).

---

## Démarrage

```bat
copy infra\docker\.env.example infra\docker\.env
npm run docker:sim:up
cloudflared tunnel run zombie-dev
```

Rebuild sans couper le site public :

```bat
npm run docker:sim:restart
```

cloudflared (`~/.cloudflared/config.yml`) :

```yaml
service: http://127.0.0.1:443
originRequest:
  httpHostHeader: survival.badom.ch
```

Jouer : **https://survival.badom.ch/play.html**

---

## Tests locaux (sans Cloudflare)

| Commande | Teste |
|----------|--------|
| `npm run docker:sim:test:443` | nginx :443 (comme cloudflared) |
| `npm run docker:sim:test` | nginx :4000 (port Infomaniak) |

Debug direct : `http://127.0.0.1:4000/play.html`

---

## Persistance

Données sur **disque hôte** (`infra/docker/data/` en dev, `/var/lib/zombie-survival` en VM) :

- `mariadb/` — BDD (joueurs, monde, auth)
- `backups/` — dumps SQL
- `logs/` — logs serveur

| Commande | Rôle |
|----------|------|
| `npm run docker:sim:backup` | Dump SQL → `data/backups/` |
| `npm run docker:sim:down` | Arrêt **sans** toucher aux données |

**Ne jamais** supprimer `data/mariadb/` sans backup.

---

## Commandes

| Commande | Rôle |
|----------|------|
| `npm run docker:sim:edge:up` | Edge nginx seul (:443, :4000) — reste up |
| `npm run docker:sim:up` | Edge + stack app (premier boot) |
| `npm run docker:sim:restart` | Rebuild game/auth **sans** couper edge |
| `npm run docker:sim:down` | Arrêt app/db (edge reste up) |
| `npm run docker:sim:down:all` | Tout arrêter (edge inclus) |
| `npm run docker:sim:backup` | Backup SQL |
| `npm run docker:sim:logs` | Logs |
| `npm run docker:sim:migrate` | Comptes → auth DB |

---

## Dépannage

| Symptôme | Piste |
|----------|-------|
| cloudflared 502 | `docker ps` — **zs-edge-nginx** up ? `npm run docker:sim:edge:up` |
| 502 pendant deploy | Utiliser `docker:sim:restart` au lieu de `down` + `up` |
| Port 443 occupé | autre service Windows (IIS, etc.) |
| Login 401 | `npm run docker:sim:migrate` |
