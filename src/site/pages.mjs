/* ─────────────────────────────────────────────────────────────────────────
   SAYTNING MATN SAHIFALARI — uch tilda (oʻzbek · rus · ingliz)

   Toʻrtta sahifa: maxfiylik siyosati, foydalanish shartlari (oferta),
   aloqa va maʼlumotlarni oʻchirish. Maxfiylik, aloqa va oʻchirish
   Google Playʼning MAJBURIY talabi — ilova doʻkonga chiqishi uchun ular
   ochiq URL bilan mavjud boʻlishi kerak.

   MATNLAR ALOHIDA FAYLLARDA: legal-uz.mjs (asl matn), legal-ru.mjs,
   legal-en.mjs. Bu fayl — ularning umumiy APIʼsi va sahifa ramkasi
   (navigatsiya, til tanlovi) uchun yorliqlar.

   MANZILLAR (ilova shu sxemaga tayanadi — ARXITEKTURA §7.1):
       uz, uz-cyrl → /<slug>/          ru → /ru/<slug>/     en → /en/<slug>/
   Slug hamma tilda BIR XIL (oʻzbekcha): maxfiylik, shartlar, aloqa,
   malumot-ochirish. Ilova faqat til prefiksini qoʻshadi.

   INGLIZ TILI DARVOZASI (ARXITEKTURA §8.4, 4-shart): build `legalReady(
   cfg, 'en')` ni chaqiradi — /en/shartlar/ va /en/maxfiylik/ tayyor va
   Shartlarda toʻliq rad qilish matni bor boʻlsa `true`.

   RAD QILISH MATNI SHU YERDA. Mahsulot egasining qarori (2026-09-25,
   CONTRACT §6): ilova ekranlarida «taxminiy», «klinik emas» kabi izohlar
   yoʻq, ularning TOʻLIQ matni «Foydalanish shartlari»da. Shu sabab
   Shartlardagi ogohlantirish qisqartirilmaydi va HAR UCHALA tilda bor
   (ilova ru/en rejimida Shartlarning oʻz tilidagi nusxasini ochadi).

   ENG MUHIM QOIDA: BU SAHIFALARDA YOZILGANI HAQIQAT BOʻLISHI SHART.
   Maxfiylik siyosati — huquqiy hujjat. Matn kodni tekshirib yozilgan va
   kod oʻzgarganda UCHALA TILDA HAM oʻzgartirilishi kerak:
     · qurilmadagi kalitlar (ARXITEKTURA §10.1): nz-progress, nz-attempts,
       nz-iq-tests, nz-iq-ui, nz-iq-run, nz-lang, nz-theme, nz-settings,
       nz-profile, nz-avatar-img, nz-wallet, nz-badges, nz-league;
     · «Maʼlumotlarni oʻchirish» (§10.6): hammasi oʻchadi, faqat nz-lang,
       nz-theme, nz-settings qoladi;
     · profil rasmi (§5.2): tizim tanlagichi, ruxsatsiz, 256×256 JPEG,
       faqat qurilmada; v1.x da qurilmadan chiqmaydi;
     · bildirishnomalar (§7.2–7.3): faqat mahalliy, standart oʻchiq,
       ruxsat faqat tugma bosilganda, kuniga ≤2;
     · tarmoq: 1.x ilovasi HECH QANDAY soʻrov yubormaydi — savollar
       qurilmada yasaladi (src/iq/gen), src/data.js dagi bank
       sinxronizatsiyasi chaqirilmaydi (src/bootstrap.js);
     · iqtisod (§6): tanga faqat 4 manbadan, IAP yoʻq, tasodif yoʻq,
       xarid faqat kosmetik, yutuq nishoni sotilmaydi.

   IMLO: oʻzbek matnida oʻ/gʻ — ʻ (U+02BB), tutuq — ʼ (U+02BC), ilovadagi
   kabi. Ingliz matnida apostrof ishlatilmaydi (qisqartmalarsiz rasmiy
   uslub). tools/mksite.mjs buni `lintPage()` bilan tekshiradi va xato
   boʻlsa build yiqiladi.
   ───────────────────────────────────────────────────────────────────── */

