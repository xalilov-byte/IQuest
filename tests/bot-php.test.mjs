/* ─────────────────────────────────────────────────────────────────────────
   tests/bot-php.test.mjs — PHP bot (bot/bot.php, lib.php, admin-api.php)
   va Telegram Mini App build'i (--target=tg). DEPLOY-AHOST.md.

     · ochish kodi JS (src/paywall.js) ↔ PHP: qatʼiy vektorlar + tasodifiy;
       IQ belgisi (iqTag) PHP'da toʻgʻri ochiladi;
     · bot oqimi: /start (admin'ga «Admin panel»), /myid, /start pay_ →
       rasm → HAR admin'ga ✅/❌, ✅ → toʻgʻri ochish havolasi, begona bosish rad;
     · admin-api: initData HMAC, ADMIN_IDS, list + decide + statistika;
     · tg build (--strict): SDK + CSP faqat unda, landing/admin yoʻq, paywall bor.
   PHP yoʻq muhitda PHP qismlari oʻtkaziladi — qatʼiy vektorlar JS'da baribir
   tekshiriladi (PHP ular bilan bir xil boʻlishi shart).
   ───────────────────────────────────────────────────────────────────── */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/paywall.js'), 'utf8'), ctx);
const P = ctx.nzPaywall;

const HAS_PHP = spawnSync('php', ['-v']).status === 0;
const phpOpts = { skip: HAS_PHP ? false : 'php yoʻq — qatʼiy vektorlar JS testida' };
const tmp = [];
after(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

/* Qatʼiy vektorlar: PHP va Worker aynan shularni berishi shart. */
const VECTORS = [
  ['IQ-4F7K', 'change-me'], ['IQ-0000', 'x'], ['IQ-ZZZZ', 'uzun-sir-ʻ-ʼ'], ['IQ-4F7K', '😀emoji'],
];
const FIXED = ['H3H0RT', 'WPRXX9', '8KX4T0', '4FVWCK'];

test('ochish kodi: qatʼiy vektorlar (JS va Worker) — oʻzgarsa, bot bilan mos kelmay qoladi', async () => {
  assert.deepEqual(VECTORS.map(([c, s]) => P.unlockCode(c, s)), FIXED);
  const W = await import('../bot/worker.js');
  assert.deepEqual(VECTORS.map(([c, s]) => W.unlockCode(c, s)), FIXED);
});

function php(env, steps) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iquest-bot-'));
  tmp.push(dir);
  const r = spawnSync('php', [path.join(ROOT, 'tests/fixtures/bot-php-harness.php')], {
    input: JSON.stringify({ env: Object.assign({ DATA_DIR: dir }, env), steps }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  return JSON.parse(r.stdout);
}

const SECRET = 's3cr3t-Ab';
const ENV = { BOT_TOKEN: '123:TEST', ADMIN_IDS: '42, 43', UNLOCK_SECRET: SECRET,
              WEBAPP_URL: 'https://iquest.uz/app/', PRICE: 10000 };
const user = { id: 777, is_bot: false, first_name: 'Ali', username: 'ali_k' };
const pm = (from, extra) => ({ message: Object.assign({ chat: { id: from.id, type: 'private' }, from }, extra) });

test('PHP ↔ JS: ochish kodi va IQ belgisi bir xil', phpOpts, () => {
  const rnd = [];
  for (let i = 0; i < 40; i++) rnd.push([P.testCode(i * 7919 + 1), 'k' + i + (i % 3 ? 'ʼ' : '')]);
  const all = VECTORS.concat(rnd);
  const out = php(ENV, all.map(([code, secret]) => ({ fn: 'unlock', code, secret }))
    .concat([{ fn: 'tag', code: 'IQ-4F7K', tag: P.iqTag('IQ-4F7K', 117, SECRET), secret: SECRET },
             { fn: 'tag', code: 'IQ-4F7K', tag: P.iqTag('IQ-4F7K', 117, SECRET), secret: 'boshqa' }]));
  assert.deepEqual(out.slice(0, VECTORS.length), FIXED);
  assert.deepEqual(out.slice(0, all.length), all.map(([c, s]) => P.unlockCode(c, s)));
  assert.equal(out[all.length], 117);
  assert.notEqual(out[all.length + 1], 117);
});

test('PHP bot: /start, /myid, admin tugmasi faqat ADMIN_IDS ga', phpOpts, () => {
  const [u, a, id] = php(ENV, [
    { fn: 'update', update: pm(user, { text: '/start' }) },
    { fn: 'update', update: pm({ id: 42, first_name: 'Boss' }, { text: '/admin' }) },
    { fn: 'update', update: pm(user, { text: '/myid' }) },
  ]);
  const kb = c => c.body.reply_markup.inline_keyboard.map(r => r[0]);
  assert.deepEqual(kb(u[0]).map(b => b.web_app.url), ['https://iquest.uz/app/']);
  assert.equal(kb(u[0])[0].text, 'IQuestni ochish');
  assert.deepEqual(kb(a[0]).map(b => b.web_app.url), ['https://iquest.uz/app/', 'https://iquest.uz/app/admin.html']);
  assert.equal(id[0].body.text, 'Sizning Telegram ID raqamingiz: 777');
});

test('PHP bot: chek → har admin ✅/❌, ✅ → ochish havolasi, takror/begona rad', phpOpts, () => {
  const tag = P.iqTag('IQ-4F7K', 112, SECRET);
  const [ask, photo, forged, ok, again, orders] = php(ENV, [
    { fn: 'update', update: pm(user, { text: '/start pay_IQ-4F7K_' + tag }) },
    { fn: 'update', update: pm(user, { photo: [{ file_id: 'small' }, { file_id: 'big' }],
        reply_to_message: { from: { id: 1, is_bot: true }, text: 'Toʻlov chekini rasm qilib yuboring. Test kodi: IQ-4F7K' } }) },
    { fn: 'update', update: { callback_query: { id: 'x', from: { id: 777 }, data: 'ok:IQ-4F7K:777', message: { message_id: 1, chat: { id: 777 } } } } },
    { fn: 'update', update: { callback_query: { id: 'y', from: { id: 43, username: 'boss' }, data: 'ok:IQ-4F7K:777', message: { message_id: 102, chat: { id: 43 } } } } },
    { fn: 'update', update: { callback_query: { id: 'z', from: { id: 42 }, data: 'no:IQ-4F7K:777', message: { message_id: 101, chat: { id: 42 } } } } },
    { fn: 'orders' },
  ]);
  assert.equal(ask[0].body.text, 'Toʻlov chekini rasm qilib yuboring. Test kodi: IQ-4F7K');
  assert.equal(ask[0].body.reply_markup.force_reply, true);
  const sent = photo.filter(c => c.method === 'sendPhoto');
  assert.deepEqual(sent.map(c => c.body.chat_id), [42, 43]);
  assert.equal(sent[0].body.photo, 'big');
  assert.equal(sent[0].body.caption, 'Test kodi: IQ-4F7K · Foydalanuvchi: @ali_k (777) · IQ 112');
  assert.deepEqual(sent[0].body.reply_markup.inline_keyboard[0].map(b => b.callback_data), ['ok:IQ-4F7K:777', 'no:IQ-4F7K:777']);
  assert.equal(photo.at(-1).body.text, 'Chek qabul qilindi. Tekshirilgach xabar beramiz.');
  assert.deepEqual(forged.map(c => c.method), ['answerCallbackQuery']);
  const send = ok.find(c => c.method === 'sendMessage');
  assert.equal(send.body.chat_id, 777);
  assert.equal(send.body.reply_markup.inline_keyboard[0][0].web_app.url,
    'https://iquest.uz/app/?unlock=IQ-4F7K-' + P.unlockCode('IQ-4F7K', SECRET));
  assert.equal(ok.filter(c => c.method === 'editMessageCaption').length, 2, 'ikkala admin nusxasi yangilanadi');
  assert.deepEqual(again.map(c => c.method), ['answerCallbackQuery']);
  assert.equal(again[0].body.text, 'Allaqachon tasdiqlangan');
  assert.equal(orders['IQ-4F7K'].status, 'ok');
  assert.equal(orders['IQ-4F7K'].amount, 10000);
});

function initData(uid, token, age = 0) {
  const f = { auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'AAH', user: JSON.stringify({ id: uid, first_name: 'Boss' }) };
  const dcs = Object.keys(f).sort().map(k => k + '=' + f[k]).join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  f.hash = crypto.createHmac('sha256', key).update(dcs).digest('hex');
  return new URLSearchParams(f).toString();
}

test('PHP admin-api: initData HMAC + ADMIN_IDS, roʻyxat, qaror, statistika', phpOpts, () => {
  const [, , bad, stranger, old, list, dec, list2] = php(ENV, [
    { fn: 'update', update: pm(user, { text: '/start pay_IQ-4F7K' }) },
    { fn: 'update', update: pm(user, { photo: [{ file_id: 'f1' }], caption: 'IQ-4F7K' }) },
    { fn: 'api', body: { initData: initData(42, 'wrong-token'), action: 'list' } },
    { fn: 'api', body: { initData: initData(777, ENV.BOT_TOKEN), action: 'list' } },
    { fn: 'api', body: { initData: initData(42, ENV.BOT_TOKEN, 90000), action: 'list' } },
    { fn: 'api', body: { initData: initData(42, ENV.BOT_TOKEN), action: 'list' } },
    { fn: 'api', body: { initData: initData(42, ENV.BOT_TOKEN), action: 'decide', code: 'IQ-4F7K', act: 'ok' } },
    { fn: 'api', body: { initData: initData(42, ENV.BOT_TOKEN), action: 'decide', code: 'IQ-4F7K', act: 'no' } },
  ]);
  assert.equal(bad.status, 401);
  assert.equal(stranger.status, 403);
  assert.equal(old.status, 401);
  assert.equal(list.status, 200);
  assert.equal(list.body.orders.length, 1);
  assert.equal(list.body.orders[0].status, 'pending');
  assert.match(list.body.orders[0].img, /^\.\.\/bot\/file\.php\?id=f1&exp=\d+&sig=[0-9a-f]{32}$/);
  assert.equal(list.body.stats.pending, 1);
  assert.equal(dec.status, 200);
  assert.deepEqual(dec.body.stats, { todayCount: 1, todaySum: 10000, totalCount: 1, totalSum: 10000, pending: 0 });
  assert.ok(dec.calls.some(c => c.method === 'sendMessage' && c.body.chat_id === 777));
  assert.equal(list2.status, 409, 'qaror ikki marta berilmaydi');
});

/* ── tg build ───────────────────────────────────────────────────────── */
const HAS_FONTS = fs.existsSync(path.join(ROOT, 'node_modules', '@fontsource', 'manrope'));
test('tg build (--strict): Mini App, SDK va CSP faqat unda, landing yoʻq, paywall bor', { skip: HAS_FONTS ? false : 'npm ci kerak' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iquest-tg-'));
  tmp.push(dir);
  for (const f of ['build.mjs', 'version.json', 'site.config.json', 'package.json', 'src', 'content', 'tools', 'supabase/config.json']) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  const run = t => spawnSync(process.execPath, ['build.mjs', '--strict', '--target=' + t], { cwd: dir, encoding: 'utf8',
    env: Object.assign({}, process.env, { IQ_STRICT: '', IQ_DEMO: '' }) });
  const r = run('tg');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const html = fs.readFileSync(path.join(dir, 'dist/tg/index.html'), 'utf8');
  assert.match(html, /<script src="https:\/\/telegram\.org\/js\/telegram-web-app\.js"><\/script>/);
  assert.match(html, /script-src 'unsafe-inline' https:\/\/telegram\.org;/);
  assert.ok(html.indexOf('/* ── src/telegram.js ── */') > html.indexOf('/* ── src/bootstrap.js ── */'));
  assert.ok(html.indexOf('/* ── src/paywall.js ── */') !== -1);
  assert.ok(html.indexOf('{{ heroTryLabel }}') === -1 && html.indexOf('{{ isLanding }}') === -1, 'landing markup kesilgan');
  const site = JSON.parse(/window\.nzSite = (\{.*?\});\n/.exec(html)[1]);
  assert.equal(site.startView, 'app');
  assert.equal(site.paywall.enabled, true);
  assert.ok(fs.existsSync(path.join(dir, 'dist/tg/admin.html')));
  const m = run('mobile');
  assert.equal(m.status, 0, m.stdout + m.stderr);
  const mob = fs.readFileSync(path.join(dir, 'www/index.html'), 'utf8');
  assert.ok(mob.indexOf('telegram.org') === -1, 'mobil: SDK yoʻq');
  assert.ok(mob.indexOf('/* ── src/telegram.js ── */') === -1 && mob.indexOf('/* ── src/paywall.js ── */') === -1);
});
