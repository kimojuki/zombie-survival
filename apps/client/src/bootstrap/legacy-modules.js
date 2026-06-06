// Single source of truth for the legacy ZS script order.
// The current game still loads classic scripts; Vite is introduced first as
// tooling/build infrastructure before the gameplay modules migrate to imports.
export const LEGACY_MODULES = [
  '/js/items.js',
  '/js/survival.js',
  '/js/craft.js',
  '/js/noise.js',
  '/js/buildings.js',
  '/js/camp_textures.js',
  '/js/mapgen.js',
  '/js/campfire.js',
  '/js/decor_colliders.js',
  '/js/proc_spawn.js',
  '/js/spawn_clearing.js',
  '/js/world.js',
  '/js/player.js',
  '/js/icons.js',
  '/js/audio.js',
  '/js/zombie.js',
  '/js/rcon.js',
  '/js/chat.js',
  '/js/network.js',
  '/js/ui.js',
  '/js/inventory.js',
  '/js/map.js',
  '/js/game.js',
];
