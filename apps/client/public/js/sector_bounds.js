// Limites secteurs — sync packages/shared/src/sectors.mjs

(function () {

  'use strict';



  const MAP_EAST_X = 295;



  const MAP_WORLD = {

    xMin: -310,

    xMax: MAP_EAST_X,

    zMin: -300,

    zMax: 120,

    scale: 1.35,

    offsetX: 310,

    offsetZ: 300,

  };



  const SECTORS_ALL = [

    {

      id: 's01_start_forest', num: 1, label: 'Forêt de départ', labelEn: 'START FOREST',

      xMin: -94, xMax: MAP_EAST_X, zMin: -118, zMax: 106,

      status: 'open', fill: '#2a5010', fill2: '#c8b878', stroke: '#1a5a10', pattern: 'forest',

      mapNote: 'OUVERT — plage est + campement',

    },

    {

      id: 's02', num: 2, label: 'Petite ville', labelEn: 'SMALL TOWN',

      xMin: -295, xMax: -125, zMin: -55, zMax: 55,

      status: 'open', fill: '#6a5040', stroke: '#4a3020', pattern: 'town',

      mapNote: 'OUVERT — village abandonné, loot intermédiaire',

    },

    {

      id: 's03', num: 3, label: 'Grande ville', labelEn: 'MAIN CITY',

      xMin: -85, xMax: 45, zMin: -250, zMax: -120,

      status: 'locked', fill: '#5a5868', fill2: '#6a6878', stroke: '#3a3848', pattern: 'city',

      mapNote: 'Zone urbaine dense — danger élevé',

    },

    {

      id: 's04', num: 4, label: 'Zone industrielle', labelEn: 'INDUSTRIAL',

      xMin: -125, xMax: 45, zMin: 107, zMax: 120,

      status: 'locked', fill: '#4a4840', fill2: '#5a5850', stroke: '#2a2820', pattern: 'industrial',

      mapNote: 'Usines et entrepôts — matériaux rares',

    },

    {

      id: 's05', num: 5, label: 'Zone militaire', labelEn: 'MILITARY',

      xMin: -275, xMax: -125, zMin: -240, zMax: -80,

      status: 'locked', fill: '#3a5428', fill2: '#4a6030', stroke: '#2a3a18', pattern: 'military',

      mapNote: 'ACCÈS RESTREINT — haut risque',

    },

    {

      id: 's06', num: 6, label: 'Plaines agricoles', labelEn: 'FARMLANDS',

      xMin: 46, xMax: 200, zMin: -80, zMax: 55,

      status: 'locked', fill: '#6a7a38', fill2: '#8a9a48', stroke: '#4a5a20', pattern: 'farm',

      mapNote: 'Fermes et silos — nourriture',

    },

    {

      id: 's07', num: 7, label: 'Région des lacs', labelEn: 'LAKE REGION',

      xMin: -125, xMax: -20, zMin: -117, zMax: -56,

      status: 'locked', fill: '#2a4a58', fill2: '#3a6a78', stroke: '#1a3a48', pattern: 'lake',

      mapNote: 'Lac et cabanes — exploration',

    },

    {

      id: 's08', num: 8, label: 'Littoral nord', labelEn: 'COASTLINE',

      xMin: 46, xMax: MAP_EAST_X, zMin: -250, zMax: -119,

      status: 'locked', fill: '#4a6878', fill2: '#6a8898', stroke: '#2a4858', pattern: 'coast',

      mapNote: 'Falaises et phare — exploration maritime',

    },

    {

      id: 's09', num: 9, label: 'Montagnes', labelEn: 'MOUNTAINS',

      xMin: -310, xMax: -86, zMin: -300, zMax: -251,

      status: 'unknown', fill: '#5a5a58', fill2: '#7a7a70', stroke: '#3a3a38', pattern: 'mountain',

      mapNote: 'INCONNU — relief escarpé',

    },

    {

      id: 's10', num: 10, label: 'Terres dévastées', labelEn: 'WASTELAND',

      xMin: -310, xMax: -276, zMin: -240, zMax: -56,

      status: 'unknown', fill: '#6a5848', fill2: '#8a7868', stroke: '#4a3828', pattern: 'wasteland',

      mapNote: 'INCONNU — zone irradiée ?',

    },

  ];



  const SECTOR_01 = SECTORS_ALL[0];
  const SECTOR_02 = SECTORS_ALL.find((s) => s.id === 's02');



  const SECTORS_LOCKED = SECTORS_ALL.filter((s) => s.status === 'locked');
  const PLAYABLE_AREAS = [
    SECTOR_01,
    SECTOR_02,
    SECTOR_02 && {
      id: 's01_s02_corridor',
      xMin: Math.min(SECTOR_01.xMin, SECTOR_02.xMax),
      xMax: Math.max(SECTOR_01.xMin, SECTOR_02.xMax),
      zMin: SECTOR_02.zMin,
      zMax: SECTOR_02.zMax,
    },
  ].filter(Boolean);



  const SECTOR_01_GATES = [

    {

      id: 'gate_west',

      x: -92,

      z: -34,

      rotY: Math.PI / 2,

      target: 's02',

      title: 'ROUTE OUEST',

      subtitle: 'Petite ville — secteur 02',

    },

    {

      id: 'gate_north',

      x: -42,

      z: -116,

      rotY: 0,

      target: 's03',

      title: 'ROUTE NORD',

      subtitle: 'Grande ville — secteur 03',

    },

    {

      id: 'gate_south',

      x: 48,

      z: 104,

      rotY: Math.PI,

      target: 's04',

      title: 'SENTIER SUD',

      subtitle: 'Zone industrielle — secteur 04',

    },

  ];



  const MAP_ROADS = [

    {

      id: 'town_main',

      pts: [

        [88, -64], [74, -62], [62, -60], [56, -58],

        [36, -56], [16, -52], [-4, -46], [-24, -36], [-44, -24], [-64, -8],

        [-78, -9], [-92, -9], [-104, -9], [-118, -8], [-155, 0], [-180, 1], [-210, 0], [-250, 1], [-295, 0],

      ],

      width: 5,

      dashed: false,

    },

    {

      id: 'city_highway',

      pts: [[-104, -9], [-96, -32], [-82, -58], [-65, -85], [-48, -105], [-32, -116], [-20, -122]],

      width: 3,

      dashed: false,

    },

    {

      id: 'mil_access',

      pts: [[-177, -5], [-186, -30], [-196, -55], [-200, -80]],

      width: 2.5,

      dashed: true,

    },

    {

      id: 'river',

      pts: [[-97, -265], [-115, -180], [-88, -40], [-105, 90]],

      width: 3.5,

      dashed: false,

      bezier: true,

    },

  ];



  let _blockNotifAt = 0;



  function clamp(x, z) {
    for (let i = 0; i < PLAYABLE_AREAS.length; i++) {
      if (_contains(PLAYABLE_AREAS[i], x, z, 0)) return { x, z };
    }
    let best = _clampToArea(SECTOR_01, x, z);
    let bestD = _dist2(best, x, z);
    for (let i = 0; i < PLAYABLE_AREAS.length; i++) {
      const c = _clampToArea(PLAYABLE_AREAS[i], x, z);
      const d = _dist2(c, x, z);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;

  }

  function _contains(area, x, z, margin) {
    const m = margin || 0;
    return x >= area.xMin - m
      && x <= area.xMax + m
      && z >= area.zMin - m
      && z <= area.zMax + m;
  }

  function _clampToArea(area, x, z) {
    return {
      x: Math.max(area.xMin, Math.min(area.xMax, x)),
      z: Math.max(area.zMin, Math.min(area.zMax, z)),
    };
  }

  function _dist2(a, x, z) {
    return ((a.x - x) ** 2) + ((a.z - z) ** 2);
  }



  function isInside(x, z, margin) {
    for (let i = 0; i < PLAYABLE_AREAS.length; i++) {
      if (_contains(PLAYABLE_AREAS[i], x, z, margin)) return true;
    }
    return false;

  }



  function getSectorAt(x, z) {
    let best = null;
    let bestArea = Infinity;
    for (let i = 0; i < SECTORS_ALL.length; i++) {
      const s = SECTORS_ALL[i];
      if (x < s.xMin || x > s.xMax || z < s.zMin || z > s.zMax) continue;
      if (s.status === 'open') return s;
      const area = (s.xMax - s.xMin) * (s.zMax - s.zMin);
      if (area < bestArea) {
        bestArea = area;
        best = s;
      }
    }
    return best;
  }



  function onBlocked() {

    const now = Date.now();

    if (now - _blockNotifAt < 2800) return;

    _blockNotifAt = now;

    ZS.UI?.showNotif?.('⛔ Zone en construction — passage impossible');

  }



  window.ZS = window.ZS || {};

  ZS.SectorBounds = {

    MAP_WORLD,

    SECTORS_ALL,

    SECTOR_01,

    SECTOR_02,

    SECTORS_LOCKED,

    PLAYABLE_AREAS,

    SECTOR_01_GATES,

    MAP_ROADS,

    clamp,

    isInside,

    getSectorAt,

    onBlocked,

  };

}());

