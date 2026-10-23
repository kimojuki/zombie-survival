/** Combat stats per weapon/tool — server authoritative. */
export const WEAPON_STATS = Object.freeze({
  __fist__: { dmg: 8, range: 1.6, radius: 1.4, kb: 0.5, fireRate: 0.5, ammoType: null },
  wpn_couteau: { dmg: 15, range: 2.2, radius: 0.8, kb: 0.3, fireRate: 0.4, ammoType: null, durabilityMax: 100 },
  wpn_hache_combat: { dmg: 35, range: 3.0, radius: 1.0, kb: 1.2, fireRate: 0.9, ammoType: null, durabilityMax: 150 },
  wpn_barre_fer: { dmg: 22, range: 2.8, radius: 0.9, kb: 1.0, fireRate: 1.1, ammoType: null, durabilityMax: 300 },
  wpn_machette: { dmg: 28, range: 2.8, radius: 0.9, kb: 0.8, fireRate: 0.6, ammoType: null, durabilityMax: 120 },
  wpn_arc_artisanal: { dmg: 20, range: 4.0, radius: 0.7, kb: 0.4, fireRate: 0.9, ammoType: null, durabilityMax: 45 },
  wpn_lance_bois: { dmg: 14, range: 3.2, radius: 0.9, kb: 0.9, fireRate: 0.75, ammoType: null, durabilityMax: 35 },
  wpn_lance_pierre: { dmg: 22, range: 3.4, radius: 0.9, kb: 1.0, fireRate: 0.85, ammoType: null, durabilityMax: 50 },
  wpn_batte_cloutee: { dmg: 30, range: 2.8, radius: 1.0, kb: 1.1, fireRate: 0.8, ammoType: null, durabilityMax: 70 },
  tool_caillou: { dmg: 10, range: 1.85, radius: 0.8, kb: 0.6, fireRate: 0.52, ammoType: null, durabilityMax: 80 },
  tool_hachette: { dmg: 22, range: 2.8, radius: 0.9, kb: 0.7, fireRate: 0.6, ammoType: null, durabilityMax: 120 },
  tool_hache_pierre: { dmg: 24, range: 2.9, radius: 0.95, kb: 0.8, fireRate: 0.65, ammoType: null, durabilityMax: 100 },
  tool_pioche_pierre: { dmg: 18, range: 2.5, radius: 0.85, kb: 0.5, fireRate: 0.6, ammoType: null, durabilityMax: 120 },
  tool_marteau: { dmg: 18, range: 2.4, radius: 0.85, kb: 0.7, fireRate: 0.7, ammoType: null, durabilityMax: 200 },
  wpn_pistolet: { dmg: 25, range: 90, radius: 0.8, kb: 0.2, fireRate: 0.28, ammoType: 'ammo_pistolet', magazineCap: 12, pellets: 1, dispersion: 0.15 },
  pistol: { dmg: 25, range: 90, radius: 0.8, kb: 0.2, fireRate: 0.28, ammoType: 'ammo_pistolet', magazineCap: 12, pellets: 1, dispersion: 0.15 },
  wpn_fusil_pompe: { dmg: 12, range: 40, radius: 0.9, kb: 0.5, fireRate: 0.85, ammoType: 'ammo_fusil_pompe', magazineCap: 6, pellets: 8, dispersion: 0.85 },
  wpn_fusil_chasse: { dmg: 75, range: 80, radius: 0.8, kb: 0.6, fireRate: 1.1, ammoType: 'ammo_fusil_chasse', magazineCap: 5, pellets: 1, dispersion: 0.01 },
});

export const MAX_PLAYER_SPEED = 11;

export function getWeaponStats(weaponType) {
  return WEAPON_STATS[weaponType] || WEAPON_STATS.__fist__;
}

export function playerHasWeapon(inv, weaponType, iterStacks) {
  if (!weaponType || weaponType === '__fist__') return true;
  return iterStacks(inv).some((s) => s && s.type === weaponType);
}
