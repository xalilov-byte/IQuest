/* ─────────────────────────────────────────────────────────────────────────
   LEAGUE — LIGA TARIXI (window.nzLeague, kalit nz-league)

   Liga darajasi HAFTALIK ballga qarab (dushanba–yakshanba, kun 04:00 da
   almashadi). Chegaralar va nomlar Main dagi `LEAGUES` da qoladi
   (§6.2, tools/source.mjs uni oʻqiydi): Boshlovchi 0 · Bronza 150 ·
   Kumush 500 · Oltin 1 200 · Platina 2 500 · Olmos 5 000. Bu fayl
   faqat YOPILGAN haftalarni, eng yaxshi haftani va koʻrsatilgan liga
   koʻtarilishini eslaydi.

   Nima uchun alohida kalit: `nz-iq-ui` versiyasini oshirib boʻlmaydi —
   bugungi uiSane() boshqa versiyada Xatolarim, Saqlangan va oʻyinlarni
   oʻchirib yuborardi (§10.3). Shuning uchun liga tarixi shu yerda.

   QOIDALAR:
   1. `close(w, ball)` bir haftani faqat BIR MARTA yopadi va shunda true
      qaytaradi — hafta mukofoti (§6.5) shunga bogʻlanadi. Tugamagan
      hafta yopilmaydi. 12 haftadan eskisi tashlanadi, lekin `floor`
      eslab qolinadi: tashlangan hafta qayta «yangi» boʻlib yopilmaydi.
   2. Eng yaxshi hafta (`best`) 12 hafta chegarasidan qatʼi nazar saqlanadi.
   3. Liga koʻtarilishi har hafta har bir liga uchun bir marta koʻrsatiladi
      (§3.11): `promote(w, tier)`.
   4. Hamyonni bilmaydi. Hafta yakuni oqimi Main da (§6.5):
        if (!nzWallet.frozen())
          nzLeague.pending(ui.days, today).forEach(({ w, ball }) => {
            if (!nzLeague.close(w, ball)) return;
            const coins = nzCatalog.rewards.weekly[leagueOf(ball).index] || 0;
            if (coins > 0 && nzWallet.credit(coins, 'week', 'w:' + w)) … bayram kartasi
          });
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  'use strict';

  const KEY = 'nz-league';
  const V = 1;
  const WEEKS_MAX = 12;
  const DAY_START_HOUR = 4;
  const DAY = 86400000;
  const DAYS_KEEP = 21;          // Main dagi nz-iq-ui.days oynasi
  const BALL_MAX = 10000000;
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  const pad = n => String(n).padStart(2, '0');
  function dayKey(ts) {
    const d = new Date((typeof ts === 'number' && isFinite(ts) ? ts : Date.now()) - DAY_START_HOUR * 3600000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayNum(key) {
    if (typeof key !== 'string' || !DAY_RE.test(key)) return null;
    const p = key.split('-').map(Number);
    const t = Date.UTC(p[0], p[1] - 1, p[2]);
    const d = new Date(t);
    if (d.getUTCFullYear() !== p[0] || d.getUTCMonth() !== p[1] - 1 || d.getUTCDate() !== p[2]) return null;
    return Math.round(t / DAY);
  }
  function keyOf(n) {
    const d = new Date(n * DAY);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  /* Kun kalitidan oʻsha haftaning dushanbasi. */
  function weekStart(day) {
    const n = dayNum(day);
    if (n === null) return null;
    const dow = new Date(n * DAY).getUTCDay();       // 0 = yakshanba
    return keyOf(n - (dow + 6) % 7);
  }
  const isMonday = w => dayNum(w) !== null && weekStart(w) === w;
  const addDays = (key, k) => keyOf(dayNum(key) + k);
  const ball = v => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.min(Math.round(v), BALL_MAX) : 0);

  function ls() {
    try {
      if (root.localStorage) return root.localStorage;
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (e) { return null; }
  }
  function readRaw() {
    try { const s = ls(); const v = s ? s.getItem(KEY) : null; return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }

  function blank() {
    return { v: V, weeks: Object.create(null), best: null, announced: null, floor: null };
  }

  function sane(raw) {
    const b = blank();
    if (!raw || typeof raw !== 'object' || raw.v !== V) return b;
    const w = raw.weeks;
    if (w && typeof w === 'object') {
      Object.keys(w).filter(isMonday).sort().slice(-WEEKS_MAX).forEach(k => {
        if (typeof w[k] === 'number' && isFinite(w[k]) && w[k] >= 0) b.weeks[k] = ball(w[k]);
      });
    }
    if (raw.best && typeof raw.best === 'object' && isMonday(raw.best.w) && ball(raw.best.ball) > 0) {
      b.best = { w: raw.best.w, ball: ball(raw.best.ball) };
    }
    /* Eng yaxshi hafta yopilgan haftalardan kichik boʻla olmaydi. */
    Object.keys(b.weeks).forEach(k => {
      if (b.weeks[k] > 0 && (!b.best || b.weeks[k] > b.best.ball)) b.best = { w: k, ball: b.weeks[k] };
    });
    const a = raw.announced;
    if (a && typeof a === 'object' && isMonday(a.w) && Number.isInteger(a.tier) && a.tier >= 0 && a.tier <= 20) {
      b.announced = { w: a.w, tier: a.tier };
    }
    if (isMonday(raw.floor)) b.floor = raw.floor;
    return b;
  }

  let readOnly = false;
  let S = load();
  function load() {
    const raw = readRaw();
    if (raw && typeof raw === 'object' && typeof raw.v === 'number' && raw.v > V) { readOnly = true; return blank(); }
    return sane(raw);
  }
  function save() {
    if (readOnly) return false;
    try { const s = ls(); if (!s) return false; s.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { return false; }
  }

  const nowOf = now => (typeof now === 'number' && isFinite(now) ? now : Date.now());

  root.nzLeague = {
    weekStart: weekStart,
    dayKey: dayKey,

    /* Haftani yopish. Yangi yopilish boʻlsa true. false: allaqachon
       yopilgan, 12 haftadan eski, hafta hali tugamagan (`now` boʻyicha),
       notoʻgʻri kalit yoki readOnly. */
    close: function (w, b, now) {
      if (readOnly || !isMonday(w)) return false;
      if (S.weeks[w] !== undefined) return false;
      if (S.floor && w <= S.floor) return false;
      if (dayNum(dayKey(nowOf(now))) < dayNum(w) + 7) return false;
      const v = ball(b);
      S.weeks[w] = v;
      if (v > 0 && (!S.best || v > S.best.ball)) S.best = { w: w, ball: v };
      const keys = Object.keys(S.weeks).sort();
      while (keys.length > WEEKS_MAX) {
        const old = keys.shift();
        delete S.weeks[old];
        if (!S.floor || old > S.floor) S.floor = old;
      }
      save();
      return true;
    },

    /* Yopilgan haftalar, eng yangisi birinchi: [{ w, ball }]. */
    weeks: function (n) {
      const k = typeof n === 'number' && n > 0 ? Math.floor(n) : WEEKS_MAX;
      return Object.keys(S.weeks).sort().reverse().slice(0, k).map(w => ({ w: w, ball: S.weeks[w] }));
    },

    /* Bitta hafta balli yoki null (yopilmagan / maʼlumot yoʻq). */
    week: function (w) { return S.weeks[w] !== undefined ? S.weeks[w] : null; },

    /* «Oʻtgan hafta: 620» — joriy haftadan oldingi hafta; yoʻq boʻlsa null («—»). */
    last: function (currentWeekStart) {
      const w = weekStart(currentWeekStart);
      if (!w) return null;
      const p = addDays(w, -7);
      return S.weeks[p] !== undefined ? S.weeks[p] : null;
    },

    /* «Oxirgi haftalar» ustunlari: joriy haftadan OLDINGI n hafta, eskisidan
       yangisiga. Maʼlumot yoʻq haftada ball 0 va known: false. */
    series: function (currentWeekStart, n) {
      const w = weekStart(currentWeekStart);
      const k = typeof n === 'number' && n > 0 ? Math.min(Math.floor(n), WEEKS_MAX) : 3;
      if (!w) return [];
      const out = [];
      for (let i = k; i >= 1; i--) {
        const x = addDays(w, -7 * i);
        out.push({ w: x, ball: S.weeks[x] !== undefined ? S.weeks[x] : 0, known: S.weeks[x] !== undefined });
      }
      return out;
    },

    /* Eng yaxshi yopilgan hafta yoki null. «Eng yaxshi hafta» uchun Main
       buni joriy hafta bilan solishtiradi: max(best.ball, joriy). */
    best: function () { return S.best ? { w: S.best.w, ball: S.best.ball } : null; },

    /* Yopilishi kerak boʻlgan haftalar: ui.days (kun → ball) boʻyicha,
       oynaga (21 kun) toʻliq sigʻadigan, tugagan va hali yopilmagan
       haftalar, eskisidan yangisiga (koʻpi bilan 2 ta). Faoliyatsiz
       hafta 0 bilan yopiladi (karta chiqmaydi), lekin faqat undan oldin
       faoliyat boʻlgan boʻlsa — yangi foydalanuvchiga «Oʻtgan hafta: 0»
       yozilmaydi. */
    pending: function (days, today, keep) {
      const t = dayNum(today);
      if (t === null) return [];
      const d = days && typeof days === 'object' ? days : {};
      const win = typeof keep === 'number' && keep > 0 ? Math.floor(keep) : DAYS_KEEP;
      const cur = dayNum(weekStart(today));
      let firstActive = null;
      Object.keys(d).forEach(k => {
        if (dayNum(k) !== null && ball(d[k]) > 0 && (firstActive === null || k < firstActive)) firstActive = k;
      });
      const closed = Object.keys(S.weeks).sort();
      const out = [];
      for (let m = cur - 7; m >= t - (win - 1); m -= 7) {
        const w = keyOf(m);
        if (S.weeks[w] !== undefined || (S.floor && w <= S.floor)) continue;
        let sum = 0;
        for (let i = 0; i < 7; i++) sum += ball(d[keyOf(m + i)]);
        if (sum === 0 && !((firstActive && firstActive < w) || (closed.length && closed[0] < w))) continue;
        out.unshift({ w: w, ball: Math.min(sum, BALL_MAX) });
      }
      return out;
    },

    /* Shu hafta koʻrsatilgan eng yuqori liga indeksi yoki -1. */
    announced: function (w) {
      return S.announced && S.announced.w === w ? S.announced.tier : -1;
    },

    /* Faqat oshiradi; eski haftaga qaytmaydi. */
    announce: function (w, tier) {
      if (readOnly || !isMonday(w) || !Number.isInteger(tier) || tier < 0 || tier > 20) return;
      const a = S.announced;
      if (a && (w < a.w || (w === a.w && tier <= a.tier))) return;
      S.announced = { w: w, tier: tier };
      save();
    },

    /* Koʻtarilish kartasini koʻrsatish kerakmi: tier shu haftada hali
       koʻrsatilganidan yuqori boʻlsa true va qayd qiladi. Boshlovchi
       (0) uchun karta yoʻq. */
    promote: function (w, tier) {
      if (readOnly || !isMonday(w) || !Number.isInteger(tier) || tier < 1) return false;
      if (tier <= this.announced(w)) return false;
      if (S.announced && w < S.announced.w) return false;
      this.announce(w, tier);
      return true;
    },

    readOnly: function () { return readOnly; },

    reset: function () {
      S = blank();
      readOnly = false;
      try { const s = ls(); if (s) s.removeItem(KEY); } catch (e) {}
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
