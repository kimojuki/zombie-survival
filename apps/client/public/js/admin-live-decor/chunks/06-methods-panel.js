// Banner + panneau DOM — extrait de admin-live-decor.js (IIFE)
    _buildBanner() {
      if (this._banner?.parent) return;
      const el = document.createElement('div');
      el.id = 'zs-admin-live-banner';
      el.innerHTML = '<span id="zs-ald-banner-main">🎯 Édition décor</span><span class="sub" id="zs-ald-banner-sub">E cibler · F8 quitter · sync live</span>';
      document.body.appendChild(el);
      this._banner = el;
    },

    _updateBannerPlace() {
      const sub = document.getElementById('zs-ald-banner-sub');
      if (!sub) return;
      if (this._placeMode === 'batch-move') {
        sub.textContent = 'Déplacement lot — clic gauche valider · le groupe suit le décor principal';
      } else if (this._placeMode === 'move') {
        sub.textContent = 'Déplacement — clic gauche valider · Q/E ou molette rotation · clic droit annuler';
      } else if (this._placeMode === 'duplicate') {
        sub.textContent = 'Duplication — clic gauche poser copie · Q/E ou molette · clic droit annuler';
      } else if (this._placeMode === 'create') {
        sub.textContent = 'Pose — clic gauche poser · Q/E ou molette · clic droit annuler';
      } else {
        sub.textContent = 'Shift+E multi · Ctrl+C/V · Ctrl+Z/Y · T TP · F8 quitter';
      }
    },

    _buildPanel() {
      if (this._panel?.parent) return;
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML = [
        '<style>',
        `#${PANEL_ID}{position:fixed;top:0;right:0;width:min(380px,92vw);height:100vh;`,
        'background:rgba(10,14,22,0.95);color:#e8ecf4;font:12px/1.4 Consolas,Monaco,monospace;',
        'z-index:12950;overflow:auto;padding:10px 12px 20px;box-sizing:border-box;',
        'border-left:1px solid rgba(255,200,80,0.25);pointer-events:auto;}',
        `#${PANEL_ID} h2{margin:0 0 4px;font-size:14px;color:#ffd080;}`,
        `#${PANEL_ID} .hint{opacity:0.8;margin-bottom:8px;font-size:11px;line-height:1.35;}`,
        `#${PANEL_ID} .meta{font-size:11px;opacity:0.85;margin-bottom:10px;padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px;}`,
        `#${PANEL_ID} .sec{margin:10px 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.65;}`,
        `#${PANEL_ID} .row{display:grid;grid-template-columns:72px 1fr 58px;gap:6px;align-items:center;margin:4px 0;}`,
        `#${PANEL_ID} .row-fine{font-size:10px;opacity:0.55;margin:-2px 0 6px 78px;}`,
        `#${PANEL_ID} label{font-size:11px;}`,
        `#${PANEL_ID} input[type=range]{width:100%;}`,
        `#${PANEL_ID} input[type=number]{width:58px;background:#1a2230;color:#fff;border:1px solid #445;padding:3px 4px;border-radius:3px;}`,
        `#${PANEL_ID} input[type=search],#${PANEL_ID} select{width:100%;background:#1a2230;color:#fff;border:1px solid #445;padding:5px 6px;border-radius:3px;font:inherit;box-sizing:border-box;}`,
        `#${PANEL_ID} select[multiple],#${PANEL_ID} select[size]{min-height:120px;}`,
        `#${PANEL_ID} .tabs{display:flex;gap:4px;margin:0 0 10px;}`,
        `#${PANEL_ID} .tab{flex:1;padding:6px 8px;border:none;border-radius:4px;cursor:pointer;font:inherit;background:#1a2a40;color:#aac;}`,
        `#${PANEL_ID} .tab.active{background:#3a5a8a;color:#fff;}`,
        `#${PANEL_ID} .hidden{display:none!important;}`,
        `#${PANEL_ID} .cat-desc{font-size:10px;opacity:0.75;margin:6px 0 8px;line-height:1.35;}`,
        `#${PANEL_ID} .btns{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;}`,
        `#${PANEL_ID} button{background:#2a4a7a;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font:inherit;}`,
        `#${PANEL_ID} button.primary{background:#3a6a3a;}`,
        `#${PANEL_ID} button.warn{background:#7a3a2a;}`,
        `#${PANEL_ID} .status{margin-top:8px;padding:6px 8px;background:rgba(40,60,80,0.45);border-radius:4px;min-height:28px;font-size:11px;}`,
        `#${PANEL_ID} .status.err{background:rgba(90,30,30,0.5);}`,
        `#${PANEL_ID} .status.warn{background:rgba(90,70,20,0.45);}`,
        `#${PANEL_ID} .status.ok{background:rgba(30,70,40,0.45);}`,
        `#${PANEL_ID} .search-row{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);}`,
        `#${PANEL_ID} .search-meta{font-size:10px;opacity:0.7;}`,
        `#${PANEL_ID} .search-btns{display:flex;gap:4px;flex-shrink:0;}`,
        `#${PANEL_ID} .search-btns button{padding:4px 8px;font-size:10px;}`,
        `#${PANEL_ID} .chest-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0;}`,
        `#${PANEL_ID} .chest-slot{font-size:10px;padding:4px;background:rgba(255,255,255,0.06);border-radius:3px;min-height:28px;}`,
        `#${PANEL_ID} .chest-meta{font-size:11px;margin:4px 0;}`,
        `#${PANEL_ID} .hist-row{font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);}`,
        `#${PANEL_ID} .hist-time{opacity:0.55;margin-right:6px;}`,
        `#${PANEL_ID} .snap-row{margin:8px 0;font-size:11px;}`,
        '#zs-admin-live-banner{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:12940;',
        'pointer-events:none;padding:6px 14px;border-radius:6px;background:rgba(20,28,40,0.88);',
        'border:1px solid rgba(255,200,80,0.35);font:12px/1.3 Consolas,monospace;color:#ffe8b0;',
        'display:flex;flex-direction:column;align-items:center;gap:2px;}',
        '#zs-admin-live-banner .sub{font-size:10px;opacity:0.75;}',
        '</style>',
        '<h2>Édition décor monde</h2>',
        '<div class="tabs">',
        '  <button type="button" class="tab active" id="zs-ald-tab-place">Poser</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-edit">Modifier</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-search">Chercher</button>',
        '  <button type="button" class="tab" id="zs-ald-tab-history">Historique</button>',
        '</div>',
        '<div id="zs-ald-place-pane">',
        '  <p class="hint">Choisissez un prefab — preview sous le réticule — <b>clic gauche</b> pour poser, puis calibrez dans Modifier.</p>',
        '  <div class="sec">Catalogue</div>',
        '  <input type="search" id="zs-ald-cat-search" placeholder="Rechercher un prefab…" autocomplete="off">',
        '  <div style="margin:6px 0"><select id="zs-ald-cat-category"><option value="">Toutes catégories</option></select></div>',
        '  <select id="zs-ald-cat-prefab" size="8"></select>',
        '  <div class="cat-desc" id="zs-ald-cat-desc"></div>',
        '  <label class="snap-row"><input type="checkbox" id="zs-ald-angle-snap" checked> Snap rotation 15° (Q/E / molette)</label>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-start-place">Prévisualiser</button>',
        '    <button type="button" class="warn hidden" id="zs-ald-cancel-place">Annuler pose</button>',
        '  </div>',
        '</div>',
        '<div id="zs-ald-edit-pane" class="hidden">',
        '  <p class="hint"><b>E</b> cibler · <b>Shift+E</b> ajouter à la sélection · <b>Ctrl+C/V</b> copier/coller.</p>',
        '  <div class="meta" id="zs-ald-meta">Aucune cible — appuyez sur E</div>',
        '  <div id="zs-ald-fields"></div>',
        '  <div class="btns">',
        '    <button type="button" class="primary" id="zs-ald-move-visual">Déplacer visuellement</button>',
        '    <button type="button" class="primary" id="zs-ald-duplicate">Dupliquer</button>',
        '    <button type="button" class="primary" id="zs-ald-save">Enregistrer maintenant</button>',
        '    <button type="button" id="zs-ald-deselect">Désélectionner</button>',
        '    <button type="button" class="warn" id="zs-ald-delete">Supprimer</button>',
        '    <button type="button" class="warn hidden" id="zs-ald-batch-delete">Supprimer sélection</button>',
        '    <button type="button" class="primary hidden" id="zs-ald-batch-move">Déplacer lot</button>',
        '  </div>',
        '  <div class="btns hidden" id="zs-ald-batch-nudge">',
        '    <span style="font-size:10px;opacity:0.7;align-self:center">Nudge lot :</span>',
        '    <button type="button" data-nudge="0,-0.5">Z−</button>',
        '    <button type="button" data-nudge="0,0.5">Z+</button>',
        '    <button type="button" data-nudge="-0.5,0">X−</button>',
        '    <button type="button" data-nudge="0.5,0">X+</button>',
        '  </div>',
        '</div>',
        '<div id="zs-ald-search-pane" class="hidden">',
        '  <p class="hint">Recherche serveur (id, prefab, type). TP ou ouvrir dans Modifier.</p>',
        '  <input type="search" id="zs-ald-search-q" placeholder="Rechercher un décor…" autocomplete="off">',
        '  <select id="zs-ald-search-layer">',
        '    <option value="">Toutes couches</option>',
        '    <option value="building">Bâtiments</option>',
        '    <option value="storage">Coffres</option>',
        '    <option value="sign">Panneaux</option>',
        '    <option value="wreck">Épaves</option>',
        '    <option value="camp">Camp</option>',
        '    <option value="gate">Portes</option>',
        '  </select>',
        '  <div id="zs-ald-search-results"></div>',
        '</div>',
        '<div id="zs-ald-history-pane" class="hidden">',
        '  <p class="hint">Actions de cette session (mémoire locale).</p>',
        '  <div id="zs-ald-history-list"></div>',
        '</div>',
        '<div class="btns">',
        '  <button type="button" id="zs-ald-go-here">Aller ici (T)</button>',
        '  <button type="button" id="zs-ald-save-bm">Signet position</button>',
        '  <button type="button" id="zs-ald-undo">Annuler (Ctrl+Z)</button>',
        '  <button type="button" id="zs-ald-redo">Refaire (Ctrl+Y)</button>',
        '  <button type="button" class="warn" id="zs-ald-close">Quitter le mode</button>',
        '</div>',
        '<div class="status" id="zs-ald-status">Prêt.</div>',
      ].join('');
      document.body.appendChild(panel);
      this._panel = panel;
      this._tab = 'place';
      panel.querySelector('#zs-ald-tab-place')?.addEventListener('click', () => this._switchTab('place'));
      panel.querySelector('#zs-ald-tab-edit')?.addEventListener('click', () => this._switchTab('edit'));
      panel.querySelector('#zs-ald-tab-search')?.addEventListener('click', () => this._switchTab('search'));
      panel.querySelector('#zs-ald-tab-history')?.addEventListener('click', () => this._switchTab('history'));
      panel.querySelector('#zs-ald-angle-snap')?.addEventListener('change', (e) => {
        this._angleSnap = !!e.target.checked;
      });
      panel.querySelector('#zs-ald-search-q')?.addEventListener('input', () => this._scheduleSearch());
      panel.querySelector('#zs-ald-search-layer')?.addEventListener('change', () => this._scheduleSearch());
      panel.querySelector('#zs-ald-search-results')?.addEventListener('click', (e) => {
        const tp = e.target?.closest?.('.search-tp');
        if (tp) {
          const x = Number(tp.dataset.x);
          const z = Number(tp.dataset.z);
          if (Number.isFinite(x) && Number.isFinite(z)) {
            this._pulseSearchResult(x, z);
            ZS.AdminGoHere?.teleportTo?.(x, z);
          }
          return;
        }
        const edit = e.target?.closest?.('.search-edit');
        if (edit?.dataset?.id) {
          const x = Number(edit.dataset.x);
          const z = Number(edit.dataset.z);
          if (Number.isFinite(x) && Number.isFinite(z)) this._pulseSearchResult(x, z);
          this._selectDecor(edit.dataset.id);
        }
      });
      panel.querySelector('#zs-ald-cat-search')?.addEventListener('input', () => this._renderCatalogOptions());
      panel.querySelector('#zs-ald-cat-prefab')?.addEventListener('change', () => this._updateCatalogDesc());
      panel.querySelector('#zs-ald-start-place')?.addEventListener('click', () => {
        const id = panel.querySelector('#zs-ald-cat-prefab')?.value;
        if (id) this._startPlacement(id);
      });
      panel.querySelector('#zs-ald-cancel-place')?.addEventListener('click', () => {
        this._cancelPlacement();
        this._setStatus('Pose annulée.');
      });
      panel.querySelector('#zs-ald-save')?.addEventListener('click', () => this._saveNow());
      panel.querySelector('#zs-ald-move-visual')?.addEventListener('click', () => this._startMoveVisual());
      panel.querySelector('#zs-ald-duplicate')?.addEventListener('click', () => this._startDuplicate());
      panel.querySelector('#zs-ald-undo')?.addEventListener('click', () => this.tryUndo());
      panel.querySelector('#zs-ald-deselect')?.addEventListener('click', () => this._deselect());
      panel.querySelector('#zs-ald-delete')?.addEventListener('click', () => this._deleteSelected());
      panel.querySelector('#zs-ald-batch-delete')?.addEventListener('click', () => this._batchDeleteSelected());
      panel.querySelector('#zs-ald-batch-move')?.addEventListener('click', () => this._startBatchMoveVisual());
      panel.querySelector('#zs-ald-batch-nudge')?.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('[data-nudge]');
        if (!btn) return;
        const [dx, dz] = btn.dataset.nudge.split(',').map(Number);
        if (Number.isFinite(dx) && Number.isFinite(dz)) this._batchNudge(dx, dz);
      });
      panel.querySelector('#zs-ald-redo')?.addEventListener('click', () => this.tryRedo());
      panel.querySelector('#zs-ald-go-here')?.addEventListener('click', () => {
        ZS.AdminGoHere?.teleportToReticle?.();
      });
      panel.querySelector('#zs-ald-save-bm')?.addEventListener('click', () => {
        const name = window.prompt('Nom du signet :');
        if (!name) return;
        const res = ZS.AdminTpBookmarks?.addFromPlayer?.(name);
        if (res?.ok) this._setStatus(`Signet « ${res.bookmark.name} » sauvé`, 'ok');
        else this._setStatus(res?.error || 'Erreur signet', 'err');
      });
      panel.querySelector('#zs-ald-close')?.addEventListener('click', () => {
        this.exit();
      });
    },
