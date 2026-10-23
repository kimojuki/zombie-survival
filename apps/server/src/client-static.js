'use strict';

/**
 * Pages HTML client + assets statiques (Vite dev ou build prod).
 */
function registerClientStatic(app, deps) {
  const {
    express,
    fs,
    path,
    log,
    getClientVersion,
    useClientBuild,
    clientRoot,
    clientDist,
    clientSrc,
    clientPublic,
  } = deps;

  function clientAssetHeaders(res, filePath) {
    if (/\.(js|mjs|css|html)$/i.test(filePath)) {
      res.set('Cache-Control', 'no-cache, must-revalidate');
    }
  }

  function sendClientHtml(res, fileName) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const filePath = useClientBuild
      ? path.join(clientDist, fileName)
      : path.join(clientRoot, fileName);
    if (fileName === 'game.html') {
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
          log.error('client', 'html read failed', { fileName, err: err.message });
          if (!res.headersSent) res.status(500).json({ error: 'Client entrypoint unavailable' });
          return;
        }
        const ver = getClientVersion();
        res.type('html').send(html.replace(/__CLIENT_VERSION__/g, ver));
      });
      return;
    }
    res.sendFile(filePath, (err) => {
      if (err) {
        log.error('client', 'html send failed', { fileName, err: err.message });
        if (!res.headersSent) res.status(500).json({ error: 'Client entrypoint unavailable' });
      }
    });
  }

  app.get('/favicon.ico', (req, res) => res.status(204).end());
  app.get('/', (req, res) => sendClientHtml(res, 'index.html'));
  app.get('/index.html', (req, res) => sendClientHtml(res, 'index.html'));
  app.get('/play.html', (req, res) => sendClientHtml(res, 'play.html'));
  app.get('/game.html', (req, res) => sendClientHtml(res, 'game.html'));
  app.get('/webrcon.html', (req, res) => sendClientHtml(res, 'webrcon.html'));
  app.get('/prefab-catalog.html', (req, res) => sendClientHtml(res, 'prefab-catalog.html'));
  app.get('/admin.html', (req, res) => sendClientHtml(res, 'prefab-catalog.html'));
  app.get('/arm-preview.html', (req, res) => sendClientHtml(res, 'arm-preview.html'));
  app.get('/models-preview.html', (req, res) => sendClientHtml(res, 'models-preview.html'));

  if (useClientBuild) {
    app.use(express.static(clientDist, { setHeaders: clientAssetHeaders }));
    return;
  }

  app.use('/src', express.static(clientSrc, { setHeaders: clientAssetHeaders }));
  app.use(express.static(clientPublic, { setHeaders: clientAssetHeaders }));
}

module.exports = { registerClientStatic };
