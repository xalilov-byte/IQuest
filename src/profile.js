/* ─────────────────────────────────────────────────────────────────────────
   PROFIL — `nz-profile` va `nz-avatar-img` kalitlarining yagona egasi
   (ARXITEKTURA §5, §10). → window.nzProfile

   Diskdagi shakl (§10.2):
     nz-profile    { v: 1, username: '', bio: '', color: 'purple',
                     avatar: { kind: 'initial' } | { kind: 'preset', id }
                           | { kind: 'photo' },
                     showcase: null | ['first-test', 'compass'],   // ≤ 3
                     updatedAt: 0 }
     nz-avatar-img "data:image/jpeg;base64,…"  (≤ 64 000 belgi, xom satr)

   TOʻRT QAROR:

   1. HAMMASI YOKI HECH NARSA.
      `save(patch)` avval patchning HAR maydonini tekshiradi. Bitta
      maydon notoʻgʻri boʻlsa diskka ham, xotiraga ham hech narsa
      yozilmaydi va `errs` qaytadi. Rasm ham shu yoʻl bilan yoziladi:
      avval `nz-avatar-img`, keyin `nz-profile`; ikkinchisi yozilmasa
      birinchisi eski holatiga qaytariladi. «Yarim saqlangan profil»
      (yangi rasm, eski avatar turi) boʻlmaydi.

   2. YANGIROQ MAʼLUMOT USTIGA YOZILMAYDI.
      Diskda `v > 1` boʻlsa (ilova eski versiyaga qaytarilgan) profil
      xotirada standart qiymatlarda ishlaydi, `readOnly() === true` va
      hech bir yozuvchi metod diskka tegmaydi. Buzilgan JSON esa
      standartga tushadi va yozish MUMKIN: aks holda foydalanuvchi hech
      qachon profilini saqlay olmasdi.

   3. PROFIL BOSHQA HOLATLI MODULLARNI BILMAYDI (§10.4).
      Pulli rang egaligini `save(patch, { owns })` orqali Main beradi
      (`nzWallet.owns`). `owns` berilmasa, faqat SAQLASH paytida
      `window.nzWallet.owns` soʻraladi — yuklanishda hech qachon.
      Hamyon yoʻq boʻlsa pulli rang tanlanmaydi (`errs.color: 'locked'`).
      Statik maʼlumot (`nzCatalog`, `IQ_AVATARS`) oʻqiladi, yoʻq boʻlsa
      shu fayldagi zaxira roʻyxat ishlaydi.

   4. RASM QURILMADAN CHIQMAYDI VA RUXSAT SOʻRAMAYDI.
      Fayl yashirin `<input type="file" accept="image/jpeg,image/png,
      image/webp">` dan keladi (`capture` yoʻq → CAMERA va
      READ_MEDIA_IMAGES ruxsati kerak emas). `preparePhoto` faqat
      `dataUrl` qaytaradi, diskka yozmaydi. Canvas bilan ishlaydi, lekin
      hamma brauzer obyekti uchinchi argument (`env`) orqali almashtiriladi
      — testlar stub bilan ishlatadi.

   `localStorage` umuman ishlamasa ham modul yiqilmaydi: profil xotirada
   ishlaydi.
   ───────────────────────────────────────────────────────────────────── */

