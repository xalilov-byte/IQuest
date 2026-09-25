/* ─────────────────────────────────────────────────────────────────────────
   SAYTNING MATN SAHIFALARI

   To'rtta sahifa: maxfiylik siyosati, foydalanish shartlari, aloqa va
   ma'lumotni o'chirish so'rovi. Uchtasi Google Play'ning MAJBURIY
   talabi — ilova do'konga chiqishi uchun ular ochiq URL bilan
   mavjud bo'lishi kerak.

   NIMA UCHUN BU SAHIFALARDA JS YO'Q: ular matn. Ilova bundle'i 240 KB,
   maxfiylik siyosati esa 6 KB bo'lishi kerak — odam (yoki Play
   Console'dagi tekshiruvchi) siyosatni o'qish uchun butun ilovani
   yuklab olmasligi kerak. Shuning uchun ular alohida, mustaqil va
   ilovadan butunlay ajratilgan.

   ENG MUHIM QOIDA: BU SAHIFALARDA YOZILGANI HAQIQAT BO'LISHI SHART.
   Maxfiylik siyosati — huquqiy hujjat. "Biz ma'lumot yig'maymiz" deb
   yozib, keyin analitika qo'shish Play siyosatini buzish va
   foydalanuvchini aldash. Shuning uchun quyidagi matn kodni tekshirib
   yozilgan (localStorage kalitlari, fetch chaqiruvlari, uchinchi tomon
   kutubxonalari sanab chiqilgan) va kod o'zgarganda U HAM
   O'ZGARTIRILISHI KERAK. Har bir da'vo yonida uni qayerdan tekshirish
   mumkinligi ko'rsatilgan.
   ───────────────────────────────────────────────────────────────────── */

const UPDATED = '2026-yil 12-sentabr';

