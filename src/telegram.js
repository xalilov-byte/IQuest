/* ─────────────────────────────────────────────────────────────────────────
   TELEGRAM MINI APP qatlami — faqat `node build.mjs --target=tg` da.

   bootstrap.js dan KEYIN yuklanadi (window.nzApp tayyor). SDK
   (telegram-web-app.js) <head> da, shuning uchun Telegram.WebApp shu
   paytda bor. Oddiy brauzerda ochilsa (initData yoʻq) — hech narsa
   qilmaydi, ilova oddiy web ilova boʻlib ishlayveradi.

     · ready() + expand() — yuklanish tugadi, toʻliq balandlik;
     · BackButton → app.onBack(): Bosh ekranda (Bosh tab, ochiq ekran/
       dialog yoʻq) yashirin, boshqa joyda koʻrinadi;
     · tema: «Qurilma» (auto) rejimida Telegram colorScheme ga ergashadi,
       sarlavha va fon rangi ilova foniga moslanadi;
     · start_param (unlock_IQ-XXXX_YYYYYY) — Main.pwFromLink() oʻzi oʻqiydi
       (initDataUnsafe.start_param), bu yerda qoʻshimcha ish yoʻq;
     · window.open: t.me havolalari → openTelegramLink (Mini App
       yopilmaydi), boshqa https havolalar → openLink (tashqi brauzer).
   ───────────────────────────────────────────────────────────────────── */
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const app = window.nzApp;
  const inTg = !!(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')));
  window.nzTelegram = { active: inTg };
  if (!inTg || !app) return;

  const at = v => { try { return !!tg.isVersionAtLeast && tg.isVersionAtLeast(v); } catch (e) { return false; } };
  const safe = fn => { try { fn(); } catch (e) {} };

  safe(() => tg.ready());
  safe(() => tg.expand());
  /* Pastga surish Mini App'ni yopmasin (savol/oʻyin paytida). */
  if (at('7.7')) safe(() => tg.disableVerticalSwipes());

  /* ── Havolalar ────────────────────────────────────────────────────── */
  const origOpen = window.open ? window.open.bind(window) : null;
  window.open = function (url) {
    const u = String(url || '');
    if (/^https:\/\/t\.me\//i.test(u) && tg.openTelegramLink) { safe(() => tg.openTelegramLink(u)); return null; }
    if (/^https?:\/\//i.test(u) && tg.openLink) { safe(() => tg.openLink(u)); return null; }
    return origOpen ? origOpen.apply(window, arguments) : null;
  };

  /* ── Tema ─────────────────────────────────────────────────────────── */
  function applyTheme() {
    if (app.state.themePref !== 'auto') return;
    const t = tg.colorScheme === 'dark' ? 'dark' : 'light';
    if (app.state.theme !== t) app.setState({ theme: t });
  }
  let painted = null;
  function paint() {
    const bg = app.state.theme === 'dark' ? '#14121F' : '#F5F3FF';
    if (bg === painted) return;
    painted = bg;
    if (at('6.1')) {
      safe(() => tg.setHeaderColor(bg));
      safe(() => tg.setBackgroundColor(bg));
    }
    if (at('7.10')) safe(() => tg.setBottomBarColor(bg));
  }

  /* ── Orqaga tugmasi ───────────────────────────────────────────────── */
  const BB = tg.BackButton;
  function atHome() {
    const s = app.state;
    const ob = s.onboard;
    let cel = false;
    try { cel = typeof app.celebrateVisible === 'function' && !!app.celebrateVisible(); } catch (e) {}
    return s.view === 'app' && s.tab === 'home' && !s.dialog && !s.sheet && !s.run && !s.game &&
           !s.result && !(s.stack && s.stack.length) && !cel &&
           (!ob || (ob.i === 0 && ob.mode !== 'replay'));
  }
  let shown = null;
  function syncBack() {
    if (!BB || !at('6.1')) return;
    const want = !atHome();
    if (want === shown) return;
    shown = want;
    safe(() => (want ? BB.show() : BB.hide()));
  }
  if (BB && at('6.1')) {
    BB.onClick(() => {
      let handled = false;
      try { handled = !!app.onBack(); } catch (e) {}
      if (!handled) { shown = false; safe(() => BB.hide()); }
    });
  }

  function sync() { paint(); syncBack(); }

  const prevSetState = app.setState;
  app.setState = function () {
    const r = prevSetState.apply(app, arguments);
    sync();
    return r;
  };
  safe(() => tg.onEvent('themeChanged', applyTheme));

  applyTheme();
  sync();
})();
