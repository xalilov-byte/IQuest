/* ─────────────────────────────────────────────────────────────────────────
   I18N CHIQARIB OLISH — foydalanuvchi koʻradigan oʻzbekcha satrlar va
   lugʻat qamrovi (ARXITEKTURA §8.1, §8.4)

   Kim ishlatadi:
     • tests/i18n-coverage.test.mjs — ru/en qamrovi;
     • build.mjs — EN darvozasining 1-sharti (`coverage().missing.en`
       boʻsh boʻlishi kerak);
     • tools/honesty.mjs — ilova matnini halollik lintiga beradi;
     • odam: `node tools/i18n-extract.mjs` (hisobot).

   MANBALAR (manba tili — oʻzbek lotin; lugʻatlar shu satr bilan kalitlanadi):
     1. src/Main.dc.html markup — matn tugunlari ({{ … }} orasidagi
        boʻlaklar, runtime.js interpText kabi) va statik aria-label,
        placeholder, title atributlari. Admin boʻlimi (isAdmin) kesiladi.
     2. src/Main.dc.html mantiqi — satr literallari:
          – T("…"), nzT("…"), nzTN("…"), nzI18n.t/plural/tn("…"), tr("…")
            ning birinchi argumenti (har doim);
          – matn kalitining qiymati (title, sub, body, label, confirm,
            cancel, aria, name, hint, placeholder, …Label, …Title, …);
          – kalitsiz joyda — faqat «oʻzbekcha jumlaga oʻxshasa».
        Admin metodlari (valsAnalytics, valsManage, …) kesiladi.
     3. bootstrap.js, notify.js, settings.js — tr()/nzT()/nzTN() argumenti.
     4. catalog.js, badges.js, avatars.js va boshqa modullar — oʻz
        tarjimasini {uz, ru, en} / L(uz, ru, en) koʻrinishida olib yuradi;
        ular lugʻatga emas, «uchlik» tekshiruviga tushadi (`triplets`).
        Oddiy oʻzbekcha satr (tarjimasiz) boʻlsa — lugʻat qamroviga.

   ISTISNO: brend soʻzlar (IQuest, IQ, Telegram, Google Play …), faqat
   raqam/belgidan iborat satrlar, bitta bosh harf, IGNORE roʻyxati.

   CLI:
     node tools/i18n-extract.mjs                 hisobot (ru + en)
     node tools/i18n-extract.mjs --lang=en       faqat en
     node tools/i18n-extract.mjs --json          mashina uchun
     node tools/i18n-extract.mjs --stub=en       yetishmayotganlar uchun
                                                 lugʻat boʻlagi (qoʻlda toʻldiriladi)
     node tools/i18n-extract.mjs --strict        yetishmasa exit 1
   ───────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('..', import.meta.url));

/* Tarjima talab qilinmaydigan satrlar (aniq moslik). */
export const BRAND = new Set([
  'IQuest', 'IQ', 'Telegram', 'Google Play', 'Google', 'Play', 'Android',
  'IQuest.uz', 'iquest.uz', 'Mini App', 'Admin', 'Web', 'OK', 'IQuest — admin',
]);
/* Chiqarib olishning yolgʻon topilmalari — yangi keraksiz satr chiqsa shu
   yerga (izoh bilan). */
export const IGNORE = new Set([
  'Oʻzbekcha', 'Ўзбекча', 'Русский', 'English',     // til nomlari — oʻgirilmaydi
  'Oʻzbek (lotin)', 'Ўзбек (кирилл)',                // 1.0 dagi til nomlari (zaxira qiymat)
]);

/* Birinchi argumenti foydalanuvchi matni boʻlgan funksiyalar: tarjima
   yordamchilari va Mainʼdagi varaq tugmalari btn(label, fn) / sec(label, fn). */