import { uzPages } from './legal-uz.mjs';
import { ruPages } from './legal-ru.mjs';
import { enPages } from './legal-en.mjs';

/* Birinchisi — asl (ustun) til va x-default. */
export const SITE_LANGS = ['uz', 'ru', 'en'];

/* Sahifalar tartibi = navigatsiya va sitemap tartibi. */
export const SLUGS = ['maxfiylik', 'shartlar', 'aloqa', 'malumot-ochirish'];

const DIR = { uz: '', ru: 'ru/', en: 'en/' };

/* Sayt ildiziga nisbatan papka: sitePath('ru', 'shartlar') → "ru/shartlar/". */
export function sitePath(lang, slug) {
  if (!(lang in DIR)) throw new Error('[site] nomaʼlum til: ' + lang);
  return DIR[lang] + slug + '/';
}

/* Ilova tili → sayt tili (uz-cyrl lotin sahifani ochadi — bitta til). */
export function siteLangFor(appLang) {
  return appLang === 'ru' || appLang === 'en' ? appLang : 'uz';
}

export const UPDATED = {
  uz: '2026-yil 25-sentabr',
  ru: '25 сентября 2026 г.',
  en: 'September 25, 2026',
};

/* CONTRACT §6.2 — rad qilish matni. Shartlar sahifasida SOʻZMA-SOʻZ
   turadi (lintPage tekshiradi). */
export const DISCLAIMER = {
  uz: 'IQuest testi klinik diagnostika vositasi emas va hech qanday tashkilot ' +
      'tomonidan tasdiqlanmagan. Natija savollarga bergan javoblaringiz asosida ' +
      'statistik baholanadi va xatolik oraligʻiga ega.',
  ru: 'Тест IQuest не является инструментом клинической диагностики и не ' +
      'утверждён какой-либо организацией. Результат — статистическая оценка ' +
      'по вашим ответам на вопросы, и у него есть диапазон погрешности.',
  en: 'The IQuest test is not a clinical diagnostic tool and is not endorsed by ' +
      'any organization. The result is a statistical estimate based on your ' +
      'answers to the questions and has a margin of error.',
};

