// État inventaire + constantes — extrait de inventory.js (IIFE)
const HOTBAR_SIZE = 6;
  const GRAB_RANGE  = 2.2;   // distance max pour ramasser un objet au sol
  const GRAB_RANGE_INTRO = 3.6;
  let _grabTargetId = null;  // objet actuellement visé (à portée)
  let _selfPlayerId = null;  // id persistant (loot personnel)

  let _hotbar = Array(HOTBAR_SIZE).fill(null);
  let _bag    = [];     // taille = slots_inventaire_bonus du sac équipé (0 sans sac)
  let _equip  = { Tête: null, Torso: null, Mains: null, Dos: null };
  let _active = 0;
  let _panelOpen  = false;
  let _invBackdrop = null;
  let _sel = null;      // objet sélectionné (détail / jeter) : { zone, idx }
  let _dragPending = null;
  let _drag = null;
  let _dragGhost = null;
  let _dragOverEl = null;
  const _DRAG_THRESH = 7;
  let _detailIcon = null;
  let _detailName = null;
  let _detailCat = null;
  let _detailDesc = null;

  let _state, _scene, _socket;
  let _lockPending = null;
  const _worldItems = new Map();

  // ── Init ───────────────────────────────────────────────────────────────────