const T_FUNCS = new Set(['T', 'nzT', 'nzTN', 'tr', 'trn', 't', 'plural', 'tn', 'say', 'toast', 'btn', 'sec']);
const TEXT_KEY = /^(title|sub|subtitle|body|label|text|name|aria|ariaLabel|hint|placeholder|desc|description|caption|heading|lead|badge|note|msg|message|tip|cta|confirm|cancel|action|button|btn|empty|toast|help|info|line|verdict|summary|prompt|unit|chip|pill|tag|reason|cond|condition|question|answer|header|footer|value|primary|secondary|kicker)$|(Label|Title|Sub|Text|Aria|Hint|Body|Desc|Name|Msg|Message|Lead|Badge|Note|Caption|Heading|Cta|Tip|Toast|Help|Line|Verdict|Summary|Prompt|Placeholder|Error|Err|Unit|Chip|Pill|Tag|Reason|Cond|Kicker)$/;
const RAW_KEY = /(Raw|Src|Url|Current|[Pp]ressed|Id|Key|Kind|Icon|Glyph|Style|Color|Class)$|^(id|key|kind|type|icon|glyph|style|color|theme|href|src|url|path\d?|mode|state|view|tab|lang|variant|shape|align|dir|role)$/;
const ADMIN_METHODS = ['valsAnalytics', 'valsManage', 'logAction', 'may'];
const ADMIN_CONSTS = ['ROLES', 'REASONS', 'ADMIN_USERS', 'ADMIN_QUESTIONS', 'AUDIT_SEED', 'CSV_COLUMNS',
  'BULK_SAMPLES', 'DAU_90', 'FUNNEL', 'COHORTS', 'ITEMS', 'REV', 'METHOD_SHARE', 'SIGN_KEYS',
  'DEFAULT_PRICING', 'MONTHS_UZ', 'ICON_OK', 'ICON_WARN', 'ICON_BAD'];
const ADMIN_FNS = ['parseBulk', 'toCsv', 'parseCsvLine', 'csvCell', 'nowIso', 'shortTime', 'maskPhone', 'dateAfter'];

/* ── Satr turini aniqlash ──────────────────────────────────────────── */
/* Funksional soʻzlar — butun soʻz ("va" "var(" ichida emas); oʻzaklar — soʻz boshida. */
const UZ_HINT = /[ʻʼ]|\b(?:va|bilan|uchun|yoki|emas|ta)\b|\b(?:yoʻq|kun|savol|oʻyin|test|liga|ball|tanga|mashq|natija|javob|daraja|bugun|hafta|profil|nishon|rang|sozlama)/i;

