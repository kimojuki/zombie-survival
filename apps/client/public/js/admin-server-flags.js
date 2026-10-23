// Flags serveur — toggles F8 (zombies, loot, PvP, cycle auto).
(function () {
  'use strict';

  const FLAG_DEFS = [
    { key: 'autoDay', label: 'Cycle jour/nuit auto', icon: '🌓' },
    { key: 'zombieAI', label: 'IA zombies', icon: '🧟' },
    { key: 'zombieSpawn', label: 'Spawn zombies', icon: '💀' },
    { key: 'lootEnabled', label: 'Loot bâtiments', icon: '📦' },
    { key: 'pvp', label: 'PvP', icon: '⚔️' },
  ];

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminHub?.hasPerm?.('rcon') || ZS.AdminAuth?.hasPerm?.('rcon')
      || ZS.AdminHub?.hasPerm?.('decor.edit');
  }

  async function _fetchState() {
    const res = await fetch('/api/admin/world-state', {
      headers: { Authorization: 'Bearer ' + _token() },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'État serveur indisponible');
    return json;
  }

  async function _patchFlags(body) {
    const res = await fetch('/api/admin/server-flags', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + _token(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Échec mise à jour flags');
    return json;
  }

  function _syncPanel(parent, flags) {
    if (!parent || !flags) return;
    for (const def of FLAG_DEFS) {
      const inp = parent.querySelector(`[data-flag="${def.key}"]`);
      if (inp) inp.checked = !!flags[def.key];
    }
  }

  function openIn(container) {
    if (!container || !_canUse()) return;
    if (container.dataset.flagsBuilt === '1') {
      _fetchState().then((s) => _syncPanel(container, s.serverFlags)).catch(() => {});
      return;
    }
    container.dataset.flagsBuilt = '1';
    const rows = FLAG_DEFS.map((f) => (
      `<label class="admin-hub-awt-check"><input type="checkbox" data-flag="${f.key}"> ${f.icon} ${f.label}</label>`
    )).join('');
    container.innerHTML = [
      '<p class="admin-hub-section">Flags serveur (live)</p>',
      '<div class="admin-hub-flags">', rows, '</div>',
      '<p class="admin-hub-foot" id="admin-flags-status"></p>',
    ].join('');

    const status = container.querySelector('#admin-flags-status');
    const setStatus = (msg, err) => {
      if (status) {
        status.textContent = msg || '';
        status.style.color = err ? '#f88' : '';
      }
    };

    const refresh = () => {
      _fetchState()
        .then((s) => _syncPanel(container, s.serverFlags))
        .catch((e) => setStatus(e.message, true));
    };
    refresh();

    container.querySelectorAll('[data-flag]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const key = inp.dataset.flag;
        setStatus('Mise à jour…');
        try {
          const json = await _patchFlags({ [key]: inp.checked });
          _syncPanel(container, json.serverFlags);
          setStatus('Synchronisé');
          ZS.UI?.showNotif?.(`${key} = ${inp.checked ? 'ON' : 'OFF'}`);
        } catch (e) {
          setStatus(e.message, true);
          refresh();
        }
      });
    });
  }

  window.ZS = window.ZS || {};
  ZS.AdminServerFlags = { openIn };
}());
