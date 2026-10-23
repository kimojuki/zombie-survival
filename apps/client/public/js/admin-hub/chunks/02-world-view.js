// Vue monde admin — admin-hub.js
function _buildWorldView() {

    if (!_els.world || _els.world.dataset.built === '1') return;

    _els.world.dataset.built = '1';

    _els.world.innerHTML = [

      '<p class="admin-hub-empty">Outils de modification du monde en multijoueur.</p>',

      '<div class="admin-hub-card-grid">',

      '  <button type="button" class="admin-hub-card admin-hub-card-accent" data-world-act="decor-live">',

      '    <span class="admin-hub-card-icon">🏗️</span>',

      '    <span class="admin-hub-card-title">Édition décor live</span>',

      '    <span class="admin-hub-card-desc">Catalogue prefabs · pose/déplacement · E pour cibler · sync serveur.</span>',

      '  </button>',

      '  <button type="button" class="admin-hub-card" data-world-act="go-here">',

      '    <span class="admin-hub-card-icon">📍</span>',

      '    <span class="admin-hub-card-title">Aller ici</span>',

      '    <span class="admin-hub-card-desc">Visez le sol · touche T · téléportation rapide.</span>',

      '  </button>',

      '  <button type="button" class="admin-hub-card admin-hub-card-accent" data-world-act="world-map">',

      '    <span class="admin-hub-card-icon">🗺️</span>',

      '    <span class="admin-hub-card-title">Carte monde</span>',

      '    <span class="admin-hub-card-desc">POI & bâtiments · filtres stricts · TP · édition décor.</span>',

      '  </button>',

      '  <button type="button" class="admin-hub-card" data-world-act="zone-overlay">',

      '    <span class="admin-hub-card-icon">🗺️</span>',

      '    <span class="admin-hub-card-title">Zones monde</span>',

      '    <span class="admin-hub-card-desc">Secteurs · plage safe · exclusions build (couches).</span>',

      '  </button>',

      '  <button type="button" class="admin-hub-card" data-world-act="fly-mode">',

      '    <span class="admin-hub-card-icon">🕊️</span>',

      '    <span class="admin-hub-card-title">Mode vol</span>',

      '    <span class="admin-hub-card-desc">Noclip rapide · touche V · Espace/Ctrl haut/bas.</span>',

      '  </button>',

      '</div>',

      '<div id="admin-hub-world-time"></div>',

      '<div id="admin-hub-bookmarks"></div>',

      '<div id="admin-hub-server-flags"></div>',

      '<div id="admin-hub-announce"></div>',

      '<p class="admin-pl-foot">Lot décor · redo Ctrl+Y · annonces · clustering carte.</p>',

    ].join('');

  }
