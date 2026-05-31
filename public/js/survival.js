// Survival system — faim, soif, états (saignement, infection)
(function () {
  'use strict';

  const HUNGER_DECAY  = 0.28;  // /s → vide en ~6 min
  const THIRST_DECAY  = 0.42;  // /s → vide en ~4 min
  const BLEED_DMG     = 2.0;   // hp/s
  const INFECT_DMG    = 0.4;   // hp/s
  const STARVE_DMG    = 0.8;   // hp/s quand faim = 0
  const DEHYDRATE_DMG = 1.2;   // hp/s quand soif = 0

  const _sv = {
    faim: 80,
    soif: 80,
    endurance: 100,
    saignement: false,
    infection: false,
    _timer: 0,
    _pendingType: null,
  };

  let _state = null;

  function init(state) {
    _state = state;
    try {
      const s = JSON.parse(localStorage.getItem('zombie_survival') || 'null');
      if (s) {
        _sv.faim       = Math.max(0, Math.min(100, s.faim       ?? 80));
        _sv.soif       = Math.max(0, Math.min(100, s.soif       ?? 80));
        _sv.saignement = !!s.saignement;
        _sv.infection  = !!s.infection;
      }
    } catch {}
    _flush();
  }

  function tick(dt) {
    if (!_state || _state.player.dead) return;

    // Decay
    _sv.faim = Math.max(0, _sv.faim - HUNGER_DECAY * dt);
    _sv.soif = Math.max(0, _sv.soif - THIRST_DECAY * dt);
    _sv.endurance = Math.min(100, _sv.endurance + 8 * dt);

    // Dégâts sur le temps
    let dmg = 0;
    if (_sv.saignement) dmg += BLEED_DMG     * dt;
    if (_sv.infection)  dmg += INFECT_DMG    * dt;
    if (_sv.faim  <= 0) dmg += STARVE_DMG    * dt;
    if (_sv.soif  <= 0) dmg += DEHYDRATE_DMG * dt;

    if (dmg > 0) {
      const p = _state.player;
      p.health = Math.max(0, p.health - dmg);
      ZS.UI.setHealth(Math.floor(p.health));
      if (p.health <= 0 && !p.dead) {
        p.dead = true;
        ZS.UI.showDeath(p.kills);
      }
    }

    // Timer d'utilisation d'objet
    if (_sv._timer > 0) {
      _sv._timer -= dt;
      if (_sv._timer <= 0) _finishUse();
    }

    ZS.UI.setHunger(Math.floor(_sv.faim));
    ZS.UI.setThirst(Math.floor(_sv.soif));
  }

  // Déclenche l'utilisation d'un item (food ou medical). Retourne true si démarré.
  function useItem(type) {
    const def = ZS.ITEMS[type];
    if (!def) return false;
    if (_sv._timer > 0) { ZS.UI.showNotif('Déjà en train d\'utiliser…'); return false; }

    if (def.category === 'food') {
      _sv._timer = 0.5;
      _sv._pendingType = type;
      ZS.UI.showNotif('Consommation…');
      return true;
    }
    if (def.category === 'medical') {
      _sv._timer = def.temps_utilisation;
      _sv._pendingType = type;
      ZS.UI.showNotif('Soin en cours…');
      return true;
    }
    return false;
  }

  function _finishUse() {
    const type = _sv._pendingType;
    _sv._pendingType = null;
    if (!type) return;
    const def = ZS.ITEMS[type];
    if (!def) return;

    if (def.category === 'food') {
      if (def.ratio_maladie > 0 && Math.random() < def.ratio_maladie) {
        _sv.infection = true;
        ZS.UI.showNotif('Intoxication alimentaire !');
      }
      _sv.faim = Math.max(0, Math.min(100, _sv.faim + (def.apport_faim || 0)));
      _sv.soif = Math.max(0, Math.min(100, _sv.soif + (def.apport_soif || 0)));
      _sv.endurance = Math.min(100, _sv.endurance + (def.bonus_endurance || 0));
    }

    if (def.category === 'medical') {
      const p = _state.player;
      p.health = Math.min(100, p.health + (def.soin_sante || 0));
      ZS.UI.setHealth(Math.floor(p.health));
      if (def.stoppe_saignement) _sv.saignement = false;
      if (def.guerit_infection)  _sv.infection  = false;
      ZS.UI.showNotif('+' + def.soin_sante + ' HP');
    }

    _flush();
    _save();
    ZS.Inventory.consumeOne(type);
  }

  // Appelé quand le joueur reçoit des dégâts (chance de saignement)
  function applyDamage(dmg) {
    if (!_sv.saignement && dmg >= 15 && Math.random() < 0.25) {
      _sv.saignement = true;
      ZS.UI.setStatus(_sv.saignement, _sv.infection);
    }
  }

  function reset() {
    _sv.faim = 80; _sv.soif = 80; _sv.endurance = 100;
    _sv.saignement = false; _sv.infection = false;
    _sv._timer = 0; _sv._pendingType = null;
    _flush();
    _save();
  }

  function get() { return { ..._sv }; }

  function _flush() {
    ZS.UI.setHunger(Math.floor(_sv.faim));
    ZS.UI.setThirst(Math.floor(_sv.soif));
    ZS.UI.setStatus(_sv.saignement, _sv.infection);
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
  ZS.Survival = { init, tick, useItem, applyDamage, reset, get };
}());
