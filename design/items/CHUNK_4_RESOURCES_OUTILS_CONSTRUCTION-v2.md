# CHUNK 4 : Extraction & Infrastructures (Ressources, Outils & Structures) - v2

Ce document détaille l'économie des matières premières, les outils indispensables pour l'extraction et l'ensemble du système de construction modulaire (Building Plans). Aucun élément ne possède de valeur de poids.

## 4.1 Architecture & Modèle Spécifique

### Propriétés pour les Outils (`ToolItem`) :
- `string type_recolte` : Type de ressource ciblée (`Bois`, `Pierre`, `Construction`, `Allumage`).
- `float efficacite_recolte` : Multiplicateur d'extraction appliqué aux points de vie des noeuds de ressources du décor.
- `float durabilite_max` : Usure de l'outil à l'usage.

### Propriétés pour les Plans de Construction (`StructureItem`) :
- `Dictionary<string, int> cout_materiaux` : Liste des paires `ID_Ressource : Quantité` requises pour poser l'élément.
- `int points_structure_hp` : Points de vie initiaux du bâtiment une fois construit.
- `bool necessite_snap` : Force l'alignement sur la grille modulaire du jeu.

---

## 4.2 Liste des Objets : RESSOURCES (Réf: image_0.png)
*Objets purs d'artisanat. Max Stack standard : 100.*

1. **[res_bois_brut] Bois Brut** : Troncs bruts. Max Stack : 200.
2. **[res_planche] Planche** : Bois d'œuvre équarri pour le bâtiment. Max Stack : 200.
3. **[res_ferraille] Ferraille** : Composants métalliques recyclables variés.
4. **[res_metal] Métal** : Lingot de métal raffiné et structurel.
5. **[res_clous] Clous** : Essentiels pour l'assemblage de structures en bois. Max Stack : 500.
6. **[res_ruban_adhesif] Ruban Adhésif** : Adhésif renforcé. Max Stack : 50.
7. **[res_chiffon] Chiffon** : Morceau de tissu propre.
8. **[res_corde] Corde** : Corde en fibre tressée hautement résistante. Max Stack : 50.

---

## 4.3 Liste des Objets : OUTILS (Réf: image_0.png)

### [tool_marteau] Marteau
- **Description** : Outil indispensable pour valider, construire et réparer les éléments de structure du campement.
- **Spécifications** : `type_recolte` : `Construction` | `durabilite_max` : 200

### [tool_hachette] Hachette
- **Description** : Petit outil tranchant optimisé pour abattre les arbres et en extraire le maximum de bois. Double usage comme arme légère.
- **Spécifications** : `type_recolte` : `Bois` | `efficacite_recolte` : 2.5 | `durabilite_max` : 120

### [tool_pioche] Pioche
- **Description** : Outil lourd en acier trempé forgé pour miner les gisements de pierre, de ferraille ou briser du béton.
- **Spécifications** : `type_recolte` : `Pierre` | `efficacite_recolte` : 3.0 | `durabilite_max` : 150

### [tool_torche] Briquet
- **Description** : Source d'allumage portable. Parfait pour éclairé.
- **Spécifications** : `type_recolte` : `Allumage` | `durabilite_max` : illimité

---

## 4.4 Éléments de Structure : CONSTRUCTION (Réf: image_1.png)
*L'usage de ces objets déclenche un hologramme de prévisualisation au sol.*

### [struct_mur_bois] Mur en Bois
- **Description** : Un pan de mur vertical en planches épaisses servant de cloison.
- **Points de Structure** : 500 HP | `necessite_snap` : true
- **Coût de Fabrication** : `res_planche` x6 + `res_clous` x12

### [struct_porte_bois] Porte en Bois
- **Description** : Porte simple montée sur charnières de récupération avec loquet interactif (Ouvrir/Fermer).
- **Points de Structure** : 350 HP | `necessite_snap` : true
- **Coût de Fabrication** : `res_planche` x4 + `res_clous` x8 + `res_ferraille` x2

### [struct_grande_porte_bois] Grande Porte en Bois
- **Description** : Double porte massive idéale pour barricader de larges accès ou faire entrer un véhicule.
- **Points de Structure** : 800 HP | `necessite_snap` : true
- **Coût de Fabrication** : `res_planche` x10 + `res_clous` x20 + `res_ferraille` x4

### [struct_plancher_bois] Plancher en Bois
- **Description** : Panneau horizontal servant de base saine pour les fondations au sol ou de plafond pour bâtir un étage supérieur.
- **Points de Structure** : 400 HP | `necessite_snap` : true
- **Coût de Fabrication** : `res_planche` x5 + `res_clous` x10

### [struct_escalier_bois] Escalier en Bois
- **Description** : Module de marches inclinées permettant de circuler de manière fluide entre les étages d'une base.
- **Points de Structure** : 400 HP | `necessite_snap` : true
- **Coût de Fabrication** : `res_planche` x8 + `res_clous` x16



<div class="sketchfab-embed-wrapper"> <iframe title="Simple Apocalypse - Guns" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/7aaab1f082134a7b9ab92c481204a9d4/embed"> </iframe> <p style="font-size: 13px; font-weight: normal; margin: 5px; color: #4A4A4A;"> <a href="https://sketchfab.com/3d-models/simple-apocalypse-guns-7aaab1f082134a7b9ab92c481204a9d4?utm_medium=embed&utm_campaign=share-popup&utm_content=7aaab1f082134a7b9ab92c481204a9d4" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;"> Simple Apocalypse - Guns </a> by <a href="https://sketchfab.com/syntystudios?utm_medium=embed&utm_campaign=share-popup&utm_content=7aaab1f082134a7b9ab92c481204a9d4" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;"> Synty Studios </a> on <a href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=7aaab1f082134a7b9ab92c481204a9d4" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;">Sketchfab</a></p></div>


<div class="sketchfab-embed-wrapper"> <iframe title="Simple Apocalypse - Props" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/28f3ce22a10e4ea49b72c38c04187a61/embed"> </iframe> <p style="font-size: 13px; font-weight: normal; margin: 5px; color: #4A4A4A;"> <a href="https://sketchfab.com/3d-models/simple-apocalypse-props-28f3ce22a10e4ea49b72c38c04187a61?utm_medium=embed&utm_campaign=share-popup&utm_content=28f3ce22a10e4ea49b72c38c04187a61" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;"> Simple Apocalypse - Props </a> by <a href="https://sketchfab.com/syntystudios?utm_medium=embed&utm_campaign=share-popup&utm_content=28f3ce22a10e4ea49b72c38c04187a61" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;"> Synty Studios </a> on <a href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=28f3ce22a10e4ea49b72c38c04187a61" target="_blank" rel="nofollow" style="font-weight: bold; color: #1CAAD9;">Sketchfab</a></p></div>