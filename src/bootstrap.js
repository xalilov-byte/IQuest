/* ─────────────────────────────────────────────────────────────────────────
   Ilovani ishga tushirish: tema, sozlamalar, eslatmalar rejasi, Android
   «orqaga» tugmasi, status bar. Bularning hech biri dizaynga tegmaydi —
   qurilma bilan muloqot qatlami (ARXITEKTURA §2.3, §7, §9.5).

   Main bilan kelishuv (holat nomlarini faqat Main biladi):
     app.onBack()      → true (oʻzi hal qildi) | false (chiqish mumkin)
     app.openFrom(to)  → bildirishnoma bosilganda ('home')
     app.setPaused(b)  → ilova fonga ketdi / qaytdi (oʻyin taymeri)
     state.settings    → nzSettings.get() nusxasi (Main oʻzgartirganda
                         avval nzSettings.set(patch), keyin setState)
   Bootstrap Mainʼga faqat quyidagilarni yozadi:
     settings, notifDenied, notifAvailable (+ 1.0 UI uchun soundOn, notifOn).
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const root = document.getElementById('nz-root');
  const tpl = document.getElementById('nz-tpl');

  const plugins = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const S = window.nzSettings || null;
  const N = window.nzNotify || null;
  const F = window.nzFeedback || null;
  const P = window.nzProgress || null;

  /* ── Tema ─────────────────────────────────────────────────────────────
     Sukut boʻyicha qurilma sozlamasidan (Android tungi rejimi). Qurilma
     oʻzgarishi faqat «auto» rejimda kuzatiladi. */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const themeOf = () => (mq.matches ? 'dark' : 'light');

  const app = mount(Component, { defaultTheme: themeOf() }, root, tpl);

  /* Ilova nusxasi tashqariga ochiladi: admin qatlami (admin-boot.js)
     bazadan kelgan maʼlumotni shu orqali holatga yozadi. */
  window.nzApp = app;

  /* Status bar faqat tema OʻZGARGANDA yangilanadi. Ilgari har setState
     (oʻyinda sekundiga ~10 ta) ikkita bridge chaqiruvi berardi. */
  let lastTheme = null;
  function syncChrome() {
    const theme = app.state.theme;
    if (theme === lastTheme) return;
    lastTheme = theme;
    const dark = theme === 'dark';
    const bg = dark ? '#14121F' : '#F5F3FF';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bg);
    const sb = plugins().StatusBar;
    if (sb) {
      sb.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
      sb.setBackgroundColor({ color: bg }).catch(() => {});
    }
  }

  mq.addEventListener('change', () => {
    if (app.state.themePref === 'auto') app.setState({ theme: themeOf() });
  });

  function tr(text) { return window.nzT ? window.nzT(text) : text; }

  /* Qisqa xabar. Main oʻz toastʼini bersa (app.toast(uzMatn)) — shu,
     aks holda Android toast. */
  function say(uz) {
    if (typeof app.toast === 'function') { try { app.toast(uz); return; } catch (e) {} }
    const t = plugins().Toast;
    if (t) t.show({ text: tr(uz), duration: 'short' }).catch(() => {});
  }

  /* ── Sozlamalar: nzSettings — yagona manba ───────────────────────────
     Yangi UI stateʼda `settings` nusxasini ushlaydi. 1.0 UI esa
     `soundOn`/`notifOn` ni oʻzgartiradi — ular ham nzSettingsʼga
     koʻchiriladi, shunda UI almashguncha eski ekran ishlayveradi.
     nzSettings yoʻq buildʼda (modul hali ulanmagan) 1.0 xulqi. */
  const isNewUi = () => app.state.settings !== undefined && app.state.settings !== null;

  function cfgNow() {
    if (S) return S.get();
    const st = app.state;
    return {
      sound: st.soundOn !== false, haptics: st.soundOn !== false,
      remind: { on: st.notifOn === true, h: 19, m: 0 }, streakRemind: false,
    };
  }

  const USER_FIELDS = ['sound', 'haptics', 'streakRemind'];
  let prevUi = null;       // oxirgi koʻrilgan UI qiymatlari (oʻzgarishni topish uchun)

  function uiSnap() {
    const st = app.state;
    return { settings: st.settings, soundOn: st.soundOn, notifOn: st.notifOn };
  }

  /* UI → nzSettings. Main allaqachon nzSettings.set qilgan boʻlsa bu
     no-op; unutgan boʻlsa ham foydalanuvchining tanlovi yoʻqolmaydi.
     Faqat UI da HAQIQATAN oʻzgargan maydon koʻchiriladi — eskirgan
     nusxa tiplar yoki birinchi kirish bayrogʻini qaytarib yozmaydi. */
  function pullUi() {
    const cur = uiSnap();
    const prev = prevUi;
    prevUi = cur;
    if (!S || !prev) return;
    const a = prev.settings, b = cur.settings;
    if (a && b && a !== b) {
      const patch = {};
      USER_FIELDS.forEach(k => { if (b[k] !== a[k]) patch[k] = b[k]; });
      const ra = a.remind || {}, rb = b.remind || {};
      if (ra.on !== rb.on || ra.h !== rb.h || ra.m !== rb.m) patch.remind = { on: rb.on, h: rb.h, m: rb.m };
      if (Object.keys(patch).length) S.set(patch);
    }
    if (typeof cur.soundOn === 'boolean' && typeof prev.soundOn === 'boolean' && cur.soundOn !== prev.soundOn) {
      S.set({ sound: cur.soundOn });
    }
    if (typeof cur.notifOn === 'boolean' && typeof prev.notifOn === 'boolean' && cur.notifOn !== prev.notifOn) {
      S.set({ remind: { on: cur.notifOn } });
    }
  }

  /* nzSettings → feedback (ovoz va tebranish alohida). 1.0 UI da bitta
     «Ovoz» almashtirgichi tebranishni ham boshqarardi — shu saqlanadi. */
  let fbKey = null;
  function syncFeedback(cfg) {
    if (!F) return;
    const haptics = isNewUi() ? cfg.haptics : (cfg.haptics && cfg.sound);
    const key = cfg.sound + '|' + haptics;
    if (key === fbKey) return;
    fbKey = key;
    if (F.configure) F.configure({ sound: cfg.sound, haptics: haptics });
    else if (F.setEnabled) F.setEnabled(cfg.sound);
  }

  /* ── Eslatmalar rejasi (§7.2) ────────────────────────────────────────
     Reja qayta tuziladi: ilova ochilganda, fonga ketganda va qaytganda;
     kunning birinchi faoliyatida (activeToday oʻzgaradi); eslatma
     sozlamasi yoki TIL oʻzgarganda (eslatma yangi tilda qayta qoʻyiladi).
     Har setState da faqat arzon kalit solishtiriladi. */
  function planCtx() {
    let active = false, streak = 0, day = '';
    try {
      if (P && typeof P.activeToday === 'function') active = !!P.activeToday();
      if (P && typeof P.streak === 'function') streak = P.streak() | 0;
      if (P && typeof P.dayKey === 'function') day = P.dayKey();
    } catch (e) {}
    const lang = (window.nzI18n && window.nzI18n.get && window.nzI18n.get()) || app.state.lang || 'uz';
    return { activeToday: active, streak: streak, lang: lang, day: day };
  }

  let planKey = null;
  let prevRemind = null;    // { on, streak } — «yoqildi»ni aniqlash uchun
  let firstPlan = true;
  let busy = false, again = null;

  function maybePlan(cfg, force) {
    if (!N || !N.available || !N.available()) return;
    const ctx = planCtx();
    const key = [cfg.remind.on, cfg.remind.h, cfg.remind.m, cfg.streakRemind,
                 ctx.lang, ctx.activeToday, ctx.streak, ctx.day].join('|');
    /* Ruxsat faqat foydalanuvchi oʻzi YOQQANDA soʻraladi (Sozlamalardagi
       almashtirgich yoki birinchi kirishdagi [Yoqish]). Ilova ochilishida
       — hech qachon. */
    const turnedOn = !!prevRemind && ((cfg.remind.on && !prevRemind.on) || (cfg.streakRemind && !prevRemind.streak));
    prevRemind = { on: cfg.remind.on, streak: cfg.streakRemind };
    if (!force && !turnedOn && key === planKey) return;
    planKey = key;
    const interactive = turnedOn && !firstPlan;
    firstPlan = false;
    request(interactive);
  }

  /* Bir vaqtda bitta apply; orada kelgan soʻrovlar bittaga birlashadi. */
  function request(interactive) {
    if (busy) { again = { interactive: !!(again && again.interactive) || interactive }; return; }
    busy = true;
    const cfg = cfgNow();
    const ctx = planCtx();
    let plan = [];
    try { plan = N.buildPlan(Date.now(), cfg, ctx); } catch (e) {}
    const wants = cfg.remind.on || cfg.streakRemind;
    Promise.resolve()
      .then(() => N.apply(plan, { interactive: interactive && wants }))
      .then(res => planned(res, cfg, plan, interactive))
      .catch(() => {})
      .then(() => {
        busy = false;
        if (again) { const a = again; again = null; request(a.interactive); }
      });
  }

  function planned(res, cfg, plan, interactive) {
    const wants = cfg.remind.on || cfg.streakRemind;
    if ((res === 'denied' || res === 'no-permission') && wants) {
      /* Ruxsat yoʻq — sozlama «yoniq» koʻrinib, aslida hech narsa
         kelmasligi mumkin emas: holat haqiqatga qaytariladi. Ochilishdagi
         tekshiruv ('no-permission') jim; foydalanuvchi oʻzi rad etgan
         boʻlsa ('denied') sababi aytiladi. */
      if (S) S.set({ remind: { on: false }, streakRemind: false });
      const up = { notifDenied: true };
      if (S && isNewUi()) up.settings = S.get();
      if (typeof app.state.notifOn === 'boolean') up.notifOn = false;
      app.setState(up);
      if (res === 'denied') say('Bildirishnomaga ruxsat berilmagan — tizim sozlamalaridan yoqing');
    } else if (res === 'scheduled' && wants && (plan.length || interactive) && app.state.notifDenied) {
      app.setState({ notifDenied: false });
    }
  }

  function syncSettings(force) {
    pullUi();
    const cfg = cfgNow();
    syncFeedback(cfg);
    maybePlan(cfg, !!force);
  }

  /* ── Progressni saqlash ──────────────────────────────────────────────
     Faqat saqlanadigan maydonlardan biri OʻZGARGANDA yoziladi: oʻyin
     taymeri (sekundiga ~10 setState) butun progress yozuvini qayta
     yozmasin. setState qiymatlarni almashtiradi (mutatsiya emas), shuning
     uchun havola solishtirish yetadi. Fon/yopilishda esa har doim. */
  const PERSIST = ['points', 'marathonBest', 'answeredCount', 'countDay', 'examsDone',
                   'wrongIds', 'savedIds', 'signsAnswered', 'tasksAwarded', 'soundOn', 'notifOn'];
  let lastSaved = null;

  function saveProgress(force) {
    if (!P) return;
    const s = app.state;
    if (!force && lastSaved && PERSIST.every(k => s[k] === lastSaved[k])) return;
    lastSaved = {};
    PERSIST.forEach(k => { lastSaved[k] = s[k]; });
    /* Kunlik hisoblagich faqat OʻZ kuniga yoziladi. Ilova kechasi ochiq
       qolib ertalab biror bosish boʻlsa, kechagi «7/10» yangi kun nomi
       bilan diskka tushib, qayta ochilganda bugungi mashq boʻlib
       koʻrinardi. */
    const stale = s.countDay != null && typeof P.dayKey === 'function' && s.countDay !== P.dayKey();
    P.save(stale ? Object.assign({}, s, { answeredCount: 0 }) : s, []);
  }

  const origSetState = app.setState.bind(app);
  app.setState = function (patch) {
    origSetState(patch);
    syncChrome();
    syncSettings(false);
    saveProgress(false);
  };

  prevUi = uiSnap();
  /* Boshlangʻich holat: UI nzSettings haqiqatini koʻrsatsin (1.0 UI
     yangi oʻrnatishda «Bildirishnoma: 19:00» ni oʻzicha yoqib qoʻyardi). */
  if (S) {
    const cfg = S.get();
    const up = {};
    if (isNewUi() && JSON.stringify(app.state.settings) !== JSON.stringify(cfg)) up.settings = cfg;
    if (typeof app.state.soundOn === 'boolean' && app.state.soundOn !== cfg.sound) up.soundOn = cfg.sound;
    if (typeof app.state.notifOn === 'boolean' && app.state.notifOn !== cfg.remind.on) up.notifOn = cfg.remind.on;
    if (Object.keys(up).length) { origSetState(up); prevUi = uiSnap(); }
  }
  /* Bildirishnoma boʻlimi faqat plagin bor joyda koʻrsatiladi. */
  if (N && N.available && N.available()) origSetState({ notifAvailable: true });

  syncChrome();
  syncSettings(true);

  /* Boshlanish holatini darhol bir marta yozamiz: «Kunlik kirish»
     kabi componentDidMount dagi setState oʻram oʻrnatilishidan OLDIN
     boʻladi va saqlanmasdan qolardi. */
  saveProgress(true);

  /* ── Hayot sikli: fon va qaytish ─────────────────────────────────────
     Fonga ketganda yozuv darhol diskka tushadi (kutsa oxirgi javob
     yoʻqolardi), ovoz toʻxtaydi, eslatmalar rejasi yangilanadi.
     Uch hodisa, chunki har biri boshqa holatda ishlaydi: pagehide —
     brauzerda yopilish, visibilitychange — fonga oʻtish, appStateChange
     — Androidʼda ilovadan chiqish (WebView har doim visibilitychange
     bermaydi). */
  let lastLife = { active: true, at: 0 };

  function flushNow() {
    saveProgress(true);
    if (P && P.flush) P.flush();
  }

  function lifecycle(active) {
    const now = Date.now();
    // Ikki hodisa ketma-ket kelsa (visibilitychange + appStateChange) — bir marta.
    if (lastLife.active === active && now - lastLife.at < 1500) return;
    lastLife = { active: active, at: now };
    if (!active) flushNow();
    if (F && F.background) F.background(!active);
    syncSettings(true);
    if (active && app.state.notifDenied && N && N.permission) {
      /* Foydalanuvchi tizim sozlamalarida ruxsat bergan boʻlishi mumkin. */
      N.permission().then(p => { if (p === 'granted') app.setState({ notifDenied: false }); });
    }
  }

  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    lifecycle(document.visibilityState !== 'hidden');
  });

  /* ── Android: «orqaga», ilova holati, bildirishnoma bosilishi ─────────
     «Orqaga» zanjiri (§2.3) toʻliq Mainʼda: dialog → varaq → bayram →
     birinchi kirish → izoh → oʻyin → test/mashq → natija → push-stek →
     tab → Bosh. Bootstrap faqat app.onBack() ni chaqiradi; false
     qaytsa (Bosh yoki birinchi kirishning 0-qadami) «ikki marta bosish». */
  let lastBack = 0;

  function handleBack() {
    let handled = false;
    try { handled = !!(app.onBack && app.onBack()); } catch (e) { handled = false; }
    if (handled) { lastBack = 0; return; }
    const CapApp = plugins().App;
    if (Date.now() - lastBack < 2000) { if (CapApp) CapApp.exitApp(); return; }
    lastBack = Date.now();
    say('Chiqish uchun yana bir marta bosing');
  }

  /* Bildirishnoma bosildi → Bosh (v1.1 da har doim). Savol yoki oʻyin
     ketayotgan boʻlsa Main hech narsani almashtirmaydi (openFrom). */
  function openFrom(ev) {
    const n = ev && ev.notification;
    const to = n && n.extra && n.extra.to === 'home' ? 'home' : 'home';
    if (typeof app.openFrom === 'function') {
      try { app.openFrom(to); } catch (e) {}
    }
  }

  let wired = false;
  function wireDevice() {
    if (wired) return;
    wired = true;
    const pl = plugins();
    const CapApp = pl.App;
    if (CapApp && CapApp.addListener) {
      CapApp.addListener('backButton', handleBack);
      CapApp.addListener('appStateChange', st => {
        const active = !!(st && st.isActive);
        lifecycle(active);
        if (app.setPaused) app.setPaused(!active);
      });
    }
    const ln = pl.LocalNotifications;
    if (ln && ln.addListener) ln.addListener('localNotificationActionPerformed', openFrom);
  }

  if (window.Capacitor) wireDevice();
  else document.addEventListener('deviceready', wireDevice, { once: true });

  /* Savollar bazasi (src/data.js) CHAQIRILMAYDI: IQuest savollari
     qurilmadagi generatorlardan yasaladi va 1-versiya internetga umuman
     chiqmaydi (maxfiylik siyosati). */

  /* Splash — ilova chizilgandan keyin yopiladi (oq ekran koʻrinmasin) */
  requestAnimationFrame(() => {
    const sp = plugins().SplashScreen;
    if (sp) sp.hide().catch(() => {});
  });
})();
