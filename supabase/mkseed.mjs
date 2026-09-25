#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
   OG'ZAKI SAVOLLARNI SQL SEED'GA AYLANTIRISH

   Ishga tushirish:  node supabase/mkseed.mjs
   Manba:            content/verbal.json   (shakli: src/iq/CONTRACT.md §2)
   Chiqish:          supabase/seed/0001_verbal.sql

   Boshqa manba/chiqish (sinov uchun):
       node supabase/mkseed.mjs --in yo'l/verbal.json --out yo'l/seed.sql

   NIMA UCHUN GENERATOR: savollar content/verbal.json da yashaydi va
   ilovaga APK ichida ham boradi. Ularni qo'lda SQL'ga ko'chirish bir
   marta ishlaydi va darhol eskiradi. CI (db.yml) generatorni qayta
   ishga tushirib, commit qilingan seed bilan farq bo'lmasligini
   tekshiradi.

   HAMMA SAVOL 'draft' BO'LIB TUSHADI — `reviewed` maydoni e'tiborga
   OLINMAYDI. Faylda "reviewed: true" yozish kimning ko'rib chiqqanini
   isbotlamaydi; bazada esa nashr etish faqat to'rt ko'z qoidasi orqali
   (tizimga kirgan, mazmun muallifidan boshqa xodim) bo'ladi.

   Seed IDEMPOTENT: qayta ishga tushirilsa savol faqat hali hech kim
   tegmagan qoralama bo'lsa va mazmuni haqiqatan o'zgargan bo'lsa
   yangilanadi. Odam tahrirlagan yoki nashr etilgan savolga seed
   TEGMAYDI — u yerda manba endi baza.

   Tekshiruvlar bazadagi CHECK'lar bilan bir xil (0002_verbal.sql): xato
   bazada emas, shu yerda — qaysi savolda va nima uchun ekani bilan —
   chiqsin.
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_IN = join(ROOT, 'content', 'verbal.json');
const DEFAULT_OUT = join(ROOT, 'supabase', 'seed', '0001_verbal.sql');

export const KINDS = ['analogy', 'odd', 'category', 'relation'];
export const OPTIONS_MIN = 4;
export const OPTIONS_MAX = 6;

/* PostgreSQL char_length — kod nuqtalari soni (JS length esa UTF-16
   birliklari). btrim standart holatda faqat probelni kesadi. */
const clen = s => [...s].length;
const btrim = s => s.replace(/^ +| +$/g, '');
const norm = s => btrim(s).replace(/\s+/g, ' ').toLowerCase();

function textErr(v, min, max, where, errs) {
  if (typeof v !== 'string') { errs.push(`${where}: matn emas`); return; }
  if (v.includes('\u0000')) { errs.push(`${where}: NUL belgisi`); return; }
  const n = clen(btrim(v));
  if (n < min || n > max) errs.push(`${where}: uzunligi ${n}, ruxsat ${min}..${max}`);
}

function optionsErr(opts, where, errs) {
  if (!Array.isArray(opts)) { errs.push(`${where}: massiv emas`); return; }
  if (opts.length < OPTIONS_MIN || opts.length > OPTIONS_MAX) {
    errs.push(`${where}: ${opts.length} ta variant, ruxsat ${OPTIONS_MIN}..${OPTIONS_MAX}`);
  }
  opts.forEach((o, i) => {
    if (typeof o !== 'string' || !/\S/.test(o)) errs.push(`${where}[${i}]: bo'sh yoki matn emas`);
    else if (o.includes('\u0000')) errs.push(`${where}[${i}]: NUL belgisi`);
    else if (clen(o) > 120) errs.push(`${where}[${i}]: 120 belgidan uzun`);
  });
  const seen = new Map();
  opts.forEach((o, i) => {
    if (typeof o !== 'string') return;
    const k = norm(o);
    if (seen.has(k)) errs.push(`${where}: ${seen.get(k)}- va ${i}-variant bir xil ("${o}")`);
    else seen.set(k, i);
  });
}

