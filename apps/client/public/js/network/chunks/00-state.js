// État partagé + UI connexion — extrait de network.js (IIFE)
const remotePlayers = new Map();
  const sleepingBodies = new Map(); // playerId -> { mesh, x, z, username, playerId }
  const deathCorpses = new Map(); // playerId -> { mesh, x, z, username, playerId }
  let _localDeathCorpse = null;
  let _spawnReady = false; // false jusqu'à sync complète (game-init + décor rendu)
  let _hadSpawnReady = false; // true après 1re sync réussie (survit aux disconnect)
  let _worldReady = false;
  let _pendingGameInit = null;
  let _gameInitSyncing = false;
  let _gameInitRetries = 0;
  const _GAME_INIT_MAX_RETRIES = 8;
  let _disconnectUiTimer = null;
  let _lastWorldTime = null;
  const decorItems = new Map();
  let _scene, _state, _socket, _localUsername = '';
  let _lastEquip = undefined;
  const _DOWN = (typeof THREE !== 'undefined') ? new THREE.Vector3(0, -1, 0) : null;
  const _rHandVec = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;

  function _loading() {
    return window.ZS?.Loading || window.__zsLoading || null;
  }

  function _connecting(show, msg, detail, phaseKey, local01) {
    const L = _loading();
    if (show) {
      if (L?.setPhase && phaseKey != null && local01 != null) {
        L.setPhase(phaseKey, local01, msg, detail);
      } else if (L?.show) {
        L.show(msg, detail);
      } else {
        const screen = document.getElementById('connecting-screen');
        const m = document.getElementById('connecting-msg');
        const d = document.getElementById('connecting-detail');
        if (screen) screen.style.display = 'flex';
        if (m && msg) m.textContent = msg;
        if (d) d.textContent = detail || '';
      }
    } else if (L?.hide) {
      L.hide();
    } else {
      const screen = document.getElementById('connecting-screen');
      if (screen) screen.style.display = 'none';
    }
  }

  function _setOnlineCount(n) {
    if (typeof n === 'number' && ZS.UI?.setOnlineCount) ZS.UI.setOnlineCount(n);
  }

  let _colliderSyncDepth = 0;
  let _decorBatchDepth = 0;
  let _colliderSyncTimer = null;
  let _serverCollidersReady = false;
