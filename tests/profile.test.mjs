/* ─────────────────────────────────────────────────────────────────────────
   src/profile.js — nom, bio, rang, avatar, vitrina va rasm quvuri
   (ARXITEKTURA §5, §10, §14).

   Modul `node:vm` da `window`/`localStorage` taqlidi bilan yuklanadi.
   Rasm quvuri haqiqiy canvas oʻrniga stub bilan: stub `toDataURL` ning
   uzunligini boshqaradi (64 000 belgi zinapoyasi), `transform`/
   `drawImage` chaqiruvlarini yozib oladi (kesish va EXIF burilishi).

   Ishga tushirish:  npm test
   ───────────────────────────────────────────────────────────────────── */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const SRC = fs.readFileSync(new URL('../src/profile.js', import.meta.url), 'utf8');
const AVATARS = fs.readFileSync(new URL('../src/avatars.js', import.meta.url), 'utf8');
const KEY = 'nz-profile';
const IMG = 'nz-avatar-img';
const plain = x => JSON.parse(JSON.stringify(x));

/* saved — { kalit: qiymat } (satr yoki obyekt). opts.window — qoʻshimcha
   global (nzWallet, nzCatalog). opts.avatars — IQ_AVATARS ni yuklash.
   opts.quota(k, v) — true qaytarsa setItem QuotaExceeded otadi.
   opts.broken — localStorage umuman ishlamaydi. */
