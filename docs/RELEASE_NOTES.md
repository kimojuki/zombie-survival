# Notes de version — Zombie Survival

Notes **joueurs** et **équipe** pour chaque release. Une entrée par déploiement sur `master` (prod / preview) ou annonce notable sur `survival.badom.ch`.

**Règle d'or** : aucune release sans vérification persistance — voir [RELEASE_PROCESS.md](./RELEASE_PROCESS.md).

Format version client : `YYYYMMDD-slug` dans [`client-version.json`](../apps/client/public/client-version.json).

---

## En cours (non publié)

_Aucune entrée — prochaine release à documenter avant merge `dev → master`._

---

## 2026-06-13 — Mode invité & inscription

**Version client** : `20260613-guest-auth-play`  
**Serveur** : monolithe `:3000` (embedded auth)

### Pour les joueurs

- **Créer un compte** : onglet « Créer un compte » sur `/play.html` (QA/prod).
- **Jouer en invité** : pseudo automatique `Invite_XXXX`, sans mot de passe.
- **Sauvegarde invité** : progression conservée après ~8 minutes de jeu ; quitte avant → essai effacé.
- **Créer mon compte** (en jeu) : menu ☰ pour convertir un invité engagé en compte complet.
- **Early access** : mention « en cours de développement » sur la landing et le portail.

### Équipe / correctifs

- Landing responsive (mobile / tablette / PC).
- Persistance déconnect : snapshot inventaire + survie au `disconnect`.
- Auth-server Phase A (interne `:3001`) — pas encore activé en prod publique.

### Données joueurs

- Migration DB additive : colonnes `is_guest`, `guest_committed` sur `players` (pas de reset monde).
- Comptes existants : inchangés.

---

## 2026-06-08 — Intro plage v3 & S01

**Version client** : voir commit `0f4ac7e` / builds juin 2026

### Pour les joueurs

- Intro plage : réveil, exploration, tutoriel combat caillou, torche, zone feu.
- Secteur forêt S01 : routes, cabane, rivière, safe zones.

### Données joueurs

- Pas de wipe ; migrations inventaire à la connexion (`ensureSlotGrid`).

---

## Modèle d'entrée (copier pour la prochaine release)

```markdown
## YYYY-MM-DD — Titre court

**Version client** : `YYYYMMDD-slug`
**Commit** : `abc1234` (optionnel)

### Pour les joueurs
- …

### Équipe / correctifs
- …

### Données joueurs
- Migration : … / Aucune / Backup obligatoire avant deploy
- Risque perte progression : aucun / mitigé par …
```

---

Index : [CHANGELOG.md](../CHANGELOG.md) (technique) · [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) · [DEPLOY.md](./DEPLOY.md)
