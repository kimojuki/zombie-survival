// Posture joueur — hauteur des yeux, accroupi (partagé client).
(function () {
  'use strict';

  const EYE_STAND = 1.7;
  const EYE_CROUCH = 1.05;
  const CROUCH_SPEED_MULT = 0.52;
  const CROUCH_MESH_SCALE = 0.72;

  function eyeHeight(crouchT) {
    const t = Math.max(0, Math.min(1, crouchT || 0));
    return EYE_STAND + (EYE_CROUCH - EYE_STAND) * t;
  }

  function footFromEye(eyeY, crouching) {
    return eyeY - (crouching ? EYE_CROUCH : EYE_STAND);
  }

  function isCrouched(crouchT) {
    return (crouchT || 0) > 0.55;
  }

  window.ZS = window.ZS || {};
  ZS.PlayerStance = {
    EYE_STAND,
    EYE_CROUCH,
    CROUCH_SPEED_MULT,
    CROUCH_MESH_SCALE,
    eyeHeight,
    footFromEye,
    isCrouched,
  };
}());
