'use strict';

/**
 * QA checklist — campagnes, items à tester, verdicts et stats testeurs.
 */
function createQaChecklist(pool, dbClient) {
  const isSqlite = dbClient === 'sqlite';

  async function ensureSchema() {
    if (isSqlite) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS qa_campaigns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          full_retest INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS qa_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campaign_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (campaign_id) REFERENCES qa_campaigns(id)
        )
      `);
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS qa_verdicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          verdict TEXT NOT NULL,
          feedback TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES qa_items(id)
        )
      `);
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS qa_tester_stats (
          username TEXT PRIMARY KEY,
          pass_count INTEGER NOT NULL DEFAULT 0,
          fail_count INTEGER NOT NULL DEFAULT 0,
          last_active TEXT
        )
      `);
      return;
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS qa_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        full_retest TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS qa_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_qa_items_campaign (campaign_id)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS qa_verdicts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        username VARCHAR(64) NOT NULL,
        verdict VARCHAR(16) NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_qa_verdicts_item (item_id),
        INDEX idx_qa_verdicts_user (username)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS qa_tester_stats (
        username VARCHAR(64) PRIMARY KEY,
        pass_count INT NOT NULL DEFAULT 0,
        fail_count INT NOT NULL DEFAULT 0,
        last_active TIMESTAMP NULL
      )
    `);
  }

  async function getActiveCampaign() {
    const [rows] = await pool.execute(
      `SELECT id, title, full_retest, status, created_at FROM qa_campaigns
       WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      fullRetest: !!row.full_retest,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  async function createCampaign(title, fullRetest = false) {
    await pool.execute(
      `UPDATE qa_campaigns SET status = 'closed' WHERE status = 'active'`
    );
    const [result] = await pool.execute(
      `INSERT INTO qa_campaigns (title, full_retest, status) VALUES (?, ?, 'active')`,
      [title.slice(0, 200), fullRetest ? 1 : 0]
    );
    return result.insertId;
  }

  async function closeActiveCampaign() {
    const [result] = await pool.execute(
      `UPDATE qa_campaigns SET status = 'closed' WHERE status = 'active'`
    );
    return result.affectedRows || 0;
  }

  async function setCampaignFullRetest(fullRetest) {
    const camp = await getActiveCampaign();
    if (!camp) return false;
    await pool.execute(
      `UPDATE qa_campaigns SET full_retest = ? WHERE id = ?`,
      [fullRetest ? 1 : 0, camp.id]
    );
    return true;
  }

  async function addItem(title, description = '', sortOrder = 0) {
    let camp = await getActiveCampaign();
    if (!camp) {
      const id = await createCampaign('Campagne QA', false);
      camp = { id };
    }
    const [result] = await pool.execute(
      `INSERT INTO qa_items (campaign_id, title, description, sort_order, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [camp.id, title.slice(0, 200), (description || '').slice(0, 2000), sortOrder || 0]
    );
    return result.insertId;
  }

  async function listAllItems() {
    const camp = await getActiveCampaign();
    if (!camp) return { campaign: null, items: [] };
    const [rows] = await pool.execute(
      `SELECT id, title, description, sort_order, status, created_at
       FROM qa_items WHERE campaign_id = ? ORDER BY sort_order, id`,
      [camp.id]
    );
    return {
      campaign: camp,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        sortOrder: r.sort_order,
        status: r.status,
        createdAt: r.created_at,
      })),
    };
  }

  async function listItemsForTester(username) {
    const { campaign, items } = await listAllItems();
    if (!campaign || !items.length) {
      return { campaign, items: [], testers: await getTesterLeaderboard() };
    }

    const [verdictRows] = await pool.execute(
      `SELECT v.item_id, v.verdict, v.username FROM qa_verdicts v
       INNER JOIN qa_items i ON i.id = v.item_id
       WHERE i.campaign_id = ?`,
      [campaign.id]
    );
    const userPass = new Set();
    for (const v of verdictRows) {
      if (v.username === username && v.verdict === 'pass') {
        userPass.add(v.item_id);
      }
    }

    const visible = items.filter((item) => {
      if (campaign.fullRetest) {
        return item.status !== 'passed' || !userPass.has(item.id);
      }
      if (item.status === 'passed') return false;
      if (item.status !== 'pending' && item.status !== 'failed') return false;
      return !userPass.has(item.id);
    });

    return {
      campaign,
      items: visible,
      testers: await getTesterLeaderboard(),
    };
  }

  async function _bumpTesterStats(username, verdict) {
    const [rows] = await pool.execute(
      `SELECT username, pass_count, fail_count FROM qa_tester_stats WHERE username = ?`,
      [username]
    );
    if (rows[0]) {
      const passInc = verdict === 'pass' ? 1 : 0;
      const failInc = verdict === 'fail' ? 1 : 0;
      await pool.execute(
        `UPDATE qa_tester_stats
         SET pass_count = pass_count + ?, fail_count = fail_count + ?, last_active = CURRENT_TIMESTAMP
         WHERE username = ?`,
        [passInc, failInc, username]
      );
      return;
    }
    await pool.execute(
      `INSERT INTO qa_tester_stats (username, pass_count, fail_count, last_active)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [username, verdict === 'pass' ? 1 : 0, verdict === 'fail' ? 1 : 0]
    );
  }

  async function submitVerdict(itemId, username, verdict, feedback) {
    const id = Number(itemId);
    if (!id || !username) return { ok: false, err: 'invalid' };
    if (verdict !== 'pass' && verdict !== 'fail') return { ok: false, err: 'invalid_verdict' };
    if (verdict === 'fail' && !(feedback || '').trim()) {
      return { ok: false, err: 'feedback_required' };
    }

    const [rows] = await pool.execute(
      `SELECT i.id, i.status, i.campaign_id, c.status AS camp_status
       FROM qa_items i
       INNER JOIN qa_campaigns c ON c.id = i.campaign_id
       WHERE i.id = ?`,
      [id]
    );
    const item = rows[0];
    if (!item || item.camp_status !== 'active') return { ok: false, err: 'item_not_found' };
    if (item.status === 'passed' && verdict === 'pass') {
      return { ok: false, err: 'already_passed' };
    }

    await pool.execute(
      `INSERT INTO qa_verdicts (item_id, username, verdict, feedback) VALUES (?, ?, ?, ?)`,
      [id, username.slice(0, 64), verdict, verdict === 'fail' ? (feedback || '').slice(0, 2000) : null]
    );
    await _bumpTesterStats(username, verdict);

    const newStatus = verdict === 'pass' ? 'passed' : 'failed';
    await pool.execute(`UPDATE qa_items SET status = ? WHERE id = ?`, [newStatus, id]);

    return { ok: true, status: newStatus };
  }

  async function resetItem(itemId) {
    const id = Number(itemId);
    if (!id) return false;
    const [result] = await pool.execute(
      `UPDATE qa_items SET status = 'pending' WHERE id = ?`,
      [id]
    );
    return (result.affectedRows || 0) > 0;
  }

  async function markFixed(itemId) {
    return resetItem(itemId);
  }

  async function listFeedback(limit = 30) {
    const [rows] = await pool.execute(
      `SELECT v.id, v.item_id, v.username, v.feedback, v.created_at,
              i.title AS item_title
       FROM qa_verdicts v
       INNER JOIN qa_items i ON i.id = v.item_id
       WHERE v.verdict = 'fail' AND v.feedback IS NOT NULL AND v.feedback != ''
       ORDER BY v.id DESC
       LIMIT ?`,
      [Math.min(100, Math.max(1, limit))]
    );
    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      itemTitle: r.item_title,
      username: r.username,
      feedback: r.feedback,
      createdAt: r.created_at,
    }));
  }

  async function getTesterLeaderboard(limit = 20) {
    const [rows] = await pool.execute(
      `SELECT username, pass_count, fail_count, last_active
       FROM qa_tester_stats
       ORDER BY (pass_count + fail_count) DESC, pass_count DESC
       LIMIT ?`,
      [Math.min(50, Math.max(1, limit))]
    );
    return rows.map((r) => ({
      username: r.username,
      passCount: r.pass_count,
      failCount: r.fail_count,
      total: r.pass_count + r.fail_count,
      lastActive: r.last_active,
    }));
  }

  return {
    ensureSchema,
    getActiveCampaign,
    createCampaign,
    closeActiveCampaign,
    setCampaignFullRetest,
    addItem,
    listAllItems,
    listItemsForTester,
    submitVerdict,
    resetItem,
    markFixed,
    listFeedback,
    getTesterLeaderboard,
  };
}

module.exports = { createQaChecklist };
