// Détection appareil : entrée tactile vs UI (téléphone / tablette / PC).
(function () {
  'use strict';

  window.ZS = window.ZS || {};

  function _ua() {
    return navigator.userAgent || '';
  }

  function _maxTouch() {
    return navigator.maxTouchPoints || 0;
  }

  function _hasTouchApi() {
    return _maxTouch() > 0 || 'ontouchstart' in window;
  }

  /** Tablette matérielle (indépendant du mode UI). */
  function detectTabletDevice() {
    if (typeof window.__ZS_TABLET === 'boolean') return window.__ZS_TABLET;

    const ua = _ua();
    const maxTouch = _maxTouch();

    if (/iPad/i.test(ua)) return true;
    if (navigator.platform === 'MacIntel' && maxTouch > 1) return true;
    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true;

    const minScreen = Math.min(window.screen?.width || 0, window.screen?.height || 0);
    if (minScreen >= 600 && maxTouch > 1) return true;
    if (window.matchMedia?.('(min-width: 900px)')?.matches && maxTouch > 1) return true;

    return false;
  }

  function detectTouchInput() {
    if (window.__ZS_FORCE_TOUCH === false) return false;
    if (window.__ZS_FORCE_TOUCH === true) return true;
    if (_hasTouchApi()) return true;
    if (window.__ZS_TOUCH_MODE === true) return true;

    const ua = _ua();
    const maxTouch = _maxTouch();
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const fine = window.matchMedia?.('(pointer: fine)')?.matches ?? false;
    const canHover = window.matchMedia?.('(hover: hover)')?.matches ?? false;

    if (/iPhone|iPod|Mobile|Silk/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    if (navigator.platform === 'MacIntel' && maxTouch > 1) return true;
    if (/Android/i.test(ua)) return true;
    if (detectTabletDevice()) return true;

    if (coarse && !canHover) return true;
    if (maxTouch > 1 && !fine) return true;
    if (maxTouch > 1 && coarse) return true;

    const narrow = window.matchMedia?.('(max-width: 900px)')?.matches ?? false;
    if (coarse && narrow) return true;

    return false;
  }

  function detectTablet() {
    return detectTabletDevice() && detectTouchInput();
  }

  function detectPhone() {
    return detectTouchInput() && !detectTabletDevice();
  }

  function usesDesktopUi() {
    return !detectPhone();
  }

  function needsTouchControls() {
    return detectTouchInput();
  }

  function applyDeviceBodyClasses() {
    const tablet = detectTabletDevice();
    const touch = detectTouchInput();
    const phone = touch && !tablet;
    const uiDesktop = !phone;

    document.body.classList.remove(
      'input-touch', 'input-desktop', 'mode-mobile', 'mode-desktop', 'mode-tablet',
    );
    document.body.classList.add(touch ? 'input-touch' : 'input-desktop');
    document.body.classList.add(uiDesktop ? 'mode-desktop' : 'mode-mobile');
    if (tablet) document.body.classList.add('mode-tablet');

    ZS._touchInput = touch;
    ZS._isTablet = tablet;
    ZS._isPhone = phone;
    ZS._isMobile = touch;
    ZS._uiDesktop = uiDesktop;
  }

  function _bootTouchFromHardware() {
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      window.__ZS_TOUCH_MODE = true;
      applyDeviceBodyClasses();
      ZS.UI?.ensureTouchControls?.();
    }, { once: true, capture: true });
  }

  ZS.detectTabletDevice = detectTabletDevice;
  ZS.detectTouchInput = detectTouchInput;
  ZS.detectTablet = detectTablet;
  ZS.detectPhone = detectPhone;
  ZS.usesDesktopUi = usesDesktopUi;
  ZS.needsTouchControls = needsTouchControls;
  ZS.applyDeviceBodyClasses = applyDeviceBodyClasses;
  ZS.detectTouchGameMode = detectTouchInput;

  _bootTouchFromHardware();
}());
