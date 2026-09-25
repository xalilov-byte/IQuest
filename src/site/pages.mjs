/* ─────────────────────────────────────────────────────────────────────────
   SAYTNING MATN SAHIFALARI

   To'rtta sahifa: maxfiylik siyosati, foydalanish shartlari (oferta),
   aloqa va ma'lumotni o'chirish. Uchtasi Google Play'ning MAJBURIY
   talabi — ilova do'konga chiqishi uchun ular ochiq URL bilan mavjud
   bo'lishi kerak.

   NIMA UCHUN BU SAHIFALARDA JS YO'Q: ular matn. Maxfiylik siyosatini
   o'qish uchun odam (yoki Play Console tekshiruvchisi) butun ilovani
   yuklab olmasligi kerak.

   RAD QILISH MATNI SHU YERDA. Mahsulot egasining qarori (2026-09-25):
   ilova ekranlari toza va ishonchli bo'lsin — "taxminiy", "klinik test
   emas" kabi izohlar ilovada yo'q, ularning TO'LIQ matni "Foydalanish
   shartlari"da (ilova profilidan havola bor). Shu sabab bu sahifadagi
   ogohlantirish qisqartirilmaydi.

   ENG MUHIM QOIDA: BU SAHIFALARDA YOZILGANI HAQIQAT BO'LISHI SHART.
   Maxfiylik siyosati — huquqiy hujjat. Quyidagi matn kodni tekshirib
   yozilgan (localStorage kalitlari, tarmoq chaqiruvlari) va kod
   o'zgarganda U HAM O'ZGARTIRILISHI KERAK:
     · qurilmadagi kalitlar: nz-progress, nz-attempts, nz-iq-tests
       (src/progress.js), nz-iq-ui, nz-iq-run, nz-theme
       (src/Main.dc.html), nz-lang (src/i18n.js);
     · tarmoq: 1-versiya ilovasi HECH QANDAY so'rov yubormaydi —
       savollar qurilmada yasaladi (src/iq/gen), src/data.js dagi eski
       bank sinxronizatsiyasi chaqirilmaydi (src/bootstrap.js).
   ───────────────────────────────────────────────────────────────────── */

const UPDATED = '2026-yil 25-sentabr';