/* Sahifa ramkasi (tools/mksite.mjs chizadi). */
export const CHROME = {
  uz: {
    htmlLang: 'uz', ogLocale: 'uz_UZ', langName: 'Oʻzbekcha',
    home: 'Bosh sahifa', navLabel: 'Sahifalar', langLabel: 'Til',
    nav: { maxfiylik: 'Maxfiylik', shartlar: 'Shartlar', aloqa: 'Aloqa' },
    deletion: 'Maʼlumotlarni oʻchirish',
  },
  ru: {
    htmlLang: 'ru', ogLocale: 'ru_RU', langName: 'Русский',
    home: 'Главная', navLabel: 'Страницы', langLabel: 'Язык',
    nav: { maxfiylik: 'Конфиденциальность', shartlar: 'Условия', aloqa: 'Контакты' },
    deletion: 'Удаление данных',
  },
  en: {
    htmlLang: 'en', ogLocale: 'en_US', langName: 'English',
    home: 'Home', navLabel: 'Pages', langLabel: 'Language',
    nav: { maxfiylik: 'Privacy', shartlar: 'Terms', aloqa: 'Contact' },
    deletion: 'Data deletion',
  },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Sozlama fayli (site.config.json) → matnlarga qoʻyiladigan qiymatlar. */
function context(cfg, lang) {
  const app = esc(cfg.appName || 'IQuest');
  const email = String(cfg.contactEmail || '').trim();
  const tg = String(cfg.contactTelegram || '').trim().replace(/^@/, '');
  return {
    lang,
    app,
    updated: UPDATED[lang],
    disclaimer: DISCLAIMER[lang],
    developer: esc(cfg.publisherLegal || cfg.publisher || cfg.appName || 'IQuest'),
    mail: email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '',
    telegram: tg ? `<a href="https://t.me/${esc(tg)}">@${esc(tg)}</a>` : '',
    ccby: '<a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>',
  };
}

const BUILDERS = { uz: uzPages, ru: ruPages, en: enPages };

/* Bitta tilning sahifalari: [{ slug, lang, path, title, description, body }].
   Tanaga ichki havolalar "../<slug>/" koʻrinishida (bir til papkasidagi
   qoʻshni sahifa) — ular har qanday chuqurlikda toʻgʻri ishlaydi. */
export function pages(cfg, lang = 'uz') {
  const build = BUILDERS[lang];
  if (!build) throw new Error('[site] nomaʼlum til: ' + lang);
  const list = build(context(cfg, lang));
  const bySlug = new Map(list.map(p => [p.slug, p]));
  return SLUGS.filter(s => bySlug.has(s)).map(s =>
    Object.assign({ lang, path: sitePath(lang, s) }, bySlug.get(s)));
}

/* Hamma tildagi hamma sahifa. */
export function allPages(cfg) {
  return SITE_LANGS.flatMap(l => pages(cfg, l));
}

/* ── Matn tekshiruvi ─────────────────────────────────────────────────
   Qaytaradi: muammolar roʻyxati (boʻsh — hammasi joyida). */
const CYR = /[Ѐ-ӿ]/;
const UZ_MARKS = /[ʻʼ]/;
/* Harf yonidagi notoʻgʻri apostrof: ‘ ’ ' ` */
const BAD_APOS = /[A-Za-zЀ-ӿ][‘’'`]|[‘’'`][A-Za-zЀ-ӿ]/;

function visibleText(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function lintText(lang, text, where) {
  const out = [];
  const bad = text.match(BAD_APOS);
  if (bad) out.push(`${where}: notoʻgʻri apostrof "${bad[0]}" (${lang === 'uz'
    ? 'oʻ/gʻ uchun ʻ U+02BB, tutuq uchun ʼ U+02BC' : 'apostrofsiz yozing'})`);
  if (lang !== 'ru' && CYR.test(text)) out.push(`${where}: kirill harfi bor`);
  if (lang !== 'uz' && UZ_MARKS.test(text)) out.push(`${where}: oʻzbekcha ʻ/ʼ belgisi bor`);
  if (lang === 'ru' && !CYR.test(text)) out.push(`${where}: ruscha matn yoʻq`);
  return out;
}

export function lintPage(p) {
  const where = p.path || p.slug;
  const text = visibleText(p.body);
  const out = []
    .concat(lintText(p.lang, p.title, where + ' title'))
    .concat(lintText(p.lang, p.description, where + ' description'))
    .concat(lintText(p.lang, text, where));
  if (p.slug === 'shartlar' && text.indexOf(DISCLAIMER[p.lang]) === -1) {
    out.push(`${where}: CONTRACT §6.2 rad qilish matni toʻliq emas`);
  }
  for (const m of p.body.matchAll(/href="\.\.\/([^"/]+)\/"/g)) {
    if (SLUGS.indexOf(m[1]) === -1) out.push(`${where}: nomaʼlum sahifaga havola ../${m[1]}/`);
  }
  return out;
}

export function lintChrome(lang) {
  const c = CHROME[lang];
  return [c.home, c.navLabel, c.langLabel, c.deletion, c.langName]
    .concat(Object.values(c.nav))
    .flatMap(s => lintText(lang, s, `CHROME.${lang}`));
}

/* EN darvozasi (ARXITEKTURA §8.4, 4-shart) va /ru/ tekshiruvi uchun:
   shu tilda Shartlar va Maxfiylik bor, rad qilish matni toʻliq va matn
   tekshiruvidan oʻtadi. */
export function legalReady(cfg, lang) {
  if (SITE_LANGS.indexOf(lang) === -1) return false;
  let list;
  try { list = pages(cfg, lang); } catch (e) { return false; }
  const need = ['shartlar', 'maxfiylik'];
  return need.every(s => list.some(p => p.slug === s && p.body.trim())) &&
         list.every(p => lintPage(p).length === 0);
}
