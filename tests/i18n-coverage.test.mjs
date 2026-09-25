/* Lugʻat qamrovi (ARXITEKTURA §8.1, §8.4) — tools/i18n-extract.mjs.

   BOSQICHLAR:
     1-bosqich (tugadi): UI (Main.dc.html) parallel qayta yozilmoqda, yangi
        v1.1 satrlari hali muzlamagan. Yetishmayotgan kalitlar HISOBOT
        sifatida chiqadi, test yiqilmaydi. Chiqarib olish mexanizmi va
        lugʻat shakli esa qatʼiy tekshiriladi.
     2-bosqich (HOZIR — WP7 satrlari muzlatildi): STRICT.ru = STRICT.en =
        true — 0 ta boʻshliq; koʻplik kalitlari faqat nzTN/trn bilan.
     v1.2 (EN darvozasi): STRICT.en = true (build darvozasi baribir
        shu hisobni ishlatadi).
   Muhitdan ham yoqiladi: I18N_STRICT=ru  yoki  I18N_STRICT=ru,en */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverage, loadDicts, extractMarkup, extractLogic, extractModule, jsStrings } from '../tools/i18n-extract.mjs';

const STRICT = { ru: true, en: true };   // 2-bosqich: UI satrlari muzlatildi (WP7 commit 0313338)
for (const L of String(process.env.I18N_STRICT || '').split(',').map(s => s.trim()).filter(Boolean)) STRICT[L] = true;

const cov = coverage();

test('qamrov hisoboti (ru/en)', t => {
  for (const L of ['ru', 'en']) {
    const miss = cov.missing[L];
    const lines = miss.map(k => `  ${JSON.stringify(k)} ← ${cov.strings.get(k).map(w => w.file + ':' + w.line).join(', ')}`);
    t.diagnostic(`[${L}] ${cov.total - miss.length}/${cov.total} qamralgan; yetishmaydi ${miss.length}`);
    for (const l of lines) t.diagnostic(l);
    if (STRICT[L]) assert.deepEqual(miss, [], `${L}: lugʻatda yetishmayotgan satrlar`);
  }
  for (const g of cov.glossary) t.diagnostic(`glossariy/imlo: ${JSON.stringify(g.key)} — ${g.rule}`);
});

test('chiqarib olish: joriy UI ning asosiy satrlari topiladi', () => {
  assert.ok(cov.total >= 80, `juda kam satr topildi: ${cov.total}`);
  for (const k of ['IQ test', 'Mashq', 'Profil', 'Yopish', '{0}-daraja']) {
    assert.ok(cov.strings.has(k), `topilmadi: ${k}`);
  }
  // Brend va identifikatorlar satr emas
  for (const k of ['IQuest', 'practice', 'home', 'svg', 'flex', 'var(--primary)']) assert.ok(!cov.strings.has(k), k);
});

test('chiqarib olish: markup matn tugunlari, atributlar va {{ }} boʻlaklari', () => {
  const html = `<div aria-label="Sozlamalar" title="{{ x }}"><span>{{ n }} kun</span> <b>Bosh</b>
    <!-- Izoh ichidagi matn --><style>.a{color:red}</style><span>IQuest</span><span>12 / 30</span>
    <sc-if value="{{ isAdmin }}"><p>Admin matni</p></sc-if><input placeholder="Foydalanuvchi nomi"></div>`;
  const got = extractMarkup(html).map(r => r.v).sort();
  assert.deepEqual(got, ['Bosh', 'Foydalanuvchi nomi', 'Sozlamalar', 'kun']);
});

test('chiqarib olish: mantiq satrlari kontekst boʻyicha', () => {
  const code = `
    // "Izohdagi matn" olinmaydi
    const THEME_LABELS = { auto: "Qurilma", dark: "Tungi" };
    const STATE_WORDS = { lit: "yongan" };
    function f(s) {
      if (s.kind === "practice") return null;
      const a = T("{0} ta savol").replace("{0}", n);
      const b = nzTN("+{0} ball", 3);
      const r = /["a-z"]+/g;
      this.navPill("home");
      throw new Error("[ichki] xato xabari");
      return { title: "Yangi test?", sub: ok ? T("Tayyor") : "Yangi", aria: T(STATE_WORDS[st]),
               value: THEME_LABELS[x], style: { fontFamily: "Manrope", display: "flex" },
               idRaw: "Salom", kind: "primary",
               lead: "Har kuni mashq — ligada yuqoriga." };
    }`;
  const got = extractLogic(code).map(r => r.v).sort();
  assert.deepEqual(got, ['+{0} ball', 'Har kuni mashq — ligada yuqoriga.', 'Qurilma', 'Tayyor', 'Tungi', 'Yangi', 'Yangi test?', 'yongan', '{0} ta savol']);
});

