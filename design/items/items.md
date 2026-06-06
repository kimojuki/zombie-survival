# Système de génération de loot

Mettre en place un système de loot dynamique réparti sur l'ensemble de la carte.

## Règles générales

* Tous les items du jeu peuvent apparaître dans n'importe quel bâtiment.
* Cependant, certains types de bâtiments doivent avoir une probabilité plus élevée de générer certains objets spécifiques.
* Le loot doit rester cohérent avec le type du bâtiment sans être totalement exclusif.
* Il ne faut jamais remplir un bâtiment avec trop d'objets afin d'éviter une surcharge de ressources.
* La quantité d'objets générés doit rester raisonnable et varier de manière aléatoire.

## Répartition par type de bâtiment

### Hôpital

Priorité élevée :

* Bandage
* Kit de soin
* Seringue anti-infection

Faible probabilité :

* Nourriture
* Eau
* Outils
* Ressources diverses

### Commissariat / Poste de police

Priorité élevée :

* Pistolet
* Fusil à pompe
* Fusil de chasse
* Munitions de pistolet
* Cartouches de fusil à pompe
* Cartouches de fusil de chasse

Faible probabilité :

* Nourriture
* Eau
* Médicaments
* Ressources diverses

### Maison

Priorité élevée :

* Nourriture
* Eau
* Chiffon
* Petit sac à dos

Probabilité moyenne :

* Bandage
* Outils

Faible probabilité :

* Armes
* Munitions

### Chantier

Priorité élevée :

* Bois brut
* Planche
* Clous
* Ferraille
* Métal
* Marteau
* Hachette

Faible probabilité :

* Nourriture
* Eau

### Garage

Priorité élevée :

* Ferraille
* Métal
* Marteau
* Hachette
* Pioche
* Ruban adhésif

Faible probabilité :

* Nourriture
* Eau
* Médicaments

### Supermarché

Priorité élevée :

* Conserves
* Haricots en boîte
* Soupe en conserve
* Pain
* Fruits
* Eau en bouteille
* Boisson énergisante

Faible probabilité :

* Outils
* Médicaments

## Quantité de loot

Pour chaque bâtiment :

* Minimum : 1 objet
* Maximum : 8 objets

La quantité exacte doit être choisie aléatoirement.

Exemple :

* Petite maison : 1 à 4 objets
* Maison moyenne : 2 à 6 objets
* Grand bâtiment : 4 à 8 objets

## Placement des objets

* Les objets doivent apparaître à des emplacements prédéfinis (points de loot).
* À chaque génération, choisir aléatoirement quels points de loot sont utilisés.
* Tous les points de loot ne doivent pas forcément contenir un objet.
* Éviter que plusieurs objets se chevauchent.
* Quand un object et loot il disparait de son emplacement

## Respawn du loot

* Toutes les 1 heure (3600 secondes), le loot doit être régénéré.
* Lors de la régénération :

  * Recalculer le loot de chaque bâtiment.
  * Générer une nouvelle répartition aléatoire.
* Le système doit garantir que la carte reste continuellement approvisionnée en ressources.

## Objectif

Créer un système de loot simple, performant et cohérent, où :

* chaque bâtiment conserve une identité logique ;
* aucun objet n'est exclusif à un bâtiment ;
* l'exploration reste intéressante ;
* le joueur ne peut pas mémoriser exactement où trouver un objet ;
* les ressources réapparaissent automatiquement toutes les heures.
