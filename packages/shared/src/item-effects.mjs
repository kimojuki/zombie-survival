/** Server-side consumable item effects (subset of client ZS.ITEMS). */
export const ITEM_EFFECTS = Object.freeze({
  food_eau_bouteille: { apport_soif: 45, apport_faim: 0 },
  food_boisson_energisante: { apport_soif: 20, apport_faim: 0, bonus_endurance: 35 },
  food_conserves: { apport_soif: -5, apport_faim: 30 },
  food_haricots_boite: { apport_soif: -10, apport_faim: 40 },
  food_soupe_conserve: { apport_soif: 25, apport_faim: 20 },
  food_pain: { apport_soif: -5, apport_faim: 25 },
  food_sandwich: { apport_soif: 8, apport_faim: 32 },
  food_fruits: { apport_soif: 10, apport_faim: 15 },
  food_viande_crue: { apport_soif: 0, apport_faim: 15, ratio_maladie: 0.75 },
  food_viande_cuite: { apport_soif: 0, apport_faim: 50 },
  med_bandage: { soin_sante: 15, stoppe_saignement: true },
  med_kit_soin: { soin_sante: 75, stoppe_saignement: true },
  med_pilules_anti_infection: { reduit_infection: 20, pause_infection_sec: 150 },
  med_seringue_anti_infection: { soin_sante: 15, guerit_infection: true },
  eq_casque: { valeur_armure: 20, slot_equipement: 'Tête' },
  eq_gilet_protection: { valeur_armure: 40, slot_equipement: 'Torso' },
  eq_gants: { valeur_armure: 5, slot_equipement: 'Mains' },
  eq_petit_sac: { slots_inventaire_bonus: 8, slot_equipement: 'Dos' },
  eq_sac_moyen: { slots_inventaire_bonus: 16, slot_equipement: 'Dos' },
  eq_grand_sac: { slots_inventaire_bonus: 24, slot_equipement: 'Dos' },
});

export function getItemEffect(type) {
  return ITEM_EFFECTS[type] || null;
}

export function getArmorFromInv(inv, normalizeInv) {
  const n = normalizeInv(inv);
  let total = 0;
  for (const s of Object.values(n.equip || {})) {
    if (!s?.type) continue;
    const eff = ITEM_EFFECTS[s.type];
    if (eff?.valeur_armure) total += eff.valeur_armure;
  }
  return total;
}

export function getMaxHealthFromInv(inv, normalizeInv) {
  return 100 + getArmorFromInv(inv, normalizeInv);
}

/** Grant bonus HP when armor increases; clamp when armor decreases. */
export function syncArmorHealth(player, prevArmor, newArmor) {
  if (prevArmor === newArmor) return;
  const maxHp = 100 + newArmor;
  const hp = player.health ?? 100;
  if (newArmor > prevArmor) {
    player.health = Math.min(maxHp, hp + (newArmor - prevArmor));
  } else {
    player.health = Math.min(hp, maxHp);
  }
}

export function applyItemUse(type, player, normalizeInv) {
  const eff = ITEM_EFFECTS[type];
  if (!eff) return { ok: false, err: 'unknown_item' };
  const sv = player.survival || {};
  if (eff.apport_faim != null) {
    sv.faim = Math.max(0, Math.min(100, (sv.faim ?? 80) + eff.apport_faim));
  }
  if (eff.apport_soif != null) {
    sv.soif = Math.max(0, Math.min(100, (sv.soif ?? 80) + eff.apport_soif));
  }
  if (eff.soin_sante) {
    const maxHp = getMaxHealthFromInv(player.inv, normalizeInv);
    player.health = Math.min(maxHp, (player.health ?? 100) + eff.soin_sante);
  }
  if (eff.stoppe_saignement) sv.saignement = false;
  if (eff.reduit_infection) {
    sv.infection = Math.max(0, (sv.infection || 0) - eff.reduit_infection);
  }
  if (eff.pause_infection_sec) {
    sv.infectionPausedUntil = Date.now() + eff.pause_infection_sec * 1000;
  }
  if (eff.guerit_infection) {
    sv.infection = 0;
    delete sv.infectionPausedUntil;
  }
  if (eff.bonus_endurance) {
    sv.endurance = Math.min(100, (sv.endurance ?? 100) + eff.bonus_endurance);
  }
  if (eff.ratio_maladie && Math.random() < eff.ratio_maladie) {
    sv.infection = Math.min(100, (sv.infection || 0) + 25);
  }
  player.survival = sv;
  return { ok: true };
}
