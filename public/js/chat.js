// Chat multijoueur — Entrée / T pour ouvrir, Entrée pour envoyer
(function () {
  'use strict';

  const MAX_LINES = 50;
  const CHAT_MAX = 200;

  let _socket = null;
  let _open = false;
  let _username = '';

  function _els() {
    return {
      wrap: document.getElementById('chat-wrap'),
      log: document.getElementById('chat-log'),
      row: document.getElementById('chat-input-row'),
      input: document.getElementById('chat-input'),
      toggle: document.getElementById('chat-toggle'),
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

  function open() {
    if (!_canOpen()) return;
    const { row, input } = _els();
    if (!row || !input) return;
    _open = true;
    document.body.classList.add('chat-open');
    if (document.pointerLockElement) document.exitPointerLock();
    row.hidden = false;
    input.value = '';
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function close() {
    const { row, input } = _els();
    _open = false;
    document.body.classList.remove('chat-open');
    if (row) row.hidden = true;
    if (input) input.blur();
  }

  function toggle() {
    if (_open) close();
    else open();
  }

  function send() {
    const { input } = _els();
    if (!input || !_socket) return;
    const text = input.value.trim();
    if (!text) { close(); return; }
    _socket.emit('chat', text.slice(0, CHAT_MAX), (res) => {
      if (res?.error) _addLine(res.error, 'chat-system');
    });
    input.value = '';
    close();
  }

  function setUsername(name) {
    if (name) _username = name;
  }

  function init(socket) {
    _socket = socket;
    _username = localStorage.getItem('zombie_username') || '';

    socket.on('chat-message', (d) => {
      if (!d?.message) return;
      _addMessage(d.from || '?', d.message, d.from === _username);
    });

    const { toggle: btn, input } = _els();
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    input?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); send(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    input?.addEventListener('keyup', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
      if (e.target?.id === 'chat-input') return;
      if (_open) return;
      if (e.code !== 'Enter' && e.code !== 'KeyT') return;
      if (!_canOpen()) return;
      e.preventDefault();
      open();
    });

    _addLine('Entrée ou T — parler aux autres joueurs', 'chat-system');
  }

  window.ZS = window.ZS || {};
  ZS.Chat = { init, open, close, toggle, send, setUsername, isOpen: () => _open };
}());
