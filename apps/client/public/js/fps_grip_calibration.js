// Catalogue calibrages FPS viewmodel — dérivation depuis poses validées (main vide, hachette, caillou, torche).
(function () {
  'use strict';

  /** Clés localStorage historiques (ne pas renommer). */
  const LEGACY_STORAGE = Object.freeze({
    tool_torche: 'zs_arm_tuner_torch',
    empty_hand: 'zs_arm_tuner_empty',
    tool_caillou: 'zs_arm_tuner_rock',
    tool_hachette: 'zs_arm_tuner_weapon',
    remote_view: 'zs_arm_tuner_remote',
  });

  const CATEGORIES = Object.freeze({
    core: { label: 'Référence', order: 0 },
    tools: { label: 'Outils', order: 1 },
    melee: { label: 'Mêlée', order: 2 },
    firearms: { label: 'Armes à feu', order: 3 },
    food: { label: 'Nourriture', order: 4 },
    medical: { label: 'Médical', order: 5 },
    two_hand: { label: 'Deux mains', order: 6 },
  });

  /**
   * Notes de dérivation (bras = épaule/coude/poignet, item = offset pivot).
   * one_hand → bras validés hachette > main vide > torche
   * two_hand → bras validés caillou
   * itemFrom → copie item validé d'un autre type
   */
  const ENTRIES = Object.freeze([
    { id: 'tool_torche', category: 'core', icon: '🔥', label: 'Torche', manual: true },
    { id: 'empty_hand', category: 'core', icon: '🖐️', label: 'Main vide', manual: true },
    { id: 'remote_view', category: 'core', icon: '👥', label: 'Bras distant', manual: true },
    { id: 'tool_caillou', category: 'two_hand', icon: '🪨', label: 'Caillou', manual: true, twoHanded: true },
    { id: 'tool_hachette', category: 'tools', icon: '🪓', label: 'Hachette', manual: true },

    { id: 'tool_marteau', category: 'tools', icon: '🔨', label: 'Marteau', inherit: 'one_hand' },
    { id: 'tool_pioche', category: 'tools', icon: '⛏️', label: 'Pioche', inherit: 'one_hand' },
    { id: 'tool_hache_pierre', category: 'tools', icon: '🪓', label: 'Hache de pierre', inherit: 'one_hand', itemFrom: 'tool_hachette' },
    { id: 'tool_pioche_pierre', category: 'tools', icon: '⛏️', label: 'Pioche de pierre', inherit: 'one_hand', itemFrom: 'tool_pioche' },

    { id: 'wpn_couteau', category: 'melee', icon: '🔪', label: 'Couteau', inherit: 'one_hand' },
    { id: 'wpn_machette', category: 'melee', icon: '🗡️', label: 'Machette', inherit: 'one_hand' },
    { id: 'wpn_hache_combat', category: 'melee', icon: '🪓', label: 'Hache de combat', inherit: 'one_hand', itemFrom: 'tool_hachette' },
    { id: 'wpn_batte_cloutee', category: 'melee', icon: '🏏', label: 'Batte cloutée', inherit: 'one_hand' },
    { id: 'wpn_lance_bois', category: 'melee', icon: '🔱', label: 'Lance bois', inherit: 'one_hand' },
    { id: 'wpn_lance_pierre', category: 'melee', icon: '🔱', label: 'Lance pierre', inherit: 'one_hand', itemFrom: 'wpn_lance_bois' },

    { id: 'wpn_pistolet', category: 'firearms', icon: '🔫', label: 'Pistolet', inherit: 'one_hand' },
    { id: 'pistol', category: 'firearms', icon: '🔫', label: 'Pistolet (alias)', inherit: 'one_hand', itemFrom: 'wpn_pistolet' },

    { id: 'wpn_fusil_pompe', category: 'firearms', icon: '💥', label: 'Fusil à pompe', inherit: 'two_hand', twoHanded: true },
    { id: 'wpn_fusil_chasse', category: 'firearms', icon: '🎯', label: 'Fusil de chasse', inherit: 'two_hand', twoHanded: true },

    { id: 'wpn_barre_fer', category: 'two_hand', icon: '🔩', label: 'Barre de fer', inherit: 'two_hand', twoHanded: true },
    { id: 'wpn_arc_artisanal', category: 'two_hand', icon: '🏹', label: 'Arc artisanal', inherit: 'two_hand', twoHanded: true },
    { id: 'wpn_lance_artisanale', category: 'two_hand', icon: '🔱', label: 'Lance artisanale', inherit: 'two_hand', twoHanded: true },

    { id: 'food_eau_bouteille', category: 'food', icon: '💧', label: 'Eau bouteille', inherit: 'one_hand' },
    { id: 'food_boisson_energisante', category: 'food', icon: '🥤', label: 'Boisson énergisante', inherit: 'one_hand', itemFrom: 'food_eau_bouteille' },
    { id: 'food_conserves', category: 'food', icon: '🥫', label: 'Conserves', inherit: 'one_hand' },
    { id: 'food_haricots_boite', category: 'food', icon: '🥫', label: 'Haricots', inherit: 'one_hand', itemFrom: 'food_conserves' },
    { id: 'food_soupe_conserve', category: 'food', icon: '🍲', label: 'Soupe conserve', inherit: 'one_hand', itemFrom: 'food_conserves' },
    { id: 'food_pain', category: 'food', icon: '🍞', label: 'Pain', inherit: 'one_hand' },
    { id: 'food_sandwich', category: 'food', icon: '🥪', label: 'Sandwich', inherit: 'one_hand', itemFrom: 'food_pain' },
    { id: 'food_fruits', category: 'food', icon: '🍎', label: 'Fruits', inherit: 'one_hand' },

    { id: 'med_bandage', category: 'medical', icon: '🩹', label: 'Bandage', inherit: 'one_hand' },
    { id: 'med_kit_soin', category: 'medical', icon: '💊', label: 'Kit de soin', inherit: 'one_hand', itemFrom: 'med_bandage' },
    { id: 'med_pilules_anti_infection', category: 'medical', icon: '💉', label: 'Pilules anti-infection', inherit: 'one_hand' },
    { id: 'med_seringue_anti_infection', category: 'medical', icon: '💉', label: 'Seringue', inherit: 'one_hand', itemFrom: 'med_pilules_anti_infection' },
  ]);

  function storageKey(gripType) {
    return LEGACY_STORAGE[gripType] || `zs_arm_tune_${gripType}`;
  }

  function getEntry(gripType) {
    return ENTRIES.find((e) => e.id === gripType) || null;
  }

  function listAll() {
    return ENTRIES.slice();
  }

  function listAuto() {
    return ENTRIES.filter((e) => !e.manual);
  }

  function listByCategory() {
    const map = new Map();
    for (const e of ENTRIES) {
      const cat = e.category || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(e);
    }
    return [...map.entries()]
      .sort((a, b) => (CATEGORIES[a[0]]?.order ?? 99) - (CATEGORIES[b[0]]?.order ?? 99))
      .map(([id, items]) => ({ id, ...CATEGORIES[id], items }));
  }

  window.ZS = window.ZS || {};
  ZS.FpsGripCalibration = {
    LEGACY_STORAGE,
    CATEGORIES,
    ENTRIES,
    storageKey,
    getEntry,
    listAll,
    listAuto,
    listByCategory,
  };
}());
