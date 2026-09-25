/* ─────────────────────────────────────────────────────────────────────────
   tests/build.test.mjs — build.mjs nazoratlari (ARXITEKTURA §14.4)

   NIMA TEKSHIRILADI:
     · mobil build v1.1 modullarini ARXITEKTURA §10.5 tartibida qo'yadi;
       yo'q modul oddiy build'da o'tkaziladi, --strict da xato;
     · nzSite: version (version.json), contactReady, playUrl, langs;
     · NEED markerlari (valsSettings, valsShop, valsBadges,
       valsProfileEdit, valsOnboard) --strict da majburiy;
     · MONEY_NAMES va FORBIDDEN_CODE hamon ushlanadi;
     · SOCIAL himoyasi: ijtimoiy nom yoki yozuv → build yiqiladi, izohdagi
       reja esa zararsiz;
     · EN darvozasi: 4 shart bajarilgan namunada 'en' bor; bitta `langs`
       e'lonini (yoki boshqa shartni) buzish darvozani yopadi; --lang-en
       majburan ochadi.

   BUILD HECH QACHON REPO ICHIDA YURITILMAYDI (www/ umumiy): har holat
   uchun os.tmpdir() da nusxa (src, content, tools, …) va node_modules
   ga symlink. EN darvozasi haqiqiy kontentga bog'lanmasligi uchun
   alohida kichik namunada (fixture) sinaladi.
   ───────────────────────────────────────────────────────────────────── */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const COPY = ['build.mjs', 'version.json', 'site.config.json', 'package.json',
              'src', 'content', 'tools', path.join('supabase', 'config.json')];
