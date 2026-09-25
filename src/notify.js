/* ─────────────────────────────────────────────────────────────────────────
   BILDIRISHNOMA — kunlik eslatma va streak eslatmasi (ARXITEKTURA §7.2).

   Nima uchun alohida fayl: bootstrap.js va feedback.js kabi bu ham
   qurilma qatlami. Main faqat sozlamani yozadi (`nzSettings`), uni
   haqiqiy rejaga aylantirish shu faylning va bootstrapʼning ishi.

   IKKI QISM:

   1. buildPlan(now, cfg, ctx) — SOF FUNKSIYA. Qachon, qaysi ID bilan,
      qanday matn — hammasi shu yerda hisoblanadi va snapshot testlari
      bilan tekshiriladi. Qurilmaga tegmaydi.
        cfg — nzSettings.get();  ctx — { activeToday, streak, lang }.
      Natija: [{ id, at, title, body, extra }], `at` — ms (mahalliy vaqt).

   2. apply(plan, { interactive }) — rejani qurilmaga qoʻyadi. Avval
      1901–1907 va 1911 ni bekor qiladi (1.0 ning takroriy 1901 ini ham),
      keyin rejani qoʻyadi. Qaytaradi (Promise):
        'scheduled' | 'denied' | 'no-permission' | 'unsupported' | 'error'

   HALOLLIK QOIDALARI:
   - MAVJUDLIK. Plagin yoʻq joyda (brauzer, sayt) boʻlim umuman
     koʻrsatilmaydi — available() shuni aytadi.
   - RUXSAT faqat foydalanuvchi niyati bilan soʻraladi (interactive).
     Ilova ochilishida faqat tekshiriladi: ruxsat yoʻq boʻlsa
     'no-permission' — bootstrap sozlamani jimgina oʻchiradi.
   - KUNIGA KOʻPI BILAN 2 TA, faqat NOANIQ alarm (isExactNotification:
     false). Aniq alarm Android 12+ da SCHEDULE_EXACT_ALARM talab qiladi:
     Play uni faqat budilnik/kalendarga beradi, plagin esa standart
     holatda foydalanuvchini tizim sozlamalariga olib ketadi.
   - VAʼDA YOʻQ. Matn faqat kunda haqiqatda sanaladigan narsani aytadi:
     kunlik vazifalar (10 ta mashq savoli va bitta aql oʻyini) va
     streak (bitta javob uni saqlaydi). «IQ oshadi» kabi gap yoʻq.
   - TIL. Matn reja tuzilayotgan paytdagi tilda (nzT/nzTN). Til
     almashsa bootstrap rejani qayta tuzadi — eski tildagi eslatma
     qolib ketmaydi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const DAILY_IDS = [1901, 1902, 1903, 1904, 1905, 1906, 1907];
  const STREAK_ID = 1911;
  const ALL_IDS = DAILY_IDS.concat([STREAK_ID]);

  const DAYS = 7;
  const DAY_START_HOUR = 4;          // progress.js dagi kun chegarasi bilan bir xil
  const STREAK_H = 21, STREAK_M = 30;
  /* Kunlik eslatma shu vaqtdan kech boʻlsa oʻsha kuni streak eslatmasi
     qoʻyilmaydi: 21:30 ga 2 soatdan yaqin, kunlik eslatma yetarli. */
  const LATE_MIN = 19 * 60 + 30;

  const TITLE = 'IQuest';
  /* Uzbek manba satrlari (rus/ingliz lugʻatlari shu satr bilan kalitlanadi). */
  const DAILY_BODY = 'Bugungi vazifalar tayyor: 10 ta savol va bitta aql oʻyini.';
  const STREAK_BODY = '{0} kunlik ketma-ketlikni saqlab qoling — bugun bitta savol yetarli.';

  function plugin() {
    const cap = window.Capacitor;
    return (cap && cap.Plugins && cap.Plugins.LocalNotifications) || null;
  }

  function available() { return !!plugin(); }

  function tr(s) { return typeof window.nzT === 'function' ? window.nzT(s) : s; }
  function trn(tpl, n) {
    const s = typeof window.nzTN === 'function' ? window.nzTN(tpl, n) : tr(tpl);
    return String(s).split('{0}').join(String(n));
  }

  /* Kun D ning kalendar sanasi (04:00 chegarasi bilan): now − 4 soat. */
  function dayBase(now) {
    const d = new Date(now - DAY_START_HOUR * 3600000);
    return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() };
  }

  /* Kun (base + i) ichidagi h:m vaqti. 04:00 dan oldingi vaqt shu kunga
     tegishli tunga — ertasi kalendar sanasiga tushadi. */
  function slot(base, i, h, m) {
    const extra = h < DAY_START_HOUR ? 1 : 0;
    return new Date(base.y, base.mo, base.d + i + extra, h, m, 0, 0).getTime();
  }

  function buildPlan(now, cfg, ctx) {
    const c = cfg || {};
    const x = ctx || {};
    const r = c.remind || {};
    const out = [];
    const base = dayBase(now);
    const lang = typeof x.lang === 'string' ? x.lang : 'uz';
    const active = !!x.activeToday;
    const streak = Number.isInteger(x.streak) && x.streak > 0 ? x.streak : 0;
    const h = Number.isInteger(r.h) && r.h >= 0 && r.h <= 23 ? r.h : 19;
    const m = Number.isInteger(r.m) && r.m >= 0 && r.m <= 59 ? r.m : 0;
    const remindOn = r.on === true;

    if (remindOn) {
      const body = tr(DAILY_BODY);
      for (let i = 0; i < DAYS; i++) {
        const at = slot(base, i, h, m);
        if (at <= now) continue;               // vaqt oʻtgan
        if (i === 0 && active) continue;       // bugun allaqachon faol
        out.push({ id: DAILY_IDS[i], at: at, title: TITLE, body: body,
                   extra: { to: 'home', kind: 'daily', lang: lang } });
      }
    }

    if (c.streakRemind === true && streak >= 2) {
      /* Faol boʻlsa streak ERTAGA xavf ostida, aks holda bugun. */
      const day = active ? 1 : 0;
      const at = slot(base, day, STREAK_H, STREAK_M);
      const late = remindOn && h * 60 + m >= LATE_MIN;
      if (at > now && !late) {
        out.push({ id: STREAK_ID, at: at, title: TITLE, body: trn(STREAK_BODY, streak),
                   extra: { to: 'home', kind: 'streak', lang: lang } });
      }
    }

    out.sort((a, b) => a.at - b.at || a.id - b.id);
    return out;
  }

  /* ── Qoʻllash ─────────────────────────────────────────────────────────
     Chaqiruvlar ketma-ket bajariladi: ikki apply bir vaqtda kelsa
     birining cancel/schedule i ikkinchisinikiga aralashib ketmaydi. */
  let chain = Promise.resolve();

  async function doApply(plan, interactive) {
    const ln = plugin();
    if (!ln) return 'unsupported';
    try {
      // Avval hammasi bekor: bir xil ID bilan schedule platformalarda
      // turlicha ishlaydi, cancel esa aniq. Ruxsat talab qilmaydi.
      try { await ln.cancel({ notifications: ALL_IDS.map(id => ({ id: id })) }); } catch (e) {}

      const list = Array.isArray(plan) ? plan : [];
      if (!list.length && !interactive) return 'scheduled';

      let perm = await ln.checkPermissions();
      if (!perm || perm.display !== 'granted') {
        if (!interactive) return 'no-permission';
        perm = await ln.requestPermissions();
      }
      if (!perm || perm.display !== 'granted') return 'denied';

      /* Ruxsat oynasi uzoq turgan boʻlishi mumkin: oʻtib ketgan vaqt
         darhol chiqib ketardi — shuning uchun qayta tekshiriladi. */
      const now = Date.now();
      const items = list.filter(p => p && ALL_IDS.indexOf(p.id) !== -1 &&
                                     typeof p.at === 'number' && p.at > now + 1000);
      if (!items.length) return 'scheduled';
      await ln.schedule({
        notifications: items.map(p => ({
          id: p.id,
          title: p.title,
          body: p.body,
          extra: p.extra,
          autoCancel: true,
          isExactNotification: false,
          schedule: { at: new Date(p.at), allowWhileIdle: true },
        })),
      });
      return 'scheduled';
    } catch (e) {
      return 'error';
    }
  }

  function apply(plan, opts) {
    const interactive = !!(opts && opts.interactive);
    const run = chain.then(() => doApply(plan, interactive));
    chain = run.catch(() => {});
    return run;
  }

  /* Ruxsat holati (soʻramasdan): 'granted' | 'denied' | 'prompt' | 'unsupported'. */
  function permission() {
    const ln = plugin();
    if (!ln) return Promise.resolve('unsupported');
    return Promise.resolve()
      .then(() => ln.checkPermissions())
      .then(p => (p && p.display === 'granted') ? 'granted'
                 : (p && p.display === 'denied') ? 'denied' : 'prompt')
      .catch(() => 'prompt');
  }

  window.nzNotify = {
    available: available,
    buildPlan: buildPlan,
    apply: apply,
    permission: permission,
    ids: function () { return ALL_IDS.slice(); },
  };
})();
