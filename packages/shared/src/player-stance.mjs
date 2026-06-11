/** Hauteur des yeux / posture joueur — client + serveur. */

export const PLAYER_EYE_STAND = 1.7;
export const PLAYER_EYE_CROUCH = 1.05;
export const PLAYER_CROUCH_SPEED_MULT = 0.52;
export const PLAYER_CROUCH_MESH_SCALE = 0.72;

export function playerEyeHeight(crouchT = 0) {
  const t = Math.max(0, Math.min(1, crouchT));
  return PLAYER_EYE_STAND + (PLAYER_EYE_CROUCH - PLAYER_EYE_STAND) * t;
}

export function eyeYToFootY(eyeY, crouching = false) {
  const h = crouching ? PLAYER_EYE_CROUCH : PLAYER_EYE_STAND;
  return eyeY - h;
}

export function isPlayerCrouched(crouchT = 0) {
  return crouchT > 0.55;
}