export function isCodeLike(s) {
  const t = s.trim();
  if (!t) return true;
  if (!/[A-Za-zʻʼ]/.test(t)) return true;                                  // raqam, belgi
  if (/^(var\(|--|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|url\(|data:|https?:|mailto:|\.\/|\/)/i.test(t)) return true;
  if (/^[MmLlHhVvCcSsQqTtAaZz][\d\s.,+-]/.test(t) && /\d.*\d.*\d/.test(t)) return true; // SVG yoʻli
  if (/^\d+(\.\d+)?(px|em|rem|%|ms|s|deg|fr|vh|vw)(\s|$)/.test(t)) return true;         // CSS oʻlcham
  if (/[{};=<>]|=>|\$\{/.test(t) && !/\{\d+\}/.test(t)) return true;
  if (/^[a-z][a-zA-Z0-9]*$/.test(t) && /[A-Z0-9]/.test(t.slice(1))) return true;     // camelCase
  if (/^[a-z0-9]+([_:.\-/][a-z0-9]+)+$/.test(t)) return true;                         // kebab/snake/id
  if (/^[A-Z0-9_]{2,}$/.test(t) && /_/.test(t)) return true;                         // CONST_NAME
  if (/^(flex|grid|block|none|auto|inherit|center|left|right|top|bottom|absolute|relative|fixed|sticky|hidden|visible|scroll|nowrap|wrap|column|row|pointer|bold|normal|italic|solid|dashed|transparent|currentColor|manipulation|ease|linear|forwards|both|contain|cover|smooth|button|submit|text|number|light|dark|true|false|null|undefined|primary|secondary|ghost|danger|img|presentation|polite|assertive|off|on|page|step|dialog|region|list|listitem|tab|tabpanel|switch|radio|checkbox|status|alert|menu|main|nav)$/i.test(t)) return true;
  return false;
}

function looksUzbekProse(s) {
  const t = s.trim();
  if (isCodeLike(t)) return false;
  if (/^[A-Z][a-zʻʼ']+(?:[ -][a-zʻʼ'A-Z0-9]+)*[.!?…:]?$/.test(t) && /\s/.test(t)) return true;  // Jumla
  if (/\s/.test(t) && UZ_HINT.test(t)) return true;
  if (/[ʻʼ]/.test(t) && /^[\p{L}ʻʼ\s.,!?:;—–\-«»()0-9{}%+·/]+$/u.test(t)) return true;
  return false;
}

function isUserText(s) {
  const t = s.trim();
  if (!t || isCodeLike(t)) return false;
  if (BRAND.has(t) || IGNORE.has(t)) return false;
  if (/^[A-Z]$/.test(t)) return false;
  if (/^©/.test(t)) return false;                 // mualliflik qatori — tarjima qilinmaydi
  if (/^[\d\s.,:+\-–—/×%·()]+$/.test(t)) return false;
  return true;
}

/* ── JS tokenizatori (izoh, satr, shablon, regex) ─────────────────── */
function tokenize(code) {
  const toks = [];
  let i = 0;
  const n = code.length;
  const prevSig = () => { for (let k = toks.length - 1; k >= 0; k--) return toks[k]; return null; };
  const regexOk = () => {
    const p = prevSig();
    if (!p) return true;
    if (p.t === 'punc') return !/^[)\]}]$/.test(p.v);
    if (p.t === 'id') return /^(return|typeof|case|in|of|new|delete|void|throw|else|do|yield|await)$/.test(p.v);
    return false;
  };
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') { const e = code.indexOf('\n', i); i = e === -1 ? n : e; continue; }
    if (c === '/' && d === '*') { const e = code.indexOf('*/', i + 2); i = e === -1 ? n : e + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, v = '';
      while (j < n && code[j] !== c) {
        if (code[j] === '\\') {
          const e = code[j + 1];
          if (e === 'n') v += '\n'; else if (e === 't') v += '\t';
          else if (e === 'u') { v += String.fromCharCode(parseInt(code.substr(j + 2, 4), 16)); j += 4; }
          else v += e;
          j += 2;
        } else v += code[j++];
      }
      toks.push({ t: 'str', v, pos: i });
      i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, v = '', dyn = false;
      while (j < n && code[j] !== '`') {
        if (code[j] === '\\') { v += code[j + 1]; j += 2; continue; }
        if (code[j] === '$' && code[j + 1] === '{') {
          dyn = true; let depth = 1; j += 2;
          while (j < n && depth) { if (code[j] === '{') depth++; else if (code[j] === '}') depth--; j++; }
          v += '\u0000'; continue;
        }
        v += code[j++];
      }
      toks.push({ t: 'str', v, pos: i, tpl: true, dyn });
      i = j + 1; continue;
    }
    if (c === '/' && regexOk()) {
      let j = i + 1, cls = false;
      while (j < n) {
        const ch = code[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '[') cls = true; else if (ch === ']') cls = false;
        else if (ch === '/' && !cls) break;
        else if (ch === '\n') break;
        j++;
      }
      j++;
      while (j < n && /[a-z]/i.test(code[j])) j++;
      toks.push({ t: 're', pos: i });
      i = j; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(code[j])) j++;
      toks.push({ t: 'id', v: code.slice(i, j), pos: i }); i = j; continue;
    }
    if (/[0-9]/.test(c)) { let j = i; while (j < n && /[\w.]/.test(code[j])) j++; toks.push({ t: 'num', pos: i }); i = j; continue; }
    const three = code.substr(i, 3), two = code.substr(i, 2);
    if (['===', '!==', '...', '**=', '>>>', '&&=', '||=', '??='].includes(three)) { toks.push({ t: 'punc', v: three, pos: i }); i += 3; continue; }
    if (['=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/='].includes(two)) { toks.push({ t: 'punc', v: two, pos: i }); i += 2; continue; }
    toks.push({ t: 'punc', v: c, pos: i }); i++;
  }
  return toks;
}

