/* ─────────────────────────────────────────────────────────────────────────
   supabase/mkseed.mjs — og'zaki savollar seed generatorining tekshiruvi

   Nima uchun muhim: generator — content/verbal.json dan bazaga yagona
   yo'l. U yerdagi xato ikki xil bo'ladi va ikkalasi ham jimgina:
     · ekranlash xatosi (o'zbek matnida apostrof har qadamda: qo'l, bo'sh)
       — seed yiqiladi yoki, yomonrog'i, matn buziladi;
     · tekshiruv bazanikidan yumshoq bo'lsa — xato bazada, "qaysi savolda"
       degan ma'lumotsiz chiqadi.
   Bazaning o'zida (CHECK) nima tekshirilishini supabase/tests/0002 ko'radi;
   bu yerda — generatorning xulqi.

   Ishga tushirish:  node --test supabase/tests/*.test.mjs
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validate, render } from '../mkseed.mjs';

const SCRIPT = new URL('../mkseed.mjs', import.meta.url).pathname;
const FIXTURE = new URL('./fixtures/verbal.sample.json', import.meta.url).pathname;
const sample = () => JSON.parse(readFileSync(FIXTURE, 'utf8'));

function withItem(patch) {
  const d = sample();
  const it = d.items[0];
  patch(it, d);
  return d;
}

test('namuna shartnomaga mos — xato yo\'q', () => {
  assert.deepEqual(validate(sample()), []);
});

test('buzuq savollar aniq sababi bilan rad etiladi', () => {
  const cases = [
    ['key formati',      it => { it.key = 'x1'; },                         /key "v"/],
    ['noma\'lum kind',   it => { it.kind = 'math'; },                      /kind/],
    ['level 0',          it => { it.level = 0; },                          /level 1\.\.10/],
    ['level kasr',       it => { it.level = 2.5; },                        /level 1\.\.10/],
    ['3 ta variant',     it => { it.uz.options.pop(); it.ru.options.pop(); }, /3 ta variant/],
    ['7 ta variant',     it => { it.uz.options.push('a', 'b', 'c'); it.ru.options.push('а', 'б', 'в'); }, /7 ta variant/],
    ['soni mos emas',    it => { it.ru.options.pop(); },                   /soni bir xil/],
    ['correct chegara',  it => { it.correct = 4; },                        /correct 4/],
    ['correct matn',     it => { it.correct = '1'; },                      /correct "1"/],
    ['takroriy variant', it => { it.uz.options[3] = '  gul '; },           /bir xil/],
    ['bo\'sh variant',   it => { it.ru.options[0] = '   '; },               /bo'sh/],
    ['uzun variant',     it => { it.uz.options[0] = 'a'.repeat(121); },    /120/],
    ['stimul bir tilda', it => { delete it.ru.stimulus; },                 /stimulus faqat bir tilda/],
    ['ru yo\'q',         it => { delete it.ru; },                          /\.ru: yo'q/],
    ['qisqa izoh',       it => { it.explain.uz = ' a '; },                 /explain\.uz/],
    ['NUL belgi',        it => { it.uz.prompt = 'a\u0000bc'; },            /NUL/],
    ['uzun savol',       it => { it.ru.prompt = 'я'.repeat(301); },        /prompt: uzunligi 301/],
  ];
  for (const [name, patch, re] of cases) {
    const d = withItem(patch);
    const errs = validate(d);
    assert.ok(errs.some(e => re.test(e)), `${name}: ${JSON.stringify(errs)}`);
    assert.ok(errs.some(e => e.startsWith(d.items[0].key)), `${name}: xabarda savol kaliti bo'lishi kerak`);
  }
});

test('fayl darajasidagi xatolar: versiya, bo\'sh ro\'yxat, takroriy key', () => {
  assert.ok(validate({ version: 2, items: sample().items }).some(e => /version/.test(e)));
  assert.ok(validate({ version: 1, items: [] }).some(e => /bo'sh/.test(e)));
  const d = sample();
  d.items[1].key = d.items[0].key;
  assert.ok(validate(d).some(e => /takrorlangan/.test(e)));
  assert.deepEqual(validate(null), ['fayl obyekt emas']);
});

test('SQL ekranlash: apostrof ikkilanadi, teskari chiziq o\'zgarmaydi', () => {
  const sql = render(sample(), 'namuna');
  assert.ok(sql.includes("'Qo''l'"), 'apostrof ikkilanishi kerak');
  assert.ok(sql.includes("'O''rik'"));
  assert.ok(sql.includes("'Issiq \\ sovuq'"), 'teskari chiziq oddiy belgi (standard_conforming_strings)');
  assert.ok(sql.includes('set standard_conforming_strings = on;'));
  assert.ok(sql.includes('"asbob"'), 'qo\'shtirnoq o\'zgarmaydi');
  assert.ok(!/begin;|commit;/i.test(sql), 'tranzaksiyani apply.sh boshqaradi (psql -1)');
});

test('hamma savol draft — faylda reviewed: true bo\'lsa ham', () => {
  const d = sample();
  d.items.forEach(it => { it.reviewed = true; });
  const sql = render(d, 'namuna');
  const states = sql.match(/'(draft|review|published|archived)'\)/g);
  assert.equal(states.length, d.items.length);
  assert.ok(states.every(s => s === "'draft')"));
  assert.ok(!/reviewed/.test(sql.split('-- ═══').pop().replace(/^[\s\S]*?\n\n/, '')),
    'reviewed maydoni SQL\'ga tushmasligi kerak');
});

test('seed faqat hech kim tegmagan qoralamani yangilaydi', () => {
  const sql = render(sample(), 'namuna');
  assert.match(sql, /on conflict \(key\) do update set/);
  assert.match(sql, /where v\.state = 'draft'\n  and v\.author_id is null\n  and v\.updated_by is null/);
  assert.match(sql, /is distinct from/, 'o\'zgarmagan qator yangilanmaydi — jurnalga shovqin tushmaydi');
  assert.ok(!/state = excluded\.state/.test(sql), 'seed holatni hech qachon o\'zgartirmaydi');
});

test('natija deterministik: tartib va takroriy ishga tushirishdan qat\'i nazar bir xil', () => {
  const a = render(sample(), 'namuna');
  const d = sample();
  d.items.reverse();
  const b = render(d, 'namuna');
  assert.equal(a, b, 'fayldagi tartib o\'zgarsa ham seed bir xil (CI diff tekshiruvi uchun)');
  const keys = [...a.matchAll(/^  \('(v\d+)',/gm)].map(m => m[1]);
  assert.deepEqual(keys, [...keys].sort());
});

test('CLI: fayl yo\'q bo\'lsa aniq xabar va xato kodi', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkseed-'));
  try {
    const out = join(dir, 'seed.sql');
    const r = spawnSync(process.execPath, [SCRIPT, '--in', join(dir, 'yoq.json'), '--out', out], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /topilmadi/);
    assert.match(r.stderr, /CONTRACT\.md/);
    assert.ok(!existsSync(out), 'hech narsa yozilmasligi kerak');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI: buzuq fayl — seed YOZILMAYDI, xatolar ro\'yxati chiqadi', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkseed-'));
  try {
    const bad = join(dir, 'bad.json');
    const out = join(dir, 'seed.sql');
    writeFileSync(bad, JSON.stringify(withItem(it => { it.correct = 9; })));
    const r = spawnSync(process.execPath, [SCRIPT, '--in', bad, '--out', out], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /v99901: correct 9/);
    assert.ok(!existsSync(out));

    writeFileSync(bad, '{ bu json emas');
    const r2 = spawnSync(process.execPath, [SCRIPT, '--in', bad, '--out', out], { encoding: 'utf8' });
    assert.equal(r2.status, 1);
    assert.match(r2.stderr, /JSON/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI: to\'g\'ri fayl — seed yoziladi', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkseed-'));
  try {
    const out = join(dir, 'seed.sql');
    const r = spawnSync(process.execPath, [SCRIPT, '--in', FIXTURE, '--out', out], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(out, 'utf8'), render(sample(), 'supabase/tests/fixtures/verbal.sample.json'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
