'use strict';

/**
 * Contexte Socket.io — getters pour accès lazy (évite TDZ si enregistrement avant init).
 */
function createSocketDeps(bindings) {
  const d = {};
  for (const [key, fn] of Object.entries(bindings)) {
    Object.defineProperty(d, key, {
      get() {
        return fn();
      },
      enumerable: true,
      configurable: true,
    });
  }
  return d;
}

module.exports = { createSocketDeps };
