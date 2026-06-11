// Horloges décor — worldTime (0–1) → rotation aiguilles analogiques.

(function () {

  'use strict';



  const TWO_PI = Math.PI * 2;

  const DAY_MINUTES = 24 * 60;



  function worldTimeToClockHands(worldTime) {

    const t = ((Number(worldTime) % 1) + 1) % 1;

    const totalMinutes = t * DAY_MINUTES;

    const minute = totalMinutes % 60;

    return {

      hourZ: ((totalMinutes % 720) / 720) * TWO_PI,

      minuteZ: (minute / 60) * TWO_PI,

      hour24: (totalMinutes / 60) % 24,

      minute: Math.floor(minute),

      totalMinutes,

    };

  }



  /** handsRoot.rotation.y = π : delta négatif = sens horaire sur le cadran. */

  function advanceClockHandRotationZ(currentZ, dMinutes, periodMinutes) {

    return currentZ - (dMinutes / periodMinutes) * TWO_PI;

  }



  /** @param {Array<{ hourHand?: object, minuteHand?: object, pendulum?: object }>} clocks */

  function applyWallClockHands(clocks, worldTime, nowMs) {

    if (!clocks?.length) return;

    const a = worldTimeToClockHands(worldTime);

    const pend = Math.sin((nowMs ?? Date.now()) * 0.0028) * 0.14;

    for (const c of clocks) {

      if (!c.hourHand?.parent) continue;

      const prev = c._clockTotalMinutes;

      if (!Number.isFinite(prev)) {

        c.hourHand.rotation.z = a.hourZ;

        if (c.minuteHand?.parent) c.minuteHand.rotation.z = a.minuteZ;

      } else {

        let dMin = a.totalMinutes - prev;

        if (dMin < -DAY_MINUTES / 2) dMin += DAY_MINUTES;

        if (dMin < 0) {

          c.hourHand.rotation.z = a.hourZ;

          if (c.minuteHand?.parent) c.minuteHand.rotation.z = a.minuteZ;

        } else if (dMin > 0) {

          c.hourHand.rotation.z = advanceClockHandRotationZ(c.hourHand.rotation.z, dMin, 720);

          if (c.minuteHand?.parent) {

            c.minuteHand.rotation.z = advanceClockHandRotationZ(c.minuteHand.rotation.z, dMin, 60);

          }

        }

      }

      c._clockTotalMinutes = a.totalMinutes;

      if (c.pendulum?.parent) c.pendulum.rotation.z = pend;

    }

  }



  window.ZS = window.ZS || {};

  ZS.worldTimeToClockHands = worldTimeToClockHands;

  ZS.advanceClockHandRotationZ = advanceClockHandRotationZ;

  ZS.applyWallClockHands = applyWallClockHands;

}());


