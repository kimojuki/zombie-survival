'use strict';

/**
 * Game-init payload — joueurs connectés, décor proche, sleepers, loot au sol.
 */
function createPlayerSession(deps) {
  const {
    normPlayerId,
    sleepBodyId,
    ensureSlotGrid,
    cloneInv,
    authPayload,
    decorItemsForGameInit,
    getDecorItems,
    getPlayers,
    getItems,
    getZombies,
    getStructures,
    getSleepingPlayers,
    getWorldTime,
    getServerFlags,
    isQaServer,
    serverRole,
    guestCommitMs,
    invDebugBuild,
    getWorldColliders,
  } = deps;

  function introPersonalVisibleTo(entry, viewerPlayerId) {
    if (!entry?.introPersonal) return true;
    if (entry.ownerPlayerId == null || viewerPlayerId == null) return false;
    return normPlayerId(entry.ownerPlayerId) === normPlayerId(viewerPlayerId);
  }

  function decorItemsForGameInitPlayer(px, pz, clientKind, playerId) {
    const list = decorItemsForGameInit(getDecorItems(), px, pz, clientKind);
    if (playerId == null) return list;
    return list.filter((d) => introPersonalVisibleTo(d, playerId));
  }

  function isBenchUsername(username) {
    return typeof username === 'string' && username.startsWith('zsbench_');
  }

  function sleepersForGameInit(px, pz) {
    const maxN = 40;
    const maxR2 = 200 * 200;
    const rows = [];
    for (const s of getSleepingPlayers().values()) {
      const dx = (s.x ?? 0) - px;
      const dz = (s.z ?? 0) - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > maxR2) continue;
      rows.push({ s, d2 });
    }
    rows.sort((a, b) => a.d2 - b.d2);
    return rows.slice(0, maxN).map((r) => r.s);
  }

  function itemsForGameInit(px, pz, playerId) {
    const maxN = 80;
    const maxR2 = 180 * 180;
    const rows = [];
    for (const it of getItems().values()) {
      if (!introPersonalVisibleTo(it, playerId)) continue;
      if (!Number.isFinite(it.x) || !Number.isFinite(it.z)) continue;
      const d2 = (it.x - px) ** 2 + (it.z - pz) ** 2;
      if (d2 > maxR2) continue;
      rows.push({ it, d2 });
    }
    rows.sort((a, b) => a.d2 - b.d2);
    return rows.slice(0, maxN).map((r) => r.it);
  }

  function buildGameInitPayload(socket, p, scenMod, wokeFromSleep) {
    ensureSlotGrid(p.inv);
    const clientKind = socket.handshake.auth?.client === 'mobile' ? 'mobile' : 'desktop';
    const pid = normPlayerId(p.id);
    const initDecor = decorItemsForGameInitPlayer(p.x, p.z, clientKind, pid);
    const players = getPlayers();
    return {
      selfId: socket.id,
      playerId: pid,
      spawn: { x: p.x, y: p.y, z: p.z, rotY: p.rotY },
      players: [...players.entries()]
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, q]) => ({
          id: sid,
          username: q.username,
          x: q.x,
          y: q.y,
          z: q.z,
          rotY: q.rotY,
          equipped: q.equipped,
        })),
      zombies: scenMod.filterZombiesForPlayer(p, Array.from(getZombies().values())),
      items: itemsForGameInit(p.x, p.z, pid),
      decorItems: initDecor,
      structures: Array.from(getStructures().values()),
      worldTime: getWorldTime(),
      serverFlags: { ...getServerFlags() },
      username: p.username,
      ...authPayload(p.username),
      features: {
        chat: true,
        qa: isQaServer(),
        guest: !!p.guest,
        guestCommitted: !!p.guestCommitted,
        guestCommitMinutes: Math.round(guestCommitMs / 60000),
        guestPlaytimeMs: p.guestPlaytimeMs || 0,
        canCreateGroup: !p.guest,
      },
      serverRole,
      qaEnabled: isQaServer(),
      onlineCount: players.size,
      playerKills: p.lifePlayerKills ?? 0,
      health: Math.max(0, Math.floor(p.health ?? 100)),
      inventory: cloneInv(p.inv),
      scenario: p.inv.scenario,
      survival: p.survival,
      wokeFromSleep: !!wokeFromSleep,
      worldCollidersReady: getWorldColliders().length > 0,
      sleeping: sleepersForGameInit(p.x, p.z).map((s) => ({
        id: sleepBodyId(s.playerId),
        playerId: s.playerId,
        username: s.username,
        x: s.x,
        y: s.y,
        z: s.z,
        rotY: s.rotY,
        equipped: (s.dead ? s._deathEquipped : s.equipped) || null,
        dead: !!s.dead || s.health <= 0,
        health: s.health ?? 100,
      })),
      killedWhileOffline: !!p._killedWhileOffline,
      respawnReason: p._respawnReason || null,
      serverBuild: invDebugBuild,
      invDebugBuild,
    };
  }

  return {
    buildGameInitPayload,
    decorItemsForGameInitPlayer,
    isBenchUsername,
    introPersonalVisibleTo,
  };
}

module.exports = { createPlayerSession };
