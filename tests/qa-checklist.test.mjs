import test from 'node:test';
import assert from 'node:assert/strict';
import { createQaChecklist } from '../apps/server/src/qa-checklist.js';

function createMockPool() {
  const campaigns = [];
  const items = [];
  const verdicts = [];
  const stats = new Map();
  let campId = 0;
  let itemId = 0;
  let verdictId = 0;

  const pool = {
    async execute(sql, params = []) {
      const q = sql.replace(/\s+/g, ' ').trim().toLowerCase();

      if (q.startsWith('create table')) return [[]];

      if (q.includes('from qa_campaigns') && q.includes("status = 'active'")) {
        const active = [...campaigns].reverse().find((c) => c.status === 'active');
        return [active ? [active] : []];
      }

      if (q.startsWith('update qa_campaigns set status')) {
        campaigns.forEach((c) => { if (c.status === 'active') c.status = 'closed'; });
        return [{ affectedRows: 1 }];
      }

      if (q.startsWith('insert into qa_campaigns')) {
        campId += 1;
        const row = {
          id: campId,
          title: params[0],
          full_retest: params[1],
          status: 'active',
          created_at: new Date().toISOString(),
        };
        campaigns.push(row);
        return [{ insertId: campId }];
      }

      if (q.startsWith('insert into qa_items')) {
        itemId += 1;
        items.push({
          id: itemId,
          campaign_id: params[0],
          title: params[1],
          description: params[2],
          sort_order: params[3],
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        return [{ insertId: itemId }];
      }

      if (q.includes('inner join qa_campaigns') && q.includes('where i.id')) {
        const item = items.find((i) => i.id === params[0]);
        if (!item) return [[]];
        const camp = campaigns.find((c) => c.id === item.campaign_id);
        return [[{
          id: item.id,
          status: item.status,
          campaign_id: item.campaign_id,
          camp_status: camp?.status || 'closed',
        }]];
      }

      if (q.includes('from qa_items') && q.includes('where campaign_id')) {
        const cid = params[0];
        return [items.filter((i) => i.campaign_id === cid).map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          sort_order: i.sort_order,
          status: i.status,
          created_at: i.created_at,
        }))];
      }

      if (q.includes('from qa_verdicts v') && q.includes("verdict = 'fail'")) {
        return [verdicts.filter((v) => v.verdict === 'fail' && v.feedback).map((v) => {
          const item = items.find((i) => i.id === v.item_id);
          return {
            id: v.id,
            item_id: v.item_id,
            username: v.username,
            feedback: v.feedback,
            created_at: new Date().toISOString(),
            item_title: item?.title || '',
          };
        })];
      }

      if (q.includes('from qa_verdicts')) {
        return [verdicts.filter((v) => {
          const item = items.find((i) => i.id === v.item_id);
          return item && item.campaign_id === params[0];
        }).map((v) => ({ item_id: v.item_id, verdict: v.verdict, username: v.username }))];
      }

      if (q.startsWith('insert into qa_verdicts')) {
        verdictId += 1;
        verdicts.push({
          id: verdictId,
          item_id: params[0],
          username: params[1],
          verdict: params[2],
          feedback: params[3],
        });
        return [{ insertId: verdictId }];
      }

      if (q.startsWith('update qa_items set status')) {
        const item = items.find((i) => i.id === params[1]);
        if (item) item.status = params[0];
        return [{ affectedRows: item ? 1 : 0 }];
      }

      if (q.includes('from qa_tester_stats where username')) {
        const row = stats.get(params[0]);
        return [row ? [row] : []];
      }

      if (q.startsWith('update qa_tester_stats')) {
        const row = stats.get(params[2]);
        if (row) {
          row.pass_count += params[0];
          row.fail_count += params[1];
        }
        return [{ affectedRows: 1 }];
      }

      if (q.startsWith('insert into qa_tester_stats')) {
        stats.set(params[0], {
          username: params[0],
          pass_count: params[1],
          fail_count: params[2],
          last_active: new Date().toISOString(),
        });
        return [{ insertId: 1 }];
      }

      if (q.includes('from qa_tester_stats')) {
        return [[...stats.values()].map((r) => ({
          username: r.username,
          pass_count: r.pass_count,
          fail_count: r.fail_count,
          last_active: r.last_active,
        }))];
      }

      throw new Error('Unhandled SQL in mock: ' + q.slice(0, 80));
    },
  };

  return pool;
}

test('QA checklist campaign and verdict flow', async () => {
  const qa = createQaChecklist(createMockPool(), 'sqlite');
  await qa.ensureSchema();
  const campId = await qa.createCampaign('Sprint test', false);
  assert.ok(campId > 0);
  const itemId = await qa.addItem('Inventaire authoritatif', 'Déplacer des items');
  assert.ok(itemId > 0);

  const alice = await qa.listItemsForTester('alice');
  assert.equal(alice.items.length, 1);

  const pass = await qa.submitVerdict(itemId, 'alice', 'pass');
  assert.equal(pass.ok, true);

  const afterPass = await qa.listItemsForTester('alice');
  assert.equal(afterPass.items.length, 0);

  const bob = await qa.listItemsForTester('bob');
  assert.equal(bob.items.length, 0);

  const item2 = await qa.addItem('Craft queue', 'Lancer une recette');
  const fail = await qa.submitVerdict(item2, 'bob', 'fail', 'Timer bloqué');
  assert.equal(fail.ok, true);
  assert.equal(fail.status, 'failed');

  const feedback = await qa.listFeedback();
  assert.equal(feedback.length, 1);
  assert.match(feedback[0].feedback, /Timer/);

  await qa.markFixed(item2);
  const retry = await qa.listItemsForTester('carol');
  assert.equal(retry.items.length, 1);
});
