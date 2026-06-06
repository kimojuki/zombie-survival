# CHUNK 3 : Puissance de Feu & Logistique (Armes à Feu, Munitions & Équipement) - v2

Ce document détaille les spécifications des armes à distance, de la gestion des munitions et de l'armure/sacs à dos du joueur. L'économie repose entièrement sur un système d'emplacements (slots) d'inventaire sans notion de poids.

## 3.1 Architecture & Modèle Spécifique

### Propriétés pour les Armes à Feu (`FirearmItem`) :
- `string type_munition_accepte` : ID de la munition compatible.
- `int capacite_chargeur` : Capacité interne maximale en balles.
- `int degats_par_balle` : Dégâts appliqués au point d'impact du projectile.
- `float temps_rechargement` : Durée totale de l'animation de recharge (bloque l'utilisation).
- `float dispersion_balle` : Coefficient d'écartement (bloom/recul).
*Note: max_stack est fixé à 1 pour toutes les armes à feu.*

### Propriétés pour l'Équipement & Armures (`EquipmentItem`) :
- `string slot_equipement` : Zone d'ancrage (`Tête`, `Torso`, `Mains`, `Dos`).
- `int slots_inventaire_bonus` : Emplacements additionnels (slots nets) fournis à l'inventaire général (Sacs uniquement).
- `int valeur_armure` : Valeur brute réduisant les dégâts physiques reçus.

---

## 3.2 Liste des Objets : ARMES À FEU (Réf: image_0.png)

### [wpn_pistolet] Pistolet
- **Description** : Arme de poing semi-automatique fiable à courte et moyenne portée. Recul modéré.
- **Spécifications** :
  - `type_munition_accepte` : `ammo_pistolet`
  - `capacite_chargeur` : 12
  - `degats_par_balle` : 25
  - `temps_rechargement` : 2.0s
  - `dispersion_balle` : 0.15

### [wpn_fusil_pompe] Fusil à Pompe
- **Description** : Arme de calibre 12 dévastatrice à bout portant. Projette une dispersion de 8 plombs simultanés.
- **Spécifications** :
  - `type_munition_accepte` : `ammo_fusil_pompe`
  - `capacite_chargeur` : 6
  - `degats_par_balle` : 12 (Multiplié par 8 projectiles indépendants)
  - `temps_rechargement` : 4.0s (Recharge cartouche par cartouche progressive)
  - `dispersion_balle` : 0.85 (Très large)

### [wpn_fusil_chasse] Fusil de Chasse
- **Description** : Fusil à verrou à canon long. Précision chirurgicale et portée extrême. Cadence de tir faible.
- **Spécifications** :
  - `type_munition_accepte` : `ammo_fusil_chasse`
  - `capacite_chargeur` : 5
  - `degats_par_balle` : 75 (Dégâts critiques mortels)
  - `temps_rechargement` : 3.0s
  - `dispersion_balle` : 0.01 (Quasiment parfait)

---

## 3.3 Liste des Objets : MUNITIONS (Réf: image_0.png)

### [ammo_pistolet] Munitions de Pistolet
- **Description** : Balles de calibre standard chemisées cuivre pour pistolet semi-automatique.
- **Max Stack** : 50

### [ammo_fusil_pompe] Cartouches de Fusil à Pompe
- **Description** : Cartouches de calibre 12 chargées de forte chevrotine.
- **Max Stack** : 24

### [ammo_fusil_chasse] Cartouches de Fusil de Chasse
- **Description** : Munitions de gros calibre de chasse offrant un pouvoir d'arrêt massif.
- **Max Stack** : 20

---

## 3.4 Liste des Objets : ÉQUIPEMENT (Réf: image_0.png)

### SACS À DOS (Système de Slots)
*Ces objets s'équipent sur le slot 'Dos' et étendent l'inventaire en lui rajoutant directement de nouveaux slots de stockage utilisables.*

- **[eq_petit_sac] Petit Sac à Dos**
  - Description : Sac à dos civil léger et compact.
  - Spécifications : `slots_inventaire_bonus` : +8 slots
- **[eq_sac_moyen] Sac à Dos Moyen**
  - Description : Sac polyvalent de type randonnée intermédiaire, bon compromis.
  - Spécifications : `slots_inventaire_bonus` : +16 slots
- **[eq_grand_sac] Grand Sac à Dos**
  - Description : Grand sac à dos militaire renforcé avec sangles de soutien externes.
  - Spécifications : `slots_inventaire_bonus` : +24 slots

### PROTECTION
*Ces objets absorbent passivement une partie des dégâts infligés au joueur.*

- **[eq_casque] Casque**
  - Slot : `Tête`
  - `valeur_armure` : 20
- **[eq_gilet_protection] Gilet de Protection**
  - Slot : `Torso`
  - `valeur_armure` : 40
- **[eq_gants] Gants**
  - Slot : `Mains`
  - `valeur_armure` : 5 (Protège aussi des coupures lors de la collecte)