/* Sahifalardagi barcha havolalar shu yerdan — sozlama faylidan keladi. */
export function pages(cfg) {
  const email = cfg.contactEmail;
  const mail = `<a href="mailto:${email}">${email}</a>`;

  return [
    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'maxfiylik',
      title: 'Maxfiylik siyosati',
      description: 'Nazariy ilovasi qanday ma’lumot saqlaydi va nimani ' +
                   'yubormaydi. Hisob talab qilinmaydi, analitika yo’q.',
      body: `
<h1>Maxfiylik siyosati</h1>
<p class="lead">Qisqacha: <strong>Nazariy sizdan hech qanday shaxsiy
ma’lumot yig‘maydi.</strong> Hisob yaratish talab qilinmaydi,
analitika va reklama yo‘q. Mashq natijalaringiz faqat
telefoningizda saqlanadi.</p>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. Biz nimani yig‘maymiz</h2>
<p>Nazariy quyidagilarni <strong>so‘ramaydi va yig‘maydi</strong>:</p>
<ul>
  <li>ism, telefon raqami, elektron pochta yoki boshqa shaxsiy ma’lumot;</li>
  <li>joylashuv (GPS);</li>
  <li>kontaktlar, galereya, fayllar, kamera yoki mikrofon;</li>
  <li>qurilma identifikatorlari va reklama identifikatori.</li>
</ul>
<p>Ilovada hisob (akkaunt) tushunchasi yo‘q: siz ro‘yxatdan
o‘tmasdan foydalanasiz.</p>

<h2>2. Telefoningizda nima saqlanadi</h2>
<p>Mashq natijalaringiz <strong>telefoningizning o‘zida</strong>
saqlanadi va hech qayerga yuborilmaydi. Saqlanadigan narsalar:</p>
<table>
  <thead><tr><th>Nima</th><th>Nima uchun</th></tr></thead>
  <tbody>
    <tr><td>Ballar, ketma-ket kunlar (streak), imtihon soni</td>
        <td>Natijangiz ilova yopilganda yo‘qolmasligi uchun</td></tr>
    <tr><td>Xato qilgan va saqlab qo‘ygan savollar ro‘yxati</td>
        <td>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo;
            bo‘limlari ishlashi uchun</td></tr>
    <tr><td>Berilgan javoblar ro‘yxati</td>
        <td>Kelgusida natijani boshqa qurilmaga ko‘chirish uchun
            (bu funksiya hali yoqilmagan)</td></tr>
    <tr><td>Tanlangan til va sozlamalar</td>
        <td>Har ochilishda qaytadan tanlamaslik uchun</td></tr>
    <tr><td>Savollar nusxasi</td>
        <td>Internetsiz ishlash uchun</td></tr>
  </tbody>
</table>
<p>Bularni istalgan vaqtda o‘chirishingiz mumkin &mdash;
<a href="../malumot-ochirish/">Ma’lumotni o‘chirish</a>
sahifasiga qarang.</p>

<h2>3. Internetga nima uchun chiqadi</h2>
<p>Ilova internetga <strong>bitta maqsadda</strong> chiqadi: savollar
ro‘yxatining yangi versiyasini olish. Bu so‘rovda sizga
tegishli hech qanday ma’lumot yuborilmaydi &mdash; u oddiy
&laquo;savollarni ber&raquo; so‘rovi.</p>
<p>Har qanday internet so‘rovida bo‘lgani kabi, so‘rovni
qabul qilgan server texnik jihatdan quyidagilarni ko‘radi:
IP manzil, brauzer/ilova turi va so‘rov vaqti. Bu har qanday
veb-so‘rovning ajralmas qismi; biz bu ma’lumotni tahlil
qilmaymiz va profil tuzmaymiz.</p>
<p>Savollar ma’lumotlar bazasi <a href="https://supabase.com"
rel="noopener" target="_blank">Supabase</a> xizmatida joylashgan.</p>
<p><strong>Internet bo‘lmasa ilova to‘liq ishlaydi</strong>
&mdash; savollar to‘plami ilovaning ichida bor.</p>

<h2>4. Analitika, reklama va uchinchi tomonlar</h2>
<p>Ilovada <strong>analitika tizimi yo‘q</strong> (Google Analytics,
Firebase va shunga o‘xshash hech narsa), <strong>reklama
yo‘q</strong>, <strong>xatolik hisobotlarini yuboruvchi tizim
yo‘q</strong> va <strong>ijtimoiy tarmoq kuzatuvchilari
yo‘q</strong>.</p>
<p>Shriftlar ilovaning ichiga joylashtirilgan, ya’ni ular Google
Fonts’dan yuklanmaydi &mdash; bu ham bitta kuzatuv nuqtasini
yo‘q qiladi.</p>

<h2>5. Bildirishnomalar</h2>
<p>Kunlik eslatma <strong>telefonning o‘zida</strong> tuziladi.
Serverdan push xabar yuborilmaydi va shuning uchun hech qanday qurilma
tokeni saqlanmaydi. Ruxsat bermasangiz ilova qolgan qismi bilan
odatdagidek ishlaydi.</p>

<h2>6. Bolalar</h2>
<p>Ilova haydovchilik guvohnomasi olishga tayyorlanayotgan kattalar
uchun mo‘ljallangan. Biz bolalardan ataylab ma’lumot
yig‘maymiz &mdash; umuman hech kimdan yig‘maymiz.</p>

<h2>7. Sizning huquqlaringiz</h2>
<p>Bizda sizga tegishli ma’lumot saqlanmaganligi uchun
&laquo;ma’lumotimni bering&raquo; yoki &laquo;o‘chiring&raquo;
so‘rovini yuborishning hojati yo‘q: barcha ma’lumot
sizning qurilmangizda va uni o‘zingiz o‘chirasiz. Tartibi
<a href="../malumot-ochirish/">shu sahifada</a>.</p>

<h2>8. O‘zgarishlar</h2>
<p>Ilovaga hisob yoki natijalarni sinxronlash qo‘shilsa, bu siyosat
<strong>oldindan</strong> yangilanadi va o‘zgarish sanasi shu
sahifada ko‘rsatiladi. Yig‘ilmaydigan deb yozilgan
ma’lumot keyin jimgina yig‘ilmaydi.</p>

<h2>9. Aloqa</h2>
<p>Savol yoki shikoyat bo‘lsa: ${mail}</p>`,
    },

    /* ══════════════════════════════════════════════════════════════════ */
    {
      slug: 'shartlar',
      title: 'Foydalanish shartlari',
      description: 'Nazariy ilovasidan foydalanish shartlari: savollar ' +
                   'rasmiy imtihon emas, tayyorgarlik vositasi.',
      body: `
<h1>Foydalanish shartlari</h1>
<p class="meta">Oxirgi yangilanish: ${UPDATED}</p>

<h2>1. Nazariy nima</h2>
<p>Nazariy &mdash; haydovchilik guvohnomasi olish uchun nazariy
imtihonga (YHQ) tayyorlanish vositasi. Bu <strong>o‘quv
ilovasi</strong>.</p>

<h2>2. Eng muhim ogohlantirish</h2>
<p class="warn"><strong>Nazariy rasmiy imtihon emas va rasmiy organ
bilan bog‘liq emas.</strong> Ilovadagi savollar va izohlar
tayyorgarlik uchun tuzilgan. Haqiqiy imtihondagi savollar, ularning
soni, vaqti va o‘tish shartlari boshqacha bo‘lishi mumkin.
Ilovada yuqori natija olish haqiqiy imtihondan o‘tishni
kafolatlamaydi.</p>
<p>Rasmiy qoidalar va imtihon tartibi bo‘yicha yakuniy manba
&mdash; O‘zbekiston Respublikasining amaldagi yo‘l harakati
qoidalari va vakolatli organning rasmiy ma’lumoti. Ilovadagi
izohda xatolik topsangiz, iltimos xabar bering: ${mail}</p>

<h2>3. Yo‘lda xavfsizlik</h2>
<p>Ilovadan haydash paytida foydalanish taqiqlanadi. Test yechish
diqqatni to‘liq talab qiladi.</p>

<h2>4. Ruxsat etilgan foydalanish</h2>
<p>Ilovadan shaxsiy tayyorgarlik uchun bepul foydalanasiz. Quyidagilar
ruxsat etilmaydi:</p>
<ul>
  <li>savollar bazasini ommaviy ko‘chirib olish va boshqa xizmatda
      tarqatish;</li>
  <li>ilovaning ishlashiga sun’iy yuklama berish yoki uni buzishga
      urinish;</li>
  <li>boshqa foydalanuvchilarga zarar beradigan har qanday harakat.</li>
</ul>

<h2>5. Natijalaringiz</h2>
<p>Ball, streak va ro‘yxatlar telefoningizda saqlanadi. Ilovani
o‘chirsangiz yoki qurilma ma’lumotini tozalasangiz ular
yo‘qoladi &mdash; bizda nusxasi yo‘q, shuning uchun
tiklab bera olmaymiz.</p>

<h2>6. To‘lovlar</h2>
<p>Hozircha ilova to‘liq bepul. Pulli imkoniyatlar qo‘shilsa,
nima bepul qolishi va nima pulli bo‘lishi shu yerda aniq
yoziladi va to‘lovdan oldin ko‘rsatiladi.</p>

<h2>7. Javobgarlik</h2>
<p>Ilova &laquo;qanday bo‘lsa shundayligicha&raquo; taqdim
etiladi. Biz imtihondan o‘tishni kafolatlay olmaymiz. Ilovadagi
ma’lumotga tayanib qilingan qarorlar uchun javobgarlik
foydalanuvchida qoladi.</p>

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
      description: 'Nazariy bilan bog‘lanish: xatolik haqida xabar ' +
                   'berish, savol va taklif.',
      body: `
<h1>Aloqa</h1>

<h2>Elektron pochta</h2>
<p class="big">${mail}</p>

<h2>Savol izohida xatolik topdingizmi?</h2>
<p>Bu biz uchun eng qimmatli xabar. Noto‘g‘ri javob kaliti
imtihonga tayyorlanayotgan odamga eng ko‘p zarar beradi, shuning
uchun bunday xabarlar navbatdan tashqari ko‘riladi.</p>
<p>Xabarda quyidagilarni yozsangiz tezroq tuzatamiz:</p>
<ul>
  <li>savol raqami (ilovada savol tepasida ko‘rsatiladi) yoki
      savol matnining boshi;</li>
  <li>nima noto‘g‘ri deb hisoblaysiz;</li>
  <li>agar bilsangiz &mdash; qoidaning bandi.</li>
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
      description: 'Nazariy saqlagan ma’lumotni qanday o‘chirish. ' +
                   'Barchasi qurilmada, so‘rov yuborish shart emas.',
      body: `
<h1>Ma’lumotni o‘chirish</h1>

<p class="lead">Nazariy serverida sizga tegishli hech qanday
ma’lumot saqlanmaydi &mdash; hisob yo‘q, ism yo‘q,
telefon raqami yo‘q. Shuning uchun <strong>bizga so‘rov
yuborishning hojati yo‘q</strong>: barcha ma’lumot sizning
qurilmangizda va uni o‘zingiz o‘chirasiz.</p>

<h2>Android ilovasida</h2>
<p>Ikki yo‘l bor, ikkalasi ham ma’lumotni butunlay
o‘chiradi:</p>
<ol>
  <li><strong>Sozlamalar &rarr; Ilovalar &rarr; Nazariy &rarr;
      Xotira &rarr; Ma’lumotni tozalash</strong></li>
  <li>yoki ilovani telefondan o‘chirib tashlash.</li>
</ol>

<h2>Brauzerda (saytdagi versiya)</h2>
<p>Brauzer sozlamalarida shu sayt uchun saqlangan ma’lumotni
(&laquo;site data&raquo; / &laquo;sayt ma’lumotlari&raquo;)
tozalang.</p>

<h2>Nima o‘chadi</h2>
<ul>
  <li>ballar, ketma-ket kunlar (streak), marafon rekordi;</li>
  <li>imtihon va javob sonlari;</li>
  <li>&laquo;Xatolarim&raquo; va &laquo;Saqlangan&raquo;
      ro‘yxatlari;</li>
  <li>berilgan javoblar ro‘yxati;</li>
  <li>tanlangan til va sozlamalar;</li>
  <li>savollarning saqlangan nusxasi.</li>
</ul>
<p class="warn">Bu amal <strong>qaytarilmaydi</strong>. Bizda nusxasi
yo‘q, shuning uchun tiklab bera olmaymiz.</p>

<h2>Keyinchalik hisob qo‘shilsa</h2>
<p>Ilovaga hisob va natijalarni sinxronlash qo‘shilganda
(Telegram yoki telefon raqami orqali), serverdagi ma’lumotni
o‘chirish uchun ilovaning o‘zida tugma bo‘ladi va bu
sahifa yangilanadi. Hozir bunday ma’lumot mavjud emas.</p>

<h2>Savol bo‘lsa</h2>
<p>${mail}</p>`,
    },
  ];
}
