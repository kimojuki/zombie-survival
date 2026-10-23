// Export ZS.ArmTuner — extrait de fps_arm_tuner.js (IIFE)
  window.ZS = window.ZS || {};
  ZS.ArmTuner = ArmTuner;

  _registerCatalogProfiles();
  _ensureDerivedCalibrationsSeeded();
  _registerCalibrationTools();
  _ensurePresetsMigrated();
