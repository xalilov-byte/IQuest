/* i18n.js — transliteratsiya, koʻplik, EN darvozasi, detect(), deep()
   va lugʻatlar yaxlitligi (ARXITEKTURA §8, §14.3; review F17 F28 F33
   F53 F54 F56 F58 F59). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);
const read = f => readFileSync(new URL(f, SRC), 'utf8');

/* opts: { store, language, nzLangs, nzSite, en: bool, ru: bool } */
function load(opts = {}) {
  const store = Object.assign({}, opts.store);
  const attrs = {};
  const w = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    navigator: { language: opts.language || 'uz-UZ' },
    document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
  };
  w.window = w;
  if (opts.nzLangs) w.nzLangs = opts.nzLangs;
  if (opts.nzSite) w.nzSite = opts.nzSite;
  const ctx = vm.createContext(w);
  if (opts.ru !== false) vm.runInContext(read('i18n-ru.js'), ctx);
  if (opts.en !== false) vm.runInContext(read('i18n-en.js'), ctx);
  vm.runInContext(read('i18n.js'), ctx);
  return { w, I: w.nzI18n, store, attrs };
}

const { I } = load();
const tr = s => I.transliterate(s);

test('tutuq: ASCII \' va ’ harflar orasida ъ boʻladi (F17, F53)', () => {
  assert.equal(tr("e'tibor"), 'эътибор');
  assert.equal(tr('e’tibor'), 'эътибор');
  assert.equal(tr('eʼtibor'), 'эътибор');
  assert.equal(tr("ma'lumot"), 'маълумот');
  assert.equal(tr('ma’lumot'), 'маълумот');
  assert.equal(tr('Maʼlumotlarni oʻchirish'), 'Маълумотларни ўчириш');
  assert.equal(tr('MAʼLUMOT'), 'МАЪЛУМОТ');
  assert.equal(tr('Ёндагиларга'), 'Ёндагиларга');
  assert.equal(tr("Yondagilarga e'tibor bermang."), 'Ёндагиларга эътибор берманг.');
});

test('U+2018 ‘ va ` oʻ/gʻ sifatida oʻqiladi (F17)', () => {
  assert.equal(tr('o‘yin'), 'ўйин');
  assert.equal(tr('g‘ildirak'), 'ғилдирак');
  assert.equal(tr('O‘zbek'), 'Ўзбек');
  assert.equal(tr('yo‘l'), 'йўл');
  assert.equal(tr('o`yin'), 'ўйин');
  assert.equal(tr("yo'l bo'lsa g'alaba"), 'йўл бўлса ғалаба');
  assert.equal(tr('Yoʻnalishi'), 'Йўналиши');
});

test('qoʻshtirnoq va soʻz chetidagi apostrof ъ/ғ ga aylanmaydi', () => {
  assert.equal(tr("'salom'"), "'салом'");
  assert.equal(tr('‘salom’'), '‘салом’');
  assert.equal(tr("'Tanlang'"), "'Танланг'");
  assert.equal(tr("tog'"), 'тоғ');                      // haqiqiy gʻ soʻz oxirida
  assert.equal(tr('IQuest’ga'), 'IQuest’га');           // brend + qoʻshimcha
  assert.equal(tr('IQʼingiz'), 'IQʼингиз');
});

test('ts → ц faqat oʻzlashmada; -siz/-simon/-sa chegarasida тс (F28, F58)', () => {
  assert.equal(tr('Internetsiz'), 'Интернетсиз');
  assert.equal(tr('juftsiz'), 'жуфтсиз');
  assert.equal(tr('itsimonlarga'), 'итсимонларга');
  assert.equal(tr('ketsa'), 'кетса');
  assert.equal(tr('aytsin'), 'айтсин');
  assert.equal(tr('matritsa'), 'матрица');
  assert.equal(tr('Matritsalar'), 'Матрицалар');
  assert.equal(tr('kompensatsiya'), 'компенсация');
  assert.equal(tr('retsept'), 'рецепт');
  assert.equal(tr('shprits'), 'шприц');
  assert.equal(tr('sotsial'), 'социал');
  assert.equal(tr('politsiyachi'), 'полициячи');
});

