'use strict';

/**
 * Normalise un zombie chargé depuis la BDD / persist.
 * - Ignore les zombies tutoriel (éphémères, respawnés par le scénario plage)
 * - Lève le gel persisté (sinon statues après reboot)
 * - Répare speed / wander / timers manquants (évite NaN → plus de déplacement)
 */
function normalizeLoadedZombie(raw) {
  if (!raw || raw.id == null) return null;
  if (raw.tutorial) return null;
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.z)) return null;

  const z = { ...raw };
  z.frozen = false;
  z.scenarioFrozen = false;
  delete z.tutorial;
  delete z.ownerPlayerId;
  delete z.tutorialHit;
  delete z.baseSpeed;
  delete z.lastSeenX;
  delete z.lastSeenZ;

  if (!Number.isFinite(z.speed) || z.speed <= 0) {
    z.speed = 1.8 + Math.random() * 1.4;
  }
  if (!Number.isFinite(z.wanderAngle)) {
    z.wanderAngle = Math.random() * Math.PI * 2;
  }
  if (!Number.isFinite(z.angle)) z.angle = z.wanderAngle;
  if (!Number.isFinite(z.wanderTimer) || z.wanderTimer < 0) {
    z.wanderTimer = 2 + Math.random() * 3;
  }
  if (!Number.isFinite(z.aggroTimer) || z.aggroTimer < 0) z.aggroTimer = 0;
  if (!Number.isFinite(z.attackTimer) || z.attackTimer < 0) z.attackTimer = 0;
  if (!Number.isFinite(z.health)) z.health = Number.isFinite(z.maxHealth) ? z.maxHealth : 100;
  if (!Number.isFinite(z.maxHealth) || z.maxHealth <= 0) z.maxHealth = z.health;
  return z;
}

/** Ne pas persister les zombies tutoriel (état de scénario). */
function shouldPersistZombie(z) {
  return !!(z?.id) && !z.tutorial;
}

/**
 * Payload BDD : pas de flags runtime de gel / sync.
 * Le gel tutoriel est éphémère — un reboot ne doit pas laisser des statues.
 */
function zombiePayloadForPersist(z) {
  if (!shouldPersistZombie(z)) return null;
  const copy = { ...z };
  copy.frozen = false;
  copy.scenarioFrozen = false;
  delete copy._syncX;
  delete copy._syncZ;
  delete copy._syncAng;
  delete copy._syncHp;
  delete copy._syncReach;
  delete copy._syncFrozen;
  delete copy.lastSeenX;
  delete copy.lastSeenZ;
  delete copy.meleeReach;
  return copy;
}

module.exports = {
  normalizeLoadedZombie,
  shouldPersistZombie,
  zombiePayloadForPersist,
};
