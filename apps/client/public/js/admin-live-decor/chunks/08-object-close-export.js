// Status + export ZS — extrait de admin-live-decor.js (IIFE)
    _setStatus(msg, kind) {
      this._syncPlaceButtons();
      this._updateBannerPlace();
      const el = this._panel?.querySelector('#zs-ald-status');
      if (!el) return;
      const undoN = ZS.AdminDecorUndo?.count?.() || 0;
      const redoN = ZS.AdminDecorUndo?.redoCount?.() || 0;
      const suffix = (undoN > 0 ? ` · undo×${undoN}` : '') + (redoN > 0 ? ` · redo×${redoN}` : '');
      el.textContent = msg + suffix;
      el.className = 'status' + (kind ? ' ' + kind : '');
      const undoBtn = this._panel?.querySelector('#zs-ald-undo');
      if (undoBtn) undoBtn.disabled = undoN === 0;
      const redoBtn = this._panel?.querySelector('#zs-ald-redo');
      if (redoBtn) redoBtn.disabled = redoN === 0;
    },
  };

  window.ZS = window.ZS || {};
  ZS.AdminLiveDecor = AdminLiveDecor;