const HAS_FONTS = fs.existsSync(path.join(ROOT, 'node_modules', '@fontsource', 'manrope'));
const made = [];
after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iquest-build-'));
  made.push(dir);
  for (const f of COPY) {
    const from = path.join(ROOT, f);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.cpSync(from, path.join(dir, f), { recursive: true });
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

function build(dir, args = [], env = {}) {
  const r = spawnSync(process.execPath, ['build.mjs'].concat(args), {
    cwd: dir, encoding: 'utf8', env: Object.assign({}, process.env, { IQ_STRICT: '', IQ_DEMO: '' }, env),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const target = (args.find(a => a.startsWith('--target=')) || '--target=mobile').slice(9);
  const file = path.join(dir, { mobile: 'www', web: 'dist/web', admin: 'dist/admin' }[target], 'index.html');
  const html = r.status === 0 && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return { status: r.status, out, html };
}

const edit = (dir, f, fn) => {
  const p = path.join(dir, f);
  fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8')));
};
const put = (dir, f, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.writeFileSync(path.join(dir, f), text);
};
const nzSite = html => {
  const m = /window\.nzSite = (\{.*?\});\n/.exec(html);
  assert.ok(m, 'nzSite snippet topilmadi');
  return JSON.parse(m[1]);
};
/* Main mantiqiga klass metodi qo'shadi (renderVals() dan oldin). */
const addMethod = (dir, code) => edit(dir, 'src/Main.dc.html', s => {
  assert.equal(s.split('\n  renderVals()').length, 2, 'Main da "  renderVals()" langari bitta emas');
  return s.replace('\n  renderVals()', '\n  ' + code + '\n  renderVals()');
});

const V11 = ['i18n-en', 'settings', 'catalog', 'icons', 'art', 'avatars', 'profile', 'wallet', 'badges', 'league'];
const ORDER = ['src/i18n-ru.js', 'src/i18n-en.js', 'src/i18n.js', 'src/runtime.js', 'src/feedback.js',
               'src/notify.js', 'nzSite', 'src/settings.js', 'src/progress.js', 'src/catalog.js',
               'src/icons.js', 'src/art.js', 'src/avatars.js', 'src/profile.js', 'src/wallet.js',
               'src/badges.js', 'src/league.js', 'IQ bundle', 'Main (logic)', 'src/data.js', 'src/bootstrap.js'];

const opts = { skip: HAS_FONTS ? false : 'node_modules/@fontsource yo\'q (npm ci kerak)' };

test('mobil build: skriptlar ARXITEKTURA §10.5 tartibida, har biri alohida', opts, () => {
  const dir = sandbox();
  // Hali yo'q modul uchun kichik o'rinbosar — tartib to'liq tekshirilsin.
  for (const m of V11) {
    if (!fs.existsSync(path.join(dir, 'src', m + '.js'))) put(dir, `src/${m}.js`, `/* o'rinbosar: ${m} */\n`);
  }
  const r = build(dir);
  assert.equal(r.status, 0, r.out);
  let last = -1;
  for (const name of ORDER) {
    const i = r.html.indexOf(`<script>\n/* ── ${name} ── */\n`);
    assert.ok(i !== -1, `"${name}" skripti yo'q`);
    assert.ok(i > last, `"${name}" tartibdan tashqarida`);
    last = i;
  }
});

test('yo\'q v1.1 moduli o\'tkaziladi, --strict da xato', opts, () => {
  const dir = sandbox();
  fs.rmSync(path.join(dir, 'src', 'league.js'), { force: true });
  const r = build(dir);
  assert.equal(r.status, 0, r.out);
  assert.ok(r.html.indexOf('/* ── src/league.js ── */') === -1);
  assert.match(r.out, /league\.js/);
  const s = build(dir, ['--strict']);
  assert.notEqual(s.status, 0);
  assert.match(s.out, /--strict: v1\.1 modullari yoʻq: src\/league\.js/);
});

test('nzSite: version, contactReady, playUrl, langs', opts, () => {
  const dir = sandbox();
  const ver = JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8'));
  assert.equal(ver.versionName, '1.1.0');
  assert.equal(ver.versionCode, 2);
  let r = build(dir);
  assert.equal(r.status, 0, r.out);
  let site = nzSite(r.html);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'site.config.json'), 'utf8'));
  assert.equal(site.version, '1.1.0');
  assert.equal(site.contactReady, !/PLACEHOLDER/.test(cfg.contactEmail));
  assert.equal(site.playUrl, cfg.playUrl || '');
  assert.deepEqual(site.langs.slice(0, 3), ['uz', 'uz-cyrl', 'ru']);
  assert.equal(site.startView, 'app');

  edit(dir, 'site.config.json', s => {
    const c = JSON.parse(s);
    c.contactEmail = 'salom@iquest.uz';
    c.playUrl = 'https://play.google.com/store/apps/details?id=uz.iquest.app';
    return JSON.stringify(c);
  });
  r = build(dir, ['--target=web']);
  assert.equal(r.status, 0, r.out);
  site = nzSite(r.html);
  assert.equal(site.contactReady, true);
  assert.equal(site.playUrl, 'https://play.google.com/store/apps/details?id=uz.iquest.app');
  assert.equal(site.startView, 'landing');
  assert.ok(r.html.indexOf('salom@iquest.uz') === -1, 'aloqa manzili bundle\'ga tushmasin');
});

test('NEED: v1.1 ekran markerlari --strict da majburiy', opts, () => {
  const dir = sandbox();
  edit(dir, 'src/Main.dc.html', s => s.split('valsOnboard').join('valsOnbrd'));
  const r = build(dir);
  assert.equal(r.status, 0, r.out);
  const s = build(dir, ['--strict']);
  assert.notEqual(s.status, 0);
  assert.match(s.out, /valsOnboard/);
});

test('MONEY_NAMES va FORBIDDEN_CODE hamon ushlanadi', opts, () => {
  let dir = sandbox();
  addMethod(dir, 'openPay() { return 1; }');
  let r = build(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.out, /"openPay"/);

  dir = sandbox();
  addMethod(dir, 'adminPeek() { return window.nzAdmin; }');
  r = build(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.out, /XAVFSIZLIK: "nzAdmin"/);
});

