/* ─────────────────────────────────────────────────────────────────────────
   tests/api-surface.test.mjs — CONTRACT dagi har bir `window.nz*` metodi bor
   (ARXITEKTURA §14.2)

   NIMA TEKSHIRILADI:
     · src/iq/CONTRACT.md dagi `<!-- api -->` belgili kod bloklari
       o'qiladi (§12–§15). Har yozuv — `nzX: metod(…), .xossa, …`.
       Hujjat va test bir-biridan ajralib ketmasin deb ro'yxat QO'LDA
       emas, hujjatdan olinadi;
     · modullar build tartibida (ARXITEKTURA §10.5) bitta `node:vm`
       muhitida yuklanadi (window/localStorage/document taqlidi);
     · har `metod(` — funksiya, har `.xossa` — mavjud (null emas).

   PARALLEL ISH PAYTIDA (CONTRACT §7):
     · modul fayli hali yo'q → test o'tkazib yuboriladi (skip, sabab bilan);
     · mavjud eski fayl (notify, feedback, progress, i18n) v1.1 API sidan
       HECH BIRINI hali bermasa → "egasi hali o'tmagan" deb o'tkaziladi;
       bittasini bersa — hammasi talab qilinadi;
     · IQ_STRICT=1 (WP11) — hech narsa o'tkazilmaydi.
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const STRICT = process.env.IQ_STRICT === '1';
const exists = f => fs.existsSync(new URL(f, ROOT));
const read = f => fs.readFileSync(new URL(f, ROOT), 'utf8');

/* ── Hujjatni o'qish ─────────────────────────────────────────────────── */

/* Yozuv matnidan 0-chuqurlikdagi `nom(` (metod) va `.nom` (xossa) larni
   ajratadi. Qavs ichidagi argument va qaytish turi ({…}, […], <…>)
   hisobga olinmaydi. */
function members(text) {
  const methods = [], props = [];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ('({[<'.includes(c)) { depth++; continue; }
    if (')}]>'.includes(c)) { depth = Math.max(0, depth - 1); continue; }
    if (depth) continue;
    const m = /^(\.?)([A-Za-z_$][\w$]*)/.exec(text.slice(i));
    if (!m || (i > 0 && /[\w$]/.test(text[i - 1]))) continue;
    const after = text[i + m[0].length];
    if (m[1]) props.push(m[2]);
    else if (after === '(') methods.push(m[2]);
    i += m[0].length - 1;
  }
  return { methods, props };
}

