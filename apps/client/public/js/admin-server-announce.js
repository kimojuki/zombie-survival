// Annonces serveur globales — F8 Monde (équivalent RCON `say`).
(function () {
  'use strict';

  const MAX_LEN = 280;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminHub?.hasPerm?.('rcon') || ZS.AdminAuth?.hasPerm?.('rcon')
      || ZS.AdminHub?.hasPerm?.('decor.edit');
  }

  async function send(message) {
    const msg = String(message || '').trim();
    if (!msg) return { ok: false, error: 'Message vide' };
    if (msg.length > MAX_LEN) return { ok: false, error: `Max ${MAX_LEN} caractères` };
    const res = await fetch('/api/admin/announce', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + _token(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: msg }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Échec annonce');
    return json;
  }

  function mountHubSection(container) {
    if (!container || !_canUse()) return;
    if (container.dataset.annBuilt === '1') return;
    container.dataset.annBuilt = '1';
    container.innerHTML = [
      '<p class="admin-hub-section">Annonce serveur</p>',
      '<style>.admin-ann-row{display:flex;gap:6px;margin:6px 0}.admin-ann-row input{flex:1;padding:6px;background:#1a2230;color:#fff;border:1px solid #445;border-radius:4px}.admin-ann-row button{padding:6px 12px;background:#2a4a7a;color:#fff;border:none;border-radius:4px;cursor:pointer}</style>',
      '<div class="admin-ann-row">',
      `  <input type="text" id="admin-ann-input" maxlength="${MAX_LEN}" placeholder="Message global (tous les joueurs)…">`,
      '  <button type="button" id="admin-ann-send">Envoyer</button>',
      '</div>',
      '<p class="admin-hub-foot" id="admin-ann-status"></p>',
    ].join('');

    const input = container.querySelector('#admin-ann-input');
    const status = container.querySelector('#admin-ann-status');
    const setStatus = (t, err) => {
      if (status) {
        status.textContent = t || '';
        status.style.color = err ? '#f88' : '';
      }
    };

    const doSend = async () => {
      const msg = input?.value?.trim();
      if (!msg) {
        setStatus('Saisissez un message', true);
        return;
      }
      setStatus('Envoi…');
      try {
        await send(msg);
        if (input) input.value = '';
        setStatus('Annonce envoyée');
        ZS.UI?.showNotif?.('Annonce serveur envoyée');
      } catch (e) {
        setStatus(e.message, true);
      }
    };

    container.querySelector('#admin-ann-send')?.addEventListener('click', doSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSend();
      }
    });
  }

  window.ZS = window.ZS || {};
  ZS.AdminServerAnnounce = { send, mountHubSection, MAX_LEN };
}());
