/* ─────────────────────────────────────────────────────────────────────────
   HALOLLIK LINTI — CONTRACT §6, ARXITEKTURA §8.5, §14.3, §15.11

   Foydalanuvchi koʻradigan HAMMA matnni taqiqlangan DAʼVOLAR uchun
   tekshiradi (uz, ru, en):
     • «rasmiy / official», «sertifikatlangan / certified», akkreditatsiya,
       Mensa, «klinik / clinical» — test hech qanday tashkilot tomonidan
       tasdiqlanmagan;
     • persentil / «X% dan aqlliroq» / «smarter than» — norm yoʻq;
     • «IQ oshiradi / raise·boost·increase your IQ», «aqlli boʻling» —
       isbotlanmagan vaʼda (FTC: Lumosity, LearningRx);
     • DTM ga tayyorlash — DTMʼda mantiq boʻlimi yoʻq;
     • sogʻliq daʼvolari (demensiya, СДВГ, ADHD, Alzheimer…).
   Ilova ICHIDA (qaror №2) qoʻshimcha: rad qilish/ogohlantirish soʻzlari
   («taxminiy», «klinik emas», «norasmiy», «meʼyorlanmagan», «namuna»,
   «приблизительный», «unofficial», «approximate» …) ham taqiqlangan.
   Nishon va katalog nomlarida: «IQ», «daho / гений / genius», «top %».

   INKOR. Sayt va doʻkon matnida inkor gap daʼvo emas («… klinik
   diagnostika vositasi emas», «not endorsed by any organization») —
   ruxsat. Shartlar sahifasidagi rad qilish matni (pages.mjs DISCLAIMER)
   aynan shu sababli bor va umuman tekshirilmaydi. Ilova ichida inkor ham
   ruxsat emas (u rad qilish matni boʻlib qoladi).

   MANBALAR (lintAll):
     app    — Main.dc.html satrlari (i18n-extract), nzRu/nzEn qiymatlari,
              bootstrap/notify, modul uchliklari (catalog, badges …)
     badge  — catalog.js, badges.js nomlari (qoʻshimcha qoidalar)
     content— generator va oʻyin satrlari, content/verbal.json (faqat IQ
              daʼvolari: savol matnida «rasmiy» soʻzi lugʻat soʻzi boʻlishi mumkin)
     site   — src/site sahifalari (allPages), tools/mksite.mjs satrlari
     store  — PLAY.md dagi tilsiz ``` bloklar (doʻkon matni)

   API (mkbrand va build uchun):
     check(text, { scope: 'app'|'badge'|'content'|'site'|'store' }) → [{ rule, match, msg }]
     lintAll({ root }) → [{ scope, where, text, rule, match, msg }]
   CLI: node tools/honesty.mjs   (topilsa exit 1)
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extract, loadDicts, jsStrings } from './i18n-extract.mjs';

const HERE = fileURLToPath(new URL('..', import.meta.url));

/* kind: 'claim' — hamma joyda; 'iq' — IQ daʼvosi (kontentda ham);
   'inapp' — faqat ilova ichida; 'badge' — nishon/katalog nomlari. */