function env(saved, opts) {
  opts = opts || {};
  const store = new Map();
  Object.keys(saved || {}).forEach(k => {
    const v = saved[k];
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });
  const io = { writes: [] };
  const ls = {
    getItem: k => { if (opts.broken) throw new Error('SecurityError'); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => {
      if (opts.broken) throw new Error('SecurityError');
      if (opts.quota && opts.quota(k, v)) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      io.writes.push(k); store.set(k, String(v));
    },
    removeItem: k => { if (opts.broken) throw new Error('SecurityError'); store.delete(k); },
  };
  const win = Object.assign({}, opts.window || {});
  const ctx = { window: win, localStorage: ls, console: { info() {}, warn() {}, error() {} } };
  vm.createContext(ctx);
  if (opts.avatars) vm.runInContext(AVATARS, ctx);
  vm.runInContext(SRC, ctx);
  return {
    P: ctx.window.nzProfile, io, win,
    disk: () => JSON.parse(store.get(KEY) || 'null'),
    raw: k => store.get(k),
    has: k => store.has(k),
  };
}

const PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
const PHOTO2 = 'data:image/jpeg;base64,' + 'B'.repeat(3000);

/* ════════════════════════════════════════════════════════════════════
   1. FOYDALANUVCHI NOMI — ≥ 60 holat
   ════════════════════════════════════════════════════════════════════ */
const NAMES = [
  // boʻsh — ixtiyoriy
  ['', null], ['   ', null],
  // toʻgʻri
  ['ali', null], ['botir', null], ['sherzod_07', null], ['dilnoza.k', null], ['a1b', null],
  ['abcdefghijklmnopqrst', null], ['nigora', null], ['nazira', null], ['jizzax_boy', null],
  ['fuqaro', null], ['player1', null], ['helper', null], ['robot', null], ['eshitdim', null],
  ['sikka_yiguvchi', null], ['analitik', null], ['m.a.x', null], ['x_y_z', null], ['assalom', null],
  ['Ali', null], ['ALI_VALI', null], ['ali vali', null], ['a b c', null], ['olma​', null],
  // uzunlik
  ['ab', 'len'], ['a', 'len'], ['abcdefghijklmnopqrstu', 'len'], ['a'.repeat(40), 'len'],
  // boshlanishi
  ['1ali', 'start'], ['_ali', 'start'], ['.ali', 'start'], ['9', 'start'],
  // belgilar: kirill, tutuq, defis, boshqalar
  ['али', 'chars'], ['alі', 'chars'], ['oʻgʻil', 'chars'], ["o'g'il", 'chars'], ['oʼgil', 'chars'],
  ['ali-vali', 'chars'], ['ali@mail', 'chars'], ['ali!', 'chars'], ['şahin', 'chars'], ['ali😀', 'chars'],
  ['Шерзод', 'chars'],
  // format
  ['ali..vali', 'format'], ['ali__vali', 'format'], ['ali._vali', 'format'], ['ali_.vali', 'format'],
  ['ali.', 'format'], ['ali_', 'format'],
  // band soʻzlar
  ['admin', 'reserved'], ['Administrator', 'reserved'], ['moderator', 'reserved'], ['moder', 'reserved'],
  ['support', 'reserved'], ['yordam', 'reserved'], ['help', 'reserved'], ['official', 'reserved'],
  ['rasmiy', 'reserved'], ['mensa', 'reserved'], ['system', 'reserved'], ['tizim', 'reserved'],
  ['root', 'reserved'], ['null', 'reserved'], ['undefined', 'reserved'], ['bot', 'reserved'],
  ['telegram', 'reserved'], ['google', 'reserved'], ['play', 'reserved'], ['iquest', 'reserved'],
  ['iquest_uz', 'reserved'], ['iquestfan', 'reserved'], ['my.iquest', 'reserved'], ['iqu3st', 'reserved'],
  ['admin7', 'reserved'], ['adm1n', 'reserved'], ['b0t', 'reserved'], ['admin_uz', 'reserved'],
  ['uz.support', 'reserved'], ['r00t', 'reserved'],
  // nomaqbul soʻzlar (leet va bukish bilan)
  ['fuck', 'bad'], ['fuuuck', 'bad'], ['phuck', 'bad'], ['fu_ck', 'bad'], ['f.u.c.k', 'bad'],
  ['sh1t', 'bad'], ['b1tch', 'bad'], ['bitch1', 'bad'], ['cyka', 'bad'], ['suka_blyat', 'bad'],
  ['xuy', 'bad'], ['khuy', 'bad'], ['huesos', 'bad'], ['p1zda', 'bad'], ['m0therfucker', 'bad'],
  ['qotaq', 'bad'], ['sikaman', 'bad'], ['jalab', 'bad'], ['dalbayob', 'bad'], ['qanjiq', 'bad'],
  ['xezalak', 'bad'], ['p0rn', 'bad'], ['s3x', 'bad'], ['h1tler', 'bad'], ['pidor', 'bad'],
  ['mudak', 'bad'], ['gandon', 'bad'], ['nigger', 'bad'], ['fohisha', 'bad'], ['ali_fuck', 'bad'],
];

test(`nom: ${NAMES.length} ta holat (§5.1 tartibi: chars → start → len → format → reserved → bad)`, () => {
  assert.ok(NAMES.length >= 60);
  const { P } = env();
  const wrong = NAMES.filter(([s, want]) => P.validateUsername(s) !== want)
    .map(([s, want]) => `${JSON.stringify(s)}: kutilgan ${want}, olindi ${P.validateUsername(s)}`);
  assert.deepEqual(wrong, []);
});

test('nom: har toʻgʻri nom asosiy regexga mos, har xato nom mos emas', () => {
  const { P } = env();
  const RE = /^[a-z][a-z0-9._]{2,19}$/;
  NAMES.forEach(([s, want]) => {
    const u = P.normalizeUsername(s);
    if (want === null && u !== '') assert.ok(RE.test(u), u);
    if (want === 'len' || want === 'start' || want === 'chars') assert.ok(!RE.test(u), u);
  });
});

test('nom: normalizeUsername kichik harfga oʻtkazadi, boʻshliqni tashlaydi, boshqasini oʻzgartirmaydi', () => {
  const { P } = env();
  assert.equal(P.normalizeUsername('  Ali Vali '), 'alivali');
  assert.equal(P.normalizeUsername('A\tB\nC'), 'abc');
  assert.equal(P.normalizeUsername('Али'), 'али');          // jimgina oʻchmaydi → chars
  assert.equal(P.normalizeUsername(null), '');
});

test('nomaqbul soʻz: kirill → lotin, oʻxshash harf va leet bilan', () => {
  const { P } = env();
  ['сука', 'СУКА', 'хуй', 'пизда', 'блядь', 'ебать', 'пидор', 'мудак', 'сикаман', 'қотақ', 'жалаб',
   'fuсk' /* kirill с */, 'fück', 'f u c k', 'fu.ck', 'sh!t', '$ex', 'b!tch', 'FUCK'].forEach(s => {
    assert.ok(P.badWord(s), s);
  });
});

test('nomaqbul soʻz: begunoh oʻzbek, rus va ingliz soʻzlari oʻtadi', () => {
  const { P } = env();
  ['Assalomu alaykum', 'Eshitdim', 'fuqaro', 'siqish', 'sikka', 'sikl', 'Jizzax', 'Nigora', 'Nigar',
   'Nazira', 'Nazim', 'analiz', 'classic', 'passion', 'cocktail', 'Shitob bilan', 'yalab', 'jalb qilish',
   'harom emas', 'kotib', 'onangni hurmat qil', 'Aminga', 'Essex', 'therapist', 'grape', 'scrap',
   'mandarin', 'дебаты', 'Lebanon', 'педикюр', 'Скажи', 'хулиган', 'Ассалому алайкум', 'Я люблю математику',
   'I love puzzles and math', 'Sukunat', 'Tolib', 'xulq', 'shaxmat'].forEach(s => {
    assert.equal(P.badWord(s), null, s);
  });
});

test('nomaqbul roʻyxat ≈150 ildiz: manbada uz/ru/en uchala boʻlim bor', () => {
  const m = SRC.match(/const BAD_ROOTS = \[([\s\S]*?)\];/);
  assert.ok(m);
  const n = (m[1].match(/'[^']+'/g) || []).length;
  assert.ok(n >= 140 && n <= 220, 'ildizlar soni ' + n);
  assert.match(m[1], /English/); assert.match(m[1], /Русский/); assert.match(m[1], /Oʻzbekcha/);
});

/* ════════════════════════════════════════════════════════════════════
   2. BIO
   ════════════════════════════════════════════════════════════════════ */
test('bio: yangi qator boʻshliqqa, boʻshliqlar siqiladi, chetlar kesiladi', () => {
  const { P } = env();
  assert.deepEqual(plain(P.cleanBio('  Salom\n\nmen   Ali\r\nman  ')), { value: 'Salom men Ali man', err: null });
  assert.deepEqual(plain(P.cleanBio('')), { value: '', err: null });
  assert.deepEqual(plain(P.cleanBio(null)), { value: '', err: null });
  assert.equal(P.cleanBio('a‮b​c').value, 'abc', 'yoʻnalish va koʻrinmas belgilar olib tashlanadi');
});

test('bio: 80 kod nuqtasi — chegara (emoji bitta nuqta boʻlsa bitta)', () => {
  const { P } = env();
  assert.equal(P.cleanBio('a'.repeat(80)).err, null);
  assert.equal(P.cleanBio('a'.repeat(81)).err, 'len');
  assert.equal(P.cleanBio('😀'.repeat(80)).err, null, 'UTF-16 da 160 birlik, lekin 80 kod nuqtasi');
  assert.equal(P.cleanBio('😀'.repeat(81)).err, 'len');
  assert.equal(P.cleanBio(' '.repeat(50) + 'a'.repeat(80) + '\n\n').err, null, 'kesilgandan keyin sanaladi');
});

test('bio: havola rad etiladi', () => {
  const { P } = env();
  ['http://x', 'https://iquest.uz', 'www.site', 't.me/kanal', 'yozing @username', 'mysite.uz', 'a.com',
   'site.ru ga', 'x.org', 'x.net', 'x.me', 'x.io', 'HTTPS://A'].forEach(s => {
    assert.equal(P.cleanBio(s).err, 'link', s);
  });
  ['Men 5.5 yoshdaman', '@ali', 'email emas', 'Toshkent.', 'uz tili'].forEach(s => {
    assert.equal(P.cleanBio(s).err, null, s);
  });
});

test('bio: nomaqbul soʻz', () => {
  const { P } = env();
  assert.equal(P.cleanBio('bu sh1t gap').err, 'bad');
  assert.equal(P.cleanBio('Ты сука').err, 'bad');
  assert.equal(P.cleanBio('Matematikani yaxshi koʻraman').err, null);
});

/* ════════════════════════════════════════════════════════════════════
   3. SAQLASH — hammasi yoki hech narsa
   ════════════════════════════════════════════════════════════════════ */
test('boʻsh xotira: standart profil, diskka yozilmaydi', () => {
  const { P, io } = env();
  assert.deepEqual(plain(P.get()), { v: 1, username: '', bio: '', color: 'purple', avatar: { kind: 'initial' }, showcase: null, updatedAt: 0 });
  assert.equal(P.readOnly(), false);
  assert.equal(io.writes.length, 0);
  assert.equal(P.displayName('uz'), 'Mehmon');
  assert.equal(P.displayName('ru'), 'Гость');
  assert.equal(P.initial('uz'), 'M');
});

test('save: toʻgʻri patch yoziladi, normallashtiriladi, updatedAt = now', () => {
  const { P, disk } = env();
  const r = P.save({ username: ' Ali_07 ', bio: 'Salom\ndunyo', color: 'teal', avatar: { kind: 'preset', id: 'owl' } }, { now: 1759000000000 });
  assert.equal(r.ok, true);
  assert.deepEqual(plain(r.errs), {});
  assert.deepEqual(disk(), { v: 1, username: 'ali_07', bio: 'Salom dunyo', color: 'teal', avatar: { kind: 'preset', id: 'owl' }, showcase: null, updatedAt: 1759000000000 });
  assert.equal(P.initial(), 'A');
  assert.equal(P.complete(), true);
});

test('save: bitta maydon xato → hech narsa yozilmaydi, hamma xatolar qaytadi', () => {
  const { P, io } = env();
  P.save({ username: 'ali', bio: 'eski' }, { now: 1 });
  const before = plain(P.get());
  const n = io.writes.length;
  const r = P.save({ username: 'ab', bio: 'www.x', color: 'teal' });
  assert.equal(r.ok, false);
  assert.deepEqual(plain(r.errs), { username: 'len', bio: 'link' });
  assert.deepEqual(plain(P.get()), before);
  assert.equal(io.writes.length, n);
  assert.equal(P.save({ username: 'vali', avatar: { kind: 'preset', id: 'dragon' } }).errs.avatar, 'unknown');
  assert.equal(P.get().username, 'ali');
});

test('save: oʻzgarish yoʻq → yozilmaydi, changed: false', () => {
  const { P, io } = env();
  P.save({ username: 'ali' }, { now: 5 });
  const n = io.writes.length;
  const r = P.save({ username: 'ALI', color: 'purple' }, { now: 99 });
  assert.equal(r.ok, true); assert.equal(r.changed, false);
  assert.equal(io.writes.length, n);
  assert.equal(P.get().updatedAt, 5);
});

test('save: QuotaExceeded → ok:false, xotira va disk oʻzgarmaydi', () => {
  let full = false;
  const { P, disk } = env(null, { quota: () => full });
  P.save({ username: 'ali' }, { now: 1 });
  full = true;
  const r = P.save({ username: 'vali' });
  assert.equal(r.ok, false); assert.equal(r.err, 'quota');
  assert.equal(P.get().username, 'ali');
  assert.equal(disk().username, 'ali');
});

test('rang: 6 bepul erkin, pullisi egalik bilan, nomaʼlumi rad', () => {
  const { P } = env();
  ['purple', 'blue', 'teal', 'green', 'pink', 'gold'].forEach(c => assert.equal(P.save({ color: c }).ok, true, c));
  assert.equal(P.save({ color: 'red' }).errs.color, 'locked', 'hamyon yoʻq → qulf');
  assert.equal(P.save({ color: 'rainbow' }).errs.color, 'unknown');
  assert.equal(P.save({ color: 'red' }, { owns: id => id === 'color:red' }).ok, true);
  assert.equal(P.get().color, 'red');
  assert.equal(P.save({ color: 'night' }, { owns: () => false }).errs.color, 'locked');
  assert.equal(P.save({ color: 'red', username: 'ali' }).ok, true, 'saqlangan rangni qayta yuborish egalikka bogʻlanmaydi');
  assert.equal(P.colorState('gold'), null);
  assert.equal(P.colorState('sky', { owns: () => true }), null);
});

test('rang: owns berilmasa nzWallet.owns faqat SAQLASH paytida soʻraladi', () => {
  const calls = [];
  const wallet = { owns: id => { calls.push(id); return id === 'color:sky'; } };
  const { P } = env(null, { window: { nzWallet: wallet } });
  assert.equal(calls.length, 0, 'yuklanishda hamyonga murojaat yoʻq');
  assert.equal(P.save({ color: 'sky' }).ok, true);
  assert.deepEqual(calls, ['color:sky']);
  assert.equal(P.save({ color: 'cherry' }).errs.color, 'locked');
});

test('rang: nzCatalog boʻlsa roʻyxat undan olinadi', () => {
  const nzCatalog = { colors: [{ id: 'purple', price: 0 }, { id: 'mint', price: 0 }, { id: 'lava', price: 150 }] };
  const { P } = env({ [KEY]: { v: 1, color: 'mint' } }, { window: { nzCatalog } });
  assert.equal(P.get().color, 'mint');
  assert.equal(P.save({ color: 'teal' }).errs.color, 'unknown');
  assert.equal(P.save({ color: 'lava' }).errs.color, 'locked');
});

test('avatar: preset IQ_AVATARS boʻyicha, photo rasmsiz — xato', () => {
  const { P } = env(null, { avatars: true });
  assert.equal(P.save({ avatar: { kind: 'preset', id: 'spiral' } }).ok, true);
  assert.equal(P.save({ avatar: { kind: 'preset', id: 'unicorn' } }).errs.avatar, 'unknown');
  assert.equal(P.save({ avatar: { kind: 'photo' } }).errs.avatar, 'photo');
  assert.equal(P.save({ avatar: 'owl' }).errs.avatar, 'unknown');
  assert.equal(P.save({ avatar: { kind: 'initial' } }).ok, true);
});

test('vitrina: null yoki ≤3 noyob id', () => {
  const { P } = env();
  assert.equal(P.save({ showcase: ['first-test', 'compass'] }).ok, true);
  assert.deepEqual(plain(P.get().showcase), ['first-test', 'compass']);
  assert.equal(P.save({ showcase: ['a', 'b', 'c', 'd'] }).errs.showcase, 'len');
  assert.equal(P.save({ showcase: ['a', 'a'] }).errs.showcase, 'id');
  assert.equal(P.save({ showcase: ['Bad Id'] }).errs.showcase, 'id');
  assert.equal(P.save({ showcase: 'compass' }).errs.showcase, 'format');
  assert.equal(P.save({ showcase: null }).ok, true);
  assert.equal(P.get().showcase, null);
});

test('vitrina: avto rejim — eng oxirgi 3 ta; birinchi bosishda aniq roʻyxatga aylanadi', () => {
  const { P } = env();
  const have = [{ id: 'first-test', at: 1 }, { id: 'streak-3', at: 5 }, { id: 'compass', at: 3 }, { id: 'answers-100', at: 9 }];
  assert.deepEqual(plain(P.showcase(have)), ['answers-100', 'streak-3', 'compass']);
  const full = P.pinBadge('first-test', have);
  assert.equal(full.ok, false); assert.equal(full.err, 'full');
  assert.equal(P.get().showcase, null, 'xato bosish avto rejimni oʻzgartirmaydi');
  assert.equal(P.unpinBadge('streak-3', have).ok, true);
  assert.deepEqual(plain(P.get().showcase), ['answers-100', 'compass']);
  assert.equal(P.pinBadge('first-test', have).ok, true);
  assert.deepEqual(plain(P.showcase(have)), ['answers-100', 'compass', 'first-test']);
  assert.deepEqual(plain(P.showcase(['compass'])), ['compass'], 'yoʻqolgan nishon koʻrsatilmaydi');
});

test('dirty: «Saqlash» tugmasi uchun', () => {
  const { P } = env();
  P.save({ username: 'ali', bio: 'salom' });
  assert.equal(P.dirty({ username: 'ALI', bio: ' salom ', color: 'purple', avatar: { kind: 'initial' } }), false);
  assert.equal(P.dirty({ username: 'vali' }), true);
  assert.equal(P.dirty({ color: 'teal' }), true);
  assert.equal(P.dirty({ avatar: { kind: 'photo' }, photoData: PHOTO }), true);
  assert.equal(P.check({ username: 'x' }).errs.username, 'len');
});

/* ════════════════════════════════════════════════════════════════════
   4. VERSIYA, BUZILGAN MAʼLUMOT, readOnly
   ════════════════════════════════════════════════════════════════════ */
test('yangiroq versiya (v:2) → readOnly, diskka HECH narsa yozilmaydi', () => {
  const newer = JSON.stringify({ v: 2, username: 'kelajak', bio: 'x', color: 'teal', fancy: 1 });
  const { P, raw, io } = env({ [KEY]: newer, [IMG]: PHOTO });
  assert.equal(P.readOnly(), true);
  assert.equal(P.get().username, '', 'xotirada standart');
  assert.equal(P.save({ username: 'ali' }).err, 'readonly');
  assert.equal(P.commitPhoto(PHOTO2).err, 'readonly');
  assert.equal(P.removePhoto().err, 'readonly');
  assert.equal(P.pinBadge('compass', ['compass']).err, 'readonly');
  assert.equal(io.writes.length, 0);
  assert.equal(raw(KEY), newer);
  assert.equal(raw(IMG), PHOTO);
});

test('buzilgan yozuv → standart, lekin saqlash mumkin', () => {
  for (const bad of ['{oops', '[]', '42', '"str"', JSON.stringify({ v: 'x' }), JSON.stringify({ v: 0 }), 'null']) {
    const { P } = env({ [KEY]: bad });
    assert.equal(P.readOnly(), false, bad);
    assert.equal(P.get().username, '', bad);
    assert.equal(P.save({ username: 'ali' }).ok, true, bad);
  }
});

test('sane: har maydon alohida tekshiriladi', () => {
  const { P } = env({ [KEY]: {
    v: 1, username: 'Admin', bio: 'a'.repeat(200), color: 'rainbow',
    avatar: { kind: 'preset', id: 'dragon' }, showcase: ['compass', 'compass', 5, 'BAD', 'a', 'b', 'c'], updatedAt: -5,
  } });
  assert.deepEqual(plain(P.get()), { v: 1, username: '', bio: '', color: 'purple', avatar: { kind: 'initial' }, showcase: ['compass', 'a', 'b'], updatedAt: 0 });
  const ok = env({ [KEY]: { v: 1, username: 'ali', bio: 'salom', color: 'red', avatar: { kind: 'preset', id: 'fox' }, showcase: null, updatedAt: 7 } });
  assert.equal(ok.P.get().color, 'red', 'yuklanishda egalik tekshirilmaydi');
  assert.equal(ok.P.get().username, 'ali');
});

test('avatar photo, lekin rasm yoʻq/buzilgan → bosh harf', () => {
  const a = env({ [KEY]: { v: 1, avatar: { kind: 'photo' } } });
  assert.equal(a.P.get().avatar.kind, 'initial');
  assert.equal(a.P.photo(), null);
  const b = env({ [KEY]: { v: 1, avatar: { kind: 'photo' } }, [IMG]: 'data:text/html;base64,AAAA' });
  assert.equal(b.P.get().avatar.kind, 'initial');
  const c = env({ [KEY]: { v: 1, avatar: { kind: 'photo' } }, [IMG]: PHOTO });
  assert.equal(c.P.get().avatar.kind, 'photo');
  assert.equal(c.P.photo(), PHOTO);
});

test('localStorage umuman ishlamaydi → yiqilmaydi, xotirada ishlaydi', () => {
  const { P } = env(null, { broken: true });
  assert.equal(P.save({ username: 'ali' }).ok, true);
  assert.equal(P.get().username, 'ali');
  P.reset();
  assert.equal(P.get().username, '');
});

test('reset: ikkala kalit oʻchadi (readOnly holatida ham)', () => {
  const { P, has } = env({ [KEY]: { v: 3 }, [IMG]: PHOTO });
  P.reset();
  assert.equal(has(KEY), false); assert.equal(has(IMG), false);
  assert.equal(P.readOnly(), false);
  assert.equal(P.save({ username: 'ali' }).ok, true);
});

/* ════════════════════════════════════════════════════════════════════
   5. RASMNI SAQLASH (commitPhoto / save bilan birga)
   ════════════════════════════════════════════════════════════════════ */
test('commitPhoto: yaroqli dataUrl yoziladi; QuotaExceeded → quota, eski rasm qoladi', () => {
  let full = false;
  const { P, raw } = env(null, { quota: k => full && k === IMG });
  assert.equal(P.commitPhoto(PHOTO).ok, true);
  assert.equal(raw(IMG), PHOTO);
  full = true;
  assert.deepEqual(plain(P.commitPhoto(PHOTO2)), { ok: false, err: 'quota' });
  assert.equal(raw(IMG), PHOTO);
  assert.equal(P.commitPhoto('data:image/svg+xml;base64,AAAA').err, 'invalid');
  assert.equal(P.commitPhoto('data:image/jpeg;base64,' + 'A'.repeat(64000)).err, 'invalid', '64 000 belgidan uzun');
});

test('save + photoData: ikkala kalit birga; profil yozilmasa rasm eski holiga qaytadi', () => {
  let fail = null;
  const { P, raw, disk } = env(null, { quota: k => fail === k });
  assert.equal(P.save({ avatar: { kind: 'photo' }, photoData: PHOTO }).ok, true);
  assert.equal(raw(IMG), PHOTO);
  assert.equal(disk().avatar.kind, 'photo');
  assert.equal(P.photo(), PHOTO);

  fail = KEY;                                     // rasm yoziladi, profil — yoʻq
  const r = P.save({ avatar: { kind: 'photo' }, photoData: PHOTO2, username: 'ali' });
  assert.equal(r.ok, false); assert.equal(r.err, 'quota');
  assert.equal(raw(IMG), PHOTO, 'rasm eski holiga qaytdi');
  assert.equal(P.photo(), PHOTO); assert.equal(P.get().username, '');

  fail = IMG;
  assert.equal(P.save({ photoData: PHOTO2 }).err, 'quota');
  assert.equal(disk().avatar.kind, 'photo'); assert.equal(raw(IMG), PHOTO);
});

test('save: rasmdan voz kechilsa rasm kaliti oʻchadi; removePhoto bosh harfga qaytaradi', () => {
  const { P, has } = env(null, { avatars: true });
  P.save({ photoData: PHOTO });
  assert.equal(P.get().avatar.kind, 'photo');
  P.save({ avatar: { kind: 'preset', id: 'cat' }, photoData: PHOTO });
  assert.equal(has(IMG), false, 'eskirgan qoralama rasmi yozilmaydi');
  P.save({ photoData: PHOTO });
  assert.equal(P.removePhoto().ok, true);
  assert.equal(P.get().avatar.kind, 'initial');
  assert.equal(has(IMG), false);
  assert.equal(P.save({ photoData: 'data:image/gif;base64,AAAA' }).errs.photo, 'invalid');
});

/* ════════════════════════════════════════════════════════════════════
   6. RASM QUVURI (canvas stub)
   ════════════════════════════════════════════════════════════════════ */

/* JPEG boshi: SOI, ixtiyoriy EXIF (APP1, orientation), SOF0 (w×h). */
function jpeg(w, h, orientation, little) {
  const bytes = [0xff, 0xd8];
  if (orientation) {
    const le = !!little;
    const u16 = v => (le ? [v & 255, v >> 8] : [v >> 8, v & 255]);
    const u32 = v => (le ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
    const tiff = [...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8), ...u16(1),
      ...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0, ...u32(0)];
    const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    const len = body.length + 2;
    bytes.push(0xff, 0xe1, len >> 8, len & 255, ...body);
  }
  bytes.push(0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1);
  bytes.push(0xff, 0xda, 0, 2);
  return new Uint8Array(bytes);
}
function png(w, h) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  b.set([w >>> 24, (w >> 16) & 255, (w >> 8) & 255, w & 255, h >>> 24, (h >> 16) & 255, (h >> 8) & 255, h & 255], 16);
  return b;
}
function fakeFile(bytes, type, size) {
  return {
    type: type, size: size != null ? size : bytes.length,
    slice: (a, b) => fakeFile(bytes.slice(a, b), type),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

/* Canvas stub. lenOf(size, mime, q) — toDataURL natijasining uzunligi. */
function stubEnv(opts) {
  opts = opts || {};
  const log = { canvases: [], encodes: [], closed: 0, bitmapArgs: [] };
  const lenOf = opts.lenOf || (() => 30000);
  return {
    log,
    env: {
      createImageBitmap: opts.noBitmap ? null : async (file, o) => {
        log.bitmapArgs.push(o);
        if (opts.bitmapFails) throw new Error('decode');
        if (o && opts.noOptions) throw new TypeError('options');
        const [w, h] = opts.decoded;
        return { width: w, height: h, close() { log.closed++; } };
      },
      FileReader: opts.FileReader || null,
      Image: opts.Image || null,
      cssOrientation: opts.cssOrientation,
      canvas: (w, h) => {
        const calls = [];
        const c = {
          width: w, height: h, calls,
          getContext: () => ({
            set imageSmoothingQuality(v) { calls.push(['quality', v]); },
            set imageSmoothingEnabled(v) {}, set fillStyle(v) {},
            fillRect() {},
            setTransform: (...a) => calls.push(['set', ...a]),
            transform: (...a) => calls.push(['tf', ...a]),
            drawImage: (...a) => calls.push(['draw', a.length]),
          }),
          toDataURL: (mime, q) => {
            log.encodes.push([w, mime, q]);
            if (opts.noWebp && mime === 'image/webp') return 'data:image/png;base64,AAAA';
            const head = 'data:' + mime + ';base64,';
            return head + 'A'.repeat(Math.max(4, lenOf(w, mime, q) - head.length));
          },
        };
        log.canvases.push(c);
        return c;
      },
    },
  };
}

test('rasm: 15 MB dan katta — dekodlashdan OLDIN rad', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [100, 100] });
  const r = await P.preparePhoto(fakeFile(jpeg(100, 100), 'image/jpeg', 15 * 1024 * 1024 + 1), 'top', s.env);
  assert.deepEqual(plain(r), { ok: false, err: 'size' });
  assert.equal(s.log.bitmapArgs.length, 0);
  const ok = await P.preparePhoto(fakeFile(jpeg(100, 100), 'image/jpeg', 15 * 1024 * 1024), 'top', s.env);
  assert.equal(ok.ok, true);
});

