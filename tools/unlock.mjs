/* ─────────────────────────────────────────────────────────────────────────
   OCHISH KODI (paywall zaxirasi, PAYWALL.md)

     node tools/unlock.mjs IQ-4F7K        → ochish kodi (6 belgi)
     node tools/unlock.mjs IQ-4F7K 4F7K … → bir nechta kod

   Sir site.config.json → paywall.secret dan oʻqiladi (bot UNLOCK_SECRET
   bilan bir xil). Algoritm — src/paywall.js (ilova bilan aynan bir xil).
   ───────────────────────────────────────────────────────────────────── */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
await import(new URL('src/paywall.js', ROOT).href);
const P = globalThis.nzPaywall;

const cfg = JSON.parse(readFileSync(fileURLToPath(new URL('site.config.json', ROOT)), 'utf8'));
const secret = cfg.paywall && cfg.paywall.secret;
const codes = process.argv.slice(2);
if (!codes.length || !secret) {
  console.error(!secret ? 'site.config.json da paywall.secret yoʻq' : 'Foydalanish: node tools/unlock.mjs IQ-4F7K');
  process.exit(1);
}
for (const c of codes) {
  const code = P.normCode(c);
  if (!/^IQ-[0-9A-HJKMNP-TV-Z]{4}$/.test(code)) { console.error(`${c}: test kodi notoʻgʻri (IQ-XXXX kutilgan)`); process.exitCode = 1; continue; }
  console.log(codes.length > 1 ? `${code}  ${P.unlockCode(code, secret)}` : P.unlockCode(code, secret));
}
