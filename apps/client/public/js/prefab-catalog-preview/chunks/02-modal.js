// Modal preview 3D
function _resetModalView() {
    if (!modalRoot || !modalCamera || !modalControls || !modalFitState) return;
    _fitCamera(modalCamera, modalRoot, modalFitState.aspect, modalFitState.pad);
    modalControls.target.copy(modalFitState.center);
    modalControls.update();
  }

  async function _ensureModalDom() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'prefab-preview-modal';
    modal.className = 'preview-modal hidden';
    modal.innerHTML = `
      <div class="preview-modal-backdrop"></div>
      <div class="preview-modal-panel" role="dialog" aria-modal="true" aria-labelledby="prefab-preview-id">
        <header class="preview-modal-head">
          <div>
            <div class="preview-modal-id" id="prefab-preview-id"></div>
            <div class="preview-modal-label" id="prefab-preview-label"></div>
            <div class="preview-modal-cat" id="prefab-preview-cat"></div>
            <div class="preview-modal-orient" id="prefab-preview-orient"></div>
          </div>
          <button type="button" class="preview-modal-close" aria-label="Fermer">×</button>
        </header>
        <div class="preview-modal-viewport" id="prefab-preview-viewport">
          <div class="preview-modal-loading" id="prefab-preview-loading">Génération du modèle…</div>
          <canvas id="prefab-preview-canvas"></canvas>
        </div>
        <div class="preview-modal-foot">
          <p class="preview-modal-desc" id="prefab-preview-desc"></p>
          <p class="preview-modal-rework-note hidden" id="prefab-preview-rework-note"></p>
          <div class="preview-modal-actions">
            <button type="button" class="preview-modal-action validate" id="prefab-preview-validate">Valider</button>
            <button type="button" class="preview-modal-action rework" id="prefab-preview-rework">À refaire</button>
            <button type="button" class="preview-modal-action" id="prefab-preview-reset">Recentrer</button>
            <button type="button" class="preview-modal-action primary" id="prefab-preview-copy">Copier RCON</button>
          </div>
        </div>
        <p class="preview-modal-hint" id="prefab-preview-hint">Glisser pour tourner · molette pour zoomer · clic droit pour déplacer · Échap pour fermer</p>
      </div>`;
    document.body.appendChild(modal);

    const close = () => closeModal();
    modal.querySelector('.preview-modal-close').addEventListener('click', close);
    modal.querySelector('.preview-modal-backdrop').addEventListener('click', close);
    modal.querySelector('#prefab-preview-reset').addEventListener('click', _resetModalView);
    const _emitReview = (status) => {
      if (!modalCurrentPrefabId) return;
      document.dispatchEvent(new CustomEvent('prefab-review-request', {
        detail: { prefabId: modalCurrentPrefabId, status },
      }));
    };
    modal.querySelector('#prefab-preview-validate').addEventListener('click', () => _emitReview('validated'));
    modal.querySelector('#prefab-preview-rework').addEventListener('click', () => _emitReview('rework'));
    window.addEventListener('prefab-review-changed', (e) => {
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.detail?.prefabId !== modalCurrentPrefabId) return;
      _setModalReviewStatus(e.detail?.status || null, e.detail?.comment || '');
    });
    modal.querySelector('#prefab-preview-copy').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (!modalCurrentRcon) return;
      try {
        await navigator.clipboard.writeText(modalCurrentRcon);
        btn.textContent = 'Copié !';
        setTimeout(() => { btn.textContent = 'Copier RCON'; }, 1600);
      } catch {
        btn.textContent = 'Échec';
        setTimeout(() => { btn.textContent = 'Copier RCON'; }, 1600);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });
    return modal;
  }
