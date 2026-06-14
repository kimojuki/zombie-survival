'use strict';

/**
 * Routes HTTP décor monde — chargement différé client (arbres, props, stream).
 */
function registerWorldRoutes(app, deps) {
  const {
    getServerReady,
    decorTreesBeyond,
    decorPropsBeyond,
    decorNearPlayer,
    getDecorItems,
    isMinableRockPrefab,
  } = deps;

  app.get('/api/world/decor-trees', (req, res) => {
    if (!getServerReady()) return res.status(503).json({ ok: false, ready: false });
    const sx = parseFloat(req.query.x);
    const sz = parseFloat(req.query.z);
    const minR = parseFloat(req.query.minR);
    const limit = Math.min(150, Math.max(1, parseInt(req.query.limit, 10) || 80));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const all = decorTreesBeyond(sx, sz, minR);
    const slice = all.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    res.json({
      ok: true,
      total: all.length,
      offset,
      nextOffset,
      count: slice.length,
      hasMore: nextOffset < all.length,
      items: slice,
    });
  });

  app.get('/api/world/decor-props', (req, res) => {
    if (!getServerReady()) return res.status(503).json({ ok: false, ready: false });
    const sx = parseFloat(req.query.x);
    const sz = parseFloat(req.query.z);
    const minR = parseFloat(req.query.minR);
    const limit = Math.min(120, Math.max(1, parseInt(req.query.limit, 10) || 60));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const all = decorPropsBeyond(sx, sz, minR);
    const slice = all.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    res.json({
      ok: true,
      total: all.length,
      offset,
      nextOffset,
      count: slice.length,
      hasMore: nextOffset < all.length,
      items: slice,
    });
  });

  app.get('/api/world/decor-stream', (req, res) => {
    if (!getServerReady()) return res.status(503).json({ ok: false, ready: false });
    const px = parseFloat(req.query.x);
    const pz = parseFloat(req.query.z);
    const radius = parseFloat(req.query.r);
    const limit = Math.min(180, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    if (!Number.isFinite(px) || !Number.isFinite(pz) || !Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({ ok: false, error: 'x, z, r requis' });
    }
    const all = decorNearPlayer(px, pz, radius);
    const slice = all.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    res.json({
      ok: true,
      total: all.length,
      offset,
      nextOffset,
      count: slice.length,
      hasMore: nextOffset < all.length,
      items: slice,
    });
  });

  app.get('/api/world/decor-rocks', (req, res) => {
    if (!getServerReady()) return res.status(503).json({ ok: false, ready: false });
    const items = Array.from(getDecorItems().values()).filter(
      (d) => d.kind === 'prefab' && isMinableRockPrefab(d.prefabId) && !d.anchorId,
    );
    res.json({ ok: true, count: items.length, items });
  });
}

module.exports = { registerWorldRoutes };