test('rasm: tur, HEIC, notanish format, dekodlash xatosi, juda koʻp piksel', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [10, 10] });
  assert.equal((await P.preparePhoto(fakeFile(jpeg(10, 10), 'image/gif'), 'top', s.env)).err, 'type');
  assert.equal((await P.preparePhoto(fakeFile(jpeg(10, 10), 'image/heic'), 'top', s.env)).err, 'type');
  assert.equal((await P.preparePhoto(null, 'top', s.env)).err, 'type');
  const heic = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0]);
  assert.equal((await P.preparePhoto(fakeFile(heic, ''), 'top', s.env)).err, 'decode', 'nomi .jpg boʻlgan HEIC');
  assert.equal((await P.preparePhoto(fakeFile(new Uint8Array(40), 'image/jpeg'), 'top', s.env)).err, 'decode');
  const f = stubEnv({ bitmapFails: true });
  assert.equal((await P.preparePhoto(fakeFile(jpeg(10, 10), 'image/jpeg'), 'top', f.env)).err, 'decode');
  assert.equal((await P.preparePhoto(fakeFile(png(10000, 10000), 'image/png'), 'top', s.env)).err, 'size');
});

test('rasm: createImageBitmap imageOrientation:from-image bilan chaqiriladi; bitmap yopiladi', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [800, 600] });
  const r = await P.preparePhoto(fakeFile(jpeg(800, 600), 'image/jpeg'), undefined, s.env);
  assert.equal(r.ok, true);
  assert.equal(s.log.bitmapArgs[0].imageOrientation, 'from-image');
  assert.equal(s.log.closed, 1);
  assert.equal(r.shape, 'landscape'); assert.equal(r.align, 'center');
  assert.equal(r.size, 256); assert.equal(r.quality, 0.82);
  assert.match(r.dataUrl, /^data:image\/jpeg;base64,/);
});

