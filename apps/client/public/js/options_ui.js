// Panneau Options — mobile (liste) / tablette+PC (panneau large)
(function () {
  'use strict';

  let _open = false;
  let _els = {};
  let _pendingQuality = null;

  function _q(id) { return document.getElementById(id); }

  function _isPhoneLayout() {
    return document.body.classList.contains('mode-mobile')
      && !document.body.classList.contains('mode-tablet');
  }

  function _makeRow(label, controlEl, hint, wide) {
    const row = document.createElement('div');
    row.className = 'opt-row' + (wide ? ' opt-row--wide' : '');
    const lab = document.createElement('label');
    lab.className = 'opt-label';
    lab.textContent = label;
    const ctrlWrap = document.createElement('div');
    ctrlWrap.className = 'opt-row-ctrl';
    ctrlWrap.appendChild(controlEl);
    row.appendChild(lab);
    row.appendChild(ctrlWrap);
    if (hint) {
      const h = document.createElement('p');
      h.className = 'opt-hint';
      h.textContent = hint;
      row.appendChild(h);
    }
    return row;
  }

  function _makeRange(id, min, max, step, val, onInput) {
    const wrap = document.createElement('div');
    wrap.className = 'opt-range-wrap';
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(val);
    const valEl = document.createElement('span');
    valEl.className = 'opt-range-val';
    valEl.id = id + '-val';
    const fmt = (v) => String(Math.round(v * 100) / 100);
    valEl.textContent = fmt(val);
    input.addEventListener('input', () => {
      valEl.textContent = fmt(Number(input.value));
      onInput(Number(input.value));
    });
    wrap.appendChild(input);
    wrap.appendChild(valEl);
    return wrap;
  }

  function _makeToggle(id, checked, onChange) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.className = 'opt-toggle' + (checked ? ' is-on' : '');
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', checked ? 'true' : 'false');
    btn.innerHTML = '<span class="opt-toggle-track"><span class="opt-toggle-thumb"></span></span>';
    btn.addEventListener('click', () => {
      const next = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', next);
      btn.setAttribute('aria-checked', next ? 'true' : 'false');
      onChange(next);
    });
    return btn;
  }

  function _makeSelect(id, options, value, onChange) {
    const sel = document.createElement('select');
    sel.id = id;
    sel.className = 'opt-select';
    for (const [k, meta] of Object.entries(options)) {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = meta.label;
      sel.appendChild(o);
    }
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function _onQualityChange(v) {
    const prev = ZS.Options.getResolvedTier();
    ZS.Options.set('quality', v);
    _updateQualityHint();
    _updateProfileBadge();
    if (ZS.Options.qualityNeedsReload(prev, ZS.Options.getResolvedTier())) {
      _pendingQuality = v;
      _showReloadBanner(true);
    }
    ZS._gfxRuntime && ZS.Options.applyRuntime(ZS._gfxRuntime);
  }

  function _qualitySelect() {
    return _makeSelect('opt-quality', ZS.Options.QUALITY_PRESETS, 'auto', _onQualityChange);
  }

  function _touchSelect() {
    const touchOpts = {
      auto: { label: 'Automatique' },
      on: { label: 'Joystick tactile' },
      off: { label: 'Souris / clavier' },
    };
    return _makeSelect('opt-touch-mode', touchOpts, 'auto', (v) => ZS.Options.set('touchMode', v));
  }

  function _resetOptions() {
    ZS.Options.reset();
    _syncForm();
    _showReloadBanner(true);
    ZS._gfxRuntime && ZS.Options.applyRuntime(ZS._gfxRuntime);
    ZS.UI?.showNotif?.('Options réinitialisées');
  }

  function _makeResetBtn() {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'opt-btn opt-btn-secondary';
    resetBtn.textContent = 'Réinitialiser tout';
    resetBtn.addEventListener('click', _resetOptions);
    return resetBtn;
  }

  function _sectionTitle(text, icon) {
    const h = document.createElement('h3');
    h.className = 'zs-section-title inv-section-title';
    if (icon) {
      const sp = document.createElement('span');
      sp.className = 'opt-sec-icon';
      sp.textContent = icon;
      h.appendChild(sp);
    }
    h.appendChild(document.createTextNode(icon ? ` ${text}` : text));
    return h;
  }

  function _cardTitle(text, icon) {
    const h = document.createElement('h4');
    h.className = 'opt-card-title';
    const sp = document.createElement('span');
    sp.className = 'opt-sec-icon';
    sp.textContent = icon;
    h.appendChild(sp);
    h.appendChild(document.createTextNode(` ${text}`));
    return h;
  }

  function _card(id, icon, title) {
    const sec = document.createElement('section');
    sec.className = 'opt-card';
    sec.id = id;
    sec.appendChild(_cardTitle(title, icon));
    const inner = document.createElement('div');
    inner.className = 'opt-card-body';
    sec.appendChild(inner);
    return { sec, inner };
  }

  function _appendGfxBlock(parent, wide) {
    const qSel = _qualitySelect();
    const qHint = document.createElement('p');
    qHint.id = 'opt-quality-hint';
    qHint.className = 'opt-hint';
    const qRow = _makeRow('Qualité graphique', qSel, null, wide);
    qRow.appendChild(qHint);
    parent.appendChild(qRow);
  }

  function _appendAudioBlock(parent, wide) {
    parent.appendChild(_makeRow('Couper le son', _makeToggle('opt-muted', false, (v) => ZS.Options.set('muted', v)), null, wide));
    parent.appendChild(_makeRow('Volume général', _makeRange('opt-vol-master', 0, 1, 0.05, 0.9, (v) => ZS.Options.set('volMaster', v)), null, wide));
    parent.appendChild(_makeRow('Ambiance (plage, forêt)', _makeRange('opt-vol-ambient', 0, 1, 0.05, 0.72, (v) => ZS.Options.set('volAmbient', v)), null, wide));
    parent.appendChild(_makeRow('Effets (pas, tirs…)', _makeRange('opt-vol-sfx', 0, 1, 0.05, 1, (v) => ZS.Options.set('volSfx', v)), null, wide));
    parent.appendChild(_makeRow('Bruits de pas', _makeToggle('opt-footsteps', true, (v) => ZS.Options.set('footsteps', v)), null, wide));
    parent.appendChild(_makeRow('Oiseaux en forêt', _makeToggle('opt-forest-birds', false, (v) => ZS.Options.set('forestBirds', v)), wide ? null : 'Cris occasionnels — désactivé par défaut.', wide));
    parent.appendChild(_makeRow('Faune en forêt', _makeToggle('opt-forest-creatures', false, (v) => ZS.Options.set('forestCreatures', v)), wide ? null : 'Bruissements rares (serpent, branchages) — désactivé par défaut.', wide));
  }

  function _appendControlsBlock(parent, wide) {
    parent.appendChild(_makeRow(
      'Mode tactile',
      _touchSelect(),
      wide ? null : 'Sur tablette : « Automatique ». Sur PC tactile, choisissez selon préférence.',
      wide,
    ));
    parent.appendChild(_makeRow('Sensibilité regard', _makeRange('opt-look-sens', 0.4, 2.2, 0.1, 1, (v) => ZS.Options.set('lookSens', v)), null, wide));
    parent.appendChild(_makeRow('Inverser axe vertical', _makeToggle('opt-invert-y', false, (v) => ZS.Options.set('invertY', v)), null, wide));
  }

  function _appendImmersionBlock(parent, wide) {
    parent.appendChild(_makeRow('Balancement tête (marche)', _makeToggle('opt-headbob', true, (v) => ZS.Options.set('headBob', v)), null, wide));
    parent.appendChild(_makeRow('FOV en sprint', _makeToggle('opt-sprint-fov', true, (v) => ZS.Options.set('sprintFov', v)), null, wide));
    parent.appendChild(_makeRow('Vignette survie (faim, soif)', _makeToggle('opt-surv-vignette', true, (v) => ZS.Options.set('survivalVignette', v)), null, wide));
  }

  function _buildPhoneForm(body) {
    const badge = document.createElement('p');
    badge.id = 'opt-profile-badge';
    badge.className = 'opt-profile-badge';
    body.appendChild(badge);

    const devHint = document.createElement('p');
    devHint.id = 'opt-device-hint';
    devHint.className = 'opt-device-hint';
    body.appendChild(devHint);

    body.appendChild(_sectionTitle('Graphismes', '🎮'));
    _appendGfxBlock(body, false);

    body.appendChild(_sectionTitle('Audio', '🔊'));
    _appendAudioBlock(body, false);

    body.appendChild(_sectionTitle('Contrôles', '🕹️'));
    _appendControlsBlock(body, false);

    body.appendChild(_sectionTitle('Immersion', '🌿'));
    _appendImmersionBlock(body, false);

    const actions = document.createElement('div');
    actions.className = 'opt-actions';
    actions.appendChild(_makeResetBtn());
    body.appendChild(actions);
  }

  function _buildWideForm(body) {
    const layout = document.createElement('div');
    layout.className = 'options-layout';

    const nav = document.createElement('nav');
    nav.className = 'options-nav';
    nav.setAttribute('aria-label', 'Sections options');
    const navItems = [
      { id: 'opt-sec-gfx', icon: '🎮', label: 'Graphismes' },
      { id: 'opt-sec-audio', icon: '🔊', label: 'Audio' },
      { id: 'opt-sec-ctrl', icon: '🕹️', label: 'Contrôles' },
      { id: 'opt-sec-imm', icon: '🌿', label: 'Immersion' },
    ];
    navItems.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'options-nav-btn' + (i === 0 ? ' is-active' : '');
      btn.dataset.target = item.id;
      btn.innerHTML = `<span class="options-nav-icon">${item.icon}</span><span>${item.label}</span>`;
      btn.addEventListener('click', () => {
        nav.querySelectorAll('.options-nav-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const target = _q(item.id);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
    });
    layout.appendChild(nav);

    const content = document.createElement('div');
    content.className = 'options-content';

    const meta = document.createElement('div');
    meta.className = 'options-meta';
    const badge = document.createElement('p');
    badge.id = 'opt-profile-badge';
    badge.className = 'opt-profile-badge';
    const devHint = document.createElement('p');
    devHint.id = 'opt-device-hint';
    devHint.className = 'opt-device-hint';
    meta.appendChild(badge);
    meta.appendChild(devHint);
    content.appendChild(meta);

    const grid = document.createElement('div');
    grid.className = 'options-sections';

    const gfx = _card('opt-sec-gfx', '🎮', 'Graphismes');
    gfx.sec.classList.add('opt-card--span');
    _appendGfxBlock(gfx.inner, true);
    grid.appendChild(gfx.sec);

    const audio = _card('opt-sec-audio', '🔊', 'Audio');
    _appendAudioBlock(audio.inner, true);
    grid.appendChild(audio.sec);

    const ctrl = _card('opt-sec-ctrl', '🕹️', 'Contrôles');
    _appendControlsBlock(ctrl.inner, true);
    grid.appendChild(ctrl.sec);

    const imm = _card('opt-sec-imm', '🌿', 'Immersion');
    _appendImmersionBlock(imm.inner, true);
    grid.appendChild(imm.sec);

    content.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'options-footer';
    footer.appendChild(_makeResetBtn());
    content.appendChild(footer);

    layout.appendChild(content);
    body.appendChild(layout);
  }

  function _ensureBuilt() {
    const body = _q('options-panel-body');
    if (!body) return;
    const mode = _isPhoneLayout() ? 'phone' : 'wide';
    if (body.dataset.built === '1' && body.dataset.layoutMode === mode) return;
    body.innerHTML = '';
    body.dataset.built = '1';
    body.dataset.layoutMode = mode;
    _els.panel?.classList.toggle('options-panel--phone', mode === 'phone');
    _els.panel?.classList.toggle('options-panel--wide', mode === 'wide');
    if (mode === 'phone') _buildPhoneForm(body);
    else _buildWideForm(body);
  }

  function _syncForm() {
    const o = ZS.Options.getAll();
    const setRange = (id, v) => {
      const el = _q(id);
      const lab = _q(id + '-val');
      if (el) el.value = String(v);
      if (lab) lab.textContent = String(Math.round(v * 100) / 100);
    };
    setRange('opt-vol-master', o.volMaster);
    setRange('opt-vol-ambient', o.volAmbient);
    setRange('opt-vol-sfx', o.volSfx);
    setRange('opt-look-sens', o.lookSens);

    const setToggle = (id, v) => {
      const el = _q(id);
      if (!el) return;
      el.classList.toggle('is-on', !!v);
      el.setAttribute('aria-checked', v ? 'true' : 'false');
    };
    setToggle('opt-muted', o.muted);
    setToggle('opt-footsteps', o.footsteps);
    setToggle('opt-forest-birds', o.forestBirds);
    setToggle('opt-forest-creatures', o.forestCreatures);
    setToggle('opt-headbob', o.headBob);
    setToggle('opt-sprint-fov', o.sprintFov);
    setToggle('opt-surv-vignette', o.survivalVignette);
    setToggle('opt-invert-y', o.invertY);

    const qSel = _q('opt-quality');
    if (qSel) qSel.value = o.quality;
    const tSel = _q('opt-touch-mode');
    if (tSel) tSel.value = o.touchMode;

    _updateQualityHint();
    _updateProfileBadge();
  }

  function _updateProfileBadge() {
    const el = _q('opt-profile-badge');
    if (!el) return;
    const tier = ZS.Options.getResolvedTier();
    const label = ZS.Options.QUALITY_PRESETS[tier]?.label || tier;
    el.textContent = `Profil actif : ${label}`;
  }

  function _updateQualityHint() {
    const sel = _q('opt-quality');
    const hint = _q('opt-quality-hint');
    const dev = _q('opt-device-hint');
    if (!sel || !hint) return;
    const key = sel.value;
    hint.textContent = ZS.Options.QUALITY_PRESETS[key]?.hint || '';
    if (dev) {
      const dh = ZS.Options.getDeviceHint();
      dev.textContent = dh || '';
      dev.style.display = dh && key === 'auto' ? 'block' : 'none';
    }
  }

  function _showReloadBanner(show) {
    const el = _q('opt-reload-banner');
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  function _setVisible(visible) {
    if (_els.backdrop) {
      _els.backdrop.style.display = visible ? 'flex' : 'none';
      _els.backdrop.classList.toggle('is-open', visible);
    }
    if (_els.panel) {
      _els.panel.style.display = visible ? 'flex' : 'none';
      _els.panel.classList.toggle('is-open', visible);
    }
  }

  function open() {
    if (_open) return;
    if (!_els.backdrop) init();
    if (!_els.backdrop) return;
    _ensureBuilt();
    _open = true;
    try { _syncForm(); } catch (e) { console.error('[options] sync', e); }
    _showReloadBanner(false);
    _pendingQuality = null;
    _setVisible(true);
    ZS.onUiPanelOpen?.();
  }

  function close() {
    if (!_open) return;
    _open = false;
    _setVisible(false);
    ZS.onUiPanelClose?.();
  }

  function isOpen() { return _open; }

  function toggle() { _open ? close() : open(); }

  function init() {
    _els.backdrop = _q('options-backdrop');
    _els.panel = _q('options-panel');
    if (!_els.backdrop) return;
    _ensureBuilt();
    _bindChrome();
    _syncForm();
  }

  function _bindChrome() {
    if (_els.backdrop?.dataset.bound === '1') return;
    if (_els.backdrop) _els.backdrop.dataset.bound = '1';
    _q('options-close-btn')?.addEventListener('click', close);
    _q('options-backdrop')?.addEventListener('click', (e) => {
      if (e.target === _els.backdrop) close();
    });
    _q('opt-reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
    document.addEventListener('keydown', (e) => {
      if (!_open) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    });
  }

  window.ZS = window.ZS || {};
  ZS.OptionsUI = { init, open, close, toggle, isOpen };
}());
