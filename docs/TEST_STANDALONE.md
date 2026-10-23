# Tests — mode auth standalone (Phase B)

Tu n’as **pas** à toucher au code. Suis ces étapes dans l’ordre.

---

## Test 1 — Mode normal (embedded) ✅

Déjà validé : guest + intro sur http://localhost:3000/play.html

---

## Test 2 — Mode standalone (auth séparé)

### Démarrer

1. **Arrêter** les serveurs : raccourci **« ZS - Arrêter serveurs »**
2. **Démarrer** : raccourci **« ZS - Démarrer (+ auth) »**  
   → 3 fenêtres : **Auth :3001**, **Game :3000 [standalone]**, **Vite :5173**
3. Attendre ~10 s, puis **« ZS - Statut serveurs »** : Auth et Game doivent être OK

### Vérification auto (optionnel)

Dans un terminal à la racine du projet :

```bat
npm run test:auth-standalone
```

Tu dois voir : `OK guest → handoff → JWT game → /me`

### Vérification manuelle (navigateur)

1. **Ctrl+F5** sur http://localhost:3000/play.html
2. **Jouer en invité**
3. Vérifier :
   - URL passe par `game.html?handoff=…` (un instant)
   - Puis `game.html` sans paramètre
   - **Intro réveil** sur la plage
   - Jeu normal (mouvement, pas d’erreur console F12)

4. (Optionnel) Déconnexion → **Connexion** avec un compte existant (ex. Bruno)  
   → même flux handoff si le compte est migré en auth DB

### Si ça échoue

- Copie le message d’erreur (écran play ou F12 → Console)
- Ou le résultat de `npm run test:auth-standalone`
- Envoie à l’équipe dev

### Revenir au mode normal

1. **Arrêter** serveurs
2. **« ZS - Démarrer serveurs »** (sans + auth)  
   → mode **embedded**, comme aujourd’hui en prod

---

## Test 3 — Migration comptes (Phase D) ✅

Appliqué localement le 2026-06-14 (320 comptes). Login compte existant (`Bruno`) validé en standalone.

Pour reproduire sur une autre machine :

```bat
npm run backup:pre-deploy
npm run migrate:accounts-to-auth
npm run migrate:accounts-to-auth -- --apply
```

Puis retester login d’un compte existant en mode standalone (username **sensible à la casse**, ex. `Bruno`).

---

## Récap

| Test | Toi | Résultat attendu |
|------|-----|-------------------|
| 1 embedded | ✅ fait | guest + intro |
| 2 standalone | ✅ fait | guest + handoff + intro + login compte |
| 3 migration | ✅ fait (local) | login compte existant |

Index technique : [ROADMAP_PLANS.md](./ROADMAP_PLANS.md) · [apps/auth-server/README.md](../apps/auth-server/README.md)
