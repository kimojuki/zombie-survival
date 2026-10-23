# CHUNK 2 : Arsenal Offensif (Armes de Corps à Corps & Artisanales) - v2

Ce document détaille les spécifications des objets de mêlée et de combat rapproché. L'objectif est d'implémenter les hitboxes d'attaque, la cadence de frappe et la gestion de la durabilité. Aucun système de poids n'est appliqué.

## 2.1 Architecture & Modèle Spécifique (`MeleeWeaponItem`)

Chaque structure hérite de la classe `BaseItem`. Toutes les armes de cette catégorie ont un `max_stack` strict de 1.

### Propriétés supplémentaires pour le Combat Rapproché :
- `int degats_impact` : Points de dégâts physiques appliqués à la cible lors d'un coup réussi.
- `float portee_metre` : Longueur de la hitbox d'attaque depuis la position de l'avatar.
- `float cadence_attaque` : Temps d'attente (cooldown) imposé entre deux attaques en secondes.
- `float durabilite_max` : Total des points de structure de l'arme.
- `float durabilite_actuelle` : Points actuels. L'arme s'use à chaque impact réussi. À 0, elle perd son efficacité ou se brise.

---

## 2.2 Liste des Objets : ARMES - CORPS À CORPS (Réf: image_0.png)

### [wpn_couteau] Couteau
- **Description** : Lame courte en acier, idéale pour le dépeçage rapide ou les attaques furtives à très courte portée.
- **Spécifications** :
  - `degats_impact` : 15
  - `portee_metre` : 0.8m
  - `cadence_attaque` : 0.4s (Très rapide)
  - `durabilite_max` : 100

### [wpn_hache_combat] Hache
- **Description** : Hache de combat lourde conçue pour fracasser les armures et fendre les lignes ennemies.
- **Spécifications** :
  - `degats_impact` : 35
  - `portee_metre` : 1.3m
  - `cadence_attaque` : 0.9s (Lent)
  - `durabilite_max` : 150

### [wpn_barre_fer] Barre de Fer
- **Description** : Un morceau de fer à béton plein. Brut, lourd et virtuellement indestructible.
- **Spécifications** :
  - `degats_impact` : 22
  - `portee_metre` : 1.4m
  - `cadence_attaque` : 1.1s (Très lent)
  - `durabilite_max` : 300 (Haute résistance)

### [wpn_machette] Machette
- **Description** : Longue lame de jungle combinant une excellente vitesse d'exécution avec de lourds dégâts tranchants.
- **Spécifications** :
  - `degats_impact` : 28
  - `portee_metre` : 1.2m
  - `cadence_attaque` : 0.6s (Équilibré)
  - `durabilite_max` : 120

---

## 2.3 Liste des Objets : ARMES ARTISANALES (Réf: image_0.png)

*Ces armes se fabriquent à partir de ressources de base par le menu de Crafting. Elles sont moins durables.*

### [wpn_lance_artisanale] Lance Artisanale
- **Description** : Un long manche en bois taillé en pointe maintenu par des cordages de fortune. Permet de tenir les menaces à distance.
- **Recette indicative** : `res_bois_brut` x2 + `res_corde` x1
- **Spécifications** :
  - `degats_impact` : 18
  - `portee_metre` : 2.2m (Allonge maximale)
  - `cadence_attaque` : 0.8s
  - `durabilite_max` : 40

### [wpn_batte_cloutee] Batte Cloutée
- **Description** : Batte de sport en bois tendre traversée par une dizaine de clous rouillés. Fléau dévastateur.
- **Recette indicative** : `res_planche` x1 + `res_clous` x10
- **Spécifications** :
  - `degats_impact` : 30
  - `portee_metre` : 1.2m
  - `cadence_attaque` : 0.8s
  - `durabilite_max` : 70