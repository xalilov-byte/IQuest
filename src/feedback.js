/* ─────────────────────────────────────────────────────────────────────────
   OVOZ VA TEBRANISH — ilovaning 12 ta qisqa ovozi (ARXITEKTURA §9.5).

   Nima uchun alohida fayl: ovoz «dizayn» emas, qurilma bilan muloqot
   qatlami — bootstrap.js kabi. Main faqat «shu yerda toʻgʻri javob
   berildi» deydi (`nzFeedback.play('correct')`), u qanday eshitilishini
   shu fayl hal qiladi.

   NIMA UCHUN OVOZ FAYLI YOʻQ:
   .mp3/.ogg fayllari APKʼga 50–200 KB qoʻshadi va oflayn ilovada har
   kilobayt hisobda. Ovoz WebAudio bilan JOYIDA sintez qilinadi — nol
   bayt aktiv, nol tarmoq soʻrovi.

   OVOZ QOIDALARI (bitta «oila», bitta balandlik):
   - Notalar C-major pentatonikadan (C D E G A). Yagona istisno — tanga
     chertishidagi B6 (§9.5 jadvali): u E6 ga toza kvinta, yorqin va
     qulogʻga tegmaydi.
   - Choʻqqi gain ≤ 0,16, fanfaralar (koʻp notali bayram) ≤ 0,12. Hamma
     ovoz bitta master gain orqali chiqadi — biri boshqasidan baland
     eshitilmaydi, alohida «ovoz balandligi» sozlamasi kerak emas.
   - Har nota yumshoq konvert bilan: bir necha ms koʻtarilish va
     eksponensial soʻnish. Oscillator toʻgʻridan-toʻgʻri boshlanib
     toʻxtatilsa toʻlqin oʻrtasida uzilib «chirt» etadi.
   - «wrong» dagi square toʻlqin past chastotali filtrdan oʻtadi:
     maqsad jazolash emas, farqni bildirish.

   XULQ QOIDALARI:
   - Ovoz va tebranish ALOHIDA almashtirgichlar (`configure`).
   - 60 ms ichida bittadan ortiq ovoz chalinmaydi: ikki marta bosish
     yoki bir vaqtda kelgan ikki hodisa shovqinga aylanmaydi. Muhimroq
     ovoz (masalan `levelUp` `finish` dan keyin) oldingisini yumshoq
     kesib, oʻrnini egallaydi.
   - Ilova fonda boʻlsa ovoz ham, tebranish ham yoʻq.
   - Navigatsiya va scrollʼda ovoz yoʻq, testda faqat `select` — bu
     qoidalarni chaqiruvchi (Main) bajaradi.

   MUHIM TEXNIK NUQTA — avtoijro siyosati:
   AudioContext foydalanuvchi harakatidan OLDIN yaratilsa «suspended»
   holatda qoladi va hech narsa eshitilmaydi. Shuning uchun kontekst
   birinchi bosishda yaratiladi/tiklanadi va har chalishda holati
   tekshiriladi. Fonga oʻtganda kontekst toʻxtatiladi (batareya).
   ───────────────────────────────────────────────────────────────────── */