test('e → э soʻz boshida va a/o/u/oʻ dan keyin; boshqa joyda е (F58)', () => {
  assert.equal(tr('aeroport'), 'аэропорт');
  assert.equal(tr('Aeroport'), 'Аэропорт');
  assert.equal(tr('poeziya'), 'поэзия');
  assert.equal(tr('duet'), 'дуэт');
  assert.equal(tr('Eng uzun'), 'Энг узун');
  assert.equal(tr('esa'), 'эса');
  assert.equal(tr('ideal'), 'идеал');                  // i dan keyin — е
  assert.equal(tr('koeffitsiyent'), 'коэффициент');
  assert.equal(tr('Yer'), 'Ер');
  assert.equal(tr('IQ-ekspert'), 'IQ-эксперт');
  assert.equal(tr('Keyingi'), 'Кейинги');
});

test('litsenziya, atributsiya, URL va e-pochta oʻgirilmaydi (F28, F54)', () => {
  assert.equal(tr('UI asosi: Game Management App UI Kit (CC BY 4.0)'),
    'UI асоси: Game Management App UI Kit (CC BY 4.0)');
  assert.equal(tr('Interfeys asosi: Game Management App UI Kit (CC BY 4.0)'),
    'Интерфейс асоси: Game Management App UI Kit (CC BY 4.0)');
  assert.equal(tr('Shriftlar: Manrope, Space Grotesk (SIL Open Font License 1.1)'),
    'Шрифтлар: Manrope, Space Grotesk (SIL Open Font License 1.1)');
  assert.equal(tr('Litsenziya CC BY-SA 4.0'), 'Лицензия CC BY-SA 4.0');
  assert.equal(tr('Sertifikatni IQuest.uz beradi'), 'Сертификатни IQuest.uz беради');
  assert.equal(tr('Yozing: support@iquest.uz'), 'Ёзинг: support@iquest.uz');
  assert.equal(tr('Havola https://iquest.uz/shartlar/ da'), 'Ҳавола https://iquest.uz/shartlar/ да');
  assert.equal(tr('© 2026 IQuest · IQuest.uz'), '© 2026 IQuest · IQuest.uz');
});

test('brend, bosh harf, rim raqami va til nomlari saqlanadi', () => {
  assert.equal(tr('Olov III'), 'Олов III');
  assert.equal(tr('Mashqchi II'), 'Машқчи II');
  assert.equal(tr('Variant B'), 'Вариант B');
  assert.equal(tr('U haqida gap yoʻq.'), 'У ҳақида гап йўқ.');     // «U» olmoshi — harf varianti emas
  assert.equal(tr('Telegramda ochish'), 'Телеграмда очиш');
  assert.equal(tr('IQ test'), 'IQ тест');
  const c = load({ store: { 'nz-lang': 'uz-cyrl' } }).I;
  for (const n of ['Oʻzbekcha', 'Ўзбекча', 'Русский', 'English']) assert.equal(c.t(n), n);
  assert.equal(c.t('Eng uzun ketma-ketlik'), 'Энг узун кетма-кетлик');   // F59: «стреак» emas
});

test('transliteratsiya idempotent (kirill matn qayta oʻtsa oʻzgarmaydi)', () => {
  const once = tr('Bugungi mashq: 10 ta savol yoki bitta IQ oʻyini');
  assert.equal(tr(once), once);
});

test('til roʻyxati, nomlar va html lang', () => {
  const { I, attrs } = load({ store: { 'nz-lang': 'uz-cyrl' } });
  assert.deepEqual([...I.langs], ['uz', 'uz-cyrl', 'ru']);
  assert.deepEqual(Object.assign({}, I.labels), { 'uz': 'Oʻzbekcha', 'uz-cyrl': 'Ўзбекча', 'ru': 'Русский', 'en': 'English' });
  assert.equal(attrs.lang, 'uz-Cyrl');
  I.set('ru');
  assert.equal(attrs.lang, 'ru');
  assert.equal(attrs['data-lang'], 'ru');
});

