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

  function _syncServer() {
    ZS.Network?.sendSurvival?.({
      faim: _sv.faim, soif: _sv.soif, infection: _sv.infection, saignement: _sv.saignement,
      health: _state?.player?.health,
    });
  }

  function tick(dt) {
    if (!_state || _state.player.dead) return;

    // Decay
    _sv.faim = Math.max(0, _sv.faim - HUNGER_DECAY * dt);
    _sv.soif = Math.max(0, _sv.soif - THIRST_DECAY * dt);
    _sv.endurance = Math.min(100, _sv.endurance + 8 * dt);
    if (_inWater) _sv.soif = Math.min(100, _sv.soif + 1.8 * dt);

    // Progression de l'infection
    if (_sv.infection > 0) {
      _sv.infection = Math.min(100, _sv.infection + INFECT_PROGRESS * dt);
      ZS.UI.setInfection(_sv.infection);
      if (_sv.infection >= 100 && !_state.player.dead) {
        _state.player.health = 0;
        _state.player.dead   = true;
        ZS.UI.setHealth(0);
        ZS.Network?.sendDied?.();
        ZS.UI.showDeath(_state.player.kills);
      }
    }

    // Dégâts sur le temps
    let dmg = 0;
    if (_sv.saignement) dmg += BLEED_DMG     * dt;
    if (_sv.faim  <= 0) dmg += STARVE_DMG    * dt;
    if (_sv.soif  <= 0) dmg += DEHYDRATE_DMG * dt;

    if (dmg > 0) {
      const p = _state.player;
      p.health = Math.max(0, p.health - dmg);
      ZS.UI.setHealth(Math.floor(p.health));
      if (p.health <= 0 && !p.dead) {
        p.dead = true;
        ZS.Network?.sendDied?.();
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

    // Synchro serveur de l'état de survie (toutes les ~3 s)
    _syncTimer += dt;
    if (_syncTimer >= 3) { _syncTimer = 0; _syncServer(); }
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
      const maxHp = ZS.Inventory?.getMaxHealth?.() || 100;
      p.health = Math.min(maxHp, p.health + (def.soin_sante || 0));   // armure → peut dépasser 100
      ZS.UI.setHealth(Math.floor(p.health), maxHp);
      if (def.stoppe_saignement) _sv.saignement = false;
      if (def.guerit_infection)  { _sv.infection = 0; ZS.UI.setInfection(0); }
      ZS.UI.showNotif('+' + def.soin_sante + ' HP');
    }

    _flush();
    _save();
    ZS.Inventory.consumeOne(type);
  }

  // Appelé quand un zombie frappe le joueur
  function applyDamage(dmg) {
    let changed = false;
    // Chance de saignement
    if (!_sv.saignement && dmg >= 10 && Math.random() < 0.25) {
      _sv.saignement = true;
      changed = true;
    }
    // Chance d'infection
    if (Math.random() < INFECT_BITE_CHANCE) {
      const gain = 8 + Math.random() * 12; // +8 à +20 pts
      _sv.infection = Math.min(100, _sv.infection + gain);
      ZS.UI.setInfection(_sv.infection);
      ZS.UI.showNotif('⚠ Morsure infectée !');
      changed = true;
    }
    if (changed) ZS.UI.setStatus(_sv.saignement, _sv.infection > 0);
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
  ZS.Survival = { init, tick, useItem, applyDamage, reset, get, loadFromSave, setWaterContact };
}());
