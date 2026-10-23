# Workflow IA — conception par questionnaire

Document pour **Bruno**, **Georges** et toute personne qui pilote le projet via une IA (Cursor, etc.).

## Règle principale

Quand l’IA a un **doute de design** (gameplay, UX, priorité, trade-off multijoueur, etc.) :

1. **Ne pas improviser** une solution longue.
2. Poser un **questionnaire à choix multiples** (une décision par questionnaire, ou un petit lot cohérent).
3. Chaque question doit proposer **3 à 5 options** claires + **« Autre — je précise »**.
4. Après la réponse : si tout est clair → **implémenter ou documenter** ; sinon → **nouveau questionnaire** sur le point restant.
5. Quand une décision est validée : la noter dans `DEV_TRACKER.md` (section datée) et, si durable, dans `design/` ou la doc technique concernée.

## Quand utiliser ce mode

| Mode | Usage |
|------|--------|
| **Questionnaire** | Choix de design, priorisation, « quelle brique d’abord », contraintes multijoueur, ton RP, scope d’une feature |
| **Implémentation directe** | Spec déjà validée, bug évident, refactor demandé explicitement, suite d’un questionnaire déjà tranché |

## Format attendu (côté IA)

- Titre court du sujet (ex. « Inventaire de départ — multijoueur »).
- Contexte en **2–4 phrases** (pas de pavé).
- Options en **français**, orientées décision (pas de jargon technique inutile).
- Option finale : **« Autre — je précise dans le chat »**.
- Après réponse : résumer la décision en une ligne avant de coder.

## Fichiers à mettre à jour après validation

| Fichier | Quand |
|---------|--------|
| `DEV_TRACKER.md` | Toujours |
| `design/…` | Intention gameplay / parcours joueur |
| `docs/ARCHITECTURE.md` | Contrat client/serveur nouveau |
| `CLAUDE.md` / `CONTRIBUTING.md` | Renvoi vers ce doc si besoin |

## Exemple de chaîne (intro plage)

1. Questionnaire : comment donner le caillou / la torche sans loot monde partagé ?
2. Réponse validée → spec courte dans `design/secteur/START_FOREST.md` ou tracker.
3. Questionnaire suivant : texte du réveil v1 ou jalons `explore` ?
4. Implémentation brique par brique.

## Références

- Parcours spawn : `design/secteur/START_FOREST.md`
- Scénario : `packages/shared/src/scenario-beach.mjs`
- Props plage : `packages/shared/src/beach-prop-placements.mjs`
