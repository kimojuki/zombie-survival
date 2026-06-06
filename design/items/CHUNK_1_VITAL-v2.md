# CHUNK 1 : Système Vital (Nourriture & Médical) - v2

Ce document détaille les spécifications des objets liés aux besoins primaires du joueur. L'objectif est d'implémenter la boucle de survie de base (Faim, Soif, Santé). Le système ne gère aucun poids pour les objets.

## 1.1 Architecture & Modèle Spécifique (`FoodItem` & `MedicalItem`)

Chaque structure de données de cette section hérite de la classe ou structure globale `BaseItem`.

### Propriétés supplémentaires pour la Nourriture :
- `int apport_faim` : Valeur restaurée (0 à 100).
- `int apport_soif` : Valeur restaurée (0 à 100).
- `float bonus_endurance` : Quantité d'endurance immédiatement récupérée.
- `float ratio_maladie` : Probabilité (0.0 à 1.0) d'infliger une intoxication ou infection gastrique si consommé brut.

### Propriétés supplémentaires pour le Médical :
- `int soin_sante` : Points de vie restaurés.
- `bool stoppe_saignement` : Stoppe immédiatement l'état altéré d'hémorragie.
- `bool guerit_infection` : Élimine les infections ou intoxications.
- `float temps_utilisation` : Délai d'activation requis en secondes (vitesse d'utilisation).

---

## 1.2 Liste des Objets : NOURRITURE (Réf: image_0.png)

### [food_eau_bouteille] Eau en Bouteille
- **Description** : Bouteille de plastique contenant de l'eau claire et purifiée.
- **Max Stack** : 10
- **Spécifications** :
  - `apport_soif` : 45
  - `apport_faim` : 0
  - `bonus_endurance` : 0.0
  - `ratio_maladie` : 0.0

### [food_boisson_energisante] Boisson Énergisante
- **Description** : Canette sucrée enrichie en taurine et caféine. Redonne un coup de fouet immédiat.
- **Max Stack** : 15
- **Spécifications** :
  - `apport_soif` : 20
  - `apport_faim` : 0
  - `bonus_endurance` : 40.0
  - `ratio_maladie` : 0.0

### [food_conserves] Conserves
- **Description** : Boîte métallique de ration générique. Contenu compact et salé.
- **Max Stack** : 20
- **Spécifications** :
  - `apport_soif` : -5
  - `apport_faim` : 30
  - `bonus_endurance` : 0.0
  - `ratio_maladie` : 0.0

### [food_haricots_boite] Haricots en Boîte
- **Description** : Grand classique du survivant. Riche en protéines, texture lourde.
- **Max Stack** : 20
- **Spécifications** :
  - `apport_soif` : -10
  - `apport_faim` : 40
  - `bonus_endurance` : 0.0
  - `ratio_maladie` : 0.0

### [food_soupe_conserve] Soupe en Conserve
- **Description** : Un bouillon tiède de légumes non identifiés. Hydrate tout en nourrissant.
- **Max Stack** : 20
- **Spécifications** :
  - `apport_soif` : 25
  - `apport_faim` : 20
  - `bonus_endurance` : 5.0
  - `ratio_maladie` : 0.0

### [food_pain] Pain
- **Description** : Une miche de pain un peu rassis mais encore parfaitement comestible.
- **Max Stack** : 5
- **Spécifications** :
  - `apport_soif` : -5
  - `apport_faim` : 25
  - `bonus_endurance` : 0.0
  - `ratio_maladie` : 0.0

### [food_fruits] Fruits
- **Description** : Une pomme rouge fraîchement cueillie. Source naturelle de vitamines. Périssable.
- **Max Stack** : 10
- **Spécifications** :
  - `apport_soif` : 10
  - `apport_faim` : 15
  - `bonus_endurance` : 10.0
  - `ratio_maladie` : 0.0

### [food_viande_crue] Viande Crue
- **Description** : Lambeau de chair prélevé sur une carcasse animale. Dangereux à consommer ainsi.
- **Max Stack** : 5
- **Spécifications** :
  - `apport_soif` : 0
  - `apport_faim` : 15
  - `bonus_endurance` : 0.0
  - `ratio_maladie` : 0.75 (Risque élevé d'infection)

### [food_viande_cuite] Viande Cuite
- **Description** : Un steak tendre grillé au feu de camp. Sûr, sain et hautement nutritif.
- **Max Stack** : 5
- **Spécifications** :
  - `apport_soif` : 0
  - `apport_faim` : 50
  - `bonus_endurance` : 15.0
  - `ratio_maladie` : 0.0

---

## 1.3 Liste des Objets : MÉDICAL (Réf: image_0.png)

### [med_bandage] Bandage
- **Description** : Bande de tissu propre pour compresser les plaies ouvertes et stopper les hémorragies.
- **Max Stack** : 5
- **Spécifications** :
  - `soin_sante` : 15
  - `stoppe_saignement` : true
  - `guerit_infection` : false
  - `temps_utilisation` : 3.0s

### [med_kit_soin] Kit de Soin
- **Description** : Trousse médicale d'urgence complète contenant des sutures, antiseptiques et antalgiques.
- **Max Stack** : 2
- **Spécifications** :
  - `soin_sante` : 75
  - `stoppe_saignement` : true
  - `guerit_infection` : false
  - `temps_utilisation` : 6.0s

### [med_seringue_anti_infection] Seringue Anti-infection
- **Description** : Antidote injectable puissant contre les virus et infections bactériennes du monde extérieur.
- **Max Stack** : 3
- **Spécifications** :
  - `soin_sante` : 5
  - `stoppe_saignement` : false
  - `guerit_infection` : true
  - `temps_utilisation` : 1.5s