test('EN darvozasi: nzLangs/nzSite/enable/push boʻlmasa ingliz tili yoʻq', () => {
  const closed = load({ store: { 'nz-lang': 'en' }, language: 'ru-RU' });
  assert.equal(closed.I.langs.indexOf('en'), -1);
  assert.equal(closed.I.get(), 'ru');                   // qurilma tiliga qaytadi
  assert.equal(closed.store['nz-lang'], 'en');          // tanlov oʻchirilmaydi
  assert.equal(closed.I.set('en'), 'ru');
  assert.equal(closed.I.t('Bosh'), 'Главная');

  const viaLangs = load({ nzLangs: ['uz', 'uz-cyrl', 'ru', 'en'], store: { 'nz-lang': 'en' } });
  assert.ok(viaLangs.I.langs.includes('en'));
  assert.equal(viaLangs.I.get(), 'en');
  assert.equal(viaLangs.I.t('Bosh'), 'Home');

  const viaSite = load({ nzSite: { langs: ['uz', 'uz-cyrl', 'ru', 'en'] } });
  assert.equal(viaSite.I.set('en'), 'en');

  const viaEnable = load();
  viaEnable.I.enable('en');
  assert.equal(viaEnable.I.set('en'), 'en');
  assert.equal(viaEnable.attrs.lang, 'en');

  const viaPush = load();
  viaPush.I.langs.push('en');
  assert.equal(viaPush.I.set('en'), 'en');

  const noDict = load({ en: false, nzLangs: ['uz', 'uz-cyrl', 'ru', 'en'] });
  assert.equal(noDict.I.langs.indexOf('en'), -1);       // nzEn yoʻq — til yoʻq
});

test('detect(): §4.3 qoidasi', () => {
  assert.equal(load({ language: 'ru-RU' }).I.detect(), 'ru');
  assert.equal(load({ language: 'uz-Cyrl-UZ' }).I.detect(), 'uz-cyrl');
  assert.equal(load({ language: 'uz-UZ' }).I.detect(), 'uz');
  assert.equal(load({ language: 'en-US' }).I.detect(), 'uz');          // darvoza yopiq
  assert.equal(load({ language: 'en-US', nzLangs: ['uz', 'uz-cyrl', 'ru', 'en'] }).I.detect(), 'en');
  assert.equal(load({ language: 'de-DE' }).I.detect(), 'uz');
  // Saqlangan til yoʻq — qurilma tili, lekin YOZILMAYDI.
  const fresh = load({ language: 'ru-RU' });
  assert.equal(fresh.I.get(), 'ru');
  assert.equal(fresh.store['nz-lang'], undefined);
  fresh.I.set('uz');
  assert.equal(fresh.store['nz-lang'], 'uz');
});

