// Recettes + file craft
const MAX_QUEUE = 12;

  const RECIPES = [
    { result: 'wpn_lance_bois', qty: 1, ingredients: { res_bois_brut: 10 } },
    { result: 'tool_hache_pierre', qty: 1, ingredients: { res_bois_brut: 7, res_pierre: 10 } },
    { result: 'tool_pioche_pierre', qty: 1, ingredients: { res_bois_brut: 7, res_pierre: 10 } },
    { result: 'wpn_lance_pierre', qty: 1, ingredients: { wpn_lance_bois: 1, res_pierre: 2 } },
    { result: 'res_planche', qty: 2, ingredients: { res_bois_brut: 1 } },
    { result: 'res_corde', qty: 1, ingredients: { res_chiffon: 5 } },
    { result: 'tool_torche', qty: 1, ingredients: { res_bois_brut: 5, res_chiffon: 2 } },
    { result: 'med_bandage', qty: 1, ingredients: { res_chiffon: 2 } },
    { result: 'wpn_arc_artisanal', qty: 1, ingredients: { res_bois_brut: 15, res_corde: 1 } },
    { result: 'wpn_batte_cloutee', qty: 1, ingredients: { res_planche: 1, res_clous: 10 } },
    { result: 'struct_plancher_bois', qty: 1, ingredients: { res_planche: 2 } },
    { result: 'struct_plafond_bois', qty: 1, ingredients: { res_planche: 4 } },
    { result: 'struct_mur_bois', qty: 1, ingredients: { res_planche: 6 } },
    { result: 'struct_mur_embrasure_porte', qty: 1, ingredients: { res_planche: 5 } },
    { result: 'struct_mur_embrasure_grande_porte', qty: 1, ingredients: { res_planche: 7 } },
    { result: 'struct_porte_bois', qty: 1, ingredients: { res_planche: 4 } },
    { result: 'struct_escalier_bois', qty: 1, ingredients: { res_planche: 8 } },
    { result: 'struct_grande_porte_bois', qty: 1, ingredients: { res_planche: 10 } },
    { result: 'tool_verrou', qty: 1, ingredients: { res_planche: 2 } },
    { result: 'struct_storage_chest', qty: 1, ingredients: { res_bois_brut: 15 } },
  ];

  const CRAFT_SECTIONS = [
    { id: 'materials', label: 'Matériaux', icon: '📦', hint: 'Ressources transformées' },
    { id: 'tools', label: 'Outils', icon: '🔧', hint: 'Récolte, lumière, craft' },
    { id: 'weapons', label: 'Armes', icon: '⚔️', hint: 'Mêlée artisanale' },
    { id: 'build', label: 'Construction', icon: '🏗️', hint: 'Base et défenses' },
    { id: 'medical', label: 'Soins', icon: '💊', hint: 'Premiers secours' },
  ];

  /** @type {Array<{ id:number, result:string, qty:number, duration:number, remaining:number, state:'waiting'|'active'|'blocked' }>} */
  let _queue = [];
  /** @type {typeof _queue[0] | null} */
  let _active = null;

  let _panel = null;
  let _backdrop = null;
  let _visible = false;
  let _activeTab = 'tools';
  let _tabsNav = null;
  let _tabTitle = null;
  let _tabHint = null;
  let _recipeGrid = null;
  let _queuePanel = null;
  let _queueList = null;
  let _queueHud = null;

  function _isDesktop() {
    return document.body.classList.contains('mode-desktop');
  }

  function _craftSection(rec) {
    const def = ZS.ITEMS?.[rec.result];
    const cat = def?.category;
    if (cat === 'resource') return 'materials';
    if (cat === 'medical') return 'medical';
    if (cat === 'melee' || cat === 'firearm') return 'weapons';
    if (cat === 'structure' || rec.result === 'tool_verrou') return 'build';
    if (cat === 'tool') return 'tools';
    return 'materials';
  }

  function _recipesForSection(sectionId) {
    return RECIPES.filter((rec) => {
      const def = ZS.ITEMS?.[rec.result];
      return def && _craftSection(rec) === sectionId;
    });
  }

  function _craftDuration(rec) {
    if (Number.isFinite(rec.craftTime) && rec.craftTime > 0) return rec.craftTime;
    const cat = ZS.ITEMS?.[rec.result]?.category;
    const byCat = { resource: 2.5, medical: 3, tool: 5, melee: 8, structure: 7, firearm: 10 };
    return byCat[cat] || 4;
  }

  function _fmtSec(s) {
    const n = Math.max(0, Math.ceil(s));
    return n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${n % 60}s`;
  }

  function _pendingOutputTotals() {
    const totals = {};
    for (const job of _queue) {
      totals[job.result] = (totals[job.result] || 0) + (job.qty || 1);
    }
    return totals;
  }

  function _hasResources(rec) {
    return Object.entries(rec.ingredients).every(
      ([id, n]) => ZS.Inventory.countItem(id) >= n,
    );
  }

  function _hasOutputSpace(rec) {
    const totals = _pendingOutputTotals();
    const type = rec.result;
    totals[type] = (totals[type] || 0) + (rec.qty || 1);
    for (const [tid, q] of Object.entries(totals)) {
      if (!ZS.Inventory.canAddStack(tid, q)) return false;
    }
    return true;
  }

  function _canEnqueue(rec) {
    if (_queue.length >= MAX_QUEUE) {
      return { ok: false, reason: 'File pleine (' + MAX_QUEUE + ' max)' };
    }
    if (!_hasResources(rec)) {
      return { ok: false, reason: 'Ressources insuffisantes' };
    }
    if (!_hasOutputSpace(rec)) {
      return { ok: false, reason: 'Pas assez de place inventaire' };
    }
    return { ok: true };
  }

  function _enqueue(rec) {
    const check = _canEnqueue(rec);
    if (!check.ok) {
      ZS.UI?.showNotif?.(check.reason);
      return false;
    }
    ZS.Network?.requestCraftQueue?.(rec.result)?.then?.((res) => {
      if (!res?.ok) {
        const errMap = {
          insufficient_resources: 'Ressources insuffisantes',
          queue_full: 'File pleine',
          unknown_recipe: 'Recette inconnue',
        };
        ZS.UI?.showNotif?.(errMap[res.err] || 'Craft impossible');
      } else {
        const def = ZS.ITEMS[rec.result];
        ZS.UI?.showNotif?.('En file : ' + (def?.label || rec.result));
      }
      _renderQueueUi();
      if (_visible) _render();
    });
    return true;
  }

  function applyServerQueue(state) {
    if (!state) return;
    _active = state.active || null;
    _queue = Array.isArray(state.queue) ? state.queue.slice() : [];
    _renderQueueUi();
    if (_visible) _render();
  }

  function onServerComplete(job) {
    if (!job) return;
    const def = ZS.ITEMS[job.result];
    ZS.UI?.showNotif?.('+ ' + (def?.label || job.result));
    _renderQueueUi();
  }

  function tick(dt) {
    if (_active?.state === 'active' && typeof _active.remaining === 'number') {
      _active.remaining = Math.max(0, _active.remaining - dt);
    }
    _renderQueueUi();
  }

  function _jobLabel(job) {
    const def = ZS.ITEMS[job.result];
    const name = def?.label || job.result;
    return (def?.icon ? def.icon + ' ' : '') + name + (job.qty > 1 ? ` ×${job.qty}` : '');
  }

  function _jobProgress(job) {
    if (job.state === 'blocked') return 1;
    if (job.state === 'waiting') return 0;
    if (!job.duration) return 0;
    return Math.max(0, Math.min(1, 1 - job.remaining / job.duration));
  }

  function _renderQueueUi() {
    const btn = document.getElementById('craft-btn');
    if (btn) btn.classList.toggle('craft-btn-busy', _queue.length > 0);

    const showPanel = _queue.length > 0;
    if (_queuePanel) _queuePanel.hidden = !showPanel || !_visible;
    if (_queueList && _visible) {
      _queueList.replaceChildren();
      _queue.forEach((job, i) => {
        const li = document.createElement('li');
        li.className = 'craft-queue-item'
          + (job.state === 'active' ? ' craft-queue-active' : '')
          + (job.state === 'blocked' ? ' craft-queue-blocked' : '');
        const label = document.createElement('span');
        label.className = 'craft-queue-item-label';
        label.textContent = (i + 1) + '. ' + _jobLabel(job);
        const status = document.createElement('span');
        status.className = 'craft-queue-item-status';
        if (job.state === 'active') status.textContent = _fmtSec(job.remaining);
        else if (job.state === 'blocked') status.textContent = 'Place inventaire';
        else status.textContent = 'En attente';
        const bar = document.createElement('div');
        bar.className = 'craft-queue-bar';
        const fill = document.createElement('div');
        fill.className = 'craft-queue-bar-fill';
        fill.style.width = (100 * _jobProgress(job)).toFixed(1) + '%';
        bar.appendChild(fill);
        li.appendChild(label);
        li.appendChild(status);
        li.appendChild(bar);
        _queueList.appendChild(li);
      });
    }

    if (!_queueHud) return;
    if (!_queue.length) {
      _queueHud.hidden = true;
      return;
    }
    _queueHud.hidden = false;
    _queueHud.replaceChildren();
    const head = document.createElement('div');
    head.className = 'craft-queue-hud-head';
    head.textContent = '⚒ Fabrication (' + _queue.length + ')';
    _queueHud.appendChild(head);
    const active = _queue.find((j) => j.state === 'active') || _queue[0];
    if (active) {
      const row = document.createElement('div');
      row.className = 'craft-queue-hud-row';
      row.textContent = _jobLabel(active);
      const sub = document.createElement('div');
      sub.className = 'craft-queue-hud-sub';
      if (active.state === 'active') sub.textContent = 'Reste ' + _fmtSec(active.remaining);
      else if (active.state === 'blocked') sub.textContent = 'Terminé — libérez de la place';
      else sub.textContent = 'En attente…';
      const bar = document.createElement('div');
      bar.className = 'craft-queue-bar craft-queue-bar-hud';
      const fill = document.createElement('div');
      fill.className = 'craft-queue-bar-fill';
      fill.style.width = (100 * _jobProgress(active)).toFixed(1) + '%';
      bar.appendChild(fill);
      _queueHud.appendChild(row);
      _queueHud.appendChild(sub);
      _queueHud.appendChild(bar);
    }
  }

  function _onKeyDown(e) {
    if (ZS.shortcutsBlocked?.(e) || ZS.Chat?.isOpen?.() || ZS.Rcon?.isOpen?.()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.code === 'Escape' && _visible) {
      e.preventDefault();
      toggle();
      return;
    }
    if (e.code !== 'KeyQ') return;
    if (e.repeat) return;
    e.preventDefault();
    toggle();
  }

  function init() {
    _buildPanel();
    _buildQueueHud();
    document.addEventListener('keydown', _onKeyDown);
    const btn = document.getElementById('craft-btn');
    if (btn) btn.addEventListener('click', toggle);
  }

  function toggle() {
    _visible = !_visible;
    _panel.classList.toggle('is-open', _visible);
    _backdrop.classList.toggle('is-open', _visible);
    if (_visible) {
      _render();
      _renderQueueUi();
      ZS.onUiPanelOpen?.();
    } else {
      if (_queuePanel) _queuePanel.hidden = true;
      ZS.onUiPanelClose?.();
    }
  }
