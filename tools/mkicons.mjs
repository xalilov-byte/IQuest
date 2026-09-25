/* ─────────────────────────────────────────────────────────────────────────
   ILOVA IKONKASI VA SPLASH MANBALARI  →  resources/*.png

   Ishga tushirish:  npm run icons
     (= node tools/mkicons.mjs && npx capacitor-assets generate --android)

   Chiqadi (capacitor-assets aynan shu nomlarni kutadi):
     resources/icon-only.png         1024×1024  to'liq ikonka (eski Android,
                                                Play 512, sayt favicon'i)
     resources/icon-foreground.png   1024×1024  adaptiv old qatlam, SHAFFOF
     resources/icon-background.png   1024×1024  adaptiv fon qatlami
     resources/splash.png            2732×2732  ochilish ekrani
     resources/splash-dark.png       2732×2732  (ilova foni doim qorong'i —
                                                ikkalasi bir xil)

   ── IKKI MANBA ────────────────────────────────────────────────────────
   1) resources/art/ — foydalanuvchi yaratgan rasmlar (RASMLAR.md):
        icon-foreground.png, icon-background.png, icon-full.png, splash.png
      Qaysi biri bo'lsa, O'SHA ishlatiladi.
   2) tools/icon.html — vaqtinchalik geometrik belgi. Faqat art/ da
      yo'q qatlamlar uchun chiziladi.

   Nima uchun shunday: rasmni almashtirish uchun kod tahrirlash kerak
   bo'lmasin — fayl qo'yiladi va `npm run icons` qayta ishga tushiriladi.
   Yetishmagan qatlamlar shu yerda to'ldiriladi (masalan faqat old va fon
   berilsa, to'liq ikonka va splash ulardan yig'iladi), shuning uchun
   telefondagi, do'kondagi va splash'dagi belgi har doim BIR XIL.

   Playwright loyihaning bog'liqligi EMAS (100+ MB, faqat shu generatorlar
   uchun). U loyihada ham, global (npm i -g playwright) ham qidiriladi.
   Brauzer boshqa joyda bo'lsa: CHROME=/yo'l/chrome npm run icons
   ───────────────────────────────────────────────────────────────────── */
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'resources');
const ART = join(RES, 'art');
const DARK = '#14121F';          // capacitor.config.json → SplashScreen.backgroundColor
const ICON = 1024, SPLASH = 2732;
/* Splash'dagi plitka. CENTER_CROP portret telefonda kvadratning markaziy
   ~46% kengligini qoldiradi (≈1260px), shuning uchun plitka undan ancha
   kichik — kesilib qolmaydi. icon.html dagi --t bilan bir xil. */
const SPLASH_TILE = 600;

mkdirSync(RES, { recursive: true });
const out = name => join(RES, name);
const art = name => (existsSync(join(ART, name)) ? join(ART, name) : null);

/* ── Foydalanuvchi rasmi: o'lcham va shaffoflikni tekshirish ──────────
   Xato rasm (kvadrat emas, shaffofsiz old qatlam) jimgina qabul
   qilinsa, buzuq ikonka faqat telefonda ko'rinadi. Shuning uchun
   bu yerda aniq xabar bilan to'xtatiladi. */
function stop(msg) {
  console.error('[mkicons] ' + msg + '\n  Talablar: RASMLAR.md');
  process.exit(1);
}
async function checkArt(file, { size, alpha }) {
  const m = await sharp(file).metadata();
  const rel = file.replace(ROOT + '/', '');
  if (m.width !== m.height) stop(`${rel}: kvadrat bo'lishi kerak (${m.width}×${m.height})`);
  if (m.width < size) stop(`${rel}: kamida ${size}×${size} kerak (${m.width}×${m.height})`);
  if (alpha && !m.hasAlpha) {
    stop(`${rel}: shaffof fon (alfa kanal) kerak — adaptiv ikonkada old qatlam fon ustiga qo'yiladi`);
  }
}

const fromArt = [];
const need = [];   // icon.html dan chizilishi kerak bo'lgan qatlamlar

/* 1. Adaptiv old qatlam */
const fgArt = art('icon-foreground.png');
if (fgArt) {
  await checkArt(fgArt, { size: ICON, alpha: true });
  await sharp(fgArt).resize(ICON, ICON).png().toFile(out('icon-foreground.png'));
  fromArt.push('icon-foreground.png');
} else need.push('fg');

/* 2. Adaptiv fon qatlami — shaffoflik bo'lmasligi kerak (launcher
   ostidagi rang ko'rinib qoladi), shuning uchun flatten. */
const bgArt = art('icon-background.png');
if (bgArt) {
  await checkArt(bgArt, { size: ICON, alpha: false });
  await sharp(bgArt).resize(ICON, ICON).flatten({ background: DARK }).png()
    .toFile(out('icon-background.png'));
  fromArt.push('icon-background.png');
} else need.push('bg');

/* 3–4. To'liq ikonka va splash: art/ da bo'lsa o'sha; bo'lmasa, lekin
   old qatlam art/ dan kelgan bo'lsa — o'sha qatlamlardan yig'iladi
   (aks holda telefonda bir belgi, do'konda boshqa belgi chiqardi). */
