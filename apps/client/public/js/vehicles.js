// Carcasses de véhicules — placement centralisé le long des routes
(function () {
  'use strict';

  /**
   * road   — id d'arête RoadNetwork (town_main, spawn_trail, city_highway…)
   * t      — 0..1 le long de la route
   * side   — 'left' | 'right' | 'center' (épaule ou voie)
   * lane   — 0..1, distance depuis l'axe (× demi-largeur route)
   * rot    — rotation Y additionnelle (rad)
   * tilt   — inclinaison carrosserie (rad, effet renversé/abîmé)
   * sink   — enfoncement dans le sol (m)
   * color  — teinte rouille
   * burnt  — carrosserie calcinée
   * wheels — 4 | 3 | 2 | 1 (pneus restants)
   */
  const WRECKS = [
    // ── Route principale (S02) — file d'attente abandonnée ──────────────────
    { road: 'town_main', t: 0.18, side: 'right', lane: 0.42, rot: 0.05,  color: 0x5a3015 },
    { road: 'town_main', t: 0.20, side: 'left',  lane: 0.38, rot: -0.04, color: 0x3a3a3a, wheels: 2 },
    { road: 'town_main', t: 0.36, side: 'right', lane: 0.48, rot: 0.10,  tilt: -0.14, color: 0x2a4a2a, sink: 0.08 },
    { road: 'town_main', t: 0.39, side: 'center', lane: 0.12, rot: 0.18,  tilt: 0.20,  color: 0x1a1a18, burnt: true },
    { road: 'town_main', t: 0.41, side: 'left',  lane: 0.44, rot: Math.PI + 0.08, color: 0x4a3a10 },
    { road: 'town_main', t: 0.58, side: 'right', lane: 0.50, rot: -0.07, color: 0x5a1a1a, wheels: 3 },
    { road: 'town_main', t: 0.74, side: 'left',  lane: 0.40, rot: 0.06,  tilt: 0.16, color: 0x3a3020 },

    // ── Sentier spawn → route (S01) ─────────────────────────────────────────
    { road: 'spawn_trail', t: 0.72, side: 'right', lane: 0.85, rot: 0.35, tilt: 0.10, color: 0x4a3520, wheels: 2 },

    // ── Autoroute vers la grande ville (S03) ──────────────────────────────────
    { road: 'city_highway', t: 0.48, side: 'left',  lane: 0.45, rot: -0.06, color: 0x3a2828 },
    { road: 'city_highway', t: 0.68, side: 'right', lane: 0.50, rot: 0.12, tilt: -0.18, color: 0x2a3a2a, burnt: true, wheels: 2 },
  ];

  function _edgeWidth(roadId) {
    const edges = ZS.RoadNetwork?.getResolvedEdges?.() || [];
    const e = edges.find(ed => ed.id === roadId);
    return e?.width || 4;
  }

  function _placeOnRoad(scene, def) {
    if (!ZS.RoadNetwork?.sampleAlong) return;
    const s = ZS.RoadNetwork.sampleAlong(def.road, def.t);
    if (!s) return;

    const hw = _edgeWidth(def.road) * 0.5;
    const nx = -s.uz;
    const nz = s.ux;
    const sign = def.side === 'left' ? 1 : def.side === 'right' ? -1 : 0;
    const lateral = sign * (hw * (def.lane ?? 0.45) + (def.offset || 0));
    const cx = s.x + nx * lateral;
    const cz = s.z + nz * lateral;
    const rotY = Math.atan2(s.ux, s.uz) + (def.rot || 0);

    ZS.B.carcass(scene, cx, cz, {
      rotY,
      tilt: def.tilt || 0,
      sink: def.sink || 0,
      color: def.color,
      burnt: !!def.burnt,
      wheels: def.wheels,
    });
  }

  function buildAll(scene) {
    if (!ZS.B?.carcass) return;
    for (const w of WRECKS) _placeOnRoad(scene, w);
  }

  window.ZS = window.ZS || {};
  ZS.Vehicles = { buildAll, wrecks: WRECKS };
}());
