// Toggle + panel + export
function _dispose() {

    if (!_group) return;

    _group.traverse((o) => {

      if (o.geometry) o.geometry.dispose();

      if (o.material) o.material.dispose();

    });

    _group.parent?.remove(_group);

    _group = null;

  }



  function getLayers() {

    return { ..._layers };

  }



  function setLayer(key, on) {

    if (!(key in _layers)) return;

    _layers[key] = !!on;

    _saveLayers();

    if (_active) _build();

  }



  function isActive() {

    return _active;

  }



  function enter() {

    if (_active) return;

    _loadLayers();

    _active = true;

    _build();

  }



  function exit() {

    if (!_active) return;

    _active = false;

    _dispose();

    _hidePanel();

  }



  function toggle() {

    if (_active) exit();

    else {

      enter();

      _showPanel();

    }

    return _active;

  }



  function setActive(on) {

    if (on) { enter(); _showPanel(); }

    else exit();

  }



  function _showPanel() {

    let el = document.getElementById('zs-admin-zone-panel');

    if (!el) {

      el = document.createElement('div');

      el.id = 'zs-admin-zone-panel';

      el.innerHTML = [

        '<style>#zs-admin-zone-panel{position:fixed;bottom:12px;left:12px;z-index:12900;',

        'background:rgba(10,14,22,0.92);color:#cde;padding:10px 12px;border-radius:6px;',

        'font:11px/1.4 Consolas,monospace;border:1px solid rgba(100,180,255,0.35);min-width:200px;}',

        '#zs-admin-zone-panel label{display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;}',

        '#zs-admin-zone-panel .title{font-size:12px;color:#9cf;margin-bottom:6px;}',

        '#zs-admin-zone-panel button{margin-top:8px;background:#2a4a7a;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;width:100%;}',

        '</style>',

        '<div class="title">🗺️ Couches zones</div>',

        '<label><input type="checkbox" data-zl="sectors"> Secteurs</label>',

        '<label><input type="checkbox" data-zl="safeBeach"> Plage safe (cyan)</label>',

        '<label><input type="checkbox" data-zl="buildExclusions"> Exclusions build (rouge)</label>',

        '<button type="button" id="zs-zone-close">Masquer tout</button>',

      ].join('');

      document.body.appendChild(el);

      el.querySelectorAll('input[data-zl]').forEach((inp) => {

        inp.addEventListener('change', () => {

          setLayer(inp.dataset.zl, inp.checked);

        });

      });

      el.querySelector('#zs-zone-close')?.addEventListener('click', () => exit());

    }

    el.style.display = 'block';

    el.querySelectorAll('input[data-zl]').forEach((inp) => {

      inp.checked = !!_layers[inp.dataset.zl];

    });

  }



  function _hidePanel() {

    const el = document.getElementById('zs-admin-zone-panel');

    if (el) el.style.display = 'none';

  }



  _loadLayers();



  window.ZS = window.ZS || {};

  ZS.AdminZoneOverlay = {

    isActive,

    toggle,

    setActive,

    enter,

    exit,

    getLayers,

    setLayer,

  };