const fullArt = art('icon-full.png');
const splashArt = art('splash.png');
if (fullArt) {
  await checkArt(fullArt, { size: ICON, alpha: false });
  await sharp(fullArt).resize(ICON, ICON).flatten({ background: DARK }).png()
    .toFile(out('icon-only.png'));
  fromArt.push('icon-only.png  (art/icon-full.png)');
} else if (!fgArt) need.push('icon');

if (splashArt) {
  await checkArt(splashArt, { size: SPLASH, alpha: false });
  const buf = await sharp(splashArt).resize(SPLASH, SPLASH).flatten({ background: DARK }).png().toBuffer();
  await sharp(buf).toFile(out('splash.png'));
  await sharp(buf).toFile(out('splash-dark.png'));
  fromArt.push('splash.png, splash-dark.png');
} else if (!fgArt) need.push('splash');

/* ── icon.html dan chizish (faqat kerakli qatlamlar) ─────────────────── */
async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch (e) { /* keyingisi */ }
  try {
    const g = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(join(g, 'noop.js'))('playwright').chromium;
  } catch (e) { return null; }
}

if (need.length) {
  const chromium = await loadChromium();
  if (!chromium) {
    console.error('[mkicons] playwright topilmadi. Variantlar:\n' +
                  '  npm i -g playwright && npx playwright install chromium\n' +
                  '  yoki barcha qatlamlarni resources/art/ ga qo\'ying (RASMLAR.md)');
    process.exit(1);
  }
  const DEF = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const exe = process.env.CHROME || (existsSync(DEF) ? DEF : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-background-networking'] });
  const p = await b.newPage({ viewport: { width: 2800, height: 2800 }, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(join(ROOT, 'tools', 'icon.html')).href);
  await p.waitForTimeout(300);
  if (need.includes('icon')) await p.locator('#icon').screenshot({ path: out('icon-only.png') });
  if (need.includes('fg')) await p.locator('#fg').screenshot({ path: out('icon-foreground.png'), omitBackground: true });
  if (need.includes('bg')) await p.locator('#bg').screenshot({ path: out('icon-background.png') });
  if (need.includes('splash')) {
    await p.locator('#splash').screenshot({ path: out('splash-dark.png') });
    await p.locator('#splash').screenshot({ path: out('splash.png') });
  }
  await b.close();
}

/* ── Old qatlam art/ dan kelgan, to'liq ikonka/splash esa yo'q ───────
   Ikkalasi old + fon qatlamlaridan yig'iladi. Old qatlam 1:1 qo'yiladi:
   adaptiv ikonkada ham 1024px old qatlam ko'rinadigan maydonni to'liq
   egallaydi (capacitor-assets inset 16.7%), ya'ni ko'rinish bir xil. */
if (fgArt && (!fullArt || !splashArt)) {
  // removeAlpha: fon shaffof emas, natija ham shaffofsiz bo'lsin
  // (Play va favicon uchun to'liq kvadrat).
  const layered = await sharp(await sharp(out('icon-background.png'))
    .composite([{ input: out('icon-foreground.png') }])
    .png().toBuffer()).removeAlpha().png().toBuffer();
  if (!fullArt) {
    await sharp(layered).toFile(out('icon-only.png'));
    fromArt.push('icon-only.png  (art/ qatlamlaridan yig\'ildi)');
  }
  if (!splashArt) {
    const r = Math.round(SPLASH_TILE * 0.23);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_TILE}" height="${SPLASH_TILE}">` +
      `<rect width="${SPLASH_TILE}" height="${SPLASH_TILE}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
    const tile = await sharp(layered).resize(SPLASH_TILE, SPLASH_TILE)
      .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const at = Math.round((SPLASH - SPLASH_TILE) / 2);
    const buf = await sharp({ create: { width: SPLASH, height: SPLASH, channels: 3, background: DARK } })
      .composite([{ input: tile, left: at, top: at }]).removeAlpha().png().toBuffer();
    await sharp(buf).toFile(out('splash.png'));
    await sharp(buf).toFile(out('splash-dark.png'));
    fromArt.push('splash.png, splash-dark.png  (art/ qatlamlaridan yig\'ildi)');
  }
}

/* ── Hisobot ─────────────────────────────────────────────────────────── */
for (const f of ['icon-only.png', 'icon-foreground.png', 'icon-background.png', 'splash.png', 'splash-dark.png']) {
  const m = await sharp(out(f)).metadata();
  console.log(`  resources/${f.padEnd(22)} ${m.width}×${m.height}${m.hasAlpha ? '  (alfa)' : ''}`);
}
console.log(fromArt.length
  ? '\nresources/art/ dan olindi:\n  ' + fromArt.join('\n  ')
  : '\nHammasi tools/icon.html dan chizildi (resources/art/ bo\'sh).');
console.log('\nKeyingi qadam: npx capacitor-assets generate --android  (npm run icons buni o\'zi qiladi)');
