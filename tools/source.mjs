/* ─────────────────────────────────────────────────────────────────────────
   DIZAYN MANBASIDAN MA'LUMOT OLISH — generatorlar uchun umumiy qatlam

   Nima uchun kerak: `src/Main.dc.html` — savol banki va imtihon
   formatining YAGONA manbasi. Generatorlar (seed, OG rasmi, Play
   grafikasi) shu raqamlarni o'zlari qayta yozib qo'yishsa, ular bir
   necha kun ichida eskiradi va hech kim sezmaydi — natijada do'kondagi
   rasm ilova bermaydigan narsani va'da qiladi.

   Shu sabab bu yerdagi funksiyalar manbani O'QIYDI va topa olmasa
   XATO BILAN YIQILADI. Jimgina eski raqamga qaytish yo'q: eskirgan
   marketing raqami yo'q raqamdan yomonroq.
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join('src', 'Main.dc.html');

export function designSource() {
  return readFileSync(SRC, 'utf8');
}

/* Massivni qavslarni hisoblab kesadi: satr va izohlar chetlab o'tiladi,
   aks holda savol matnidagi qavs ("(1-guruh)") hisobni buzadi. */
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

export function questions(code) {
  const src = code || designSource();
  return new Function(`return ${extractArray(src, 'const QUESTIONS = [')};`)();
}

/* Imtihon formati — aynan ilova ishlatadigan raqamlar.

   `n` — bankdan tanlanadigan savollar soni. Bank hali EXAM_SIZE ga
   yetmagan bo'lsa imtihon ham qisqa bo'ladi, shuning uchun marketing
   matni ham qisqa formatni aytishi kerak: "20 savol" deb yozib turib
   10 ta berish — yolg'on va'da, Play qoidalari bo'yicha ham muammo.

   `full` — bank to'liq formatni ko'tara oladimi. Generatorlar shu
   bayroqni ko'rsatadi, ya'ni do'konga materiallar yasayotgan odam
   bankni to'ldirish kerakligini ko'radi. */
export function examFormat(code) {
  const src = code || designSource();
  const num = name => {
    const m = src.match(new RegExp('const ' + name + ' = (\\d+);'));
    if (!m) {
      throw new Error(
        `[manba] ${name} src/Main.dc.html da topilmadi.\n` +
        '        Imtihon formati o\'zgargan bo\'lsa, bu yerdagi o\'qish ham\n' +
        '        yangilanishi kerak — generatorlar raqamni o\'zi o\'ylab topmaydi.');
    }
    return Number(m[1]);
  };
  const size = num('EXAM_SIZE');
  const perQ = num('EXAM_PER_Q');
  const maxWrong = num('EXAM_MAX_WRONG');
  const bank = questions(src).length;
  const n = Math.min(size, bank);
  const sec = n * perQ;
  const mm = Math.floor(sec / 60), ss = sec % 60;
  return {
    size, perQ, maxWrong, bank, n, sec,
    full: bank >= size,
    clock: mm + ':' + String(ss).padStart(2, '0'),
    minutes: mm,
    /* Butun daqiqa bo'lsa "25 daqiqa", aks holda soat ko'rinishi
       ("12:30"). "13 daqiqa" deb yaxlitlash kichik yolg'on: odam
       imtihonda o'sha 30 soniyani sezadi. */
    timeLabel: ss === 0 ? mm + ' daqiqa' : mm + ':' + String(ss).padStart(2, '0'),
    // "20 savol · 25 daqiqa"
    get chip() { return n + ' savol · ' + this.timeLabel; },
    // "20 savol, 25 daqiqa, 2 xato limiti"
    get sentence() { return n + ' savol, ' + this.timeLabel + ', ' + maxWrong + ' xato limiti'; },
  };
}
