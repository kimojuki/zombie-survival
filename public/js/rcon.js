// Console RCON admin in-game (desktop ` / F2 + menu mobile admin)
(function () {
  'use strict';

  let _socket = null;
  let _open = false;
  let _authed = false;
  let _configured = false;
  let _isAdmin = false;
  let _history = [];
  let _histIdx = -1;

  const _els = {};

  function _isMobile() {
    if (window.ZS?._isMobile) return true;
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    if (navigator.maxTouchPoints > 0 && window.innerWidth < 1280) return true;
    return /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent);
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _print(text, cls) {
    if (!_els.log) return;
    const line = document.createElement('div');
    line.className = 'rcon-line' + (cls ? ' ' + cls : '');
    line.innerHTML = _esc(text);
    _els.log.appendChild(line);
    _els.log.scrollTop = _els.log.scrollHeight;
  }

  function _releasePointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function _focusInput() {
    if (!_els.input) return;
    _els.input.disabled = false;
    _els.input.readOnly = false;
    requestAnimationFrame(() => {
      _els.input.focus({ preventScroll: true });
    });
  }

  function _setOpen(on) {
    _open = on;
    document.body.classList.toggle('rcon-open', on);
    if (_els.panel) {
      _els.panel.style.display = on ? 'flex' : 'none';
      _els.panel.classList.toggle('rcon-mobile', _isMobile());
    }
    if (on) {
      _releasePointerLock();
      _focusInput();
      if (_configured && !_authed) _showAuth();
    } else if (_els.input) {
      _els.input.blur();
    }
  }

  function _showAuth() {
    _print('── Connexion admin ──', 'rcon-warn');
    _print('Tapez: help', 'rcon-dim');
  }

  function _emitAck(event, payload, onResult) {
    if (!_socket) {
      onResult(new Error('Pas de connexion — attendez le chargement du monde'));
      return;
    }
    const sock = _socket.timeout ? _socket.timeout(8000) : _socket;
    sock.emit(event, payload, (err, res) => {
      if (err) {
        onResult(new Error('Timeout serveur'));
        return;
      }
      onResult(null, res);
    });
  }

  function _runLocal(cmd) {
    const c = cmd.trim().toLowerCase();
    if (c === 'clear') {
      if (_els.log) _els.log.innerHTML = '';
      return true;
    }
    if (c === 'close' || c === 'exit' || c === 'quit') {
      _setOpen(false);
      return true;
    }
    return false;
  }

  function _setAuthed(ok) {
    _authed = ok;
    _focusInput();
  }

  function _submitInput() {
    if (!_els.input) return;
    const v = _els.input.value;
    _els.input.value = '';
    _exec(v);
  }

  function _exec(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    _history.push(trimmed);
    _histIdx = _history.length;
    _print('> ' + trimmed, 'rcon-cmd');

    if (_runLocal(trimmed)) return;

    if (trimmed.toLowerCase().startsWith('auth ')) {
      const pw = trimmed.slice(5).trim();
      _emitAck('rcon-auth', pw, (err, res) => {
        if (err) { _print(err.message, 'rcon-err'); return; }
        if (res?.ok) {
          _setAuthed(true);
          _print('Authentification réussie. Tapez "help".', 'rcon-ok');
        } else {
          _print(res?.error || 'Échec auth', 'rcon-err');
        }
      });
      return;
    }

    if (!_configured) {
      _print('RCON non configuré sur ce serveur.', 'rcon-err');
      return;
    }

    if (!_authed) {
      _print('Non autorisé — compte admin requis.', 'rcon-err');
      return;
    }

    _emitAck('rcon', trimmed, (err, res) => {
      if (err) { _print(err.message, 'rcon-err'); return; }
      if (!res) { _print('Réponse vide du serveur', 'rcon-err'); return; }
      const cls = res.ok ? 'rcon-ok' : 'rcon-err';
      const lines = res.lines || [];
      if (!lines.length) _print(res.ok ? 'OK' : 'Erreur', cls);
      else for (const line of lines) _print(line, cls);
    });
  }

  function _buildUI() {
    if (_els.panel) return;
    const panel = document.createElement('div');
    panel.id = 'rcon-panel';
    panel.innerHTML = `
      <div class="rcon-header">
        <span class="rcon-title">Console dev</span>
        <span class="rcon-hint" id="rcon-hint"></span>
        <button type="button" id="rcon-close" title="Fermer">✕</button>
      </div>
      <div id="rcon-log" class="rcon-log"></div>
      <div class="rcon-input-row">
        <span class="rcon-prompt">&gt;</span>
        <input id="rcon-input" type="text" inputmode="text" enterkeyhint="send"
          autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
          placeholder="help, day, status, players…" />
        <button type="button" id="rcon-send" class="rcon-send-btn">⏎</button>
      </div>
    `;
    document.body.appendChild(panel);

    _els.panel = panel;
    _els.log = document.getElementById('rcon-log');
    _els.input = document.getElementById('rcon-input');
    _els.hint = document.getElementById('rcon-hint');

    const stop = (e) => e.stopPropagation();
    panel.addEventListener('mousedown', stop);
    panel.addEventListener('touchstart', stop, { passive: true });
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target !== _els.input && e.target.id !== 'rcon-send') _focusInput();
    });

    document.getElementById('rcon-close').addEventListener('click', () => _setOpen(false));

    document.getElementById('rcon-send').addEventListener('click', (e) => {
      e.stopPropagation();
      _submitInput();
    });

    _els.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        _setOpen(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        _submitInput();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_histIdx > 0) {
          _histIdx--;
          _els.input.value = _history[_histIdx] || '';
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_histIdx < _history.length - 1) {
          _histIdx++;
          _els.input.value = _history[_histIdx] || '';
        } else {
          _histIdx = _history.length;
          _els.input.value = '';
        }
        return;
      }
    });

    _els.input.addEventListener('keyup', (e) => e.stopPropagation());
  }

  function _updateHint() {
    if (!_els.hint) return;
    _els.hint.textContent = _isMobile()
      ? 'Menu ☰ ou ✕ pour fermer'
      : 'Échap, \` ou F2 pour fermer';
  }

  function _clientIsAdmin() {
    if (_isAdmin && _configured) return true;
    return localStorage.getItem('zombie_is_admin') === '1';
  }

  function refreshMenu() {
    const btn = document.getElementById('menu-console');
    if (!btn) return;
    btn.classList.toggle('menu-console-hidden', !_clientIsAdmin());
  }

  function open() {
    if (!_clientIsAdmin()) return;
    if (!_els.panel) _buildUI();
    if (!_configured) _configured = true;
    if (!_authed) _authed = true;
    _setOpen(true);
  }

  function toggle() {
    if (!_els.panel) _buildUI();
    _setOpen(!_open);
  }

  function init(socket, gameInit) {
    _socket = socket;
    _buildUI();
    _isAdmin = !!(gameInit?.isAdmin || gameInit?.rconPreAuth);
    _configured = !!gameInit?.rconEnabled;
    _authed = !!(gameInit?.rconPreAuth || gameInit?.isAdmin);

    if (localStorage.getItem('zombie_is_admin') === '1') {
      _isAdmin = true;
      _configured = true;
      _authed = true;
    }

    if (_els.log) _els.log.innerHTML = '';
    _updateHint();
    refreshMenu();

    if (!_configured) {
      if (gameInit?.username) {
        _print(`Compte: ${gameInit.username} — pas admin RCON`, 'rcon-warn');
      } else {
        _print('Console réservée aux administrateurs.', 'rcon-warn');
      }
      return;
    }

    if (_authed) {
      _print(`Admin: ${gameInit?.username || '?'}. Tapez "help".`, 'rcon-ok');
    } else {
      _showAuth();
    }

    _print(_isMobile() ? 'Menu ☰ → Console dev' : 'Ouvrir/fermer : ` ou F2', 'rcon-dim');
  }

  function onFlags(flags) {
    if (!_open) return;
    _print(`[sync] autoday=${flags.autoDay} zombies=${flags.zombieAI} spawn=${flags.zombieSpawn}`, 'rcon-dim');
  }

  window.ZS = window.ZS || {};
  ZS.Rcon = { init, open, toggle, onFlags, refreshMenu, isOpen: () => _open, isAdmin: () => _isAdmin };
}());