/* Satr literallarini kontekst bilan: { v, ctx: 'call'|'key'|'free', key, callee, pos }. */
export function jsStrings(code) {
  const toks = tokenize(code);
  const out = [];
  /* T(TABLE[x]) / T(TABLE.x) — jadval qiymatlari matn (STATE_WORDS, …). */
  const tables = new Set();
  for (let k = 0; k + 3 < toks.length; k++) {
    if (toks[k].t === 'id' && T_FUNCS.has(toks[k].v) && toks[k + 1].v === '(' && toks[k + 2].t === 'id' &&
        (toks[k + 3].v === '[' || toks[k + 3].v === '.') && /^[A-Z][A-Z0-9_]+$/.test(toks[k + 2].v)) tables.add(toks[k + 2].v);
    // matn kaliti qiymati sifatida: { value: THEME_LABELS[x] … }
    if (toks[k].t === 'id' && TEXT_KEY.test(toks[k].v) && toks[k + 1].v === ':' && toks[k + 2].t === 'id' &&
        (toks[k + 3].v === '[' || toks[k + 3].v === '.') && /^[A-Z][A-Z0-9_]+$/.test(toks[k + 2].v)) tables.add(toks[k + 2].v);
  }
  const stack = [];   // {kind:'obj'|'block'|'arr'|'paren', key, callee, argIdx, expectKey}
  const top = () => stack[stack.length - 1];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k], prev = toks[k - 1], next = toks[k + 1];
    if (tk.t === 'punc') {
      if (tk.v === '{') {
        const p = prev;
        const isObj = !p || (p.t === 'punc' && /^[(,:=\[?!&|+]$|^(=>|&&|\|\||\?\?|\.\.\.)$/.test(p.v) && p.v !== '=>') ||
                      (p.t === 'id' && /^(return|yield|case)$/.test(p.v));
        const decl = (p && p.v === '=' && toks[k - 2] && toks[k - 2].t === 'id') ? toks[k - 2].v : null;
        stack.push({ kind: isObj ? 'obj' : 'block', key: null, expectKey: isObj, decl });
      } else if (tk.v === '[') {
        const t0 = top();
        stack.push({ kind: 'arr', idx: 0, head: true, nested: !!(t0 && t0.kind === 'arr') });
      }
      else if (tk.v === '(') {
        let callee = null;
        if (prev && prev.t === 'id') callee = prev.v;
        stack.push({ kind: 'paren', callee, argIdx: 0 });
      } else if (tk.v === '}' || tk.v === ']' || tk.v === ')') stack.pop();
      else if (tk.v === ',') {
        const s = top();
        if (s && s.kind === 'paren') s.argIdx++;
        if (s && s.kind === 'arr') s.idx++;
        if (s && s.kind === 'obj') { s.expectKey = true; s.key = null; }
      }
      continue;
    }
    const s = top();
    // Obyekt kaliti: { key: … } yoki { "key": … }
    if (s && s.kind === 'obj' && s.expectKey && (tk.t === 'id' || tk.t === 'str') && next && next.t === 'punc' && next.v === ':') {
      s.key = tk.v; s.expectKey = false; k++; continue;
    }
    if (s && s.kind === 'obj' && s.expectKey && tk.t === 'id') {   // qisqa yozuv / metod
      s.expectKey = false;
    }
    if (tk.t !== 'str') continue;
    if (tk.tpl && tk.dyn) continue;
    // Taqqoslash (x === "practice") — identifikator, matn emas.
    const cmp = /^(===|!==|==|!=)$/;
    if ((prev && prev.t === 'punc' && cmp.test(prev.v)) || (next && next.t === 'punc' && cmp.test(next.v))) continue;
    if (prev && prev.t === 'id' && /^(case|in|typeof)$/.test(prev.v)) continue;
    if (next && next.t === 'id' && next.v === 'in') continue;
    // Kontekst: T("…") ning 1-argumenti?
    let ctx = 'free', key = null, callee = null;
    /* Kortej [["left", "Chap"], …] / [["home", "home", "Bosh"], …]: boshida
       identifikator(lar), oxirida yorliq. */
    if (s && s.kind === 'arr' && s.nested) {
      const idLike = /^[a-z][a-z0-9-]*$/.test(tk.v);
      if (s.head && s.idx > 0 && !idLike && !isCodeLike(tk.v)) { out.push({ v: tk.v, ctx: 'tuple', key: null, callee: null, pos: tk.pos }); continue; }
      if (!idLike) s.head = false;
    }
    // Oʻzgaruvchiga: primary = "Saqlash"; label = "…"
    if (prev && prev.v === '=' && toks[k - 2] && toks[k - 2].t === 'id' && TEXT_KEY.test(toks[k - 2].v) &&
        next && next.t === 'punc' && /^[;,)}]$/.test(next.v)) {
      out.push({ v: tk.v, ctx: 'key', key: toks[k - 2].v, callee: null, pos: tk.pos }); continue;
    }
    // T("…") / btn(ok ? "A" : "B", …) — 1-argument (ternar tarmoqlari ham).
    if (s && s.kind === 'paren' && s.argIdx === 0 && T_FUNCS.has(s.callee) &&
        prev && prev.t === 'punc' && /^(\(|\?|:|\|\||\?\?)$/.test(prev.v)) {
      ctx = 'call'; callee = s.callee;
    } else {
      for (let q = stack.length - 1; q >= 0; q--) {
        const f = stack[q];
        if (f.kind === 'obj') {
          key = f.key;
          const d = stack.slice(0, q + 1).reverse().find(x => x.decl);
          if (d && tables.has(d.decl)) ctx = 'table';
          // const NAME_LABELS = { auto: "Qurilma", … } — katta harfli qiymatli jadval
          else if (f.decl && /^[A-Z][A-Z0-9_]+$/.test(f.decl) && f.key && !RAW_KEY.test(f.key) &&
                   /^[A-ZʻOʼ][a-zʻʼ]/.test(tk.v) && !isCodeLike(tk.v)) ctx = 'table';
          break;
        }
        if (f.kind === 'block') break;
        // Boshqa funksiyaning argumenti (navPill("home"), new Error("…")) — matn emas.
        if (f.kind === 'paren' && f.callee && !T_FUNCS.has(f.callee) && !/^(if|while|for|switch|return)$/.test(f.callee)) { key = '#' + f.callee; break; }
      }
      if (ctx !== 'table' && key && !key.startsWith('#')) ctx = 'key';
      if (key && key.startsWith('#')) ctx = 'arg';
    }
    out.push({ v: tk.v, ctx, key, callee, pos: tk.pos });
  }
  return out;
}