test('SOCIAL himoyasi: nom va yozuv yiqitadi, izoh — yo\'q', opts, () => {
  let dir = sandbox();
  addMethod(dir, 'valsFriends(s) { return {}; }');
  let r = build(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.out, /"valsFriends"/);

  for (const text of ['Doʻstlar', "Do'stni taklif qiling", 'Suhbatlar', 'Guruhlar', 'Tez kunda']) {
    dir = sandbox();
    addMethod(dir, `socialHint() { return nzT(${JSON.stringify(text)}); }`);
    r = build(dir);
    assert.notEqual(r.status, 0, `"${text}" o'tib ketdi`);
    assert.match(r.out, /ijtimoiy/);
  }

  dir = sandbox();
  edit(dir, 'src/Main.dc.html', s => {
    assert.match(s, /<sc-if value="\{\{ isApp \}\}"[^>]*>/);
    return s.replace(/(<sc-if value="\{\{ isApp \}\}"[^>]*>)/, '$1<span>Doʻstlar</span>');
  });
  r = build(dir);
  assert.notEqual(r.status, 0, 'markup\'dagi «Doʻstlar» o\'tib ketdi');

  dir = sandbox();
  addMethod(dir, '// v2 da Doʻstlar tabi va chat shu yerga keladi\n  planNote() { return 0; }');
  r = build(dir);
  assert.equal(r.status, 0, r.out);
});

/* ── EN darvozasi — kichik namunada ─────────────────────────────────── */

const FX_GEN = (langs = "['uz', 'ru', 'en']") => `(function (root) {
  const IQ = root.IQ;
  const box = k => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="' + (10 + k * 8) + '" fill="#1c1b29"/></svg>';
  IQ.register({ type: 'fx', label: { uz: 'Namuna', ru: 'Пример', en: 'Sample' }, langs: ${langs},
    generate(seed, level) {
      return { id: 'fx:' + level + ':' + seed, type: 'fx', level, b: IQ.levelToB(level),
        prompt: { uz: 'Eng kattasi?', ru: 'Самый большой?', en: 'Largest?' },
        stimulus: { kind: 'text', uz: 'Doiralar', ru: 'Круги', en: 'Circles' },
        options: [0, 1, 2, 3].map(k => ({ kind: 'svg', svg: box(k) })), correct: 3,
        explain: { uz: 'Katta.', ru: 'Большой.', en: 'Big.' } };
    } });
})(typeof window !== 'undefined' ? window : globalThis);
`;
const FX_GAME = (langs = "['uz', 'ru', 'en']") => `(function (root) {
  const t = { uz: 'Bosing', ru: 'Нажмите', en: 'Tap' };
  root.IQ.games.register({ id: 'fx', skill: 'attention', langs: ${langs},
    title: { uz: 'Namuna', ru: 'Пример', en: 'Sample' }, desc: t,
    create() { return { done: false, tick() { return false; }, tap() {}, press() {}, log: () => [],
      view: () => ({ phase: 'input', prompt: t, hud: [], display: null, grid: null, buttons: [], progress: 0 }),
      result: () => ({ score: 0, points: 0, correct: 0, total: 0, durationMs: 0, nextLevel: 1 }) }; } });
})(typeof window !== 'undefined' ? window : globalThis);
`;
const VERBAL = (en = true) => JSON.stringify({ version: 1, items: [{
  key: 'v001', kind: 'analogy', level: 1, correct: 0,
  uz: { prompt: 'Qaysi?', stimulus: 'A : B', options: ['a', 'b', 'c', 'd'] },
  ru: { prompt: 'Какое?', stimulus: 'А : Б', options: ['а', 'б', 'в', 'г'] },
  en: { prompt: 'Which?', stimulus: 'A : B', options: ['a', 'b', 'c', 'd'] },
  explain: en ? { uz: 'Sabab.', ru: 'Причина.', en: 'Because.' } : { uz: 'Sabab.', ru: 'Причина.' },
  reviewed: false, reviewed_en: false }] });
const COVERAGE = (missing = []) =>
  `export function coverage() { return { missing: { en: ${JSON.stringify(missing)} }, triplets: { missingEn: [] } }; }\n`;

