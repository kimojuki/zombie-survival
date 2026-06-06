# Client Migration

The playable client still runs legacy scripts from `apps/client/public/js` through the `window.ZS` namespace.

The migration target is:

- `entities/`: player, zombies, rig and animation modules.
- `items/`: item models, grips and inventory domain data.
- `world/`: terrain, roads, sectors, buildings and vegetation.
- `ui/`: HUD, chat, RCON and mobile controls.
- `bootstrap/legacy-modules.js`: temporary source of truth for legacy script loading order.
- `zs-facade.js`: temporary compatibility facade for `window.ZS`.

Move code incrementally and keep the game bootable after every extraction.