function lineOf(src, pos) { let n = 1; for (let i = 0; i < pos && i < src.length; i++) if (src.charCodeAt(i) === 10) n++; return n; }

/* ── Main.dc.html ─────────────────────────────────────────────────── */
function cutSection(html, name) {
  const open = `<sc-if value="{{ ${name} }}"`;
  const i = html.indexOf(open);
  if (i === -1) return html;
  const re = /<sc-if\b|<\/sc-if>/g;
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(html)) !== null) {
    if (m[0] === '</sc-if>') { if (--depth === 0) return html.slice(0, i) + ' '.repeat(m.index + 8 - i) + html.slice(m.index + 8); }
    else depth++;
  }
  return html;
}

function blank(s, a, b) { return s.slice(0, a) + s.slice(a, b).replace(/[^\n]/g, ' ') + s.slice(b); }

function cutJsBlock(code, startIdx) {
  // startIdx dan keyingi birinchi { yoki [ blokining oxirigacha boʻshatadi.
  let open = -1;
  for (let i = startIdx; i < code.length; i++) if (code[i] === '{' || code[i] === '[') { open = i; break; }
  if (open === -1) return code;
  const toks = tokenize(code.slice(open));
  let depth = 0;
  for (const tk of toks) {
    if (tk.t !== 'punc') continue;
    if (/^[{[(]$/.test(tk.v)) depth++;
    else if (/^[}\])]$/.test(tk.v) && --depth === 0) return blank(code, startIdx, open + tk.pos + 1);
  }
  return code;
}