export const RULES = [
  // ── Rasmiylik va tasdiq ─────────────────────────────────────────────
  { id: 'official', kind: 'claim', re: /(?<![\p{L}])(rasmiy|официальн\p{L}*|official(?:ly)?)(?![\p{L}])/iu,
    msg: 'rasmiylik daʼvosi (CONTRACT §6.4)' },
  { id: 'certified', kind: 'claim', re: /sertifikatlangan|akkreditats|сертифицирован\p{L}*|аккредит\p{L}*|\bcertified\b|\baccredit\p{L}*/iu,
    msg: 'sertifikatlangan/akkreditatsiyalangan test daʼvosi (§6.4)' },
  { id: 'mensa', kind: 'iq', re: /\bmensa\b|(?<!\p{L})менс[аеуы]?(?!\p{L})/iu, msg: 'Mensa bilan bogʻliqlik ishorasi (§6.4)' },
  { id: 'clinical', kind: 'claim', re: /\bklinik\p{L}*|клиническ\p{L}*|\bclinical(?:ly)?\b|\bdiagnos\p{L}*|\bdiagnostika\b|диагности\p{L}*/iu,
    msg: 'klinik/diagnostik daʼvo (§6.4)' },
  // ── Norm va taqqoslash ─────────────────────────────────────────────
  { id: 'percentile', kind: 'iq', re: /persentil|перцентил|процентил|percentile|\btop\s*\d+\s*%|\d+\s*%[^.!?]{0,30}(aqlliroq|умнее|smarter)|aqlliroq|умнее\s+(?:\d|\p{L}+\s+\d|большинств|других)|smarter than/iu,
    msg: 'persentil / «X% dan aqlliroq» — norm yoʻq (§6.7)' },
  // ── IQ oshirish vaʼdasi ────────────────────────────────────────────
  { id: 'raise-iq', kind: 'iq',
    re: /IQ\p{L}*[ʻʼ’']?\p{L}*\s+(?:[\p{L}\d]+\s+){0,3}(?:oshir|oshadi|koʻtar|ko'tar)|(?:aqlingizni|intellektingizni)\s+oshir|aqlli(?:roq)?\s+boʻling|aqlli(?:roq)?\s+bo'ling|(?:повы[сш]\p{L}*|увелич\p{L}*|подн[яи]\p{L}*|прокача\p{L}*|рост\p{L}*)\s+(?:[\p{L}\d]+\s+){0,2}IQ|IQ\s+(?:[\p{L}\d]+\s+){0,2}(?:вырастет|повысится|увеличится)|станьте\s+умнее|\b(?:raise|raises|boost|boosts|increase|increases|improve|improves|pump|grow)\s+(?:[\p{L}\d]+\s+){0,2}IQ\b|\bIQ\s+boost|\b(?:get|become|make\s+you)\s+smarter/iu,
    msg: '«IQ oshiradi» vaʼdasi (§6.3)' },
  // ── DTM ─────────────────────────────────────────────────────────────
  { id: 'dtm', kind: 'claim', re: /(?<![A-Za-z])DTM(?![A-Z])|(?<!\p{L})ДТМ(?!\p{L})/u, msg: 'DTM ga tayyorlash daʼvosi — DTMʼda mantiq boʻlimi yoʻq (§6.8)' },
  // ── Sogʻliq ─────────────────────────────────────────────────────────
  { id: 'health', kind: 'iq', re: /demensiya|diqqat\s+buzilish|xotira\s+kasalligi|altsgeymer|alzheimer|альцгеймер|деменц\p{L}*|СДВГ|\bADHD\b|dementia|memory\s+loss|cognitive\s+decline|болезн\p{L}*\s+памяти/iu,
    msg: 'sogʻliq daʼvosi (§6.7)' },
  // ── Ilova ichidagi rad qilish soʻzlari (qaror №2) ───────────────────
  { id: 'disclaimer', kind: 'inapp',
    re: /taxminiy|klinik\s+emas|norasmiy|meʼyorlanmagan|me'yorlanmagan|meyorlanmagan|\bnamuna\b|приблизительн\p{L}*|ориентировочн\p{L}*|неофициальн\p{L}*|не\s+нормирован|не\s+является\s+клиническ|\bapproximate(?:ly)?\b|\bestimated?\b|\bunofficial\b|\bnon-?clinical\b|\bnot\s+normed\b|for\s+entertainment/iu,
    msg: 'ilova ichida rad qilish/ogohlantirish matni (CONTRACT §6, qaror №2) — u faqat Shartlarda' },
  // ── Nishon va katalog nomlari (§15.11) ──────────────────────────────
  { id: 'badge-name', kind: 'badge', re: /\bIQ\b|\bdaho\b|даҳо|гени(?:й|альн)|genius|\btop\s*\d*\s*%/iu,
    msg: 'nishon/katalog nomida IQ, «daho» yoki «top %» (§6.6, §15.11)' },
];

const SCOPES = {
  app: ['claim', 'iq', 'inapp'],
  badge: ['claim', 'iq', 'inapp', 'badge'],
  content: ['iq'],
  site: ['claim', 'iq'],
  store: ['claim', 'iq'],
};
const NEGATABLE = new Set(['site', 'store']);
/* \b kirillda ishlamaydi — harf chegarasi \p{L} bilan. */
const W = (alts) => new RegExp('(?<!\\p{L})(?:' + alts + ')(?!\\p{L})', 'iu');
const NEG = W("emas|yoʻq|yo'q|hech|не|ни|нет|без|not|no|never|without|nor|\\p{L}+n['’]t");
const NEG_STRONG = W("emas|не|not|never|no");

function sentences(text) {
  return String(text).split(/(?<=[.!?…])\s+|\n+/).filter(s => s.trim());
}

/* Bitta matnni tekshiradi. */
export function check(text, { scope = 'app' } = {}) {
  const kinds = SCOPES[scope] || SCOPES.app;
  const out = [];
  for (const s of sentences(text)) {
    for (const r of RULES) {
      if (kinds.indexOf(r.kind) === -1) continue;
      const m = r.re.exec(s);
      if (!m) continue;
      if (NEGATABLE.has(scope) && (r.id === 'raise-iq' ? NEG_STRONG : NEG).test(s)) continue;
      out.push({ rule: r.id, match: m[0], msg: r.msg, sentence: s.trim() });
    }
  }
  return out;
}