test('koʻplik: ru one/few/many, en one/other, uz qolip (F33, F56)', () => {
  const { I, w } = load({ nzLangs: ['uz', 'uz-cyrl', 'ru', 'en'] });
  I.set('ru');
  const ru = n => w.nzTN('+{0} ball', n);
  assert.equal(ru(1), '+1 балл');
  assert.equal(ru(21), '+21 балл');
  assert.equal(ru(2), '+2 балла');
  assert.equal(ru(22), '+22 балла');
  assert.equal(ru(5), '+5 баллов');
  assert.equal(ru(11), '+11 баллов');
  assert.equal(ru(12), '+12 баллов');
  assert.equal(ru(0), '+0 баллов');
  assert.equal(ru(1200), '+1 200 баллов');
  assert.equal(w.nzTN('{0} ligagacha {1} ball', 2, [I.t('Bronza'), I.num(2)]), 'До лиги «Бронза» осталось 2 балла');
  assert.equal(w.nzTN('{0} ligagacha {1} ball', 21, [I.t('Bronza'), I.num(21)]), 'До лиги «Бронза» остался 21 балл');
  assert.equal(I.plural('savol turi', 4), 'типа вопросов');
  assert.equal(I.plural('savol turi', 5), 'типов вопросов');
  assert.equal(w.nzTN('{0} tanga', 3), '3 монеты');
  assert.equal(I.t('+{0} ball'), '+{0} баллов');          // oddiy t() — «many»
  assert.equal(w.nzTN('{0}-daraja', 3), 'Уровень 3');       // oddiy satr ham ishlaydi

  I.set('en');
  assert.equal(w.nzTN('+{0} ball', 1), '+1 point');
  assert.equal(w.nzTN('+{0} ball', 22), '+22 points');
  assert.equal(w.nzTN('{0} ta savol', 1), '1 question');
  assert.equal(w.nzTN('{0} ta savol', 30), '30 questions');

  I.set('uz');
  assert.equal(w.nzTN('+{0} ball', 22), '+22 ball');
  assert.equal(w.nzTN('{0} ligagacha {1} ball', 5, ['Bronza', '5']), 'Bronza ligagacha 5 ball');
  I.set('uz-cyrl');
  assert.equal(w.nzTN('{0} ta savol', 3), '3 та савол');
});

test('category(): Intl bilan bir xil natija', () => {
  const { I } = load();
  const exp = { 1: 'one', 2: 'few', 4: 'few', 5: 'many', 11: 'many', 14: 'many', 21: 'one', 101: 'one', 111: 'many', 1.5: 'other' };
  for (const [n, c] of Object.entries(exp)) assert.equal(I.category(Number(n), 'ru'), c, n);
  assert.equal(I.category(1, 'en'), 'one');
  assert.equal(I.category(0, 'en'), 'other');
});

test('deep(): Raw kalit hech qachon oʻgirilmaydi (§8.1, §15.10)', () => {
  const { I } = load({ store: { 'nz-lang': 'uz-cyrl' } });
  const v = I.deep({ usernameRaw: 'Salom', bioRaw: 'Oʻzbek', listRaw: ['Salom'], title: 'Salom',
                     imgSrc: 'x.svg', helpUrl: 'maxfiylik/', theme: 'dark', rowStyle: { display: 'flex' },
                     items: [{ label: 'Mashq', nameRaw: 'Mashq' }] });
  assert.equal(v.usernameRaw, 'Salom');
  assert.equal(v.bioRaw, 'Oʻzbek');
  assert.deepEqual([...v.listRaw], ['Salom']);
  assert.equal(v.title, 'Салом');
  assert.equal(v.helpUrl, 'maxfiylik/');
  assert.equal(v.theme, 'dark');
  assert.equal(v.rowStyle.display, 'flex');
  assert.equal(v.items[0].label, 'Машқ');
  assert.equal(v.items[0].nameRaw, 'Mashq');
});

test('t(): fallback oʻzbekchaga, boʻsh joy bilan qidiruv, SVG yoʻli/CSS tegilmaydi', () => {
  const { I } = load({ store: { 'nz-lang': 'ru' } });
  assert.equal(I.t('Bu kalit lugʻatda yoʻq'), 'Bu kalit lugʻatda yoʻq');
  assert.equal(I.t('  Bosh  '), '  Главная  ');
  assert.equal(I.t('Aloqa'), 'Контакты');                   // F39, F60
  assert.equal(I.t('M9 11l3 3 5-5'), 'M9 11l3 3 5-5');
  assert.equal(I.t('var(--gold)'), 'var(--gold)');
});

/* ── Lugʻatlar yaxlitligi ──────────────────────────────────────────── */
function dicts() {
  const { w } = load();
  return { ru: w.nzRu, en: w.nzEn };
}
const holes = s => (String(s).match(/\{\d+\}/g) || []).sort().join(',');

