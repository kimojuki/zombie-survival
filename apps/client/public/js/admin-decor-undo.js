// Undo / redo admin décor — piles (10 actions).
(function () {
  'use strict';

  const MAX = 10;
  let _stack = [];
  let _redo = [];

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _headers() {
    return {
      Authorization: 'Bearer ' + _token(),
      'Content-Type': 'application/json',
    };
  }

  function clear() {
    _stack = [];
    _redo = [];
  }

  function count() {
    return _stack.length;
  }

  function redoCount() {
    return _redo.length;
  }

  function hasUndo() {
    return _stack.length > 0;
  }

  function hasRedo() {
    return _redo.length > 0;
  }

  function describe() {
    if (!_stack.length) return '';
    const a = _stack[_stack.length - 1].undo;
    const labels = { create: 'création', delete: 'suppression', patch: 'modification', storage: 'coffre', batch_patch: 'lot' };
    const n = _stack.length;
    return `${labels[a.type] || a.type}${n > 1 ? ` (${n} en pile)` : ''}`;
  }

  function _pushEntry(undo, redo) {
    _stack.push({ undo, redo });
    while (_stack.length > MAX) _stack.shift();
    _redo = [];
  }

  function pushCreate(id) {
    _pushEntry(
      { type: 'create', id },
      null,
    );
  }

  function pushDelete(item) {
    if (!item?.id) return;
    const snap = JSON.parse(JSON.stringify(item));
    _pushEntry(
      { type: 'delete', item: snap },
      { type: 'restore', item: snap },
    );
  }

  function pushPatch(id, before, after) {
    if (!id || !before || !Object.keys(before).length) return;
    const aft = after && Object.keys(after).length ? { ...after } : null;
    _pushEntry(
      { type: 'patch', id, before: { ...before } },
      aft ? { type: 'patch', id, before: aft } : null,
    );
  }

  function pushStorage(id, beforeStorage, afterStorage) {
    if (!id) return;
    const before = Array.isArray(beforeStorage) ? JSON.parse(JSON.stringify(beforeStorage)) : [];
    const after = Array.isArray(afterStorage) ? JSON.parse(JSON.stringify(afterStorage)) : before;
    _pushEntry(
      { type: 'storage', id, before },
      { type: 'storage', id, before: after },
    );
  }

  function pushBatchPatch(moves) {
    if (!moves?.length) return;
    const undo = { type: 'batch_patch', moves: moves.map((m) => ({ id: m.id, before: { ...m.before } })) };
    const redo = {
      type: 'batch_patch',
      moves: moves.map((m) => ({ id: m.id, before: { ...m.after } })),
    };
    _pushEntry(undo, redo);
  }

  async function _apply(action) {
    const headers = _headers();
    if (action.type === 'create') {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(action.id)}`, {
        method: 'DELETE',
        headers: { Authorization: headers.Authorization },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec');
      return { ok: true, message: 'Création annulée' };
    }
    if (action.type === 'delete') {
      const res = await fetch('/api/admin/decor/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ item: action.item }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec restauration');
      return { ok: true, message: 'Suppression annulée', item: json.item };
    }
    if (action.type === 'restore') {
      const res = await fetch('/api/admin/decor/restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({ item: action.item }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec restauration');
      return { ok: true, message: 'Décor restauré', item: json.item };
    }
    if (action.type === 'patch') {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(action.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ patch: action.before }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec patch');
      return { ok: true, message: 'Modification appliquée', item: json.item };
    }
    if (action.type === 'storage') {
      const res = await fetch(`/api/admin/decor/${encodeURIComponent(action.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ patch: { storage: action.before } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec coffre');
      return { ok: true, message: 'Coffre mis à jour', item: json.item };
    }
    if (action.type === 'batch_patch') {
      let lastItem = null;
      for (const m of action.moves) {
        const res = await fetch(`/api/admin/decor/${encodeURIComponent(m.id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ patch: m.before }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `Échec ${m.id}`);
        if (json.item) lastItem = json.item;
      }
      return { ok: true, message: `Lot ${action.moves.length} décor(s)`, item: lastItem };
    }
    throw new Error('Action inconnue');
  }

  async function undo() {
    if (!_stack.length) return { ok: false, error: 'Rien à annuler' };
    const entry = _stack.pop();
    try {
      const res = await _apply(entry.undo);
      if (entry.redo) _redo.push(entry);
      while (_redo.length > MAX) _redo.shift();
      return { ...res, remaining: _stack.length, redoRemaining: _redo.length };
    } catch (err) {
      _stack.push(entry);
      return { ok: false, error: err.message || 'Erreur undo' };
    }
  }

  async function redo() {
    if (!_redo.length) return { ok: false, error: 'Rien à refaire' };
    const entry = _redo.pop();
    if (!entry.redo) return { ok: false, error: 'Refaire indisponible pour cette action' };
    try {
      const res = await _apply(entry.redo);
      _stack.push(entry);
      return { ...res, remaining: _stack.length, redoRemaining: _redo.length };
    } catch (err) {
      _redo.push(entry);
      return { ok: false, error: err.message || 'Erreur redo' };
    }
  }

  window.ZS = window.ZS || {};
  ZS.AdminDecorUndo = {
    clear, count, redoCount, hasUndo, hasRedo, describe,
    pushCreate, pushDelete, pushPatch, pushStorage, pushBatchPatch,
    undo, redo,
  };
}());