test('rasm: 64 000 belgi zinapoyasi 0.82 → 0.70 → 0.60 → 192 px', async () => {
  const { P } = env();
  const cases = [
    [() => 30000, [256, 0.82], 1],
    [(w, m, q) => (q > 0.75 ? 70000 : 50000), [256, 0.70], 2],
    [(w, m, q) => (q > 0.65 ? 70000 : w === 256 ? 64001 : 40000), [192, 0.60], 4],
    [(w, m, q) => (w === 256 && q === 0.6 ? 64000 : 90000), [256, 0.60], 3],
  ];
  for (const [lenOf, [size, q], tries] of cases) {
    const s = stubEnv({ decoded: [1000, 1000], lenOf });
    const r = await P.preparePhoto(fakeFile(jpeg(1000, 1000), 'image/jpeg'), 'center', s.env);
    assert.equal(r.ok, true);
    assert.equal(r.size, size); assert.equal(r.quality, q);
    assert.ok(r.dataUrl.length <= 64000);
    assert.equal(s.log.encodes.length, tries);
  }
  const never = stubEnv({ decoded: [1000, 1000], lenOf: () => 99999 });
  const r = await P.preparePhoto(fakeFile(jpeg(1000, 1000), 'image/jpeg'), 'center', never.env);
  assert.deepEqual(plain(r), { ok: false, err: 'encode' });
  assert.deepEqual(never.log.encodes.map(e => e[0] + ':' + e[1] + ':' + e[2]),
    ['256:image/jpeg:0.82', '256:image/jpeg:0.7', '256:image/jpeg:0.6', '192:image/jpeg:0.6', '192:image/webp:0.6', '128:image/jpeg:0.6']);
});