/* Butun faylni tekshiradi. Qaytaradi: xatolar ro'yxati (bo'sh = to'g'ri). */
export function validate(data) {
  const errs = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['fayl obyekt emas'];
  if (data.version !== 1) errs.push(`version: 1 kutilgan, bor: ${JSON.stringify(data.version)}`);
  if (!Array.isArray(data.items)) return errs.concat('items massiv emas');
  if (!data.items.length) errs.push('items bo\'sh — seed qiladigan savol yo\'q');

  const keys = new Set();
  data.items.forEach((it, idx) => {
    const at = (it && typeof it.key === 'string') ? it.key : `items[${idx}]`;
    if (!it || typeof it !== 'object') { errs.push(`${at}: obyekt emas`); return; }
    if (typeof it.key !== 'string' || !/^v[0-9]{3,6}$/.test(it.key)) {
      errs.push(`${at}: key "v" + 3..6 raqam bo'lishi kerak (masalan v001)`);
    } else if (keys.has(it.key)) {
      errs.push(`${at}: key takrorlangan — kalit hech qachon qayta ishlatilmaydi`);
    } else keys.add(it.key);
    if (!KINDS.includes(it.kind)) errs.push(`${at}: kind ${JSON.stringify(it.kind)} — ${KINDS.join(' | ')} bo'lishi kerak`);
    if (!Number.isInteger(it.level) || it.level < 1 || it.level > 10) errs.push(`${at}: level 1..10 butun son emas`);

    for (const lang of ['uz', 'ru']) {
      const t = it[lang];
      if (!t || typeof t !== 'object') { errs.push(`${at}.${lang}: yo'q`); continue; }
      textErr(t.prompt, 3, 300, `${at}.${lang}.prompt`, errs);
      if (t.stimulus !== undefined && t.stimulus !== null) textErr(t.stimulus, 1, 300, `${at}.${lang}.stimulus`, errs);
      optionsErr(t.options, `${at}.${lang}.options`, errs);
    }
    const uz = it.uz || {}, ru = it.ru || {};
    const hasStim = t => t.stimulus !== undefined && t.stimulus !== null;
    if (hasStim(uz) !== hasStim(ru)) errs.push(`${at}: stimulus faqat bir tilda bor`);
    if (Array.isArray(uz.options) && Array.isArray(ru.options) && uz.options.length !== ru.options.length) {
      errs.push(`${at}: uz'da ${uz.options.length} ta, ru'da ${ru.options.length} ta variant — soni bir xil bo'lishi shart`);
    }
    const n = Array.isArray(uz.options) ? uz.options.length : 0;
    if (!Number.isInteger(it.correct) || it.correct < 0 || it.correct >= n) {
      errs.push(`${at}: correct ${JSON.stringify(it.correct)} — 0..${n - 1} oralig'ida bo'lishi kerak`);
    }
    if (!it.explain || typeof it.explain !== 'object') errs.push(`${at}.explain: yo'q`);
    else {
      textErr(it.explain.uz, 3, 600, `${at}.explain.uz`, errs);
      textErr(it.explain.ru, 3, 600, `${at}.explain.ru`, errs);
    }
  });
  return errs;
}

/* ── SQL ─────────────────────────────────────────────────────────────── */
/* standard_conforming_strings yoqilgan (fayl boshida o'rnatiladi):
   faqat apostrof ikkilanadi, teskari chiziq oddiy belgi. O'zbek matnida
   apostrof har qadamda (qo'l, bo'sh) — bu yerdagi xato butun seed'ni
   buzardi. */
const lit = s => (s === undefined || s === null) ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const arr = a => 'array[' + a.map(lit).join(', ') + ']::text[]';

const COLS = ['kind', 'level', 'uz_prompt', 'uz_stimulus', 'uz_options',
              'ru_prompt', 'ru_stimulus', 'ru_options', 'correct', 'explain_uz', 'explain_ru'];

export function render(data, source) {
  const items = data.items.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const rows = items.map(it => '  (' + [
    lit(it.key), lit(it.kind), String(it.level),
    lit(it.uz.prompt), lit(it.uz.stimulus), arr(it.uz.options),
    lit(it.ru.prompt), lit(it.ru.stimulus), arr(it.ru.options),
    String(it.correct), lit(it.explain.uz), lit(it.explain.ru), "'draft'",
  ].join(',\n   ') + ')');

  return `-- ═══════════════════════════════════════════════════════════════════════
--  ZUKKO — og'zaki savollar seed'i (${items.length} ta)
--
--  BU FAYL QO'LDA TAHRIR QILINMAYDI — u generator bilan yasaladi:
--      node supabase/mkseed.mjs
--  Manba: ${source}
--
--  Hamma savol 'draft' holatida tushadi: foydalanuvchiga faqat xodim
--  ko'rib chiqib nashr etgandan keyin chiqadi (to'rt ko'z qoidasi).
--  Qayta ishga tushirish xavfsiz: faqat hech kim tegmagan va mazmuni
--  o'zgargan qoralama yangilanadi; qolganlariga (jurnalga ham) tegilmaydi.
--
--  Qo'llash: supabase/apply.sh (bitta tranzaksiyada).
-- ═══════════════════════════════════════════════════════════════════════

set standard_conforming_strings = on;

insert into public.verbal_items as v
  (key, ${COLS.join(', ')}, state)
values
${rows.join(',\n')}
on conflict (key) do update set
${COLS.map(c => `  ${c} = excluded.${c}`).join(',\n')}
where v.state = 'draft'
  and v.author_id is null
  and v.updated_by is null
  and (${COLS.map(c => 'v.' + c).join(', ')})
      is distinct from
      (${COLS.map(c => 'excluded.' + c).join(', ')});
`;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function main() {
  const inPath = resolve(arg('--in') || DEFAULT_IN);
  const outPath = resolve(arg('--out') || DEFAULT_OUT);
  const shown = p => relative(ROOT, p) || p;

  if (!existsSync(inPath)) {
    console.error(`[mkseed] XATO: ${shown(inPath)} topilmadi.`);
    console.error('         Bu fayl og\'zaki savollar egasi (verbal) tomonidan yoziladi —');
    console.error('         shakli src/iq/CONTRACT.md §2 da. Fayl paydo bo\'lgach qayta ishga tushiring:');
    console.error('             node supabase/mkseed.mjs');
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(inPath, 'utf8'));
  } catch (e) {
    console.error(`[mkseed] XATO: ${shown(inPath)} JSON sifatida o'qilmadi: ${e.message}`);
    process.exit(1);
  }
  const errs = validate(data);
  if (errs.length) {
    console.error(`[mkseed] XATO: ${shown(inPath)} da ${errs.length} ta muammo (seed YOZILMADI):`);
    errs.slice(0, 50).forEach(e => console.error('   · ' + e));
    if (errs.length > 50) console.error(`   … yana ${errs.length - 50} ta`);
    process.exit(1);
  }
  const sql = render(data, shown(inPath));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, sql);
  console.log(`[mkseed] ${data.items.length} ta savol → ${shown(outPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
