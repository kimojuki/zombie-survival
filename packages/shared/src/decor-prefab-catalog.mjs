/**
 * Catalogue prefabs décor — IDs découverts automatiquement depuis le client ;
 * métadonnées enrichies ici (optionnel) + labels client via registerDecorPrefab.
 */

import {
  DEFAULT_CLIENT_JS_DIR,
  discoverDecorPrefabIds,
} from './decor-prefab-discover.mjs';
import {
  formatDecorOrientationLong,
  formatDecorOrientationShort,
  getDecorPrefabOrientation,
} from './decor-prefab-orientation.mjs';

/** @typedef {{ id: string, category: string, label: string, desc: string, rcon: string, notes?: string, auto?: boolean, orientation?: string, orientationDetail?: string, orientationDocumented?: boolean }} DecorPrefabEntry */

/** Métadonnées manuelles optionnelles (prioritaires sur l’inférence auto). */
/** @type {Record<string, Omit<DecorPrefabEntry, 'id' | 'auto'>>} */
export const DECOR_PREFAB_META = {
  spawn_campfire: { category: 'camp', label: 'Feu de camp', desc: 'Feu de camp procédural (décor spawn).', rcon: 'decoradd prefab spawn_campfire here' },
  spawn_log_pile: { category: 'camp', label: 'Tas de bûches', desc: 'Pile de rondins décorative.', rcon: 'decoradd prefab spawn_log_pile here' },
  spawn_border_log: { category: 'camp', label: 'Rondin de lisière', desc: 'Rondin horizontal — scale ≈ longueur / 0,42 m.', rcon: 'decoradd prefab spawn_border_log here 0 2', notes: 'Ajuster le scale (ex. 2) pour la longueur.' },
  spawn_supply_crate: { category: 'camp', label: 'Caisse de ravitaillement', desc: 'Caisse texturée (décor camp).', rcon: 'decoradd prefab spawn_supply_crate here' },
  spawn_marker_left: { category: 'camp', label: 'Poteau marqueur (gauche)', desc: 'Poteau de balisage côté gauche.', rcon: 'decoradd prefab spawn_marker_left here' },
  spawn_marker_right: { category: 'camp', label: 'Poteau marqueur (droite)', desc: 'Poteau de balisage côté droit.', rcon: 'decoradd prefab spawn_marker_right here' },
  spawn_bedroll: { category: 'camp', label: 'Sac de couchage', desc: 'Sac de couchage déroulé (repos E) — pas un lit.', rcon: 'decoradd prefab spawn_bedroll here', notes: 'Camp spawn ; cabane S01 utilise spawn_single_bed.' },
  spawn_single_bed: { category: 'camp', label: 'Lit une place', desc: 'Lit simple bois + matelas (repos E).', rcon: 'decoradd prefab spawn_single_bed here', notes: 'Cabane S01 seed s01:cabin01:bed.' },
  spawn_cabin_table: { category: 'camp', label: 'Table de cabane', desc: 'Table rustique bois (~1,15 × 0,70 m) pour intérieur cabane.', rcon: 'decoradd prefab spawn_cabin_table here', notes: 'Devant −Z (assiette) · dos +Z. Voir docs/DECOR_PREFAB_ORIENTATION.md.' },
  spawn_cabin_chair: { category: 'camp', label: 'Chaise de cabane', desc: 'Chaise bois rustique (~0,42 m) — assortie à la table cabane.', rcon: 'decoradd prefab spawn_cabin_chair here', notes: 'Devant −Z (assise) · dossier +Z. Face à la table.' },
  spawn_cabin_shelf: { category: 'camp', label: 'Étagère cabane', desc: 'Étagère bois 3 niveaux (~0,78 m) — dos contre mur (+Z).', rcon: 'decoradd prefab spawn_cabin_shelf here', notes: 'Face ouverte −Z · fond lattes +Z contre mur.' },
  spawn_cabin_stove: { category: 'camp', label: 'Poêle à bois cabane', desc: 'Poêle fonte rustique (~0,52 m) + conduit — porte vitrée −Z.', rcon: 'decoradd prefab spawn_cabin_stove here', notes: 'Porte −Z · conduit +Z vers mur. Voir DECOR_PREFAB_ORIENTATION.md.' },
  spawn_cabin_lantern: { category: 'camp', label: 'Lanterne suspendue cabane', desc: 'Lanterne à chaîne (~2,30 m) — flamme animée, lumière chaude intérieur.', rcon: 'decoradd prefab spawn_cabin_lantern here', notes: 'Pivot sol · crochet plafond · face vitrée −Z. Centre pièce ou au-dessus table.' },
  spawn_cabin_wood_box: { category: 'camp', label: 'Caisse à bûches cabane', desc: 'Bac bois + bûches empilées + hache (~0,50 m) — alimentation poêle.', rcon: 'decoradd prefab spawn_cabin_wood_box here', notes: 'Face ouverte −Z · dos +Z contre mur · près du poêle.' },
  spawn_cabin_rug: { category: 'camp', label: 'Tapis cabane', desc: 'Tapis tissé laine (~0,96 × 0,62 m) — bordure et franges, bande décor −Z.', rcon: 'decoradd prefab spawn_cabin_rug here', notes: 'Tête / bande −Z vers table ou porte · quasi symétrique.' },
  spawn_cabin_bench: { category: 'camp', label: 'Banc mural cabane', desc: 'Banc fixé au mur ~1,02 m — assise 3 planches, cubby chaussures, couverture.', rcon: 'decoradd prefab spawn_cabin_bench here', notes: 'Assise −Z · dossier incliné +Z · cleat + boulons visibles.' },
  spawn_cabin_basin: { category: 'camp', label: 'Lavabo cabane', desc: 'Meuble bois ~0,46 m — cuvette porcelaine encastrée, robinet fer, cruche, seau, miroir.', rcon: 'decoradd prefab spawn_cabin_basin here', notes: 'Face −Z · dos +Z contre mur · eau = disque plat (pas de transparence).' },
  spawn_cabin_wall_clock: { category: 'camp', label: 'Horloge murale cabane', desc: 'Pendule rustique ~0,28 m — aiguilles synchronisées sur l\'heure du jeu (worldTime).', rcon: 'decoradd prefab spawn_cabin_wall_clock here', notes: 'Face cadran −Z · dos +Z au mur · heure = cycle jour/nuit serveur.' },
  spawn_cabin_coat_rack: { category: 'camp', label: 'Porte-manteau cabane', desc: 'Planche murale + 4 patères — veste, casquette, écharpe.', rcon: 'decoradd prefab spawn_cabin_coat_rack here', notes: 'Dos +Z au mur près porte · patères −Z.' },
  spawn_beach_wreck_debris: { category: 'plage', label: 'Débris de naufrage', desc: 'Planches, corde, filet et coin de caisse — scène rivage ~1,0 m.', rcon: 'decoradd prefab spawn_beach_wreck_debris here', notes: 'Seed auto spawn : decorseed beach · semi-enfoui (groundLift).' },
  spawn_beach_washed_gear: { category: 'plage', label: 'Affaires échouées', desc: 'Sac mouillé, gourde, sandale et casquette — trace personnelle ~0,65 m.', rcon: 'decoradd prefab spawn_beach_washed_gear here', notes: 'Seed auto spawn : decorseed beach · léger enfouissement sable.' },
  spawn_beach_driftwood: { category: 'plage', label: 'Bois flotté', desc: 'Rondin échoué ~1,4 m + branche — repère naturel vers le sentier.', rcon: 'decoradd prefab spawn_beach_driftwood here', notes: 'Seed auto : bouche sentier · axe ouest · semi-enfoui.' },
  spawn_beach_footprint_trail: { category: 'plage', label: 'Piste empreintes intro', desc: 'Traînée d\'empreintes + corde — piste monde intro v3.', rcon: '—', notes: 'Seed beach_intro_v3 · monde unique' },
  spawn_beach_message_bottle: { category: 'plage', label: 'Bouteille message K.', desc: 'Bouteille échouée lisible — indice intro v3.', rcon: '—', notes: 'signKind intro_bottle_k · seed beach_intro_v3' },
  spawn_beach_campfire_ring: { category: 'plage', label: 'Cercle de feu intro', desc: 'Cercle de pierres + cendres — repère veilleuse intro.', rcon: '—', notes: 'Seed beach_intro_v3' },
  spawn_beach_pier_wreck: { category: 'plage', label: 'Ponton cassé intro', desc: 'Charpente de jetée brisée — valise en dessous.', rcon: '—', notes: 'Seed beach_intro_v3' },
  spawn_beach_burnt_note: { category: 'plage', label: 'Note brûlée K.', desc: 'Mot carbonisé lisible — spawn personnel beat feu.', rcon: '—', notes: 'signKind intro_burnt_note_k · ownerPlayerId' },
  spawn_beach_starter_torch: { category: 'plage', label: 'Torche intro plage', desc: 'Torche allumée plantée dans le sable — tutoriel intro personnel.', rcon: '—', notes: 'Spawn auto intro joueur · ownerPlayerId' },
  spawn_beach_starter_suitcase: { category: 'plage', label: 'Valise intro plage', desc: 'Valise échouée lootable (eau + sandwich) — tutoriel conteneur.', rcon: '—', notes: 'Spawn auto intro joueur · ownerPlayerId' },
  spawn_backpack: { category: 'camp', label: 'Sac à dos', desc: 'Sac posé au sol.', rcon: 'decoradd prefab spawn_backpack here' },
  spawn_lean_to: { category: 'camp', label: 'Abri de fortune', desc: 'Lean-to / abri incliné.', rcon: 'decoradd prefab spawn_lean_to here' },
  spawn_stump_seat: { category: 'camp', label: 'Souche siège', desc: 'Souche tronçonnée pour s’asseoir.', rcon: 'decoradd prefab spawn_stump_seat here' },
  spawn_drink_set: { category: 'camp', label: 'Set boissons', desc: 'Bouteilles / verres décoratifs.', rcon: 'decoradd prefab spawn_drink_set here' },
  spawn_lantern: { category: 'camp', label: 'Lanterne', desc: 'Lanterne posée.', rcon: 'decoradd prefab spawn_lantern here' },
  spawn_stone: { category: 'camp', label: 'Pierre (petite)', desc: 'Caillou décoratif spawn.', rcon: 'decoradd prefab spawn_stone here' },
  spawn_flat_stone: { category: 'camp', label: 'Pierre plate', desc: 'Dalle / pierre plate au sol.', rcon: 'decoradd prefab spawn_flat_stone here' },
  spawn_workbench: { category: 'camp', label: 'Établi', desc: 'Établi de craft décoratif.', rcon: 'decoradd prefab spawn_workbench here' },
  rock_boulder: { category: 'rocher', label: 'Bloc rocheux', desc: 'Gros rocher procédural (monde).', rcon: 'decoradd prefab rock_boulder here', notes: 'Seed : decorseed rocks' },
  rock_outcrop: { category: 'rocher', label: 'Affleurement', desc: 'Affleurement rocheux bas.', rcon: 'decoradd prefab rock_outcrop here', notes: 'Seed : decorseed rocks' },
  storage_chest: { category: 'stockage', label: 'Coffre', desc: 'Coffre interactif — E pour déposer / reprendre des items.', rcon: 'decoradd prefab storage_chest here', notes: '27 emplacements, 3 coups pour casser.' },
  build_wall_wood: { category: 'construction', label: 'Mur bois', desc: 'Mur de base (3×2,6 m).', rcon: 'decoradd prefab build_wall_wood here' },
  build_doorway_wood: { category: 'construction', label: 'Embrasure porte', desc: 'Mur avec ouverture porte standard (1,8 m).', rcon: 'decoradd prefab build_doorway_wood here' },
  build_large_doorway_wood: { category: 'construction', label: 'Embrasure grande porte', desc: 'Mur avec ouverture grande porte (2,4 m).', rcon: 'decoradd prefab build_large_doorway_wood here' },
  build_floor_wood: { category: 'construction', label: 'Plancher bois', desc: 'Dalle de sol 3×3 m.', rcon: 'decoradd prefab build_floor_wood here' },
  build_ceiling_wood: { category: 'construction', label: 'Plafond bois', desc: 'Plafond 3×3 m.', rcon: 'decoradd prefab build_ceiling_wood here' },
  build_stair_wood: { category: 'construction', label: 'Escalier bois', desc: 'Escalier montant 2,6 m.', rcon: 'decoradd prefab build_stair_wood here' },
  build_door_wood: { category: 'construction', label: 'Porte bois', desc: 'Porte battante standard.', rcon: 'decoradd prefab build_door_wood here' },
  build_large_door_wood: { category: 'construction', label: 'Grande porte bois', desc: 'Porte double / large.', rcon: 'decoradd prefab build_large_door_wood here' },
  building_survivor_shack: { category: 'batiment', label: 'Cabane survivant', desc: 'Cabane S01 avec porte, intérieur et toit.', rcon: 'decoradd prefab building_survivor_shack here 0 1', notes: 'Sans x/z = 8 m devant vous ; rotY scale optionnels.' },
  smallcity_house_a: { category: 'batiment', label: 'Maison petite ville A', desc: 'Maison S02 — salon, chambre, SdB, fenêtres, porte.', rcon: 'decoradd prefab smallcity_house_a here 0 1' },
  smallcity_house_b: { category: 'batiment', label: 'Maison petite ville B', desc: 'Variante maison S02.', rcon: 'decoradd prefab smallcity_house_b here 0 1' },
  tree_oak: { category: 'arbre', label: 'Chêne', desc: 'Arbre feuillu — récoltable (bois), croissance progressive.', rcon: 'decoradd prefab tree_oak here', notes: 'Seed : decorseed trees' },
  tree_pine: { category: 'arbre', label: 'Pin', desc: 'Conifère récoltable.', rcon: 'decoradd prefab tree_pine here', notes: 'Seed : decorseed trees' },
  tree_birch: { category: 'arbre', label: 'Bouleau', desc: 'Bouleau récoltable.', rcon: 'decoradd prefab tree_birch here', notes: 'Seed : decorseed trees' },
  tree_dead: { category: 'arbre', label: 'Arbre mort', desc: 'Arbre mort / tronc sec.', rcon: 'decoradd prefab tree_dead here', notes: 'Seed : decorseed trees' },
  tree_palm: { category: 'arbre', label: 'Palmier', desc: 'Palmier plage — récoltable.', rcon: 'decoradd prefab tree_palm here', notes: 'Seed : decorseed palms' },
  wreck_sedan: { category: 'epave', label: 'Épave berline', desc: 'Carrosserie berline abandonnée.', rcon: 'decoradd prefab wreck_sedan here 0 1 rust 0.15 2', notes: 'Variants : rust, olive, navy, beige, burnt — puis tilt, roues, sink.' },
  wreck_pickup: { category: 'epave', label: 'Épave pick-up', desc: 'Pick-up épave routière.', rcon: 'decoradd prefab wreck_pickup here 0 1 rust 0.1 2', notes: 'Seed : decorseed wrecks' },
  road_barrier_post: { category: 'route', label: 'Poteau barrière', desc: 'Poteau de barrière routière.', rcon: 'decoradd prefab road_barrier_post here', notes: 'Seed : decorseed barriers' },
  road_barrier_rail: { category: 'route', label: 'Rail barrière', desc: 'Rail horizontal de barrière.', rcon: 'decoradd prefab road_barrier_rail here', notes: 'Seed : decorseed barriers' },
  sign_beach_exit: { category: 'signalisation', label: 'Panneau sortie plage', desc: 'Panneau directionnel sortie du sentier plage.', rcon: 'decoradd prefab sign_beach_exit here', notes: 'Seed : decorseed signs' },
  beach_exit_torch: { category: 'signalisation', label: 'Torche sortie plage', desc: 'Torche à côté du panneau de sortie.', rcon: 'decoradd prefab beach_exit_torch here', notes: 'Seed : decorseed signs' },
  sign_sector_gate: { category: 'signalisation', label: 'Panneau portail secteur', desc: 'Panneau au portail / checkpoint secteur.', rcon: 'decoradd prefab sign_sector_gate here' },
  s01_gas_station: { category: 's01', label: 'Station-service S01', desc: 'Station-service procédurale secteur 01.', rcon: 'decoradd prefab s01_gas_station here 0 1' },
  s01_military_tent: { category: 's01', label: 'Tente militaire S01', desc: 'Tente militaire checkpoint / camp S01.', rcon: 'decoradd prefab s01_military_tent here 0 1' },
  spawn_urban_trash_bin: { category: 'ville', label: 'Poubelle urbaine', desc: 'Bac métal ~0,72 m — trottoir.', rcon: 'decoradd prefab spawn_urban_trash_bin here' },
  spawn_urban_bench: { category: 'ville', label: 'Banc public', desc: 'Banc bois / fer ~1,05 m.', rcon: 'decoradd prefab spawn_urban_bench here' },
  spawn_urban_street_lamp: { category: 'ville', label: 'Lampadaire', desc: 'Poteau ~3,1 m + lumière — rue.', rcon: 'decoradd prefab spawn_urban_street_lamp here' },
  spawn_urban_fire_hydrant: { category: 'ville', label: 'Borne incendie', desc: 'Hydrant rouge ~0,75 m.', rcon: 'decoradd prefab spawn_urban_fire_hydrant here' },
  spawn_urban_mailbox: { category: 'ville', label: 'Boîte aux lettres', desc: 'Poteau + boîte ~1,2 m.', rcon: 'decoradd prefab spawn_urban_mailbox here' },
  spawn_urban_bicycle_rack: { category: 'ville', label: 'Arceaux vélos', desc: 'Rail ~1,35 m.', rcon: 'decoradd prefab spawn_urban_bicycle_rack here' },
  spawn_urban_traffic_cone: { category: 'ville', label: 'Cône signalisation', desc: 'Cône orange ~0,42 m.', rcon: 'decoradd prefab spawn_urban_traffic_cone here' },
  spawn_urban_dumpster: { category: 'ville', label: 'Benne ordures', desc: 'Container ~1,65 m — ruelle.', rcon: 'decoradd prefab spawn_urban_dumpster here' },
  spawn_urban_pallet_stack: { category: 'ville', label: 'Palettes + cartons', desc: '2 palettes EUR + cartons + film — ~0,78 m.', rcon: 'decoradd prefab spawn_urban_pallet_stack here' },
  spawn_urban_barrel: { category: 'ville', label: 'Fût métal', desc: 'Baril ~0,82 m.', rcon: 'decoradd prefab spawn_urban_barrel here' },
  spawn_urban_fence_panel: { category: 'ville', label: 'Panneau clôture', desc: 'Grillage ~1,8 m.', rcon: 'decoradd prefab spawn_urban_fence_panel here' },
  spawn_urban_bollard: { category: 'ville', label: 'Borne anti-voiture', desc: 'Poteau béton ~0,85 m.', rcon: 'decoradd prefab spawn_urban_bollard here' },
  spawn_urban_planter: { category: 'ville', label: 'Jardinière urbaine', desc: 'Bac + plante ~0,85 m.', rcon: 'decoradd prefab spawn_urban_planter here' },
  spawn_prop_fridge: { category: 'ville', label: 'Réfrigérateur', desc: 'Frigo usé ~1,62 m — intérieur.', rcon: 'decoradd prefab spawn_prop_fridge here' },
  spawn_prop_grocery_shelf: { category: 'ville', label: 'Rayon épicerie', desc: 'Étagère métal ~1,72 m.', rcon: 'decoradd prefab spawn_prop_grocery_shelf here' },
  spawn_prop_shop_counter: { category: 'ville', label: 'Comptoir magasin', desc: 'Comptoir L ~1,6 m — caisse, vitre, tiroir.', rcon: 'decoradd prefab spawn_prop_shop_counter here' },
  spawn_prop_sofa: { category: 'ville', label: 'Canapé usé', desc: 'Canapé 3 places ~1,82 m — tissu, coussins, usure.', rcon: 'decoradd prefab spawn_prop_sofa here' },
  spawn_urban_stop_sign: { category: 'ville', label: 'Panneau STOP', desc: 'Octogone rouge ~2,1 m.', rcon: 'decoradd prefab spawn_urban_stop_sign here' },
  spawn_urban_newspaper_box: { category: 'ville', label: 'Borne journaux', desc: 'Distributeur presse ~0,72 m.', rcon: 'decoradd prefab spawn_urban_newspaper_box here' },
  spawn_urban_shopping_cart: { category: 'ville', label: 'Chariot courses', desc: 'Caddie métal ~1,1 m.', rcon: 'decoradd prefab spawn_urban_shopping_cart here' },
  spawn_urban_vending_machine: { category: 'ville', label: 'Distributeur boissons', desc: 'Automate ~1,72 m.', rcon: 'decoradd prefab spawn_urban_vending_machine here' },
  spawn_urban_police_barrier: { category: 'ville', label: 'Barrière police', desc: 'Barrière jaune/noir ~1,05 m.', rcon: 'decoradd prefab spawn_urban_police_barrier here' },
  spawn_urban_road_sign: { category: 'ville', label: 'Panneau directionnel', desc: 'Flèche bleue ~2,4 m.', rcon: 'decoradd prefab spawn_urban_road_sign here' },
  spawn_urban_propane_tank: { category: 'ville', label: 'Bouteille propane', desc: 'Bonbonne ~1,0 m.', rcon: 'decoradd prefab spawn_urban_propane_tank here' },
  spawn_urban_tire_stack: { category: 'ville', label: 'Pile de pneus', desc: '3 pneus ~0,65 m.', rcon: 'decoradd prefab spawn_urban_tire_stack here' },
  spawn_urban_wheelbarrow: { category: 'ville', label: 'Brouette', desc: 'Brouette ~0,75 m.', rcon: 'decoradd prefab spawn_urban_wheelbarrow here' },
  spawn_urban_abandoned_bike: { category: 'ville', label: 'Vélo abandonné', desc: 'Vélo renversé ~1,0 m.', rcon: 'decoradd prefab spawn_urban_abandoned_bike here' },
  spawn_prop_office_desk: { category: 'ville', label: 'Bureau', desc: 'Bureau + écran ~1,22 m.', rcon: 'decoradd prefab spawn_prop_office_desk here' },
  spawn_prop_office_chair: { category: 'ville', label: 'Chaise de bureau', desc: 'Fauteuil roulettes ~0,92 m.', rcon: 'decoradd prefab spawn_prop_office_chair here' },
  spawn_prop_wardrobe: { category: 'ville', label: 'Armoire', desc: 'Armoire 2 portes ~1,92 m.', rcon: 'decoradd prefab spawn_prop_wardrobe here' },
  spawn_prop_kitchen_table: { category: 'ville', label: 'Table cuisine', desc: 'Table carrée ~0,92 m.', rcon: 'decoradd prefab spawn_prop_kitchen_table here' },
  spawn_prop_kitchen_chair: { category: 'ville', label: 'Chaise cuisine', desc: 'Chaise bois ~0,90 m.', rcon: 'decoradd prefab spawn_prop_kitchen_chair here' },
  spawn_prop_bookshelf: { category: 'ville', label: 'Bibliothèque', desc: 'Étagère livres ~1,52 m.', rcon: 'decoradd prefab spawn_prop_bookshelf here' },
  spawn_prop_tv_old: { category: 'ville', label: 'Vieille télévision', desc: 'TV CRT ~0,78 m.', rcon: 'decoradd prefab spawn_prop_tv_old here' },
  spawn_prop_washing_machine: { category: 'ville', label: 'Lave-linge', desc: 'Lave-linge ~0,82 m.', rcon: 'decoradd prefab spawn_prop_washing_machine here' },
  spawn_prop_metal_shelf: { category: 'ville', label: 'Étagère métal', desc: 'Rayonnage entrepôt ~1,82 m.', rcon: 'decoradd prefab spawn_prop_metal_shelf here' },
  spawn_prop_workbench: { category: 'ville', label: 'Établi garage', desc: 'Établi + étau ~1,48 m.', rcon: 'decoradd prefab spawn_prop_workbench here' },
  spawn_prop_double_bed: { category: 'ville', label: 'Lit double', desc: 'Lit 2 places ~1,92 m.', rcon: 'decoradd prefab spawn_prop_double_bed here' },
  spawn_prop_nightstand: { category: 'ville', label: 'Table de chevet', desc: 'Chevet + lampe ~0,72 m.', rcon: 'decoradd prefab spawn_prop_nightstand here' },
  spawn_prop_dresser: { category: 'ville', label: 'Commode', desc: 'Commode 3 tiroirs ~0,82 m.', rcon: 'decoradd prefab spawn_prop_dresser here' },
  spawn_prop_microwave: { category: 'ville', label: 'Micro-ondes', desc: 'Micro-ondes ~0,28 m.', rcon: 'decoradd prefab spawn_prop_microwave here' },
  spawn_prop_stove: { category: 'ville', label: 'Cuisinière', desc: 'Four + 4 feux ~0,88 m.', rcon: 'decoradd prefab spawn_prop_stove here' },
  spawn_prop_kitchen_sink: { category: 'ville', label: 'Évier cuisine', desc: 'Meuble évier ~0,82 m.', rcon: 'decoradd prefab spawn_prop_kitchen_sink here' },
  spawn_prop_floor_lamp: { category: 'ville', label: 'Lampadaire sol', desc: 'Lampadaire ~1,55 m.', rcon: 'decoradd prefab spawn_prop_floor_lamp here' },
  spawn_prop_rug_urban: { category: 'ville', label: 'Tapis salon', desc: 'Tapis ~1,62 × 1,08 m.', rcon: 'decoradd prefab spawn_prop_rug_urban here' },
  spawn_urban_atm: { category: 'ville', label: 'Distributeur ATM', desc: 'ATM ~1,52 m.', rcon: 'decoradd prefab spawn_urban_atm here' },
  spawn_urban_phone_booth: { category: 'ville', label: 'Cabine téléphone', desc: 'Cabine rouge ~2,1 m.', rcon: 'decoradd prefab spawn_urban_phone_booth here' },
  spawn_urban_picnic_table: { category: 'ville', label: 'Table pique-nique', desc: 'Table + bancs ~1,52 m.', rcon: 'decoradd prefab spawn_urban_picnic_table here' },
  spawn_urban_trash_pile: { category: 'ville', label: 'Tas de déchets', desc: 'Sacs + cartons ~0,4 m.', rcon: 'decoradd prefab spawn_urban_trash_pile here' },
  spawn_urban_wood_crate: { category: 'ville', label: 'Caisse bois', desc: 'Caisse ~0,62 m.', rcon: 'decoradd prefab spawn_urban_wood_crate here' },
  spawn_urban_generator: { category: 'ville', label: 'Groupe électrogène', desc: 'Générateur ~0,62 m.', rcon: 'decoradd prefab spawn_urban_generator here' },
  spawn_urban_fuel_cans: { category: 'ville', label: 'Jerricans', desc: '3 jerricans ~0,34 m.', rcon: 'decoradd prefab spawn_urban_fuel_cans here' },
  spawn_urban_bbq_grill: { category: 'ville', label: 'Barbecue', desc: 'BBQ ~0,88 m.', rcon: 'decoradd prefab spawn_urban_bbq_grill here' },
  spawn_urban_tool_cabinet: { category: 'ville', label: 'Armoire à outils', desc: 'Armoire rouge ~0,92 m.', rcon: 'decoradd prefab spawn_urban_tool_cabinet here' },
  spawn_prop_bathtub: { category: 'ville', label: 'Baignoire', desc: 'Baignoire ~1,52 m.', rcon: 'decoradd prefab spawn_prop_bathtub here' },
  spawn_urban_bus_shelter: { category: 'ville', label: 'Abri bus', desc: 'Abri ~2,2 m.', rcon: 'decoradd prefab spawn_urban_bus_shelter here' },
  spawn_urban_window_ac: { category: 'ville', label: 'Clim fenêtre', desc: 'Unité AC ~0,48 m.', rcon: 'decoradd prefab spawn_urban_window_ac here' },
  spawn_prop_toilet: { category: 'ville', label: 'WC', desc: 'Toilettes ~0,72 m.', rcon: 'decoradd prefab spawn_prop_toilet here' },
  spawn_prop_bathroom_sink: { category: 'ville', label: 'Lavabo', desc: 'Lavabo colonne ~1,06 m.', rcon: 'decoradd prefab spawn_prop_bathroom_sink here' },
  spawn_prop_coffee_table: { category: 'ville', label: 'Table basse', desc: 'Table basse ~0,92 m.', rcon: 'decoradd prefab spawn_prop_coffee_table here' },
  spawn_prop_dining_table: { category: 'ville', label: 'Table à manger', desc: 'Table ~1,52 m.', rcon: 'decoradd prefab spawn_prop_dining_table here' },
  spawn_prop_bunk_bed: { category: 'ville', label: 'Lit superposé', desc: '2 niveaux ~1,42 m.', rcon: 'decoradd prefab spawn_prop_bunk_bed here' },
  spawn_prop_filing_cabinet: { category: 'ville', label: 'Classeur bureau', desc: 'Armoire tiroirs ~1,22 m.', rcon: 'decoradd prefab spawn_prop_filing_cabinet here' },
  spawn_prop_safe: { category: 'ville', label: 'Coffre-fort', desc: 'Coffre ~0,58 m.', rcon: 'decoradd prefab spawn_prop_safe here' },
  spawn_urban_gas_pump: { category: 'ville', label: 'Pompe à essence', desc: 'Distributeur ~1,66 m.', rcon: 'decoradd prefab spawn_urban_gas_pump here' },
  spawn_urban_parking_meter: { category: 'ville', label: 'Parcmètre', desc: 'Horodateur ~1,32 m.', rcon: 'decoradd prefab spawn_urban_parking_meter here' },
  spawn_urban_street_clock: { category: 'ville', label: 'Horloge de rue', desc: 'Poteau + cadran ~2,72 m.', rcon: 'decoradd prefab spawn_urban_street_clock here' },
  spawn_urban_fire_extinguisher: { category: 'ville', label: 'Extincteur', desc: 'Extincteur mural ~0,78 m.', rcon: 'decoradd prefab spawn_urban_fire_extinguisher here' },
  spawn_prop_water_cooler: { category: 'ville', label: 'Fontaine à eau', desc: 'Distributeur ~1,28 m.', rcon: 'decoradd prefab spawn_prop_water_cooler here' },
  spawn_prop_office_printer: { category: 'ville', label: 'Imprimante', desc: 'Imprimante ~0,38 m.', rcon: 'decoradd prefab spawn_prop_office_printer here' },
  spawn_urban_satellite_dish: { category: 'ville', label: 'Parabole', desc: 'Antenne ~2,0 m.', rcon: 'decoradd prefab spawn_urban_satellite_dish here' },
  spawn_prop_mattress_floor: { category: 'ville', label: 'Matelas au sol', desc: 'Matelas ~1,72 m.', rcon: 'decoradd prefab spawn_prop_mattress_floor here' },
  spawn_urban_beer_crate: { category: 'ville', label: 'Cageot bières', desc: '6 bouteilles ~0,28 m.', rcon: 'decoradd prefab spawn_urban_beer_crate here' },
  spawn_prop_coat_rack_urban: { category: 'ville', label: 'Porte-manteau', desc: 'Poteau + veste ~1,65 m.', rcon: 'decoradd prefab spawn_prop_coat_rack_urban here' },
  spawn_urban_pallet_single: { category: 'ville', label: 'Palette EUR', desc: 'Palette seule ~0,15 m.', rcon: 'decoradd prefab spawn_urban_pallet_single here' },
  spawn_prop_medicine_cabinet: { category: 'ville', label: 'Armoire pharmacie', desc: 'Miroir SDB ~0,62 m.', rcon: 'decoradd prefab spawn_prop_medicine_cabinet here' },
  spawn_urban_cardboard_box: { category: 'ville', label: 'Carton seul', desc: 'Carton rubané ~0,38 m.', rcon: 'decoradd prefab spawn_urban_cardboard_box here' },
  spawn_prop_dryer: { category: 'ville', label: 'Sèche-linge', desc: 'Sèche-linge ~0,82 m.', rcon: 'decoradd prefab spawn_prop_dryer here' },
  spawn_prop_radiator: { category: 'ville', label: 'Radiateur', desc: 'Radiateur fonte ~0,52 m.', rcon: 'decoradd prefab spawn_prop_radiator here' },
  spawn_prop_floor_fan: { category: 'ville', label: 'Ventilateur pied', desc: 'Ventilateur ~0,95 m.', rcon: 'decoradd prefab spawn_prop_floor_fan here' },
  spawn_prop_dishwasher: { category: 'ville', label: 'Lave-vaisselle', desc: 'LV ~0,82 m.', rcon: 'decoradd prefab spawn_prop_dishwasher here' },
  spawn_prop_ironing_board: { category: 'ville', label: 'Planche à repasser', desc: 'Planche ~1,12 m.', rcon: 'decoradd prefab spawn_prop_ironing_board here' },
  spawn_prop_wall_mirror: { category: 'ville', label: 'Miroir mural', desc: 'Miroir ~0,82 m.', rcon: 'decoradd prefab spawn_prop_wall_mirror here' },
  spawn_prop_shower_stall: { category: 'ville', label: 'Cabine douche', desc: 'Douche ~1,92 m.', rcon: 'decoradd prefab spawn_prop_shower_stall here' },
  spawn_urban_urinal: { category: 'ville', label: 'Urinoir', desc: 'Urinoir ~1,04 m.', rcon: 'decoradd prefab spawn_urban_urinal here' },
  spawn_urban_locker: { category: 'ville', label: 'Casiers vestiaire', desc: '3 casiers ~1,52 m.', rcon: 'decoradd prefab spawn_urban_locker here' },
  spawn_prop_school_desk: { category: 'ville', label: 'Pupitre école', desc: 'Bureau + siège ~0,72 m.', rcon: 'decoradd prefab spawn_prop_school_desk here' },
  spawn_urban_jersey_barrier: { category: 'ville', label: 'Borne Jersey', desc: 'Barrière béton ~1,42 m.', rcon: 'decoradd prefab spawn_urban_jersey_barrier here' },
  spawn_urban_hand_truck: { category: 'ville', label: 'Diable', desc: 'Diable ~1,08 m.', rcon: 'decoradd prefab spawn_urban_hand_truck here' },
  spawn_urban_shopping_basket: { category: 'ville', label: 'Panier courses', desc: 'Panier ~0,38 m.', rcon: 'decoradd prefab spawn_urban_shopping_basket here' },
  spawn_urban_snack_machine: { category: 'ville', label: 'Distributeur snacks', desc: 'Automate ~1,52 m.', rcon: 'decoradd prefab spawn_urban_snack_machine here' },
  spawn_prop_barber_chair: { category: 'ville', label: 'Fauteuil barbier', desc: 'Fauteuil ~0,92 m.', rcon: 'decoradd prefab spawn_prop_barber_chair here' },
  spawn_urban_clothesline: { category: 'ville', label: 'Étendoir linge', desc: 'Corde ~2,2 m.', rcon: 'decoradd prefab spawn_urban_clothesline here' },
  spawn_prop_sun_lounger: { category: 'ville', label: 'Transat', desc: 'Chaise longue ~1,62 m.', rcon: 'decoradd prefab spawn_prop_sun_lounger here' },
  spawn_urban_patio_umbrella: { category: 'ville', label: 'Parasol terrasse', desc: 'Parasol ~2,1 m.', rcon: 'decoradd prefab spawn_urban_patio_umbrella here' },
  spawn_prop_upright_piano: { category: 'ville', label: 'Piano droit', desc: 'Piano ~1,22 m.', rcon: 'decoradd prefab spawn_prop_upright_piano here' },
  spawn_urban_manhole: { category: 'ville', label: 'Regard égout', desc: 'Plaque ~0,76 m.', rcon: 'decoradd prefab spawn_urban_manhole here' },
  spawn_prop_chest_freezer: { category: 'ville', label: 'Congélateur coffre', desc: 'Coffre ~0,76 m.', rcon: 'decoradd prefab spawn_prop_chest_freezer here' },
  spawn_prop_kitchen_cabinet: { category: 'ville', label: 'Meuble haut cuisine', desc: 'Armoire ~0,72 m.', rcon: 'decoradd prefab spawn_prop_kitchen_cabinet here' },
  spawn_prop_indoor_trash: { category: 'ville', label: 'Poubelle intérieure', desc: 'Poubelle ~0,45 m.', rcon: 'decoradd prefab spawn_prop_indoor_trash here' },
  spawn_urban_speed_bump: { category: 'ville', label: 'Dos d\'âne', desc: 'Ralentisseur ~2,8 m.', rcon: 'decoradd prefab spawn_urban_speed_bump here' },
  spawn_urban_fence_post: { category: 'ville', label: 'Poteau clôture', desc: 'Poteau ~1,45 m.', rcon: 'decoradd prefab spawn_urban_fence_post here' },
  spawn_urban_store_awning: { category: 'ville', label: 'Auvent magasin', desc: 'Marquise ~2,2 m.', rcon: 'decoradd prefab spawn_urban_store_awning here' },
  spawn_prop_baby_crib: { category: 'ville', label: 'Lit bébé', desc: 'Berceau ~1,12 m.', rcon: 'decoradd prefab spawn_prop_baby_crib here' },
  spawn_prop_wheelchair: { category: 'ville', label: 'Fauteuil roulant', desc: 'Fauteuil ~0,92 m.', rcon: 'decoradd prefab spawn_prop_wheelchair here' },
  spawn_prop_hospital_bed: { category: 'ville', label: 'Lit d\'hôpital', desc: 'Lit médical ~0,92 m.', rcon: 'decoradd prefab spawn_prop_hospital_bed here' },
  spawn_prop_gurney: { category: 'ville', label: 'Brancard', desc: 'Brancard ~1,72 m.', rcon: 'decoradd prefab spawn_prop_gurney here' },
  spawn_prop_slot_machine: { category: 'ville', label: 'Machine à sous', desc: 'Bandit ~1,42 m.', rcon: 'decoradd prefab spawn_prop_slot_machine here' },
  spawn_prop_arcade_cabinet: { category: 'ville', label: 'Borne arcade', desc: 'Arcade ~1,52 m.', rcon: 'decoradd prefab spawn_prop_arcade_cabinet here' },
  spawn_prop_desk_lamp: { category: 'ville', label: 'Lampe de bureau', desc: 'Lampe ~0,38 m.', rcon: 'decoradd prefab spawn_prop_desk_lamp here' },
  spawn_prop_space_heater: { category: 'ville', label: 'Radiateur électrique', desc: 'Chauffage ~0,42 m.', rcon: 'decoradd prefab spawn_prop_space_heater here' },
  spawn_urban_mail_drop_box: { category: 'ville', label: 'Boîte dépôt courrier', desc: 'Boîte ~0,52 m.', rcon: 'decoradd prefab spawn_urban_mail_drop_box here' },
  spawn_urban_fire_hose_cabinet: { category: 'ville', label: 'Armoire incendie', desc: 'RIA ~0,72 m.', rcon: 'decoradd prefab spawn_urban_fire_hose_cabinet here' },
  spawn_prop_pool_table: { category: 'ville', label: 'Table de billard', desc: 'Billard ~1,48 m.', rcon: 'decoradd prefab spawn_prop_pool_table here' },
  spawn_prop_treadmill: { category: 'ville', label: 'Tapis de course', desc: 'Treadmill ~1,32 m.', rcon: 'decoradd prefab spawn_prop_treadmill here' },
  spawn_urban_bakery_rack: { category: 'ville', label: 'Étagère boulangerie', desc: 'Présentoir ~1,32 m.', rcon: 'decoradd prefab spawn_urban_bakery_rack here' },
  spawn_prop_clothes_rack: { category: 'ville', label: 'Portant vêtements', desc: 'Râtelier ~1,42 m.', rcon: 'decoradd prefab spawn_prop_clothes_rack here' },
  spawn_prop_hair_dryer: { category: 'ville', label: 'Sèche-cheveux mural', desc: 'Salon ~1,42 m.', rcon: 'decoradd prefab spawn_prop_hair_dryer here' },
  spawn_urban_ev_charger: { category: 'ville', label: 'Borne recharge EV', desc: 'Borne ~0,62 m.', rcon: 'decoradd prefab spawn_urban_ev_charger here' },
  spawn_prop_exercise_bike: { category: 'ville', label: 'Vélo d\'appartement', desc: 'Home trainer ~0,92 m.', rcon: 'decoradd prefab spawn_prop_exercise_bike here' },
  spawn_prop_weight_bench: { category: 'ville', label: 'Banc de musculation', desc: 'Bench ~0,92 m.', rcon: 'decoradd prefab spawn_prop_weight_bench here' },
  spawn_prop_cash_register: { category: 'ville', label: 'Caisse enregistreuse', desc: 'Caisse ~0,32 m.', rcon: 'decoradd prefab spawn_prop_cash_register here' },
  spawn_prop_display_fridge: { category: 'ville', label: 'Frigo vitrine', desc: 'Vitrine ~1,82 m.', rcon: 'decoradd prefab spawn_prop_display_fridge here' },
  spawn_urban_recycling_dumpster: { category: 'ville', label: 'Benne tri sélectif', desc: 'Container ~1,55 m.', rcon: 'decoradd prefab spawn_urban_recycling_dumpster here' },
  spawn_prop_dentist_chair: { category: 'ville', label: 'Fauteuil dentiste', desc: 'Fauteuil ~0,92 m.', rcon: 'decoradd prefab spawn_prop_dentist_chair here' },
  spawn_prop_iv_stand: { category: 'ville', label: 'Pied à perfusion', desc: 'Perfuseur ~1,62 m.', rcon: 'decoradd prefab spawn_prop_iv_stand here' },
  spawn_prop_computer_tower: { category: 'ville', label: 'Tour PC', desc: 'Unité ~0,42 m.', rcon: 'decoradd prefab spawn_prop_computer_tower here' },
  spawn_prop_whiteboard: { category: 'ville', label: 'Tableau blanc', desc: 'Tableau ~1,22 m.', rcon: 'decoradd prefab spawn_prop_whiteboard here' },
  spawn_prop_cork_board: { category: 'ville', label: 'Panneau liège', desc: 'Affichage ~0,82 m.', rcon: 'decoradd prefab spawn_prop_cork_board here' },
  spawn_urban_pay_phone: { category: 'ville', label: 'Téléphone public', desc: 'Combiné ~0,52 m.', rcon: 'decoradd prefab spawn_urban_pay_phone here' },
  spawn_urban_recycle_bin_dual: { category: 'ville', label: 'Poubelle tri 2 flux', desc: 'Bac ~0,52 m.', rcon: 'decoradd prefab spawn_urban_recycle_bin_dual here' },
  spawn_prop_book_stack: { category: 'ville', label: 'Pile de livres', desc: 'Livres ~0,28 m.', rcon: 'decoradd prefab spawn_prop_book_stack here' },
  spawn_prop_wall_tv: { category: 'ville', label: 'TV murale', desc: 'Écran ~1,12 m.', rcon: 'decoradd prefab spawn_prop_wall_tv here' },
  spawn_urban_led_sign: { category: 'ville', label: 'Panneau LED', desc: 'Affichage ~2,6 m.', rcon: 'decoradd prefab spawn_urban_led_sign here' },
  spawn_prop_grandfather_clock: { category: 'ville', label: 'Horloge comtoise', desc: 'Pendule ~1,92 m.', rcon: 'decoradd prefab spawn_prop_grandfather_clock here' },
  spawn_prop_kitchen_island: { category: 'ville', label: 'Îlot cuisine', desc: 'Îlot ~1,22 m.', rcon: 'decoradd prefab spawn_prop_kitchen_island here' },
  spawn_game_dartboard: { category: 'jeux', label: 'Cible fléchettes', desc: 'Cible ~0,48 m.', rcon: 'decoradd prefab spawn_game_dartboard here' },
  spawn_game_foosball: { category: 'jeux', label: 'Baby-foot', desc: 'Table ~1,22 m.', rcon: 'decoradd prefab spawn_game_foosball here' },
  spawn_game_ping_pong: { category: 'jeux', label: 'Table ping-pong', desc: 'Table ~1,52 m.', rcon: 'decoradd prefab spawn_game_ping_pong here' },
  spawn_game_chess_table: { category: 'jeux', label: 'Table échecs', desc: 'Damier ~0,62 m.', rcon: 'decoradd prefab spawn_game_chess_table here' },
  spawn_game_poker_table: { category: 'jeux', label: 'Table poker', desc: 'Table ronde ~1,08 m.', rcon: 'decoradd prefab spawn_game_poker_table here' },
  spawn_game_jenga: { category: 'jeux', label: 'Tour Jenga', desc: 'Blocs ~0,24 m.', rcon: 'decoradd prefab spawn_game_jenga here' },
  spawn_game_pinball: { category: 'jeux', label: 'Flipper', desc: 'Flipper ~1,02 m.', rcon: 'decoradd prefab spawn_game_pinball here' },
  spawn_game_bowling_pins: { category: 'jeux', label: 'Quilles bowling', desc: 'Quilles ~0,72 m.', rcon: 'decoradd prefab spawn_game_bowling_pins here' },
  spawn_game_petanque: { category: 'jeux', label: 'Set pétanque', desc: 'Boules ~0,42 m.', rcon: 'decoradd prefab spawn_game_petanque here' },
  spawn_sport_basketball_hoop: { category: 'sport', label: 'Panier basket', desc: 'Panier ~2,8 m.', rcon: 'decoradd prefab spawn_sport_basketball_hoop here' },
  spawn_sport_soccer_goal: { category: 'sport', label: 'But football', desc: 'But ~2,2 m.', rcon: 'decoradd prefab spawn_sport_soccer_goal here' },
  spawn_sport_punching_bag: { category: 'sport', label: 'Sac de frappe', desc: 'Sac ~1,02 m.', rcon: 'decoradd prefab spawn_sport_punching_bag here' },
  spawn_sport_tennis_net: { category: 'sport', label: 'Filet tennis', desc: 'Filet ~10,4 m.', rcon: 'decoradd prefab spawn_sport_tennis_net here' },
  spawn_sport_golf_bag: { category: 'sport', label: 'Sac de golf', desc: 'Sac ~0,92 m.', rcon: 'decoradd prefab spawn_sport_golf_bag here' },
  spawn_sport_skateboard: { category: 'sport', label: 'Skateboard', desc: 'Planche ~0,72 m.', rcon: 'decoradd prefab spawn_sport_skateboard here' },
  spawn_sport_surfboard: { category: 'sport', label: 'Planche de surf', desc: 'Surf ~1,72 m.', rcon: 'decoradd prefab spawn_sport_surfboard here' },
  spawn_loisir_fishing_rod: { category: 'loisirs', label: 'Poste pêche', desc: 'Canne ~1,42 m.', rcon: 'decoradd prefab spawn_loisir_fishing_rod here' },
  spawn_loisir_camping_tent: { category: 'loisirs', label: 'Tente camping', desc: 'Tente ~1,42 m.', rcon: 'decoradd prefab spawn_loisir_camping_tent here' },
  spawn_loisir_hammock: { category: 'loisirs', label: 'Hamac', desc: 'Hamac ~2,9 m.', rcon: 'decoradd prefab spawn_loisir_hammock here' },
  spawn_loisir_acoustic_guitar: { category: 'loisirs', label: 'Guitare acoustique', desc: 'Guitare ~0,62 m.', rcon: 'decoradd prefab spawn_loisir_acoustic_guitar here' },
  spawn_loisir_playground_slide: { category: 'loisirs', label: 'Toboggan playground', desc: 'Toboggan ~1,82 m.', rcon: 'decoradd prefab spawn_loisir_playground_slide here' },
  spawn_game_shuffleboard: { category: 'jeux', label: 'Table shuffleboard', desc: 'Shuffleboard ~2,82 m.', rcon: 'decoradd prefab spawn_game_shuffleboard here' },
  spawn_game_air_hockey: { category: 'jeux', label: 'Table air hockey', desc: 'Air hockey ~1,42 m.', rcon: 'decoradd prefab spawn_game_air_hockey here' },
  spawn_game_croquet: { category: 'jeux', label: 'Set croquet', desc: 'Croquet ~0,72 m.', rcon: 'decoradd prefab spawn_game_croquet here' },
  spawn_game_horseshoes: { category: 'jeux', label: 'Jeu de fer à cheval', desc: 'Fers ~0,82 m.', rcon: 'decoradd prefab spawn_game_horseshoes here' },
  spawn_sport_volleyball_net: { category: 'sport', label: 'Filet volley', desc: 'Filet ~9,6 m.', rcon: 'decoradd prefab spawn_sport_volleyball_net here' },
  spawn_sport_baseball_set: { category: 'sport', label: 'Batte + balle', desc: 'Baseball ~0,82 m.', rcon: 'decoradd prefab spawn_sport_baseball_set here' },
  spawn_sport_boxing_corner: { category: 'sport', label: 'Coin ring boxe', desc: 'Ring ~1,22 m.', rcon: 'decoradd prefab spawn_sport_boxing_corner here' },
  spawn_sport_hockey_sticks: { category: 'sport', label: 'Crosses hockey', desc: 'Hockey ~0,92 m.', rcon: 'decoradd prefab spawn_sport_hockey_sticks here' },
  spawn_sport_kayak: { category: 'sport', label: 'Kayak', desc: 'Kayak ~2,82 m.', rcon: 'decoradd prefab spawn_sport_kayak here' },
  spawn_sport_mountain_bike: { category: 'sport', label: 'VTT', desc: 'VTT ~0,92 m.', rcon: 'decoradd prefab spawn_sport_mountain_bike here' },
  spawn_loisir_camp_stove: { category: 'loisirs', label: 'Réchaud camping', desc: 'Réchaud ~0,12 m.', rcon: 'decoradd prefab spawn_loisir_camp_stove here' },
  spawn_loisir_cooler: { category: 'loisirs', label: 'Glacière', desc: 'Glacière ~0,52 m.', rcon: 'decoradd prefab spawn_loisir_cooler here' },
  spawn_loisir_folding_chair: { category: 'loisirs', label: 'Chaise pliante', desc: 'Chaise ~0,82 m.', rcon: 'decoradd prefab spawn_loisir_folding_chair here' },
  spawn_loisir_camp_lantern: { category: 'loisirs', label: 'Lanterne camping', desc: 'Lanterne ~0,48 m.', rcon: 'decoradd prefab spawn_loisir_camp_lantern here' },
  spawn_loisir_drum_kit: { category: 'loisirs', label: 'Batterie', desc: 'Batterie ~0,88 m.', rcon: 'decoradd prefab spawn_loisir_drum_kit here' },
  spawn_loisir_keyboard: { category: 'loisirs', label: 'Clavier synthé', desc: 'Clavier ~0,78 m.', rcon: 'decoradd prefab spawn_loisir_keyboard here' },
  spawn_loisir_playground_swing: { category: 'loisirs', label: 'Balançoire', desc: 'Balançoire ~2,2 m.', rcon: 'decoradd prefab spawn_loisir_playground_swing here' },
  spawn_loisir_sandbox: { category: 'loisirs', label: 'Bac à sable', desc: 'Bac ~1,22 m.', rcon: 'decoradd prefab spawn_loisir_sandbox here' },
  spawn_loisir_trampoline: { category: 'loisirs', label: 'Trampoline', desc: 'Trampoline ~1,84 m.', rcon: 'decoradd prefab spawn_loisir_trampoline here' },
  spawn_loisir_canoe: { category: 'loisirs', label: 'Canoë sur rack', desc: 'Canoë ~2,42 m.', rcon: 'decoradd prefab spawn_loisir_canoe here' },
  spawn_game_roulette_table: { category: 'jeux', label: 'Table roulette', desc: 'Roulette ~1,42 m.', rcon: 'decoradd prefab spawn_game_roulette_table here' },
  spawn_game_craps_table: { category: 'jeux', label: 'Table craps', desc: 'Craps ~1,82 m.', rcon: 'decoradd prefab spawn_game_craps_table here' },
  spawn_game_skee_ball: { category: 'jeux', label: 'Skee-ball', desc: 'Skee-ball ~1,42 m.', rcon: 'decoradd prefab spawn_game_skee_ball here' },
  spawn_game_board_game: { category: 'jeux', label: 'Plateau de société', desc: 'Jeu ~0,72 m.', rcon: 'decoradd prefab spawn_game_board_game here' },
  spawn_sport_climbing_wall: { category: 'sport', label: 'Mur d\'escalade', desc: 'Mur ~2,42 m.', rcon: 'decoradd prefab spawn_sport_climbing_wall here' },
  spawn_sport_archery_target: { category: 'sport', label: 'Cible tir à l\'arc', desc: 'Cible ~1,22 m.', rcon: 'decoradd prefab spawn_sport_archery_target here' },
  spawn_sport_ski_set: { category: 'sport', label: 'Skis + bâtons', desc: 'Skis ~1,62 m.', rcon: 'decoradd prefab spawn_sport_ski_set here' },
  spawn_sport_dumbbell_rack: { category: 'sport', label: 'Rack haltères', desc: 'Haltères ~0,82 m.', rcon: 'decoradd prefab spawn_sport_dumbbell_rack here' },
  spawn_sport_badminton_net: { category: 'sport', label: 'Filet badminton', desc: 'Filet ~5,28 m.', rcon: 'decoradd prefab spawn_sport_badminton_net here' },
  spawn_sport_lacrosse_sticks: { category: 'sport', label: 'Crosses lacrosse', desc: 'Lacrosse ~0,92 m.', rcon: 'decoradd prefab spawn_sport_lacrosse_sticks here' },
  spawn_loisir_microphone_stand: { category: 'loisirs', label: 'Pied micro', desc: 'Micro ~1,58 m.', rcon: 'decoradd prefab spawn_loisir_microphone_stand here' },
  spawn_loisir_portable_bbq: { category: 'loisirs', label: 'BBQ portable', desc: 'Grill ~0,64 m.', rcon: 'decoradd prefab spawn_loisir_portable_bbq here' },
  spawn_loisir_picnic_basket: { category: 'loisirs', label: 'Panier picnic', desc: 'Panier ~0,38 m.', rcon: 'decoradd prefab spawn_loisir_picnic_basket here' },
  spawn_loisir_telescope: { category: 'loisirs', label: 'Télescope', desc: 'Télescope ~1,12 m.', rcon: 'decoradd prefab spawn_loisir_telescope here' },
  spawn_loisir_seesaw: { category: 'loisirs', label: 'Balançoire à bascule', desc: 'Bascule ~2,42 m.', rcon: 'decoradd prefab spawn_loisir_seesaw here' },
  spawn_loisir_spinning_playground: { category: 'loisirs', label: 'Manège playground', desc: 'Toupie ~1,44 m.', rcon: 'decoradd prefab spawn_loisir_spinning_playground here' },
  spawn_loisir_camp_table: { category: 'loisirs', label: 'Table camping', desc: 'Table ~0,92 m.', rcon: 'decoradd prefab spawn_loisir_camp_table here' },
  spawn_loisir_sleeping_pad: { category: 'loisirs', label: 'Tapis de sol', desc: 'Matelas ~0,62 m.', rcon: 'decoradd prefab spawn_loisir_sleeping_pad here' },
  spawn_loisir_binoculars_tripod: { category: 'loisirs', label: 'Jumelles sur pied', desc: 'Jumelles ~0,82 m.', rcon: 'decoradd prefab spawn_loisir_binoculars_tripod here' },
  spawn_loisir_ukulele_stand: { category: 'loisirs', label: 'Ukulélé sur pied', desc: 'Ukulélé ~0,52 m.', rcon: 'decoradd prefab spawn_loisir_ukulele_stand here' },
  spawn_game_ring_toss: { category: 'jeux', label: 'Jeu des anneaux', desc: 'Anneaux ~0,58 m.', rcon: 'decoradd prefab spawn_game_ring_toss here' },
  spawn_game_lawn_darts: { category: 'jeux', label: 'Fléchettes lawn', desc: 'Lawn darts ~0,48 m.', rcon: 'decoradd prefab spawn_game_lawn_darts here' },
  spawn_game_kubb: { category: 'jeux', label: 'Set kubb', desc: 'Kubb ~0,72 m.', rcon: 'decoradd prefab spawn_game_kubb here' },
  spawn_game_marbles: { category: 'jeux', label: 'Cercle billes', desc: 'Billes ~0,56 m.', rcon: 'decoradd prefab spawn_game_marbles here' },
  spawn_sport_disc_golf_basket: { category: 'sport', label: 'Panier disc golf', desc: 'Disc golf ~1,22 m.', rcon: 'decoradd prefab spawn_sport_disc_golf_basket here' },
  spawn_sport_yoga_mat: { category: 'sport', label: 'Tapis yoga', desc: 'Yoga ~0,58 m.', rcon: 'decoradd prefab spawn_sport_yoga_mat here' },
  spawn_sport_pull_up_bar: { category: 'sport', label: 'Barre traction', desc: 'Traction ~2,02 m.', rcon: 'decoradd prefab spawn_sport_pull_up_bar here' },
  spawn_sport_boxing_gloves: { category: 'sport', label: 'Gants de boxe', desc: 'Gants ~1,42 m.', rcon: 'decoradd prefab spawn_sport_boxing_gloves here' },
  spawn_sport_curling_stones: { category: 'sport', label: 'Pierres curling', desc: 'Curling ~0,24 m.', rcon: 'decoradd prefab spawn_sport_curling_stones here' },
  spawn_sport_football_pad: { category: 'sport', label: 'Tackle dummy', desc: 'Mannequin ~0,82 m.', rcon: 'decoradd prefab spawn_sport_football_pad here' },
  spawn_loisir_beach_chair: { category: 'loisirs', label: 'Chaise de plage', desc: 'Chaise ~0,72 m.', rcon: 'decoradd prefab spawn_loisir_beach_chair here' },
  spawn_loisir_beach_umbrella: { category: 'loisirs', label: 'Parasol plage', desc: 'Parasol ~1,88 m.', rcon: 'decoradd prefab spawn_loisir_beach_umbrella here' },
  spawn_loisir_life_ring: { category: 'loisirs', label: 'Bouée sauvetage', desc: 'Bouée ~1,02 m.', rcon: 'decoradd prefab spawn_loisir_life_ring here' },
  spawn_loisir_paddle_board: { category: 'loisirs', label: 'Paddle SUP', desc: 'SUP ~1,82 m.', rcon: 'decoradd prefab spawn_loisir_paddle_board here' },
  spawn_loisir_snorkel_set: { category: 'loisirs', label: 'Kit tuba', desc: 'Tuba ~0,28 m.', rcon: 'decoradd prefab spawn_loisir_snorkel_set here' },
  spawn_loisir_camp_cot: { category: 'loisirs', label: 'Lit de camp', desc: 'Lit ~0,52 m.', rcon: 'decoradd prefab spawn_loisir_camp_cot here' },
  spawn_loisir_fire_pit: { category: 'loisirs', label: 'Brasero', desc: 'Brasero ~0,72 m.', rcon: 'decoradd prefab spawn_loisir_fire_pit here' },
  spawn_loisir_solar_shower: { category: 'loisirs', label: 'Douche solaire', desc: 'Douche ~1,42 m.', rcon: 'decoradd prefab spawn_loisir_solar_shower here' },
  spawn_loisir_bird_bath: { category: 'loisirs', label: 'Bain d\'oiseaux', desc: 'Bassin ~0,78 m.', rcon: 'decoradd prefab spawn_loisir_bird_bath here' },
  spawn_loisir_red_wagon: { category: 'loisirs', label: 'Petit chariot', desc: 'Wagon ~0,92 m.', rcon: 'decoradd prefab spawn_loisir_red_wagon here' },
};

