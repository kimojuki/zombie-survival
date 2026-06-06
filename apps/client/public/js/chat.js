// Chat multijoueur — Entrée / T pour ouvrir, Entrée pour envoyer
(function () {
  'use strict';

  const MAX_LINES = 8;
  const CHAT_MAX = 200;
  const SEND_COOLDOWN_MS = 150;
  const SEND_ACK_MS = 4000;

  let _socket = null;
  let _open = false;
  let _username = '';
  let _selfId = null;
  let _serverChat = true;
  let _lastSendAt = 0;

  function _els() {
    return {
      wrap: document.getElementById('chat-wrap'),
      log: document.getElementById('chat-log'),
      row: document.getElementById('chat-input-row'),
      input: document.getElementById('chat-input'),
      mobileBtn: document.getElementById('chat-btn'),
      sendBtn: document.getElementById('chat-send-btn'),
    };
  }

  function _panelOpen(id, displayVal) {
    const el = document.getElementById(id);
    if (!el) return false;
    const d = el.style.display;
    if (displayVal) return d === displayVal;
    return d && d !== 'none';
  }

  function _canOpen() {
    if (ZS.Rcon?.isOpen?.()) return false;
    if (_panelOpen('inv-panel', 'flex')) return false;
    if (_panelOpen('craft-panel')) return false;
    if (_panelOpen('map-overlay', 'flex')) return false;
    const death = document.getElementById('death-screen');
    if (death?.classList.contains('show')) return false;
    return true;
  }

  function _selfSocketId() {
    return _selfId || _socket?.id || null;
  }

  function _addLine(text, cls) {
    const { log } = _els();
    if (!log) return;
    const line = document.createElement('div');
    line.className = 'chat-line' + (cls ? ' ' + cls : '');
    line.textContent = text;
    log.appendChild(line);
    while (log.childElementCount > MAX_LINES) log.removeChild(log.firstElementChild);
    log.scrollTop = log.scrollHeight;
  }

  function _addMessage(from, message, self) {
    _addLine(`${from}: ${message}`, self ? 'chat-self' : 'chat-other');
  }

  function _focusInput() {
    const { input } = _els();
    if (!input) return;
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      _syncChatViewport();
    });
  }

  function _isMobile() {
    return document.body.classList.contains('mode-mobile');
  }

  function _resetChatViewport() {
    const { wrap } = _els();
    if (!wrap) return;
    wrap.style.bottom = '';
    document.body.classList.remove('chat-keyboard');
  }

  /** Remonte le chat au-dessus du clavier virtuel (visualViewport). */
  function _syncChatViewport() {
    const { wrap } = _els();
    if (!wrap || !_isMobile() || !_open) {
      _resetChatViewport();
      return;
    }
    const vp = window.visualViewport;
    if (!vp) return;

    const margin = 10;
    const baseBottom = 58;
    const kbInset = Math.max(0, window.innerHeight - vp.offsetTop - vp.height);
    wrap.style.bottom = `${baseBottom + kbInset + margin}px`;
    document.body.classList.toggle('chat-keyboard', kbInset > 36);
  }

  function _resumeGameInput() {
    if (document.body.classList.contains('mode-mobile')) return;
    if (ZS.Rcon?.isOpen?.()) return;
    const resume = () => {
      if (typeof ZS.requestPointerLock === 'function') ZS.requestPointerLock();
    };
    if (document.pointerLockElement) requestAnimationFrame(resume);
    else resume();
  }

  function open() {
    if (!_canOpen()) return;
    const { row, input } = _els();
    if (!row || !input) return;
    if (_open) {
      _focusInput();
      return;
    }
    _open = true;
    document.body.classList.add('chat-open');
    if (document.pointerLockElement) document.exitPointerLock();
    row.hidden = false;
    input.value = '';
    _focusInput();
    _syncChatViewport();
  }

  function close() {
    const { row, input } = _els();
    _open = false;
    document.body.classList.remove('chat-open');
    if (row) row.hidden = true;
    if (input) input.blur();
    _resetChatViewport();
    _resumeGameInput();
  }

  function toggle() {
    if (_open) close();
    else open();
  }

  function send() {
    const { input } = _els();
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (!_socket?.connected) {
      _addLine('Pas connecté au serveur', 'chat-system');
      return;
    }
    if (!_serverChat) {
      _addLine('Chat indisponible — sur le serveur : git pull && pm2 restart zombie', 'chat-system');
      return;
    }

    const msg = text.slice(0, CHAT_MAX);
    input.value = '';
    _lastSendAt = Date.now();

    _addMessage(_username || 'Vous', msg, true);
    close();

    let answered = false;
    const timer = setTimeout(() => {
      if (answered) return;
      _addLine(
        'Serveur pas à jour — le Node tourne encore sans le chat. SSH : git pull && bash scripts/deploy-prod.sh',
        'chat-system'
      );
    }, SEND_ACK_MS);

    _socket.emit('chat', msg, (res) => {
      answered = true;
      clearTimeout(timer);
      if (res?.error) _addLine(res.error, 'chat-system');
    });
  }

  function onMessage(d) {
    if (!d?.message) return;
    const selfId = _selfSocketId();
    if (d.senderId && selfId && d.senderId === selfId) return;
    _addMessage(d.from || '?', d.message, d.senderId ? d.senderId === selfId : d.from === _username);
  }

  function _onInputKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      send();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    }
  }

  function _onGlobalKey(e) {
    if (e.defaultPrevented) return;
    if (Date.now() - _lastSendAt < SEND_COOLDOWN_MS) return;
    if (e.target?.id === 'chat-input') return;
    if (e.target?.closest?.('#chat-wrap input, #chat-wrap button')) return;
    if (_open) return;
    if (e.code !== 'Enter' && e.code !== 'KeyT') return;
    if (e.repeat && e.code === 'Enter') return;
    if (!_canOpen()) return;
    e.preventDefault();
    open();
  }

  function setUsername(name) {
    if (name) _username = name;
  }

  function setSelfId(id) {
    if (id) _selfId = id;
  }

  function setServerReady(enabled) {
    _serverChat = enabled !== false;
  }

  function init(socket) {
    _socket = socket;
    if (!_username) _username = localStorage.getItem('zombie_username') || '';

    const syncSelfId = () => {
      if (socket.id) _selfId = socket.id;
    };
    syncSelfId();
    socket.on('connect', syncSelfId);
    socket.on('chat-message', onMessage);

    const { mobileBtn, sendBtn, input, wrap } = _els();
    mobileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    sendBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      send();
    });

    input?.addEventListener('keydown', _onInputKey, true);
    input?.addEventListener('keyup', (e) => e.stopImmediatePropagation(), true);
    input?.addEventListener('focus', () => requestAnimationFrame(_syncChatViewport));
    input?.addEventListener('blur', () => {
      setTimeout(() => { if (!_open) _resetChatViewport(); }, 120);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', _syncChatViewport);
      window.visualViewport.addEventListener('scroll', _syncChatViewport);
    }
    window.addEventListener('resize', _syncChatViewport);

    wrap?.addEventListener('mousedown', (e) => e.stopPropagation());
    wrap?.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', _onGlobalKey, true);

    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((h) => {
        if (h?.chat === false) {
          _serverChat = false;
          _addLine('Chat désactivé sur ce serveur', 'chat-system');
        } else if (h?.chat !== true) {
          _addLine('Serveur Node pas redémarré — chat bloqué côté serveur', 'chat-system');
        }
      })
      .catch(() => {});

  }

  window.ZS = window.ZS || {};
  ZS.Chat = {
    init, open, close, toggle, send, onMessage, setUsername, setSelfId, setServerReady,
    isOpen: () => _open,
  };
}());
