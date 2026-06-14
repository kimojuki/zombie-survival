// Tutos UI intro plage — hotbar, sac, consommer (mobile vs desktop).
(function () {
  'use strict';

  const COPY = Object.freeze({
    hotbar: {
      title: 'Torche en main',
      mobile: 'Touche le slot torche en bas de l\'écran pour l\'équiper.',
      desktop: 'Appuie sur 2 ou clique le slot torche en bas de l\'écran.',
    },
    bag: {
      title: 'Ton sac',
      mobile: 'Bouton inventaire (en haut) — récupère l\'eau et le sandwich.',
      desktop: 'Touche I ou le bouton inventaire — récupère l\'eau et le sandwich.',
    },
    consume: {
      title: 'Manger / boire',
      mobile: 'Dans le sac : touche l\'aliment puis Utiliser.',
      desktop: 'Dans le sac : sélectionne l\'aliment puis bouton Utiliser (ou double-clic).',
    },
  });

  let _card = null;
  let _hideT = null;
  const _shown = { hotbar: false, bag: false, consume: false };

  function interactVerb() {
    return ZS._isMobile ? 'le bouton Ramasser' : 'E';
  }

  function _text(key) {
    const block = COPY[key];
    if (!block) return '';
    return ZS._isMobile ? block.mobile : block.desktop;
  }

  function _ensureCard() {
    if (_card) return _card;
    _card = document.createElement('div');
    _card.id = 'intro-lesson-card';
    _card.style.cssText = [
      'display:none',
      'position:fixed',
      'left:12px',
      'bottom:max(148px,calc(env(safe-area-inset-bottom) + 132px))',
      'max-width:min(280px,calc(100vw - 24px))',
      'padding:10px 12px',
      'border-radius:10px',
      'border:1px solid rgba(120,200,255,.45)',
      'background:rgba(8,14,22,.88)',
      'color:#e8f4ff',
      'font:400 12px/1.4 system-ui,sans-serif',
      'box-shadow:0 6px 20px rgba(0,0,0,.35)',
      'z-index:214',
      'pointer-events:none',
    ].join(';');
    _card.innerHTML = [
      '<div id="intro-lesson-kicker" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.75;margin-bottom:3px">Leçon</div>',
      '<div id="intro-lesson-title" style="font-weight:700;font-size:13px;margin-bottom:4px"></div>',
      '<div id="intro-lesson-body" style="opacity:.9"></div>',
    ].join('');
    document.body.appendChild(_card);
    return _card;
  }

  function _show(key, ms = 7000) {
    if (_shown[key] || !ZS.Scenario?.isActive?.()) return;
    const block = COPY[key];
    if (!block) return;
    _shown[key] = true;
    const el = _ensureCard();
    document.getElementById('intro-lesson-title').textContent = block.title;
    document.getElementById('intro-lesson-body').textContent = _text(key);
    el.style.display = 'block';
    el.style.opacity = '1';
    clearTimeout(_hideT);
    _hideT = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 280);
    }, ms);
  }

  function onTorchAcquired() {
    _show('hotbar', 7500);
  }

  function onSuitcaseOpen() {
    _show('bag', 8000);
  }

  function onKitDone() {
    setTimeout(() => _show('consume', 8500), 600);
  }

  function reset() {
    _shown.hotbar = false;
    _shown.bag = false;
    _shown.consume = false;
    clearTimeout(_hideT);
    if (_card) {
      _card.style.display = 'none';
      _card.style.opacity = '0';
    }
  }

  window.ZS = window.ZS || {};
  ZS.IntroLessons = {
    interactVerb,
    onTorchAcquired,
    onSuitcaseOpen,
    onKitDone,
    reset,
  };
}());
