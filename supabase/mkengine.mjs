#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────
   DVIGATELNI EDGE FUNCTION'GA YETKAZISH

   Ishga tushirish:  node supabase/mkengine.mjs
   Chiqish:          supabase/functions/_shared/engine/

   NIMA UCHUN: server natijani QAYTA hisoblaydi (CONTRACT §10) — buning
   uchun unda ilovadagi AYNAN o'sha generator, sessiya va o'yin kodi
   bo'lishi kerak. Bir bayt farq bo'lsa, o'sha urug' boshqa savol beradi
   va halol natija "mos emas" deb rad etiladi (yoki, yomonrog'i, boshqa
   savolga baho qo'yiladi). Shuning uchun fayllar qo'lda ko'chirilmaydi —
   shu skript ko'chiradi, CI (db.yml) esa natija src/ bilan mosligini
   tekshiradi.

   Nima ko'chiriladi (tartib — build.mjs bilan bir xil):
     src/iq/{rng,index,score,session}.js
     src/iq/gen/*.js          (demo.js dan tashqari)
     src/games/index.js, src/games/*.js   (demo.js dan tashqari)
     content/verbal.json      → verbal.mjs (globalThis.IQ_VERBAL)

   Fayllar O'ZGARTIRILMAYDI (baytma-bayt nusxa) va ES modul sifatida
   yuklanadi: Deno'da .js — har doim modul (strict mode). Node testlari
   ham xuddi shunday yuklasin deb papkaga {"type":"module"} qo'yiladi —
   aks holda Node ularni CommonJS (sloppy mode) deb o'qirdi va Deno'da
   yiqiladigan kod Node testidan o'tib ketardi.
   ───────────────────────────────────────────────────────────────────── */

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'supabase', 'functions', '_shared', 'engine');

const listJs = (dir, skip) => existsSync(dir)
  ? readdirSync(dir).filter(f => f.endsWith('.js') && !skip.includes(f)).sort()
  : [];

/* Ko'chiriladigan fayllar (repo ildiziga nisbatan), yuklanish tartibida. */
export function engineFiles(root = ROOT) {
  const core = ['rng.js', 'index.js', 'score.js', 'session.js'].map(f => `src/iq/${f}`);
  const gens = listJs(join(root, 'src', 'iq', 'gen'), ['demo.js']).map(f => `src/iq/gen/${f}`);
  const games = existsSync(join(root, 'src', 'games', 'index.js')) ? ['src/games/index.js'] : [];
  const gameFiles = listJs(join(root, 'src', 'games'), ['demo.js', 'index.js']).map(f => `src/games/${f}`);
  return core.concat(gens, games, gameFiles);
}

/* Manbalar xeshi — diagnostika uchun (qaysi dvigatel serverda turibdi).
   Mantiqiy versiya esa IQ.session.ENGINE — natijada shu saqlanadi. */
export function sourceHash(root = ROOT) {
  const h = createHash('sha256');
  for (const f of engineFiles(root)) h.update(f + '\n').update(readFileSync(join(root, f)));
  const v = join(root, 'content', 'verbal.json');
  if (existsSync(v)) h.update('content/verbal.json\n').update(readFileSync(v));
  return h.digest('hex').slice(0, 16);
}

function main() {
  const files = engineFiles();
  for (const f of files) {
    if (!existsSync(join(ROOT, f))) {
      console.error(`[mkengine] XATO: ${f} topilmadi`);
      process.exit(1);
    }
  }
  // Eski fayllar qolmasin (src dan o'chirilgan generator serverda yashab qolmasin).
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const imports = [];
  const verbalPath = join(ROOT, 'content', 'verbal.json');
  if (existsSync(verbalPath)) {
    const data = JSON.parse(readFileSync(verbalPath, 'utf8'));
    writeFileSync(join(OUT, 'verbal.mjs'),
      '// AVTOMATIK — supabase/mkengine.mjs (manba: content/verbal.json). Qo\'lda tahrirlanmaydi.\n' +
      `globalThis.IQ_VERBAL = ${JSON.stringify(data)};\n`);
    imports.push('./verbal.mjs');
  }
  for (const f of files) {
    const rel = f.replace(/^src\//, '');
    mkdirSync(dirname(join(OUT, rel)), { recursive: true });
    copyFileSync(join(ROOT, f), join(OUT, rel));
    imports.push('./' + rel);
  }
  writeFileSync(join(OUT, 'package.json'), '{ "type": "module" }\n');
  writeFileSync(join(OUT, 'index.mjs'),
`// ═══════════════════════════════════════════════════════════════════════
//  AVTOMATIK — supabase/mkengine.mjs yasaydi. QO'LDA TAHRIRLANMAYDI.
//  Ilovadagi dvigatelning aynan nusxasi (src/iq, src/games, content/verbal.json).
//  Import tartibi muhim: IQ_VERBAL → rng → index → score → session → gen → games.
// ═══════════════════════════════════════════════════════════════════════
${imports.map(i => `import '${i}';`).join('\n')}

export const IQ = globalThis.IQ;
export const SOURCE_HASH = '${sourceHash()}';
export const FILES = ${JSON.stringify(files)};
`);
  console.log(`[mkengine] ${files.length} fayl${imports[0] === './verbal.mjs' ? ' + verbal.json' : ' (verbal.json yo\'q)'} → ${relative(ROOT, OUT)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
