/* ─────────────────────────────────────────────────────────────────────────
   SAYTNING MATN SAHIFALARI

   To'rtta sahifa: maxfiylik siyosati, foydalanish shartlari, aloqa va
   ma'lumotni o'chirish so'rovi. Uchtasi Google Play'ning MAJBURIY
   talabi — ilova do'konga chiqishi uchun ular ochiq URL bilan
   mavjud bo'lishi kerak.

   NIMA UCHUN BU SAHIFALARDA JS YO'Q: ular matn. Odam (yoki Play
   Console'dagi tekshiruvchi) siyosatni o'qish uchun butun ilovani
   yuklab olmasligi kerak — ular alohida, mustaqil va JS'siz.

   ENG MUHIM QOIDA: BU SAHIFALARDA YOZILGANI HAQIQAT BO'LISHI SHART.
   Maxfiylik siyosati — huquqiy hujjat. Quyidagi matn KODNI tekshirib
   yozilgan (localStorage kalitlari: nz-progress, nz-attempts,
   nz-iq-run, nz-games, nz-lang, nz-verbal, nz-outbox; tarmoq —
   src/data.js: nashr etilgan og'zaki savollarni OLISH va faqat tizimga
   kirganda natijani YUBORISH). Kod o'zgarsa (masalan anonim kalibrlash
   javoblari yoqilsa — data.js submitResult calibrate) bu sahifa O'SHA
   O'ZGARISHDAN OLDIN yangilanadi.

   SERVER: IQuest o'z serverida (sayt, API va admin — o'z VDS'i;
   uchinchi tomon bulut xizmati yo'q). Server joylashgan DAVLAT hali
   noma'lum — u site.config.json dagi `serverCountry` dan olinadi; bo'sh
   bo'lsa sahifada ochiq "hali aniqlanmoqda" deyiladi va mksite
   ogohlantiradi. Tizimga kirish usuli (pochta / telefon / Telegram)
   aniqlangach 2-bo'lim aniqlashtiriladi.

   HALOLLIK (src/iq/CONTRACT.md §6) bu yerda ham: "taxminiy", klinik
   test emas, "IQ oshiradi" va'dasi yo'q, rasmiy tashkilot bilan
   bog'liqlik ishorasi yo'q.

   Ilova nomi site.config.json dan (cfg.appName) — nom hali yakuniy
   emas, u bitta joyda o'zgarsin.
   ───────────────────────────────────────────────────────────────────── */

const UPDATED = '2026-yil 25-sentabr';

