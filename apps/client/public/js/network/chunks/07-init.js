// init() — bootstrap socket — extrait de network.js (IIFE)
function init(socket, scene, state) {
    _socket = socket;
    _scene  = scene;
    _state  = state;
    _worldReady = true;
    ZS.LoadLog?.mark?.('network-init', {
      socketConnected: !!socket.connected,
      pendingGameInit: !!_pendingGameInit,
    });
    _flushPendingGameInit();

    const socketPct = socket.connected ? 0.85 : 0.35;
    _connecting(
      true,
      socket.connected ? 'Connexion établie' : 'Connexion au serveur…',
      socket.connected ? 'Chargement de votre partie…' : 'Authentification en cours',
      'socket',
      socketPct,
    );
    ZS.loadScript?.('/js/groups.js').then(() => {
      ZS.Groups?.init?.();
      ZS.Groups?.bindSocket?.(socket);
    }).catch((e) => console.warn('[groups] load', e));