function stripAdminLogic(code) {
  for (const m of ADMIN_METHODS) {
    const i = code.indexOf(`\n  ${m}(`);
    if (i !== -1) code = cutJsBlock(code, i + 1);
  }
  for (const f of ADMIN_FNS) {
    const i = code.indexOf(`function ${f}(`);
    if (i !== -1) code = cutJsBlock(code, code.indexOf(')', i));
  }
  for (const c of ADMIN_CONSTS) {
    const i = code.indexOf(`const ${c} = `);
    if (i !== -1) {
      const eol = code.indexOf('\n', i);
      const line = code.slice(i, eol);
      if (/[{[(]/.test(line.slice(`const ${c} = `.length))) code = cutJsBlock(code, i);
      else code = blank(code, i, eol);
    }
  }
  return code;
}

export function splitMain(src) {
  const a = src.indexOf('</helmet>');
  const b = src.indexOf('<script type="text/x-dc"');
  const markupStart = a === -1 ? 0 : a + '</helmet>'.length;
  const markup = src.slice(markupStart, b === -1 ? src.length : b);
  let logicStart = src.indexOf('data-dc-script');
  logicStart = logicStart === -1 ? -1 : src.indexOf('>', logicStart) + 1;
  const logicEnd = logicStart === -1 ? -1 : src.indexOf('</script>', logicStart);
  const logic = logicStart === -1 ? '' : src.slice(logicStart, logicEnd);
  return { markup, markupStart, logic, logicStart };
}

export function extractMarkup(markup) {
  const res = [];
  let html = markup.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  html = cutSection(html, 'isAdmin');
  html = html.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, m => m.replace(/[^\n]/g, ' '));
  const tagRe = /<\/?([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  let last = 0, m;
  const addText = (txt, pos) => {
    for (const part of txt.split(/\{\{[^}]*\}\}/)) {
      const t = part.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
      if (isUserText(t)) res.push({ v: t, pos, kind: 'text' });
    }
  };
  while ((m = tagRe.exec(html)) !== null) {
    if (m.index > last) addText(html.slice(last, m.index), last);
    last = m.index + m[0].length;
    const attrs = m[2] || '';
    const ar = /\s(aria-label|placeholder|title|alt)\s*=\s*"([^"]*)"/g;
    let x;
    while ((x = ar.exec(attrs)) !== null) {
      const v = x[2].trim();
      if (v.indexOf('{{') === -1 && isUserText(v)) res.push({ v, pos: m.index, kind: 'attr:' + x[1] });
    }
  }
  if (last < html.length) addText(html.slice(last), last);
  return res;
}

export function extractLogic(logic) {
  const code = stripAdminLogic(logic);
  const res = [];
  for (const s of jsStrings(code)) {
    const v = s.v.trim();
    if (!isUserText(v)) continue;
    let take = false;
    if (s.ctx === 'call' || s.ctx === 'table' || s.ctx === 'tuple') take = true;
    else if (s.ctx === 'arg') take = false;
    else if (s.ctx === 'key') take = !RAW_KEY.test(s.key) && (TEXT_KEY.test(s.key) ? !isCodeLike(v) && (/[\sʻʼ]/.test(v) || /^[A-ZА-Я]/.test(v) || UZ_HINT.test(v) || /^[a-zʻ]+$/.test(v)) : looksUzbekProse(v));
    else take = looksUzbekProse(v);
    if (take) res.push({ v, pos: s.pos, kind: s.ctx === 'call' ? 'T:' + s.callee : s.ctx === 'key' ? 'key:' + s.key : s.ctx });
  }
  return res;
}

/* Modul: tr()/nzT() argumentlari + tarjimasiz oʻzbekcha jumlalar;
   {uz,ru,en} va L(uz,ru,en) uchliklari alohida. */
export function extractModule(code, { prose = true } = {}) {
  const dict = [], triplets = [];
  // Uchliklar: L('uz','ru','en?')  va  { uz: '…', ru: '…', en: '…' }
  const toks = tokenize(code);
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === 'id' && tk.v === 'L' && toks[k + 1] && toks[k + 1].v === '(') {
      const args = [];
      let j = k + 2;
      while (toks[j] && toks[j].t === 'str') { args.push(toks[j].v); if (toks[j + 1] && toks[j + 1].v === ',') j += 2; else { j++; break; } }
      const key = toks[k - 1] && toks[k - 1].v === ':' && toks[k - 2] && toks[k - 2].t === 'id' ? toks[k - 2].v : null;
      if (args.length >= 2) triplets.push({ uz: args[0], ru: args[1], en: args[2], key, pos: tk.pos });
    }
    if (tk.t === 'id' && tk.v === 'uz' && toks[k + 1] && toks[k + 1].v === ':' && toks[k + 2] && toks[k + 2].t === 'str' && toks[k - 1] && toks[k - 1].v === '{') {
      const key = toks[k - 2] && toks[k - 2].v === ':' && toks[k - 3] && toks[k - 3].t === 'id' ? toks[k - 3].v : null;
      const tri = { uz: toks[k + 2].v, key, pos: tk.pos };
      let j = k + 3;
      while (toks[j] && toks[j].v === ',' && toks[j + 1] && toks[j + 1].t === 'id' && toks[j + 2] && toks[j + 2].v === ':') {
        const name = toks[j + 1].v, val = toks[j + 3];
        if (val && val.t === 'str' && (name === 'ru' || name === 'en')) tri[name] = val.v;
        j += 4;
      }
      triplets.push(tri);
    }
  }
  const inTriplet = new Set(triplets.flatMap(t => [t.uz, t.ru, t.en]).filter(Boolean));
  for (const s of jsStrings(code)) {
    const v = s.v.trim();
    if (!isUserText(v) || inTriplet.has(s.v)) continue;
    if (s.ctx === 'call' || s.ctx === 'table' || (prose && s.ctx !== 'arg' && looksUzbekProse(v))) {
      dict.push({ v, pos: s.pos, kind: s.ctx === 'call' ? 'T:' + s.callee : 'key:' + s.key });
    }
  }
  return { dict, triplets };
}

