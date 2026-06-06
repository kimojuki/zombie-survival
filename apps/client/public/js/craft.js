// Crafting system — recettes et panneau UI
(function () {
  'use strict';

  const RECIPES = [
    // Progression Rust-like au spawn (caillou → bois + pierre → premiers outils)
    { result: 'wpn_lance_bois', qty: 1, ingredients: { res_bois_brut: 3 } },
    { result: 'tool_hache_pierre', qty: 1, ingredients: { res_bois_brut: 2, res_pierre: 3 } },
    { result: 'tool_pioche_pierre', qty: 1, ingredients: { res_bois_brut: 2, res_pierre: 3 } },
    { result: 'wpn_lance_pierre', qty: 1, ingredients: { wpn_lance_bois: 1, res_pierre: 2 } },
    // Transformation de base du bois brut
    { result: 'res_planche', qty: 2, ingredients: { res_bois_brut: 1 } },
    { result: 'tool_torche', qty: 1, ingredients: { res_bois_brut: 2 } },
    // Soins artisanaux — le chiffon sert à fabriquer des bandages
    { result: 'med_bandage', qty: 1, ingredients: { res_chiffon: 2 } },
    // Armes artisanales
    { result: 'wpn_lance_artisanale', qty: 1, ingredients: { res_bois_brut: 2, res_corde: 1 } },
    { result: 'wpn_batte_cloutee',    qty: 1, ingredients: { res_planche: 1, res_clous: 10 } },
    { result: 'struct_mur_bois',       qty: 1, ingredients: { res_planche: 6, res_clous: 12 } },
    { result: 'struct_porte_bois',     qty: 1, ingredients: { res_planche: 4, res_clous: 8, res_ferraille: 2 } },
    { result: 'struct_grande_porte_bois', qty: 1, ingredients: { res_planche: 10, res_clous: 20, res_ferraille: 4 } },
    { result: 'struct_plancher_bois',  qty: 1, ingredients: { res_planche: 5, res_clous: 10 } },
    { result: 'struct_escalier_bois',  qty: 1, ingredients: { res_planche: 8, res_clous: 16 } },
    { result: 'struct_storage_chest',  qty: 1, ingredients: { res_planche: 8, res_clous: 12, res_ferraille: 2 } },
  ];

  let _panel    = null;
  let _backdrop = null;
  let _visible  = false;

  function init() {
    _buildPanel();
    document.addEventListener('keydown', (e) => { if (e.code === 'KeyC') toggle(); });
    const btn = document.getElementById('craft-btn');
    if (btn) btn.addEventListener('click', toggle);
  }

  function toggle() {
    _visible = !_visible;
    _panel.style.display    = _visible ? 'flex' : 'none';
    _backdrop.style.display = _visible ? 'block' : 'none';
    if (_visible) _render();
  }

  function _buildPanel() {
    // Backdrop transparent pour fermer en tapant en dehors
    _backdrop = document.createElement('div');
    Object.assign(_backdrop.style, {
      display: 'none', position: 'fixed', inset: '0', zIndex: '499',
    });
    _backdrop.addEventListener('click', toggle);
    document.body.appendChild(_backdrop);

    _panel = document.createElement('div');
    _panel.id = 'craft-panel';
    Object.assign(_panel.style, {
      display: 'none', position: 'fixed',
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(360px, 96vw)', maxHeight: '80vh', overflowY: 'auto',
      background: 'rgba(8,8,6,0.97)', border: '1px solid #6a5a2a',
      borderRadius: '8px', padding: '14px 12px', zIndex: '500',
      flexDirection: 'column', gap: '6px',
      color: '#e8d090', fontFamily: 'monospace', fontSize: '13px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
    });

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;'
      + 'margin-bottom:8px;border-bottom:1px solid #5a4a2a;padding-bottom:6px';
    const title = document.createElement('span');
    title.style.cssText = 'font-size:15px;font-weight:bold';
    title.textContent = '⚒ ARTISANAT';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:rgba(100,60,10,0.5);color:#e8d090;border:1px solid #8a6228;'
      + 'border-radius:6px;padding:5px 13px;cursor:pointer;font-size:16px;line-height:1;'
      + 'min-width:40px;min-height:36px;';
    closeBtn.addEventListener('click', toggle);
    hdr.appendChild(title);
    hdr.appendChild(closeBtn);
    _panel.appendChild(hdr);

    const list = document.createElement('div');
    list.id = 'craft-list';
    list.style.cssText = 'display:flex;flex-direction:column;gap:5px';
    _panel.appendChild(list);

    document.body.appendChild(_panel);
  }

  function _render() {
    const list = document.getElementById('craft-list');
    list.replaceChildren();
    for (const rec of RECIPES) {
      const def = ZS.ITEMS[rec.result];
      if (!def) continue;
      const ok = _canCraft(rec);

      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 8px', borderRadius: '5px',
        background: ok ? 'rgba(80,60,18,0.45)' : 'rgba(28,28,24,0.5)',
        border: ok ? '1px solid #8a6a28' : '1px solid #3a3830',
        opacity: ok ? '1' : '0.5',
      });

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `<div style="font-weight:bold">${def.icon} ${def.label}</div>`
        + `<div style="font-size:11px;color:#b0a070;margin-top:2px">${_ingHtml(rec)}</div>`;
      row.appendChild(info);

      if (ok) {
        const btn = document.createElement('button');
        btn.textContent = 'Fabriquer';
        Object.assign(btn.style, {
          background: '#6a4a14', color: '#e8d090',
          border: '1px solid #8a6228', borderRadius: '4px',
          padding: '4px 9px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap',
        });
        btn.onclick = () => { _doCraft(rec); _render(); };
        row.appendChild(btn);
      }
      list.appendChild(row);
    }
  }

  function _ingHtml(rec) {
    return Object.entries(rec.ingredients).map(([id, need]) => {
      const have = ZS.Inventory.countItem(id);
      const lbl  = ZS.ITEMS[id]?.label || id;
      const ok   = have >= need;
      return `<span style="color:${ok ? '#88cc66' : '#cc6644'}">${lbl} ${have}/${need}</span>`;
    }).join(' · ');
  }

  function _canCraft(rec) {
    return Object.entries(rec.ingredients).every(([id, n]) => ZS.Inventory.countItem(id) >= n);
  }

  function _doCraft(rec) {
    if (!_canCraft(rec)) return;
    for (const [id, qty] of Object.entries(rec.ingredients)) ZS.Inventory.removeItem(id, qty);
    const added = ZS.Inventory.addItem(rec.result, rec.qty);
    ZS.UI.showNotif(added ? ('+ ' + ZS.ITEMS[rec.result]?.label) : 'Inventaire plein');
  }

  window.ZS = window.ZS || {};
  ZS.Craft = { init, toggle };
}());
