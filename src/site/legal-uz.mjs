/* ─────────────────────────────────────────────────────────────────────────
   HUQUQIY SAHIFALAR — OʻZBEKCHA (ASL MATN)

   Bu matn ustun: ruscha (legal-ru.mjs) va inglizcha (legal-en.mjs)
   nusxalar shundan tarjima qilingan va farq boʻlsa oʻzbekchasi amal
   qiladi. Bu yerda biror narsa oʻzgarsa — qolgan ikkitasini ham
   oʻzgartiring. Faktlar manbasi — pages.mjs sarlavhasidagi roʻyxat.

   Imlo: oʻ/gʻ — ʻ (U+02BB), tutuq — ʼ (U+02BC).
   Nomlar ilovadagidek: «IQ oʻyinlari», «Maʼlumotlarni oʻchirish»,
   liga — Boshlovchidan Olmosgacha (6 daraja).
   ───────────────────────────────────────────────────────────────────── */

export function uzPages(c) {
  const { app, mail, telegram, developer, updated, disclaimer, ccby } = c;

  return [
    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'maxfiylik',
      title: 'Maxfiylik siyosati',
      description: `${app} qanday maʼlumot saqlaydi va nimani yubormaydi. ` +
                   'Hisob talab qilinmaydi, analitika yoʻq, hammasi qurilmada.',
      body: `
<h1>Maxfiylik siyosati</h1>
<p class="lead"><strong>Qisqacha:</strong> ${app} sizdan shaxsiy maʼlumot
yigʻmaydi va internetga hech narsa yubormaydi. Hisob ochish shart emas,
analitika va reklama yoʻq. Profilingiz, natijalaringiz va sozlamalaringiz
faqat qurilmangizda saqlanadi.</p>
<p class="meta">Oxirgi yangilanish: ${updated}</p>

<h2>1. Umumiy</h2>
<p>Ushbu siyosat ${app} ilovasiga (Android) va uning brauzerdagi
versiyasiga tegishli. Ilova egasi: ${developer}. Bogʻlanish: ${mail}</p>

<h2>2. Biz nimani yigʻmaymiz</h2>
<p>${app} bizga ham, uchinchi tomonga ham <strong>hech qanday maʼlumot
yubormaydi</strong>. Jumladan, quyidagilar soʻralmaydi va yigʻilmaydi:</p>
<ul>
  <li>telefon raqami, elektron pochta, pasport yoki boshqa shaxsiy
      maʼlumot;</li>
  <li>joylashuv (GPS);</li>
  <li>kontaktlar, fayllar, kamera va mikrofon;</li>
  <li>qurilma identifikatorlari va reklama identifikatori;</li>
  <li>ilovadan foydalanish statistikasi.</li>
</ul>
<p>Ilovada hisob (akkaunt) yoʻq — roʻyxatdan oʻtmasdan foydalanasiz.</p>

<h2>3. Profil: rasm, nom va bio</h2>
<p>Profildagi foydalanuvchi nomi, bio, rang va avatar ixtiyoriy. Ular
<strong>faqat qurilmangizda</strong> saqlanadi: boshqa foydalanuvchilarga
koʻrsatilmaydi va hech qayerga yuborilmaydi.</p>
<p>Oʻz rasmingizni qoʻysangiz, uni telefonning rasm tanlash oynasida
oʻzingiz tanlaysiz. Ilova faqat siz tanlagan bitta rasmni oladi, uni
qurilmaning oʻzida kvadrat shaklda qirqadi, kichraytiradi va ilova
xotirasida saqlaydi. Asl fayl oʻzgarmaydi. Ilova kamera, galereya yoki
fayllarga ruxsat soʻramaydi.</p>
<p>Rasm, nom va bio <strong>Maʼlumotlarni oʻchirish</strong> bilan
oʻchadi (<a href="../malumot-ochirish/">batafsil</a>).</p>

<h2>4. Qurilmada nima saqlanadi</h2>
<p>Quyidagilar faqat ilova xotirasida (brauzer versiyasida — brauzerning
shu sayt uchun ajratilgan xotirasida) turadi. Bizga ular koʻrinmaydi.</p>
<table>
  <thead><tr><th>Nima</th><th>Nima uchun</th></tr></thead>
  <tbody>
    <tr><td>Profil: nom, bio, rang, avatar yoki rasm, vitrina</td>
        <td>Profilingizni koʻrsatish uchun</td></tr>
    <tr><td>IQ testlari tarixi: natija, oraliq, sana, savol turlari
            boʻyicha tahlil</td>
        <td>Natijalaringizni koʻrsatish uchun</td></tr>
    <tr><td>Mashq va oʻyin darajalari, rekordlar</td>
        <td>Keyingi savol va oʻyin qiyinligini tanlash uchun</td></tr>
    <tr><td>Ballar, haftalik ballar, liga tarixi, ketma-ket faol
            kunlar</td>
        <td>Liga va Reyting uchun</td></tr>
    <tr><td>Tangalar, xaridlar, kunlik vazifalar, nishonlar</td>
        <td>Doʻkon, vazifalar va nishonlar uchun</td></tr>
    <tr><td>Javoblar jurnali: savol kodi, tanlangan variant, toʻgʻri
            yoki xato, vaqt</td>
        <td>Kelgusida natijani qayta tekshirish imkoniyati uchun —
            hozir hech qayerga yuborilmaydi</td></tr>
    <tr><td>Tugallanmagan test</td>
        <td>Ilova yopilsa, testni shu joydan davom ettirish uchun</td></tr>
    <tr><td>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo;
            roʻyxatlari</td>
        <td>Shu savollarni qayta yechish uchun</td></tr>
    <tr><td>Til, tema, ovoz, tebranish va eslatma sozlamalari</td>
        <td>Har ochilishda qayta tanlamaslik uchun</td></tr>
  </tbody>
</table>
<p>Android oʻzining zaxira nusxa tizimi orqali ilova maʼlumotini shaxsiy
Google hisobingizga saqlashi va yangi telefonda tiklashi mumkin. Bu
Android funksiyasi: biz bu nusxani koʻrmaymiz. Uni telefon sozlamalarida
oʻchirishingiz mumkin.</p>

<h2>5. Internet</h2>
<p><strong>Ilovaning ushbu versiyasi internetga soʻrov yubormaydi.</strong>
Savollar qurilmaning oʻzida yasaladi, natija va profil hech qayerga
joʻnatilmaydi. Ilova internetsiz toʻliq ishlaydi.</p>
<p>Oʻzingiz bosgan havolalar (Foydalanish shartlari, Maxfiylik siyosati,
Aloqa, Ilovani baholash) brauzerda, pochta ilovasida yoki Google Playʼda
ochiladi. Ilova ularga siz haqingizda hech qanday maʼlumot
qoʻshmaydi.</p>
<p>Brauzer versiyasida sahifani yuklash uchun brauzeringiz sayt
serveriga murojaat qiladi. Har qanday saytdagi kabi, server texnik
jihatdan IP manzil, brauzer turi va soʻrov vaqtini koʻradi, hosting
provayderi esa bunday texnik jurnallarni oʻz qoidasiga koʻra saqlashi
mumkin. Biz bu maʼlumotdan foydalanuvchilarni kuzatish yoki profil tuzish
uchun foydalanmaymiz. Sahifa yuklangandan keyin ilova boshqa soʻrov
yubormaydi.</p>

<h2>6. Analitika, reklama va uchinchi tomonlar</h2>
<p>Ilovada analitika tizimi (Google Analytics, Firebase va shunga
oʻxshash), reklama, xatolik hisobotlarini yuboruvchi kutubxona va
ijtimoiy tarmoq kuzatuvchilari <strong>yoʻq</strong>. Shriftlar ilova
ichida — tashqi serverdan yuklanmaydi.</p>
<p>Ilovani Google Play orqali oʻrnatsangiz, Google oʻrnatish va yangilash
jarayonida oʻz maxfiylik siyosatiga koʻra maʼlumot yigʻishi mumkin.
Google Play Consoleʼda biz faqat umumlashtirilgan statistikani koʻramiz
(masalan, oʻrnatishlar soni va ilovaning ishdan chiqishi haqidagi
hisobotlar) — ular sizni shaxsan aniqlamaydi.</p>

<h2>7. Bildirishnomalar</h2>
<p>Eslatmalar dastlab <strong>oʻchiq</strong>. Ilova bildirishnomaga
ruxsatni faqat siz eslatmani yoqqaningizda soʻraydi. Eslatma telefonning
oʻzida rejalanadi va koʻrsatiladi: serverdan push xabar yuborilmaydi,
qurilma tokeni saqlanmaydi. Kuniga koʻpi bilan ikkita eslatma keladi.
Ularni istalgan vaqtda Sozlamalarda oʻchirasiz; ruxsat bermasangiz ham
ilova odatdagidek ishlaydi.</p>

<h2>8. Bolalar</h2>
<p>Ilova hech kimdan, jumladan bolalardan ham, shaxsiy maʼlumot
soʻramaydi va yigʻmaydi.</p>

<h2>9. Maʼlumotni oʻchirish va huquqlaringiz</h2>
<p>Bizda sizga tegishli maʼlumot yoʻq, shuning uchun uni koʻrish yoki
oʻchirish uchun bizga soʻrov yuborish shart emas: hammasi qurilmangizda
va sizning nazoratingizda. Ilovada: <strong>Profil › Sozlamalar ›
Maʼlumotlarni oʻchirish</strong>. Boshqa usullar —
<a href="../malumot-ochirish/">shu sahifada</a>.</p>

<h2>10. Oʻzgarishlar</h2>
<p>Ilovaga hisob, natijani serverda tekshirish, umumiy reyting yoki
boshqa tarmoq funksiyasi qoʻshilsa, bu siyosat <strong>oldindan</strong>
yangilanadi va yangi sana shu sahifada koʻrsatiladi. Yigʻilmaydi deb
yozilgan maʼlumot keyin jimgina yigʻila boshlamaydi.</p>

<h2>11. Aloqa</h2>
<p>Savol yoki shikoyat boʻlsa: ${mail}${telegram ? ' · Telegram: ' + telegram : ''}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'shartlar',
      title: 'Foydalanish shartlari',
      description: `${app} foydalanish shartlari: test natijasi haqida muhim ` +
                   'maʼlumot, tanga va nishonlar, javobgarlik.',
      body: `
<h1>Foydalanish shartlari</h1>
<p class="meta">Oxirgi yangilanish: ${updated}</p>

<h2>1. ${app} nima</h2>
<p>${app} — mantiqiy fikrlashni sinash va mashq qilish uchun ilova:
moslashuvchan IQ test, savol turlari boʻyicha mashq va IQ oʻyinlari. Bu
<strong>oʻquv va koʻngilochar vosita</strong>. Ilovadan foydalanish orqali
siz ushbu shartlarga rozilik bildirasiz.</p>

<h2>2. Natija haqida muhim ogohlantirish</h2>
<div class="warn">
<p><strong>${disclaimer}</strong></p>
<p>IQ natijasi ostidagi <strong>oraliq</strong> natijaning ehtimoliy
chegarasini koʻrsatadi: bitta test aniq raqam bera olmaydi. Savollar hali
katta guruhda meʼyorlanmagan, shuning uchun natija oʻzingizni kuzatish
uchun.</p>
<p>Test tibbiy, psixologik yoki kasbiy tashxis vositasi emas va hech
qanday kasallikni aniqlamaydi. Natijani ishga yoki oʻqishga qabul,
davolanish yoki boshqa muhim qaror uchun asos qilib olmang.</p>
<p>${app} hech qanday davlat organi, taʼlim muassasasi yoki xalqaro
tashkilot bilan bogʻliq emas. Natija boshqa odamlar natijalari bilan
solishtirilmaydi.</p>
</div>

<h2>3. Mashq va IQ oʻyinlari</h2>
<p>Mashq va IQ oʻyinlari diqqat, xotira, tezlik va mantiqiy fikrlashni
mashq qilish uchun. Mashq qilingan topshiriqda natija odatda
yaxshilanadi, lekin bu umumiy aql yoki IQ darajasi oʻzgardi degani emas.
<strong>Mashq IQ natijangizni oʻzgartiradi, deb vaʼda
qilmaymiz.</strong></p>
<p>Baʼzi qabul imtihonlarida mantiqiy topshiriqlar uchraydi. Ilovada
shunga oʻxshash turdagi topshiriqlarni mashq qilish mumkin, lekin ${app}
hech qaysi imtihon tashkilotchisi bilan bogʻliq emas.</p>

<h2>4. Ball, liga va reyting</h2>
<p>Ball toʻgʻri javoblar va oʻyin natijalari uchun beriladi; haftalik
ball liga darajasini belgilaydi (Boshlovchidan Olmosgacha). Hozir ball
va liga faqat qurilmangizda hisoblanadi va faqat oʻz natijangizni
koʻrsatadi. Ilovada boshqa foydalanuvchilar roʻyxati va umumiy reyting
yoʻq. Umumiy reyting qoʻshilsa, u faqat serverda qayta tekshirilgan
natijalardan tuziladi.</p>

<h2>5. Tanga, nishonlar va Doʻkon</h2>
<p><strong>Tanga va nishonlar pul qiymatiga ega emas, sotilmaydi va
almashtirilmaydi.</strong></p>
<ul>
  <li>Tanga faqat ilovada faol boʻlib olinadi: kunlik vazifalar, yutuq
      nishonlari, hafta yakuni mukofoti va bir martalik xush kelibsiz
      bonusi.</li>
  <li>Tangani pulga sotib olib boʻlmaydi. Uni pulga, ballga yoki boshqa
      narsaga aylantirib ham, boshqa odamga oʻtkazib ham boʻlmaydi.</li>
  <li>Tanga faqat Doʻkonda profilni bezashga sarflanadi: profil ranglari
      va kolleksiya nishonlari. Xarid ball, liga, IQ natijasi yoki
      darajalarga taʼsir qilmaydi.</li>
  <li>Tasodifiy mukofot (sandiq, lotereya) yoʻq. Narx xariddan oldin
      koʻrsatiladi.</li>
  <li>Yutuq nishonlari faqat oʻynab olinadi — ularni sotib olib
      boʻlmaydi. Olingan nishon qaytarib olinmaydi.</li>
  <li>Xarid qaytarilmaydi.</li>
  <li>Tanga, nishon va xaridlar faqat qurilmangizda saqlanadi.
      &laquo;Maʼlumotlarni oʻchirish&raquo;, ilovani oʻchirish yoki
      uning maʼlumotini tozalash ularni butunlay oʻchiradi — biz ularni
      tiklay olmaymiz.</li>
  <li>Kelgusida hisob qoʻshilsa, qurilmadagi tanga va nishonlarni unga
      koʻchirish shartlari (jumladan, chegaralar) oldindan eʼlon
      qilinadi.</li>
</ul>

<h2>6. Toʻlovlar</h2>
<p>Ilova bepul: ichida xarid, obuna va reklama yoʻq. Test va uning
natijasi hech qachon pul ortida boʻlmaydi. Pulli imkoniyat qoʻshilsa,
nima bepul qolishi va nima pulli boʻlishi shu yerda aniq yoziladi va
toʻlovdan oldin koʻrsatiladi.</p>

<h2>7. Profil</h2>
<p>Nom va bio ixtiyoriy va hozircha faqat sizga koʻrinadi. Ilova
nomaqbul soʻz va havolalarni qabul qilmaydi. Boshqa odamning shaxsiy
maʼlumotini yoki sizga tegishli boʻlmagan rasmni ishlatmang.</p>

<h2>8. Ruxsat etilgan foydalanish</h2>
<p>Ilovadan shaxsiy maqsadda bepul foydalanasiz. Quyidagilar
taqiqlanadi:</p>
<ul>
  <li>savollar va oʻyinlarni ommaviy koʻchirib olish va boshqa xizmatda
      tarqatish;</li>
  <li>ball, tanga yoki natijani sunʼiy oshirishga urinish (avtoklikerlar,
      ilovani oʻzgartirish);</li>
  <li>ilovaning ishlashiga zarar yetkazadigan har qanday harakat.</li>
</ul>

<h2>9. Maʼlumotlaringiz</h2>
<p>Profil, natijalar, ball, tanga va roʻyxatlar faqat qurilmangizda
saqlanadi. Ilovani oʻchirsangiz yoki uning maʼlumotini tozalasangiz ular
yoʻqoladi: bizda nusxasi yoʻq, shuning uchun tiklab bera olmaymiz.
Batafsil — <a href="../maxfiylik/">Maxfiylik siyosati</a>.</p>

<h2>10. Javobgarlik</h2>
<p>Ilova &laquo;qanday boʻlsa, shundayligicha&raquo; taqdim etiladi. Biz
xatolarni tuzatishga harakat qilamiz, lekin ilovaning uzluksiz va
xatosiz ishlashini kafolatlamaymiz. Ilovadagi natijaga tayanib qilingan
qarorlar uchun javobgarlik foydalanuvchida.</p>

<h2>11. Mualliflik</h2>
<p>Ilova interfeysining asosi — Game Management App UI Kit
(${ccby}).</p>

<h2>12. Oʻzgarishlar va tillar</h2>
<p>Shartlar oʻzgarsa, yangi sana shu sahifada koʻrsatiladi; muhim
oʻzgarishlar kuchga kirishidan oldin eʼlon qilinadi. Shartlar oʻzbek,
rus va ingliz tillarida eʼlon qilingan; matnlar orasida farq boʻlsa,
oʻzbekcha matn ustun turadi.</p>

<h2>13. Aloqa</h2>
<p>${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'aloqa',
      title: 'Aloqa',
      description: `${app} bilan bogʻlanish: savol, taklif va xatolik ` +
                   'haqida xabar.',
      body: `
<h1>Aloqa</h1>

<h2>Elektron pochta</h2>
<p class="big">${mail}</p>
${telegram ? `
<h2>Telegram</h2>
<p class="big">${telegram}</p>
` : ''}
<h2>Savolda xato topdingizmi?</h2>
<p>Savol ekranining skrinshotini (javob va &laquo;Izoh&raquo; bilan) va
nima notoʻgʻri deb hisoblaganingizni yuboring — tekshirib, tuzatamiz.</p>

<h2>Ilova ishlamayaptimi?</h2>
<p>Qurilma modeli, Android versiyasi va ilova versiyasini (Sozlamalar
pastida koʻrsatilgan) yozsangiz, muammoni tezroq topamiz.</p>

<h2>Maʼlumotlarni oʻchirish</h2>
<p>Buning uchun bizga yozish shart emas —
<a href="../malumot-ochirish/">tartibi shu yerda</a>.</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'malumot-ochirish',
      title: 'Maʼlumotlarni oʻchirish',
      description: `${app} saqlagan maʼlumotni qanday oʻchirish. ` +
                   'Hammasi qurilmada — soʻrov yuborish shart emas.',
      body: `
<h1>Maʼlumotlarni oʻchirish</h1>

<p class="lead">Serverda sizga tegishli maʼlumot <strong>yoʻq</strong>:
${app} hisob, ism yoki telefon raqamini soʻramaydi. Shuning uchun bizga
soʻrov yuborish shart emas — hamma maʼlumot qurilmangizda va uni
oʻzingiz oʻchirasiz.</p>

<h2>Ilovaning oʻzida</h2>
<p><strong>Profil › Sozlamalar (tishli gʻildirak) › Maʼlumotlarni
oʻchirish › Oʻchirish</strong></p>
<p>Nima oʻchadi:</p>
<ul>
  <li>profil: rasm, nom, bio, rang va vitrina;</li>
  <li>IQ testlari tarixi, tugallanmagan test, mashq va oʻyin darajalari,
      rekordlar;</li>
  <li>ballar, haftalik ballar, liga tarixi va ketma-ket faol kunlar;</li>
  <li>tangalar, xaridlar, kunlik vazifalar va nishonlar;</li>
  <li>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo; roʻyxatlari,
      javoblar jurnali.</li>
</ul>
<p>Nima qoladi: til, tema, ovoz va eslatma sozlamalari hamda ilova bilan
tanishuv oʻtilgani haqidagi belgi (shuning uchun xush kelibsiz bonusi
qayta berilmaydi). Ularni ham oʻchirish uchun quyidagi usullardan birini
tanlang.</p>

<h2>Android sozlamalari orqali</h2>
<ol>
  <li><strong>Sozlamalar › Ilovalar › ${app} › Xotira › Maʼlumotni
      tozalash</strong> — hammasi, sozlamalar bilan birga, oʻchadi;</li>
  <li>yoki ilovani telefondan oʻchirib tashlang.</li>
</ol>
<p>Telefoningizda Android zaxira nusxasi yoqilgan boʻlsa, ilova
maʼlumoti shaxsiy Google hisobingizdagi nusxada ham boʻlishi mumkin va
yangi telefonda tiklanadi. Bu nusxani biz koʻrmaymiz; uni telefon
sozlamalaridagi zaxira boʻlimida oʻchirishingiz mumkin.</p>

<h2>Brauzerda (sayt versiyasi)</h2>
<p>Brauzer sozlamalarida shu sayt uchun saqlangan maʼlumotni
tozalang.</p>

<p class="warn">Oʻchirish <strong>qaytarilmaydi</strong>. Bizda nusxa
yoʻq, shuning uchun tiklab bera olmaymiz.</p>

<h2>Kelgusida hisob qoʻshilsa</h2>
<p>Hisob va natijani serverda tekshirish qoʻshilganda serverdagi
maʼlumotni oʻchirish uchun ilovada alohida tugma boʻladi va bu sahifa
oldindan yangilanadi. Hozir bunday maʼlumot yoʻq.</p>

<h2>Savol boʻlsa</h2>
<p>${mail}</p>`,
    },
  ];
}
