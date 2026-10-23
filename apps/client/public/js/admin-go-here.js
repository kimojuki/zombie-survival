// Téléportation admin — visez le sol, T ou « Aller ici » (sync serveur).
(function () {
  'use strict';

  const MAX_DIST = 120;
  const EYE_OFFSET = 1.7;
  let _busy = false;

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    if (ZS.AdminAuth?.hasPerm?.('decor.edit')) return true;
    if (ZS.AdminHub?.hasPerm?.('decor.edit')) return true;
    if (ZS.AdminAuth?.hasPerm?.('players.manage')) return true;
    if (ZS.AdminHub?.hasPerm?.('players.manage')) return true;
    return false;
  }

  function _pointerLocked() {
    const canvas = document.querySelector('canvas');
    return document.pointerLockElement === canvas;
  }

  function _blockedUi() {
    if (ZS.Chat?.isOpen?.()) return true;
    if (ZS.Rcon?.isOpen?.()) return true;
    if (ZS.AdminHub?.isOpen?.()) return true;
    if (ZS.StorageUI?.isOpen?.()) return true;
    if (ZS.SignUI?.isOpen?.()) return true;
    if (ZS.SleepLoot?.isOpen?.()) return true;
    const inv = document.getElementById('inv-panel');
    if (inv && inv.style.display === 'block') return true;
    return false;
  }

  const AdminGoHere = {
    canUse: _canUse,

    isReady() {
      return _canUse() && _pointerLocked() && !_blockedUi();
    },

    /** Point sous le réticule — position yeux joueur. */
    pickTarget(maxDist = MAX_DIST) {
      const pt = ZS.pickAdminDecorPlacement?.(maxDist);
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.z)) return null;
      const ground = ZS.getDecorGroundHeight
        ? ZS.getDecorGroundHeight(pt.x, pt.z)
        : pt.y;
      const eyeY = (Number.isFinite(ground) ? ground : pt.y) + EYE_OFFSET;
      const rotY = Number.isFinite(pt.rotY) ? pt.rotY : (ZS._camera?.rotation?.y ?? 0);
      return { x: pt.x, y: eyeY, z: pt.z, rotY };
    },

    async teleportTo(x, z, rotY) {
      if (!_canUse()) {
        ZS.UI?.showNotif?.('Téléportation : droits admin requis');
        return false;
      }
      if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
      if (_busy) return false;
      const ground = ZS.getDecorGroundHeight ? ZS.getDecorGroundHeight(x, z) : 0;
      const eyeY = (Number.isFinite(ground) ? ground : 0) + EYE_OFFSET;
      const body = {
        x,
        z,
        y: eyeY,
        rotY: Number.isFinite(rotY) ? rotY : (ZS._camera?.rotation?.y ?? 0),
      };
      _busy = true;
      try {
        const res = await fetch('/api/admin/teleport-here', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + _token(),
          },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Téléportation refusée');
        return true;
      } catch (err) {
        ZS.UI?.showNotif?.(err.message || 'Erreur téléportation');
        return false;
      } finally {
        _busy = false;
      }
    },

    async teleportToReticle() {
      if (!_canUse()) {
        ZS.UI?.showNotif?.('Téléportation : droits admin requis');
        return false;
      }
      if (_blockedUi()) {
        ZS.UI?.showNotif?.('Fermez les panneaux avant de vous téléporter');
        return false;
      }
      if (!_pointerLocked()) {
        ZS.requestPointerLock?.();
        ZS.UI?.showNotif?.('Visez le sol puis T ou « Aller ici »');
        return false;
      }
      if (_busy) return false;

      const target = this.pickTarget();
      if (!target) {
        ZS.UI?.showNotif?.('Aucun sol sous le réticule');
        return false;
      }

      _busy = true;
      try {
        const res = await fetch('/api/admin/teleport-here', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + _token(),
          },
          body: JSON.stringify(target),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Téléportation refusée');
        return true;
      } catch (err) {
        ZS.UI?.showNotif?.(err.message || 'Erreur téléportation');
        return false;
      } finally {
        _busy = false;
      }
    },

    tryOnKeyT(e) {
      if (!_canUse() || e?.repeat) return false;
      if (_blockedUi() || !_pointerLocked()) return false;
      if (ZS.shortcutsBlocked?.(e)) return false;
      this.teleportToReticle();
      return true;
    },
  };

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyT' || e.repeat) return;
    if (AdminGoHere.tryOnKeyT(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  window.ZS = window.ZS || {};
  ZS.AdminGoHere = AdminGoHere;
}());
