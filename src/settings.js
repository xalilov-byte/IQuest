/* ─────────────────────────────────────────────────────────────────────────
   SOZLAMALAR — `nz-settings` kalitining yagona egasi (ARXITEKTURA §7, §10).

   Nima saqlanadi: ovoz, tebranish, kunlik eslatma (yoniq/vaqt), streak
   eslatmasi, birinchi kirish oʻtilgani va bir martalik tip-varaqlar.
   Til (`nz-lang`) va tema (`nz-theme`) bu yerda EMAS — ular oʻz
   egalarida qoladi (§10.1: bitta kalit = bitta ega).

   Diskdagi shakl (§10.2):
     { v: 1, sound: true, haptics: true,
       remind: { on: false, h: 19, m: 0 }, streakRemind: false,
       onboard: { done: false, at: 0, from: '' },
       tips: { testIntro: false } }

   UCH QAROR:

   1. BIR MARTALIK KOʻCHIRISH (1.0 → 1.1).
      1.0 da ovoz va bildirishnoma `nz-progress.soundOn/notifOn` da
      turardi. `nz-settings` yoʻq boʻlsa, fayl yuklanishi bilan oʻsha
      qiymatlar bir marta koʻchiriladi va darhol yoziladi. Bu
      bootstrapʼning birinchi `nzProgress.save()` idan OLDIN boʻladi
      (build tartibida settings progressdan oldin turadi). `null` —
      «hali tanlanmagan», yaʼni standart qiymat. `nz-progress` faqat
      oʻqiladi: eski versiyaga qaytilsa ham u oʻz qiymatini topadi.

   2. STANDART — OʻCHIQ ESLATMA.
      Yangi oʻrnatishda `remind.on = false`, `streakRemind = false`
      (§7.3). 1.0 dagi `notifOn: true` standarti chalgʻitardi: hech kim
      yoqmagan eslatma «yoniq» koʻrinardi. Ruxsat faqat foydalanuvchi
      oʻzi yoqqanda soʻraladi (bootstrap.js).

   3. YANGIROQ MAʼLUMOT USTIGA YOZILMAYDI.
      Ilova eski versiyaga qaytarilsa diskda `v: 2` turishi mumkin.
      Uni «tushunmadim → boʻsh» deb qayta yozish yangi versiyaning
      maʼlumotini yoʻq qilardi. Shunday holatda sozlamalar faqat
      XOTIRADA ishlaydi: `readOnly() === true`, diskka hech narsa
      yozilmaydi. BUZILGAN yozuv (JSON emas, `v` yoʻq) esa tiklab
      boʻlmaydi — standartlar diskka yoziladi va saqlash davom etadi
      (aks holda sozlamalar abadiy saqlanmasdi). Ikkala holatda ham
      foydalanuvchi ilovadan avval foydalangan, shuning uchun birinchi
      kirish va tiplar qayta koʻrsatilmaydi.

   `localStorage` umuman ishlamasa ham (maxfiy oyna, joy tugagan) modul
   yiqilmaydi: hammasi xotirada davom etadi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const KEY = 'nz-settings';
  const OLD_KEY = 'nz-progress';      // 1.0 dagi soundOn/notifOn shu yerda
  const V = 1;

  /* Tip-varaq nomlari. v1.1 da bittasi bor (§3.12), lekin roʻyxat
     qatʼiy yopiq emas: yangi tip qoʻshilsa bu faylni oʻzgartirish shart
     boʻlmasin. Nom shakli tekshiriladi va soni cheklanadi — kalit
     foydalanuvchi qoʻli bilan oʻzgartirilishi mumkin boʻlgan joydan
     keladi. */
  const KNOWN_TIPS = ['testIntro'];
  const TIP_ID = /^[a-z][A-Za-z0-9]{1,31}$/;
  const TIPS_MAX = 16;

  /* Kelajakdagi versiyalar uchun migratsiya zanjiri: MIGRATE[n] v:n
     shaklini v:n+1 ga oʻtkazadi. Hozir V = 1, zanjir boʻsh. */
  const MIGRATE = {};

  /* ── Qurilma xotirasi ──────────────────────────────────────────────── */
  let works = true;

  function readText(key) {
    try { return localStorage.getItem(key); }
    catch (e) { works = false; return null; }
  }

  function writeText(key, text) {
    try { localStorage.setItem(key, text); return true; }
    catch (e) { works = false; return false; }
  }

  function parse(text) {
    try { return { ok: true, value: JSON.parse(text) }; }
    catch (e) { return { ok: false, value: null }; }
  }

  /* ── Boʻsh holat ───────────────────────────────────────────────────── */
  function blankTips() {
    const t = Object.create(null);
    KNOWN_TIPS.forEach(id => { t[id] = false; });
    return t;
  }

  function blank() {
    return {
      v: V,
      sound: true,
      haptics: true,
      remind: { on: false, h: 19, m: 0 },
      streakRemind: false,
      onboard: { done: false, at: 0, from: '' },
      tips: blankTips(),
    };
  }

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  const int = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);

  function saneTips(raw) {
    const out = blankTips();
    if (!isObj(raw)) return out;
    let n = Object.keys(out).length;
    Object.keys(raw).forEach(k => {
      if (!TIP_ID.test(k) || typeof raw[k] !== 'boolean') return;
      if (!(k in out)) {
        if (n >= TIPS_MAX) return;
        n++;
      }
      out[k] = raw[k];
    });
    return out;
  }

  /* v === V boʻlgan yozuvning har maydoni alohida tekshiriladi:
     yaramagan maydon standartga tushadi, qolganlari saqlanadi. */
  function sane(raw) {
    const b = blank();
    const r = isObj(raw.remind) ? raw.remind : {};
    const o = isObj(raw.onboard) ? raw.onboard : {};
    const from = typeof o.from === 'string' && o.from.length <= 20 && /^[0-9A-Za-z.\-]*$/.test(o.from)
      ? o.from : '';
    return {
      v: V,
      sound: bool(raw.sound, b.sound),
      haptics: bool(raw.haptics, b.haptics),
      remind: {
        on: bool(r.on, b.remind.on),
        h: int(r.h, 0, 23, b.remind.h),
        m: int(r.m, 0, 59, b.remind.m),
      },
      streakRemind: bool(raw.streakRemind, b.streakRemind),
      onboard: {
        done: bool(o.done, false),
        at: typeof o.at === 'number' && isFinite(o.at) && o.at >= 0 ? o.at : 0,
        from: from,
      },
      tips: saneTips(raw.tips),
    };
  }

  /* 1.0 dan koʻchirish: faqat aniq boolean qiymatlar olinadi, `null`
     yoki yoʻq maydon — standart. */
  function fromLegacy() {
    const s = blank();
    const p = parse(readText(OLD_KEY) || 'null').value;
    if (isObj(p)) {
      if (typeof p.soundOn === 'boolean') s.sound = p.soundOn;
      if (typeof p.notifOn === 'boolean') s.remind.on = p.notifOn;
    }
    return s;
  }

  /* Faqat xotirada ishlaydigan holat (yangiroq yoki buzilgan yozuv).
     Foydalanuvchi ilovani avval ishlatgan — birinchi kirish va tiplar
     unga qayta koʻrsatilmaydi. */
  function readOnlyDefaults() {
    const s = blank();
    s.onboard = { done: true, at: 0, from: '' };
    Object.keys(s.tips).forEach(k => { s.tips[k] = true; });
    return s;
  }

  /* ── Yuklash ──────────────────────────────────────────────────────────
     origin: 'stored' | 'migrated' | 'new' | 'newer' | 'corrupt' */
  let store, origin, ro = false;

  (function load() {
    const text = readText(KEY);
    if (text === null) {
      if (!works) { store = blank(); origin = 'new'; return; }
      const hadOld = readText(OLD_KEY) !== null;
      store = fromLegacy();
      origin = hadOld ? 'migrated' : 'new';
      persist();                       // koʻchirish bir marta boʻladi
      return;
    }
    const p = parse(text);
    let raw = p.value;
    /* Buzilgan yozuv — tiklab boʻlmaydi: standartlar (birinchi kirish
       oʻtilgan) DISKKA yoziladi va sozlamalar yana saqlanadi. Aks holda
       bitta buzuq yozuv ilovani abadiy «faqat xotirada» qoldirardi (G5).
       Faqat YANGIROQ versiya yozuvi tegilmaydi (ro). */
    if (!p.ok || !isObj(raw) || !Number.isInteger(raw.v) || raw.v < 1) {
      store = readOnlyDefaults(); origin = 'corrupt'; persist(); return;
    }
    if (raw.v > V) {
      store = readOnlyDefaults(); origin = 'newer'; ro = true; return;
    }
    let migrated = false;
    while (raw.v < V) {
      const step = MIGRATE[raw.v];
      if (!step) { store = readOnlyDefaults(); origin = 'corrupt'; persist(); return; }
      raw = step(raw);
      migrated = true;
    }
    store = sane(raw);
    origin = 'stored';
    if (migrated) persist();
  })();

  function persist() {
    if (ro) return false;
    return writeText(KEY, JSON.stringify(store));
  }

  /* Tashqariga har doim NUSXA beriladi: Main uni stateʼga qoʻyadi va
     uning oʻzgarishi modul ichidagi holatga tegmasligi kerak. */
  function copy() {
    const tips = {};
    Object.keys(store.tips).forEach(k => { tips[k] = store.tips[k]; });
    return {
      v: store.v,
      sound: store.sound,
      haptics: store.haptics,
      remind: { on: store.remind.on, h: store.remind.h, m: store.remind.m },
      streakRemind: store.streakRemind,
      onboard: { done: store.onboard.done, at: store.onboard.at, from: store.onboard.from },
      tips: tips,
    };
  }

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function commit(next) {
    if (same(next, store)) return;
    store = next;
    persist();
  }

  window.nzSettings = {
    get: copy,

    /* patch — foydalanuvchi boshqaradigan maydonlar:
         { sound?, haptics?, remind?: { on?, h?, m? }, streakRemind?, tips? }
       `remind` va `tips` qisman birlashtiriladi. `v` va `onboard` bu
       yerdan oʻzgarmaydi (birinchi kirish — markOnboarded). Yaroqsiz
       qiymat eʼtiborsiz qoladi. Qaytaradi: yangi holat nusxasi. */
    set: function (patch) {
      if (!isObj(patch)) return copy();
      /* Yaroqsiz qiymat standartga emas, JORIY qiymatga qoladi:
         set({ sound: 'ha' }) ovozni yoqib ham, oʻchirib ham yubormaydi. */
      const next = copy();
      if (typeof patch.sound === 'boolean') next.sound = patch.sound;
      if (typeof patch.haptics === 'boolean') next.haptics = patch.haptics;
      if (typeof patch.streakRemind === 'boolean') next.streakRemind = patch.streakRemind;
      if (isObj(patch.remind)) {
        const r = patch.remind;
        if (typeof r.on === 'boolean') next.remind.on = r.on;
        if (int(r.h, 0, 23, null) !== null) next.remind.h = r.h;
        if (int(r.m, 0, 59, null) !== null) next.remind.m = r.m;
      }
      if (isObj(patch.tips)) {
        Object.keys(patch.tips).forEach(k => {
          if (TIP_ID.test(k) && typeof patch.tips[k] === 'boolean') next.tips[k] = patch.tips[k];
        });
      }
      commit(sane(next));
      return copy();
    },

    isOnboarded: function () { return store.onboard.done; },

    /* Birinchi kirish oqimi oxirida (§4.1). ver — ilova versiyasi
       (`nzSite.version`), tarix uchun. */
    markOnboarded: function (ver) {
      const next = copy();
      next.onboard = { done: true, at: Date.now(), from: typeof ver === 'string' ? ver : '' };
      commit(sane(next));
    },

    /* tip(id) — shu tip-varaq allaqachon koʻrsatilganmi (true — koʻrilgan). */
    tip: function (id) { return typeof id === 'string' && TIP_ID.test(id) && store.tips[id] === true; },
    markTip: function (id) {
      if (typeof id !== 'string' || !TIP_ID.test(id)) return;
      const next = copy();
      next.tips[id] = true;
      commit(sane(next));
    },

    /* true — diskdagi yozuv yangiroq versiyaniki:
       sozlamalar faqat shu sessiya xotirasida ishlaydi. */
    readOnly: function () { return ro; },

    /* Yordamchi (API shartnomasidan tashqari, faqat oʻqish uchun):
       yozuv qayerdan kelgani — 'stored' | 'migrated' | 'new' | 'newer' |
       'corrupt'. 'migrated' va 'new' — shu ishga tushishda `nz-settings`
       hali yoʻq edi. */
    origin: function () { return origin; },
    works: function () { return works; },
  };
})();