/* ── Manbalar ──────────────────────────────────────────────────────── */
function stripTags(html) {
  return String(html).replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function flat(v) {
  if (typeof v === 'string') return [v];
  if (v && typeof v === 'object') return Object.values(v).filter(x => typeof x === 'string');
  return [];
}

export async function collect({ root = HERE } = {}) {
  const items = [];   // { scope, where, text }
  // app: Main + modullar
  const { strings, triplets } = extract({ root });
  for (const [k, where] of strings) items.push({ scope: 'app', where: where[0].file + ':' + where[0].line, text: k });
  const badgeFiles = new Set(['src/catalog.js', 'src/badges.js']);
  for (const t of triplets) {
    for (const L of ['uz', 'ru', 'en']) {
      const isName = badgeFiles.has(t.file) && /^(name|title|label)$/.test(t.key || '');
      if (t[L]) items.push({ scope: isName ? 'badge' : 'app', where: `${t.file}:${t.line} ${t.key || ''} (${L})`, text: t[L] });
    }
  }
  const dicts = loadDicts({ root });
  for (const L of ['ru', 'en']) {
    for (const [k, v] of Object.entries(dicts[L])) {
      for (const s of flat(v)) items.push({ scope: 'app', where: `src/i18n-${L}.js ${JSON.stringify(k)}`, text: s });
    }
  }
  // content: generatorlar, oʻyinlar, verbal.json
  const jsDirs = [join('src', 'iq', 'gen'), join('src', 'games')];
  for (const d of jsDirs) {
    const dir = join(root, d);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const code = readFileSync(join(dir, f), 'utf8');
      for (const s of jsStrings(code)) {
        if (/\s/.test(s.v) && /\p{L}{3}/u.test(s.v)) items.push({ scope: 'content', where: join(d, f), text: s.v });
      }
    }
  }
  const verbal = join(root, 'content', 'verbal.json');
  if (existsSync(verbal)) {
    const walk = (v, path) => {
      if (typeof v === 'string') { if (/\p{L}{3}/u.test(v)) items.push({ scope: 'content', where: 'content/verbal.json ' + path, text: v }); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']'));
      else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path + '.' + k);
    };
    walk(JSON.parse(readFileSync(verbal, 'utf8')), '');
  }
  // site: huquqiy sahifalar (rad qilish matni chiqarib tashlanadi)
  const pagesPath = join(root, 'src', 'site', 'pages.mjs');
  if (existsSync(pagesPath)) {
    try {
      const mod = await import(pathToFileURL(pagesPath).href);
      const cfgPath = join(root, 'site.config.json');
      const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
      const list = mod.allPages ? mod.allPages(cfg) : (mod.pages ? mod.pages(cfg) : []);
      const disc = mod.DISCLAIMER || {};
      for (const p of list) {
        let text = [p.title, p.description, stripTags(p.body)].join('\n');
        for (const d of Object.values(disc)) text = text.split(d).join(' ');
        items.push({ scope: 'site', where: 'site ' + (p.path || p.slug), text });
      }
      if (mod.CHROME) for (const [L, c] of Object.entries(mod.CHROME)) items.push({ scope: 'site', where: 'site CHROME.' + L, text: JSON.stringify(c) });
    } catch (e) {
      items.push({ scope: 'error', where: 'src/site/pages.mjs', text: 'yuklab boʻlmadi: ' + e.message });
    }
  }
  const mksite = join(root, 'tools', 'mksite.mjs');
  if (existsSync(mksite)) {
    for (const s of jsStrings(readFileSync(mksite, 'utf8'))) {
      const t = stripTags(s.v.replace(/\u0000/g, ' '));
      if (/\s/.test(t) && /\p{L}{3}/u.test(t)) items.push({ scope: 'site', where: 'tools/mksite.mjs', text: t });
    }
  }
  // store: PLAY.md tilsiz ``` bloklari
  const play = join(root, 'PLAY.md');
  if (existsSync(play)) {
    const md = readFileSync(play, 'utf8');
    const re = /^```([^\n`]*)\n([\s\S]*?)^```/gm;
    let m;
    while ((m = re.exec(md)) !== null) {
      if (m[1].trim()) continue;
      const line = md.slice(0, m.index).split('\n').length;
      items.push({ scope: 'store', where: 'PLAY.md:' + line, text: m[2] });
    }
  }
  return items;
}

export async function lintAll({ root = HERE } = {}) {
  const out = [];
  for (const it of await collect({ root })) {
    if (it.scope === 'error') { out.push(Object.assign({ rule: 'load', match: '', msg: it.text }, it)); continue; }
    for (const f of check(it.text, { scope: it.scope })) out.push(Object.assign({}, it, f));
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const res = await lintAll();
  if (!res.length) { console.log('halollik: toza'); process.exit(0); }
  for (const r of res) console.log(`[${r.scope}] ${r.where}: ${r.msg} — «${r.match}» :: ${(r.sentence || r.text).slice(0, 140)}`);
  console.log(`\n${res.length} ta muammo`);
  process.exit(1);
}
