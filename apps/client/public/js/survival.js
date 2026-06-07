// Survival system — faim, soif, états (saignement, infection)
(function () {
  'use strict';

  const HUNGER_DECAY    = 0.11;  // /s → vide en ~15 min
  const THIRST_DECAY    = 0.16;  // /s → vide en ~10 min
  const BLEED_DMG       = 2.0;   // hp/s
  const STARVE_DMG      = 0.8;   // hp/s quand faim = 0
  const DEHYDRATE_DMG   = 1.2;   // hp/s quand soif = 0
  const INFECT_PROGRESS = 0.7;   // pts/s → 0→100 en ~2min20
  const INFECT_BITE_CHANCE = 0.25; // proba d'infection par coup

  const _sv = {
    faim: 80,
    soif: 80,
    endurance: 100,
    saignement: false,
    infection: 0,   // 0–100 ; à 100 = mort
    _timer: 0,
    _pendingType: null,
  };

  let _state = null;
  let _syncTimer = 0;
  let _inWater = false;

  function init(state) {
    _state = state;
    try {
      const s = JSON.parse(localStorage.getItem('zombie_survival') || 'null');
      if (s) {
        _sv.faim       = Math.max(0, Math.min(100, s.faim       ?? 80));
        _sv.soif       = Math.max(0, Math.min(100, s.soif       ?? 80));
        _sv.saignement = !!s.saignement;
        _sv.infection  = Math.max(0, Math.min(100, Number(s.infection) || 0));
      }
    } catch {}
    _flush();
  }

  // Restaure l'état de survie sauvegardé côté serveur (prioritaire sur localStorage).
  function loadFromSave(sv) {
    if (!sv || typeof sv !== 'object') return;
    _sv.faim       = Math.max(0, Math.min(100, Number(sv.faim) || 0));
    _sv.soif       = Math.max(0, Math.min(100, Number(sv.soif) || 0));
    _sv.infection  = Math.max(0, Math.min(100, Number(sv.infection) || 0));
    _sv.saignement = !!sv.saignement;
    _flush();
    _save();
  }

  function applyServerState(d) {
    if (!d || typeof d !== 'object') return;
    const next = {
      faim: Math.max(0, Math.min(100, d.faim != null ? Number(d.faim) : _sv.faim)),
      soif: Math.max(0, Math.min(100, d.soif != null ? Number(d.soif) : _sv.soif)),
      infection: Math.max(0, Math.min(100, d.infection != null ? Number(d.infection) : _sv.infection)),
      saignement: !!d.saignement,
    };
    if (next.faim === _sv.faim && next.soif === _sv.soif
      && next.infection === _sv.infection && next.saignement === _sv.saignement) {
      return;
    }
    _sv.faim = next.faim;
    _sv.soif = next.soif;
    _sv.infection = next.infection;
    _sv.saignement = next.saignement;
    _flush();
  }

  function _syncServer() {}

  function tick(dt) {
    if (!_state || _state.player.dead) return;
    _sv.endurance = Math.min(100, _sv.endurance + 8 * dt);
    if (_sv._timer > 0) {
      _sv._timer -= dt;
      if (_sv._timer <= 0) {
        _sv._timer = 0;
        _sv._pendingType = null;
      }
    }
    ZS.UI.setHunger(Math.floor(_sv.faim));
    ZS.UI.setThirst(Math.floor(_sv.soif));
  }

  function useItem(type) {
    const def = ZS.ITEMS[type];
    if (!def) return false;
    if (_sv._timer > 0) { ZS.UI.showNotif('Déjà en train d\'utiliser…'); return false; }
    if (def.category !== 'food' && def.category !== 'medical') return false;
    const loc = ZS.Inventory?.findItemSlot?.(type);
    if (!loc) return false;
    const dur = def.category === 'medical' ? (def.temps_utilisation || 1.5) : 0.5;
    _sv._timer = dur;
    _sv._pendingType = type;
    ZS.UI.showNotif(def.category === 'medical' ? 'Soin en cours…' : 'Consommation…');
    setTimeout(() => {
      ZS.Network?.requestUseItem?.(loc.zone, loc.idx);
      _sv._timer = 0;
      _sv._pendingType = null;
    }, dur * 1000);
    return true;
  }

  function _finishUse() {}

  // Appelé quand un zombie frappe le joueur — effets visuels seulement (serveur authoritatif).
  function applyDamage(_dmg) {
    /* infection/saignement gérés serveur via survival-update */
  }

  function reset() {
    _sv.faim = 80; _sv.soif = 80; _sv.endurance = 100;
    _sv.saignement = false; _sv.infection = 0;
    _sv._timer = 0; _sv._pendingType = null;
    _flush();
    _save();
  }

  function get() { return { ..._sv }; }
  function setWaterContact(v) { _inWater = !!v; }

  function _flush() {
    ZS.UI.setHunger(Math.floor(_sv.faim));
    ZS.UI.setThirst(Math.floor(_sv.soif));
    ZS.UI.setInfection(_sv.infection);
    ZS.UI.setStatus(_sv.saignement, _sv.infection > 0);
  }

  function _save() {
    try {
      localStorage.setItem('zombie_survival', JSON.stringify({
        faim: _sv.faim, soif: _sv.soif,
        saignement: _sv.saignement, infection: _sv.infection,
      }));
    } catch {}
  }

  window.ZS = window.ZS || {};
  ZS.Survival = { init, tick, useItem, applyDamage, reset, get, loadFromSave, setWaterContact, applyServerState };
}());
