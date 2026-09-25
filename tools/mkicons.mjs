/* ─────────────────────────────────────────────────────────────────────────
   IKONKA VA SPLASH  →  resources/*.png

   Ishga tushirish:  npm run icons
     (= node tools/mkicons.mjs && npx capacitor-assets generate --android)

   Manba — tools/icon.html (belgining o'zi va izohi o'sha yerda). Bu
   skript sahifani brauzerda ochib, to'rt blokning suratini oladi:
     resources/icon-only.png        1024×1024  eski ikonka + Play 512 manbasi
     resources/icon-foreground.png  1024×1024  adaptive ikonka, shaffof
     resources/icon-background.png  1024×1024  adaptive ikonka foni
     resources/splash.png, splash-dark.png  2732×2732
   Keyin capacitor-assets ulardan android/app/src/main/res/ dagi
   mipmap-* va drawable-* fayllarini yasaydi.

   PNG'lar repoda saqlanadi (brauzer har build'da kerak bo'lmasin) —
   belgi o'zgarganda shu skript qayta ishga tushiriladi.
   ───────────────────────────────────────────────────────────────────── */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

/* Playwright loyihaning bog'liqligi EMAS (u faqat generatorlar uchun
   kerak va har o'rnatishga 100+ MB qo'shardi). Avval loyihadan, keyin
   global o'rnatilganidan (`npm i -g playwright`) qidiriladi. */
async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) {}
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(root, 'noop.js'))('playwright').chromium;
  } catch (e) {}
  console.error('[mkicons] playwright topilmadi:\n' +
                '  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const chromium = await loadChromium();
/* Brauzer: CHROME=/yo'l/chrome, bo'lmasa ma'lum joy, bo'lmasa
   Playwright o'zi o'rnatganini topadi. */
const EXE = process.env.CHROME ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => existsSync(p));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = f => join(ROOT, 'resources', f);

const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 2800, height: 2800 } });
await p.goto(pathToFileURL(join(ROOT, 'tools', 'icon.html')).href);
await p.waitForTimeout(600);
await p.locator('#icon').screenshot({ path: out('icon-only.png') });
await p.locator('#fg').screenshot({ path: out('icon-foreground.png'), omitBackground: true });
await p.locator('#bg').screenshot({ path: out('icon-background.png') });
await p.locator('#splash').screenshot({ path: out('splash-dark.png') });
await p.locator('#splash').screenshot({ path: out('splash.png') });
await b.close();
console.log('[mkicons] resources/ yangilandi: icon-only, icon-foreground, ' +
            'icon-background, splash, splash-dark');
