// Panneau lisible (E) — popup style planche RP
(function () {
  'use strict';

  const SIGN_COPY = {
    beach_safe_zone: {
      stamp: 'CÔTE EST — ANCRAGE',
      title: 'Avant le sentier',
      lead: 'Des survivants ont cloué cette planche. Les messages datent — certains sont déjà partis vers l\'intérieur.',
      notes: [
        {
          who: 'Léo',
          when: 'jour 2',
          text: 'Si tu viens d\'échouer ici : respire. Sur le sable, on ne se tire pas dessus. Même ceux qui rôdent dans les arbres n\'ont jamais réussi à nous toucher depuis là-bas.',
        },
        {
          who: 'Mina',
          when: 'jour 4',
          text: 'Prends ton caillou. Frappe les palmiers jusqu\'à ce qu\'ils lâchent du bois. Avec ça, fabrique-toi une lance avant de partir — tu en auras besoin dès le sentier.',
        },
        {
          who: 'Viktor',
          when: 'jour 6',
          text: 'Ne construis rien sur la plage. On a essayé un abri : dispute, puis la pluie. Le sable reste pour se remettre, pas pour s\'installer.',
        },
        {
          who: 'Inconnu (craie)',
          when: '',
          text: 'Pas de pillage sur les dormeurs ici. Les cadavres, c\'est autre chose — mais laisse les gens s\'endormir en paix.',
        },
        {
          who: 'Sara',
          when: 'jour 9',
          text: 'Le sentier commence derrière ce panneau. Après, plus de pitié : infectés, faim, et des gens qui n\'ont plus rien à perdre. Prépare-toi.',
        },
      ],
      footer: '… et d\'autres noms qu\'on a effacés ou qu\'on n\'a plus revus.',
    },
    sector_coming_soon: {
      stamp: 'PÉRIMÈTRE — SECTEUR FERMÉ',
      title: 'Ça arrive bientôt',
      lead: 'Un mur de fortune barre la route. Derrière, la carte continue — mais les équipes n\'ont pas encore sécurisé la zone.',
      notes: [
        {
          who: 'Équipe cartographie',
          when: 'mise à jour',
          text: 'Nous finalisons le secteur forêt avant d\'ouvrir la suite. Chaque zone sera délimitée, peuplée et testée — pas de demi-mesure.',
        },
        {
          who: 'Graffiti',
          when: '',
          text: '« J\'ai contourné par le nord. Mauvaise idée. » — le mur a été renforcé le lendemain.',
        },
        {
          who: 'Survivant local',
          when: 'semaine 2',
          text: 'Si tu entends des coups de feu au-delà : ce n\'est pas pour toi. Pas encore. Reviens quand le panneau aura changé.',
        },
      ],
      footer: 'Easter egg — merci de jouer la zone forêt. La suite s\'ouvrira secteur par secteur.',
    },
  };

  let backdrop = null;
  let panel = null;
  let open = false;
  let currentKind = null;

  function _esc(e) {
    if (e.code === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  }

  function _ensureDom() {
    if (panel) return;

    backdrop = document.createElement('div');
    backdrop.id = 'sign-backdrop';
    backdrop.className = 'zs-backdrop sign-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    panel = document.createElement('div');
    panel.id = 'sign-panel';
    panel.className = 'sign-board-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.hidden = true;

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', _esc);
  }

  function _render(kind) {
    const data = SIGN_COPY[kind];
    if (!data) return;
    panel.replaceChildren();

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sign-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.addEventListener('click', close);
    panel.appendChild(closeBtn);

    const stamp = document.createElement('div');
    stamp.className = 'sign-stamp';
    stamp.textContent = data.stamp;
    panel.appendChild(stamp);

    const title = document.createElement('h2');
    title.className = 'sign-title';
    title.textContent = data.title;
    panel.appendChild(title);

    const lead = document.createElement('p');
    lead.className = 'sign-lead';
    lead.textContent = data.lead;
    panel.appendChild(lead);

    const grid = document.createElement('div');
    grid.className = 'sign-notes';
    for (const note of (data.notes || [])) {
      const card = document.createElement('article');
      card.className = 'sign-note';
      const head = document.createElement('header');
      head.className = 'sign-note-head';
      const who = document.createElement('span');
      who.className = 'sign-note-who';
      who.textContent = note.who || 'Anonyme';
      head.appendChild(who);
      if (note.when) {
        const when = document.createElement('span');
        when.className = 'sign-note-when';
        when.textContent = note.when;
        head.appendChild(when);
      }
      const p = document.createElement('p');
      p.className = 'sign-note-text';
      p.textContent = note.text;
      card.appendChild(head);
      card.appendChild(p);
      grid.appendChild(card);
    }
    panel.appendChild(grid);

    const foot = document.createElement('p');
    foot.className = 'sign-footer';
    foot.textContent = data.footer;
    panel.appendChild(foot);
  }

  function openSign(kind) {
    if (!SIGN_COPY[kind]) return false;
    _ensureDom();
    currentKind = kind;
    _render(kind);
    open = true;
    backdrop.hidden = false;
    backdrop.classList.add('is-open');
    panel.hidden = false;
    document.body.classList.add('sign-open');
    ZS.PanelUI?.onDesktopPanelOpen?.();
    return true;
  }

  function close() {
    if (!open) return;
    open = false;
    currentKind = null;
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.hidden = true;
    }
    if (panel) panel.hidden = true;
    document.body.classList.remove('sign-open');
    ZS.PanelUI?.onDesktopPanelClose?.(true);
  }

  function isOpen() {
    return open;
  }

  function tryInteract(sign) {
    if (open || !sign?.signKind) return false;
    return openSign(sign.signKind);
  }

  function getNearestForUi(px, pz) {
    return ZS.findNearestDecorSign?.(px, pz, 3.4) || null;
  }

  window.ZS = window.ZS || {};
  ZS.SignUI = {
    openSign,
    close,
    isOpen,
    tryInteract,
    getNearestForUi,
  };
}());