test('rasm: toDataURL formatni qoʻllamasa (PNG qaytarsa) keyingi pogʻona', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [500, 500], noWebp: true, lenOf: (w, m) => (m === 'image/jpeg' && w === 128 ? 20000 : 70000) });
  const r = await P.preparePhoto(fakeFile(jpeg(500, 500), 'image/jpeg'), 'center', s.env);
  assert.equal(r.ok, true); assert.equal(r.size, 128);
});

test('rasm: cropSquare — portret yuqori/markaz/past, albom chap/markaz/oʻng', () => {
  const { P } = env();
  const c = P._photo.cropSquare;
  assert.deepEqual(plain(c(300, 500)), { x: 0, y: 0, s: 300, shape: 'portrait', align: 'top' }, 'standart yuqori');
  assert.deepEqual(plain(c(300, 500, 'center')), { x: 0, y: 100, s: 300, shape: 'portrait', align: 'center' });
  assert.deepEqual(plain(c(300, 500, 'bottom')), { x: 0, y: 200, s: 300, shape: 'portrait', align: 'bottom' });
  assert.deepEqual(plain(c(300, 500, 'left')), { x: 0, y: 0, s: 300, shape: 'portrait', align: 'top' }, 'mos kelmagan → standart');
  assert.deepEqual(plain(c(500, 300)), { x: 100, y: 0, s: 300, shape: 'landscape', align: 'center' });
  assert.deepEqual(plain(c(500, 300, 'left')), { x: 0, y: 0, s: 300, shape: 'landscape', align: 'left' });
  assert.deepEqual(plain(c(500, 300, 'right')), { x: 200, y: 0, s: 300, shape: 'landscape', align: 'right' });
  assert.deepEqual(plain(c(400, 400, 'top')), { x: 0, y: 0, s: 400, shape: 'square', align: 'center' });
});

