// Bloque les raccourcis navigateur bloquables en jeu (F5, Ctrl+R…).
// Ctrl+W / Ctrl+T : réservés par Chrome — non interceptables en JS (accroupi = touche C sur PC).
(function () {
  'use strict';

  let _active = true;

  const TEXT_EDIT_CODES = new Set(['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyY']);

  function _mod(e) {
    return e.ctrlKey || e.metaKey;
  }

  function _isTextField(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag !== 'INPUT') return false;
    const type = (el.type || 'text').toLowerCase();
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(type);
  }

  function _allowsTextShortcut(e) {
    if (!_isTextField(e.target)) return false;
    if (!_mod(e) || e.altKey) return false;
    return TEXT_EDIT_CODES.has(e.code);
  }

  /** Raccourcis que le navigateur laisse parfois annuler (pas Ctrl+W/T/N). */
  function _isBrowserShortcut(e) {
    if (e.code === 'F5') return true;
    if (e.code === 'F3') return true;
    if (e.code === 'F6') return true;

    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      return true;
    }

    if (!_mod(e)) return false;

    switch (e.code) {
      case 'KeyR':
      case 'KeyL':
      case 'KeyF':
      case 'KeyP':
      case 'KeyS':
      case 'KeyH':
      case 'KeyJ':
      case 'KeyD':
      case 'KeyG':
        return true;
      default:
        return false;
    }
  }

  function _onKeyDown(e) {
    if (!_active) return;
    if (!_isBrowserShortcut(e)) return;
    if (_allowsTextShortcut(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  window.addEventListener('keydown', _onKeyDown, true);

  window.ZS = window.ZS || {};
  ZS.browserShortcutsGuard = {
    enable() {
      _active = true;
    },
    disable() {
      _active = false;
    },
    isActive: () => _active,
  };
}());
