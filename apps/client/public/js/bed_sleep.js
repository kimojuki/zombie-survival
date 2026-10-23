// Sommeil lit — regen PV progressive, coût faim/soif, réveil Espace.
(function () {
  'use strict';

  const BedSleep = {
    active: false,
    _decorId: null,
    _banner: null,

    isActive() {
      return this.active;
    },

    tryStart(decorId) {
      if (!decorId || this.active) return false;
      ZS.Network?.requestBedSleepStart?.(decorId, (res) => {
        if (res?.ok) this._enter(res);
        else ZS.UI?.showNotif?.(res?.error || 'Sommeil impossible');
      });
      return true;
    },

    onServerEnd(reason) {
      if (!this.active) return;
      this._exit(reason || 'wake');
    },

    tryWake() {
      if (!this.active) return false;
      ZS.Network?.requestBedSleepWake?.((res) => {
        if (res?.ok) this._exit('wake', res);
        else ZS.UI?.showNotif?.(res?.error || 'Réveil impossible');
      });
      return true;
    },

    _enter(res) {
      this.active = true;
      this._decorId = res.decorId || null;
      document.body.classList.add('bed-sleep-active');
      this._buildBanner();
      this._applyPose(res);
      ZS.UI?.showNotif?.('Sommeil — PV en hausse · faim/soif baissent · Espace = réveil');
    },

    _exit(reason, res) {
      this.active = false;
      this._decorId = null;
      document.body.classList.remove('bed-sleep-active');
      this._banner?.remove();
      this._banner = null;
      document.getElementById('zs-bed-sleep-banner')?.remove();
      this._applyStand(res);
      if (reason === 'damage') {
        ZS.UI?.showNotif?.('Réveillé — attaque !');
      }
    },

    _applyStand(res) {
      const st = window.ZS?._gameState;
      if (!st?.player) return;
      if (res && Number.isFinite(res.x)) {
        st.player.x = res.x;
        st.player.z = res.z;
        if (Number.isFinite(res.rotY)) {
          st.player.rotY = res.rotY;
          if (st.camera) st.camera.yaw = res.rotY;
        }
      }
      const px = st.player.x;
      const pz = st.player.z;
      const eyeH = 1.7;
      const gy = ZS.getStandHeight?.(px, pz, st.player.y)
        ?? ZS.getDecorGroundHeight?.(px, pz)
        ?? (ZS.getTerrainHeight ? ZS.getTerrainHeight(px, pz) : 0);
      st.player.y = (Number.isFinite(res?.y) ? res.y : gy + eyeH);
      const av = window.ZS?._localAvatar;
      if (av) av.visible = true;
    },

    _applyPose(res) {
      const st = window.ZS?._gameState;
      if (!st?.player || !Number.isFinite(res?.x)) return;
      st.player.x = res.x;
      st.player.y = res.y;
      st.player.z = res.z;
      if (Number.isFinite(res.rotY)) {
        st.player.rotY = res.rotY;
        if (st.camera) st.camera.yaw = res.rotY;
      }
      const av = window.ZS?._localAvatar;
      if (av) {
        av.visible = false;
      }
    },

    _buildBanner() {
      if (this._banner?.parent) return;
      const el = document.createElement('div');
      el.id = 'zs-bed-sleep-banner';
      el.innerHTML = [
        '<div class="zs-bed-sleep-inner">',
        '  <strong>Dormir</strong>',
        '  <span>PV ↑ · faim/soif ↓</span>',
        '  <span class="hint">Espace pour vous réveiller</span>',
        '</div>',
      ].join('');
      document.body.appendChild(el);
      this._banner = el;
    },
  };

  window.ZS = window.ZS || {};
  ZS.BedSleep = BedSleep;
}());