test('rasm: align canvas transformiga tushadi (kesish), smoothing high', async () => {
  const { P } = env();
  for (const [align, ty] of [['top', 0], ['center', -64], ['bottom', -128]]) {
    const s = stubEnv({ decoded: [256, 384] });
    const r = await P.preparePhoto(fakeFile(jpeg(256, 384), 'image/jpeg'), align, s.env);
    assert.equal(r.shape, 'portrait'); assert.equal(r.align, align);
    const set = s.log.canvases[0].calls.find(c => c[0] === 'set');
    assert.deepEqual(set.slice(1).map(v => v + 0), [1, 0, 0, 1, 0, ty]);
    assert.ok(s.log.canvases[0].calls.some(c => c[0] === 'quality' && c[1] === 'high'));
  }
});

test('rasm: katta rasm bosqichma-bosqich kichraytiriladi (2× qadam)', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [4000, 3000] });
  await P.preparePhoto(fakeFile(jpeg(4000, 3000), 'image/jpeg'), 'center', s.env);
  assert.deepEqual(s.log.canvases.map(c => c.width), [2048, 1024, 512, 256]);
});

test('rasm: EXIF — imageMeta burilish va oʻlchamni oʻqiydi (II va MM)', () => {
  const { P } = env();
  const m = P._photo.imageMeta;
  assert.deepEqual(plain(m(jpeg(4000, 3000, 6))), { type: 'jpeg', w: 4000, h: 3000, orientation: 6 });
  assert.deepEqual(plain(m(jpeg(640, 480, 3, true))), { type: 'jpeg', w: 640, h: 480, orientation: 3 });
  assert.deepEqual(plain(m(jpeg(10, 20))), { type: 'jpeg', w: 10, h: 20, orientation: 1 });
  assert.deepEqual(plain(m(png(7, 9))), { type: 'png', w: 7, h: 9, orientation: 1 });
});