/* Sahifalardagi barcha havolalar shu yerdan — sozlama faylidan keladi. */
export function pages(cfg) {
  const email = cfg.contactEmail;
  const mail = `<a href="mailto:${email}">${email}</a>`;
  const app = cfg.appName || 'IQuest';

  return [
    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'maxfiylik',
      title: 'Maxfiylik siyosati',
      description: `${app} ilovasi qanday ma’lumot saqlaydi va nimani ` +
                   'yubormaydi. Hisob talab qilinmaydi, analitika yo‘q.',
      body: `
<h1>Maxfiylik siyosati</h1>
<p class="lead">Qisqacha: <strong>${app} sizdan hech qanday shaxsiy
ma’lumot yig‘maydi va internetga hech narsa yubormaydi.</strong>
Hisob yaratish talab qilinmaydi, analitika va reklama yo‘q. Natijalaringiz
faqat telefoningizda saqlanadi.</p>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. Biz nimani yig‘maymiz</h2>
<p>${app} quyidagilarni <strong>so‘ramaydi va yig‘maydi</strong>:</p>
<ul>
  <li>ism, telefon raqami, elektron pochta yoki boshqa shaxsiy ma’lumot;</li>
  <li>joylashuv (GPS);</li>
  <li>kontaktlar, galereya, fayllar, kamera yoki mikrofon;</li>
  <li>qurilma identifikatorlari va reklama identifikatori.</li>
</ul>
<p>Ilovada hisob (akkaunt) yo‘q: siz ro‘yxatdan o‘tmasdan
foydalanasiz.</p>

<h2>2. Telefoningizda nima saqlanadi</h2>
<p>Quyidagilar <strong>faqat telefoningizning o‘zida</strong> (ilova
xotirasida) saqlanadi va hech qayerga yuborilmaydi:</p>
<table>
  <thead><tr><th>Nima</th><th>Nima uchun</th></tr></thead>
  <tbody>
    <tr><td>IQ testlari tarixi: ball, oraliq, sana, savol turlari
            bo‘yicha natija</td>
        <td>Profilda natijalaringizni ko‘rsatish uchun</td></tr>
    <tr><td>Mashq darajalari va o‘yin darajalari, rekordlar</td>
        <td>Keyingi mashq va o‘yin qiyinligini tanlash uchun</td></tr>
    <tr><td>Ballar, haftalik ballar, ketma-ket kunlar (streak),
            kunlik hisoblagich</td>
        <td>Liga darajasi va kunlik mashq uchun</td></tr>
    <tr><td>Berilgan javoblar jurnali (savol kodi, tanlangan variant,
            to‘g‘ri/xato, vaqt)</td>
        <td>Kelgusida natijani serverda tekshirish uchun — hozir hech
            qayerga yuborilmaydi</td></tr>
    <tr><td>Tugallanmagan test</td>
        <td>Ilova yopilsa, testni shu joydan davom ettirish uchun</td></tr>
    <tr><td>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo;
            ro‘yxatlari (savol kodlari)</td>
        <td>Shu savollarni qayta yechish uchun</td></tr>
    <tr><td>Tanlangan til, tema va sozlamalar</td>
        <td>Har ochilishda qaytadan tanlamaslik uchun</td></tr>
  </tbody>
</table>
<p>Bularni istalgan vaqtda o‘chirishingiz mumkin: ilovada
<strong>Profil &rarr; Sozlamalar &rarr; Ma’lumotlarni o‘chirish</strong>,
yoki <a href="../malumot-ochirish/">shu sahifadagi</a> usullar bilan.</p>

<h2>3. Internet</h2>
<p><strong>Ilovaning ushbu versiyasi internetga so‘rov yubormaydi.</strong>
Savollar telefonning o‘zida yasaladi, natijalar hech qayerga
jo‘natilmaydi. Ilova internetsiz to‘liq ishlaydi.</p>
<p>Saytdagi (brauzer) versiyada sahifani yuklash uchun brauzeringiz
hostingga murojaat qiladi — har qanday sayt kabi, server texnik jihatdan
IP manzil, brauzer turi va so‘rov vaqtini ko‘radi. Biz bu ma’lumotni
tahlil qilmaymiz va profil tuzmaymiz. Sahifa yuklangandan keyin ilova
boshqa so‘rov yubormaydi.</p>

<h2>4. Analitika, reklama va uchinchi tomonlar</h2>
<p>Ilovada <strong>analitika tizimi yo‘q</strong> (Google Analytics,
Firebase va shunga o‘xshash hech narsa), <strong>reklama
yo‘q</strong>, <strong>xatolik hisobotlarini yuboruvchi tizim
yo‘q</strong> va <strong>ijtimoiy tarmoq kuzatuvchilari
yo‘q</strong>. Shriftlar ilova ichida — ular tashqi serverdan
yuklanmaydi.</p>

<h2>5. Bildirishnomalar</h2>
<p>Kunlik eslatma <strong>telefonning o‘zida</strong> tuziladi.
Serverdan push xabar yuborilmaydi, qurilma tokeni saqlanmaydi.
Ruxsat bermasangiz ilova odatdagidek ishlaydi.</p>

<h2>6. Bolalar</h2>
<p>Ilova hech kimdan — shu jumladan bolalardan ham — shaxsiy ma’lumot
so‘ramaydi va yig‘maydi.</p>

<h2>7. Sizning huquqlaringiz</h2>
<p>Bizda sizga tegishli ma’lumot saqlanmaydi, shuning uchun
&laquo;ma’lumotimni bering&raquo; yoki &laquo;o‘chiring&raquo;
so‘rovini yuborishning hojati yo‘q: barcha ma’lumot sizning
qurilmangizda va uni o‘zingiz o‘chirasiz.</p>

<h2>8. O‘zgarishlar</h2>
<p>Ilovaga hisob, natijani serverda tekshirish, liga jadvali yoki
sertifikat qo‘shilsa, bu siyosat <strong>oldindan</strong> yangilanadi va
o‘zgarish sanasi shu sahifada ko‘rsatiladi. Yig‘ilmaydi deb yozilgan
ma’lumot keyin jimgina yig‘ilmaydi.</p>

<h2>9. Aloqa</h2>
<p>Savol yoki shikoyat bo‘lsa: ${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'shartlar',
      title: 'Foydalanish shartlari',
      description: `${app} ilovasidan foydalanish shartlari: natija ` +
                   'taxminiy, test klinik yoki tibbiy vosita emas.',
      body: `
<h1>Foydalanish shartlari</h1>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. ${app} nima</h2>
<p>${app} &mdash; mantiqiy fikrlashni sinash va mashq qilish ilovasi:
moslashuvchan IQ test, savol turlari bo‘yicha mashq va aql o‘yinlari.
Bu <strong>o‘quv va ko‘ngilochar vosita</strong>.</p>

<h2>2. Natija haqida muhim ogohlantirish</h2>
<div class="warn">
<p><strong>${app} klinik IQ testi emas</strong> va tibbiy yoki
psixologik tashxis vositasi emas.</p>
<p>Savollar hali katta guruhda me’yorlanmagan (normalanmagan). Shuning
uchun ilova ko‘rsatadigan ball <strong>taxminiy</strong>: u faqat
o‘zingizni kuzatish uchun. Ball yonidagi <strong>oraliq</strong> &mdash;
natijaning ehtimoliy chegarasi: bitta test aniq raqam bera olmaydi.</p>
<p>Test hech qanday davlat organi, ta’lim muassasasi yoki xalqaro
tashkilot tomonidan tasdiqlanmagan va ular bilan bog‘liq emas.
Natijani ishga yoki o‘qishga qabul, tibbiy yoki boshqa muhim qaror
uchun asos sifatida ishlatmang.</p>
<p>Ilova natijani boshqa odamlar bilan solishtirmaydi va &laquo;aholining
X foizidan yuqori&raquo; kabi raqam bermaydi.</p>
</div>

<h2>3. Mashq va o‘yinlar</h2>
<p>Mashq va aql o‘yinlari diqqat, xotira, tezlik va mantiqiy
fikrlashni mashq qilish uchun. Mashq qilingan topshiriqda natija odatda
o‘sadi; bu umumiy aql yoki IQ oshadi degani emas. Biz IQ’ni oshirishni
va’da qilmaymiz.</p>
<p>Ba’zi tanlov va qabul imtihonlarida mantiqiy topshiriqlar uchraydi.
Ilovada shunga o‘xshash turdagi topshiriqlarni mashq qilish mumkin, lekin
${app} hech qaysi imtihon tashkilotchisi bilan bog‘liq emas.</p>

<h2>4. Ball, liga va reyting</h2>
<p>Ball to‘g‘ri javoblar va o‘yin natijalari uchun beriladi, haftalik
ball esa liga darajasini belgilaydi. Hozir ular faqat telefoningizda
hisoblanadi. Boshqa foydalanuvchilar bilan umumiy liga jadvali va
reyting faqat natija serverda qayta tekshirilgandan keyin ishga tushadi;
ungacha ilova boshqa odamlar ro‘yxatini ko‘rsatmaydi.</p>

<h2>5. Sertifikat</h2>
<p>Kelgusida ${app}.uz tomonidan &laquo;${app} testi natijasi&raquo;
sertifikati beriladi &mdash; faqat serverda qayta tekshirilgan to‘liq
test uchun. U ${app}.uz bergan hujjat bo‘ladi, rasmiy IQ sertifikati
emas va hech qanday tashkilot tomonidan tasdiqlanmagan.</p>

<h2>6. To‘lovlar</h2>
<p>Ilova bepul. Test va uning natijasi hech qachon pul ortida
bo‘lmaydi. Pulli imkoniyatlar qo‘shilsa, nima bepul qolishi va nima
pulli bo‘lishi shu yerda aniq yoziladi va to‘lovdan oldin
ko‘rsatiladi.</p>

<h2>7. Ruxsat etilgan foydalanish</h2>
<p>Ilovadan shaxsiy maqsadda bepul foydalanasiz. Quyidagilar ruxsat
etilmaydi:</p>
<ul>
  <li>savollar va o‘yinlarni ommaviy ko‘chirib olish va boshqa xizmatda
      tarqatish;</li>
  <li>ball yoki natijani sun’iy oshirishga urinish (avtoklikerlar,
      ilovani o‘zgartirish);</li>
  <li>ilovaning ishlashiga zarar beradigan har qanday harakat.</li>
</ul>

<h2>8. Natijalaringiz</h2>
<p>Ball, testlar tarixi va ro‘yxatlar telefoningizda saqlanadi. Ilovani
o‘chirsangiz yoki uning ma’lumotini tozalasangiz ular yo‘qoladi &mdash;
bizda nusxasi yo‘q, shuning uchun tiklab bera olmaymiz.</p>

<h2>9. Javobgarlik</h2>
<p>Ilova &laquo;qanday bo‘lsa shundayligicha&raquo; taqdim etiladi.
Ilovadagi natijaga tayanib qilingan qarorlar uchun javobgarlik
foydalanuvchida qoladi.</p>

<h2>10. Mualliflik</h2>
<p>Ilova interfeysining asosi &mdash; Game Management App UI Kit
(CC BY 4.0).</p>

<h2>11. Aloqa</h2>
<p>${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'aloqa',
      title: 'Aloqa',
      description: `${app} bilan bog‘lanish: xatolik haqida xabar ` +
                   'berish, savol va taklif.',
      body: `
<h1>Aloqa</h1>

<h2>Elektron pochta</h2>
<p class="big">${mail}</p>

<h2>Savolda xato topdingizmi?</h2>
<p>Savol ekranining skrinshotini (javob va &laquo;Izoh&raquo; bilan) va
nima noto‘g‘ri deb hisoblaganingizni yuboring &mdash; tekshirib,
tuzatamiz.</p>

<h2>Ilova ishlamayaptimi?</h2>
<p>Yozganda qurilma modeli va Android versiyasini ko‘rsatsangiz
muammoni tezroq topamiz.</p>

<h2>Ma’lumotni o‘chirish</h2>
<p>Buning uchun bizga yozish shart emas &mdash;
<a href="../malumot-ochirish/">tartibi shu yerda</a>.</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'malumot-ochirish',
      title: 'Ma’lumotni o‘chirish',
      description: `${app} saqlagan ma’lumotni qanday o‘chirish. ` +
                   'Barchasi qurilmada, so‘rov yuborish shart emas.',
      body: `
<h1>Ma’lumotni o‘chirish</h1>

<p class="lead">${app} serverida sizga tegishli hech qanday
ma’lumot saqlanmaydi &mdash; hisob yo‘q, ism yo‘q, telefon raqami
yo‘q. Shuning uchun <strong>bizga so‘rov yuborishning hojati
yo‘q</strong>: barcha ma’lumot sizning qurilmangizda va uni o‘zingiz
o‘chirasiz.</p>

<h2>Ilovaning o‘zida</h2>
<p><strong>Profil &rarr; Sozlamalar &rarr; Ma’lumotlarni o‘chirish</strong>
&mdash; natijalar, ballar, ro‘yxatlar va o‘yin darajalari o‘chadi (til va
tema tanlovi qoladi).</p>

<h2>Android sozlamalari orqali</h2>
<ol>
  <li><strong>Sozlamalar &rarr; Ilovalar &rarr; ${app} &rarr;
      Xotira &rarr; Ma’lumotni tozalash</strong></li>
  <li>yoki ilovani telefondan o‘chirib tashlash.</li>
</ol>

<h2>Brauzerda (saytdagi versiya)</h2>
<p>Brauzer sozlamalarida shu sayt uchun saqlangan ma’lumotni
(&laquo;site data&raquo; / &laquo;sayt ma’lumotlari&raquo;)
tozalang.</p>

<h2>Nima o‘chadi</h2>
<ul>
  <li>IQ testlari tarixi, mashq va o‘yin darajalari;</li>
  <li>ballar, haftalik ballar, ketma-ket kunlar (streak);</li>
  <li>tugallanmagan test;</li>
  <li>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo; ro‘yxatlari;</li>
  <li>berilgan javoblar jurnali;</li>
  <li>(Android sozlamalari va brauzer orqali o‘chirilganda) tanlangan
      til va sozlamalar ham.</li>
</ul>
<p class="warn">Bu amal <strong>qaytarilmaydi</strong>. Bizda nusxasi
yo‘q, shuning uchun tiklab bera olmaymiz.</p>

<h2>Keyinchalik hisob qo‘shilsa</h2>
<p>Ilovaga hisob va natijani serverda tekshirish qo‘shilganda serverdagi
ma’lumotni o‘chirish uchun ilovaning o‘zida tugma bo‘ladi va bu sahifa
yangilanadi. Hozir bunday ma’lumot mavjud emas.</p>

<h2>Savol bo‘lsa</h2>
<p>${mail}</p>`,
    },
  ];
}
