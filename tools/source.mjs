/* ─────────────────────────────────────────────────────────────────────────
   DIZAYN MANBASIDAN MA'LUMOT OLISH — generatorlar uchun umumiy qatlam

   Nima uchun kerak: `src/Main.dc.html` — test formatining YAGONA
   manbasi (TEST_SIZE, TEST_PER_Q). Do'kon grafikasi, OG rasmi yoki
   boshqa marketing matni shu raqamlarni o'zi qayta yozib qo'ysa, ular
   bir necha kun ichida eskiradi va hech kim sezmaydi — natijada
   do'kondagi rasm ilova bermaydigan narsani va'da qiladi.

   Shu sabab bu yerdagi funksiyalar manbani O'QIYDI va topa olmasa
   XATO BILAN YIQILADI. Jimgina eski raqamga qaytish yo'q: eskirgan
   marketing raqami yo'q raqamdan yomonroq.

   Savollar banki endi bu faylda yo'q: savollar src/iq/gen/ dagi
   generatorlarda yaratiladi. Turlar soni kerak bo'lsa — generator
   fayllari sanaladi (typeCount).
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join('src', 'Main.dc.html');

export function designSource() {
  return readFileSync(SRC, 'utf8');
}

/* Massivni qavslarni hisoblab kesadi: satr va izohlar chetlab o'tiladi,
   aks holda matndagi qavs ("(1-guruh)") hisobni buzadi. */
export function extractArray(code, marker) {
  const i = code.indexOf(marker);
  if (i === -1) throw new Error(`[manba] "${marker}" topilmadi`);
  const open = code.indexOf('[', i);
  let depth = 0, st = 'code';
  for (let k = open; k < code.length; k++) {
    const c = code[k], n = code[k + 1];
    if (st === 'code') {
      if (c === '"') st = 'dq';
      else if (c === "'") st = 'sq';
      else if (c === '/' && n === '/') st = 'lc';
      else if (c === '/' && n === '*') st = 'bc';
      else if (c === '[') depth++;
      else if (c === ']' && --depth === 0) return code.slice(open, k + 1);
    }
    else if (st === 'dq') { if (c === '\\') k++; else if (c === '"') st = 'code'; }
    else if (st === 'sq') { if (c === '\\') k++; else if (c === "'") st = 'code'; }
    else if (st === 'lc') { if (c === '\n') st = 'code'; }
    else if (st === 'bc') { if (c === '*' && n === '/') { k++; st = 'code'; } }
  }
  throw new Error('[manba] massiv yopilmadi');
}

/* Ro'yxatdan o'tadigan savol turlari soni (gen/*.js, demo'siz) —
   "4 tur topshiriq" kabi matn uchun. */
export function typeCount() {
  return readdirSync(join('src', 'iq', 'gen'))
    .filter(f => f.endsWith('.js') && f !== 'demo.js').length;
}

/* IQ testi formati — aynan ilova ishlatadigan raqamlar
   ("30 savol · 30 daqiqa"). */
export function testFormat(code) {
  const src = code || designSource();
  const num = name => {
    const m = src.match(new RegExp('const ' + name + ' = (\\d+);'));
    if (!m) {
      throw new Error(
        `[manba] ${name} src/Main.dc.html da topilmadi.\n` +
        '        Test formati o\'zgargan bo\'lsa, bu yerdagi o\'qish ham\n' +
        '        yangilanishi kerak — generatorlar raqamni o\'zi o\'ylab topmaydi.');
    }
    return Number(m[1]);
  };
  const n = num('TEST_SIZE');
  const perQ = num('TEST_PER_Q');
  const sec = n * perQ;
  const mm = Math.floor(sec / 60), ss = sec % 60;
  return {
    n, perQ, sec,
    clock: mm + ':' + String(ss).padStart(2, '0'),
    minutes: mm,
    /* Butun daqiqa bo'lsa "30 daqiqa", aks holda soat ko'rinishi.
       Yaxlitlash kichik yolg'on: odam o'sha soniyalarni sezadi. */
    timeLabel: ss === 0 ? mm + ' daqiqa' : mm + ':' + String(ss).padStart(2, '0'),
    // "30 savol · 30 daqiqa"
    get chip() { return n + ' savol · ' + this.timeLabel; },
  };
}