test('rasm: dekoder EXIF ni qoʻllagan boʻlsa qayta burilmaydi; qoʻllamagan boʻlsa qoʻlda buriladi', async () => {
  const { P } = env();
  // manba 4000×3000, orientation 6 (90° soat yoʻnalishida) → toʻgʻri koʻrinish 3000×4000 portret
  const applied = stubEnv({ decoded: [3000, 4000] });
  const r1 = await P.preparePhoto(fakeFile(jpeg(4000, 3000, 6), 'image/jpeg'), 'top', applied.env);
  assert.equal(r1.shape, 'portrait');
  assert.deepEqual(applied.log.canvases[0].calls.find(c => c[0] === 'tf'), ['tf', 1, 0, 0, 1, 0, 0]);

  const raw = stubEnv({ decoded: [4000, 3000], noOptions: true });   // eski WebView: parametr yoʻq
  const r2 = await P.preparePhoto(fakeFile(jpeg(4000, 3000, 6), 'image/jpeg'), 'top', raw.env);
  assert.equal(r2.shape, 'portrait', 'qoʻlda burilgandan keyin ham portret');
  assert.deepEqual(raw.log.canvases[0].calls.find(c => c[0] === 'tf'), ['tf', 0, 1, -1, 0, 3000, 0]);

  const flip = stubEnv({ decoded: [640, 480], noOptions: true });    // 3 (180°) — oʻlchamdan bilinmaydi
  await P.preparePhoto(fakeFile(jpeg(640, 480, 3), 'image/jpeg'), 'center', flip.env);
  assert.deepEqual(flip.log.canvases[0].calls.find(c => c[0] === 'tf'), ['tf', -1, 0, 0, -1, 640, 480]);
});

