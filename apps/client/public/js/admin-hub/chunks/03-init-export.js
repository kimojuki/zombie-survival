// Init + export AdminHub — admin-hub.js
function init() {

    _els.backdrop = _q('admin-backdrop');

    _els.panel = _q('admin-panel');

    _els.title = _q('admin-hub-title');

    _els.sub = _q('admin-hub-sub');

    _els.root = _q('admin-hub-root');

    _els.world = _q('admin-hub-world');

    _els.players = _q('admin-hub-players');

    _els.roles = _q('admin-hub-roles');

    _els.calibration = _q('admin-hub-calibration');

    _els.scenario = _q('admin-panel-body');

    _buildRootMenu();

    _buildWorldView();

    ZS.AdminWorldTime?.openIn?.(_q('admin-hub-world-time'));

    ZS.AdminTpBookmarks?.mountHubSection?.(_q('admin-hub-bookmarks'));

    ZS.AdminServerFlags?.openIn?.(_q('admin-hub-server-flags'));

    ZS.AdminServerAnnounce?.mountHubSection?.(_q('admin-hub-announce'));

    _bindChrome();

    _bindF8();



    try {

      const params = new URLSearchParams(location.search);

      if (params.get('armTuner') === '1' || params.get('adminCal')) {

        const cal = params.get('adminCal') || 'fps_arm_tuner';

        setTimeout(() => {

          if (!_isAdmin()) return;

          if (params.get('armTuner') === '1') open('calibration');

          else {

            close();

            ZS.Calibration?.openTool?.(cal);

          }

        }, 800);

      }

    } catch (_) { /* ignore */ }

  }



  window.ZS = window.ZS || {};

  ZS.AdminHub = { init, open, close, toggle, isOpen, showView: _showView, isAdmin: _isAdmin, hasPerm: _hasPerm, rebuildMenu };
