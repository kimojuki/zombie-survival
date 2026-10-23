/** Compte invité — conversion en compte complet (menu ☰). */
(function () {
  'use strict';

  function isGuest() {
    return localStorage.getItem('zombie_is_guest') === '1';
  }

  function token() {
    return localStorage.getItem('zombie_token') || '';
  }

  async function upgradeAccount(username, password) {
    const res = await fetch('/api/auth/upgrade-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token(),
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Échec de l’enregistrement');
    localStorage.setItem('zombie_token', data.token);
    localStorage.setItem('zombie_username', data.username);
    localStorage.setItem('zombie_is_guest', '0');
    localStorage.setItem('zombie_guest_committed', '1');
    if (data.isAdmin != null) localStorage.setItem('zombie_is_admin', data.isAdmin ? '1' : '0');
    return data;
  }

  function openUpgradeDialog() {
    const wrap = document.createElement('div');
    wrap.className = 'guest-upgrade-overlay';
    wrap.innerHTML = `
      <div class="guest-upgrade-card" role="dialog" aria-labelledby="guest-upg-title">
        <h2 id="guest-upg-title">Créer un compte</h2>
        <p class="guest-upgrade-lead">Gardez votre progression et choisissez votre pseudo.</p>
        <label>Pseudo<input id="guest-upg-name" type="text" maxlength="50" autocomplete="username"></label>
        <label>Mot de passe<input id="guest-upg-pass" type="password" autocomplete="new-password"></label>
        <p class="guest-upgrade-err" id="guest-upg-err" role="alert"></p>
        <div class="guest-upgrade-actions">
          <button type="button" class="guest-upgrade-cancel">Annuler</button>
          <button type="button" class="guest-upgrade-submit">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('.guest-upgrade-cancel').addEventListener('click', close);

    wrap.querySelector('.guest-upgrade-submit').addEventListener('click', async () => {
      const errEl = wrap.querySelector('#guest-upg-err');
      const name = wrap.querySelector('#guest-upg-name').value.trim();
      const pass = wrap.querySelector('#guest-upg-pass').value;
      errEl.textContent = '';
      if (name.length < 3) {
        errEl.textContent = 'Pseudo : 3 caractères minimum';
        return;
      }
      if (pass.length < 6) {
        errEl.textContent = 'Mot de passe : 6 caractères minimum';
        return;
      }
      try {
        const data = await upgradeAccount(name, pass);
        close();
        ZS.UI?.showNotif?.(`Compte créé — bienvenue ${data.username}`);
        if (ZS.Chat?.setUsername) ZS.Chat.setUsername(data.username);
      } catch (e) {
        errEl.textContent = e.message || 'Erreur';
      }
    });
  }

  function injectMenuEntry() {
    if (!isGuest()) return;
    const menu = document.getElementById('menu-list');
    if (!menu || menu.querySelector('[data-guest-upgrade]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-item menu-item-accent';
    btn.dataset.guestUpgrade = '1';
    btn.textContent = '⭐ Créer mon compte';
    btn.addEventListener('click', () => {
      ZS.onUiPanelClose?.();
      openUpgradeDialog();
    });
    menu.insertBefore(btn, menu.firstChild);
  }

  window.ZS = window.ZS || {};
  ZS.GuestAccount = { isGuest, openUpgradeDialog, injectMenuEntry, upgradeAccount };
})();
