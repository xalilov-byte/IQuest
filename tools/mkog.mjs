/* ─────────────────────────────────────────────────────────────────────────
   OG RASMI  →  resources/og.jpg  (1200×630)          npm run og

   Havola Telegram, WhatsApp yoki ijtimoiy tarmoqda tashlanganda
   ko'rinadigan rasm (sayt: tools/mksite.mjs → dist/site/og.jpg).

   v1.1 dan rasm brendning yagona manbasidan yasaladi: tools/brand.html
   (`web/og` aktivi, yangi lokap, ARXITEKTURA §12.3). Bu skript faqat
   qisqa yo'l:  node tools/mkbrand.mjs --only=web/og --no-shots
   U resources/brand/web/og-1200x630-{uz,ru}.jpg ni yozadi va o'zbekchasini
   resources/og.jpg ga ko'chiradi.

   Matn qoidalari — brand.html dagi T lug'ati va mkbrand halollik linti
   (CONTRACT §6): «IQ oshiradi», «rasmiy», sertifikat, liga, reyting,
   raqamli va'da — YO'Q.
   ───────────────────────────────────────────────────────────────────── */
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [join(here, 'mkbrand.mjs'), '--only=web/og', '--no-shots', ...process.argv.slice(2)],
                    { stdio: 'inherit' });
process.exit(r.status ?? 1);
