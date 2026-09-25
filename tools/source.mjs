/* ─────────────────────────────────────────────────────────────────────────
   DIZAYN MANBASIDAN MA'LUMOT OLISH — generatorlar uchun umumiy qatlam

   Nima uchun kerak: `src/Main.dc.html` — test formatining YAGONA
   manbasi (TEST_LENGTH, LEAGUES). Marketing generatorlari (OG rasmi,
   Play grafikasi) shu raqamlarni o'zlari qayta yozib qo'yishsa, ular bir
   necha kun ichida eskiradi va hech kim sezmaydi — natijada do'kondagi
   rasm ilova bermaydigan narsani va'da qiladi.

   Shu sabab bu yerdagi funksiyalar manbani O'QIYDI va topa olmasa
   XATO BILAN YIQILADI. Jimgina eski raqamga qaytish yo'q: eskirgan
   marketing raqami yo'q raqamdan yomonroq.

   IQuest'da savol banki YO'Q (savollar generatordan — src/iq/gen), shu
   sababli Nazariy'dagi questions() olib tashlandi. Savol turlari va
   o'yinlar ro'yxati — catalog().
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = join('src', 'Main.dc.html');

export function designSource() {
  return readFileSync(SRC, 'utf8');
}

function num(src, name) {
  const m = src.match(new RegExp('const ' + name + ' = (\\d+);'));
  if (!m) {
    throw new Error(
      `[manba] ${name} src/Main.dc.html da topilmadi.\n` +
      '        Test formati o\'zgargan bo\'lsa, bu yerdagi o\'qish ham\n' +
      '        yangilanishi kerak — generatorlar raqamni o\'zi o\'ylab topmaydi.');
  }
  return Number(m[1]);
}

/* Savol turlari va o'yinlar — fayllar bo'yicha (demo.js va reyestr
   hisobga olinmaydi). Ro'yxatdan o'tish ishlash vaqtida bo'ladi, bu yerda
   esa faqat NECHTA ekani kerak (grafikadagi "4 savol turi · 6 o'yin"). */
export function catalog() {
  const list = (dir, skip) => existsSync(dir)
    ? readdirSync(dir).filter(f => f.endsWith('.js') && skip.indexOf(f) === -1).map(f => f.slice(0, -3)).sort()
    : [];
  return {
    types: list(join('src', 'iq', 'gen'), ['demo.js']),
    games: list(join('src', 'games'), ['demo.js', 'index.js']),
  };
}

/* IQ test formati — aynan ilova ishlatadigan raqam.

   Maydonlar nomi Nazariy'dagi examFormat() bilan mos (n, size, bank,
   full, chip, sentence, timeLabel) — tools/mkog.mjs va tools/mkplay.mjs
   hali shu nomlarni o'qiydi. Vaqt cheklovi yo'q: test moslashuvchan,
   har savolga ketgan vaqt faqat o'lchanadi. */
export function testFormat(code) {
  const src = code || designSource();
  const n = num(src, 'TEST_LENGTH');
  return {
    n, size: n, bank: n, full: true,
    perQ: 0, maxWrong: 0, sec: 0, clock: '', minutes: 0,
    timeLabel: 'vaqt cheklanmagan',
    // "30 savol · moslashuvchan"
    chip: n + ' savol · moslashuvchan',
    // "30 ta moslashuvchan savol"
    sentence: n + ' ta moslashuvchan savol',
  };
}

/* Eski nom — mkog.mjs / mkplay.mjs (brand egasi) testFormat'ga o'tguncha. */
export const examFormat = testFormat;
