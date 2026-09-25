#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
   BAZANING TO'LIQ ZANJIRI — lokal PostgreSQL'da (CI ham shu faylni ishlatadi)

   Ishga tushirish (PG* o'zgaruvchilari LOKAL serverni ko'rsatadi):
       PGHOST=/tmp PGPORT=5434 PGUSER=postgres node supabase/tests/run.mjs
       … --no-mutants        — faqat zanjir va testlar (tez)
       … --only <mutant-id>  — bitta mutant

   Nima qiladi:
     1. Toza baza → _stub.sql (Supabase taqlidi) → apply.sh → apply.sh
        yana bir marta (hech narsa o'zgarmasligi shart) → namunaviy seed
        ikki marta (ikkinchisi hech narsani o'zgartirmasligi va jurnalga
        yozmasligi shart) → 0001..0003 testlari.
     2. apply.sh ning o'z himoyasi: Nazariy'ga o'xshagan va begona
        migratsiyali bazaga HECH NARSA yozmasdan to'xtashi.
     3. Mutantlar (mutants.mjs): har himoya alohida olib tashlanadi va
        testlar AYNAN o'sha joyda yiqilishi talab qilinadi.

   XAVFSIZLIK: yurituvchi baza yaratadi/o'chiradi va auth.users ga sinov
   foydalanuvchi yozadi. Shuning uchun PGHOST faqat lokal bo'lishi mumkin
   (bo'sh, localhost, 127.0.0.1, ::1 yoki soket papkasi). SUPABASE_DB_URL
   muhitda bo'lsa ham E'TIBORGA OLINMAYDI — har chaqiruvda lokal bazaga
   qayta yoziladi.
   ───────────────────────────────────────────────────────────────────── */

import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUTANTS } from './mutants.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUPA = join(ROOT, 'supabase');
const STUB = join(SUPA, 'tests', '_stub.sql');
const FIXTURE = join(SUPA, 'tests', 'fixtures', 'verbal.sample.json');
const TESTS = ['0001_accounts.sql', '0002_verbal.sql', '0003_results.sql', '0004_league.sql',
               '0005_certificates.sql', '0006_sessions.sql'];
const JOBS = Math.max(1, Number(process.env.MUTANT_JOBS) || 4);

const argv = process.argv.slice(2);
const NO_MUTANTS = argv.includes('--no-mutants');
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;

const host = process.env.PGHOST || '';
if (!(host === '' || host.startsWith('/') || ['localhost', '127.0.0.1', '::1'].includes(host))) {
  console.error(`XATO: PGHOST=${host} lokal emas. Bu yurituvchi faqat lokal/CI bazasida ishlaydi.`);
  process.exit(2);
}
const BIN = process.env.PG_BIN ? p => join(process.env.PG_BIN, p) : p => p;

function run(cmd, args, extraEnv) {
  return new Promise(res => {
    const env = { ...process.env, ...(extraEnv || {}) };
    delete env.SUPABASE_DB_URL;
    if (extraEnv && extraEnv.SUPABASE_DB_URL) env.SUPABASE_DB_URL = extraEnv.SUPABASE_DB_URL;
    const p = spawn(cmd, args, { env, cwd: ROOT });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('error', e => res({ code: 127, out: out + String(e) }));
    p.on('close', code => res({ code, out }));
  });
}

const psql = (db, args) => run(BIN('psql'), ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', db, ...args]);
const sql1 = async (db, q) => {
  const r = await psql(db, ['-tAc', q]);
  if (r.code !== 0) throw new Error(`so'rov yiqildi (${db}): ${q}\n${r.out}`);
  return r.out.trim();
};
const applySh = (dir, db) => run('bash', [join(dir, 'apply.sh')], { SUPABASE_DB_URL: `dbname=${db}` });

async function freshDb(db) {
  await run(BIN('dropdb'), ['--if-exists', db]);
  const c = await run(BIN('createdb'), [db]);
  if (c.code !== 0) throw new Error(`createdb ${db}: ${c.out}`);
  const s = await psql(db, ['-f', STUB]);
  if (s.code !== 0) throw new Error(`_stub.sql: ${s.out}`);
}
const dropDb = db => run(BIN('dropdb'), ['--if-exists', db]);

const snapshot = db => sql1(db, `
  select (select count(*) from public.audit_log) || ' ' ||
         (select count(*) from public.schema_migrations) || ' ' ||
         (select md5(coalesce(string_agg(to_jsonb(v)::text, '|' order by key), '')) from public.verbal_items v);`);

let failures = 0;
function ok(msg) { console.log('  ✔ ' + msg); }
function fail(msg, out) {
  failures++;
  console.error('  ✘ ' + msg);
  if (out) console.error(out.split('\n').slice(-25).map(l => '      ' + l).join('\n'));
}
const tail = (out, want) => {
  const lines = out.split('\n').filter(l => /FAIL|ERROR|XATO/.test(l));
  const hit = lines.find(l => want && l.includes(want));
  return (hit || lines[0] || '').replace(/^psql:[^ ]*: /, '');
};

/* Test fayllari bir-biridan mustaqil (har biri ROLLBACK bilan tugaydi),
   shuning uchun birinchisi yiqilsa ham qolganlari yurgiziladi: mutant
   bir nechta joyda ushlanishi mumkin va kutilgan xabar qaysi faylda
   bo'lsa ham topiladi. */
async function runTests(db) {
  const failed = [];
  let out = '';
  for (const t of TESTS) {
    const r = await psql(db, ['-f', join(SUPA, 'tests', t)]);
    out += r.out;
    if (r.code !== 0 || !r.out.includes('✅')) failed.push(t);
  }
  return { failed: failed.length > 0, test: failed.join(', '), out };
}

async function main() {
  const v = await run(BIN('psql'), ['--version']);
  if (v.code !== 0) { console.error('XATO: psql topilmadi (PG_BIN ni ko\'rsating)'); process.exit(2); }

  const tmp = mkdtempSync(join(tmpdir(), 'zukko-db-'));
  const tag = `zk_t${process.pid}`;
  const dbs = [];
  try {
    // Namunaviy seed — generatorning o'zi orqali (SQL ekranlash ham sinaladi).
    const fixtureSql = join(tmp, 'fixture_seed.sql');
    const g = await run(process.execPath, [join(SUPA, 'mkseed.mjs'), '--in', FIXTURE, '--out', fixtureSql]);
    if (g.code !== 0) throw new Error('mkseed (namuna) yiqildi:\n' + g.out);
    const fixtureKeys = JSON.parse(readFileSync(FIXTURE, 'utf8')).items.length;

    // ── 1. To'liq zanjir ────────────────────────────────────────────────
    console.log('── 1. Toza baza → stub → apply.sh → seed → testlar');
    const db = `${tag}_main`;
    dbs.push(db);
    await freshDb(db);
    let r = await applySh(SUPA, db);
    if (r.code !== 0) fail('apply.sh toza bazada yiqildi', r.out);
    else ok('apply.sh: migratsiyalar va seed qo\'llandi, RLS va security_invoker tekshiruvi o\'tdi');

    const s1 = await snapshot(db);
    r = await applySh(SUPA, db);
    const s2 = await snapshot(db);
    if (r.code !== 0 || !r.out.includes("allaqachon qo'llangan") || s1 !== s2) {
      fail(`apply.sh qayta ishga tushganda baza o'zgardi yoki yiqildi (${s1} → ${s2})`, r.out);
    } else ok('apply.sh ikkinchi marta: hech narsa o\'zgarmadi (jurnal ham)');

    for (let i = 0; i < 2; i++) {
      const f = await psql(db, ['-1', '-f', fixtureSql]);
      if (f.code !== 0) fail('namunaviy seed qo\'llanmadi', f.out);
    }
    const s3 = await snapshot(db);
    const again = await psql(db, ['-1', '-f', fixtureSql]);
    const s4 = await snapshot(db);
    const drafts = await sql1(db, "select count(*) from public.verbal_items where key like 'v999%' and state = 'draft' and reviewed_by is null");
    if (again.code !== 0 || s3 !== s4) fail(`seed qayta qo'llanganda baza/jurnal o'zgardi (${s3} → ${s4})`, again.out);
    else if (Number(drafts) !== fixtureKeys) fail(`seed: ${drafts} ta qoralama, ${fixtureKeys} kutilgan (reviewed:true ham qoralama bo'lishi shart)`);
    else ok(`seed idempotent: ${fixtureKeys} ta savol, hammasi 'draft', qayta qo'llash jurnalga yozmaydi`);

    const t = await runTests(db);
    if (t.failed) fail(`${t.test} yiqildi`, t.out);
    else ok(`SQL testlari: ${TESTS.length} fayl — hammasi o'tdi`);

    // Edge Function mantig'i + haqiqiy baza (argument nomlari, turlar, xato kodlari).
    const it = await run(process.execPath, [join(SUPA, 'tests', 'functions.integration.mjs'), db]);
    if (it.code !== 0 || !it.out.includes('✅')) fail('Edge Function integratsiyasi yiqildi', it.out);
    else ok('Edge Function (handler.mjs) + haqiqiy baza: sertifikatli test, submit-test, liga');

    // ── 2. apply.sh begona bazaga yozmaydi; migratsiya — bitta tranzaksiya ──
    console.log('── 2. apply.sh himoyasi: begona baza, yarim migratsiya');
    const dbN = `${tag}_nazariy`;
    dbs.push(dbN);
    await freshDb(dbN);
    await sql1(dbN, 'create table public.topics (id int); create table public.questions (id int);');
    r = await applySh(SUPA, dbN);
    const touchedN = await sql1(dbN, "select coalesce(to_regclass('public.verbal_items')::text, '') || coalesce(to_regclass('public.schema_migrations')::text, '')");
    if (r.code !== 2 || !r.out.includes('boshqa loyihaning') || touchedN !== '') {
      fail('apply.sh Nazariy\'ga o\'xshagan bazada to\'xtamadi yoki unga yozdi', r.out);
    } else ok('Nazariy jadvallari bor bazada — hech narsa yozmasdan to\'xtadi');

    const dbF = `${tag}_foreign`;
    dbs.push(dbF);
    await freshDb(dbF);
    await sql1(dbF, "create table public.schema_migrations (filename text primary key, applied_at timestamptz default now()); insert into public.schema_migrations values ('0004_bank.sql');");
    r = await applySh(SUPA, dbF);
    const touchedF = await sql1(dbF, "select coalesce(to_regclass('public.verbal_items')::text, '')");
    if (r.code !== 2 || !r.out.includes("bu repoda yo'q migratsiya") || touchedF !== '') {
      fail('apply.sh begona migratsiya qayd etilgan bazada to\'xtamadi', r.out);
    } else ok('begona migratsiya qayd etilgan bazada — hech narsa yozmasdan to\'xtadi');

    /* Yiqilgan migratsiya izsiz qaytadi: qisman yaratilgan jadval ham,
       schema_migrations yozuvi ham qolmaydi. */
    const brokenDir = join(tmp, 'broken');
    mkdirSync(brokenDir, { recursive: true });
    cpSync(join(SUPA, 'apply.sh'), join(brokenDir, 'apply.sh'));
    cpSync(join(SUPA, 'migrations'), join(brokenDir, 'migrations'), { recursive: true });
    mkdirSync(join(brokenDir, 'seed'), { recursive: true });
    writeFileSync(join(brokenDir, 'migrations', '0999_buzuq.sql'),
      'create table public.zz_yarim (id int);\nalter table public.zz_yarim enable row level security;\nselect 1 / 0;\n');
    const dbB = `${tag}_broken`;
    dbs.push(dbB);
    await freshDb(dbB);
    r = await applySh(brokenDir, dbB);
    const leftover = await sql1(dbB, "select coalesce(to_regclass('public.zz_yarim')::text, '') || '|' || (select count(*) from public.schema_migrations where filename = '0999_buzuq.sql')");
    if (r.code === 0 || leftover !== '|0') fail(`yiqilgan migratsiya iz qoldirdi (${leftover})`, r.out);
    else ok('yiqilgan migratsiya butunlay qaytadi (jadval ham, qayd ham yo\'q)');

    // ── 3. Mutantlar ────────────────────────────────────────────────────
    if (!NO_MUTANTS) {
      const list = ONLY ? MUTANTS.filter(m => m.id === ONLY) : MUTANTS;
      if (ONLY && !list.length) throw new Error(`mutant topilmadi: ${ONLY}`);
      console.log(`── 3. Salbiy tekshiruv: ${list.length} ta mutant (himoya olib tashlanadi → test yiqilishi SHART)`);
      let killed = 0;
      let next = 0;
      const worker = async () => {
        while (next < list.length) {
          const idx = next++;
          const m = list[idx];
          const dir = join(tmp, 'm-' + m.id);
          mkdirSync(dir, { recursive: true });
          cpSync(join(SUPA, 'apply.sh'), join(dir, 'apply.sh'));
          cpSync(join(SUPA, 'migrations'), join(dir, 'migrations'), { recursive: true });
          cpSync(join(SUPA, 'seed'), join(dir, 'seed'), { recursive: true });
          const target = join(dir, 'migrations', m.file);
          let src = readFileSync(target, 'utf8');
          let stale = null;
          for (const [from, to] of m.subs) {
            const n = src.split(from).length - 1;
            if (n !== 1) { stale = `almashtiriladigan matn ${n} marta topildi (1 kutilgan)`; break; }
            src = src.replace(from, () => to);
          }
          if (stale) { fail(`${m.id}: mutant eskirgan — ${stale}. mutants.mjs ni migratsiyaga moslang`); continue; }
          writeFileSync(target, src);

          const mdb = `${tag}_m${idx}`;
          await freshDb(mdb);
          const a = await applySh(dir, mdb);
          /* Ba'zi himoyani apply.sh ning o'zi ham ushlaydi (masalan RLS
             o'chirilgan jadval). Bu — alohida qatlam: apply.sh yiqilishi
             SHART, lekin migratsiyalar allaqachon qo'llangan, shuning
             uchun testlar ham baribir yurgiziladi — ular ham ushlashi kerak
             (apply.sh ni chetlab, SQL Editor'da qo'lda qo'llangan holat). */
          if (m.applyCatches) {
            if (a.code === 0 || !a.out.includes(m.applyCatches)) {
              fail(`${m.id}: apply.sh bu himoyasizlikni ushlamadi (kutilgan: "${m.applyCatches}")`, a.out);
              await dropDb(mdb);
              continue;
            }
          } else if (a.code !== 0) {
            fail(`${m.id}: mutant migratsiyaning o'zini buzdi (himoyani emas) — mutantni tuzating`, a.out);
            await dropDb(mdb);
            continue;
          }
          await psql(mdb, ['-1', '-f', fixtureSql]);
          const res = await runTests(mdb);
          await dropDb(mdb);
          if (!res.failed) {
            fail(`${m.id}: TIRIK QOLDI — ${m.why}, lekin hamma test o'tdi. Bu himoyani hech bir test tekshirmayapti!`);
          } else if (!res.out.includes(m.expect)) {
            fail(`${m.id}: ${res.test} yiqildi, lekin boshqa sabab bilan (kutilgan: "${m.expect}")`, res.out);
          } else {
            killed++;
            ok(`${m.id} → ${m.applyCatches ? 'apply.sh + ' : ''}${res.test}: ${tail(res.out, m.expect) || m.expect}`);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(JOBS, list.length) }, worker));
      console.log(`   ${killed}/${list.length} mutant o'ldirildi`);
    }
  } finally {
    for (const d of dbs) await dropDb(d);
    rmSync(tmp, { recursive: true, force: true });
  }

  if (failures) {
    console.error(`\n❌ ${failures} ta muammo`);
    process.exit(1);
  }
  console.log('\n✅ Baza zanjiri to\'liq o\'tdi');
}

main().catch(e => { console.error('XATO:', e.message); process.exit(1); });
