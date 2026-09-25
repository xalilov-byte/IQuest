/* ─────────────────────────────────────────────────────────────────────────
   CATALOG — DOʻKON VA IQTISODNING BITTA JADVALI (window.nzCatalog)

   Bu fayl hech narsani saqlamaydi va hech kimning holatiga tegmaydi:
   u faqat maʼlumot. Iqtisodning har bir raqami (narx, mukofot, vazifa
   maqsadi) shu yerda turadi (ARXITEKTURA §6.7). Raqam ikki joyda
   yozilsa, ertaga biri oʻzgaradi, ikkinchisi esa eskicha qoladi — va
   Doʻkonda bir narx, Xarid varagʻida boshqa narx chiqadi.

   QOIDALAR:

   1. PUL BILAN SOTILMAYDI. Tanga faqat oʻynab olinadi (§6.3). Bu
      jadvalda IAP, «paket», «chegirma» yoki tasodifiy quti yoʻq.
      Narxlar qatʼiy va doim koʻrinadi.

   2. BEPUL RANGLAR SAQLANMAYDI. Ular hamyonda «sotib olingan» deb
      yozilmaydi — bepulligi shu jadvaldan kelib chiqadi. Shunda
      ertaga bepul rang qoʻshilsa, hamyonga migratsiya kerak boʻlmaydi.

   3. KONTRAST ISBOTLANADI. Har rangning `on` qiymati — rang ustidagi
      bosh harf rangi. U rangga (gradientda har ikki toʻxtashga) nisbatan
      WCAG boʻyicha ≥ 3:1 boʻlishi shart (katta qalin matn). Bu
      tests/catalog.test.mjs da hisoblanadi, qoʻlda yozilgan songa
      ishonilmaydi.

   4. YANGI JAVON = JADVALGA BITTA QATOR. `SHELVES` ga yangi javon
      (masalan avatar ramkalari) qoʻshilsa, `item()`, hamyondagi
      `owned` va Doʻkon segmenti oʻzi ishlaydi (§6.7).

   Matnlar {uz, ru, en}. Oʻzbekcha matn — manba satr (§8.1): lugʻat
   undan kalit sifatida foydalanishi mumkin, kirill yozuvi esa
   transliteratsiya bilan chiqadi.
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  'use strict';

  const L = (uz, ru, en) => ({ uz: uz, ru: ru, en: en });

  /* ── Profil ranglari — 12 ta (§6.7) ──────────────────────────────────
     stops — bitta rang yoki gradientning ikki toʻxtashi. hex — asosiy
     rang (halqa, soya va bitta rang kerak boʻlgan joylar uchun).
     Kontrast qiymati izohda: u testda qayta hisoblanadi. */
  const COLORS = [
    { id: 'purple',   name: L('Binafsha', 'Фиолетовый', 'Purple'),  stops: ['#8552F0'], on: '#FFFFFF', price: 0 },   // 4.71
    { id: 'blue',     name: L('Koʻk', 'Синий', 'Blue'),             stops: ['#3D5EFF'], on: '#FFFFFF', price: 0 },   // 4.95
    { id: 'teal',     name: L('Firuza', 'Бирюзовый', 'Teal'),       stops: ['#22B8B0'], on: '#0B3230', price: 0 },   // 5.65
    { id: 'green',    name: L('Yashil', 'Зелёный', 'Green'),        stops: ['#4CC38A'], on: '#0B2C1E', price: 0 },   // 6.80
    { id: 'pink',     name: L('Pushti', 'Розовый', 'Pink'),         stops: ['#FF6FA5'], on: '#4A1029', price: 0 },   // 5.77
    { id: 'gold',     name: L('Sariq', 'Жёлтый', 'Yellow'),         stops: ['#FFA726'], on: '#2A1B00', price: 0 },   // 8.61
    { id: 'red',      name: L('Qizil', 'Красный', 'Red'),           stops: ['#E5484D'], on: '#FFFFFF', price: 150 }, // 3.91
    { id: 'sky',      name: L('Osmon', 'Небесный', 'Sky'),          stops: ['#38BDF8'], on: '#082F49', price: 150 }, // 6.48
    { id: 'graphite', name: L('Grafit', 'Графит', 'Graphite'),      stops: ['#3A3850'], on: '#FFFFFF', price: 150 }, // 11.28
    { id: 'cherry',   name: L('Olcha', 'Вишня', 'Cherry'),          stops: ['#B4235A'], on: '#FFFFFF', price: 150 }, // 6.31
    { id: 'dawn',     name: L('Shafaq', 'Заря', 'Dawn'),            stops: ['#FF6FA5', '#FFA726'], angle: 135, on: '#2A1B00', price: 300 }, // 6.43 / 8.61
    { id: 'night',    name: L('Tun', 'Ночь', 'Night'),              stops: ['#3D5EFF', '#8552F0'], angle: 135, on: '#FFFFFF', price: 300 }, // 4.95 / 4.71
  ];
  COLORS.forEach(c => { c.hex = c.stops[0]; c.gradient = c.stops.length > 1; });

  /* ── Kolleksiya nishonlari — 8 ta (§6.7) ─────────────────────────────
     Bular aniq «sotib olingan» nishon: yumaloq medalyon, tanga
     rangidagi halqa. Yutuq nishonlari (src/badges.js) esa olti burchakli
     va faqat oʻynab olinadi — ularni sotib olib boʻlmaydi (§6.1).
     id — src/art.js dagi emblema nomi ham. Yutuq id lari bilan
     toʻqnashmaydi (vitrina ikkalasini bitta roʻyxatda saqlaydi). */
  const COLLECTION = [
    { id: 'compass',  name: L('Kompas', 'Компас', 'Compass'),               price: 300 },
    { id: 'rocket',   name: L('Raketa', 'Ракета', 'Rocket'),                price: 300 },
    { id: 'knight',   name: L('Shaxmat oti', 'Конь', 'Knight'),   price: 400 },
    { id: 'maze',     name: L('Labirint', 'Лабиринт', 'Maze'),              price: 400 },
    { id: 'crystal',  name: L('Kristall', 'Кристалл', 'Crystal'),           price: 500 },
    { id: 'planet',   name: L('Sayyora', 'Планета', 'Planet'),              price: 500 },
    { id: 'tangram',  name: L('Tangram', 'Танграм', 'Tangram'),             price: 700 },
    { id: 'infinity', name: L('Cheksizlik', 'Вечность', 'Infinity'),   price: 800 },
  ];
  COLLECTION.forEach(b => { b.shape = 'round'; });

  /* ── Javonlar ────────────────────────────────────────────────────────
     kind — xarid id sining oldi qoʻshimchasi: 'color:red', 'badge:compass'.
     id — hamyondagi `owned` kaliti: owned.colors, owned.badges. */
  const SHELVES = [
    { id: 'colors', kind: 'color', label: L('Ranglar', 'Цвета', 'Colors'),   items: COLORS },
    { id: 'badges', kind: 'badge', label: L('Nishonlar', 'Значки', 'Badges'), items: COLLECTION },
  ];

  /* ── Mukofotlar va vazifa maqsadlari (§6.3–§6.5) ─────────────────────
     weekly — liga darajasi indeksi boʻyicha (Main dagi LEAGUES tartibi:
     Boshlovchi, Bronza, Kumush, Oltin, Platina, Olmos).
     Daromad hech qachon orqaga qarab kamaytirilmaydi (§16.3). */
  const REWARDS = { welcome: 50, quest: 10, weekly: [0, 10, 25, 40, 60, 100] };
  const QUESTS = { practice: 10, game: 1, fix: 3, type: 5 };

  /* Kunlik vazifa nomlari — Bosh sahifadagi H4 qatorlari (§3.1).
     q3b nomi turga bogʻliq: «{0} mashqi», {0} — tur nomi. */
  const QUEST_TEXT = {
    practice: { name: L('Bugungi mashq', 'Тренировка дня', 'Daily practice'),
                unit: L('{0}/{1} savol', 'Вопросы: {0}/{1}', 'Questions: {0}/{1}') },
    game:     { name: L('Aql oʻyini', 'Игра для ума', 'Brain game'),
                unit: L('Kun oʻyini: {0}', 'Игра: {0}', 'Today: {0}') },
    fix:      { name: L('Xatolarni tuzating', 'Исправьте ошибки', 'Fix your mistakes'),
                unit: L('{0}/{1} savol', 'Вопросы: {0}/{1}', 'Questions: {0}/{1}') },
    type:     { name: L('{0} mashqi', 'Тренировка: {0}', '{0} practice'),
                unit: L('{0}/{1} savol', 'Вопросы: {0}/{1}', 'Questions: {0}/{1}') },
  };

  /* Nomlar tor joyga sigʻishi kerak (360 px): Doʻkon plitkasida ru/en
     nom ≤ 10 belgi, Bosh sahifa qatorida oʻyin nomi oldidagi yorliq qisqa. */

  /* «Tanga qanday olinadi» varagʻi (§3.8) — 3 qator. Raqamlar
     yuqoridagi jadvaldan olinadi, matnda qoʻlda yozilmaydi. */
  const COIN_HELP = [
    { id: 'quests', text: L('Kunlik vazifalar — kuniga {0} gacha', 'Ежедневные задания — до {0} в день', 'Daily quests — up to {0} a day'),
      value: 3 * REWARDS.quest },
    { id: 'badges', text: L('Nishonlar — bir martalik mukofot', 'Значки — разовая награда', 'Badges — one-time reward'),
      value: null },
    { id: 'week',   text: L('Hafta yakuni — ligaga qarab {0} gacha', 'Итог недели — до {0} в зависимости от лиги', 'Week end — up to {0} by league'),
      value: Math.max.apply(null, REWARDS.weekly) },
  ];

  /* Hammasi muzlatiladi: statik maʼlumotni hech bir modul oʻzgartira
     olmasligi kerak (bittasi narxni «vaqtincha» oʻzgartirsa, hamma
     joyda oʻzgaradi). */
  function freeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(k => freeze(o[k]));
    }
    return o;
  }
  freeze(COLORS); freeze(COLLECTION); freeze(SHELVES); freeze(REWARDS);
  freeze(QUESTS); freeze(QUEST_TEXT); freeze(COIN_HELP);

  const ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
  const DEFAULT_COLOR = 'purple';

  function shelfByKind(kind) {
    for (let i = 0; i < SHELVES.length; i++) if (SHELVES[i].kind === kind) return SHELVES[i];
    return null;
  }

  /* 'color:red' → { itemId, kind, shelf, id, name, price, free, entry }.
     Notoʻgʻri yoki notanish id → null (ishonchsiz kirish: u diskdan yoki
     bosilgan tugmadan kelishi mumkin). */
  function item(itemId) {
    if (typeof itemId !== 'string' || itemId.length > 64) return null;
    const i = itemId.indexOf(':');
    if (i <= 0) return null;
    const shelf = shelfByKind(itemId.slice(0, i));
    const id = itemId.slice(i + 1);
    if (!shelf || !ID_RE.test(id)) return null;
    for (let k = 0; k < shelf.items.length; k++) {
      const e = shelf.items[k];
      if (e.id === id) {
        return { itemId: shelf.kind + ':' + id, kind: shelf.kind, shelf: shelf.id, id: id,
                 name: e.name, price: e.price, free: !(e.price > 0), entry: e };
      }
    }
    return null;
  }

  function color(id) {
    for (let i = 0; i < COLORS.length; i++) if (COLORS[i].id === id) return COLORS[i];
    return null;
  }

  /* CSS fon qiymati. Notanish rang → standart rang (Binafsha): profil
     boʻsh fonsiz chizilmasligi kerak. */
  function css(id) {
    const c = color(id) || color(DEFAULT_COLOR);
    return c.gradient
      ? 'linear-gradient(' + (c.angle || 135) + 'deg, ' + c.stops.join(', ') + ')'
      : c.hex;
  }

  /* WCAG 2.x nisbiy yorqinlik va kontrast. Art va test uchun ochiq. */
  function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return null;
    const ch = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    if (x === null || y === null) return null;
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /* Doʻkonning umumiy hajmi (§6.7: 5 100) — faqat pulli narsalar. */
  function total(shelfId) {
    let sum = 0;
    SHELVES.forEach(s => {
      if (shelfId && s.id !== shelfId) return;
      s.items.forEach(e => { if (e.price > 0) sum += e.price; });
    });
    return sum;
  }

  root.nzCatalog = freeze({
    v: 1,
    colors: COLORS,
    badges: COLLECTION,
    shelves: SHELVES,
    rewards: REWARDS,
    quests: QUESTS,
    questText: QUEST_TEXT,
    coinHelp: COIN_HELP,
    defaultColor: DEFAULT_COLOR,
    item: item,
    color: color,
    css: css,
    contrast: contrast,
    total: total,
    freeColors: function () { return COLORS.filter(c => !(c.price > 0)).map(c => c.id); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
