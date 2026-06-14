'use strict';

/** Middleware auth Socket.io — extrait de register-sockets.js (with deps) */
const SOCKET_AUTH = `
io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
    if (isAuthStandalone() && socket.user.aud && socket.user.aud !== 'game') {
      return next(new Error('Token jeu requis'));
    }
    if (isDevServer() && !_canAccessDevServer(socket.user.username)) {
      return next(new Error('Serveur dev réservé aux administrateurs'));
    }
    next();
  } catch (err) {
    log.warn('socket', 'auth rejected', { err: err.message, ip: socket.handshake.address });
    next(new Error('Authentification requise'));
  }
});
`;

module.exports = { SOCKET_AUTH };
