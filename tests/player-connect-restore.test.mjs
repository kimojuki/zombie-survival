import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStaleWorldSleeper,
  parseDbTimestamp,
  resolveConnectSurvival,
  sleeperPlayersTableSurvival,
} from '../apps/server/src/player-connect-restore.js';

describe('player connect restore', () => {
  it('parseDbTimestamp — sqlite datetime', () => {
    const ms = parseDbTimestamp('2026-06-13 14:30:00');
    assert.ok(Number.isFinite(ms));
  });

  it('stale sleeper when players.last_saved is newer than sleeper row', () => {
    const since = Date.now() - 3600000;
    const sleep = {
      since,
      _worldUpdatedAt: '2026-06-13 10:00:00',
      username: 'bruno',
      survival: { faim: 0, soif: 0 },
    };
    const saved = { last_saved: '2026-06-13 12:00:00' };
    assert.equal(isStaleWorldSleeper(sleep, saved), true);
  });

  it('fresh sleeper when last_saved predates sleeper', () => {
    const since = Date.now();
    const sleep = { since, _worldUpdatedAt: '2026-06-13 14:00:00', username: 'bruno' };
    const saved = { last_saved: '2026-06-13 10:00:00' };
    assert.equal(isStaleWorldSleeper(sleep, saved), false);
  });

  it('wake from sleeper restores disconnect snapshot not offline decay', () => {
    const def = { faim: 80, soif: 80, infection: 0, saignement: false, endurance: 100 };
    const sv = resolveConnectSurvival({
      forceBeachRespawn: false,
      restore: {
        survival: { faim: 0, soif: 0, infection: 0, saignement: false },
        _survivalAtDisconnect: { faim: 62, soif: 55, infection: 0, saignement: false },
      },
      dbSurvival: { faim: 0, soif: 0 },
      wokeFromSleep: true,
      defaultSurvival: def,
    });
    assert.equal(sv.faim, 62);
    assert.equal(sv.soif, 55);
  });

  it('sleeper DB save uses disconnect snapshot', () => {
    const def = { faim: 80, soif: 80, infection: 0, saignement: false, endurance: 100 };
    const snap = sleeperPlayersTableSurvival({
      survival: { faim: 0, soif: 0 },
      _survivalAtDisconnect: { faim: 70, soif: 68 },
    }, def);
    assert.equal(snap.faim, 70);
    assert.equal(snap.soif, 68);
  });
});
