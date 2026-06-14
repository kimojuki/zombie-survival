// Handoff + garde auth — extrait de game.js (async IIFE)
function _clearAuthSession() {
    ['zombie_token', 'zombie_username', 'zombie_is_admin', 'zombie_is_guest', 'zombie_guest_committed', 'zombie_spawn', 'zombie_health', 'zombie_kills']
      .forEach((k) => localStorage.removeItem(k));
  }

  function _storeAuthPayload(data) {
    localStorage.setItem('zombie_token', data.token);
    localStorage.setItem('zombie_username', data.username);
    localStorage.setItem('zombie_is_admin', data.isAdmin ? '1' : '0');
    localStorage.setItem('zombie_is_guest', data.guest ? '1' : '0');
    localStorage.setItem('zombie_guest_committed', data.guestCommitted ? '1' : '0');
    if (data.role) localStorage.setItem('zs_role', data.role);
    if (data.roleLabel) localStorage.setItem('zs_role_label', data.roleLabel);
    if (data.permissions) localStorage.setItem('zs_permissions', JSON.stringify(data.permissions));
    if (data.serverRole) localStorage.setItem('zombie_server_role', data.serverRole);
    if (data.spawn) localStorage.setItem('zombie_spawn', JSON.stringify(data.spawn));
    if (data.health != null) localStorage.setItem('zombie_health', data.health);
    if (data.kills != null) localStorage.setItem('zombie_kills', data.kills);
  }

  // ── Handoff standalone (auth-server → game JWT) ───────────────────────────
  const _handoffCode = new URLSearchParams(window.location.search).get('handoff');
  if (_handoffCode) {
    window.ZS?.Loading?.setPhase?.('auth', 0, 'Connexion au serveur…', '');
    ZS.LoadLog?.stepStart?.('auth');
    try {
      const serverId = localStorage.getItem('zombie_server_id') || 'prod';
      const hres = await fetch('/api/auth/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: _handoffCode, serverId }),
      });
      const hdata = await hres.json().catch(() => ({}));
      if (!hres.ok) {
        ZS.LoadLog?.stepEnd?.('auth', { ok: false, status: hres.status, handoff: true });
        _clearAuthSession();
        window.location.href = '/play.html';
        return;
      }
      _storeAuthPayload(hdata);
      history.replaceState(null, '', '/game.html');
      window.ZS?.Loading?.setPhase?.('auth', 1, 'Compte vérifié', '');
      ZS.LoadLog?.stepEnd?.('auth', { ok: true, handoff: true });
    } catch {
      _clearAuthSession();
      window.location.href = '/play.html';
      return;
    }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = localStorage.getItem('zombie_token');
  if (!token) { window.location.href = '/play.html'; return; }

  window.ZS?.Loading?.setPhase?.('auth', 0, 'Vérification du compte…', '');
  ZS.LoadLog?.stepStart?.('auth');

  try {
    const authRes = await fetch('/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!authRes.ok) {
      ZS.LoadLog?.stepEnd?.('auth', { ok: false, status: authRes.status });
      _clearAuthSession();
      window.location.href = '/';
      return;
    }
    window.ZS?.Loading?.setPhase?.('auth', 1, 'Compte vérifié', '');
    ZS.LoadLog?.stepEnd?.('auth', { ok: true });
  } catch {
    // Tunnel/serveur en cours de démarrage — on laisse Socket.io retenter.
    window.ZS?.Loading?.setPhase?.('auth', 0.5, 'Compte…', 'Serveur lent — connexion directe');
    ZS.LoadLog?.stepEnd?.('auth', { ok: false, fallback: true });
  }
