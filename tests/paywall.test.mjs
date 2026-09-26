/* ─────────────────────────────────────────────────────────────────────────
   tests/paywall.test.mjs — qoʻlda toʻlov paywall'i (PAYWALL.md)

     · test kodi / ochish kodi: format, determinizm, Crockford normalizatsiya;
     · bot/worker.js AYNAN shu algoritmni ishlatadi;
     · bot oqimi (fetch soxta): /start → soʻrov, rasm javobi → admin'ga
       tugmalar bilan, ✅ → toʻgʻri ochish havolasi, begona bosish rad.
   ───────────────────────────────────────────────────────────────────── */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/paywall.js', import.meta.url), 'utf8');

function env(store = new Map()) {
  const ctx = { console };
  ctx.window = ctx;
  ctx.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx.nzPaywall;
}

const P = env();
const CROCK = /^[0-9A-HJKMNP-TV-Z]+$/;

test('test kodi: IQ- + 4 Crockford belgi, urugʻdan deterministik', () => {
  const seen = new Set();
  for (let seed = 1; seed < 2000; seed += 7) {
    const c = P.testCode(seed);
    assert.match(c, /^IQ-[0-9A-HJKMNP-TV-Z]{4}$/);
    assert.equal(P.testCode(seed), c);
    seen.add(c);
  }
  assert.ok(seen.size > 280, 'kodlar turlicha boʻlsin');
});

test('ochish kodi: 6 belgi, sir va kodga bogʻliq, katta harf', () => {
  const u = P.unlockCode('IQ-4F7K', 'change-me');
  assert.equal(u.length, 6);
  assert.match(u, CROCK);
  assert.equal(P.unlockCode('IQ-4F7K', 'change-me'), u);
  assert.notEqual(P.unlockCode('IQ-4F7K', 'boshqa-sir'), u);
  assert.notEqual(P.unlockCode('IQ-4F7M', 'change-me'), u);
  // kod yozilishi: kichik harf, prefikssiz — bir xil
  assert.equal(P.unlockCode('iq-4f7k', 'change-me'), u);
  assert.equal(P.unlockCode('4F7K', 'change-me'), u);
});

test('check: kiritilgan kod normallashadi (boʻshliq, kichik harf, O→0, I/L→1)', () => {
  const code = 'IQ-4F7K', secret = 's3cr3t';
  const u = P.unlockCode(code, secret);
  assert.equal(P.check(code, secret, u), true);
  assert.equal(P.check(code, secret, ' ' + u.toLowerCase().slice(0, 3) + ' ' + u.toLowerCase().slice(3) + ' '), true);
  const confusable = u.replace(/0/g, 'O').replace(/1/g, 'I');
  assert.equal(P.check(code, secret, confusable), true);
  assert.equal(P.check(code, secret, ''), false);
  assert.equal(P.check(code, secret, 'ZZZZZZ' === u ? 'YYYYYY' : 'ZZZZZZ'), false);
  assert.equal(P.check(code, 'boshqa', u), false);
});

test('saqlash: kutilmoqda → ochildi, ism; qayta ochilganda saqlanadi', () => {
  const store = new Map();
  const A = env(store);
  const r = { at: 111, iq: 112, lo: 104, hi: 120, n: 30, correct: 20, reliable: true };
  A.add('IQ-4F7K', 111, r);
  assert.equal(A.get('IQ-4F7K').unlocked, false);
  assert.equal(A.byAt(111).code, 'IQ-4F7K');
  A.add('IQ-4F7K', 999, r);                       // takror — oʻzgarmaydi
  assert.equal(A.get('IQ-4F7K').at, 111);
  A.unlock('IQ-4F7K');
  A.setName('  Alisher Karimov  ');
  const B = env(store);                           // ilovani qayta ochish
  assert.equal(B.get('IQ-4F7K').unlocked, true);
  assert.equal(B.get('IQ-4F7K').r.iq, 112);
  assert.equal(B.name(), 'Alisher Karimov');
  assert.equal(B.get('IQ-0000'), null);
});

test('tools/unlock.mjs va bot bir xil algoritm', async () => {
  const W = await import('../bot/worker.js');
  for (const c of ['IQ-4F7K', 'IQ-0000', 'IQ-ZZZZ', P.testCode(42)]) {
    for (const s of ['change-me', 'x', 'uzun-sir-ʻ-ʼ']) assert.equal(W.unlockCode(c, s), P.unlockCode(c, s));
  }
});

/* ── Bot oqimi (soxta fetch) ─────────────────────────────────────────── */
const ENV = { BOT_TOKEN: 'T', ADMIN_CHAT_ID: '-100500', UNLOCK_SECRET: 'change-me', WEBAPP_URL: 'https://iquest.uz/app/' };

async function withFetch(fn) {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ method: String(url).split('/').pop(), body: JSON.parse(init.body) });
    return new Response('{"ok":true}');
  };
  try { await fn(calls); } finally { globalThis.fetch = orig; }
  return calls;
}
const user = { id: 777, is_bot: false, first_name: 'Ali', username: 'ali_k' };

test('bot: /start pay_<KOD> → force_reply soʻrovi, kod matnda', async () => {
  const W = await import('../bot/worker.js');
  const calls = await withFetch(() => W.handleUpdate({ message: { chat: { id: 777, type: 'private' }, from: user,
    text: '/start pay_IQ-4F7K' } }, ENV));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'sendMessage');
  assert.equal(calls[0].body.chat_id, 777);
  assert.equal(calls[0].body.text, 'Toʻlov chekini rasm qilib yuboring. Test kodi: IQ-4F7K');
  assert.equal(calls[0].body.reply_markup.force_reply, true);
});

