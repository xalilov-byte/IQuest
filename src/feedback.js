/* ─────────────────────────────────────────────────────────────────────────
   OVOZ VA TEBRANISH — javob fikr-mulohazasi.

   Nima uchun alohida fayl: ovoz "dizayn" emas, qurilma bilan muloqot
   qatlami — bootstrap.js kabi. Dizayn fayli faqat "shu yerda to'g'ri
   javob berildi" deb aytadi, u qanday eshitilishini shu fayl hal qiladi.

   NIMA UCHUN OVOZ FAYLI YO'Q:
   .mp3/.ogg fayllari APK'ga 50–200 KB qo'shadi va offline ilovada har bir
   kilobayt hisobda. Bu yerda ovoz WebAudio bilan JOYIDA sintez qilinadi —
   nol bayt aktiv, nol tarmoq so'rovi. Uch nota va bitta shovqin yetadi.

   MUHIM TEXNIK NUQTA — brauzer avtoijro siyosati:
   AudioContext foydalanuvchi harakatidan OLDIN yaratilsa "suspended"
   holatda qoladi va hech narsa eshitilmaydi. Shuning uchun kontekst
   birinchi haqiqiy bosishda (javob tanlanganda) yaratiladi va har
   chaqiruvda holati tekshirilib, kerak bo'lsa tiklanadi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  let ctx = null;
  let enabled = true;

  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  /* Bitta nota.

     Konvert (gain ramp) ataylab qo'yilgan: oscillator to'g'ridan-to'g'ri
     boshlanib to'xtatilsa to'lqin o'rtasida uzilib "chirt" etadi. 12 ms
     ko'tarilish va eksponensial pasayish buni yo'qotadi — ovoz yumshoq
     chiqadi. */
  function tone(freq, startAfter, dur, peak, type) {
    const c = audio();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;

    const t0 = c.currentTime + startAfter;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function vibrate(pattern) {
    // Android WebView'da Vibration API ishlaydi; iOS Safari'da yo'q —
    // shuning uchun mavjudligi tekshiriladi va xato bo'g'iladi.
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  function resume() {
    const c = audio();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  window.nzFeedback = {
    /* Sozlamalardagi "Ovoz" qatori bilan bog'lanadi (bootstrap.js). */
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },

    /* To'g'ri javob — ko'tariluvchi ikki nota (G5 → D6). Ko'tarilish
       "to'g'ri" hissini beradi; pasayuvchi ketma-ketlik xato kabi
       eshitiladi, shuning uchun tartib muhim. */
    correct: function () {
      if (!enabled) return;
      resume();
      tone(784, 0, 0.11, 0.16);
      tone(1175, 0.085, 0.17, 0.12);
      vibrate(18);
    },

    /* Xato — past va "to'mtoq" (square to'lqin), pasayuvchi. Qattiq
       emas: maqsad jazolash emas, farqni bildirishdir. */
    wrong: function () {
      if (!enabled) return;
      resume();
      tone(196, 0, 0.18, 0.13, 'square');
      tone(165, 0.1, 0.22, 0.10, 'square');
      vibrate([26, 45, 26]);
    },

    /* Test tugadi — uch notali ko'tariluvchi akkord (C6 → E6 → G6). */
    finish: function () {
      if (!enabled) return;
      resume();
      tone(1047, 0, 0.14, 0.13);
      tone(1319, 0.11, 0.14, 0.12);
      tone(1568, 0.22, 0.26, 0.11);
      vibrate([18, 60, 18, 60, 30]);
    }
  };
})();
