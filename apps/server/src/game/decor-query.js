'use strict';

/**
 * Helpers décor paginé (game-init HTTP + sockets).
 */
function createDecorQueryHelpers(getDecorItems, {
  decorTreesBeyond,
  decorPropsBeyond,
  decorItemsNearPlayer,
}) {
  return {
    decorTreesBeyondPlayer(sx, sz, minR) {
      return decorTreesBeyond(getDecorItems(), sx, sz, minR);
    },
    decorPropsBeyondPlayer(sx, sz, minR) {
      return decorPropsBeyond(getDecorItems(), sx, sz, minR);
    },
    decorNearPlayer(px, pz, radius) {
      return decorItemsNearPlayer(getDecorItems(), px, pz, radius);
    },
  };
}

module.exports = { createDecorQueryHelpers };