test('rasm: orientMatrix har burilishda burchaklarni toʻgʻri joyga olib boradi', () => {
  const { P } = env();
  const w = 4, h = 2;
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  // manbaning (0,0) burchagi toʻgʻri koʻrinishda qayerga tushadi (EXIF taʼrifi)
  const want = { 1: [0, 0], 2: [4, 0], 3: [4, 2], 4: [0, 2], 5: [0, 0], 6: [2, 0], 7: [2, 4], 8: [0, 4] };
  for (let o = 1; o <= 8; o++) {
    const m = P._photo.orientMatrix(o, w, h);
    assert.deepEqual(ap(m, 0, 0).map(v => v + 0), want[o], 'o=' + o);
    const W = o >= 5 ? h : w, H = o >= 5 ? w : h;
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
      const [X, Y] = ap(m, x, y);
      assert.ok(X >= 0 && X <= W && Y >= 0 && Y <= H, `o=${o} (${x},${y})`);
    });
  }
});

test('rasm: zaxira yoʻl FileReader → Image (Blob URL yoʻq)', async () => {
  const { P } = env();
  const urls = [];
  class FR {
    readAsDataURL() { setTimeout(() => { this.result = 'data:image/jpeg;base64,AAAA'; this.onload(); }); }
    readAsArrayBuffer() { this.onerror(); }
  }
  class Img { set src(u) { urls.push(u); this.naturalWidth = 300; this.naturalHeight = 200; setTimeout(() => this.onload()); } }
  const s = stubEnv({ noBitmap: true, FileReader: FR, Image: Img, cssOrientation: true });
  const r = await P.preparePhoto(fakeFile(jpeg(300, 200), 'image/jpeg'), 'right', s.env);
  assert.equal(r.ok, true); assert.equal(r.shape, 'landscape'); assert.equal(r.align, 'right');
  assert.deepEqual(urls, ['data:image/jpeg;base64,AAAA']);
  assert.ok(!/createObjectURL/.test(SRC), 'Blob URL ishlatilmaydi (CSP img-src)');
});

test('rasm: preparePhoto diskka YOZMAYDI', async () => {
  const { P, io } = env();
  const s = stubEnv({ decoded: [300, 300] });
  const r = await P.preparePhoto(fakeFile(jpeg(300, 300), 'image/jpeg'), 'center', s.env);
  assert.equal(r.ok, true);
  assert.equal(io.writes.length, 0);
  assert.equal(P.photo(), null);
});

test('matnlar: har xato kodi uchun {uz, ru, en}; oʻzbekchada toʻgʻri tutuq belgisi', () => {
  const { P } = env();
  Object.keys(P.TEXT).forEach(f => Object.keys(P.TEXT[f]).forEach(code => {
    const t = P.TEXT[f][code];
    ['uz', 'ru', 'en'].forEach(l => assert.ok(typeof t[l] === 'string' && t[l].length, `${f}.${code}.${l}`));
    assert.ok(!/['’`]/.test(t.uz), `${f}.${code}: oʻzbekchada ʻ/ʼ ishlatiladi`);
    assert.ok(!/[а-яё]/i.test(t.en) && !/[ʻʼ]/.test(t.en), `${f}.${code}.en`);
  }));
  assert.equal(P.errText('username', 'format', 'uz'), 'Nuqta va _ ketma-ket boʻlmasin');
  assert.equal(P.errText('photo', 'size', 'ru'), 'Фото слишком большое');
  assert.equal(P.errText('bio', 'link', 'uz-cyrl'), 'Havola qoʻshib boʻlmaydi');
});

/* S1: SOF 256 KB dan keyin — 50 MP chegarasi chetlab oʻtilmaydi. */
function jpegFarSof(w, h) {
  const pad = [];
  for (let k = 0; k < 5; k++) {           // 5 × 64 KB APP2 — SOF ~320 KB da
    const len = 65535;
    pad.push(0xff, 0xe2, len >> 8, len & 255, ...new Array(len - 2).fill(0x41));
  }
  const tail = jpeg(w, h).slice(2);
  return new Uint8Array([0xff, 0xd8, ...pad, ...tail]);
}

test('S1: JPEG oʻlchami 256 KB dan keyin boʻlsa ham 50 MP dan kattasi dekodlashdan OLDIN rad', async () => {
  const { P } = env();
  const big = jpegFarSof(10000, 9000);
  assert.ok(big.length > 256 * 1024);
  const s = stubEnv({ decoded: [10000, 9000] });
  const r = await P.preparePhoto(fakeFile(big, 'image/jpeg'), 'top', s.env);
  assert.deepEqual(plain(r), { ok: false, err: 'size' });
  assert.equal(s.log.bitmapArgs.length, 0, 'dekoder chaqirilmadi');
  // kichik rasm xuddi shu shaklda — oʻtadi
  const ok = await P.preparePhoto(fakeFile(jpegFarSof(800, 600), 'image/jpeg'), 'top', stubEnv({ decoded: [800, 600] }).env);
  assert.equal(ok.ok, true);
});

test('S1: sarlavha aldasa ham dekodlangan oʻlcham > 50 MP — rad, bitmap yopiladi', async () => {
  const { P } = env();
  const s = stubEnv({ decoded: [10000, 9000] });
  const r = await P.preparePhoto(fakeFile(jpeg(100, 100), 'image/jpeg'), 'top', s.env);
  assert.deepEqual(plain(r), { ok: false, err: 'size' });
  assert.equal(s.log.closed, 1);
  assert.equal(s.log.canvases.length, 0, 'chizilmadi');
});
