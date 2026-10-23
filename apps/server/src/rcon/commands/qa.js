'use strict';

/** checklist QA serveur — extrait de rcon.js */
function registerQaCommands(env) {
  const {
    register,
    ctx,
    commands,
    ok,
    fail,
    _arr,
    findPlayer,
    broadcastTime,
    broadcastFlags,
    broadcastDecorSpawn,
    broadcastDecorRemove,
    listDecorItems,
    listDecorPrefabs,
    listItemTypes,
    _parseDecorPlacement,
    findNearestZombie,
    listZombiePrefabs,
    findNearestDecor,
    _getS01Checkpoints,
  } = env;

  register('qa', 'QA — qa new|add|list|failures|testers|fix|full|close', async (args) => {
      const qa = ctx.qaChecklist;
      if (!qa) return fail('Module QA indisponible');
      const sub = (args[1] || 'list').toLowerCase();
  
      if (sub === 'new' || sub === 'campaign') {
        const title = args[2] || 'Campagne QA';
        const full = (args[3] || '').toLowerCase() === 'full';
        const id = await qa.createCampaign(title, full);
        return ok(`Campagne QA #${id} créée${full ? ' (retest complet)' : ''}: ${title}`);
      }
  
      if (sub === 'add') {
        const title = args[2];
        if (!title) return fail('Usage: qa add "Titre" ["Description"]');
        const desc = args[3] || '';
        const id = await qa.addItem(title, desc);
        return ok(`Item QA #${id} ajouté: ${title}`);
      }
  
      if (sub === 'list') {
        const { campaign, items } = await qa.listAllItems();
        if (!campaign) return ok('Aucune campagne QA active.');
        return ok(
          `=== QA ${campaign.title} (#${campaign.id})${campaign.fullRetest ? ' [RETEST COMPLET]' : ''} ===`,
          ...items.map((i) => `  #${i.id} [${i.status}] ${i.title}${i.description ? ' — ' + i.description : ''}`),
        );
      }
  
      if (sub === 'failures' || sub === 'feedback') {
        const rows = await qa.listFeedback(40);
        if (!rows.length) return ok('Aucun retour QA négatif.');
        return ok(
          '=== Retours QA (échecs) ===',
          ...rows.map((r) => `  #${r.itemId} ${r.itemTitle} — ${r.username}: ${r.feedback}`),
        );
      }
  
      if (sub === 'testers') {
        const rows = await qa.getTesterLeaderboard(25);
        if (!rows.length) return ok('Aucun testeur QA enregistré.');
        return ok(
          '=== Testeurs QA ===',
          ...rows.map((t, i) => `  ${i + 1}. ${t.username} — ${t.passCount}✓ ${t.failCount}✗ (total ${t.total})`),
        );
      }
  
      if (sub === 'fix' || sub === 'reset') {
        const id = Number(args[2]);
        if (!id) return fail('Usage: qa fix <itemId>');
        const done = await qa.markFixed(id);
        return done ? ok(`Item QA #${id} remis en attente`) : fail(`Item #${id} introuvable`);
      }
  
      if (sub === 'full') {
        const on = (args[2] || 'on').toLowerCase() !== 'off';
        const done = await qa.setCampaignFullRetest(on);
        if (!done) return fail('Aucune campagne QA active');
        return ok(on ? 'Retest complet activé — tous les items reviennent aux testeurs' : 'Retest complet désactivé');
      }
  
      if (sub === 'close') {
        const n = await qa.closeActiveCampaign();
        return ok(n ? 'Campagne QA fermée' : 'Aucune campagne active');
      }
  
      return fail('Usage: qa new|add|list|failures|testers|fix|full|close');
    });
}

module.exports = { registerQaCommands };
