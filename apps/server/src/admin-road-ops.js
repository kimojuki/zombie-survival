'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const ADMIN_ROADS_URL = pathToFileURL(
  path.join(__dirname, '../../../packages/shared/src/admin-roads.mjs'),
).href;
let _roadsMod = null;

async function roadsMod() {
  if (!_roadsMod) _roadsMod = await import(ADMIN_ROADS_URL);
  return _roadsMod;
}

function createAdminRoadStore(db, worldPersist, log) {
  /** @type {object[]} */
  let roads = [];
  let seq = 1;

  function list() {
    return roads.map((r) => ({ ...r, pts: r.pts.map((p) => p.slice()) }));
  }

  function get(id) {
    const road = roads.find((r) => r.id === id);
    return road ? { ...road, pts: road.pts.map((p) => p.slice()) } : null;
  }

  function _persist() {
    worldPersist?.scheduleWorldState?.({ adminRoads: roads, adminRoadSeq: seq });
  }

  function _nextId() {
    const id = `admin_road_${seq}`;
    seq += 1;
    _persist();
    return id;
  }

  async function load() {
    try {
      const rawSeq = parseInt(await db.getWorldMeta('adminRoadSeq'), 10);
      if (Number.isFinite(rawSeq)) seq = Math.max(1, rawSeq);
    } catch { /* ignore */ }
    try {
      const raw = await db.getWorldMeta('adminRoads');
      if (!raw) {
        roads = [];
        return [];
      }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) {
        roads = [];
        return [];
      }
      const mod = await roadsMod();
      roads = arr.map((d) => mod.normalizeAdminRoadDef(d)).filter(Boolean);
      for (const r of roads) {
        const m = /^admin_road_(\d+)$/.exec(r.id);
        if (m) seq = Math.max(seq, parseInt(m[1], 10) + 1);
      }
      return list();
    } catch (err) {
      log?.warn?.('admin', 'adminRoads load failed', { err: err.message });
      roads = [];
      return [];
    }
  }

  async function create(body, adminUser) {
    const mod = await roadsMod();
    const id = _nextId();
    const road = mod.buildAdminRoadCreate(body, id, adminUser);
    roads.push(road);
    _persist();
    return { ...road, pts: road.pts.map((p) => p.slice()) };
  }

  async function patch(id, body, adminUser) {
    const road = roads.find((r) => r.id === id);
    if (!road) return null;
    const mod = await roadsMod();
    const changed = mod.applyAdminRoadPatch(road, body, adminUser);
    if (changed.length) _persist();
    return { road: { ...road, pts: road.pts.map((p) => p.slice()) }, changed };
  }

  function remove(id) {
    const idx = roads.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    roads.splice(idx, 1);
    _persist();
    return true;
  }

  return { load, list, get, create, patch, remove };
}

module.exports = { createAdminRoadStore };
