/* ─────────────────────────────────────────────────────────────────────────
   BILDIRISHNOMA — har kuni 19:00 da mashqni eslatish.

   Nima uchun alohida fayl: bootstrap.js va feedback.js kabi bu ham
   qurilma qatlami. Dizayn faqat "bildirishnoma yoniq" degan niyatni
   ushlaydi; uni haqiqatga aylantirish shu faylning ishi.

   UCHTA HALOLLIK QOIDASI — ilgari "Bildirishnoma: Har kuni 19:00" yozuvi
   hech narsa rejalashtirmagan yolg'on va'da edi. Endi:

   1. MAVJUDLIK. Plagin yo'q joyda (brauzer, sayt) sozlama qatori
      umuman ko'rsatilmaydi — available() shuni aytadi. Bosib
      bo'lmaydigan tugma ko'rsatgandan yaxshiroq.

   2. RUXSAT. Android 13+ da bildirishnoma ruxsat so'raydi. Ruxsat
      berilmasa, holat "yoniq" deb ko'rsatilmaydi: onDenied chaqiriladi
      va ilova sozlamani o'zi o'chiradi.

   3. HAQIQIY REJA. Yoqilganda LocalNotifications.schedule() bilan
      kunlik takroriy bildirishnoma qo'yiladi, o'chirilganda cancel()
      bilan olib tashlanadi.
   ───────────────────────────────────────────────────────────────────── */

(function () {
  // Sobit ID — qayta yoqilganda dublikat rejalashtirilmasligi uchun
  // (cancel/schedule har doim shu bitta bildirishnoma ustida ishlaydi).
  const ID = 1901;
  const HOUR = 19;
  const MINUTE = 0;

  let enabled = false;
  let applied = null;   // oxirgi qo'llanilgan holat — takroriy ishni to'xtatadi

  function plugin() {
    const cap = window.Capacitor;
    return (cap && cap.Plugins && cap.Plugins.LocalNotifications) || null;
  }

  function available() { return !!plugin(); }

  /* interactive: foydalanuvchi tugmani BOSGANDA ruxsat so'rash mumkin.
     Ilova ochilishida esa so'ralmaydi — faqat mavjud ruxsat tekshiriladi.
     Sabab: hech kim hech narsa so'ramagan holda tizim oynasini chiqarish
     (yoki rad etilgani haqida xato ko'rsatish) bosqinchi bo'ladi. */
  async function schedule(interactive) {
    const ln = plugin();
    if (!ln) return 'unsupported';
    try {
      let perm = await ln.checkPermissions();
      if (perm.display !== 'granted') {
        if (!interactive) return 'no-permission';
        perm = await ln.requestPermissions();
      }
      if (perm.display !== 'granted') return 'denied';

      // Avval eskisini olib tashlaymiz: schedule() bir xil ID bilan
      // chaqirilsa platformalar turlicha ishlaydi, cancel esa aniq.
      await ln.cancel({ notifications: [{ id: ID }] }).catch(() => {});
      await ln.schedule({
        notifications: [{
          id: ID,
          title: 'Nazariy',
          body: 'Bugungi mashqni bajardingizmi? 10 daqiqa yetadi.',
          // ANIQ ALARM ATAYLAB O'CHIRILGAN (isExactNotification: false).
          //
          // Plagin standart holatda aniq alarm qo'yadi, u esa Android 12+ da
          // SCHEDULE_EXACT_ALARM ruxsatini talab qiladi. Google Play bu
          // ruxsatni faqat budilnik va kalendar ilovalariga beradi — mashq
          // eslatmasi uchun bermaydi, ya'ni ilova do'kondan qaytarilishi
          // mumkin. Kunlik eslatmaga daqiqagacha aniqlik kerak ham emas:
          // 19:00 da yoki bir necha daqiqa keyin kelishi bir xil.
          isExactNotification: false,
          schedule: {
            // "on" — takroriy reja: har kuni shu soat va daqiqada.
            on: { hour: HOUR, minute: MINUTE },
            allowWhileIdle: true,
          },
        }],
      });
      return 'scheduled';
    } catch (e) {
      return 'error';
    }
  }

  async function cancel() {
    const ln = plugin();
    if (!ln) return 'unsupported';
    try {
      await ln.cancel({ notifications: [{ id: ID }] });
      return 'cancelled';
    } catch (e) {
      return 'error';
    }
  }

  window.nzNotify = {
    available: available,
    isEnabled: function () { return enabled; },
    everyDayAt: function () { return { hour: HOUR, minute: MINUTE }; },

    /* Sozlamalardagi "Bildirishnoma" qatori bilan bog'lanadi (bootstrap.js).
       onDenied — ruxsat berilmaganda ilovaga xabar berish uchun: sozlama
       "yoniq" ko'rinib, aslida hech narsa kelmasligi mumkin bo'lmasin. */
    setEnabled: function (v, opts) {
      const want = !!v;
      if (want === applied) return;      // o'zgarish yo'q — qayta ishlamaydi
      applied = want;
      enabled = want;

      const o = opts || {};
      if (!available()) {
        enabled = false;
        return;
      }
      if (want) {
        schedule(!!o.interactive).then(function (res) {
          if (res === 'scheduled') return;
          // Rejalashtirib bo'lmadi — holatni haqiqatga qaytaramiz.
          // 'no-permission' — ilova ochilishida ruxsat yo'q edi: jimgina
          // o'chiramiz. 'denied' — foydalanuvchi o'zi bosib rad etdi:
          // nima uchun ishlamaganini aytish kerak.
          enabled = false;
          applied = false;
          if (typeof o.onDenied === 'function') o.onDenied(res);
        });
      } else {
        cancel();
      }
    },
  };
})();
