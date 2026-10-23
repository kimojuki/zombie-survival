import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'apps/client');
const PUBLIC = path.join(CLIENT, 'public');

function read(rel) {
  return fs.readFileSync(path.join(CLIENT, rel), 'utf8');
}

function readPublic(rel) {
  return fs.readFileSync(path.join(PUBLIC, rel), 'utf8');
}

test('landing index.html — viewport, favicon, skip link, ancres', () => {
  const html = read('index.html');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="icon"[^>]+favicon\.svg/);
  assert.match(html, /href="#contenu"/);
  for (const id of ['jeu', 'pourquoi', 'univers', 'survie', 'cartes', 'multijoueur', 'exigences', 'jouer', 'faq', 'contenu']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('landing play.html — play.css branding, compteur live', () => {
  const html = read('play.html');
  const css = readPublic('css/play.css');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /noindex/);
  assert.match(html, /class="play-page"/);
  assert.match(html, /play\.css/);
  assert.match(html, /data-online-count/);
  assert.match(html, /landing\.js/);
  assert.match(html, /play-dev-notice/);
  assert.match(html, /en cours de développement/i);
  assert.match(html, /play-tabs/);
  assert.match(html, /\/api\/auth\/guest/);
  assert.match(html, /\/api\/auth\/register/);
  assert.match(html, /Jouer en invité/);
  assert.match(css, /\.play-tab/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /min-height:\s*48px/);
});

test('landing contenu enrichi — sections SEO et JSON-LD', () => {
  const html = read('index.html');
  assert.match(html, /id="univers"/);
  assert.match(html, /id="pourquoi"/);
  assert.match(html, /id="multijoueur"/);
  assert.match(html, /FAQPage/);
  assert.match(html, /HowTo/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /landing-showcase/);
  assert.match(html, /landing-compare/);
  assert.match(html, /En cours de développement/);
  assert.match(html, /Le jeu est-il terminé/);
});

test('landing.css — grilles et responsive', () => {
  const css = readPublic('css/landing.css');
  const tokens = readPublic('css/site-tokens.css');
  const all = css + tokens;
  assert.match(css, /\.landing-showcase/);
  assert.match(css, /\.landing-compare/);
  assert.match(css, /\.landing-reveal/);
  assert.match(css, /min-width:\s*640px/);
  assert.match(css, /min-width:\s*900px/);
  assert.match(all, /safe-area-inset/);
  assert.match(css, /scroll-padding-top/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overflow-x:\s*hidden/);
});

test('landing manifest PWA', () => {
  const manifest = readPublic('manifest.webmanifest');
  const data = JSON.parse(manifest);
  assert.equal(data.start_url, '/');
  assert.equal(data.lang, 'fr');
  assert.ok(Array.isArray(data.icons) && data.icons.length > 0);
});

test('landing.js — poll, nav, reveal, sticky hide', () => {
  const js = readPublic('js/landing.js');
  assert.match(js, /\/api\/public\/status/);
  assert.match(js, /initMobileNav/);
  assert.match(js, /lockBodyScroll/);
  assert.match(js, /getDrawerFocusables/);
  assert.match(js, /initReveal/);
  assert.match(js, /initStickyHide/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /inert/);
});

test('landing SEO — sitemap home only, robots bloque play/game', () => {
  const sitemap = readPublic('sitemap.xml');
  const robots = readPublic('robots.txt');
  assert.match(sitemap, /<loc>https:\/\/survival\.badom\.ch\/<\/loc>/);
  assert.doesNotMatch(sitemap, /play\.html/);
  assert.match(robots, /Disallow: \/play\.html/);
  assert.match(robots, /Disallow: \/game\.html/);
});

test('landing assets — favicon et OG image valides', () => {
  assert.ok(fs.existsSync(path.join(PUBLIC, 'img/favicon.svg')));
  assert.ok(fs.existsSync(path.join(PUBLIC, 'img/og-zombie-survival.svg')));
  const og = readPublic('img/og-zombie-survival.svg');
  assert.match(og, /Survie post-apocalyptique/);
  assert.doesNotMatch(og, /\uFFFD/);
});