/** Libellés français des catégories (UI admin). */
export const DECOR_PREFAB_CATEGORIES = {
  camp: 'Camp / spawn',
  plage: 'Plage / rivage',
  rocher: 'Rochers',
  stockage: 'Stockage',
  construction: 'Construction bois',
  batiment: 'Bâtiments',
  arbre: 'Arbres',
  epave: 'Épaves',
  route: 'Route',
  signalisation: 'Signalisation',
  s01: 'Secteur 01',
  ville: 'Ville / urbain',
  jeux: 'Jeux & divertissement',
  sport: 'Sport',
  loisirs: 'Loisirs / plein air',
  autre: 'Autre',
};

/**
 * @param {string} id
 * @returns {string}
 */
export function inferDecorPrefabCategory(id) {
  if (id.startsWith('spawn_game_')) return 'jeux';
  if (id.startsWith('spawn_sport_')) return 'sport';
  if (id.startsWith('spawn_loisir_')) return 'loisirs';
  if (id.startsWith('spawn_urban_') || id.startsWith('spawn_prop_')) return 'ville';
  if (id.startsWith('spawn_beach_')) return 'plage';
  if (id.startsWith('spawn_')) return 'camp';
  if (id.startsWith('rock_')) return 'rocher';
  if (id.startsWith('storage_')) return 'stockage';
  if (id.startsWith('build_')) return 'construction';
  if (id.startsWith('building_') || id.startsWith('smallcity_')) return 'batiment';
  if (id.startsWith('tree_')) return 'arbre';
  if (id.startsWith('wreck_')) return 'epave';
  if (id.startsWith('road_')) return 'route';
  if (id.startsWith('sign_') || id.startsWith('beach_')) return 'signalisation';
  if (id.startsWith('s01_')) return 's01';
  return 'autre';
}

