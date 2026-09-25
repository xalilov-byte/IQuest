/* ─────────────────────────────────────────────────────────────────────────
   BAZA QATLAMI — og'zaki savollarni yangilash va natijalarni yuborish

   ASOSIY QAROR: ilova bazaga BOG'LIQ EMAS.

   Savollarning asosiy qismi qurilmada yaratiladi (src/iq/gen/), og'zaki
   savollar esa APK ichida keladi (content/verbal.json → window.IQ_VERBAL).
   Baza faqat ikki narsa beradi:

     1. Og'zaki savollar yangilanishi. Xodim ko'rib chiqib nashr etgan
        savollar (published_verbal) APK ichidagilar USTIGA qo'yiladi:
          · bir xil kalit — bazadagisi ustun (tuzatilgan kalit/matn);
          · yangi kalit — qo'shiladi;
          · arxivlangan kalit — APK ichidagisi ham olib tashlanadi (aks
            holda noto'g'ri savolni olib tashlashning yagona yo'li yangi
            APK bo'lardi).
        Birlashtirish, almashtirish emas: bazada hozircha bitta savol
        nashr etilgan bo'lsa ham, ilova qolgan savollarsiz qolmaydi.

     2. Test natijalarini foydalanuvchining hisobiga saqlash — faqat
        tizimga KIRGAN bo'lsa, navbat orqali (internet yo'q bo'lsa keyin).

   Holatlar:
     · supabase/config.json bo'sh     → HECH QANDAY so'rov yo'q
     · internet yo'q / baza javob bermadi → oxirgi saqlangan nusxa yoki APK
     · buzuq javob                     → e'tiborsiz, APK to'plami qoladi
     · hammasi yaxshi                  → nashr etilgan savollar qo'shiladi

   Ichki nomlar (nzData, nz-…) Nazariy dvigatelidan — CONTRACT.md bo'yicha
   o'zgartirilmaydi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const CACHE_KEY = 'nz-verbal';
  /* Versiya oshirilsa saqlangan nusxa tashlab yuboriladi (shakl o'zgarsa —
     eski kesh yangi kod bilan noto'g'ri o'qilmasin). */
  const CACHE_VERSION = 1;
  const OUTBOX_KEY = 'nz-outbox';
  const TIMEOUT_MS = 8000;
  /* Saqlangan nusxa shu muddatdan yosh bo'lsa, tarmoqqa UMUMAN chiqilmaydi:
     savollar bazasi kuniga bir necha marta o'zgarmaydi, ilova esa kuniga
     bir necha marta ochiladi. Har ochilishda so'rov — behuda trafik. */
  const FRESH_MS = 6 * 60 * 60 * 1000;   // 6 soat

  /* Bazadagi cheklovlar bilan bir xil (supabase/migrations/0002, 0003).
     Klient ham tekshiradi: javob noto'g'ri deploy'dan, kesh esa qo'lda
     tahrirdan buzilgan bo'lishi mumkin — baza bunga kafolat bermaydi. */
  const KINDS = ['analogy', 'odd', 'category', 'relation'];
  const OPTIONS_MIN = 4, OPTIONS_MAX = 6;
  const KEY_RE = /^v[0-9]{3,6}$/;
  const TYPE_RE = /^[a-z]{2,16}$/;
  const ITEM_ID_RE = /^([a-z]{2,16}):([1-9]|10):[A-Za-z0-9_-]{1,24}$/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const DAY_MS = 24 * 60 * 60 * 1000;

  /* Navbat chegaralari: yuborilmagan natijalar qurilmada cheksiz
     to'planmasin (localStorage ~5 MB — to'lsa progress ham yozilmay qoladi). */
  const OUTBOX_MAX = 50;
  const OUTBOX_AGE_MS = 30 * DAY_MS;

  const cfg = window.nzSupabase || null;     // build.mjs joylashtiradi
  const configured = !!(cfg && cfg.url && cfg.publishableKey);

  /* APK ichidagi to'plam — birlashtirish asosi. Nusxa olinadi: kimdir
     window.IQ_VERBAL ni keyin o'zgartirsa ham asos buzilmasin. */
  let bundled = null;
  try {
    const b = window.IQ_VERBAL;
    if (b && Array.isArray(b.items)) bundled = JSON.parse(JSON.stringify(b));
  } catch (e) { bundled = null; }

  /* Holat — sozlamalar yoki diagnostika uchun:
       bundled — APK ichidagi to'plam
       cache   — qurilmada saqlangan nusxa qo'llangan
       live    — bazadan hozir olingan qo'llangan
       error   — bazaga murojaat muvaffaqiyatsiz (to'plam o'zgarmadi) */
  let status = 'bundled';
  let pending = null;        // olingan, lekin hali qo'llanmagan ({ items, retired })

  function log(msg) {
    try { console.info('[nzData] ' + msg); } catch (e) {}
  }

  /* ── Kelgan ma'lumot shakli ───────────────────────────────────────────
     Bazadan kelgan javob ham, saqlangan nusxa ham ISHONCHSIZ manba.

     Nazariy'dan saboq (haqiqatan sodir bo'lgan): buzuq javob keshga
     yozildi → keyingi ochilishda kesh "yangi" hisoblandi → ilova
     tarmoqqa chiqmadi → buzuqlik o'zini o'zi tuzata olmadi. Shuning
     uchun: kesh faqat tekshiruvdan KEYIN yoziladi va o'qilganda ham
     qayta tekshiriladi; buzuq kesh o'chiriladi.

     Buzuq qatorlar tashlab yuboriladi, butun javob emas. Lekin birorta
     ham yaroqli qator qolmasa — javob umuman ishlatilmaydi. */
  const str = (s, max) => typeof s === 'string' && s.trim() !== '' && s.length <= max;
  const normOpt = s => s.trim().replace(/\s+/g, ' ').toLowerCase();

  function sideOk(t) {
    if (!t || typeof t !== 'object') return false;
    if (!str(t.prompt, 300)) return false;
    if (t.stimulus !== undefined && t.stimulus !== null && !str(t.stimulus, 300)) return false;
    const o = t.options;
    if (!Array.isArray(o) || o.length < OPTIONS_MIN || o.length > OPTIONS_MAX) return false;
    if (!o.every(x => str(x, 120))) return false;
    /* Ikki bir xil variant — ikkalasi ham "to'g'ri" bo'lib qolishi mumkin. */
    return new Set(o.map(normOpt)).size === o.length;
  }

  function saneItem(r) {
    if (!r || typeof r !== 'object' || typeof r.key !== 'string' || !KEY_RE.test(r.key)) return null;
    if (r.retired === true) return { retired: r.key };
    if (KINDS.indexOf(r.kind) === -1) return null;
    if (!Number.isInteger(r.level) || r.level < 1 || r.level > 10) return null;
    if (!sideOk(r.uz) || !sideOk(r.ru)) return null;
    /* Kalit — o'rin raqami, matn esa boshqa tildagi massivda: sonlar mos
       kelmasa rus tilidagi odam boshqa javobni bosadi. */
    if (r.uz.options.length !== r.ru.options.length) return null;
    const hasStim = t => t.stimulus !== undefined && t.stimulus !== null;
    if (hasStim(r.uz) !== hasStim(r.ru)) return null;
    if (!Number.isInteger(r.correct) || r.correct < 0 || r.correct >= r.uz.options.length) return null;
    if (!r.explain || !str(r.explain.uz, 600) || !str(r.explain.ru, 600)) return null;

    const side = t => {
      const o = { prompt: t.prompt, options: t.options.slice() };
      if (hasStim(t)) o.stimulus = t.stimulus;
      return o;
    };
    return {
      key: r.key, kind: r.kind, level: r.level,
      uz: side(r.uz), ru: side(r.ru),
      correct: r.correct,
      explain: { uz: r.explain.uz, ru: r.explain.ru },
      /* Bazada nashr etilgan savolni tizimga kirgan xodim — mazmun
         muallifidan BOSHQA odam — ko'rib chiqqan (to'rt ko'z qoidasi,
         bazada majburlanadi). CONTRACT §2 dagi `reviewed` aynan shu. */
      reviewed: true,
    };
  }

  function sane(rows) {
    if (!Array.isArray(rows)) return null;
    const items = [], retired = [];
    rows.forEach(r => {
      const x = saneItem(r);
      if (!x) return;
      if (x.retired) retired.push(x.retired);
      else items.push(x);
    });
    const good = items.length + retired.length;
    if (rows.length && !good) return null;
    if (good < rows.length) log((rows.length - good) + ' ta buzuq qator tashlab yuborildi');
    return { items: items, retired: retired };
  }

  /* ── Qurilmada saqlash ─────────────────────────────────────────────── */
  function readCache() {
    try {
      const s = localStorage.getItem(CACHE_KEY);
      if (!s) return null;
      const d = JSON.parse(s);
      if (!d || d.v !== CACHE_VERSION || !Array.isArray(d.rows)) return null;
      return d;
    } catch (e) { return null; }
  }

  function dropCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  function writeCache(got) {
    try {
      const rows = got.items.concat(got.retired.map(k => ({ key: k, retired: true })));
      localStorage.setItem(CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, at: Date.now(), rows: rows }));
    } catch (e) {
      // Joy yetmasa — saqlamaymiz; ilova baribir ishlaydi.
      log('saqlab boʻlmadi: ' + (e && e.name));
    }
  }

  /* ── Birlashtirish ─────────────────────────────────────────────────── */
  function merge(got) {
    const byKey = new Map(got.items.map(i => [i.key, i]));
    const gone = new Set(got.retired);
    const seen = new Set();
    const out = [];
    const base = (bundled && bundled.items) || [];
    base.forEach(b => {
      if (!b || typeof b.key !== 'string' || gone.has(b.key) || seen.has(b.key)) return;
      seen.add(b.key);
      out.push(byKey.get(b.key) || b);
    });
    got.items.forEach(i => {
      if (!seen.has(i.key) && !gone.has(i.key)) { seen.add(i.key); out.push(i); }
    });
    return { version: (bundled && bundled.version) || 1, items: out };
  }

  /* Test davom etayotganda to'plam ALMASHTIRILMAYDI: savollar urug'
     (seed) bo'yicha to'plamdan tanlanadi — to'plam o'zgarsa, davom
     ettirilgan sessiya boshqa savollarni ko'rsatardi. Bunday holda
     yangilanish `pending` da kutadi va keyingi xavfsiz paytda qo'llanadi. */
  function apply(got, canSwap, onSwap) {
    pending = got;
    if (!canSwap()) return false;
    pending = null;
    if (!got.items.length && !got.retired.length) return true;   // o'zgarish yo'q
    const merged = merge(got);
    if (!merged.items.length) return false;                        // bo'sh to'plam — bo'sh ekran
    window.IQ_VERBAL = merged;
    try { onSwap(); } catch (e) { log('onSwap: ' + (e && e.message)); }
    return true;
  }

  /* ── Tarmoq ────────────────────────────────────────────────────────── */
  async function request(path, opts) {
    opts = opts || {};
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    const headers = { apikey: cfg.publishableKey, Accept: 'application/json' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.prefer) headers.Prefer = opts.prefer;
    try {
      return await fetch(cfg.url + '/rest/v1/' + path, {
        method: opts.body !== undefined ? 'POST' : 'GET',
        headers: headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchVerbal() {
    /* Faqat ko'rinish — jadvalning o'zi (verbal_items) emas: ko'rinish
       klient kutgan shaklni beradi va ichki maydonlarni chiqarmaydi. */
    const res = await request('published_verbal?select=key,kind,level,uz,ru,correct,explain,retired&order=key.asc');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  /* ═══ NATIJALAR NAVBATI ═══════════════════════════════════════════════
     Nima uchun navbat: test oxirida internet bo'lmasligi mumkin (metro,
     qishloq). Natija qurilmada saqlanadi va keyingi imkoniyatda yuboriladi.

     Qoidalar:
       · Tizimga kirmagan — HECH NARSA yuborilmaydi va navbatga ham
         qo'yilmaydi. Keyin kim kirsa, o'shaning hisobiga boshqa odamning
         (masalan umumiy planshetdagi) natijasi tushib qolmasin.
       · Har yozuv kimniki ekanini eslaydi (uid) va faqat o'sha odam
         kirganda yuboriladi.
       · Har natijaning o'z client_id si bor: server yozib, javob yetib
         bormasa, qayta yuborish ikkinchi nusxa yaratmaydi (bazada
         unique (user_id, client_id)).
       · Doimiy xato (400 — bazadagi CHECK, kunlik chegara; 403) —
         yozuv tashlanadi: aks holda u navbat boshida abadiy qolib, qolgan
         hammasini to'sardi. Vaqtinchalik xato (tarmoq, 401 — token
         eskirgan, 404 — migratsiya hali qo'llanmagan, 5xx) — qoladi. */
  let session = null;        // { access_token, user_id, expires_at }
  let flushing = null;

  function uuid() {
    const c = (typeof crypto !== 'undefined') ? crypto : null;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    const b = new Uint8Array(16);
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  const isInt = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
  const isNum = (x, a, b) => typeof x === 'number' && isFinite(x) && x >= a && x <= b;

  function cleanByType(o, n, c) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const keys = Object.keys(o);
    if (keys.length > 8) return null;
    const out = {};
    let sn = 0, sc = 0;
    for (const k of keys) {
      const v = o[k];
      if (!TYPE_RE.test(k) || !v || !isInt(v.n, 0, 200) || !isInt(v.correct, 0, v.n)) return null;
      out[k] = { n: v.n, correct: v.correct };
      sn += v.n; sc += v.correct;
    }
    return (sn <= n && sc <= c) ? out : null;
  }

  /* Result (CONTRACT §3) → test_results qatori. Bazadagi CHECK'lar bilan
     bir xil: yaroqsiz natija navbatga umuman kirmaydi (400 bilan qaytib,
     tashlanishini kutmasdan). `items` bu yerga TUSHMAYDI — ular anonim
     jadval uchun (toResponses). */
  function toRow(r) {
    if (!r || typeof r !== 'object') return null;
    if (r.mode !== 'test' && r.mode !== 'practice') return null;
    if (!isInt(r.n, 1, 200) || !isInt(r.correct, 0, r.n)) return null;
    if (!isInt(r.iq, 55, 145) || !isInt(r.lo, 55, 145) || !isInt(r.hi, 55, 145)) return null;
    if (!(r.lo <= r.iq && r.iq <= r.hi)) return null;
    if (!isNum(r.theta, -6, 6) || !isNum(r.se, 0, 2) || !(r.se > 0)) return null;
    if (typeof r.reliable !== 'boolean') return null;
    const bt = cleanByType(r.byType, r.n, r.correct);
    if (!bt) return null;
    /* Davomiylik: sessiya yopilib, kunlar o'tib davom ettirilgan bo'lishi
       mumkin. 24 soatdan uzun vaqt ma'nosiz — natijani yo'qotish o'rniga
       chegaraga keltiriladi. */
    let d = Math.round(Number(r.durationMs));
    if (!isFinite(d) || d < 0) d = 0;
    if (d > DAY_MS) d = DAY_MS;
    return {
      client_id: null, mode: r.mode,
      iq: r.iq, lo: r.lo, hi: r.hi, theta: r.theta, se: r.se,
      n: r.n, correct: r.correct, reliable: r.reliable,
      by_type: bt, duration_ms: d,
    };
  }

  /* Result.items → anonim kalibrlash javoblari. Bittasi yaroqsiz bo'lsa
     butun sessiya tashlanadi — yarim sessiya kalibrlashni buzadi (baza
     ham xuddi shunday qiladi). Sessiya id'si YANGI tasodifiy uuid: u
     natija (client_id) bilan hech qayerda bog'lanmaydi. */
  function toResponses(r) {
    const items = r && r.items;
    if (!Array.isArray(items) || items.length < 1 || items.length > 200) return null;
    const rows = [];
    for (const it of items) {
      const m = it && typeof it.id === 'string' ? ITEM_ID_RE.exec(it.id) : null;
      if (!m || it.type !== m[1] || it.level !== Number(m[2])) return null;
      if (!isNum(it.b, -4, 4) || typeof it.correct !== 'boolean') return null;
      let ms = Math.round(Number(it.ms));
      if (!isFinite(ms) || ms < 0) return null;
      if (ms > 600000) ms = 600000;
      const row = { item_id: it.id, type: it.type, level: it.level, b: it.b, correct: it.correct, ms: ms };
      if (it.k !== undefined) {
        if (!isInt(it.k, 2, 8)) return null;
        row.k = it.k;
      }
      rows.push(row);
    }
    return { session: uuid(), rows: rows };
  }

  function readOutbox() {
    try {
      const d = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      if (!Array.isArray(d)) return [];
      const now = Date.now();
      return d.filter(e => e && typeof e === 'object'
        && typeof e.id === 'string' && UUID_RE.test(e.id)
        && typeof e.uid === 'string' && UUID_RE.test(e.uid)
        && typeof e.at === 'number' && now - e.at < OUTBOX_AGE_MS
        && (e.row === null || (e.row && typeof e.row === 'object'))
        && (e.resp === null || (e.resp && typeof e.resp === 'object'
                                && typeof e.resp.session === 'string' && Array.isArray(e.resp.rows)))
        && (e.row || e.resp));
    } catch (e) { return []; }
  }

  function writeOutbox(box) {
    try {
      if (box.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(box.slice(-OUTBOX_MAX)));
      else localStorage.removeItem(OUTBOX_KEY);
    } catch (e) { log('navbat saqlanmadi: ' + (e && e.name)); }
  }

  /* Navbat har o'zgarishda diskdan QAYTA o'qiladi: yuborish (await)
     paytida yangi natija qo'shilgan bo'lishi mumkin. */
  function editOutbox(fn) { writeOutbox(fn(readOutbox())); }

  const tokenFresh = () => !!(session && (!session.expires_at || session.expires_at > Date.now() + 5000));

  // Natija: 'ok' | 'retry' | 'drop'
  async function post(path, body, prefer) {
    let res;
    try {
      res = await request(path, { body: body, token: session.access_token, prefer: prefer });
    } catch (e) {
      log('yuborilmadi (tarmoq): ' + (e && e.message));
      return 'retry';
    }
    if (res.ok || res.status === 409) return 'ok';            // 409 — allaqachon bor
    if (res.status === 401 || res.status === 404 || res.status === 408
        || res.status === 429 || res.status >= 500) return 'retry';
    log('yozuv rad etildi (HTTP ' + res.status + ') — navbatdan olib tashlandi');
    return 'drop';
  }

  async function doFlush() {
    if (!configured || !tokenFresh()) return 0;
    const uid = session.user_id;
    let sent = 0;
    for (let guard = 0; guard < OUTBOX_MAX + 5; guard++) {
      if (!session || session.user_id !== uid || !tokenFresh()) break;
      const e = readOutbox().find(x => x.uid === uid);
      if (!e) break;

      if (e.row) {
        const r = await post('test_results?on_conflict=user_id,client_id', e.row,
                             'return=minimal,resolution=ignore-duplicates');
        if (r === 'retry') break;
        if (r === 'ok') sent++;
        // Natija yetib bordi (yoki doimiy rad etildi) — qayta yuborilmaydi.
        editOutbox(box => box
          .map(x => (x.id === e.id ? Object.assign({}, x, { row: null }) : x))
          .filter(x => x.row || x.resp));
      }
      if (e.resp) {
        const r = await post('rpc/submit_item_responses', { p_session: e.resp.session, p_rows: e.resp.rows });
        if (r === 'retry') break;
        editOutbox(box => box.filter(x => x.id !== e.id));
      }
    }
    return sent;
  }

  function flush() {
    if (flushing) return flushing;
    flushing = doFlush()
      .catch(e => { log('navbat: ' + (e && e.message)); return 0; })
      .then(n => { flushing = null; return n; });
    return flushing;
  }

  window.nzData = {
    status: function () { return status; },
    count: function () {
      const v = window.IQ_VERBAL;
      return (v && Array.isArray(v.items)) ? v.items.length : 0;
    },

    /* Til almashganda chaqiriladi (bootstrap.js). Og'zaki savollarda ikkala
       til bitta yozuvda, qayta yig'ish shart emas. Lekin bu xavfsiz payt
       (test yo'q) — test davomida kelib, kutib turgan yangilanish shu
       yerda qo'llanadi. true — ekranni qayta chizish kerak. */
    applyLang: function () {
      if (!pending) return false;
      const got = pending;
      pending = null;
      if (!got.items.length && !got.retired.length) return false;
      const merged = merge(got);
      if (!merged.items.length) return false;
      window.IQ_VERBAL = merged;
      return true;
    },

    /* Og'zaki savollarni yangilaydi, keyin navbatdagi natijalarni yuboradi.
       canSwap — hozir to'plamni almashtirish xavfsizmi (test yo'qmi).
       onSwap — almashtirilgandan keyin (ekranni qayta chizish uchun). */
    sync: async function (lang, canSwap, onSwap) {
      canSwap = typeof canSwap === 'function' ? canSwap : () => true;
      onSwap = typeof onSwap === 'function' ? onSwap : () => {};

      // 1) Avval saqlangan nusxa — darhol va tarmoqsiz.
      let cached = readCache();
      if (cached) {
        const got = sane(cached.rows);
        if (!got) {
          /* Buzuq nusxa O'CHIRILADI — aks holda u "yangi" bo'lib qolib
             ilovani tarmoqqa chiqishdan to'sardi. */
          log('saqlangan nusxa yaroqsiz — oʻchirildi');
          dropCache();
          cached = null;
        } else if (apply(got, canSwap, onSwap)) {
          status = 'cache';
          log('saqlangan nusxadan ' + got.items.length + ' savol');
        }
      }

      // 2) Keyin bazadan — sozlangan bo'lsa.
      if (!configured) {
        log('baza sozlanmagan — APK ichidagi toʻplam ishlatiladi');
        return status;
      }
      if (cached && cached.at && (Date.now() - cached.at) < FRESH_MS) {
        log('saqlangan nusxa yangi — tarmoqqa chiqilmadi');
      } else {
        try {
          const got = sane(await fetchVerbal());
          if (!got) throw new Error('bazadan kelgan savollar shakli notoʻgʻri');
          // Kesh faqat TEKSHIRUVDAN KEYIN yoziladi.
          writeCache(got);
          if (apply(got, canSwap, onSwap)) {
            status = 'live';
            log('bazadan ' + got.items.length + ' savol, ' + got.retired.length + ' ta arxiv');
          } else {
            status = 'cache';
            log('test davom etyapti — yangilanish keyinroq qoʻllanadi');
          }
        } catch (e) {
          if (status === 'bundled') status = 'error';
          log('bazaga ulanib boʻlmadi: ' + (e && e.message) + ' — mavjud toʻplam saqlanadi');
        }
      }

      await flush();
      return status;
    },

    /* Tizimga kirish qatlami chaqiradi: { access_token, user_id, expires_at(ms) }
       yoki null (chiqdi). Token yangilanganda ham shu. */
    setSession: function (s) {
      if (s && typeof s.access_token === 'string' && s.access_token
          && typeof s.user_id === 'string' && UUID_RE.test(s.user_id)) {
        session = { access_token: s.access_token, user_id: s.user_id,
                    expires_at: Number(s.expires_at) || 0 };
        return flush();
      }
      session = null;
      return Promise.resolve(0);
    },

    /* Natijani navbatga qo'yadi va yuborishga urinadi.
       Qaytaradi: 'queued' | 'skipped' (kirmagan) | 'off' (baza sozlanmagan)
                  | 'invalid' (natija shakli noto'g'ri).
       opts.calibrate === true — anonim kalibrlash javoblari ham yuboriladi.
       STANDART HOLATDA YO'Q: yig'ish maxfiylik matnida aytilgandan keyin
       yoqiladi (supabase/migrations/0003 dagi izoh). */
    submitResult: function (result, opts) {
      if (!configured) return 'off';
      if (!session) return 'skipped';
      const row = toRow(result);
      if (!row) { log('natija shakli notoʻgʻri — yuborilmaydi'); return 'invalid'; }
      const id = uuid();
      row.client_id = id;
      const resp = (opts && opts.calibrate === true) ? toResponses(result) : null;
      const uid = session.user_id;
      editOutbox(box => box.concat({ id: id, uid: uid, at: Date.now(), row: row, resp: resp }));
      flush();
      return 'queued';
    },

    /* Yuborilmagan natijalar (joriy foydalanuvchiniki). */
    pending: function () {
      if (!session) return 0;
      return readOutbox().filter(e => e.uid === session.user_id).length;
    },

    flush: flush,

    /* "Ma'lumotimni o'chiring": bazadagi HAMMA natija + navbatdagilar.
       Navbat AVVAL tozalanadi va ketayotgan yuborish kutiladi — aks holda
       o'chirishdan keyin yetib borgan natija "o'chirilgan" ma'lumotni
       qaytarib qo'yardi. Qaytaradi: o'chirilgan natijalar soni. */
    deleteMyResults: async function () {
      if (!configured) throw new Error('baza sozlanmagan');
      if (!session) throw new Error('tizimga kirilmagan');
      const uid = session.user_id;
      editOutbox(box => box.filter(e => e.uid !== uid));
      if (flushing) await flushing;
      const res = await request('rpc/delete_my_results', { body: {}, token: session.access_token });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    },
  };
})();
