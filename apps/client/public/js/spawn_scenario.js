// Intro plage guidée — HUD, dialogues, sync serveur (état dans inventory.scenario).
(function () {
  'use strict';

  const ACTS = [
    { id: 1, title: 'Le rivage' },
    { id: 2, title: 'La forme' },
    { id: 3, title: 'La vérité' },
  ];

  const STEP_HUD = {
    breathe: 'Regarde autour',
    explore: 'Explore le rivage',
    walk_west: 'Va vers l\'intérieur',
    silhouette: 'Quelqu\'un au loin ?',
    approach: 'Approche-toi',
    fight: 'Défends-toi !',
    loot: 'Récupère le bandage',
  };

  const STEP_HINT = {
    breathe: 'Tourne la tête ou fais un pas.',
    explore: 'Le sable, la mer… personne.',
    walk_west: 'Suis le sentier vers l\'ouest.',
    silhouette: 'Une forme immobile sur le sentier.',
    approach: 'Prudemment…',
    fight: 'Utilise ton caillou.',
    loot: 'Ramasse le bandage au sol.',
  };

  const STEP_DIALOGUE = {
    silhouette: 'Une forme… sur le sentier. Elle ne bouge pas.',
    approach: 'Un survivant ?',
  };

  const REVEAL_SCRIPT = [
    { atMs: 0, line: 'Elle tourne la tête.' },
    { atMs: 1500, line: '…Ce n\'est pas un survivant.' },
    { atMs: 3000, line: 'C\'est quoi ça — ?!' },
    { atMs: 4500, hudFight: true },
  ];

  const EPILOGUE_LINES = [
    '…Ils étaient humains. Autrefois.',
    'Tu as un bandage. Mais d\'abord : le panneau au bout du sable.',
  ];

  const TUTORIAL_POS = { x: 208, z: -8 };
  /** Seules étapes avec HUD — tutoriel combat/loot, pas de guidage exploration. */
  const HUD_STEPS = new Set(['fight', 'loot']);
  const STEPS = [
    'intro_wake', 'intro_stand', 'breathe', 'explore', 'walk_west',
    'silhouette', 'approach', 'reveal', 'fight', 'loot', 'epilogue',
    'trail_exit', 'read_exit_sign', 'act1_done',
  ];

  let _scenario = null;
  let _state = null;
  let _socket = null;
  let _hud = null;
  let _dialogue = null;
  let _combatHint = null;
  let _revealT = 0;
  let _revealActive = false;
  let _epilogueActive = false;
  let _epilogueLine = 0;

  function stepIndex(step) {
    const i = STEPS.indexOf(step);
    return i >= 0 ? i : STEPS.length - 1;
  }

  function isActive() {
    return _scenario && _scenario.step !== 'act1_done' && !_scenario.completed;
  }

  function isDone() {
    return !_scenario || _scenario.completed || _scenario.step === 'act1_done';
  }

  function needsWakeIntro() {
    return isActive() && _scenario.step === 'intro_wake';
  }

  function shouldDelayZombieSync() {
    return isActive() && stepIndex(_scenario.step) < stepIndex('walk_west');
  }

  function filterZombies(arr) {
    if (!Array.isArray(arr) || isDone()) return arr || [];
    if (shouldDelayZombieSync()) return [];
    const walk = stepIndex('walk_west');
    const fight = stepIndex('fight');
    const idx = stepIndex(_scenario.step);
    if (idx >= walk && idx <= fight && _scenario.tutorialZombieId != null) {
      return arr.filter((z) => z.id === _scenario.tutorialZombieId);
    }
    return arr.filter((z) => !z.tutorial);
  }

  function _actForStep(step) {
    if (['intro_wake', 'intro_stand', 'breathe', 'explore'].includes(step)) return ACTS[0];
    if (['walk_west', 'silhouette', 'approach'].includes(step)) return ACTS[1];
    return ACTS[2];
  }

  function _buildUi() {
    if (_hud) return;
    _hud = document.createElement('div');
    _hud.id = 'scenario-hud';
    _hud.style.cssText = [
      'display:none',
      'position:fixed',
      'bottom:max(108px,calc(env(safe-area-inset-bottom) + 96px))',
      'right:12px',
      'left:auto',
      'max-width:min(280px,calc(100vw - 24px))',
      'z-index:240',
      'pointer-events:none',
      'padding:12px 14px',
      'border-radius:12px',
      'border:1px solid rgba(200,180,130,.45)',
      'background:rgba(12,10,8,.82)',
      'color:#f0e6d0',
      'font:400 13px/1.45 system-ui,sans-serif',
      'box-shadow:0 8px 28px rgba(0,0,0,.35)',
    ].join(';');
    _hud.innerHTML = [
      '<div id="scenario-act" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b8955a;margin-bottom:4px"></div>',
      '<div id="scenario-objective" style="font-weight:700;font-size:15px;margin-bottom:4px"></div>',
      '<div id="scenario-hint" style="opacity:.85;font-size:12px"></div>',
    ].join('');
    document.body.appendChild(_hud);

    _dialogue = document.createElement('div');
    _dialogue.id = 'scenario-dialogue';
    _dialogue.style.cssText = [
      'display:none',
      'position:fixed',
      'left:50%',
      'bottom:max(88px,env(safe-area-inset-bottom))',
      'transform:translateX(-50%)',
      'width:min(92vw,400px)',
      'padding:14px 18px',
      'border-radius:14px',
      'border:2px solid rgba(220,180,120,.6)',
      'background:rgba(16,12,10,.9)',
      'color:#f5ead8',
      'font:italic 15px/1.5 Georgia,serif',
      'text-align:center',
      'z-index:250',
      'pointer-events:none',
      'box-shadow:0 10px 36px rgba(0,0,0,.4)',
    ].join(';');
    document.body.appendChild(_dialogue);

    _combatHint = document.createElement('div');
    _combatHint.id = 'scenario-combat-hint';
    _combatHint.style.cssText = [
      'display:none',
      'position:fixed',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'padding:12px 20px',
      'border-radius:10px',
      'background:rgba(0,0,0,.72)',
      'color:#fff',
      'font:bold 14px system-ui,sans-serif',
      'z-index:260',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(_combatHint);
  }

  function _showDialogue(text, ms = 3200) {
    if (!_dialogue || !text) return;
    _dialogue.textContent = text;
    _dialogue.style.display = 'block';
    _dialogue.style.opacity = '1';
    clearTimeout(_dialogue._hideT);
    _dialogue._hideT = setTimeout(() => {
      _dialogue.style.opacity = '0';
      setTimeout(() => { _dialogue.style.display = 'none'; }, 400);
    }, ms);
  }

  function _updateHud() {
    if (!_hud || !_scenario) return;
    const step = _scenario.step;
    if (!isActive() || step === 'intro_wake' || step === 'reveal' || step === 'epilogue') {
      _hud.style.display = 'none';
      return;
    }
    if (!HUD_STEPS.has(step)) {
      _hud.style.display = 'none';
      return;
    }
    const act = _actForStep(step);
    const title = STEP_HUD[step];
    if (!title) {
      _hud.style.display = 'none';
      return;
    }
    _hud.style.display = 'block';
    document.getElementById('scenario-act').textContent = `Acte ${act.id}/3 — ${act.title}`;
    document.getElementById('scenario-objective').textContent = title;
    document.getElementById('scenario-hint').textContent = STEP_HINT[step] || '';
  }

  function _showCombatHint() {
    if (!_combatHint) return;
    const mobile = ZS._isMobile;
    _combatHint.textContent = mobile
      ? 'Touche attaque — frapper avec le caillou'
      : 'Clic gauche — frapper avec le caillou';
    _combatHint.style.display = 'block';
    clearTimeout(_combatHint._hideT);
    _combatHint._hideT = setTimeout(() => { _combatHint.style.display = 'none'; }, 4500);
    if (_state?.player) _state.player.equipped = 'tool_caillou';
    if (_socket) _socket.emit('equip', { type: 'tool_caillou' });
  }

  function _showEpilogue() {
    _epilogueActive = true;
    _epilogueLine = 0;
    _buildUi();
    _hud.style.display = 'none';
    _showDialogue(EPILOGUE_LINES[0], 5000);
    setTimeout(() => {
      if (!_epilogueActive) return;
      _showDialogue(EPILOGUE_LINES[1], 6000);
      _showEpilogueButton();
    }, 5200);
  }

  function _showEpilogueButton() {
    if (!_dialogue) return;
    _dialogue.style.pointerEvents = 'auto';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Continuer';
    btn.style.cssText = [
      'display:block',
      'margin:12px auto 0',
      'min-height:44px',
      'padding:0 24px',
      'border:none',
      'border-radius:8px',
      'background:#7a5c38',
      'color:#fff8e8',
      'font:bold 15px system-ui,sans-serif',
      'cursor:pointer',
    ].join(';');
    btn.onclick = () => {
      _epilogueActive = false;
      _dialogue.style.pointerEvents = 'none';
      _dialogue.innerHTML = '';
      _dialogue.style.display = 'none';
      if (_socket) _socket.emit('scenario-advance', { step: 'trail_exit' });
    };
    _dialogue.appendChild(btn);
  }

  function _startReveal() {
    _revealActive = true;
    _revealT = 0;
    _hud.style.display = 'none';
    ZS.Audio?.zombieGroan?.(0.6);
    for (const cue of REVEAL_SCRIPT) {
      setTimeout(() => {
        if (!_revealActive) return;
        if (cue.line) _showDialogue(cue.line, 2800);
        if (cue.hudFight) {
          _showCombatHint();
          _scenario.step = 'fight';
          _updateHud();
        }
      }, cue.atMs);
    }
  }

  function init(scenario, state, socket) {
    _scenario = scenario || { step: 'act1_done', completed: true };
    _state = state;
    _socket = socket;
    _buildUi();
    _updateHud();
  }

  function onUpdate(data) {
    if (!data) return;
    if (data.scenario) _scenario = data.scenario;
    if (data.dialogue && STEP_DIALOGUE[data.dialogue]) {
      _showDialogue(STEP_DIALOGUE[data.dialogue]);
    }
    if (data.revealScript) _startReveal();
    if (data.combatTutorial) _showCombatHint();
    if (data.epilogue) _showEpilogue();
    if (data.toast) ZS.UI?.showNotif?.(data.toast);
    if (data.introBeat) ZS.IntroStarter?.onBeat?.(data.introBeat);
    if (data.starterLootComplete) ZS.IntroStarter?.onBeat?.('kit_done');
    if (data.introComplete) {
      _revealActive = false;
      _epilogueActive = false;
      if (_hud) _hud.style.display = 'none';
      if (_socket) _socket.emit('request-zombie-sync');
    }
    if (data.resetIntro && _state) {
      ZS.SpawnIntro?.tryStart?.(_state);
    }
    _updateHud();
  }

  function advance(step) {
    if (_socket) _socket.emit('scenario-advance', { step });
  }

  function tick(dt) {
    if (!isActive() || !_state?.player) return;
    if (_scenario.step === 'reveal' && _revealActive) {
      _revealT += dt * 1000;
    }
    _updateHud();
  }

  function getScenario() {
    return _scenario;
  }

  window.ZS = window.ZS || {};
  ZS.Scenario = {
    init,
    onUpdate,
    advance,
    tick,
    isActive,
    isDone,
    needsWakeIntro,
    shouldDelayZombieSync,
    filterZombies,
    getStep: () => _scenario?.step,
    getScenario,
  };
}());
