// Config + saisie points
const PANEL_ID = 'zs-admin-live-roads';
  const PLACE_DIST = 120;
  const TYPE_COLORS = {
    dirt: 0x9a7a52,
    path: 0x7a9a5a,
    trail: 0x6a8a48,
    asphalt: 0x555555,
  };

  function _scene() {
    return ZS._gfxRuntime?.scene || null;
  }

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminAuth?.hasPerm?.('decor.edit')
      || ZS.AdminHub?.hasPerm?.('decor.edit')
      || localStorage.getItem('zombie_is_admin') === '1';
  }

  function _pickGround() {
    return ZS.pickAdminDecorPlacement?.(PLACE_DIST) || null;
  }

  const AdminLiveRoads = {
    active: false,
    _panel: null,
    _banner: null,
    _roads: [],
    _draftPts: [],
    _draftLabel: '',
    _draftWidth: 2.6,
    _draftType: 'dirt',
    _draftSmooth: true,
    _draftVisual: true,
    _draftBarriers: false,
    _placing: false,
    _selectedId: null,
    _editingId: null,
    _selectedPtIdx: -1,
    _previewRoot: null,
    _busy: false,

    isActive() { return this.active; },
    isPlacing() { return this.active && this._placing; },

    async enter() {
      if (!_canUse()) {
        ZS.UI?.showNotif?.('Routes admin : droit decor.edit requis');
        return;
      }
      ZS.AdminLiveDecor?.exit?.();
      this.active = true;
      window.ZS._adminLiveRoadsActive = true;
      document.body.classList.add('admin-live-roads-active');
      this._buildPanel();
      this._buildBanner();
      await this._refreshList();
      this._startPlacing();
      this._setStatus('Souris libre dans le panel · clic sur le jeu = point · molette = largeur');
    },

    exit() {
      if (!this.active) return;
      this.active = false;
      window.ZS._adminLiveRoadsActive = false;
      document.body.classList.remove('admin-live-roads-active');
      this._placing = false;
      this._draftPts = [];
      this._selectedId = null;
      this._editingId = null;
      this._selectedPtIdx = -1;
      this._clearPreview();
      if (this._panel?.parent) this._panel.parent.removeChild(this._panel);
      this._panel = null;
      document.getElementById(PANEL_ID)?.remove();
      if (this._banner?.parent) this._banner.parent.removeChild(this._banner);
      this._banner = null;
      document.getElementById('zs-alr-banner')?.remove();
      ZS.onUiPanelClose?.();
    },

    tick() {
      if (!this.active || !this._placing) return;
      this._updateLivePreview();
    },

    tryPlaceOnClick() {
      if (!this.active) return false;
      if (!this._placing) this._startPlacing();
      const pt = _pickGround();
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.z)) {
        this._setStatus('Pas de sol sous le réticule — approchez-vous', 'warn');
        return true;
      }
      const x = Math.round(pt.x * 100) / 100;
      const z = Math.round(pt.z * 100) / 100;
      this._draftPts.push([x, z]);
      this._selectedPtIdx = this._draftPts.length - 1;
      this._renderPointList();
      this._updateLivePreview(true);
      this._setStatus(`${this._draftPts.length} point(s) — Entrée = enregistrer`);
      return true;
    },

    tryCancelOnRightClick() {
      if (!this.active || !this._placing) return false;
      if (this._draftPts.length) {
        this._draftPts.pop();
        this._selectedPtIdx = this._draftPts.length - 1;
        this._renderPointList();
        this._updateLivePreview(true);
        this._setStatus(this._draftPts.length
          ? `${this._draftPts.length} point(s)`
          : 'Aucun point — clic gauche pour commencer');
        return true;
      }
      return true;
    },

    tryFinishOnEnter() {
      if (!this.isPlacing() || this._draftPts.length < 2) {
        if (this.isPlacing()) this._setStatus('Au moins 2 points requis', 'warn');
        return false;
      }
      this._saveDraft();
      return true;
    },

    tryUndoPointOnBackspace() {
      if (!this.isPlacing() || !this._draftPts.length) return false;
      this._draftPts.pop();
      this._selectedPtIdx = this._draftPts.length - 1;
      this._renderPointList();
      this._updateLivePreview(true);
      return true;
    },

    onWheel(e) {
      if (!this.isPlacing()) return false;
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      this._draftWidth = Math.max(1, Math.min(16, this._draftWidth + delta));
      const wEl = this._panel?.querySelector('#zs-alr-width');
      if (wEl) wEl.value = String(Math.round(this._draftWidth * 10) / 10);
      this._updateLivePreview(true);
      this._setStatus(`Largeur ${this._draftWidth.toFixed(1)} m`);
      return true;
    },