export function parseApi(md) {
  const out = [];
  const re = /<!--\s*api\s*-->\s*```js\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    let cur = null;
    for (const raw of m[1].split('\n')) {
      const line = raw.replace(/\/\/.*$/, '');
      const head = /^([A-Za-z_$][\w$.]*)\s*:(.*)$/.exec(line);
      if (head) { cur = { name: head[1], text: head[2] }; out.push(cur); }
      else if (cur && /^\s/.test(line)) cur.text += ' ' + line;
    }
  }
  return out.map(e => Object.assign({ name: e.name }, members(e.text)));
}

const API = parseApi(read('src/iq/CONTRACT.md'));

/* Global → fayl. Hujjatga yangi global qo'shilsa, shu yerga ham
   qo'shilishi SHART (quyidagi test eslatadi). */
const FILE = {
  nzProfile: 'src/profile.js', IQ_AVATARS: 'src/avatars.js',
  nzWallet: 'src/wallet.js', nzBadges: 'src/badges.js', nzLeague: 'src/league.js',
  nzCatalog: 'src/catalog.js', nzSettings: 'src/settings.js',
  nzNotify: 'src/notify.js', nzFeedback: 'src/feedback.js', nzProgress: 'src/progress.js',
  nzI18n: 'src/i18n.js', window: 'src/i18n.js',
  IQ: 'src/iq/index.js', 'IQ.games': 'src/games/index.js',
};
/* v1.0 da bor fayllarning v1.1 qo'shimchalari (egasi hali o'tmagan
   bo'lsa — o'tkaziladi). */
const V11_ADDED = {
  nzNotify: ['available', 'buildPlan', 'apply'],
  nzFeedback: ['play', 'configure'],
  nzProgress: ['activeToday'],
  nzI18n: ['plural'],
  window: ['nzTN'],
};

/* ── Modullarni yuklash (build tartibi) ──────────────────────────────── */
const ORDER = ['src/i18n-ru.js', 'src/i18n-en.js', 'src/i18n.js', 'src/feedback.js', 'src/notify.js',
               '@site', 'src/settings.js', 'src/progress.js', 'src/catalog.js', 'src/icons.js',
               'src/art.js', 'src/avatars.js', 'src/profile.js', 'src/wallet.js', 'src/badges.js',
               'src/league.js', 'src/iq/rng.js', 'src/iq/index.js', 'src/games/index.js'];

function realm() {
  const store = new Map();
  const el = () => ({ setAttribute() {}, getAttribute() { return null; }, style: {},
                      appendChild() {}, addEventListener() {}, getContext() { return null; } });
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { language: 'uz', userAgent: 'node' },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
      clear: () => store.clear(),
    },
    document: { documentElement: el(), body: el(), createElement: el, addEventListener() {},
                visibilityState: 'visible', hidden: false },
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  const errors = {};
  for (const f of ORDER) {
    if (f === '@site') {
      vm.runInContext('window.nzSite = { telegramBot: "", siteUrl: "https://iquest.uz/", startView: "app",' +
                      ' version: "1.1.0", contactReady: false, playUrl: "", langs: ["uz","uz-cyrl","ru"] };', ctx);
      continue;
    }
    if (!exists(f)) continue;
    try { vm.runInContext(read(f), ctx, { filename: f, timeout: 10000 }); }
    catch (e) { errors[f] = e; }
  }
  return { ctx, errors };
}

const { ctx: W, errors: LOAD_ERR } = realm();
const lookup = name => name === 'window' ? W : name.split('.').reduce((o, k) => (o == null ? o : o[k]), W);

/* ── Testlar ─────────────────────────────────────────────────────────── */

test('CONTRACT: api bloklari o\'qildi va har global uchun fayl ma\'lum', () => {
  const names = API.map(e => e.name);
  for (const must of ['nzProfile', 'nzWallet', 'nzBadges', 'nzLeague', 'nzCatalog',
                      'nzSettings', 'nzNotify', 'nzFeedback', 'nzProgress', 'nzI18n', 'IQ', 'IQ.games']) {
    assert.ok(names.includes(must), `CONTRACT da "${must}:" api yozuvi yo'q (<!-- api --> bloklari)`);
  }
  for (const n of names) assert.ok(FILE[n], `"${n}" uchun fayl tests/api-surface.test.mjs FILE da yo'q`);
  const wallet = API.find(e => e.name === 'nzWallet');
  assert.deepEqual(wallet.methods.slice(0, 5), ['balance', 'state', 'owns', 'credit', 'spend']);
});

for (const entry of API) {
  const file = FILE[entry.name];
  const label = `${entry.name} (${file}): ${entry.methods.concat(entry.props.map(p => '.' + p)).join(', ') || 'mavjud'}`;
  test(label, t => {
    if (!file) return;   // yuqoridagi test yiqiladi
    if (!exists(file)) {
      if (STRICT) assert.fail(`${file} yo'q (IQ_STRICT=1)`);
      t.skip(`${file} hali yo'q — egasi yozmoqda (CONTRACT §7)`);
      return;
    }
    assert.ok(!LOAD_ERR[file], `${file} yuklanmadi: ${LOAD_ERR[file] && LOAD_ERR[file].message}`);
    const obj = lookup(entry.name);
    assert.ok(obj != null, `window.${entry.name} yo'q (${file})`);
    const added = V11_ADDED[entry.name];
    if (added && !STRICT && added.every(m => typeof obj[m] !== 'function')) {
      t.skip(`${file}: v1.1 API (${added.join(', ')}) hali yo'q — egasi o'tmagan`);
      return;
    }
    const missing = entry.methods.filter(m => typeof obj[m] !== 'function')
      .concat(entry.props.filter(p => obj[p] == null).map(p => '.' + p));
    assert.deepEqual(missing, [], `${entry.name}: CONTRACT dagi a'zolar yo'q`);
  });
}

test('parseApi: chuqurlik va xossalar to\'g\'ri ajratiladi', () => {
  const api = parseApi('<!-- api -->\n```js\n' +
    'nzX: a(b, { c: d(e) }) → [{ f }], g(), .h,   // izoh i()\n' +
    '     j(k) → Promise<{ l }>\n' +
    'Y.z: m()\n```\n');
  assert.deepEqual(api, [
    { name: 'nzX', methods: ['a', 'g', 'j'], props: ['h'] },
    { name: 'Y.z', methods: ['m'], props: [] },
  ]);
});