function gateFixture() {
  const dir = sandbox();
  for (const f of fs.readdirSync(path.join(dir, 'src/iq/gen'))) fs.rmSync(path.join(dir, 'src/iq/gen', f));
  for (const f of fs.readdirSync(path.join(dir, 'src/games'))) {
    if (f !== 'index.js') fs.rmSync(path.join(dir, 'src/games', f));
  }
  put(dir, 'src/iq/gen/fx.js', FX_GEN());
  put(dir, 'src/games/fx.js', FX_GAME());
  put(dir, 'content/verbal.json', VERBAL());
  put(dir, 'src/i18n-en.js', 'window.nzEn = { "Salom": "Hello" };\n');
  put(dir, 'tools/i18n-extract.mjs', COVERAGE());
  put(dir, 'src/site/pages.mjs', 'export function legalReady(cfg, lang) { return lang === "en"; }\n');
  return dir;
}
const langsOf = r => nzSite(r.html).langs;

test('EN darvozasi: 4 shart bajarilsa ochiq', opts, () => {
  const r = build(gateFixture());
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(langsOf(r), ['uz', 'uz-cyrl', 'ru', 'en'], r.out);
  assert.doesNotMatch(r.out, /darvozasi yopiq/);
});

test('EN darvozasi: bitta shart buzilsa yopiq (build yiqilmaydi)', opts, () => {
  const CASES = [
    ['generator langs e\'lonsiz', d => put(d, 'src/iq/gen/fx.js', FX_GEN('undefined')), /generator "fx": langs/],
    ['generator en matnsiz', d => edit(d, 'src/iq/gen/fx.js', s => s.replace(", en: 'Big.'", '')), /generator "fx" 1-daraja/],
    ['o\'yin langs e\'lonsiz', d => put(d, 'src/games/fx.js', FX_GAME("['uz', 'ru']")), /oʻyin "fx": langs/],
    ['verbal explain.en yo\'q', d => put(d, 'content/verbal.json', VERBAL(false)), /verbal\.json: 1\/1/],
    ['nzEn da kalit yo\'q', d => put(d, 'tools/i18n-extract.mjs', COVERAGE(['Doʻkon'])), /nzEn da 1 ta kalit/],
    ['i18n-en.js yo\'q', d => fs.rmSync(path.join(d, 'src/i18n-en.js')), /i18n-en\.js yoʻq/],
    ['/en/ sahifalar tayyor emas', d => put(d, 'src/site/pages.mjs',
      'export function legalReady() { return false; }\n'), /legalReady/],
    ['/en/maxfiylik yo\'q (allPages zaxirasi)', d => put(d, 'src/site/pages.mjs',
      'export function allPages() { return [{ slug: "shartlar" }, { lang: "en", slug: "shartlar" }, { slug: "maxfiylik" }]; }\n'),
      /\/en\/maxfiylik\/ sahifasi yoʻq/],
  ];
  for (const [what, spoil, why] of CASES) {
    const dir = gateFixture();
    spoil(dir);
    const r = build(dir);
    assert.equal(r.status, 0, `${what}: build yiqilmasligi kerak\n${r.out}`);
    assert.deepEqual(langsOf(r), ['uz', 'uz-cyrl', 'ru'], `${what}: darvoza ochiq qoldi`);
    assert.match(r.out, /EN darvozasi yopiq/, what);
    assert.match(r.out, why, `${what}: sabab yozilmadi\n${r.out}`);
  }
});

test('EN darvozasi: allPages zaxirasi en yo\'llarini taniydi; --lang-en majburan ochadi', opts, () => {
  let dir = gateFixture();
  put(dir, 'src/site/pages.mjs', 'export function allPages() { return [{ lang: "en", slug: "shartlar" }, ' +
    '{ slug: "en/maxfiylik/" }]; }\n');
  let r = build(dir);
  assert.deepEqual(langsOf(r), ['uz', 'uz-cyrl', 'ru', 'en'], r.out);

  dir = gateFixture();
  put(dir, 'src/games/fx.js', FX_GAME("['uz', 'ru']"));
  r = build(dir, ['--lang-en']);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(langsOf(r), ['uz', 'uz-cyrl', 'ru', 'en']);
  assert.match(r.out, /MAJBURAN/);
});

test('uchala build (mobile, web, admin) haqiqiy daraxtda yig\'iladi', opts, () => {
  const dir = sandbox();
  for (const t of ['mobile', 'web', 'admin']) {
    const r = build(dir, ['--target=' + t]);
    assert.equal(r.status, 0, `${t}: ${r.out}`);
    assert.equal(nzSite(r.html).version, '1.1.0');
  }
});
