import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps/client/public');

function css(name) {
  return fs.readFileSync(path.join(PUBLIC, 'css', name), 'utf8');
}

const PLATFORM_CHECKS = [
  {
    file: 'landing.css',
    label: 'landing',
    breakpoints: ['max-width: 379px', 'max-width: 639px', 'min-width: 640px', 'min-width: 900px', 'min-width: 1024px', 'min-width: 1280px'],
    must: ['site-tokens.css', 'safe-area-inset', 'focus-visible', 'display-mode: standalone', 'prefers-reduced-motion', 'hover: hover'],
  },
  {
    file: 'play.css',
    label: 'play',
    breakpoints: ['max-width: 379px', 'orientation: landscape', 'min-width: 640px', 'min-width: 1024px'],
    must: ['site-tokens.css', 'font-size: 16px', 'focus-visible', 'display-mode: standalone', 'prefers-reduced-motion'],
  },
  {
    file: 'site-tokens.css',
    label: 'tokens',
    breakpoints: [],
    must: ['--safe-top', '--sticky-cta-h', '--touch-min', '--focus-ring', '--bp-tablet', '--bp-nav-desktop'],
  },
];

for (const { file, label, breakpoints, must } of PLATFORM_CHECKS) {
  test(`${label} CSS — tokens et plateformes`, () => {
    const content = css(file);
    const tokens = css('site-tokens.css');
    const all = file === 'site-tokens.css' ? content : content + tokens;
    for (const token of must) {
      const src = token === 'safe-area-inset' ? all : content;
      assert.match(src, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    for (const bp of breakpoints) {
      assert.match(content, new RegExp(bp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file} missing ${bp}`);
    }
  });
}

test('landing.css — détails mobile footer sticky et CTA wrap', () => {
  const content = css('landing.css');
  assert.match(content, /max-width: 899px[\s\S]*landing-footer[\s\S]*sticky-cta-h/);
  assert.match(content, /max-width: 639px[\s\S]*white-space: normal/);
  assert.match(content, /900px\) and \(max-width: 1023px/);
});

test('landing + play CSS — ergonomie interactions', () => {
  const landing = css('landing.css');
  const play = css('play.css');
  assert.match(landing, /landing-badge--dev/);
  assert.match(landing, /landing-trust-item--dev/);
  assert.match(landing, /landing-nav-open[\s\S]*position: fixed/);
  assert.match(landing, /body\.landing-nav-open \.landing-sticky-cta/);
  assert.match(landing, /landing-faq summary::after/);
  assert.match(landing, /overscroll-behavior: contain/);
  assert.match(landing, /touch-action: manipulation/);
  assert.match(play, /:user-invalid/);
  assert.match(play, /aria-busy/);
  assert.match(play, /pointer: coarse/);
  assert.match(play, /-webkit-autofill/);
  assert.match(play, /\.play-back:active/);
  assert.match(landing, /pointer: coarse[\s\S]*landing-nav-toggle[\s\S]*48px/);
});
