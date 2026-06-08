// Debug inventaire / consommation — logs corrélés client ↔ serveur via traceId
(function () {
  'use strict';

  const TAG = '[inv-debug]';
  let _seq = 0;
  let _enabled = true;

  function traceId(prefix) {
    return `${prefix || 'c'}${Date.now().toString(36)}-${++_seq}`;
  }

  function _foodFromInv(data) {
    if (!data) return [];
    const out = [];
    const scan = (zone, arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((s, idx) => {
        if (s?.type?.startsWith('food_')) out.push({ zone, idx, type: s.type, qty: s.qty || 1 });
      });
    };
    if (Array.isArray(data)) {
      scan('hotbar', data);
      return out;
    }
    scan('hotbar', data.hotbar);
    scan('bag', data.bag);
    return out;
  }

  function clientSnapshot() {
    const snap = ZS.Inventory?.getInvSnapshot?.();
    if (!snap) return { ok: false, reason: 'Inventory not ready' };
    const hotbar = (snap.hotbar || []).map((s, idx) => (
      s?.type ? { idx, type: s.type, qty: s.qty || 1 } : { idx, type: null }
    ));
    const bag = (snap.bag || []).map((s, idx) => (
      s?.type ? { idx, type: s.type, qty: s.qty || 1 } : { idx, type: null }
    ));
    const active = ZS.Inventory?.getActiveItem?.();
    return {
      ok: true,
      hotbar,
      bag,
      bagLen: bag.length,
      food: _foodFromInv(snap),
      activeSlot: active ? { type: active.type, qty: active.qty || 1 } : null,
    };
  }

  function log(phase, data) {
    if (!_enabled) return;
    const payload = { phase, t: Date.now(), ...data };
    console.info(TAG, phase, payload);
    try {
      const buf = JSON.parse(localStorage.getItem('zs_inv_debug') || '[]');
      buf.push(payload);
      while (buf.length > 80) buf.shift();
      localStorage.setItem('zs_inv_debug', JSON.stringify(buf));
    } catch { /* ignore */ }
  }

  function _foodSig(list) {
    const m = {};
    for (const s of list || []) {
      if (!s?.type) continue;
      m[s.type] = (m[s.type] || 0) + (s.qty || 1);
    }
    return m;
  }

  function compare(serverInv, label) {
    const client = clientSnapshot();
    const serverFood = _foodFromInv(serverInv);
    const clientFood = client.food || [];
    const slotMatch = JSON.stringify(serverFood) === JSON.stringify(clientFood);
    const sigMatch = JSON.stringify(_foodSig(serverFood)) === JSON.stringify(_foodSig(clientFood));
    const row = {
      label: label || 'compare',
      trace: traceId('cmp'),
      serverFood,
      clientFood,
      match: sigMatch,
      slotMatch,
      foodSig: { server: _foodSig(serverFood), client: _foodSig(clientFood) },
      client,
    };
    log('compare', row);
    if (!sigMatch) {
      console.warn(TAG, 'MISMATCH nourriture (types/qty)', row);
    } else if (!slotMatch) {
      log('compare-slot-offset', { label, serverFood, clientFood });
    }
    return row;
  }

  function dump() {
    const client = clientSnapshot();
    const history = JSON.parse(localStorage.getItem('zs_inv_debug') || '[]');
    const out = { client, history };
    console.info(TAG, 'dump', out);
    return out;
  }

  function setEnabled(v) {
    _enabled = !!v;
    log('debug-toggle', { enabled: _enabled });
  }

  window.ZS = window.ZS || {};
  function dumpWithServer(reason) {
    dump();
    ZS.Network?.requestInvDebugSnapshot?.(traceId('manual'), reason || 'console-dump');
  }

  ZS.ConsumeDebug = {
    traceId,
    log,
    compare,
    dump,
    dumpWithServer,
    clientSnapshot,
    foodFromInv: _foodFromInv,
    setEnabled,
    TAG,
  };

  log('init', {
    msg: 'ConsumeDebug actif',
    help: 'Filtre console: inv-debug | ZS.ConsumeDebug.dump() | ZS.ConsumeDebug.dumpWithServer()',
  });

  (async () => {
    try {
      const res = await fetch('/api/health');
      const h = await res.json();
      const clientV = window.__ZS_CLIENT_VERSION || '';
      log('server-health', {
        ok: h.ok,
        invDebugBuild: h.invDebugBuild,
        clientVersion: clientV,
        serverClientVersion: h.clientVersion,
      });
      if (!h.invDebugBuild) {
        console.warn(TAG, 'Serveur Node PAS REDÉMARRÉ — /api/health sans invDebugBuild. Arrêter le process node:3000 puis npm run dev:server', {
          client: clientV,
          uptime: h.uptime,
          commit: h.commit,
        });
        ZS.UI?.showNotif?.('Serveur pas redémarré — npm run dev:server');
      }
      if (clientV && h.clientVersion && h.clientVersion !== clientV) {
        console.warn(TAG, 'CLIENT CACHE — Ctrl+F5 (client ≠ clientVersion serveur)', {
          browser: clientV,
          serverReads: h.clientVersion,
        });
      }
    } catch (err) {
      log('server-health-fail', { err: String(err?.message || err) });
    }
  })();
}());
