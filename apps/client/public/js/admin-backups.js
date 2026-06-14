// Backups map / snapshot complet — hub F8 (export, import, restore).
(function () {
  'use strict';

  function _token() {
    return localStorage.getItem('zombie_token') || '';
  }

  function _canView() {
    return ZS.AdminHub?.hasPerm?.('rcon') || ZS.AdminAuth?.hasPerm?.('rcon');
  }

  function _canRestore() {
    return ZS.AdminHub?.hasPerm?.('rcon.dangerous') || ZS.AdminAuth?.hasPerm?.('rcon.dangerous');
  }

  async function _api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: {
        Authorization: 'Bearer ' + _token(),
        ...(opts.body && !(opts.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(opts.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }

  function _fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('fr-FR');
    } catch {
      return iso;
    }
  }

  function _fmtBytes(n) {
    if (!Number.isFinite(n)) return '';
    if (n < 1024) return `${n} o`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
    return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function _kindLabel(kind) {
    return kind === 'full' ? 'Complet' : 'Carte';
  }

  function mountHubSection(container) {
    if (!container || !_canView()) return;
    if (container.dataset.backupsBuilt === '1') {
      container.querySelector('[data-act="refresh-backups"]')?.click?.();
      return;
    }
    container.dataset.backupsBuilt = '1';

    container.innerHTML = [
      '<p class="admin-hub-section">💾 Backups monde</p>',
      '<p class="admin-hub-foot">Carte = décor + meta · Complet = carte + joueurs + loot + zombies + sleepers.</p>',
      '<div class="admin-hub-backups-actions">',
      '  <label class="admin-hub-awt-check admin-hub-backups-check">',
      '    <input type="checkbox" id="admin-backup-include-builds" checked>',
      '    Inclure constructions joueurs (backup carte)',
      '  </label>',
      '  <div class="admin-hub-backups-btns">',
      '    <button type="button" class="admin-hub-btn" data-act="create-map-backup">Backup carte</button>',
      '    <button type="button" class="admin-hub-btn" data-act="create-full-backup">Snapshot complet</button>',
      '    <button type="button" class="admin-hub-btn admin-hub-btn-ghost" data-act="refresh-backups">Actualiser</button>',
      '  </div>',
      _canRestore()
        ? [
          '  <div class="admin-hub-backups-import">',
          '    <button type="button" class="admin-hub-btn admin-hub-btn-warn" data-act="import-backup">Importer fichier…</button>',
          '    <input type="file" id="admin-backup-file" accept=".json,application/json" hidden>',
          '  </div>',
        ].join('')
        : '',
      '</div>',
      '<div id="admin-backups-list" class="admin-hub-backups-list"></div>',
      '<p class="admin-hub-foot" id="admin-backups-status"></p>',
    ].join('');

    const statusEl = container.querySelector('#admin-backups-status');
    const listEl = container.querySelector('#admin-backups-list');
    const fileInput = container.querySelector('#admin-backup-file');
    const includeBuildsEl = container.querySelector('#admin-backup-include-builds');

    const setStatus = (msg, err) => {
      if (statusEl) {
        statusEl.textContent = msg || '';
        statusEl.style.color = err ? '#f88' : '';
      }
    };

    const afterRestore = (json) => {
      if (json?.requiresReload) {
        ZS.UI?.showNotif?.('Backup restauré — rechargement…');
        setTimeout(() => { window.location.reload(); }, 1200);
      }
    };

    const renderList = (backups) => {
      if (!listEl) return;
      if (!backups?.length) {
        listEl.innerHTML = '<p class="admin-hub-foot">Aucun backup serveur.</p>';
        return;
      }
      const rows = backups.map((b) => {
        const builds = b.kind === 'map'
          ? (b.includePlayerBuilds ? ' · avec builds' : ' · sans builds')
          : '';
        const stats = b.stats
          ? `décor ${b.stats.decor}${b.stats.structures ? ` · structures ${b.stats.structures}` : ''}${b.stats.players ? ` · joueurs ${b.stats.players}` : ''}`
          : '';
        const actions = [
          `<button type="button" class="admin-hub-btn admin-hub-btn-sm" data-act="export-backup" data-id="${b.id}">Exporter</button>`,
        ];
        if (_canRestore()) {
          actions.push(
            `<button type="button" class="admin-hub-btn admin-hub-btn-sm admin-hub-btn-warn" data-act="restore-backup" data-id="${b.id}">Restaurer</button>`,
            `<button type="button" class="admin-hub-btn admin-hub-btn-sm admin-hub-btn-ghost" data-act="delete-backup" data-id="${b.id}">Suppr.</button>`,
          );
        }
        return [
          '<div class="admin-hub-backup-row">',
          '  <div class="admin-hub-backup-main">',
          `    <strong>${_kindLabel(b.kind)}</strong>${b.label ? ` — ${b.label}` : ''}`,
          `    <span class="admin-hub-backup-meta">${_fmtDate(b.createdAt)} · ${_fmtBytes(b.bytes)}${builds}</span>`,
          stats ? `    <span class="admin-hub-backup-meta">${stats}</span>` : '',
          '  </div>',
          `  <div class="admin-hub-backups-row-actions">${actions.join('')}</div>`,
          '</div>',
        ].join('');
      });
      listEl.innerHTML = rows.join('');
    };

    const refresh = async () => {
      setStatus('Chargement…');
      try {
        const json = await _api('/api/admin/backups');
        renderList(json.backups || []);
        setStatus(`${(json.backups || []).length} backup(s) sur le serveur`);
      } catch (err) {
        setStatus(err.message, true);
      }
    };

    const createBackup = async (kind) => {
      const label = window.prompt('Nom du backup (optionnel) :', '') || undefined;
      setStatus('Création en cours…');
      try {
        const body = {
          kind,
          label: label || undefined,
          includePlayerBuilds: !!includeBuildsEl?.checked,
        };
        const json = await _api('/api/admin/backups', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setStatus(`Backup créé : ${json.id}`);
        await refresh();
      } catch (err) {
        setStatus(err.message, true);
      }
    };

    const exportBackup = async (id) => {
      setStatus('Export…');
      try {
        const res = await fetch(`/api/admin/backups/${encodeURIComponent(id)}/download`, {
          headers: { Authorization: 'Bearer ' + _token() },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${id}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        setStatus(`Export téléchargé : ${id}.json`);
      } catch (err) {
        setStatus(err.message, true);
      }
    };

    const restoreBackup = async (id) => {
      if (!window.confirm(`Restaurer le backup « ${id} » ?\nLe monde sera remplacé. Rechargement requis.`)) return;
      setStatus('Restauration…');
      try {
        const json = await _api(`/api/admin/backups/${encodeURIComponent(id)}/restore`, { method: 'POST' });
        setStatus(`Restauré : ${id}`);
        afterRestore(json);
      } catch (err) {
        setStatus(err.message, true);
      }
    };

    const deleteBackup = async (id) => {
      if (!window.confirm(`Supprimer le backup « ${id} » du serveur ?`)) return;
      try {
        await _api(`/api/admin/backups/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setStatus(`Supprimé : ${id}`);
        await refresh();
      } catch (err) {
        setStatus(err.message, true);
      }
    };

    const importBackupFile = async (file) => {
      if (!file) return;
      if (!window.confirm(`Importer « ${file.name} » et restaurer le monde ?\nRechargement requis.`)) return;
      setStatus('Import…');
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        const json = await _api('/api/admin/backups/import', {
          method: 'POST',
          body: JSON.stringify({ backup }),
        });
        setStatus(`Import OK (${json.kind || 'backup'})`);
        afterRestore(json);
      } catch (err) {
        setStatus(err.message || 'Import invalide', true);
      }
    };

    container.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || !container.contains(btn)) return;
      const act = btn.getAttribute('data-act');
      if (act === 'refresh-backups') refresh();
      else if (act === 'create-map-backup') createBackup('map');
      else if (act === 'create-full-backup') createBackup('full');
      else if (act === 'import-backup') fileInput?.click();
      else if (act === 'export-backup') exportBackup(btn.getAttribute('data-id'));
      else if (act === 'restore-backup') restoreBackup(btn.getAttribute('data-id'));
      else if (act === 'delete-backup') deleteBackup(btn.getAttribute('data-id'));
    });

    fileInput?.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      fileInput.value = '';
      importBackupFile(f);
    });

    refresh();
  }

  window.ZS = window.ZS || {};
  ZS.AdminBackups = { mountHubSection };
})();
