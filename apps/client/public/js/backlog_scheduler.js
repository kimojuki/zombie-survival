/**
 * @deprecated Chargé seulement si /src/engine/install.js n'a pas tourné avant legacy.
 * Source de vérité : apps/client/src/engine/backlog-scheduler.js
 */
(function () {
  const ZS = window.ZS = window.ZS || {};
  if (ZS.BacklogScheduler) return;
  console.error(
    '[engine] BacklogScheduler absent — game.html doit importer /src/engine/install.js avant les scripts legacy',
  );
})();