/* ── Hammasi ───────────────────────────────────────────────────────── */
const DICT_MODULES = ['bootstrap.js', 'notify.js', 'settings.js'];
const TRIPLET_MODULES = ['catalog.js', 'badges.js', 'avatars.js', 'wallet.js', 'league.js', 'profile.js', 'icons.js', 'art.js'];

export function extract({ root = HERE } = {}) {
  const strings = new Map();   // uz → [{ file, line, kind }]
  const add = (v, where) => {
    if (!strings.has(v)) strings.set(v, []);
    strings.get(v).push(where);
  };
  const mainPath = join(root, 'src', 'Main.dc.html');
  if (existsSync(mainPath)) {
    const src = readFileSync(mainPath, 'utf8');
    const { markup, markupStart, logic, logicStart } = splitMain(src);
    for (const r of extractMarkup(markup)) add(r.v, { file: 'src/Main.dc.html', line: lineOf(src, markupStart + r.pos), kind: r.kind });
    for (const r of extractLogic(logic)) add(r.v, { file: 'src/Main.dc.html', line: lineOf(src, logicStart + r.pos), kind: r.kind });
  }
  const triplets = [];
  for (const f of DICT_MODULES.concat(TRIPLET_MODULES)) {
    const p = join(root, 'src', f);
    if (!existsSync(p)) continue;
    const code = readFileSync(p, 'utf8');
    const r = extractModule(code, { prose: DICT_MODULES.includes(f) });
    for (const d of r.dict) add(d.v, { file: 'src/' + f, line: lineOf(code, d.pos), kind: d.kind });
    for (const t of r.triplets) triplets.push(Object.assign({ file: 'src/' + f, line: lineOf(code, t.pos) }, t));
  }
  return { strings, triplets };
}

