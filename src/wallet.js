/* ─────────────────────────────────────────────────────────────────────────
   WALLET — TANGA, XARIDLAR VA KUNLIK VAZIFALAR (window.nzWallet, kalit nz-wallet)

   Ikki valyuta qatʼiy ajratilgan (ARXITEKTURA §0.4, §6.1):
     · BALL ◆ — liga uchun, hech qachon sarflanmaydi. U bu faylda YOʻQ:
       ball progress.js va Main dagi `ui.days` da yuritiladi.
     · TANGA ● — faqat Doʻkon uchun. Faqat shu fayl uni yozadi.
   Ular bir-biriga aylantirilmaydi; xarid ball, liga, IQ yoki darajaga
   taʼsir qilmaydi.

   QOIDALAR:

   1. HAR BIR KIRIM KALIT BILAN. `credit(n, src, key)` bir kalitni faqat
      bir marta qabul qiladi (§6.9). Ilova kirim oʻrtasida yiqilsa yoki
      Main bir hodisani ikki marta yuborsa ham tanga ikki marta
      berilmaydi. Kalit shakli manbaga qarab qatʼiy tekshiriladi:
        q:<kun>:<q1|q2|q3>   — kunlik vazifa (kuniga koʻpi bilan 3 ta)
        b:<nishon id>        — yutuq nishoni (bir marta)
        w:<dushanba>         — hafta yakuni (haftasiga bir marta)
        welcome              — xush kelibsiz bonusi (bir marta)
      Boshqa manba yoʻq. Javob, ilovani ochish, IQ test uchun tanga
      berilmaydi (§6.3).

   2. VAZIFA KUN BOSHIDA QATʼIYLANADI. Roʻyxat kunning birinchi
      soʻrovida tuziladi va oʻsha kun davomida qayta hisoblanmaydi
      (§6.4). Kun 04:00 da almashadi (progress.js bilan bir xil). Vazifa
      progressi kun bilan birga saqlanadi, shuning uchun kechagi son
      bugunga «oʻtib» qolmaydi (koʻrib chiqish, F65: «Bugungi mashq»
      ertasi kuni qayta ochilganda eski sonni koʻrsatardi).

   3. TEST JAVOBLARI VAZIFAGA KIRMAYDI. Test mashq emas va uni qayta
      topshirishga undov boʻlmasligi kerak (§6.4). `track()` test
      rejimidagi javobni eʼtiborsiz qoldiradi.

   4. SOAT HIMOYASI. `maxSeen` — koʻrilgan eng katta vaqt. Soat
      `maxSeen − 6 soat` dan orqaga surilgan boʻlsa, vazifa progressi,
      vazifa va hafta mukofotlari soat `maxSeen` ga yetguncha toʻxtaydi
      (§6.9). 6 soatlik chegara — NTP tuzatishi va shunga oʻxshash
      kichik sakrashlar uchun. Soatni oldinga surib vazifa «yigʻish»
      ham foyda bermaydi: maxSeen oldinga ketadi va haqiqiy vaqt unga
      yetguncha hamma narsa muzlaydi.

   5. BALANS HECH QACHON MANFIY EMAS. Xarid faqat tanga yetganda oʻtadi.
      Qaytarish (refund) yoʻq, xarid doimiy.

   6. YANGIROQ MAʼLUMOT USTIGA YOZILMAYDI. `v` bizdan katta boʻlsa
      (ilova eski versiyaga qaytarilgan), xotirada boʻsh hamyon bilan
      ishlanadi va diskka hech narsa yozilmaydi (`readOnly`, §10.3).

   7. VAQT KIRITILADI. Vaqtga bogʻliq har metod oxirgi ixtiyoriy
      argument sifatida `now` (ms) oladi; berilmasa Date.now(). Testlar
      shu orqali deterministik.

   Hamyon nishonlarni ham, ligani ham bilmaydi (§10.4). Main ularni
   chaqiradi va natijani shu yerga `credit()` bilan beradi. Narx va
   mukofotlar src/catalog.js (`nzCatalog`) dan chaqiruv paytida oʻqiladi.
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  'use strict';

  const KEY = 'nz-wallet';
  const V = 1;

  const DAY_START_HOUR = 4;              // progress.js bilan bir xil
  const HOUR = 3600000;
  const ROLLBACK_MS = 6 * HOUR;          // §6.9
  const LEDGER_MAX = 100;                // §6.9
  const QUEST_KEEP_DAYS = 21;            // q: kalitlari
  const WEEK_KEEP_DAYS = 16 * 7;         // w: kalitlari
  const CREDITED_MAX = 4000;             // himoya: buzilgan yozuv cheksiz boʻlmasin
  const CREDIT_MAX = 500;                // bitta kirimning yuqori chegarasi (jadvaldagi eng kattasi 150)
  const COIN_MAX = 10000000;
  const OWNED_MAX = 200;

  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const ID_RE = /^[a-z][a-z0-9-]{0,39}$/;
  const SHELF_RE = /^[a-z]{1,16}$/;
  const KEY_RE = {
    quest: /^q:(\d{4}-\d{2}-\d{2}):(q[123])$/,
    badge: /^b:([a-z0-9][a-z0-9-]{0,39})$/,
    week: /^w:(\d{4}-\d{2}-\d{2})$/,
    welcome: /^welcome$/,
  };
  const SOURCES = ['quest', 'badge', 'week', 'welcome'];
  const QUEST_KINDS = ['practice', 'game', 'fix', 'type'];

  /* ── Qurilma xotirasi ────────────────────────────────────────────────
     localStorage ishlamasligi mumkin (maxfiy oyna, joy tugagan). Unda
     hamyon xotirada ishlayveradi: xato koʻrsatilmaydi, ilova yiqilmaydi. */
  function ls() {
    try {
      if (root.localStorage) return root.localStorage;
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (e) { return null; }
  }
  function readRaw() {
    try {
      const s = ls();
      const v = s ? s.getItem(KEY) : null;
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  /* ── Kun hisobi (04:00 chegarasi, progress.js dagi dayKey bilan bir xil) ── */
  const pad = n => String(n).padStart(2, '0');
  function dayKey(ts) {
    const d = new Date((typeof ts === 'number' && isFinite(ts) ? ts : Date.now()) - DAY_START_HOUR * HOUR);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /* Kun kalitini kun raqamiga (UTC boʻyicha) — soat mintaqasidan qatʼi
     nazar ikki kalit farqi aniq kunlar soni. */
  function dayNum(key) {
    if (typeof key !== 'string' || !DAY_RE.test(key)) return null;
    const p = key.split('-').map(Number);
    const t = Date.UTC(p[0], p[1] - 1, p[2]);
    const d = new Date(t);
    if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2]) return null;
    return Math.round(t / 86400000);
  }
  const isMonday = key => { const n = dayNum(key); return n !== null && new Date(n * 86400000).getUTCDay() === 1; };

  const cat = () => (root.nzCatalog && root.nzCatalog.rewards ? root.nzCatalog : null);
  const nowOf = now => (typeof now === 'number' && isFinite(now) ? now : Date.now());
  const int = (v, max) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0);

  /* ── Boʻsh holat ─────────────────────────────────────────────────── */
  function blank() {
    return {
      v: V,
      balance: 0,
      earned: 0,
      spent: 0,
      owned: { colors: [], badges: [] },    // bepul ranglar saqlanmaydi (§10.2)
      credited: Object.create(null),
      quests: null,                          // { day, list, hint } — birinchi soʻrovda tuziladi
      maxSeen: 0,
      ledger: [],
    };
  }

  /* ── Tekshiruv: diskdagi yozuv ishonchsiz manba ──────────────────── */
  function saneQuest(q) {
    if (!q || typeof q !== 'object') return null;
    if (['q1', 'q2', 'q3'].indexOf(q.id) === -1 || QUEST_KINDS.indexOf(q.kind) === -1) return null;
    const target = int(q.target, 100);
    if (target < 1) return null;
    const out = { id: q.id, kind: q.kind, target: target, n: Math.min(int(q.n, 100), target) };
    if (q.kind === 'type') {
      if (typeof q.type !== 'string' || !ID_RE.test(q.type)) return null;
      out.type = q.type;
    }
    if (q.kind === 'game' && typeof q.game === 'string' && ID_RE.test(q.game)) out.game = q.game;
    return out;
  }

  function saneQuests(raw) {
    if (!raw || typeof raw !== 'object' || dayNum(raw.day) === null || !Array.isArray(raw.list)) return null;
    const list = raw.list.slice(0, 3).map(saneQuest);
    if (list.length !== 3 || list.some(q => !q)) return null;
    if (list[0].id !== 'q1' || list[1].id !== 'q2' || list[2].id !== 'q3') return null;
    return { day: raw.day, list: list, hint: saneHint(raw.hint) };
  }

  function saneHint(h) {
    const out = { wrongCount: 0, weakestType: null };
    if (!h || typeof h !== 'object') return out;
    out.wrongCount = int(h.wrongCount, 100000);
    if (typeof h.weakestType === 'string' && ID_RE.test(h.weakestType)) out.weakestType = h.weakestType;
    return out;
  }

  function saneIds(a) {
    if (!Array.isArray(a)) return [];
    const seen = Object.create(null), out = [];
    a.forEach(x => { if (typeof x === 'string' && ID_RE.test(x) && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out.slice(0, OWNED_MAX);
  }

  function validKey(src, key) {
    const re = KEY_RE[src];
    const m = re && typeof key === 'string' ? re.exec(key) : null;
    if (!m) return false;
    if (src === 'quest') return dayNum(m[1]) !== null;
    if (src === 'week') return isMonday(m[1]);
    return true;
  }
  const srcOfKey = key => {
    for (let i = 0; i < SOURCES.length; i++) if (validKey(SOURCES[i], key)) return SOURCES[i];
    return null;
  };

  function sane(raw) {
    const b = blank();
    if (!raw || typeof raw !== 'object' || raw.v !== V) return b;
    b.balance = int(raw.balance, COIN_MAX);
    b.earned = int(raw.earned, COIN_MAX);
    b.spent = int(raw.spent, COIN_MAX);
    /* Oʻzgarmas: earned ≥ balance + spent. Qoʻlda oʻzgartirilgan
       yozuvda buzilgan boʻlsa, «jami topilgan» koʻtariladi — balans
       kamaytirilmaydi (foydalanuvchidan hech narsa olinmaydi). */
    if (b.earned < b.balance + b.spent) b.earned = Math.min(COIN_MAX, b.balance + b.spent);
    if (raw.owned && typeof raw.owned === 'object') {
      Object.keys(raw.owned).slice(0, 8).forEach(k => {
        if (SHELF_RE.test(k)) b.owned[k] = saneIds(raw.owned[k]);
      });
    }
    if (raw.credited && typeof raw.credited === 'object') {
      Object.keys(raw.credited).slice(0, CREDITED_MAX).forEach(k => {
        if (srcOfKey(k)) b.credited[k] = 1;
      });
    }
    b.quests = saneQuests(raw.quests);
    b.maxSeen = typeof raw.maxSeen === 'number' && isFinite(raw.maxSeen) && raw.maxSeen > 0 ? raw.maxSeen : 0;
    if (Array.isArray(raw.ledger)) {
      b.ledger = raw.ledger.filter(e => e && typeof e === 'object' &&
        typeof e.at === 'number' && isFinite(e.at) &&
        typeof e.amt === 'number' && isFinite(e.amt) && e.amt === Math.floor(e.amt) &&
        typeof e.src === 'string' && e.src.length <= 16 &&
        typeof e.key === 'string' && e.key.length <= 64)
        .map(e => ({ at: e.at, amt: e.amt, src: e.src, key: e.key }))
        .slice(-LEDGER_MAX);
    }
    return b;
  }

  /* Migratsiya zanjiri: MIGRATE[n](raw) → v = n + 1 shakli. Hozircha
     birorta ham yoʻq (V = 1). */
  const MIGRATE = {};

  let readOnly = false;
  let needWrite = false;
  let S = load();
  if (needWrite) save();     // migratsiyadan keyin bir marta qayta yoziladi

  function load() {
    let raw = readRaw();
    if (raw && typeof raw === 'object' && typeof raw.v === 'number') {
      if (raw.v > V) { readOnly = true; return blank(); }
      let migrated = false;
      while (raw && raw.v < V && MIGRATE[raw.v]) { raw = MIGRATE[raw.v](raw); migrated = true; }
      const s = sane(raw);
      if (migrated) needWrite = true;
      return s;
    }
    return blank();
  }

  function save() {
    if (readOnly) return false;
    try {
      const s = ls();
      if (!s) return false;
      s.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) { return false; }
  }

  /* ── Soat ─────────────────────────────────────────────────────────── */
  const frozenAt = t => S.maxSeen > 0 && t < S.maxSeen - ROLLBACK_MS;
  function see(t) { if (t > S.maxSeen) S.maxSeen = t; }

  /* Eski q: va w: kalitlarini tozalash. Tayanch — maxSeen (soat orqaga
     surilgan boʻlsa ham kalitlar erta oʻchib ketmaydi). b: va welcome
     abadiy saqlanadi. */
  function prune() {
    const ref = dayNum(dayKey(S.maxSeen || Date.now()));
    if (ref === null) return;
    Object.keys(S.credited).forEach(k => {
      let m = KEY_RE.quest.exec(k);
      if (m && ref - dayNum(m[1]) > QUEST_KEEP_DAYS) { delete S.credited[k]; return; }
      m = KEY_RE.week.exec(k);
      if (m && ref - dayNum(m[1]) > WEEK_KEEP_DAYS) delete S.credited[k];
    });
  }

  /* ── Kirim (ichki) ───────────────────────────────────────────────── */
  function amountOk(n, src) {
    const C = cat();
    if (!C) return true;
    if (src === 'quest') return n === C.rewards.quest;
    if (src === 'welcome') return n === C.rewards.welcome;
    if (src === 'week') return C.rewards.weekly.indexOf(n) !== -1;
    return true;
  }

  function creditRaw(n, src, key, t) {
    if (typeof n !== 'number' || !isFinite(n) || n !== Math.floor(n) || n < 1 || n > CREDIT_MAX) return false;
    if (SOURCES.indexOf(src) === -1 || !validKey(src, key)) return false;
    if (S.credited[key]) return false;
    if (!amountOk(n, src)) return false;
    S.credited[key] = 1;
    S.balance = Math.min(COIN_MAX, S.balance + n);
    S.earned = Math.min(COIN_MAX, S.earned + n);
    S.ledger.push({ at: t, amt: n, src: src, key: key });
    if (S.ledger.length > LEDGER_MAX) S.ledger = S.ledger.slice(-LEDGER_MAX);
    return true;
  }

  /* ── Kunlik vazifalar ────────────────────────────────────────────── */

  /* Eng zaif tur: `levels` boʻyicha eng past daraja, teng boʻlsa `types`
     tartibida birinchisi (§6.4, IQ.types() tartibi). */
  function weakest(levels, types) {
    const list = Array.isArray(types) ? types.filter(x => typeof x === 'string' && ID_RE.test(x)) : [];
    let best = null, bestLv = Infinity;
    list.forEach(t => {
      const lv = levels && typeof levels[t] === 'number' && isFinite(levels[t]) ? levels[t] : Infinity;
      if (best === null || lv < bestLv) { best = t; bestLv = lv; }
    });
    return best;
  }

  function build(day, ctx, prevHint) {
    const C = cat();
    if (!C) return null;
    const Q = C.quests;
    const c = ctx && typeof ctx === 'object' ? ctx : null;
    const hint = saneHint(c || prevHint);
    if (c && hint.weakestType === null && prevHint && prevHint.weakestType) hint.weakestType = prevHint.weakestType;
    const q2 = { id: 'q2', kind: 'game', target: Q.game, n: 0 };
    if (c && typeof c.gameOfDay === 'string' && ID_RE.test(c.gameOfDay)) q2.game = c.gameOfDay;
    /* q3: Xatolarimda kun boshida ≥ Q.fix savol boʻlsa — «Xatolarni
       tuzating», aks holda eng zaif tur mashqi. Ikkalasi ham doim
       bajarsa boʻladigan vazifa: qulflangan vazifa yoʻq. */
    const q3 = hint.wrongCount >= Q.fix
      ? { id: 'q3', kind: 'fix', target: Q.fix, n: 0 }
      : { id: 'q3', kind: 'type', type: hint.weakestType || 'matrix', target: Q.type, n: 0 };
    return {
      day: day,
      list: [{ id: 'q1', kind: 'practice', target: Q.practice, n: 0 }, q2, q3],
      hint: hint,
    };
  }

  /* Bugungi roʻyxat. Kun hech qachon orqaga qaytmaydi: soat mintaqasi
     almashsa yoki soat biroz orqaga surilsa, saqlangan (kechroq) kun
     roʻyxati qoladi — aks holda bugungi progress oʻchib ketardi. */
  function ensure(day, ctx) {
    if (S.quests && S.quests.day >= day) return S.quests;
    const q = build(day, ctx, S.quests ? S.quests.hint : null);
    if (q) S.quests = q;
    return q;
  }

  function view(Q) {
    const C = cat();
    const reward = C ? C.rewards.quest : 0;
    return Q ? Q.list.map(q => {
      const o = { id: q.id, kind: q.kind, n: q.n, target: q.target, done: q.n >= q.target, reward: reward };
      if (q.type) o.type = q.type;
      if (q.game) o.game = q.game;
      return o;
    }) : [];
  }

  function counts(q, evt) {
    if (evt.type === 'answer') {
      /* Faqat mashq va takrorlash. Test javobi — hech bir vazifaga. */
      if (evt.mode !== 'practice' && evt.mode !== 'review') return false;
      if (q.kind === 'practice') return true;
      if (q.kind === 'fix') return evt.mode === 'review' && evt.correct === true && evt.fixed !== false;
      if (q.kind === 'type') return evt.itemType === q.type;
      return false;
    }
    if (evt.type === 'game') {
      /* Istalgan tugallangan oʻyin, demodan boshqa. Bot filtri ushlagan
         oʻyin (flagged) hisoblanmaydi. */
      return q.kind === 'game' && typeof evt.id === 'string' && ID_RE.test(evt.id) &&
             evt.id !== 'demo' && evt.flagged !== true;
    }
    return false;
  }

  function copy(x) { return JSON.parse(JSON.stringify(x)); }

  root.nzWallet = {
    /* Joriy balans (butun son, ≥ 0). */
    balance: function () { return S.balance; },

    /* Butun holatning nusxasi (UI va test uchun). */
    state: function () {
      const o = copy(S);
      o.readOnly = readOnly;
      return o;
    },

    readOnly: function () { return readOnly; },

    /* Soat orqaga surilganmi (vazifa va hafta mukofotlari toʻxtagan). */
    frozen: function (now) { return frozenAt(nowOf(now)); },

    dayKey: dayKey,
    weakest: weakest,

    /* 'color:red' | 'badge:compass'. Bepul rang — doim «bor». */
    owns: function (itemId) {
      const C = cat();
      const it = C ? C.item(itemId) : null;
      if (!it) return false;
      if (it.free) return true;
      return (S.owned[it.shelf] || []).indexOf(it.id) !== -1;
    },

    /* Sotib olingan narsalar (bepul ranglarsiz): owned('badges') → ['compass']. */
    owned: function (shelf) {
      if (shelf === undefined) return copy(S.owned);
      return (S.owned[shelf] || []).slice();
    },

    /* Kirim. n — butun musbat son, src — 'quest'|'badge'|'week'|'welcome',
       key — manbaga mos kalit. Yangi kirim boʻlsa true; takror, notoʻgʻri
       kalit yoki miqdor, readOnly, yoki soat orqaga surilganda
       (vazifa/hafta uchun) — false. */
    credit: function (n, src, key, now) {
      if (readOnly) return false;
      const t = nowOf(now);
      const frozen = frozenAt(t);
      if (frozen && (src === 'quest' || src === 'week')) return false;
      if (!frozen) see(t);
      const ok = creditRaw(n, src, key, t);
      if (ok) save();
      return ok;
    },

    /* Xarid. Natija: { ok: true, balance } yoki
       { ok: false, err: 'unknown'|'owned'|'free'|'funds'|'readonly', need? }.
       'funds' da need — yana qancha tanga kerak («Yana 30 tanga kerak»). */
    spend: function (itemId, now) {
      if (readOnly) return { ok: false, err: 'readonly' };
      const C = cat();
      const it = C ? C.item(itemId) : null;
      if (!it) return { ok: false, err: 'unknown' };
      if (it.free) return { ok: false, err: 'free' };
      const list = S.owned[it.shelf] || (S.owned[it.shelf] = []);
      if (list.indexOf(it.id) !== -1) return { ok: false, err: 'owned' };
      if (S.balance < it.price) return { ok: false, err: 'funds', need: it.price - S.balance };
      const t = nowOf(now);
      if (!frozenAt(t)) see(t);
      S.balance -= it.price;
      S.spent = Math.min(COIN_MAX, S.spent + it.price);
      list.push(it.id);
      S.ledger.push({ at: t, amt: -it.price, src: 'buy', key: it.itemId });
      if (S.ledger.length > LEDGER_MAX) S.ledger = S.ledger.slice(-LEDGER_MAX);
      save();
      return { ok: true, balance: S.balance };
    },

    /* Bugungi kunlik vazifalar. day — nzProgress.dayKey() (berilmasa
       `now` dan hisoblanadi); ctx — { wrongCount, weakestType, gameOfDay }.
       Roʻyxat kunning birinchi soʻrovida tuziladi, keyin ctx oʻzgarsa ham
       oʻsha kun davomida oʻzgarmaydi.
       → [{ id, kind, type?, game?, n, target, done, reward }] */
    quests: function (day, ctx, now) {
      const t = nowOf(now);
      if (frozenAt(t)) return view(S.quests);
      see(t);
      const d = typeof day === 'string' && dayNum(day) !== null ? day : dayKey(t);
      const before = S.quests;
      const Q = ensure(d, ctx);
      if (Q !== before) save();
      return view(Q);
    },

    /* Hodisa: { type: 'answer', mode: 'practice'|'review'|'test', correct, itemType, fixed? }
       yoki { type: 'game', id, flagged? }. Vazifa shu hodisada bajarilsa,
       tangani OʻZI beradi (kalit q:<kun>:<id>) va qaytaradi:
       → [{ id, reward }] (boʻsh massiv — yangi mukofot yoʻq).
       Yangi kunda roʻyxat hali tuzilmagan boʻlsa, evt.ctx yoki oxirgi
       maʼlum ctx bilan tuziladi. */
    track: function (evt, now) {
      if (readOnly || !evt || typeof evt !== 'object') return [];
      const t = nowOf(now);
      if (frozenAt(t)) return [];
      see(t);
      const Q = ensure(dayKey(t), evt.ctx);
      if (!Q) return [];
      const C = cat();
      const done = [];
      Q.list.forEach(q => {
        if (q.n >= q.target || !counts(q, evt)) return;
        q.n += 1;
        if (q.n >= q.target) done.push(q);
      });
      const out = [];
      done.forEach(q => {
        const r = C.rewards.quest;
        if (creditRaw(r, 'quest', 'q:' + Q.day + ':' + q.id, t)) out.push({ id: q.id, reward: r });
      });
      save();
      return out;
    },

    /* Ilova ochilganda / fondan qaytganda: soatni qayd qiladi, eski
       kalitlarni tozalaydi. → { frozen, balance } */
    touch: function (now) {
      const t = nowOf(now);
      const frozen = frozenAt(t);
      if (!readOnly) {
        if (!frozen) see(t);
        prune();
        save();
      }
      return { frozen: frozen, balance: S.balance };
    },

    /* Oxirgi n ta yozuv, eng yangisi birinchi. */
    ledger: function (n) {
      const k = typeof n === 'number' && n > 0 ? Math.min(Math.floor(n), LEDGER_MAX) : 20;
      return S.ledger.slice(-k).reverse().map(e => Object.assign({}, e));
    },

    /* «Maʼlumotlarni oʻchirish» (§10.6): hamyon nolga qaytadi. Foydalanuvchi
       oʻzi soʻragani uchun yangiroq versiya yozuvi ham oʻchiriladi. */
    reset: function () {
      S = blank();
      readOnly = false;
      try { const s = ls(); if (s) s.removeItem(KEY); } catch (e) {}
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
