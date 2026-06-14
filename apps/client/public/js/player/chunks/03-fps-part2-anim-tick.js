// Anim bras + tick rig
function triggerArmAnim(fpsGroup, kind, type, opts) {
    opts = opts || {};
    const grip = getGrip(type || fpsGroup.userData.gripType);
    const animDef = grip.anim[kind] || _ANIM_BASE[kind] || _ANIM_BASE.melee;
    let dur = opts.dur ?? animDef.dur ?? 0.32;
    if (kind === 'reload' && opts.dur) dur = opts.dur;
    fpsGroup.userData.anim = { kind, start: performance.now() / 1000, dur, type: type || fpsGroup.userData.gripType };
  }

  function isArmAnimActive(fpsGroup) {
    return !!fpsGroup.userData.anim;
  }

  function tickArmAnim(fpsGroup, dt) {
    const anim = fpsGroup.userData.anim;
    const base = fpsGroup.userData.basePose;
    if (!anim || !base) return false;
    if (anim.kind === 'debug_freeze' || fpsGroup.userData.tunerFreeze) return false;
    const now = performance.now() / 1000;
    const e = (now - anim.start) / anim.dur;
    if (e >= 1) {
      fpsGroup.userData.anim = null;
      _applyGripPose(fpsGroup, base.grip);
      return false;
    }
    const grip = getGrip(anim.type || fpsGroup.userData.gripType);
    const s = Math.sin(e * Math.PI);
    const io = {}, ro = {}, lo = {};
    const mcOff = { swing: 0, useT: null };

    if (anim.kind === 'melee' || anim.kind === 'punch') {
      const a = anim.kind === 'punch' ? grip.anim.punch : grip.anim.melee;
      if (a.style === 'rock_slam') {
        const windEnd = 0.20;
        let shoulderRx = 0;
        let elbowRx = 0;
        let wristRx = 0;
        if (e <= windEnd) {
          const u = Math.sin((e / windEnd) * Math.PI * 0.5);
          shoulderRx = u * 0.28;
          elbowRx = u * 0.12;
          io.y = u * 0.04;
          io.rx = u * 0.06;
        } else {
          const t = (e - windEnd) / (1 - windEnd);
          const hit = Math.sin(t * Math.PI);
          const ease = Math.sin(Math.sqrt(t) * Math.PI);
          shoulderRx = -0.82 * ease;
          elbowRx = -0.52 * hit;
          wristRx = 0.30 * hit;
          io.rx = -hit * (a.swingX || 0.55) * 0.18;
          io.rz = hit * (a.swingZ || 0.12) * 0.22;
        }
        ro.shoulderRx = shoulderRx;
        ro.elbowRx = elbowRx;
        ro.wristRx = wristRx;
        lo.shoulderRx = shoulderRx;
        lo.elbowRx = elbowRx;
        lo.wristRx = wristRx;
      } else if (a.style === 'thrust_forward') {
        const thrust = s * (a.thrustZ || 0.20);
        io.z = -thrust;
        ro.z = -thrust;
        lo.z = -thrust;
        const ext = s * (a.rArmX || 0.10);
        ro.x = -ext;
        lo.x = -ext;
        io.rx = -s * (a.swingX || 0.10) * 0.2;
      } else {
        mcOff.swing = e;
        io.rx = -s * (a.swingX || 0.5) * 0.12;
        io.rz =  s * (a.swingZ || 0.18) * 0.25;
        io.ry =  s * (a.swingY || 0);
      }
    } else if (anim.kind === 'use') {
      mcOff.useT = e;
    } else if (anim.kind === 'recoil') {
      const a = grip.anim.recoil;
      io.z = s * (a.kickZ || 0.05);
      io.rx = -s * (a.pitchX || 0.12);
      ro.z = s * (a.rArmX || 0.06) * 0.5;
      if (grip.twoHanded) lo.rz = s * (a.lArmZ || 0.03);
    } else if (anim.kind === 'reload') {
      const a = grip.anim.reload;
      const phase = e < 0.35 ? e / 0.35 : (e < 0.70 ? 1 : (1 - e) / 0.30);
      io.y  = -phase * (a.dropY || 0.12);
      io.rx =  phase * (a.tiltX || 0.32);
      if (grip.twoHanded) lo.y = Math.sin(Math.max(0, e - 0.35) / 0.35 * Math.PI) * (a.magPull || 0.10);
    }

    _applyGripPose(fpsGroup, base.grip, { item: io, rArm: ro, lArm: lo, swing: mcOff.swing, useT: mcOff.useT });
    return true;
  }

  function tickFPSArms(fpsGroup, dt, opts) {
    opts = opts || {};
    if (fpsGroup.userData.anim) return;
    const base = fpsGroup.userData.basePose;
    if (!base) return;

    fpsGroup.userData.idleTime += dt;
    const grip = base.grip;
    const idle = (grip.emptyHand && _FPS_EMPTY_ANIM.idle)
      ? { ...grip.anim.idle, ..._FPS_EMPTY_ANIM.idle } : grip.anim.idle;
    const walk = (grip.emptyHand && _FPS_EMPTY_ANIM.walk)
      ? { ...grip.anim.walk, ..._FPS_EMPTY_ANIM.walk } : grip.anim.walk;
    const t = fpsGroup.userData.idleTime;

    const breathe = Math.sin(t * (idle.freq || 1.6) * Math.PI * 2) * (idle.breatheY || 0.002);
    const sway    = Math.sin(t * (idle.freq || 1.6) * 0.7 * Math.PI * 2) * (idle.swayZ || 0.0015);

    let bobY = 0, bobZ = 0;
    const ro = { y: breathe * 0.4 };
    const lo = grip.twoHanded ? { y: breathe * 0.35 } : {};
    if (opts.moving && opts.speed > 0.5) {
      fpsGroup.userData.walkPhase += dt * (walk.freq || 9.0);
      const w = Math.sin(fpsGroup.userData.walkPhase);
      const pace = Math.min(1, opts.speed / 5);
      bobY = w * (walk.bobY || 0.008) * pace;
      bobZ = Math.abs(w) * (walk.bobZ || 0.004) * pace;
      const swingY = Math.abs(w) * (walk.swingY || 0) * pace;
      ro.y = breathe * 0.4 - bobY * 0.5 + swingY;
      ro.shoulderRx = w * (walk.shoulderRx || 0) * pace;
      ro.shoulderRy = w * (walk.shoulderRy || 0) * pace;
      ro.elbowRx = w * (walk.elbowRx || 0) * pace;
      ro.z = w * (walk.swingZ || 0) * pace;
      if (grip.twoHanded) {
        lo.y = breathe * 0.35 - bobY * 0.45 + swingY;
        lo.shoulderRx = ro.shoulderRx;
        lo.shoulderRy = ro.shoulderRy;
        lo.elbowRx = ro.elbowRx;
        lo.z = ro.z;
      }
    } else {
      ro.shoulderRy = sway * 2.2;
      if (grip.twoHanded) lo.shoulderRy = sway * -1.8;
    }

    _applyGripPose(fpsGroup, base.grip, {
      item: { y: breathe - bobY, z: sway + bobZ },
      rArm: ro,
      lArm: lo,
    });
  }

  // ── Modèles .glb (libres de droits, Quaternius CC0) ─────────────────────────
  // type → fichier dans /models + rotation d'orientation [x, y, z] (radians).
  // La taille est gérée par _fit(). Les types absents → modèle procédural.
  const GLB = {
    // Armes à feu
    wpn_pistolet:        { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    pistol:              { file: 'pistol',        rot: [0, Math.PI / 2, 0] },
    wpn_fusil_pompe:     { file: 'shotgun',       rot: [0, Math.PI / 2, 0] },
    wpn_fusil_chasse:    { file: 'sniper_rifle',  rot: [0, Math.PI / 2, 0] },
    // Mêlée / outils
    wpn_couteau:         { file: 'knife',         rot: [0, 0, 0] },
    wpn_hache_combat:    { file: 'axe',           rot: [0, 0, 0] },
    tool_hachette:       { file: 'axe',           rot: [0, 0, 0] },
    tool_pioche:         { file: 'shovel',        rot: [0, 0, 0] },
    tool_torche:         { file: 'wooden_torch',  rot: [0, 0, 0] },
    // Nourriture / médical / ressources
    food_eau_bouteille:  { file: 'water_bottle',  rot: [0, 0, 0] },
    food_conserves:      { file: 'can',           rot: [0, 0, 0] },
    food_haricots_boite: { file: 'can_red',       rot: [0, 0, 0] },
    food_soupe_conserve: { file: 'can_broken',    rot: [0, 0, 0] },
    med_kit_soin:        { file: 'first_aid_kit', rot: [0, 0, 0] },
    res_bois_brut:       { file: 'wood_log',      rot: [0, 0, 0] },
    // Équipement (sac à dos, 3 tailles → même modèle)
    eq_petit_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_sac_moyen:        { file: 'backpack',      rot: [0, Math.PI, 0] },
    eq_grand_sac:        { file: 'backpack',      rot: [0, Math.PI, 0] },
  };

  // Taille cible (plus grande dimension, en m) de l'item en main — volontairement
  // généreuse pour que l'objet équipé soit bien visible.
  function tickHumanoidRig(root, dt, opts) {
    opts = opts || {};
    const limbs = root?.userData?.limbs;
    const rig = root?.userData?.rig;
    if (!root || !limbs || !rig) return;

    if (Number.isFinite(opts.x) && Number.isFinite(opts.y) && Number.isFinite(opts.z)) {
      root.position.set(opts.x, opts.y, opts.z);
    }
    if (Number.isFinite(opts.yaw)) {
      root.rotation.y = opts.yaw;
    }

    const moving = !!opts.moving && (Number(opts.speed) || 0) > 0.1;
    const speed = Math.max(0, Number(opts.speed) || 0);
    const t = (root.userData._avatarTime || 0) + dt;
    root.userData._avatarTime = t;

    const breathe = Math.sin(t * 2.1) * 0.025;
    const sway = Math.sin(t * 1.25) * 0.018;
    const walk = moving ? Math.sin(t * Math.max(4, speed * 1.5)) * 0.6 : 0;

    if (limbs.lLeg) limbs.lLeg.rotation.x = -walk;
    if (limbs.rLeg) limbs.rLeg.rotation.x = walk;
    if (limbs.lArm) {
      limbs.lArm.rotation.x = -walk * 0.75 + breathe;
      limbs.lArm.rotation.z = 0.02 + sway;
    }
    if (limbs.rArm) {
      limbs.rArm.rotation.x = walk * 0.75 + breathe;
      limbs.rArm.rotation.z = -0.02 - sway;
    }
    if (rig.neck) rig.neck.rotation.x = breathe * 0.2;
    if (rig.head && Number.isFinite(opts.pitch)) {
      rig.head.rotation.x = Math.max(-0.35, Math.min(0.35, opts.pitch * 0.35));
    }

    if (!moving) {
      if (limbs.lLeg) limbs.lLeg.rotation.x *= 0.9;
      if (limbs.rLeg) limbs.rLeg.rotation.x *= 0.9;
      if (limbs.lArm) limbs.lArm.rotation.x *= 0.9;
      if (limbs.rArm) limbs.rArm.rotation.x *= 0.9;
    }
  }