test('lugʻat: kalit apostrofi ʻ/ʼ, qolip raqamlari mos, koʻplik kategoriyalari toʻgʻri', () => {
  const D = dicts();
  for (const [L, d] of Object.entries(D)) {
    const cats = L === 'ru' ? ['few', 'many', 'one'] : ['one', 'other'];
    for (const [k, v] of Object.entries(d)) {
      assert.ok(!/['’‘`]/.test(k), `${L}: kalitda ASCII/typografik apostrof: ${k}`);
      const forms = typeof v === 'string' ? [v] : Object.values(v);
      if (typeof v !== 'string') assert.deepEqual(Object.keys(v).sort(), cats, `${L} ${k}: koʻplik shakllari`);
      for (const f of forms) {
        assert.equal(typeof f, 'string', `${L} ${k}`);
        assert.ok(f.trim(), `${L} ${k}: boʻsh`);
        assert.equal(holes(f), holes(k), `${L} ${k}: {n} oʻrinlari mos emas`);
      }
    }
  }
});

test('lugʻat: en da kirill va ʻ/ʼ yoʻq; ru da oʻzbek harflari yoʻq; terminlar', () => {
  const D = dicts();
  for (const [k, v] of Object.entries(D.en)) {
    for (const f of typeof v === 'string' ? [v] : Object.values(v)) {
      assert.ok(!/[Ѐ-ӿ]/.test(f), `en ${k}: kirill`);
      assert.ok(!/[ʻʼ]/.test(f), `en ${k}: oʻzbek belgisi`);
      assert.ok(!/\bIQ points?\b/i.test(f), `en ${k}: IQ «points» emas`);
    }
  }
  for (const [k, v] of Object.entries(D.ru)) {
    for (const f of typeof v === 'string' ? [v] : Object.values(v)) {
      assert.ok(!/[ўқғҳЎҚҒҲʻʼ]/.test(f), `ru ${k}: oʻzbek harfi`);
      assert.ok(!/(^|[^\p{L}])очк/iu.test(f), `ru ${k}: «очки» emas, «баллы»`);
      assert.ok(!/балл\p{L}* IQ|IQ-балл/iu.test(f), `ru ${k}: IQ natijasi «балл» emas`);
    }
  }
  // Glossariy (§8.5)
  const g = { 'Bosh': 'Home', 'Mashq': 'Practice', 'Reyting': 'League', 'Profil': 'Profile', 'Kunlik vazifalar': 'Daily quests',
              'Xatolarim': 'My mistakes', 'Saqlangan': 'Saved', 'IQ oʻyinlari': 'IQ games', 'Aql oʻyini': 'Brain game',
              'Doʻkon': 'Shop', 'Nishonlar': 'Badges', 'Vitrina': 'Showcase', 'Sozlamalar': 'Settings', 'Eslatma': 'Reminder',
              'Boshlovchi': 'Beginner', 'Bronza': 'Bronze', 'Kumush': 'Silver', 'Oltin': 'Gold', 'Platina': 'Platinum', 'Olmos': 'Diamond' };
  for (const [uz, en] of Object.entries(g)) assert.equal(D.en[uz], en, `glossariy: ${uz}`);
  assert.equal(D.en['Oraliq {0}–{1}'], 'Range {0}–{1}');
  assert.equal(D.ru['Eng uzun ketma-ketlik'], 'Лучшая серия');
  assert.equal(D.en['Eng uzun ketma-ketlik'], 'Longest streak');
});

test('ru va en lugʻat kalitlari bir xil toʻplam (bir til unutilmaydi)', () => {
  const D = dicts();
  const ru = new Set(Object.keys(D.ru)), en = new Set(Object.keys(D.en));
  assert.deepEqual([...ru].filter(k => !en.has(k)), [], 'ru da bor, en da yoʻq');
  assert.deepEqual([...en].filter(k => !ru.has(k)), [], 'en da bor, ru da yoʻq');
});
