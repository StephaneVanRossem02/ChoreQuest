// Renders public/icon.svg to the PNG icons the manifest and iOS ask for.
//
//   node scripts/make-icons.mjs
//
// Uses a locally installed Edge or Chrome in headless mode, so there is no
// image library to install. Rerun after changing icon.svg and commit the PNGs.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const svg = readFileSync(path.join(root, 'public/icon.svg'), 'utf8');

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) throw new Error('Geen Edge of Chrome gevonden');

const OUTPUTS = [
  // iOS home screen. Linked from index.html.
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  // Notifications and og:image point here.
  { file: 'icon.png', size: 512 },
];

const work = mkdtempSync(path.join(tmpdir(), 'chorequest-icons-'));
try {
  for (const { file, size } of OUTPUTS) {
    const html = path.join(work, `${size}.html`);
    writeFileSync(
      html,
      `<!doctype html><html><body style="margin:0;overflow:hidden">` +
        svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `) +
        `</body></html>`
    );
    const out = path.join(root, 'public', file);
    execFileSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      `file:///${html.replace(/\\/g, '/')}`,
    ], { stdio: 'ignore' });
    console.log(`${file} (${size}x${size})`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
