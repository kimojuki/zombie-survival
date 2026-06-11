// Panneau heure du monde — presets jour/nuit + curseur + cycle auto.
(function () {
  'use strict';

  const PANEL_ID = 'zs-admin-world-time';

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canUse() {
    return ZS.AdminHub?.hasPerm?.('decor.edit') || ZS.AdminAuth?.hasPerm?.('rcon');
  }

  function _formatTime(t) {
    const mins = Math.round(((t % 1) + 1) % 1 * 24 * 60);
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  async function _fetchState() {
    const res = await fetch('/api/admin/world-state', {
      headers: { Authorization: 'Bearer ' + _token() },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'État monde indisponible');
    return json;
  }

  async function _apply(body) {
    const res = await fetch('/api/admin/world-time', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + _token(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Échec réglage heure');
    if (typeof json.worldTime === 'number') ZS.setWorldTime?.(json.worldTime);
    return json;
  }

  function _syncPanel(panel, state) {
    const slider = panel.querySelector('#zs-awt-slider');
    const label = panel.querySelector('#zs-awt-label');
    const auto = panel.querySelector('#zs-awt-autoday');
    const t = typeof state.worldTime === 'number' ? state.worldTime : (ZS.getWorldTime?.() ?? 0.3);
    if (slider) slider.value = String(t);
    if (label) label.textContent = `${_formatTime(t)} (${t.toFixed(3)})`;
    if (auto) auto.checked = !!state.autoDay;
  }

  function openIn(container) {
    if (!container || !_canUse()) return;
    if (container.dataset.awtBuilt === '1') {
      _fetchState().then((s) => _syncPanel(container, s)).catch(() => {});
      return;
    }
    container.dataset.awtBuilt = '1';
    container.innerHTML = [
      '<div class="admin-hub-world-time" id="' + PANEL_ID + '">',
      '  <p class="admin-hub-section">Heure & cycle jour/nuit</p>',
      '  <div class="admin-hub-card-grid admin-hub-card-grid-2">',
      '    <button type="button" class="admin-hub-card" data-awt-preset="dawn">🌅 Aube</button>',
      '    <button type="button" class="admin-hub-card" data-awt-preset="day">☀️ Jour</button>',
      '    <button type="button" class="admin-hub-card" data-awt-preset="dusk">🌇 Crépuscule</button>',
      '    <button type="button" class="admin-hub-card" data-awt-preset="night">🌙 Nuit</button>',
      '  </div>',
      '  <label class="admin-hub-awt-row"><span id="zs-awt-label">—</span></label>',
      '  <input type="range" id="zs-awt-slider" min="0" max="1" step="0.002" style="width:100%">',
      '  <label class="admin-hub-awt-check"><input type="checkbox" id="zs-awt-autoday"> Cycle automatique (autoDay)</label>',
      '  <p class="admin-hub-foot" id="zs-awt-status"></p>',
      '</div>',
    ].join('');

    const status = container.querySelector('#zs-awt-status');
    const setStatus = (msg, err) => {
      if (status) {
        status.textContent = msg || '';
        status.style.color = err ? '#f88' : '';
      }
    };

    const refresh = () => {
      _fetchState()
        .then((s) => _syncPanel(container, s))
        .catch((e) => setStatus(e.message, true));
    };
    refresh();

    container.querySelectorAll('[data-awt-preset]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        setStatus('Application…');
        try {
          const json = await _apply({ preset: btn.dataset.awtPreset });
          _syncPanel(container, json);
          setStatus('Heure mise à jour');
        } catch (e) {
          setStatus(e.message, true);
        }
      });
    });

    let sliderTimer = null;
    container.querySelector('#zs-awt-slider')?.addEventListener('input', (e) => {
      const t = Number(e.target.value);
      const label = container.querySelector('#zs-awt-label');
      if (label) label.textContent = `${_formatTime(t)} (${t.toFixed(3)})`;
      ZS.setWorldTime?.(t);
      clearTimeout(sliderTimer);
      sliderTimer = setTimeout(async () => {
        try {
          await _apply({ time: t });
          setStatus('Heure synchronisée');
        } catch (err) {
          setStatus(err.message, true);
        }
      }, 350);
    });

    container.querySelector('#zs-awt-autoday')?.addEventListener('change', async (e) => {
      try {
        const json = await _apply({ autoDay: e.target.checked });
        _syncPanel(container, json);
        setStatus(`Cycle auto : ${json.autoDay ? 'ON' : 'OFF'}`);
      } catch (err) {
        setStatus(err.message, true);
        refresh();
      }
    });
  }

  window.ZS = window.ZS || {};
  ZS.AdminWorldTime = { openIn, _formatTime };
}());