(function (root) {
  const KEY = 'nz-profile';
  const IMG_KEY = 'nz-avatar-img';
  const V = 1;
  const MIGRATE = {};                      // MIGRATE[n]: v:n → v:n+1 (hozir boʻsh)

  const BIO_MAX = 80;                      // kod nuqtalari
  const SHOWCASE_MAX = 3;
  const MAX_FILE = 15 * 1024 * 1024;       // dekodlashdan OLDIN rad etiladi
  const MAX_PIXELS = 50e6;                 // 50 MP dan kattasi xotirani yiqitadi
  const MAX_DATA = 64000;                  // nz-avatar-img chegarasi (belgi)
  const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
  const DEFAULT_COLOR = 'purple';

  /* Zaxira roʻyxatlar — nzCatalog / IQ_AVATARS yuklanmagan paytda
     (testlar, build stub). Hex qiymatlar bu yerda YOʻQ: ular faqat
     catalog.js da (§5.3). */
  const FALLBACK_COLORS = [
    ['purple', 0], ['blue', 0], ['teal', 0], ['green', 0], ['pink', 0], ['gold', 0],
    ['red', 150], ['sky', 150], ['graphite', 150], ['cherry', 150], ['dawn', 300], ['night', 300],
  ];
  const FALLBACK_AVATARS = ['owl', 'fox', 'cat', 'bear', 'lion', 'eagle', 'panda', 'rabbit',
    'penguin', 'turtle', 'dolphin', 'deer', 'cube', 'orbit', 'spark', 'spiral'];

  /* ── Matnlar {uz, ru, en} ────────────────────────────────────────────
     Kod → xato qatori matni (§5.1). UI kodni oladi va shu jadvaldan
     (yoki oʻz lugʻatidan) matn chizadi. */
  const L = (uz, ru, en) => ({ uz: uz, ru: ru, en: en });
  const TEXT = {
    username: {
      len: L('3–20 ta belgi', '3–20 символов', '3–20 characters'),
      start: L('Harf bilan boshlansin', 'Начните с буквы', 'Start with a letter'),
      chars: L('Faqat a–z, 0–9, nuqta va _', 'Только a–z, 0–9, точка и _', 'Only a–z, 0–9, dot and _'),
      format: L('Nuqta va _ ketma-ket boʻlmasin', 'Точка и _ не подряд', 'No dot or _ in a row'),
      reserved: L('Bu nomni tanlab boʻlmaydi', 'Это имя недоступно', 'This name isn’t available'),
      bad: L('Nomaqbul soʻz', 'Недопустимое слово', 'Inappropriate word'),
    },
    bio: {
      len: L('Koʻpi bilan 80 ta belgi', 'Не более 80 символов', 'Up to 80 characters'),
      link: L('Havola qoʻshib boʻlmaydi', 'Ссылки нельзя добавлять', 'Links aren’t allowed'),
      bad: L('Nomaqbul soʻz', 'Недопустимое слово', 'Inappropriate word'),
    },
    color: {
      unknown: L('Bunday rang yoʻq', 'Такого цвета нет', 'Unknown color'),
      locked: L('Bu rang Doʻkonda', 'Этот цвет в магазине', 'This color is in the shop'),
    },
    photo: {
      type: L('Bu rasmni ochib boʻlmadi', 'Не удалось открыть фото', 'Couldn’t open this photo'),
      decode: L('Bu rasmni ochib boʻlmadi', 'Не удалось открыть фото', 'Couldn’t open this photo'),
      encode: L('Bu rasmni ochib boʻlmadi', 'Не удалось открыть фото', 'Couldn’t open this photo'),
      size: L('Rasm juda katta', 'Фото слишком большое', 'Photo is too large'),
      quota: L('Rasm saqlanmadi', 'Фото не сохранено', 'Photo wasn’t saved'),
      invalid: L('Rasm saqlanmadi', 'Фото не сохранено', 'Photo wasn’t saved'),
    },
  };
  const GUEST = L('Mehmon', 'Гость', 'Guest');

  function pick(obj, lang) {
    if (!obj) return '';
    if (lang === 'ru' || lang === 'en') return obj[lang] || obj.uz;
    return obj.uz;                         // uz-cyrl: lotin manba, kirillga UI oʻgiradi
  }

  /* ── Qurilma xotirasi ──────────────────────────────────────────────── */
  let works = true;

  function readText(key) {
    try { return localStorage.getItem(key); }
    catch (e) { works = false; return null; }
  }
  /* true — yozildi yoki xotira umuman ishlamaydi (faqat xotirada ishlash);
     false — yozish rad etildi (odatda QuotaExceeded). */
  function writeText(key, text) {
    if (!works) return true;
    try { localStorage.setItem(key, text); return true; }
    catch (e) { return false; }
  }
  function removeKey(key) {
    if (!works) return;
    try { localStorage.removeItem(key); } catch (e) { /* jim */ }
  }

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const nowOf = t => (typeof t === 'number' && isFinite(t) && t >= 0 ? t : Date.now());

  /* ── Statik maʼlumot (chaqiruv paytida oʻqiladi) ─────────────────── */
  function colorTable() {
    const cat = root.nzCatalog;
    const list = cat && cat.colors;
    const out = [];
    if (Array.isArray(list) && list.length) {
      list.forEach(c => {
        if (c && typeof c.id === 'string') out.push({ id: c.id, price: c.price > 0 ? c.price : 0 });
      });
    }
    if (out.length) return out;
    return FALLBACK_COLORS.map(c => ({ id: c[0], price: c[1] }));
  }
  function colorInfo(id) {
    if (typeof id !== 'string') return null;
    const t = colorTable();
    for (let i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return null;
  }
  function avatarKnown(id) {
    if (typeof id !== 'string') return false;
    const A = root.IQ_AVATARS;
    if (A && typeof A.has === 'function') return A.has(id);
    return FALLBACK_AVATARS.indexOf(id) !== -1;
  }
  /* Egalik: avval Main bergan `owns`, keyin (faqat shu paytda) hamyon. */
  function ownsFn(opts) {
    if (opts && typeof opts.owns === 'function') return opts.owns;
    const w = root.nzWallet;
    if (w && typeof w.owns === 'function') return id => w.owns(id);
    return null;
  }
  function colorUsable(id, opts) {
    const c = colorInfo(id);
    if (!c) return 'unknown';
    if (!(c.price > 0)) return null;
    const owns = ownsFn(opts);
    let ok = false;
    try { ok = !!(owns && owns('color:' + id)); } catch (e) { ok = false; }
    return ok ? null : 'locked';
  }

  /* ════════════════════════════════════════════════════════════════════
     NOMAQBUL SOʻZLAR
     Matn tekshirishdan oldin normallashtiriladi (§5.1): kichik harf,
     kirill → lotin, diakritika olib tashlanadi, tutuq belgisi tashlanadi,
     leetspeak qaytariladi (0→o 1→i 3→e 4→a 5→s @→a, qoʻshimcha $→s,
     harf oldidagi !→i). Har boʻlak ikki koʻrinishda solishtiriladi:
       · asosiy;
       · «buklangan»: kh→h, x→h, w→v, ph→f, takror harflar bittaga
         (xuy/huy/khuy, fuuuck → bir xil).
     Ildiz yozuvi:  'root' — qayerda boʻlsa ham;  '^root' — boʻlak
     boshida;  '=root' — butun boʻlak;  oxiridagi '!' — faqat asosiy
     koʻrinish (buklash begunoh soʻz yasaydigan ildizlar: nigger → Niger).
     Qisqa yoki koʻp maʼnoli ildizlar ('^' / '=') oʻzbekcha begunoh
     soʻzlarni ushlamasligi uchun tanlangan: eshitdim, fuqaro, siqish,
     sikka, assalomu alaykum, Jizzax, Nigora, Nazira, analiz — testda.
     ════════════════════════════════════════════════════════════════════ */
  const BAD_ROOTS = [
    // English
    'fuck', '^fuk!', 'fck', '^fcuk', 'motherf', '^shit', 'bullshit', 'bitch', 'biatch', 'cunt',
    '^dick', '^cock', 'pussy', 'whore', 'slut', 'nigger!', 'nigga!', 'faggot!', '=fag', '=fags',
    'asshole', 'arsehole', 'dumbass', 'jackass', 'bastard', 'wanker', '^wank', 'dildo', 'porn',
    'sex', '^seks', 'xxx!', '^rape', 'rapist', '=nazi', 'hitler', 'penis', 'vagina', '^boob',
    '=tits', 'titty', '^piss', '=crap', 'retard', 'twat', '=cum', 'cumshot', '=jizz', 'milf',
    'horny', '=anal', '=anus', 'blowjob', 'handjob', 'orgasm', '=orgy', '=nude', '=nudes',
    'douche', 'bollock', '=prick', 'tranny', 'shemale', 'killyourself', '=kys', 'hentai',
    '=nsfw', '=fap', 'fapping', 'boner', '=semen', 'masturb',
    // Русский (транслит; кирилл матн шу шаклга келтирилади)
    '^huy', '^hui', '^huj', '^hue', 'huesos', 'huil', 'huyn', 'nahuy', 'nahui', 'nahuj',
    'pohuy', 'pohui', 'ohuel', 'ohuet', '^xyi', 'pizd', 'pezd', '^ebat', '^eban', '^ebal',
    '^ebl', '^ebn', '^ebuch', 'yebat', 'yeban', 'yebal', 'yoban', 'dolboeb', 'dolbaeb',
    'dalbaeb', 'uebok', 'ueban', 'zaeb', 'poebat', 'suka', 'cyka', 'blyad', 'blyat', 'bljad',
    'bliad', '^blya', 'mudak', 'mudil', 'mudoz', 'pidor', 'pidar', 'pidr', 'pederast', 'gandon',
    'zalupa', 'shluh', 'shlyuh', 'mandavosh', 'govno', 'gavno', 'dermo', '^srat', 'sraka',
    'zhopa', 'jopa', '=chmo', '^chmosh', 'trahat', 'minet', 'drochi', '^droch', '=hule', 'gomik',
    'gomosek', 'churka', 'chernozh', '=hach', '=zhid', 'shalava',
    // Oʻzbekcha (va qoʻshni tillardan kirib kelganlari)
    'qotaq', 'qotoq', 'kotinga', 'kotingga', 'sikaman!', 'sikay!', 'siktir!', 'sikish!', 'sikvor!',
    '^sikam!', '^sikdi!', '^sikib!', '^sikip!', '^sikil!', '=sik', 'jalab', 'zhalab', 'dalbayob', 'dalbayop',
    'dolboyob', '^dalbay', 'qanjiq', 'kanjik', 'haromi', 'haromzoda', 'haromzada', 'qahba',
    'kahba', 'fohisha', 'hezalak', 'onanist', 'onaniz', 'amcik', 'amjik', 'orospu', 'yarrak!',
  ];
  /* '^' va '=' ildizlari uchun begunoh boshlanishlar. */
  const ALLOW = ['cockt', 'cockp', 'cockatoo', 'dicken', 'dickson', 'shitob', 'rapeseed', 'huevo', 'blyashk'];

  const CYR = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'қ': 'q', 'ғ': 'g',
    'ҳ': 'h', 'і': 'i', 'ї': 'i', 'є': 'e', 'ґ': 'g', 'ј': 'j',
  };
  /* Kirill harfi lotinga «oʻxshatib» yozilganda (fuсk — «с» kirill). */
  const HOMO = {
    'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p',
    'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ӏ': 'l',
  };
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '$': 's' };

  const fold = s => s.replace(/kh/g, 'h').replace(/x/g, 'h').replace(/w/g, 'v')
    .replace(/ph/g, 'f').replace(/([a-z])\1+/g, '$1');

  const ROOTS = BAD_ROOTS.map(r => {
    let mode = 'sub', noFold = false;
    if (r[0] === '^') { mode = 'pre'; r = r.slice(1); }
    else if (r[0] === '=') { mode = 'word'; r = r.slice(1); }
    if (r[r.length - 1] === '!') { noFold = true; r = r.slice(0, -1); }
    return { root: r, fold: fold(r), mode: mode, noFold: noFold };
  });

  function mapChars(s, table) {
    let out = '';
    for (const ch of s) out += Object.prototype.hasOwnProperty.call(table, ch) ? table[ch] : ch;
    return out;
  }

  function latinView(s) {
    return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[ʻʼ'`’‘´]/g, '').replace(/ı/g, 'i').replace(/ß/g, 'ss')
      .replace(/[0-9@$]/g, ch => LEET[ch] || ch);
  }

  /* Matn → tekshiriladigan boʻlaklar. So'z ichidagi tinish belgisi
     boʻlakni ajratadi, lekin boʻlaklar birlashtirilgan holda ham
     tekshiriladi (fu.ck, fu_ck). Bitta harfli soʻzlar ketma-ketligi
     ham birlashtiriladi (f u c k). */
  function pieces(text) {
    let t = String(text == null ? '' : text).replace(/\p{Cf}/gu, '').toLowerCase();
    t = t.replace(/!(?=\p{L})/gu, 'i');
    const views = [mapChars(t, CYR)];
    if (/[Ѐ-ӿԀ-ԯ]/.test(t)) views.push(mapChars(t, HOMO));
    const out = [];
    views.forEach(view => {
      const words = latinView(view).split(/\s+/);
      let run = '';
      const flush = () => { if (run.length >= 3) out.push(run); run = ''; };
      words.forEach(w => {
        const parts = w.split(/[^a-z]+/).filter(Boolean);
        const joined = parts.join('');
        if (!joined) return;
        if (joined.length === 1) { run += joined; return; }
        flush();
        out.push(joined);
        if (parts.length > 1) parts.forEach(p => out.push(p));
      });
      flush();
    });
    return out;
  }

  const allowed = v => ALLOW.some(a => v.indexOf(a) === 0);
  /* 'root' ildizlari uchun: shu soʻzlar boʻlak ichidan olib tashlanib
     keyin qidiriladi (Essex, therapist). */
  const SUB_ALLOW = ['middlesex', 'sussex', 'essex', 'therapist', 'scunthorpe'];
  const stripAllowed = v => SUB_ALLOW.reduce((acc, a) => acc.split(a).join(' '), v);

  function hit(v, root, mode) {
    if (mode === 'sub') return v.indexOf(root) !== -1;   // v allaqachon stripAllowed dan oʻtgan
    if (mode === 'pre') return v.indexOf(root) === 0 && !allowed(v);
    return v === root;
  }

  /* Topilgan ildiz yoki null. */
  function badWord(text) {
    const ps = pieces(text);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], f = fold(p);
      const ps2 = stripAllowed(p), f2 = fold(ps2);
      for (let j = 0; j < ROOTS.length; j++) {
        const r = ROOTS[j];
        const sub = r.mode === 'sub';
        if (hit(sub ? ps2 : p, r.root, r.mode)) return r.root;
        if (!r.noFold && hit(sub ? f2 : f, r.fold, r.mode)) return r.root;
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════
     FOYDALANUVCHI NOMI (§5.1)
     ════════════════════════════════════════════════════════════════════ */
  const RESERVED = ['admin', 'administrator', 'moderator', 'moder', 'support', 'yordam', 'help',
    'official', 'rasmiy', 'mensa', 'system', 'tizim', 'root', 'null', 'undefined', 'bot',
    'telegram', 'google', 'play', 'iquest'];
  /* Nomning boʻlagi sifatida ham band (admin_uz, support.team, uz.google):
     rasmiy hisobga oʻxshatish. «bot», «play», «help» kabi umumiy soʻzlar
     bu roʻyxatda yoʻq — botir, player, helper erkin. */
  const RESERVED_PART = ['admin', 'administrator', 'moderator', 'moder', 'support', 'official',
    'rasmiy', 'mensa', 'system', 'tizim', 'root', 'telegram', 'google', 'iquest'];

  const leet = s => s.replace(/[0-9]/g, ch => LEET[ch] || ch);
  const stripDigits = s => s.replace(/[0-9]+$/, '');

  function isReserved(u) {
    const skel = u.replace(/[._]/g, '');
    const cands = [skel, stripDigits(skel)];
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i], l = leet(c);
      if (c.indexOf('iquest') !== -1 || l.indexOf('iquest') !== -1) return true;
      if (RESERVED.indexOf(c) !== -1 || RESERVED.indexOf(l) !== -1) return true;
    }
    const parts = u.split(/[._]/).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const p = stripDigits(parts[i]);
      if (RESERVED_PART.indexOf(p) !== -1 || RESERVED_PART.indexOf(leet(p)) !== -1) return true;
    }
    return false;
  }

  /* Kiritish paytidagi koʻrinish: kichik harf, har qanday boʻshliq
     tashlanadi. Boshqa belgilar (kirill, tutuq) OʻZGARTIRILMAYDI —
     ular `chars` xatosini beradi, jimgina yoʻqolmaydi. */
  function normalizeUsername(s) {
    return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/[\s\u200b\ufeff]+/g, '');
  }

  function validateUsername(s) {
    const u = normalizeUsername(s);
    if (u === '') return null;                              // ixtiyoriy
    if (/[^a-z0-9._]/.test(u)) return 'chars';
    if (!/^[a-z]/.test(u)) return 'start';
    if (u.length < 3 || u.length > 20) return 'len';
    if (/\.\.|__|\._|_\.|[._]$/.test(u)) return 'format';
    if (!/^[a-z][a-z0-9._]{2,19}$/.test(u)) return 'chars';  // himoya: asosiy regex
    if (isReserved(u)) return 'reserved';
    if (badWord(u)) return 'bad';
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════
     BIO (§5.1)
     ════════════════════════════════════════════════════════════════════ */
  const LINK = /https?:|www\.|t\.me\/|@\w{4,}|\.(uz|com|ru|org|net|me|io)\b/i;
  /* Boshqaruv, koʻrinmas va yoʻnalish belgilari (Trojan Source uslubidagi
     aldov va sozni boʻlib yuborish). Emoji uchun ZWJ (U+200D) qoladi. */
  const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

  function cleanBio(s) {
    let v = String(s == null ? '' : s).normalize('NFC');
    v = v.replace(/\r\n?|[\n\t\v\f\u2028\u2029]/g, ' ').replace(INVISIBLE, '');
    v = v.replace(/\s+/g, ' ').trim();
    let n = 0;
    for (const ch of v) { void ch; n++; }
    if (n > BIO_MAX) return { value: v, err: 'len' };
    if (LINK.test(v)) return { value: v, err: 'link' };
    if (badWord(v)) return { value: v, err: 'bad' };
    return { value: v, err: null };
  }

  /* ── Avatar, vitrina, rasm ─────────────────────────────────────────── */
  const BADGE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const PHOTO_RE = /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+={0,2}$/;

  const validPhoto = s => typeof s === 'string' && s.length <= MAX_DATA && PHOTO_RE.test(s);

  function saneAvatar(a) {
    if (!isObj(a)) return { kind: 'initial' };
    if (a.kind === 'preset' && avatarKnown(a.id)) return { kind: 'preset', id: a.id };
    if (a.kind === 'photo') return { kind: 'photo' };
    return { kind: 'initial' };
  }

  /* null — avtomatik rejim. Massiv: noyob, id shakli toʻgʻri, ≤ 3. */
  function checkShowcase(v) {
    if (v === null) return { value: null, err: null };
    if (!Array.isArray(v)) return { value: null, err: 'format' };
    if (v.length > SHOWCASE_MAX) return { value: null, err: 'len' };
    const out = [];
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== 'string' || !BADGE_ID.test(v[i]) || out.indexOf(v[i]) !== -1) {
        return { value: null, err: 'id' };
      }
      out.push(v[i]);
    }
    return { value: out, err: null };
  }

  /* ── Holat ─────────────────────────────────────────────────────────── */
  function blank() {
    return { v: V, username: '', bio: '', color: DEFAULT_COLOR, avatar: { kind: 'initial' },
             showcase: null, updatedAt: 0 };
  }

  /* v === V yozuvi: har maydon alohida; yaramagani standartga tushadi. */
  function sane(raw) {
    const b = blank();
    if (typeof raw.username === 'string') {
      const u = normalizeUsername(raw.username);
      if (!validateUsername(u)) b.username = u;
    }
    if (typeof raw.bio === 'string') {
      const c = cleanBio(raw.bio);
      if (!c.err) b.bio = c.value;
    }
    if (colorInfo(raw.color)) b.color = raw.color;          // egalik bu yerda tekshirilMAYDI
    b.avatar = saneAvatar(raw.avatar);
    if (Array.isArray(raw.showcase)) {
      const seen = [];
      raw.showcase.forEach(id => {
        if (typeof id === 'string' && BADGE_ID.test(id) && seen.indexOf(id) === -1 && seen.length < SHOWCASE_MAX) seen.push(id);
      });
      b.showcase = seen;
    }
    if (typeof raw.updatedAt === 'number' && isFinite(raw.updatedAt) && raw.updatedAt >= 0) b.updatedAt = raw.updatedAt;
    return b;
  }

  function readPhoto() {
    const t = readText(IMG_KEY);
    if (t == null) return null;
    if (validPhoto(t)) return t;
    try { const j = JSON.parse(t); if (validPhoto(j)) return j; } catch (e) { /* yaroqsiz */ }
    return null;
  }

  /* origin: 'new' | 'stored' | 'migrated' | 'corrupt' | 'newer' */
  let store = blank(), img = null, ro = false, origin = 'new';

  (function load() {
    const text = readText(KEY);
    if (text != null) {
      let raw = null;
      try { raw = JSON.parse(text); } catch (e) { raw = null; }
      if (!isObj(raw) || !Number.isInteger(raw.v) || raw.v < 1) {
        origin = 'corrupt';
      } else if (raw.v > V) {
        origin = 'newer'; ro = true;
      } else {
        let migrated = false, okChain = true;
        while (raw.v < V) {
          const step = MIGRATE[raw.v];
          if (!step) { okChain = false; break; }
          raw = step(raw); migrated = true;
        }
        if (okChain) {
          store = sane(raw);
          origin = migrated ? 'migrated' : 'stored';
          if (migrated) writeText(KEY, JSON.stringify(store));
        } else origin = 'corrupt';
      }
    }
    if (!ro) img = readPhoto();
    if (store.avatar.kind === 'photo' && !img) store.avatar = { kind: 'initial' };
  })();

  function copy(p) {
    return { v: p.v, username: p.username, bio: p.bio, color: p.color,
             avatar: Object.assign({}, p.avatar), showcase: p.showcase ? p.showcase.slice() : null,
             updatedAt: p.updatedAt };
  }

  const sameAvatar = (a, b) => a.kind === b.kind && (a.id || null) === (b.id || null);
  const sameShowcase = (a, b) => (a === null || b === null) ? a === b : a.join(',') === b.join(',');
  const sameProfile = (a, b) => a.username === b.username && a.bio === b.bio && a.color === b.color &&
    sameAvatar(a.avatar, b.avatar) && sameShowcase(a.showcase, b.showcase);

  /* Patchni tekshiradi, hech narsa yozmaydi.
     → { ok, errs, next, photo } — photo: yoziladigan yangi dataUrl yoki null. */
  function check(patch, opts) {
    const p = isObj(patch) ? patch : {};
    const errs = {};
    const next = copy(store);
    let photo = null;

    if ('username' in p) {
      const u = normalizeUsername(p.username);
      const e = validateUsername(u);
      if (e) errs.username = e; else next.username = u;
    }
    if ('bio' in p) {
      const c = cleanBio(p.bio);
      if (c.err) errs.bio = c.err; else next.bio = c.value;
    }
    if ('color' in p) {
      /* Saqlangan rangni qayta yuborish har doim mumkin: boshqa maydonni
         saqlash hamyon holatiga bogʻlanib qolmasin. */
      const e = p.color === store.color && colorInfo(p.color) ? null : colorUsable(p.color, opts);
      if (e) errs.color = e; else next.color = p.color;
    }
    const pd = p.photoData != null ? p.photoData : p.photo;
    const hasPhoto = pd != null && pd !== '';
    if (hasPhoto && !validPhoto(pd)) errs.photo = 'invalid';
    if ('avatar' in p) {
      const a = p.avatar;
      if (!isObj(a)) errs.avatar = 'unknown';
      else if (a.kind === 'initial') next.avatar = { kind: 'initial' };
      else if (a.kind === 'preset') {
        if (avatarKnown(a.id)) next.avatar = { kind: 'preset', id: a.id }; else errs.avatar = 'unknown';
      } else if (a.kind === 'photo') {
        if (hasPhoto || img) next.avatar = { kind: 'photo' }; else errs.avatar = 'photo';
      } else errs.avatar = 'unknown';
    } else if (hasPhoto) {
      next.avatar = { kind: 'photo' };
    }
    if (hasPhoto && !errs.photo && next.avatar.kind === 'photo' && pd !== img) photo = pd;
    if ('showcase' in p) {
      const s = checkShowcase(p.showcase);
      if (s.err) errs.showcase = s.err; else next.showcase = s.value;
    }
    return { ok: Object.keys(errs).length === 0, errs: errs, next: next, photo: photo };
  }

  function save(patch, opts) {
    if (ro) return { ok: false, errs: {}, err: 'readonly' };
    const r = check(patch, opts);
    if (!r.ok) return { ok: false, errs: r.errs };
    if (sameProfile(r.next, store) && !r.photo) return { ok: true, errs: {}, changed: false, profile: copy(store) };

    const next = r.next;
    next.updatedAt = nowOf(opts && opts.now);
    const prevImg = img;
    if (r.photo && !writeText(IMG_KEY, r.photo)) return { ok: false, errs: {}, err: 'quota' };
    if (!writeText(KEY, JSON.stringify(next))) {
      if (r.photo) { if (prevImg) writeText(IMG_KEY, prevImg); else removeKey(IMG_KEY); }
      return { ok: false, errs: {}, err: 'quota' };
    }
    store = next;
    if (r.photo) img = r.photo;
    /* Rasmdan voz kechilgan boʻlsa u qurilmada qolmaydi (maxfiylik va joy). */
    if (store.avatar.kind !== 'photo' && img) { removeKey(IMG_KEY); img = null; }
    return { ok: true, errs: {}, changed: true, profile: copy(store) };
  }

  /* Qoralama saqlangan holatdan farq qiladimi («Saqlash» tugmasi uchun).
     Notoʻgʻri maydon ham «oʻzgarish» hisoblanadi. */
  function dirty(draft) {
    const d = isObj(draft) ? draft : {};
    if ('username' in d && normalizeUsername(d.username) !== store.username) return true;
    if ('bio' in d && cleanBio(d.bio).value !== store.bio) return true;
    if ('color' in d && d.color !== store.color) return true;
    if ('avatar' in d && (!isObj(d.avatar) || !sameAvatar(saneAvatar(d.avatar), store.avatar) ||
        (d.avatar.kind === 'preset' && !avatarKnown(d.avatar.id)))) return true;
    const pd = d.photoData != null ? d.photoData : d.photo;
    if (pd != null && pd !== '' && pd !== img && (!('avatar' in d) || (isObj(d.avatar) && d.avatar.kind === 'photo'))) return true;
    if ('showcase' in d) {
      const s = checkShowcase(d.showcase);
      if (s.err || !sameShowcase(s.value, store.showcase)) return true;
    }
    return false;
  }

  /* ── Vitrina yordamchilari (§5.4) ─────────────────────────────────────
     available — foydalanuvchida BOR nishonlar, eskidan yangiga: id
     satrlari yoki { id, at }. Uni Main nzBadges/nzWallet dan yigʻadi. */
  function availList(available) {
    if (!Array.isArray(available)) return null;
    const items = available.map((x, i) => (typeof x === 'string' ? { id: x, at: i } :
      (isObj(x) && typeof x.id === 'string' ? { id: x.id, at: typeof x.at === 'number' ? x.at : i } : null)))
      .filter(Boolean);
    items.sort((a, b) => a.at - b.at);
    return items.map(x => x.id);
  }
  function showcaseOf(available) {
    const av = availList(available);
    if (store.showcase === null) return av ? av.slice(-SHOWCASE_MAX).reverse() : [];
    return av ? store.showcase.filter(id => av.indexOf(id) !== -1) : store.showcase.slice();
  }
  function pinBadge(id, available, opts) {
    const cur = showcaseOf(available);
    if (cur.indexOf(id) !== -1) {
      if (store.showcase === null) return save({ showcase: cur }, opts);   // avto → aniq
      return { ok: true, errs: {}, changed: false, profile: copy(store) };
    }
    if (cur.length >= SHOWCASE_MAX) return { ok: false, errs: { showcase: 'full' }, err: 'full' };
    return save({ showcase: cur.concat([id]) }, opts);
  }
  function unpinBadge(id, available, opts) {
    return save({ showcase: showcaseOf(available).filter(x => x !== id) }, opts);
  }

  /* ════════════════════════════════════════════════════════════════════
     RASM QUVURI (§5.2)
     ════════════════════════════════════════════════════════════════════ */

  /* Fayl boshidan format, oʻlcham va EXIF burilishi.
     → { type: 'jpeg'|'png'|'webp'|'heic'|null, w, h, orientation } */
  function imageMeta(u8) {
    const m = { type: null, w: 0, h: 0, orientation: 1 };
    if (!u8 || u8.length < 12) return m;
    const b = i => (i < u8.length ? u8[i] : 0);
    const be16 = i => (b(i) << 8) | b(i + 1);
    const be32 = i => ((b(i) << 24) >>> 0) + (b(i + 1) << 16) + (b(i + 2) << 8) + b(i + 3);
    const le16 = i => b(i) | (b(i + 1) << 8);
    const le24 = i => b(i) | (b(i + 1) << 8) | (b(i + 2) << 16);
    const str = (i, n) => { let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(b(i + k)); return s; };

    if (b(0) === 0xff && b(1) === 0xd8) {
      m.type = 'jpeg';
      let i = 2;
      while (i + 4 <= u8.length) {
        if (b(i) !== 0xff) break;
        const mk = b(i + 1);
        if (mk === 0xff) { i++; continue; }
        if (mk === 0xd8 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) { i += 2; continue; }
        if (mk === 0xda || mk === 0xd9) break;
        const len = be16(i + 2);
        if (len < 2) break;
        if (mk === 0xe1 && str(i + 4, 6) === 'Exif\0\0') {
          const t = i + 10;
          const little = str(t, 2) === 'II';
          const r16 = k => (little ? le16(k) : be16(k));
          const r32 = k => (little ? (le16(k) + le16(k + 2) * 65536) : be32(k));
          const ifd = t + r32(t + 4);
          const n = r16(ifd);
          for (let e = 0; e < n && e < 256; e++) {
            const en = ifd + 2 + e * 12;
            if (en + 12 > u8.length) break;
            if (r16(en) === 0x0112) {
              const o = r16(en + 8);
              if (o >= 1 && o <= 8) m.orientation = o;
              break;
            }
          }
        } else if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) {
          m.h = be16(i + 5); m.w = be16(i + 7);
        }
        i += 2 + len;
      }
      return m;
    }
    if (b(0) === 0x89 && str(1, 3) === 'PNG') {
      m.type = 'png'; m.w = be32(16); m.h = be32(20); return m;
    }
    if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') {
      m.type = 'webp';
      const c = str(12, 4);
      if (c === 'VP8 ') { m.w = le16(26) & 0x3fff; m.h = le16(28) & 0x3fff; }
      else if (c === 'VP8L') {
        const b0 = b(21), b1 = b(22), b2 = b(23), b3 = b(24);
        m.w = 1 + (((b1 & 0x3f) << 8) | b0);
        m.h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      } else if (c === 'VP8X') { m.w = 1 + le24(24); m.h = 1 + le24(27); }
      return m;
    }
    if (str(4, 4) === 'ftyp') { m.type = 'heic'; return m; }
    return m;
  }

  /* EXIF burilishi (1..8) uchun canvas matritsasi: manba (w×h) →
     toʻgʻri koʻrinish. 5..8 da eni va boʻyi almashadi. */
  function orientMatrix(o, w, h) {
    switch (o) {
      case 2: return [-1, 0, 0, 1, w, 0];
      case 3: return [-1, 0, 0, -1, w, h];
      case 4: return [1, 0, 0, -1, 0, h];
      case 5: return [0, 1, 1, 0, 0, 0];
      case 6: return [0, 1, -1, 0, h, 0];
      case 7: return [0, -1, -1, 0, h, w];
      case 8: return [0, -1, 1, 0, 0, w];
      default: return [1, 0, 0, 1, 0, 0];
    }
  }

  const ALIGNS = { portrait: ['top', 'center', 'bottom'], landscape: ['left', 'center', 'right'], square: ['center'] };
  const ALIGN_DEFAULT = { portrait: 'top', landscape: 'center', square: 'center' };

  function shapeOf(w, h) { return w > h ? 'landscape' : w < h ? 'portrait' : 'square'; }

  /* Toʻgʻri koʻrinishdagi (W×H) rasmdan kvadrat. Portretda yuqori |
     markaz | past (standart yuqori — yuz kesilmasin), albomda chap |
     markaz | oʻng. Mos kelmagan align standartga tushadi. */
  function cropSquare(W, H, align) {
    const shape = shapeOf(W, H);
    const a = ALIGNS[shape].indexOf(align) !== -1 ? align : ALIGN_DEFAULT[shape];
    const s = Math.min(W, H);
    let x = 0, y = 0;
    if (shape === 'portrait') y = a === 'top' ? 0 : a === 'bottom' ? H - s : Math.round((H - s) / 2);
    if (shape === 'landscape') x = a === 'left' ? 0 : a === 'right' ? W - s : Math.round((W - s) / 2);
    return { x: x, y: y, s: s, shape: shape, align: a };
  }

  /* Kodlash zinapoyasi (§5.2 p.5): 64 000 belgiga sigʻmaguncha. */
  const LADDER = [
    [256, 'image/jpeg', 0.82], [256, 'image/jpeg', 0.70], [256, 'image/jpeg', 0.60],
    [192, 'image/jpeg', 0.60], [192, 'image/webp', 0.60], [128, 'image/jpeg', 0.60],
  ];

  function envOf(e) {
    e = e || {};
    const W = root;
    return {
      createImageBitmap: 'createImageBitmap' in e ? e.createImageBitmap
        : (typeof W.createImageBitmap === 'function' ? W.createImageBitmap.bind(W) : null),
      FileReader: 'FileReader' in e ? e.FileReader : (W.FileReader || null),
      Image: 'Image' in e ? e.Image : (W.Image || null),
      canvas: e.canvas || function (w, h) {
        const c = W.document.createElement('canvas'); c.width = w; c.height = h; return c;
      },
      /* <img> yoʻli EXIF ni oʻzi qoʻllaydimi (Chrome 81+). */
      cssOrientation: 'cssOrientation' in e ? !!e.cssOrientation
        : !!(W.CSS && typeof W.CSS.supports === 'function' && W.CSS.supports('image-orientation', 'from-image')),
    };
  }

  function readerPromise(E, file, how) {
    return new Promise((resolve, reject) => {
      const r = new E.FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('read'));
      r[how](file);
    });
  }

  async function readHead(file, E) {
    try {
      const part = typeof file.slice === 'function' ? file.slice(0, 256 * 1024) : file;
      if (part && typeof part.arrayBuffer === 'function') return new Uint8Array(await part.arrayBuffer());
      if (E.FileReader) return new Uint8Array(await readerPromise(E, part, 'readAsArrayBuffer'));
    } catch (e) { /* bosh oʻqilmadi — dekoder hal qiladi */ }
    return null;
  }

  async function decode(file, E) {
    if (E.createImageBitmap) {
      try {
        const bm = await E.createImageBitmap(file, { imageOrientation: 'from-image' });
        if (bm && bm.width > 0 && bm.height > 0) return { src: bm, w: bm.width, h: bm.height, trusted: true };
      } catch (e) { /* eski WebView parametrni bilmasligi mumkin */ }
      try {
        const bm = await E.createImageBitmap(file);
        if (bm && bm.width > 0 && bm.height > 0) return { src: bm, w: bm.width, h: bm.height, trusted: false };
      } catch (e) { /* zaxira yoʻlga */ }
    }
    /* Zaxira: FileReader → Image. Blob URL YOʻQ (CSP img-src). */
    if (E.FileReader && E.Image) {
      try {
        const url = await readerPromise(E, file, 'readAsDataURL');
        const im = await new Promise((resolve, reject) => {
          const i = new E.Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('decode'));
          i.src = url;
        });
        const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        if (w > 0 && h > 0) return { src: im, w: w, h: h, trusted: E.cssOrientation };
      } catch (e) { /* dekodlanmadi */ }
    }
    return null;
  }

  /* Dekoder EXIF ni qoʻllamagan boʻlsa — qoʻlda qoʻllanadigan burilish.
     90° burilishda (5..8) buni oʻlchamdan aniq bilamiz; 2..4 da dekoder
     yoʻliga ishonamiz. */
  function manualOrientation(meta, dec) {
    const o = meta ? meta.orientation : 1;
    if (!(o >= 2 && o <= 8)) return 1;
    if (o >= 5 && meta.w > 0 && meta.h > 0 && meta.w !== meta.h) {
      if (dec.w === meta.w && dec.h === meta.h) return o;
      if (dec.w === meta.h && dec.h === meta.w) return 1;
    }
    return dec.trusted ? 1 : o;
  }

  /* Kesilgan kvadratni size×size canvasʼga chizadi. Katta kichraytirish
     bosqichma-bosqich (2× qadam): bir sakrashda 4000 → 256 xira chiqadi. */
  function render(dec, o, crop, size, E) {
    let stage = size;
    while (stage * 2 < crop.s && stage * 2 <= 2048) stage *= 2;
    const first = E.canvas(stage, stage);
    let ctx = first.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';                   // PNG shaffofligi JPEG da qora boʻlmasin
    ctx.fillRect(0, 0, stage, stage);
    const k = stage / crop.s;
    ctx.setTransform(k, 0, 0, k, -crop.x * k, -crop.y * k);
    const m = orientMatrix(o, dec.w, dec.h);
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(dec.src, 0, 0);
    let cur = first;
    while (stage > size) {
      const nextSize = Math.max(size, Math.round(stage / 2));
      const c = E.canvas(nextSize, nextSize);
      ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cur, 0, 0, stage, stage, 0, 0, nextSize, nextSize);
      cur = c; stage = nextSize;
    }
    return cur;
  }

  function preparePhoto(file, align, env) {
    const E = envOf(env);
    return (async function () {
      if (!file || typeof file !== 'object' || typeof file.size !== 'number') return { ok: false, err: 'type' };
      const type = String(file.type || '').toLowerCase();
      if (type && ACCEPT.indexOf(type) === -1) return { ok: false, err: 'type' };
      if (file.size > MAX_FILE) return { ok: false, err: 'size' };
      if (file.size <= 0) return { ok: false, err: 'decode' };

      const head = await readHead(file, E);
      const meta = head ? imageMeta(head) : null;
      if (meta && head.length >= 12 && (meta.type === null || meta.type === 'heic')) return { ok: false, err: 'decode' };
      if (meta && meta.w * meta.h > MAX_PIXELS) return { ok: false, err: 'size' };

      const dec = await decode(file, E);
      if (!dec) return { ok: false, err: 'decode' };
      try {
        const o = manualOrientation(meta, dec);
        const W = o >= 5 ? dec.h : dec.w, H = o >= 5 ? dec.w : dec.h;
        const crop = cropSquare(W, H, align);
        const cache = {};
        for (let i = 0; i < LADDER.length; i++) {
          const size = LADDER[i][0], mime = LADDER[i][1], q = LADDER[i][2];
          let url;
          try {
            const c = cache[size] || (cache[size] = render(dec, o, crop, size, E));
            url = c.toDataURL(mime, q);
          } catch (e) { url = null; }
          if (typeof url === 'string' && url.indexOf('data:' + mime + ';base64,') === 0 && validPhoto(url)) {
            return { ok: true, dataUrl: url, shape: crop.shape, align: crop.align, size: size, quality: q };
          }
        }
        return { ok: false, err: 'encode' };
      } finally {
        if (dec.src && typeof dec.src.close === 'function') { try { dec.src.close(); } catch (e) { /* jim */ } }
      }
    })().catch(() => ({ ok: false, err: 'decode' }));
  }

  /* Faqat rasm kalitini yozadi (profil avatar turi — `save` bilan).
     Tavsiya: «Saqlash» da `save({ ..., avatar: {kind:'photo'}, photoData })`
     — u ikkala kalitni birga, hammasi-yoki-hech-narsa bilan yozadi. */
  function commitPhoto(dataUrl) {
    if (ro) return { ok: false, err: 'readonly' };
    if (!validPhoto(dataUrl)) return { ok: false, err: 'invalid' };
    if (!writeText(IMG_KEY, dataUrl)) return { ok: false, err: 'quota' };
    img = dataUrl;
    return { ok: true };
  }

  function removePhoto(opts) {
    if (ro) return { ok: false, err: 'readonly' };
    if (store.avatar.kind === 'photo') {
      const next = copy(store);
      next.avatar = { kind: 'initial' };
      next.updatedAt = nowOf(opts && opts.now);
      if (!writeText(KEY, JSON.stringify(next))) return { ok: false, err: 'quota' };
      store = next;
    }
    removeKey(IMG_KEY);
    img = null;
    return { ok: true };
  }

  /* «Maʼlumotlarni oʻchirish» (§10.6): foydalanuvchining aniq niyati,
     shuning uchun readOnly holatida ham ikkala kalit oʻchadi. */
  function reset() {
    removeKey(KEY); removeKey(IMG_KEY);
    store = blank(); img = null; ro = false; origin = 'new';
  }

  root.nzProfile = {
    KEY: KEY, IMG_KEY: IMG_KEY, V: V,
    BIO_MAX: BIO_MAX, SHOWCASE_MAX: SHOWCASE_MAX, MAX_FILE: MAX_FILE, MAX_DATA: MAX_DATA,
    ACCEPT: ACCEPT.join(','),
    TEXT: TEXT, GUEST: GUEST,

    get: function () { return copy(store); },
    save: save,
    check: function (patch, opts) { const r = check(patch, opts); return { ok: r.ok, errs: r.errs }; },
    dirty: dirty,
    readOnly: function () { return ro; },
    origin: function () { return origin; },

    validateUsername: validateUsername,
    normalizeUsername: normalizeUsername,
    cleanBio: cleanBio,
    badWord: badWord,

    /* Rang: null — tanlasa boʻladi; 'unknown' | 'locked'. */
    colorState: function (id, opts) { return colorUsable(id, opts); },

    /* Koʻrsatish: nom yoki «Mehmon»; bosh harf (nom boʻlmasa «M»). */
    displayName: function (lang) { return store.username || pick(GUEST, lang); },
    initial: function (lang) {
      const s = store.username || pick(GUEST, lang);
      return s ? String.fromCodePoint(s.codePointAt(0)).toUpperCase() : 'M';
    },
    errText: function (field, code, lang) { return pick(TEXT[field] && TEXT[field][code], lang); },
    /* «Tanishuv» nishoni sharti (§6.6): nom, bosh harf emas avatar, bio. */
    complete: function () { return !!store.username && store.avatar.kind !== 'initial' && !!store.bio; },

    showcase: showcaseOf,
    pinBadge: pinBadge,
    unpinBadge: unpinBadge,

    photo: function () { return store.avatar.kind === 'photo' ? img : null; },
    preparePhoto: preparePhoto,
    commitPhoto: commitPhoto,
    removePhoto: removePhoto,
    reset: reset,

    /* Testlar uchun sof yordamchilar. */
    _photo: { imageMeta: imageMeta, orientMatrix: orientMatrix, cropSquare: cropSquare,
              manualOrientation: manualOrientation, LADDER: LADDER },
  };
})(typeof window !== 'undefined' ? window : globalThis);