(function () {
  /* Chastotalar (Hz). */
  const A3 = 220.00, E3 = 164.81, G3 = 196.00;
  const G4 = 392.00;
  const C5 = 523.25, E5 = 659.25, G5 = 783.99;
  const C6 = 1046.50, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;
  const B6 = 1975.53;

  const PEAK_MAX = 0.16;       // har qanday ovoz
  const FANFARE_MAX = 0.12;    // koʻp notali bayram ovozlari
  const THROTTLE_MS = 60;

  /* Har ovoz — ovozlar (voice) roʻyxati:
       f  — chastota, to — sirpanish nishoni (ixtiyoriy), gl — sirpanish vaqti
       at — boshlanish (s), d — davomiylik (s), g — choʻqqi gain
       w  — toʻlqin shakli, a — koʻtarilish (s)
       h  — oktava yuqoridagi ohista obertonning nisbati (iliqlik uchun)
       lp — past chastotali filtr (Hz)
     noise — filtrlangan shovqin boʻlagi (faqat `purchase`).
     dur — jadvaldagi umumiy davomiylik (s), vib — tebranish naqshi. */
  const coinVoices = at => [
    { f: E6, at: at, d: 0.09, g: 0.09, w: 'sine', a: 0.003, h: 0.12 },
    { f: B6, at: at + 0.045, d: 0.115, g: 0.075, w: 'sine', a: 0.003 },
  ];

  const SOUNDS = {
    /* Variant tanlandi, almashtirgich, rang namunasi — deyarli sezilmas «tik». */
    select: { dur: 0.03, vib: 6, voices: [
      { f: C6, at: 0, d: 0.03, g: 0.05, w: 'sine', a: 0.003 },
    ] },
    /* Toʻgʻri — koʻtariluvchi ikki nota (G5 → D6). Koʻtarilish «toʻgʻri»
       hissini beradi; pasayuvchi ketma-ketlik xato kabi eshitiladi. */
    correct: { dur: 0.25, vib: 18, voices: [
      { f: G5, at: 0, d: 0.12, g: 0.14, w: 'sine', a: 0.008, h: 0.15 },
      { f: D6, at: 0.08, d: 0.17, g: 0.12, w: 'sine', a: 0.008, h: 0.15 },
    ] },
    /* Xato — past, «toʻmtoq», pasayuvchi (G3 → E3). */
    wrong: { dur: 0.32, vib: [26, 45, 26], voices: [
      { f: G3, at: 0, d: 0.17, g: 0.12, w: 'square', a: 0.01, lp: 900 },
      { f: E3, at: 0.1, d: 0.22, g: 0.10, w: 'square', a: 0.01, lp: 800 },
    ] },
    /* Oqim tugadi — C6 → E6 → G6. */
    finish: { dur: 0.5, fanfare: true, vib: [18, 60, 18, 60, 30], voices: [
      { f: C6, at: 0, d: 0.16, g: 0.11, w: 'sine', a: 0.008, h: 0.12 },
      { f: E6, at: 0.11, d: 0.16, g: 0.10, w: 'sine', a: 0.008, h: 0.12 },
      { f: G6, at: 0.22, d: 0.28, g: 0.10, w: 'sine', a: 0.008, h: 0.12 },
    ] },
    /* Oʻyin boshlandi — bitta qisqa G5. */
    gameStart: { dur: 0.08, vib: 12, voices: [
      { f: G5, at: 0, d: 0.08, g: 0.09, w: 'sine', a: 0.004, h: 0.1 },
    ] },
    /* Oʻyin darajasi oshdi — C6 D6 E6 G6 zinapoyasi. */
    levelUp: { dur: 0.45, fanfare: true, vib: [15, 30, 15], voices: [
      { f: C6, at: 0, d: 0.12, g: 0.09, w: 'triangle', a: 0.006 },
      { f: D6, at: 0.08, d: 0.12, g: 0.09, w: 'triangle', a: 0.006 },
      { f: E6, at: 0.16, d: 0.12, g: 0.09, w: 'triangle', a: 0.006 },
      { f: G6, at: 0.24, d: 0.21, g: 0.10, w: 'triangle', a: 0.006 },
    ] },
    /* Tanga tushdi — E6 va B6 yorqin chertish. */
    coin: { dur: 0.16, vib: 12, voices: coinVoices(0) },
    /* Xarid — yumshoq «shit» (filtrlangan shovqin) va tanga. */
    purchase: { dur: 0.3, vib: 25, noise: { at: 0, d: 0.12, g: 0.06, bp: 2600 },
      voices: coinVoices(0.14) },
    /* Yangi nishon — C5 E5 G5 C6 E6 fanfara. */
    badge: { dur: 0.9, fanfare: true, vib: [20, 40, 20, 40, 40], voices: [
      { f: C5, at: 0, d: 0.24, g: 0.085, w: 'triangle', a: 0.008 },
      { f: E5, at: 0.09, d: 0.24, g: 0.085, w: 'triangle', a: 0.008 },
      { f: G5, at: 0.18, d: 0.26, g: 0.085, w: 'triangle', a: 0.008 },
      { f: C6, at: 0.27, d: 0.3, g: 0.085, w: 'triangle', a: 0.008 },
      { f: E6, at: 0.36, d: 0.54, g: 0.09, w: 'triangle', a: 0.008, h: 0.1 },
    ] },
    /* Liga koʻtarildi / hafta mukofoti — koʻtariluvchi sirpanish va
       C-major akkord. Akkord ovozlari past: yigʻindisi ham chegarada. */
    leagueUp: { dur: 1.1, fanfare: true, vib: [30, 50, 30], voices: [
      { f: C5, to: G6, gl: 0.3, at: 0, d: 0.34, g: 0.06, w: 'sine', a: 0.02 },
      { f: C5, at: 0.3, d: 0.8, g: 0.04, w: 'triangle', a: 0.015 },
      { f: E5, at: 0.3, d: 0.8, g: 0.035, w: 'triangle', a: 0.015 },
      { f: G5, at: 0.3, d: 0.8, g: 0.035, w: 'triangle', a: 0.015 },
      { f: C6, at: 0.3, d: 0.8, g: 0.035, w: 'sine', a: 0.015 },
    ] },
    /* Kunning birinchi faoliyati — iliq G4 → C5. */
    streak: { dur: 0.28, vib: 15, voices: [
      { f: G4, at: 0, d: 0.13, g: 0.12, w: 'triangle', a: 0.01, h: 0.12 },
      { f: C5, at: 0.1, d: 0.18, g: 0.12, w: 'triangle', a: 0.01, h: 0.12 },
    ] },
    /* Tanga yetmaydi — bitta past A3 (telefon karnayida eshitilishi
       uchun oktava obertoni bilan). */
    denied: { dur: 0.15, vib: 20, voices: [
      { f: A3, at: 0, d: 0.15, g: 0.1, w: 'sine', a: 0.008, h: 0.35 },
    ] },
  };

  /* Bir vaqtda kelgan ikki ovozdan qaysi biri qoladi (katta — muhimroq). */
  const RANK = {
    select: 0, gameStart: 1, denied: 1, correct: 2, wrong: 2,
    coin: 3, streak: 3, finish: 3, purchase: 4, levelUp: 4, badge: 5, leagueUp: 5,
  };

  const cfg = { sound: true, haptics: true };
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let background = false;
  let last = null;              // { at, rank, voices }

  const hasDoc = typeof document !== 'undefined';

  function hidden() {
    return background || (hasDoc && document.visibilityState === 'hidden');
  }

  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; master = null; return null; }
    return ctx;
  }

  function resume() {
    const c = audio();
    if (c && c.state === 'suspended' && c.resume) {
      try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    }
    return c;
  }

  function suspend() {
    if (ctx && ctx.state === 'running' && ctx.suspend) {
      try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    }
  }

  /* Bitta nota. */
  function voice(c, v, base) {
    const t0 = base + v.at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = v.w || 'sine';
    osc.frequency.setValueAtTime(v.f, t0);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t0 + (v.gl || v.d));
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(v.g, t0 + (v.a || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.d);
    let head = osc;
    if (v.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.lp;
      osc.connect(f);
      head = f;
    }
    head.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + v.d + 0.02);
    const out = [{ src: osc, gain: gain }];
    if (v.h) {
      out.push.apply(out, voice(c, { f: v.f * 2, to: v.to && v.to * 2, gl: v.gl, at: v.at, d: v.d * 0.8,
                                     g: v.g * v.h, w: 'sine', a: v.a }, base));
    }
    return out;
  }

  /* Oq shovqin boʻlagi — bir marta yasaladi. Oddiy LCG: har ishga
     tushishda bir xil (sinovda ham takrorlanadi). */
  function noise(c, n, base) {
    if (!noiseBuf) {
      const rate = c.sampleRate || 44100;
      const len = Math.max(1, Math.round(rate * n.d));
      noiseBuf = c.createBuffer(1, len, rate);
      const data = noiseBuf.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        data[i] = (s / 0x3fffffff) - 1;
      }
    }
    const t0 = base + n.at;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = n.bp;
    f.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(n.g, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
    src.connect(f);
    f.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + n.d + 0.02);
    return [{ src: src, gain: gain }];
  }

  /* Oldingi ovozni «chirt»siz kesish: 15 ms da soʻndirib toʻxtatish. */
  function cut(voices) {
    if (!ctx || !voices) return;
    const t = ctx.currentTime;
    voices.forEach(v => {
      try {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value || 0.0001), t);
        v.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
        v.src.stop(t + 0.02);
      } catch (e) {}
    });
  }

  function synth(name) {
    const c = resume();
    if (!c || !master) return [];
    const s = SOUNDS[name];
    const base = c.currentTime + 0.005;
    let out = [];
    try {
      if (s.noise) out = out.concat(noise(c, s.noise, base));
      s.voices.forEach(v => { out = out.concat(voice(c, v, base)); });
    } catch (e) {}
    return out;
  }

  function vibrate(pattern) {
    // Android WebViewʼda Vibration API ishlaydi; iOS Safariʼda yoʻq —
    // shuning uchun mavjudligi tekshiriladi va xato boʻgʻiladi.
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch (e) {}
  }

  /* Chaladi. true — chalindi (ovoz yoki tebranish), false — jim qoldi
     (nom notoʻgʻri, ikkalasi oʻchiq, fon yoki 60 ms qoidasi). */
  function play(name) {
    const s = Object.prototype.hasOwnProperty.call(SOUNDS, name) ? SOUNDS[name] : null;
    if (!s) return false;
    if (!cfg.sound && !cfg.haptics) return false;
    if (hidden()) return false;
    const now = Date.now();
    const rank = RANK[name];
    if (last && now - last.at < THROTTLE_MS) {
      if (rank <= last.rank) return false;
      cut(last.voices);
    }
    last = { at: now, rank: rank, voices: [] };
    if (cfg.haptics) vibrate(s.vib);
    if (cfg.sound) last.voices = synth(name);
    return true;
  }

  /* Fon: ovoz toʻxtatiladi, kontekst uxlaydi. */
  function setBackground(bg) {
    background = !!bg;
    if (background) {
      if (last) cut(last.voices);
      suspend();
    }
  }

  if (hasDoc && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (last) cut(last.voices);
        suspend();
      }
    });
    /* Birinchi bosishda kontekst yaratiladi va tiklanadi — keyin
       taymerdan chalinadigan ovozlar (oʻyin yakuni, natija) ham
       eshitiladi. Ovoz oʻchiq boʻlsa kontekst umuman yaratilmaydi. */
    const unlock = () => {
      if (!cfg.sound) return;
      const c = resume();
      if (c && c.state === 'running') {
        ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.removeEventListener(ev, unlock, true));
      }
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, true));
  }

  window.nzFeedback = {
    play: play,

    /* Sozlamalar (nzSettings) bilan bogʻlanadi — bootstrap.js chaqiradi.
       Faqat berilgan maydon oʻzgaradi. Qaytaradi: joriy holat nusxasi. */
    configure: function (o) {
      if (o && typeof o.sound === 'boolean') {
        cfg.sound = o.sound;
        if (!cfg.sound && last) cut(last.voices);
      }
      if (o && typeof o.haptics === 'boolean') cfg.haptics = o.haptics;
      return { sound: cfg.sound, haptics: cfg.haptics };
    },
    config: function () { return { sound: cfg.sound, haptics: cfg.haptics }; },

    /* Tebranish qurilmada bormi — yoʻq boʻlsa Sozlamalardagi
       «Tebranish» qatori yashiriladi (§7.1). */
    canVibrate: function () {
      return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    },
    names: function () { return Object.keys(SOUNDS); },

    /* bootstrap.js Android ilova holatini (appStateChange) uzatadi —
       WebView har doim visibilitychange bermaydi. */
    background: setBackground,

    /* ── Eski taxalluslar (1.0 Main shularni chaqiradi) ─────────────── */
    correct: function () { play('correct'); },
    wrong: function () { play('wrong'); },
    finish: function () { play('finish'); },
    /* 1.0 dagi yagona «Ovoz» almashtirgichi ovozni ham, tebranishni ham
       boshqarardi — taxallus shu maʼnoni saqlaydi. */
    setEnabled: function (v) { cfg.sound = !!v; cfg.haptics = !!v; if (!v && last) cut(last.voices); },
    isEnabled: function () { return cfg.sound; },
  };

  /* Sinov va tekshiruv uchun: chegaralar (faqat oʻqish). */
  window.nzFeedback.limits = { peak: PEAK_MAX, fanfare: FANFARE_MAX, throttleMs: THROTTLE_MS };
})();
