// S01 bounds/build exclusions client mirror.
(function () {
  'use strict';
  window.ZS = window.ZS || {};

  function isS01BuildBlocked(x, z, halfW, halfD) {
    if (ZS.isBuildBlockedOnBeach) {
      return ZS.isBuildBlockedOnBeach(x, z, halfW, halfD);
    }
    return false;
  }

  ZS.S01Bounds = {
    ...(ZS.S01Bounds || {}),
    isS01BuildBlocked,
  };
}());
