import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, '../apps/client/public/js/build_anchors.js'), 'utf8');

function loadAnchors() {
  const ctx = { window: {}, ZS: {} };
  ctx.window.ZS = ctx.ZS;
  vm.runInNewContext(src, ctx);
  return ctx.ZS.BuildAnchors;
}

describe('build anchors', () => {
  it('registers wall and floor snap points per foundation', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 1.2, { hw: 1.5, hd: 1.5, level: 0 });

    const wall = BA.snapPlacement(0.1, 1.4, 'wall', 0, 0);
    assert.ok(wall?.snapped);
    assert.equal(wall.z, 1.5);
    assert.equal(wall.rotY, 0);
    assert.equal(wall.baseY, 1.2);

    const floor = BA.snapPlacement(-0.2, -2.9, 'floor', 1.57, 0);
    assert.ok(floor?.snapped);
    assert.equal(floor.z, -3);
    assert.equal(floor.x, 0);
  });

  it('floor snap inherits neighbor height regardless of UI build level', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 2.5, { level: 1 });
    const snap = BA.snapPlacement(0, 3, 'floor', 0, 0);
    assert.ok(snap?.snapped);
    assert.equal(snap.baseY, 2.5);
    assert.equal(snap.level, 0);
  });

  it('findAdjacentFloorHeight inherits neighbor baseY on slope grid', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 2.15, { hw: 1.5, hd: 1.5 });
    const east = BA.findAdjacentFloorHeight(3, 0.4);
    assert.ok(east);
    assert.equal(east.baseY, 2.15);
    const none = BA.findAdjacentFloorHeight(9, 0);
    assert.equal(none, null);
  });

  it('resolveFloorDeckY forces neighbor height at spawn time', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 2.15, { hw: 1.5, hd: 1.5 });
    const wrongTerrain = 1.72;
    assert.equal(BA.resolveFloorDeckY(3, 0, wrongTerrain), 2.15);
    assert.equal(BA.resolveFloorDeckY(12, 0, wrongTerrain), wrongTerrain);
  });

  it('computeUnifiedFloorHeight uses max of connected neighbors', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 2.0, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('f2', 3, 0, 1.6, { hw: 1.5, hd: 1.5 });
    const u = BA.computeUnifiedFloorHeight(3, 0, 1.55);
    assert.equal(u.targetY, 2.0);
    assert.equal(u.toLift.length, 1);
    assert.equal(u.toLift[0].id, 'f2');
  });

  it('computeUnifiedFloorHeight propagates max across a line', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('a', 0, 0, 2.4, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('b', 3, 0, 1.5, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('c', 6, 0, 1.5, { hw: 1.5, hd: 1.5 });
    const u = BA.computeUnifiedFloorHeight(6, 0, 1.45);
    assert.equal(u.targetY, 2.4);
    assert.equal(u.toLift.length, 2);
  });

  it('floor snap reaches adjacent anchor on sloped off-grid foundation', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 2.5, 2.5, 1.8, { hw: 1.5, hd: 1.5, level: 0 });

    const fromAim = BA.snapPlacement(1.0, 4.5, 'floor', 0, 0);
    assert.ok(fromAim?.snapped);
    assert.equal(fromAim.x, 2.5);
    assert.equal(fromAim.z, 5.5);
    assert.equal(fromAim.baseY, 1.8);

    const fromBadGrid = BA.snapPlacement(0, 3, 'floor', 0, 0);
    assert.ok(fromBadGrid?.snapped);
    assert.equal(fromBadGrid.x, -0.5);
    assert.equal(fromBadGrid.z, 2.5);
    assert.equal(fromBadGrid.baseY, 1.8);
  });

  it('getNearestFloorAnchor returns extension position and height', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 1.2, { hw: 1.5, hd: 1.5 });
    const near = BA.getNearestFloorAnchor(0.5, 2.8);
    assert.ok(near);
    assert.equal(near.x, 0);
    assert.equal(near.z, 3);
    assert.equal(near.baseY, 1.2);
  });

  it('reconcileAllFoundationHeights lifts every floor in a connected group', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('a', 0, 0, 2.4, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('b', 3, 0, 1.5, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('c', 6, 0, 1.5, { hw: 1.5, hd: 1.5 });
    const lifts = BA.reconcileAllFoundationHeights();
    assert.equal(lifts.length, 2);
    assert.equal(BA.listFoundations(0, 0, 0).find((f) => f.cx === 3)?.baseY, 2.4);
    assert.equal(BA.listFoundations(0, 0, 0).find((f) => f.cx === 6)?.baseY, 2.4);
    assert.equal(BA.listFoundations(0, 0, 0).find((f) => f.cx === 0)?.baseY, 2.4);
  });

  it('reconcileAllFoundationHeights ignores isolated foundations', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('solo', 9, 9, 1.1, { hw: 1.5, hd: 1.5 });
    assert.equal(BA.reconcileAllFoundationHeights().length, 0);
  });

  it('clampFloorDeckY pulls sky baseY down to terrain', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => 1.2 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('sky', 0, 0, 18, { hw: 1.5, hd: 1.5, level: 8 });
    const f = BA.listFoundations(0, 0, 0)[0];
    assert.ok(f.baseY < 3, `expected ground height, got ${f.baseY}`);
    assert.equal(f.level, 0);
  });

  it('unified height keeps neighbor deck on slope (no local clamp down)', () => {
    const ctx = {
      window: {},
      ZS: { getTerrainHeight: (x) => (Math.abs(x) < 0.01 ? 2.4 : 0.6) },
    };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('high', 0, 0, 2.4, { hw: 1.5, hd: 1.5 });
    const u = BA.computeUnifiedFloorHeight(3, 0, 0.6);
    assert.equal(u.targetY, 2.4);
    assert.equal(BA.clampFloorDeckY(3, 0, 2.4, 0), 2.4);
  });

  it('wall snap uses foundation baseY even when foundation level > buildLevel UI', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 2.5, { hw: 1.5, hd: 1.5, level: 1 });
    const wall = BA.snapPlacement(0.2, 1.45, 'wall', 0, 0);
    assert.ok(wall?.snapped);
    assert.equal(wall.baseY, 2.5);
    const deck = BA.findFoundationDeckNear(0.1, 0.1, 0);
    assert.equal(deck?.baseY, 2.5);
  });

  it('resolveFloorDeckY rejects sky Y even with high buildLevel', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => 1.2 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    assert.ok(BA.resolveFloorDeckY(5, 5, 18, null, 6) < 5);
    assert.ok(BA.resolveFloorDeckY(5, 5, 18, null, 0) < 3);
  });

  it('registerFoundation clamps corrupt sky baseY and level', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => 1.2 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('sky', 0, 0, 18, { hw: 1.5, hd: 1.5, level: 6 });
    const f = BA.listFoundations(0, 0, 0)[0];
    assert.ok(f.baseY < 3, `expected ground height, got ${f.baseY}`);
    assert.equal(f.level, 0);
    assert.equal(BA.snapPlacement(0.1, 3, 'floor', 0, 0)?.baseY, f.baseY);
  });

  it('resolveStructureBaseY snaps wall to foundation deck not sky fallback', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => -9.3 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('f1', 0, 0, -8.9, { hw: 1.5, hd: 1.5 });
    const onEdge = BA.resolveStructureBaseY(0, 1.5, 18, 0);
    assert.ok(Math.abs(onEdge - (-8.9)) < 0.05, `expected deck -8.9 got ${onEdge}`);
    const wallSnap = BA.snapPlacement(0.1, 1.45, 'wall', 0, 0);
    assert.ok(wallSnap?.snapped);
    assert.ok(Math.abs(wallSnap.baseY - (-8.9)) < 0.05, `wall snap y ${wallSnap.baseY}`);
  });

  it('wall snap ignores incoherent sky foundations', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => 1.0 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('ok', 0, 0, 1.0, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('junk', 40, 40, 25, { hw: 1.5, hd: 1.5 });
    const wall = BA.snapPlacement(0.1, 1.45, 'wall', 0, 0);
    assert.equal(wall?.baseY, 1);
    assert.notEqual(wall?.baseY, 25);
  });

  it('isolated floor placement clamps sky fallback to terrain', () => {
    const ctx = { window: {}, ZS: { getTerrainHeight: () => 1.15 } };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    const u = BA.computeUnifiedFloorHeight(12, 12, 18, null, 0);
    assert.ok(u.targetY < 3, `expected terrain height, got ${u.targetY}`);
    assert.equal(u.toLift.length, 0);
  });

  it('unified cluster ignores incoherent sky neighbor', () => {
    const ctx = {
      window: {},
      ZS: { getTerrainHeight: (x) => (Math.abs(x) < 0.01 ? 2.0 : 1.0) },
    };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('good', 0, 0, 2.0, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('sky', 3, 0, 22, { hw: 1.5, hd: 1.5, level: 8 });
    const u = BA.computeUnifiedFloorHeight(3, 0, 1.0, null, 0);
    assert.equal(u.targetY, 2.0);
    assert.ok(u.targetY < 5);
  });

  it('wall snap works on lifted neighbor foundation after cluster unify', () => {
    const ctx = {
      window: {},
      ZS: { getTerrainHeight: (x) => (Math.abs(x) < 0.01 ? 2.4 : 0.6) },
    };
    ctx.window.ZS = ctx.ZS;
    vm.runInNewContext(src, ctx);
    const BA = ctx.ZS.BuildAnchors;
    BA.registerFoundation('high', 0, 0, 2.4, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('low', 3, 0, 2.4, { hw: 1.5, hd: 1.5 });
    const north = BA.snapPlacement(3.1, 2.0, 'wall', 0, 0, { playerX: 3, playerZ: 0.5 });
    assert.ok(north?.snapped, 'north edge should snap');
    assert.equal(north.z, 1.5);
    assert.equal(north.x, 3);
    assert.equal(north.baseY, 2.4);
    const east = BA.snapPlacement(5.0, 0.2, 'wall', -Math.PI / 2, 0, { playerX: 3.5, playerZ: 0 });
    assert.ok(east?.snapped, 'east edge should snap');
    assert.equal(east.x, 4.5);
    assert.equal(east.baseY, 2.4);
  });

  it('shared edge between two foundations is not a wall anchor', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('a', 0, 0, 1.0, { hw: 1.5, hd: 1.5 });
    BA.registerFoundation('b', 3, 0, 1.0, { hw: 1.5, hd: 1.5 });
    const edges = BA.listExposedWallEdges(20, 1.5, 0);
    const shared = edges.filter((e) => Math.abs(e.x - 1.5) < 0.01 && Math.abs(e.z) < 0.01);
    assert.equal(shared.length, 0);
    assert.ok(edges.some((e) => Math.abs(e.x - 4.5) < 0.01));
    assert.ok(edges.some((e) => Math.abs(e.x + 1.5) < 0.01));
  });

  it('ceiling snap anchors to foundation center at wall top', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 0, 0, 1.2, { hw: 1.5, hd: 1.5, level: 0 });
    const snap = BA.snapPlacement(0.15, -0.1, 'ceiling', 0, 0);
    assert.ok(snap?.snapped);
    assert.equal(snap.x, 0);
    assert.equal(snap.z, 0);
    assert.equal(snap.baseY, 1.2 + 2.6);
    assert.equal(snap.anchorKind, 'ceiling');
  });

  it('resolveCeilingDeckY uses foundation under cell', () => {
    const BA = loadAnchors();
    BA.clear();
    BA.registerFoundation('f1', 3, 0, 2.1, { hw: 1.5, hd: 1.5 });
    assert.equal(BA.resolveCeilingDeckY(3.2, 0.1, 0), 2.1 + 2.6);
    assert.equal(BA.findFoundationUnderCell(3.2, 0.1, 0)?.baseY, 2.1);
  });
});
