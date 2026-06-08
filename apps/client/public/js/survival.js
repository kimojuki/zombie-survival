// Survival system — faim, soif, états (saignement, infection)
(function () {
  'use strict';

  // Faim/soif/infection : serveur authoritatif (survival-tick, 1 s)
  // Endurance : client (sprint local)

  const ENDURANCE_MAX = 100;
  const ENDURANCE_SPRINT_DRAIN = 22;
  const ENDURANCE_REGEN = 14;
  const ENDURANCE_REGEN_DELAY = 0.4;
  const ENDURANCE_MIN_SPRINT = 5;

  let _sprintRegenDelay = 0;

  const _sv = {
    faim: 80,
    soif: 80,
    endurance: 100,
    saignement: false,
    infection: 0,   // 0–100 ; à 100 = mort
    infectionPausedUntil: 0,
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
        // infection : serveur authoritatif (game-init / survival-update)
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
    _sv.infectionPausedUntil = Number(sv.infectionPausedUntil) || 0;
    if (sv.endurance != null) {
      _sv.endurance = Math.max(0, Math.min(ENDURANCE_MAX, Number(sv.endurance) || 0));
    }
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
      infectionPausedUntil: d.infectionPausedUntil != null
        ? Number(d.infectionPausedUntil) : _sv.infectionPausedUntil,
      endurance: d.endurance != null
        ? Math.max(0, Math.min(ENDURANCE_MAX, Number(d.endurance))) : _sv.endurance,
    };
    if (next.faim === _sv.faim && next.soif === _sv.soif
      && next.infection === _sv.infection && next.saignement === _sv.saignement
      && next.infectionPausedUntil === _sv.infectionPausedUntil
      && next.endurance === _sv.endurance) {
      return;
    }
    _sv.faim = next.faim;
    _sv.soif = next.soif;
    _sv.infection = next.infection;
    _sv.saignement = next.saignement;
    _sv.infectionPausedUntil = next.infectionPausedUntil;
    _sv.endurance = next.endurance;
    _flush();
  }

  function _syncServer() {}

  function tickEndurance(dt, { sprinting = false, moving = false } = {}) {
    if (!_state || _state.player.dead) return;
    if (sprinting && moving) {
      _sv.endurance = Math.max(0, _sv.endurance - ENDURANCE_SPRINT_DRAIN * dt);
      _sprintRegenDelay = ENDURANCE_REGEN_DELAY;
    } else if (_sprintRegenDelay > 0) {
      _sprintRegenDelay = Math.max(0, _sprintRegenDelay - dt);
    } else {
      _sv.endurance = Math.min(ENDURANCE_MAX, _sv.endurance + ENDURANCE_REGEN * dt);
    }
    ZS.UI.setEndurance?.(Math.floor(_sv.endurance));
  }

  function canSprint() {
    return _sv.endurance > ENDURANCE_MIN_SPRINT;
  }

  function addEndurance(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    _sv.endurance = Math.min(ENDURANCE_MAX, _sv.endurance + amount);
    ZS.UI.setEndurance?.(Math.floor(_sv.endurance));
  }

  function tick(dt) {
    if (!_state || _state.player.dead) return;
    if (_sv._timer > 0) {
      _sv._timer -= dt;
      if (_sv._timer <= 0) {
        _sv._timer = 0;
        _sv._pendingType = null;
      }
    }
    ZS.UI.setHunger(Math.floor(_sv.faim));
    ZS.UI.setThirst(Math.floor(_sv.soif));
    ZS.UI.setSurvivalVignette?.({
      faim: _sv.faim,
      soif: _sv.soif,
      saignement: _sv.saignement,
    });
    const antiviral = _sv.infectionPausedUntil > Date.now();
    if (_sv._lastAntiviralUi !== antiviral) {
      _sv._lastAntiviralUi = antiviral;
      ZS.UI.setStatus(_sv.saignement, _sv.infection > 0, antiviral);
    }
  }

  function _finishUseItemResponse(res, ctx) {
    ZS.ConsumeDebug?.log('use-item-res', {
      trace: ctx?.trace,
      res: res ? {
        ok: res.ok,
        err: res.err,
        trace: res.trace,
        debug: res.debug,
        foodAfter: ZS.ConsumeDebug?.foodFromInv?.(res.inventory),
        survival: res.survival,
      } : null,
      clientAfter: ZS.ConsumeDebug?.clientSnapshot?.(),
    });
    if (!res) {
      ZS.UI.showNotif('Consommation impossible (pas de réponse serveur)');
      ZS.Network?.requestInvDebugSnapshot?.(ctx?.trace, 'no-response');
      return;
    }
    if (res.ok === false) {
      if (res.inventory) ZS.Inventory?.applyAuthoritativeInv?.(res.inventory);
      ZS.ConsumeDebug?.compare?.(res.inventory, 'use-item-fail');
      ZS.Network?.requestInvDebugSnapshot?.(res.trace || ctx?.trace, `fail-${res.err || 'unknown'}`);
      ZS.UI.showNotif(`Consommation refusée (${res.err || 'erreur'}) — voir console [inv-debug]`);
      return;
    }
    if (res.survival) applyServerState(res.survival);
    if (res.inventory) ZS.Inventory?.applyAuthoritativeInv?.(res.inventory);
    ZS.ConsumeDebug?.compare?.(res.inventory, 'use-item-ok');
  }

  function useItem(type, slot) {
    const def = ZS.ITEMS[type];
    if (!def) return false;
    if (_sv._timer > 0) { ZS.UI.showNotif('Déjà en train d\'utiliser…'); return false; }
    if (def.category !== 'food' && def.category !== 'medical') return false;
    const loc = slot || ZS.Inventory?.findItemSlot?.(type);
    const trace = ZS.ConsumeDebug?.traceId?.('use');
    ZS.ConsumeDebug?.log('use-item-req', {
      trace,
      type,
      slot: loc,
      client: ZS.ConsumeDebug?.clientSnapshot?.(),
      survival: { faim: _sv.faim, soif: _sv.soif },
    });
    if (!loc) {
      ZS.UI.showNotif('Objet introuvable dans l\'inventaire');
      ZS.Network?.requestInvDebugSnapshot?.(trace, 'client-no-slot');
      return false;
    }
    const dur = def.category === 'medical' ? (def.temps_utilisation || 1.5) : 0.5;
    _sv._timer = dur;
    _sv._pendingType = type;
    ZS.UI.showNotif(def.category === 'medical' ? 'Soin en cours…' : 'Consommation…');
    ZS.Network?.requestUseItem?.(loc.zone, loc.idx, type, (res) => {
      _finishUseItemResponse(res, { trace, type, loc });
    }, trace);
    setTimeout(() => {
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
    _sv.saignement = false; _sv.infection = 0; _sv.infectionPausedUntil = 0;
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
    ZS.UI.setEndurance?.(Math.floor(_sv.endurance));
    const antiviral = _sv.infectionPausedUntil > Date.now();
    ZS.UI.setStatus(_sv.saignement, _sv.infection > 0, antiviral);
  }

  function _save() {
    try {
      localStorage.setItem('zombie_survival', JSON.stringify({
        faim: _sv.faim, soif: _sv.soif,
        saignement: _sv.saignement,
      }));
    } catch {}
  }

  window.ZS = window.ZS || {};
  ZS.Survival = {
    init, tick, tickEndurance, canSprint, addEndurance,
    useItem, applyDamage, reset, get, loadFromSave, setWaterContact, applyServerState,
  };
}());