test('bot: soʻrovga javob rasm → admin chatiga tugmalar bilan, foydalanuvchiga tasdiq', async () => {
  const W = await import('../bot/worker.js');
  const calls = await withFetch(() => W.handleUpdate({ message: {
    chat: { id: 777, type: 'private' }, from: user,
    photo: [{ file_id: 'small' }, { file_id: 'big' }],
    reply_to_message: { from: { id: 1, is_bot: true }, text: 'Toʻlov chekini rasm qilib yuboring. Test kodi: IQ-4F7K' },
  } }, ENV));
  assert.equal(calls.length, 2);
  const [fwd, ack] = calls;
  assert.equal(fwd.method, 'sendPhoto');
  assert.equal(fwd.body.chat_id, '-100500');
  assert.equal(fwd.body.photo, 'big');
  assert.equal(fwd.body.caption, 'Test kodi: IQ-4F7K · Foydalanuvchi: @ali_k (777)');
  const btn = fwd.body.reply_markup.inline_keyboard[0];
  assert.deepEqual(btn.map(b => b.callback_data), ['ok:IQ-4F7K:777', 'no:IQ-4F7K:777']);
  assert.equal(ack.method, 'sendMessage');
  assert.equal(ack.body.text, 'Chek qabul qilindi. Tekshirilgach xabar beramiz.');
});

test('bot: kodsiz rasm — yoʻriqnoma, adminga hech narsa ketmaydi', async () => {
  const W = await import('../bot/worker.js');
  const calls = await withFetch(() => W.handleUpdate({ message: { chat: { id: 777, type: 'private' }, from: user,
    photo: [{ file_id: 'x' }] } }, ENV));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.chat_id, 777);
});

test('bot: ✅ → foydalanuvchiga toʻgʻri ochish havolasi, admin xabari tahrirlanadi', async () => {
  const W = await import('../bot/worker.js');
  const cq = { id: 'cb1', from: { id: 42, username: 'boss' }, data: 'ok:IQ-4F7K:777',
    message: { message_id: 9, chat: { id: -100500 }, caption: 'Test kodi: IQ-4F7K · Foydalanuvchi: @ali_k (777)' } };
  const calls = await withFetch(() => W.handleUpdate({ callback_query: cq }, ENV));
  const send = calls.find(c => c.method === 'sendMessage');
  assert.equal(send.body.chat_id, 777);
  assert.equal(send.body.text, 'Toʻlov tasdiqlandi! Natijangiz va sertifikatingiz tayyor.');
  const url = send.body.reply_markup.inline_keyboard[0][0].web_app.url;
  assert.equal(url, 'https://iquest.uz/app/?unlock=IQ-4F7K-' + P.unlockCode('IQ-4F7K', 'change-me'));
  const edit = calls.find(c => c.method === 'editMessageCaption');
  assert.match(edit.body.caption, /✅ Tasdiqlandi \(@boss\)$/);
  assert.deepEqual(edit.body.reply_markup.inline_keyboard, []);
  assert.ok(calls.some(c => c.method === 'answerCallbackQuery'));
});

test('bot: ❌ → rad xabari, ochish havolasi YOʻQ', async () => {
  const W = await import('../bot/worker.js');
  const cq = { id: 'cb2', from: { id: 42 }, data: 'no:IQ-4F7K:777',
    message: { message_id: 9, chat: { id: -100500 }, caption: 'Test kodi: IQ-4F7K' } };
  const calls = await withFetch(() => W.handleUpdate({ callback_query: cq }, ENV));
  const send = calls.find(c => c.method === 'sendMessage');
  assert.equal(send.body.text, 'Chek tasdiqlanmadi. Savollar boʻlsa, adminga yozing.');
  assert.equal(send.body.reply_markup, undefined);
  assert.match(calls.find(c => c.method === 'editMessageCaption').body.caption, /❌ Rad etildi/);
});

test('bot: admin chatidan tashqaridagi bosish rad etiladi', async () => {
  const W = await import('../bot/worker.js');
  const forged = { id: 'cb3', from: { id: 777 }, data: 'ok:IQ-4F7K:777',
    message: { message_id: 1, chat: { id: 777 } } };
  let calls = await withFetch(() => W.handleUpdate({ callback_query: forged }, ENV));
  assert.deepEqual(calls.map(c => c.method), ['answerCallbackQuery']);
  assert.equal(calls[0].body.show_alert, true);
  // shaxsiy admin chati: faqat oʻsha odamning oʻzi
  const env2 = Object.assign({}, ENV, { ADMIN_CHAT_ID: '42' });
  const other = { id: 'cb4', from: { id: 43 }, data: 'ok:IQ-4F7K:777', message: { message_id: 1, chat: { id: 42 } } };
  calls = await withFetch(() => W.handleUpdate({ callback_query: other }, env2));
  assert.deepEqual(calls.map(c => c.method), ['answerCallbackQuery']);
});

test('worker.fetch: GET — matn, WEBHOOK_SECRET notoʻgʻri — 403', async () => {
  const W = await import('../bot/worker.js');
  const r1 = await W.default.fetch(new Request('https://x.dev/'), ENV);
  assert.equal(r1.status, 200);
  const r2 = await W.default.fetch(new Request('https://x.dev/', { method: 'POST', body: '{}',
    headers: { 'x-telegram-bot-api-secret-token': 'bad' } }), Object.assign({ WEBHOOK_SECRET: 'good' }, ENV));
  assert.equal(r2.status, 403);
});
