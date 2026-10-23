/** Inventaire normalisé (hotbar + bag + equip). */
export function iterInvStacks(inv) {
  if (!inv || typeof inv !== 'object') return [];
  const hotbar = Array.isArray(inv) ? inv : (inv.hotbar || []);
  const bag = Array.isArray(inv) ? [] : (inv.bag || []);
  const equip = Array.isArray(inv) ? {} : (inv.equip || {});
  return [...hotbar, ...bag, ...Object.values(equip)];
}

/** Le joueur possède une clé pour ce verrou ? */
export function playerHasDoorKey(inv, lockId) {
  if (!lockId) return false;
  return iterInvStacks(inv).some(
    (s) => s && s.type === 'struct_cle' && s.lockId === lockId,
  );
}

/** Butin de mort : conserve lockId / durabilité / munitions. */
export function flattenInvForDeath(inv) {
  const out = [];
  const push = (s) => {
    if (!s?.type) return;
    const o = { type: s.type, qty: s.qty || 1 };
    if (s.lockId) o.lockId = s.lockId;
    if (s.durability != null) o.durability = s.durability;
    if (s.ammo != null) o.ammo = s.ammo;
    out.push(o);
  };
  if (!inv || typeof inv !== 'object') return out;
  (Array.isArray(inv) ? inv : (inv.hotbar || [])).forEach(push);
  (inv.bag || []).forEach(push);
  if (inv.equip) for (const k of Object.keys(inv.equip)) push(inv.equip[k]);
  return out;
}