test('chiqarib olish: btn()/sec(), kortejlar, oʻzgaruvchiga yorliq, jadval; var( — matn emas', () => {
  const code = `
    const NAV = [["home", "home", "Bosh"], ["practice", "dumbbell", "Mashq"]];
    const aligns = [["left", "Chap"], ["center", "Markaz"]];
    const THEME_LABELS = { auto: "Qurilma", dark: "Tungi" };
    const langs = ["uz", "ru"];
    function g() {
      let primary = "Keyingi";
      if (x) { primary = "Saqlash"; secondary = "Keyinroq"; }
      const o = Object.assign(base, btn(ok ? "Qoʻllash" : "Vitrinaga qoʻyish", fn), sec("Yopish", fn));
      const st = { background: "var(--surface) va boshqa", color: "var(--primary)" };
      return o;
    }`;
  const got = extractLogic(code).map(r => r.v).sort();
  assert.deepEqual(got, ['Bosh', 'Chap', 'Keyingi', 'Keyinroq', 'Markaz', 'Mashq', 'Qoʻllash', 'Qurilma', 'Saqlash',
                         'Tungi', 'Vitrinaga qoʻyish', 'Yopish']);
});

test('chiqarib olish: modul uchliklari va tr() argumentlari', () => {
  const code = `const L = (uz, ru, en) => ({ uz, ru, en });
    const A = [{ id: 'a', name: L('Kompas', 'Компас', 'Compass') }, { id: 'b', name: { uz: 'Olov I', ru: 'Огонь I' } }];
    say('Chiqish uchun yana bir marta bosing');
    if (x !== 'svg satr emas') errs.push('ichki xato');`;
  const r = extractModule(code, { prose: true });
  assert.deepEqual(r.dict.map(d => d.v), ['Chiqish uchun yana bir marta bosing']);
  assert.equal(r.triplets.length, 2);
  assert.equal(r.triplets[0].en, 'Compass');
  assert.equal(r.triplets[0].key, 'name');
  assert.equal(r.triplets[1].en, undefined);
});

test('tokenizator: regex, shablon va izohlar satrni buzmaydi', () => {
  const s = jsStrings('const a = x / 2; const r = /"q"/; const t = `Salom ${n}`; /* "yoʻq" */ const b = "Bor";').map(x => x.v);
  assert.deepEqual(s, ['Bor']);
});

test('modul uchliklari: ru har doim bor (en — WP10/WP3 hisobotida)', t => {
  const noRu = cov.triplets.missingRu.filter(x => x.uz);
  assert.deepEqual(noRu.map(x => `${x.file}:${x.line} ${x.uz}`), [], 'ru yoʻq uchlik');
  t.diagnostic(`uchliklar: ${cov.triplets.all.length}, en yoʻq: ${cov.triplets.missingEn.length}`);
});

test('koʻplik qoliplari nzTN/plural bilan chaqiriladi (T().replace emas)', t => {
  // Lugʻatda koʻplik obyekti boʻlgan kalit T("…").replace(...) bilan
  // ishlatilsa ruscha son kelishmaydi (F33, F56). 1-bosqichda hisobot.
  const D = loadDicts();
  const bad = [];
  for (const k of cov.keys) {
    const plural = ['ru', 'en'].some(L => D[L][k] && typeof D[L][k] === 'object');
    if (!plural || /\{\d\}/.test(k) === false) continue;
    const viaT = cov.strings.get(k).filter(w => w.kind === 'T:T' || w.kind === 'T:nzT' || w.kind === 'T:tr');
    if (viaT.length) bad.push(`${JSON.stringify(k)} ← ${viaT.map(w => w.file + ':' + w.line).join(', ')}`);
  }
  for (const b of bad) t.diagnostic('nzTN ga oʻtkazilsin: ' + b);
  if (STRICT.ru) assert.deepEqual(bad, []);
});
