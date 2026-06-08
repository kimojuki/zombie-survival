import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveConnectHealthFlags,
  connectHealthValue,
  shouldEmitDeathOnConnect,
} from '../apps/server/src/player-connect-health.js';

describe('player connect health', () => {
  it('offline kill respawns at beach', () => {
    const flags = resolveConnectHealthFlags({
      killedWhileOffline: true,
      hasLiveRestore: false,
      savedHealth: 0,
    });
    assert.equal(flags.forceBeachRespawn, true);
    assert.equal(flags.respawnReason, 'offline_kill');
    assert.equal(connectHealthValue({ forceBeachRespawn: true, restore: null, saved: { health: 0 } }), 100);
  });

  it('stale DB death (0 HP, no session) respawns at beach', () => {
    const flags = resolveConnectHealthFlags({
      killedWhileOffline: false,
      hasLiveRestore: false,
      savedHealth: 0,
    });
    assert.equal(flags.forceBeachRespawn, true);
    assert.equal(flags.respawnReason, 'stale_death');
  });

  it('wake from sleeper keeps saved health', () => {
    const flags = resolveConnectHealthFlags({
      killedWhileOffline: false,
      hasLiveRestore: true,
      savedHealth: 0,
    });
    assert.equal(flags.forceBeachRespawn, false);
    assert.equal(
      connectHealthValue({
        forceBeachRespawn: false,
        wokeFromSleep: true,
        restore: { health: 42 },
        saved: { health: 0 },
      }),
      42,
    );
  });

  it('normal connect uses DB health', () => {
    assert.equal(
      connectHealthValue({ forceBeachRespawn: false, restore: null, saved: { health: 88 } }),
      88,
    );
  });

  it('emits death screen when session has deathHandled at 0 HP', () => {
    assert.equal(shouldEmitDeathOnConnect({ _deathHandled: true, health: 0 }), true);
    assert.equal(shouldEmitDeathOnConnect({ _deathHandled: false, health: 0 }), false);
    assert.equal(shouldEmitDeathOnConnect({ _deathHandled: true, health: 50 }), false);
  });
});
