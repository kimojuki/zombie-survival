// Modules jeu + menu — extrait de game.js (async IIFE)
  // Position camera at spawn before first render
  state.player.y = (ZS.getDecorGroundHeight
    ? ZS.getDecorGroundHeight(state.player.x, state.player.z)
    : ZS.getTerrainHeight(state.player.x, state.player.z)) + 1.7;
  localAvatar.position.set(state.player.x, state.player.y - 1.7, state.player.z);
  localAvatar.rotation.y = state.camera.yaw;
  camera.position.set(state.player.x, state.player.y, state.player.z);
  camera.rotation.y = state.camera.yaw;
  camera.rotation.x = state.camera.pitch;

  window.ZS?.Loading?.setPhase?.('world', 1, 'Monde prêt', socket.connected ? 'Synchronisation…' : 'Connexion multijoueur…');

  // ── UI ────────────────────────────────────────────────────────────────────
  try { ZS.UI.init(state); } catch (e) { console.error('UI init:', e); }
  ZS.UI.setHealth(state.player.health);
  ZS.UI.setPlayerKills(state.player.playerKills);

  // ── Survival + inventaire avant Network (game-init appelle spawnWorldItem / loadFromSave)
  ZS.Survival.init(state);
  ZS.Inventory.init(state, scene, socket);

  ZS.Network.init(socket, scene, state);
  ZS.LoadLog?.mark?.('game-modules-init', { socketConnected: socket.connected });
  if (typeof ZS.Network?.tick !== 'function' && typeof ZS.networkTick !== 'function') {
    console.error('[game] ZS.Network.tick absent — videz le cache (Ctrl+F5) ou redeploy client');
  }

  socket.emit('world-water-zones', ZS.getWaterZones());

  // Transmet l'empreinte des bâtiments lootables → le serveur génère le loot (items.md)
  socket.emit('loot-buildings', ZS.Buildings.getLootBuildings());
  ZS.SleepLoot?.init?.(state);
  ZS.Map?.init?.(state, scene);
  ZS.Craft?.init?.();
  ZS.Audio?.init?.();
  ZS.Options?.applyAudio?.();
  if (ZS.Chat) ZS.Chat.init(socket);
  ZS.OptionsUI?.init?.();
  ZS.UI?.applyOptions?.();
  _initMenu();
  _addTestItems();

  // ── Menu (☰) : audio on/off + déconnexion ───────────────────────────────────
  async function _syncAdminMenu() {
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res.ok) {
        const data = await res.json();
        ZS.AdminAuth?.loadFromAuth?.(data);
        if (data.username) localStorage.setItem('zombie_username', data.username);
        if (ZS.AdminHub?.rebuildMenu) ZS.AdminHub.rebuildMenu();
      }
    } catch { /* hors ligne */ }
    if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
    if (ZS.AdminPanel?.refreshMenu) ZS.AdminPanel.refreshMenu();
  }

  function _initMenu() {
    const btn     = document.getElementById('menu-btn');
    const panel   = document.getElementById('menu-panel');
    const audio   = document.getElementById('menu-audio');
    const options = document.getElementById('menu-options');
    const out     = document.getElementById('menu-logout');
    const consoleBtn = document.getElementById('menu-console');
    if (!btn || !panel) return;

    const setOpen = (open) => { panel.style.display = open ? 'flex' : 'none'; };

    if (consoleBtn) {
      consoleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(false);
        if (ZS.Rcon?.open) ZS.Rcon.open();
      });
    }

    _syncAdminMenu();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ZS.Rcon?.refreshMenu) ZS.Rcon.refreshMenu();
      setOpen(panel.style.display === 'none');
    });
    // Clic en dehors du menu → fermeture
    document.addEventListener('click', (e) => {
      if (panel.style.display !== 'none' &&
          !panel.contains(e.target) && e.target !== btn) setOpen(false);
    });
    if (options) options.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(false);
      ZS.OptionsUI?.open?.();
    });
    if (audio) audio.addEventListener('click', () => {
      const next = !ZS.Audio.isMuted();
      ZS.Options?.set?.('muted', next);
    });
    if (out) out.addEventListener('click', (e) => {
      e.stopPropagation();
      ZS.logout();
    });
  }