/* Sahifalardagi barcha havolalar va nom shu yerdan — sozlama faylidan. */
export function pages(cfg) {
  const APP = cfg.appName || 'IQuest';
  const email = cfg.contactEmail;
  const mail = `<a href="mailto:${email}">${email}</a>`;

  return [
    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'maxfiylik',
      title: 'Maxfiylik siyosati',
      description: `${APP} qanday ma’lumot saqlaydi va qayerda. Tizimga ` +
                   'kirish ixtiyoriy, analitika va reklama yo‘q.',
      body: `
<h1>Maxfiylik siyosati</h1>
<p class="lead">Qisqacha: <strong>tizimga kirmasangiz, ${APP}
qurilmangizdan hech narsa yubormaydi</strong> &mdash; natijalaringiz faqat
telefoningizda. Tizimga kirsangiz, liga, reyting va sertifikat uchun
natijalaringiz ${APP}’ning <strong>o‘z serverida</strong> saqlanadi va
uchinchi tomon bulut xizmatiga berilmaydi. Analitika va reklama yo‘q.</p>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. Tizimga kirmasdan (standart holat)</h2>
<p>Ilovadan tizimga kirmasdan to‘liq foydalanasiz: IQ testi, mashq,
o‘yinlar va tarix ishlaydi. Bu holatda ${APP} quyidagilarni
<strong>so‘ramaydi va yig‘maydi</strong>:</p>
<ul>
  <li>ism, telefon raqami, elektron pochta yoki boshqa shaxsiy ma’lumot;</li>
  <li>joylashuv (GPS);</li>
  <li>kontaktlar, galereya, fayllar, kamera yoki mikrofon;</li>
  <li>qurilma identifikatorlari va reklama identifikatori.</li>
</ul>
<p>Natijalaringiz <strong>telefoningizning o‘zida</strong> saqlanadi:</p>
<table>
  <thead><tr><th>Nima</th><th>Nima uchun</th></tr></thead>
  <tbody>
    <tr><td>IQ testlari natijalari (taxminiy ball, oraliq, turlar bo‘yicha to‘g‘ri javoblar)</td>
        <td>&laquo;IQ testlari tarixi&raquo; grafigi uchun</td></tr>
    <tr><td>Ballar, ketma-ket kunlar (streak), mashq va o‘yin darajalari</td>
        <td>Natijangiz ilova yopilganda yo‘qolmasligi va daraja sizga
            mos bo‘lishi uchun</td></tr>
    <tr><td>Xato qilgan va saqlab qo‘ygan savollar (savol raqami)</td>
        <td>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo;
            bo‘limlari ishlashi uchun</td></tr>
    <tr><td>Tugallanmagan test (qaysi savolda to‘xtaganingiz)</td>
        <td>Ilova yopilsa testni o‘sha joydan davom ettirish uchun</td></tr>
    <tr><td>Tanlangan til va sozlamalar</td>
        <td>Har ochilishda qaytadan tanlamaslik uchun</td></tr>
  </tbody>
</table>
<p>Internet bo‘lsa ilova faqat <strong>yangi savollar ro‘yxatini
oladi</strong> (so‘rovda sizga tegishli ma’lumot yo‘q). Internet
bo‘lmasa ilova to‘liq ishlaydi &mdash; savollar telefonning o‘zida
yaratiladi.</p>

<h2>2. Tizimga kirsangiz</h2>
<p>Liga, reyting va sertifikat natijani <strong>serverda qayta
tekshirishni</strong> talab qiladi (ilovadagi raqamni o‘zgartirib
bo‘lmasligi uchun). Shuning uchun tizimga kirganingizda serverga
quyidagilar yuboriladi va saqlanadi:</p>
<table>
  <thead><tr><th>Nima</th><th>Nima uchun</th></tr></thead>
  <tbody>
    <tr><td>Kirish uchun ishlatilgan identifikator (kirish usuliga
            qarab)</td>
        <td>Hisobingizni tanish uchun</td></tr>
    <tr><td>IQ testi natijalari: javoblar jurnali (qaysi savolga qaysi
            javob), taxminiy ball, oraliq, sana</td>
        <td>Natijani serverda qayta hisoblash va reytingga qo‘yish uchun</td></tr>
    <tr><td>Liga ballari (test, mashq va o‘yinlardan)</td>
        <td>Haftalik liga uchun</td></tr>
    <tr><td>Sertifikat ma’lumotlari: siz kiritgan ism, ball va oraliq,
            sana, tekshirish kodi</td>
        <td>Sertifikatni kod bo‘yicha tekshirish uchun &mdash; tekshirish
            sahifasi faqat shu maydonlarni ko‘rsatadi</td></tr>
  </tbody>
</table>
<p>Ma’lumotlar <strong>${APP}’ning o‘z serverida</strong> saqlanadi
va uchinchi tomon bulut xizmatiga berilmaydi. Server joylashgan
davlat: <strong>${cfg.serverCountry || 'hali aniqlanmoqda &mdash; aniqlangach shu yerda ko‘rsatiladi'}</strong>.</p>
<p>Har qanday internet so‘rovida bo‘lgani kabi, server texnik jihatdan
IP manzil, ilova turi va so‘rov vaqtini ko‘radi; biz bu ma’lumotdan
profil tuzmaymiz.</p>

<h2>3. Analitika, reklama va uchinchi tomonlar</h2>
<p>Ilovada <strong>analitika tizimi yo‘q</strong> (Google Analytics,
Firebase va shunga o‘xshash hech narsa), <strong>reklama
yo‘q</strong>, <strong>xatolik hisobotlarini yuboruvchi tizim
yo‘q</strong> va <strong>ijtimoiy tarmoq kuzatuvchilari
yo‘q</strong>. Shriftlar ilovaning ichida &mdash; Google Fonts’dan
yuklanmaydi.</p>

<h2>4. Bildirishnomalar</h2>
<p>Kunlik eslatma <strong>telefonning o‘zida</strong> tuziladi.
Serverdan push xabar yuborilmaydi va qurilma tokeni saqlanmaydi.</p>

<h2>5. Bolalar</h2>
<p>Tizimga kirmasdan foydalanishda hech kimdan ma’lumot yig‘ilmaydi.
Sertifikatga ism faqat foydalanuvchi o‘zi kiritganda yoziladi.</p>

<h2>6. Sizning huquqlaringiz</h2>
<p>Qurilmadagi ma’lumotni o‘zingiz o‘chirasiz; serverdagi natijalarni
bizga yozib o‘chirishingiz mumkin. Tartibi
<a href="../malumot-ochirish/">shu sahifada</a>.</p>

<h2>7. O‘zgarishlar</h2>
<p>Yangi ma’lumot yig‘ish qo‘shilsa (masalan, savollar qiyinligini
aniqlash uchun anonim javoblar), bu siyosat <strong>oldindan</strong>
yangilanadi va sana shu sahifada ko‘rsatiladi. Yig‘ilmaydigan deb
yozilgan ma’lumot keyin jimgina yig‘ilmaydi.</p>

<h2>8. Aloqa</h2>
<p>Savol yoki shikoyat bo‘lsa: ${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'shartlar',
      title: 'Foydalanish shartlari',
      description: `${APP} ilovasidan foydalanish shartlari: natija ` +
                   'taxminiy, klinik test emas.',
      body: `
<h1>Foydalanish shartlari</h1>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. ${APP} nima</h2>
<p>${APP} &mdash; mantiqiy fikrlash mashqlari va taxminiy IQ testi:
matritsalar, son qatorlari, fazoviy tafakkur va so‘z mantiqi
topshiriqlari. Bu <strong>o‘quv va o‘zini kuzatish
ilovasi</strong>.</p>

<h2>2. Eng muhim ogohlantirish</h2>
<p class="warn"><strong>Bu klinik IQ testi emas.</strong> Savollar hali
katta guruhda me’yorlanmagan, shuning uchun natija taxminiy va
faqat o‘zingizni kuzatish uchun. Natija har doim oraliq bilan
ko‘rsatiladi (masalan, 108 (100–116)) va uni tibbiy, ta’lim,
ish yoki boshqa qarorlar uchun asos qilib olib bo‘lmaydi.</p>
<p>${APP} hech qanday davlat organi, o‘quv yurti yoki imtihon
markazi bilan bog‘liq emas. Ba’zi qabul tanlovlarida mantiq
bo‘limi bo‘lgani uchun shu turdagi topshiriqlarni mashq qilish
mumkin, lekin ilova biror imtihondan o‘tishni kafolatlamaydi.</p>

<h2>3. Mashq va natija</h2>
<p>Mashq qilgan topshiriq turingizda natijangiz oshishi kutilgan
hol. Bu umumiy aqliy qobiliyat oshdi degani emas va biz buni
va’da qilmaymiz.</p>

<h2>4. Ruxsat etilgan foydalanish</h2>
<p>Ilovadan shaxsiy maqsadda foydalanasiz. Quyidagilar
ruxsat etilmaydi:</p>
<ul>
  <li>${APP} sertifikatini klinik yoki rasmiy IQ hujjati sifatida
      ko‘rsatish;</li>
  <li>ilovaning ishlashiga sun’iy yuklama berish yoki uni buzishga
      urinish;</li>
  <li>boshqa foydalanuvchilarga zarar beradigan har qanday harakat.</li>
</ul>

<h2>5. Natijalaringiz va sertifikat</h2>
<p>Tizimga kirmasangiz, test tarixi, ball, streak va ro‘yxatlar faqat
telefoningizda saqlanadi: ilovani o‘chirsangiz yoki qurilma
ma’lumotini tozalasangiz ular yo‘qoladi va bizda nusxasi yo‘q.</p>
<p>${APP} sertifikati faqat server qayta tekshirgan, ishonchli test
natijasi uchun beriladi. U &laquo;${APP} testi natijasi&raquo;ni
&mdash; taxminiy ball, oraliq va sanani &mdash; tasdiqlaydi va noyob kod
bilan tekshiriladi. Sertifikat klinik yoki rasmiy IQ hujjati emas;
uni tibbiy, ta’lim yoki ish qarorlari uchun asos qilib bo‘lmaydi.</p>

<h2>6. To‘lovlar</h2>
<p>Hozircha ilova to‘liq bepul. Pulli imkoniyatlar qo‘shilsa ham,
<strong>IQ testi va uning natijasi bepul qoladi</strong>; nima pulli
bo‘lishi shu yerda aniq yoziladi va to‘lovdan oldin
ko‘rsatiladi.</p>

<h2>7. Javobgarlik</h2>
<p>Ilova &laquo;qanday bo‘lsa shundayligicha&raquo; taqdim
etiladi. Ilovadagi natijaga tayanib qilingan qarorlar uchun
javobgarlik foydalanuvchida qoladi.</p>

<h2>8. Mualliflik</h2>
<p>Ilova interfeysining asosi &mdash; Game Management App UI Kit
(CC BY 4.0).</p>

<h2>9. Aloqa</h2>
<p>${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'aloqa',
      title: 'Aloqa',
      description: `${APP} bilan bog‘lanish: savoldagi xato haqida ` +
                   'xabar berish, savol va taklif.',
      body: `
<h1>Aloqa</h1>

<h2>Elektron pochta</h2>
<p class="big">${mail}</p>

<h2>Savolda xato topdingizmi?</h2>
<p>Bu biz uchun eng qimmatli xabar: noto‘g‘ri javob kaliti yoki
ikki to‘g‘ri javobli savol natijani jimgina buzadi, shuning
uchun bunday xabarlar navbatdan tashqari ko‘riladi.</p>
<p>Xabarda quyidagilarni yozsangiz tezroq tuzatamiz:</p>
<ul>
  <li>topshiriq turi (masalan, &laquo;Matritsalar&raquo;) va
      savolning skrinshoti;</li>
  <li>qaysi javobni to‘g‘ri deb hisoblaysiz va nima uchun.</li>
</ul>

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
      description: `${APP} saqlagan ma’lumotni qanday o‘chirish: ` +
                   'qurilmadagi va (tizimga kirgan bo‘lsangiz) serverdagi.',
      body: `
<h1>Ma’lumotni o‘chirish</h1>

<p class="lead">Tizimga kirmagan bo‘lsangiz, barcha ma’lumot faqat
qurilmangizda &mdash; uni o‘zingiz o‘chirasiz, bizga so‘rov yuborish
shart emas. Tizimga kirgan bo‘lsangiz, serverdagi natijalaringizni ham
o‘chirishingiz mumkin (pastda).</p>

<h2>Qurilmadagi ma’lumot</h2>
<p><strong>Android ilovasida</strong> ikki yo‘l bor, ikkalasi ham
qurilmadagi ma’lumotni butunlay o‘chiradi:</p>
<ol>
  <li><strong>Sozlamalar &rarr; Ilovalar &rarr; ${APP} &rarr;
      Xotira &rarr; Ma’lumotni tozalash</strong></li>
  <li>yoki ilovani telefondan o‘chirib tashlash.</li>
</ol>
<p><strong>Brauzerda</strong> (saytdagi versiya): brauzer sozlamalarida
shu sayt uchun saqlangan ma’lumotni (&laquo;site data&raquo; /
&laquo;sayt ma’lumotlari&raquo;) tozalang.</p>
<p>O‘chadi: IQ testlari tarixi va tugallanmagan test; ballar, streak,
marafon rekordi, mashq va o‘yin darajalari; &laquo;Xatolarim&raquo; va
&laquo;Saqlangan&raquo; ro‘yxatlari; til va sozlamalar.</p>

<h2>Serverdagi ma’lumot (tizimga kirgan bo‘lsangiz)</h2>
<p>Serverda test natijalaringiz, liga ballaringiz va sertifikat
ma’lumotlari saqlanadi. Ularni o‘chirish uchun hisobingiz bilan bog‘liq identifikatorni
ko‘rsatib bizga yozing: ${mail}. Ilovaga tizimga kirish ekrani
qo‘shilganda o‘chirish tugmasi ilovaning o‘zida ham bo‘ladi va bu
sahifa yangilanadi. O‘chirilgan natija reyting va ligadan chiqadi, uning
sertifikati tekshiruvda &laquo;topilmadi&raquo; deb ko‘rinadi.</p>
<p class="warn">O‘chirish <strong>qaytarilmaydi</strong>. Nusxasini
tiklab bera olmaymiz.</p>

<h2>Savol bo‘lsa</h2>
<p>${mail}</p>`,
    },
  ];
}
