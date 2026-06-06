// Item definitions registry — all items from design docs (CHUNK 1–4)
(function () {
  'use strict';

  window.ZS = window.ZS || {};
  ZS.ITEMS = {

    // ── NOURRITURE ──────────────────────────────────────────────────────────
    food_eau_bouteille: {
      label: 'Eau en Bouteille', category: 'food', maxStack: 10,
      icon: '💧', color: 0x4488ff,
      apport_soif: 45, apport_faim: 0, bonus_endurance: 0, ratio_maladie: 0,
    },
    food_boisson_energisante: {
      label: 'Boisson Énergisante', category: 'food', maxStack: 15,
      icon: '⚡', color: 0xffdd00,
      apport_soif: 20, apport_faim: 0, bonus_endurance: 40, ratio_maladie: 0,
    },
    food_conserves: {
      label: 'Conserves', category: 'food', maxStack: 20,
      icon: '🥫', color: 0xcc8844,
      apport_soif: -5, apport_faim: 30, bonus_endurance: 0, ratio_maladie: 0,
    },
    food_haricots_boite: {
      label: 'Haricots en Boîte', category: 'food', maxStack: 20,
      icon: '🫘', color: 0xaa6633,
      apport_soif: -10, apport_faim: 40, bonus_endurance: 0, ratio_maladie: 0,
    },
    food_soupe_conserve: {
      label: 'Soupe en Conserve', category: 'food', maxStack: 20,
      icon: '🍲', color: 0xdd9944,
      apport_soif: 25, apport_faim: 20, bonus_endurance: 5, ratio_maladie: 0,
    },
    food_pain: {
      label: 'Pain', category: 'food', maxStack: 5,
      icon: '🍞', color: 0xddbb66,
      apport_soif: -5, apport_faim: 25, bonus_endurance: 0, ratio_maladie: 0,
    },
    food_fruits: {
      label: 'Fruits', category: 'food', maxStack: 10,
      icon: '🍎', color: 0xee4444,
      apport_soif: 10, apport_faim: 15, bonus_endurance: 10, ratio_maladie: 0,
    },
    food_viande_crue: {
      label: 'Viande Crue', category: 'food', maxStack: 5,
      icon: '🥩', color: 0xcc3333,
      apport_soif: 0, apport_faim: 15, bonus_endurance: 0, ratio_maladie: 0.75,
    },
    food_viande_cuite: {
      label: 'Viande Cuite', category: 'food', maxStack: 5,
      icon: '🍗', color: 0xbb6622,
      apport_soif: 0, apport_faim: 50, bonus_endurance: 15, ratio_maladie: 0,
    },

    // ── MÉDICAL ─────────────────────────────────────────────────────────────
    med_bandage: {
      label: 'Bandage', category: 'medical', maxStack: 5,
      icon: '🩹', color: 0xffffff,
      soin_sante: 15, stoppe_saignement: true, guerit_infection: false, temps_utilisation: 3.0,
    },
    med_kit_soin: {
      label: 'Kit de Soin', category: 'medical', maxStack: 2,
      icon: '🧰', color: 0xff4444,
      soin_sante: 75, stoppe_saignement: true, guerit_infection: false, temps_utilisation: 6.0,
    },
    med_seringue_anti_infection: {
      label: 'Seringue Anti-infection', category: 'medical', maxStack: 3,
      icon: '💉', color: 0x44aaff,
      soin_sante: 5, stoppe_saignement: false, guerit_infection: true, temps_utilisation: 1.5,
    },

    // ── ARMES MÊLÉE ─────────────────────────────────────────────────────────
    wpn_couteau: {
      label: 'Couteau', category: 'melee', maxStack: 1,
      icon: '🔪', color: 0xcccccc,
      degats_impact: 15, portee_metre: 2.2, cadence_attaque: 0.4, durabilite_max: 100,
    },
    wpn_hache_combat: {
      label: 'Hache', category: 'melee', maxStack: 1,
      icon: '🪓', color: 0x885533,
      degats_impact: 35, portee_metre: 3.0, cadence_attaque: 0.9, durabilite_max: 150,
    },
    wpn_barre_fer: {
      label: 'Barre de Fer', category: 'melee', maxStack: 1,
      icon: '⚙️', color: 0x888888,
      degats_impact: 22, portee_metre: 2.8, cadence_attaque: 1.1, durabilite_max: 300,
    },
    wpn_machette: {
      label: 'Machette', category: 'melee', maxStack: 1,
      icon: '⚔️', color: 0xaaaaaa,
      degats_impact: 28, portee_metre: 2.8, cadence_attaque: 0.6, durabilite_max: 120,
    },
    wpn_lance_artisanale: {
      label: 'Lance Artisanale', category: 'melee', maxStack: 1,
      icon: '🏹', color: 0x886633,
      degats_impact: 18, portee_metre: 3.6, cadence_attaque: 0.8, durabilite_max: 40,
    },
    wpn_batte_cloutee: {
      label: 'Batte Cloutée', category: 'melee', maxStack: 1,
      icon: '🏏', color: 0x886633,
      degats_impact: 30, portee_metre: 2.8, cadence_attaque: 0.8, durabilite_max: 70,
    },

    // ── ARMES À FEU ─────────────────────────────────────────────────────────
    wpn_pistolet: {
      label: 'Pistolet', category: 'firearm', maxStack: 1,
      icon: '🔫', color: 0x334466,
      type_munition_accepte: 'ammo_pistolet', capacite_chargeur: 12,
      degats_par_balle: 25, temps_rechargement: 2.0, dispersion_balle: 0.15,
    },
    wpn_fusil_pompe: {
      label: 'Fusil à Pompe', category: 'firearm', maxStack: 1,
      icon: '🔫', color: 0x664422,
      type_munition_accepte: 'ammo_fusil_pompe', capacite_chargeur: 6,
      degats_par_balle: 12, temps_rechargement: 4.0, dispersion_balle: 0.85,
    },
    wpn_fusil_chasse: {
      label: 'Fusil de Chasse', category: 'firearm', maxStack: 1,
      icon: '🔫', color: 0x443322,
      type_munition_accepte: 'ammo_fusil_chasse', capacite_chargeur: 5,
      degats_par_balle: 75, temps_rechargement: 3.0, dispersion_balle: 0.01,
    },

    // ── MUNITIONS ───────────────────────────────────────────────────────────
    ammo_pistolet: {
      label: 'Munitions Pistolet', category: 'ammo', maxStack: 50,
      icon: '🟡', color: 0xffdd00, for_weapon: 'wpn_pistolet',
    },
    ammo_fusil_pompe: {
      label: 'Cartouches Fusil Pompe', category: 'ammo', maxStack: 24,
      icon: '🟠', color: 0xff8800, for_weapon: 'wpn_fusil_pompe',
    },
    ammo_fusil_chasse: {
      label: 'Cartouches Fusil Chasse', category: 'ammo', maxStack: 20,
      icon: '🔴', color: 0xff4400, for_weapon: 'wpn_fusil_chasse',
    },

    // ── ÉQUIPEMENT ──────────────────────────────────────────────────────────
    eq_petit_sac: {
      label: 'Petit Sac', category: 'equipment', maxStack: 1,
      icon: '🎒', color: 0x886633,
      slot_equipement: 'Dos', slots_inventaire_bonus: 8, valeur_armure: 0,
    },
    eq_sac_moyen: {
      label: 'Sac Moyen', category: 'equipment', maxStack: 1,
      icon: '🎒', color: 0x664422,
      slot_equipement: 'Dos', slots_inventaire_bonus: 16, valeur_armure: 0,
    },
    eq_grand_sac: {
      label: 'Grand Sac', category: 'equipment', maxStack: 1,
      icon: '🎒', color: 0x443322,
      slot_equipement: 'Dos', slots_inventaire_bonus: 24, valeur_armure: 0,
    },
    eq_casque: {
      label: 'Casque', category: 'equipment', maxStack: 1,
      icon: '⛑️', color: 0x666666,
      slot_equipement: 'Tête', valeur_armure: 20, slots_inventaire_bonus: 0,
    },
    eq_gilet_protection: {
      label: 'Gilet', category: 'equipment', maxStack: 1,
      icon: '🦺', color: 0x444444,
      slot_equipement: 'Torso', valeur_armure: 40, slots_inventaire_bonus: 0,
    },
    eq_gants: {
      label: 'Gants', category: 'equipment', maxStack: 1,
      icon: '🧤', color: 0x333333,
      slot_equipement: 'Mains', valeur_armure: 5, slots_inventaire_bonus: 0,
    },

    // ── RESSOURCES ──────────────────────────────────────────────────────────
    res_bois_brut:     { label: 'Bois Brut',    category: 'resource', maxStack: 200, icon: '🪵', color: 0x8b5a2b },
    res_planche:       { label: 'Planche',       category: 'resource', maxStack: 200, icon: '🪵', color: 0xbb8844 },
    res_ferraille:     { label: 'Ferraille',     category: 'resource', maxStack: 100, icon: '⚙️', color: 0x888888 },
    res_metal:         { label: 'Métal',         category: 'resource', maxStack: 100, icon: '🔩', color: 0xaaaaaa },
    res_clous:         { label: 'Clous',         category: 'resource', maxStack: 500, icon: '📌', color: 0xcccccc },
    res_ruban_adhesif: { label: 'Ruban Adhésif', category: 'resource', maxStack: 50,  icon: '🩹', color: 0xffcc00 },
    res_chiffon:       { label: 'Chiffon',       category: 'resource', maxStack: 100, icon: '🧣', color: 0xdddddd },
    res_corde:         { label: 'Corde',         category: 'resource', maxStack: 50,  icon: '🪢', color: 0xbb9944 },

    // ── OUTILS ──────────────────────────────────────────────────────────────
    tool_caillou: {
      label: 'Caillou', category: 'tool', maxStack: 1,
      icon: '🪨', color: 0x9a9588,
      type_recolte: 'Bois', efficacite_recolte: 0.5, durabilite_max: 80,
      degats_impact: 10, portee_metre: 1.85, cadence_attaque: 0.52, recul_metre: 0.6,
      bois_par_arbre: 2,
    },
    tool_marteau: {
      label: 'Marteau', category: 'tool', maxStack: 1,
      icon: '🔨', color: 0x884422,
      type_recolte: 'Construction', efficacite_recolte: 1.0, durabilite_max: 200,
      degats_impact: 18, portee_metre: 2.4, cadence_attaque: 0.7,   // sert aussi d'arme
    },
    tool_hachette: {
      label: 'Hachette', category: 'tool', maxStack: 1,
      icon: '🪓', color: 0x664422,
      type_recolte: 'Bois', efficacite_recolte: 2.5, durabilite_max: 120,
      degats_impact: 22, portee_metre: 2.8, cadence_attaque: 0.6,
      bois_par_arbre: 3,
    },
    tool_pioche: {
      label: 'Pioche', category: 'tool', maxStack: 1,
      icon: '⛏️', color: 0x888888,
      type_recolte: 'Pierre', efficacite_recolte: 3.0, durabilite_max: 150,
      degats_impact: 25, portee_metre: 2.6, cadence_attaque: 0.9,   // sert aussi d'arme
    },
    tool_torche: {
      label: 'Torche', category: 'tool', maxStack: 1,
      icon: '🔥', color: 0xff6600,
      type_recolte: 'Allumage', durabilite_max: Infinity,
    },

    // ── STRUCTURES ──────────────────────────────────────────────────────────
    struct_mur_bois: {
      label: 'Mur en Bois', category: 'structure', maxStack: 5,
      icon: '🧱', color: 0xbb8844, points_structure_hp: 500,
    },
    struct_porte_bois: {
      label: 'Porte en Bois', category: 'structure', maxStack: 5,
      icon: '🚪', color: 0xaa7733, points_structure_hp: 350,
    },
    struct_grande_porte_bois: {
      label: 'Grande Porte', category: 'structure', maxStack: 3,
      icon: '🚪', color: 0x996622, points_structure_hp: 800,
    },
    struct_plancher_bois: {
      label: 'Plancher en Bois', category: 'structure', maxStack: 5,
      icon: '📦', color: 0xcc9955, points_structure_hp: 400,
    },
    struct_escalier_bois: {
      label: 'Escalier en Bois', category: 'structure', maxStack: 3,
      icon: '🪜', color: 0xbb8833, points_structure_hp: 400,
    },

    // ── LEGACY (compat sauvegardes existantes) ───────────────────────────────
    pistol: {
      label: 'Pistolet', category: 'firearm', maxStack: 1,
      icon: '🔫', color: 0x334466,
      type_munition_accepte: 'ammo_pistolet', capacite_chargeur: 12,
      degats_par_balle: 25, temps_rechargement: 2.0, dispersion_balle: 0.15,
    },
    ammo: {
      label: 'Munitions', category: 'ammo', maxStack: 50,
      icon: '🟡', color: 0xffdd00, for_weapon: 'pistol',
    },
    medkit: {
      label: 'Trousse', category: 'medical', maxStack: 3,
      icon: '💊', color: 0xff4444,
      soin_sante: 50, stoppe_saignement: false, guerit_infection: false, temps_utilisation: 2.0,
    },
    food: {
      label: 'Nourriture', category: 'food', maxStack: 5,
      icon: '🍗', color: 0x22bb44,
      apport_soif: 10, apport_faim: 25, bonus_endurance: 0, ratio_maladie: 0,
    },
    map: { label: 'Carte tactique', category: 'map', maxStack: 1, icon: '🗺️', color: 0xddcc88 },
  };
}());