/**
 * @param {string} id
 * @returns {string}
 */
export function defaultDecorPrefabRcon(id) {
  if (id.startsWith('building_') || id.startsWith('smallcity_') || id === 's01_gas_station' || id === 's01_military_tent') {
    return `decoradd prefab ${id} here 0 1`;
  }
  if (id.startsWith('wreck_')) {
    return `decoradd prefab ${id} here 0 1 rust 0.15 2`;
  }
  if (id === 'spawn_border_log') {
    return `decoradd prefab ${id} here 0 2`;
  }
  return `decoradd prefab ${id} here`;
}

/**
 * @param {string} id
 * @returns {string}
 */
export function humanizeDecorPrefabLabel(id) {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string[]} ids
 * @param {Record<string, Partial<DecorPrefabEntry>>} [clientMeta]
 * @returns {DecorPrefabEntry[]}
 */
export function buildDecorPrefabCatalog(ids, clientMeta = {}) {
  return ids.map((id) => {
    const manual = DECOR_PREFAB_META[id];
    const client = clientMeta[id];
    const auto = !manual;
    const category = manual?.category || client?.category || inferDecorPrefabCategory(id);
    const label = manual?.label || client?.label || humanizeDecorPrefabLabel(id);
    const desc = manual?.desc || client?.desc || 'Prefab décor enregistré côté client.';
    const rcon = manual?.rcon || client?.rcon || defaultDecorPrefabRcon(id);
    const notes = manual?.notes || client?.notes;
    const orient = getDecorPrefabOrientation(id);
    return {
      id,
      category,
      label,
      desc,
      rcon,
      notes,
      auto,
      orientation: formatDecorOrientationShort(orient),
      orientationDetail: formatDecorOrientationLong(orient),
      orientationDocumented: orient.documented,
    };
  });
}

/**
 * @param {string} [clientJsDir]
 * @param {Record<string, Partial<DecorPrefabEntry>>} [clientMeta]
 */
export function loadDecorPrefabCatalog(clientJsDir = DEFAULT_CLIENT_JS_DIR, clientMeta = {}) {
  const ids = discoverDecorPrefabIds(clientJsDir);
  return {
    ids,
    catalog: buildDecorPrefabCatalog(ids, clientMeta),
    categories: DECOR_PREFAB_CATEGORIES,
  };
}

/** @deprecated Utiliser loadDecorPrefabCatalog().catalog */
export function getDecorPrefabCatalog(clientJsDir, clientMeta) {
  return loadDecorPrefabCatalog(clientJsDir, clientMeta).catalog;
}

export { discoverDecorPrefabIds, DEFAULT_CLIENT_JS_DIR };