export function loadDicts({ root = HERE } = {}) {
  const w = {};
  w.window = w;
  const ctx = vm.createContext(w);
  for (const f of ['i18n-ru.js', 'i18n-en.js']) {
    const p = join(root, 'src', f);
    if (existsSync(p)) vm.runInContext(readFileSync(p, 'utf8'), ctx, { filename: f });
  }
  return { ru: w.nzRu || {}, en: w.nzEn || {} };
}

function has(d, k) {
  if (Object.prototype.hasOwnProperty.call(d, k) && d[k]) return true;
  return false;
}

/* Qamrov: { total, keys, missing:{ru,en}, stale:{ru,en}, triplets:{missingRu, missingEn}, glossary } */
export function coverage({ root = HERE, langs = ['ru', 'en'] } = {}) {
  const { strings, triplets } = extract({ root });
  const dicts = loadDicts({ root });
  const keys = [...strings.keys()].sort();
  const missing = {}, stale = {};
  for (const L of langs) {
    const d = dicts[L] || {};
    missing[L] = keys.filter(k => !has(d, k));
    const used = new Set(keys);
    stale[L] = Object.keys(d).filter(k => !used.has(k));
  }
  const glossary = [];
  for (const k of keys) {
    if (/\bstreak/i.test(k)) glossary.push({ key: k, rule: 'streak → «ketma-ketlik» / «ketma-ket kunlar» (glossariy)', where: strings.get(k) });
    if (/IQ[ -]ball/i.test(k)) glossary.push({ key: k, rule: '«ball» faqat liga uchun; IQ natija → «IQ» / «natija»', where: strings.get(k) });
    if (/['’‘`]/.test(k)) glossary.push({ key: k, rule: 'apostrof: oʻ/gʻ uchun ʻ (U+02BB), tutuq uchun ʼ (U+02BC)', where: strings.get(k) });
  }
  return {
    total: keys.length, keys, strings, missing, stale, glossary,
    triplets: {
      all: triplets,
      missingRu: triplets.filter(t => !t.ru),
      missingEn: triplets.filter(t => !t.en),
    },
  };
}

/* ── CLI ───────────────────────────────────────────────────────────── */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const opt = k => { const a = args.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : null; };
  const langs = opt('lang') && opt('lang') !== true ? [opt('lang')] : ['ru', 'en'];
  const cov = coverage({ langs });
  const stub = opt('stub');
  if (stub) {
    const L = stub === true ? 'en' : stub;
    const miss = coverage({ langs: [L] }).missing[L];
    console.log(miss.map(k => `  ${JSON.stringify(k)}: "",   // ${cov.strings.get(k).map(w => w.file.replace('src/', '') + ':' + w.line).join(', ')}`).join('\n'));
    process.exit(0);
  }
  if (opt('json')) {
    console.log(JSON.stringify({
      total: cov.total, missing: cov.missing, stale: cov.stale,
      glossary: cov.glossary.map(g => ({ key: g.key, rule: g.rule })),
      tripletsMissingEn: cov.triplets.missingEn.length,
    }, null, 2));
  } else {
    console.log(`Foydalanuvchi satrlari: ${cov.total}`);
    for (const L of langs) {
      console.log(`\n[${L}] yetishmaydi: ${cov.missing[L].length}`);
      for (const k of cov.missing[L]) console.log(`  ${JSON.stringify(k)}  ← ${cov.strings.get(k).map(w => relative('.', w.file) + ':' + w.line).join(', ')}`);
      console.log(`[${L}] ishlatilmayotgan kalitlar: ${cov.stale[L].length}`);
    }
    if (cov.glossary.length) {
      console.log(`\nGlossariy/imlo ogohlantirishlari: ${cov.glossary.length}`);
      for (const g of cov.glossary) console.log(`  ${JSON.stringify(g.key)} — ${g.rule}`);
    }
    console.log(`\nModul uchliklari: ${cov.triplets.all.length} (en yoʻq: ${cov.triplets.missingEn.length})`);
  }
  if (opt('strict') && langs.some(L => cov.missing[L].length)) process.exit(1);
}
