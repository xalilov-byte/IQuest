/* ─────────────────────────────────────────────────────────────────────────
   aHOST (cPanel) UCHUN BITTA PAPKA  →  dist/ahost/  +  dist/iquest-ahost.zip

   Ishga tushirish:  npm run deploy:ahost   (node tools/mkahost.mjs)
   Qoʻllanma (oʻzbekcha, qadamma-qadam): DEPLOY-AHOST.md

     dist/ahost/                 → public_html/ ga ochiladi
       index.html, maxfiylik/ …  landing + huquqiy sahifalar (tools/mksite.mjs)
       app/                      Telegram Mini App (build.mjs --target=tg)
       app/admin.html            admin panel (faqat ADMIN_IDS, bot ichida)
       bot/bot.php               bot webhook'i (+ lib.php, admin-api.php, file.php)
       bot/data/                 buyurtmalar (orders.json) — bot oʻzi yaratadi, yopiq
       bot/set-webhook.php       bir marta ochiladi, keyin oʻchiriladi
       bot/config.php            sirlar (bor boʻlsa; .htaccess yopadi)
       .htaccess                 HTTPS, MIME, kesh, config.php ga taqiq

   Zip tashqi dasturlarsiz yasaladi (Windows'da ham ishlaydi).
   ───────────────────────────────────────────────────────────────────── */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync,
         readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';

const OUT = 'dist/ahost';
const ZIP = 'dist/iquest-ahost.zip';
const cfg = JSON.parse(readFileSync('site.config.json', 'utf8'));
const pw = cfg.paywall || {};
const DOMAIN = cfg.domain || 'iquest.uz';
const WEBAPP_URL = `https://${DOMAIN}/app/`;

/* ── 1. Sayt (landing) + Mini App ───────────────────────────────────── */
execFileSync(process.execPath, ['tools/mksite.mjs'], { stdio: 'inherit' });   // → dist/site, dist/tg

function copyDir(from, to, skip = () => false) {
  mkdirSync(to, { recursive: true });
  for (const e of readdirSync(from, { withFileTypes: true })) {
    if (skip(e.name)) continue;
    if (e.isDirectory()) copyDir(join(from, e.name), join(to, e.name));
    else copyFileSync(join(from, e.name), join(to, e.name));
  }
}
rmSync(OUT, { recursive: true, force: true });
copyDir('dist/site', OUT, n => n === '_headers');          // _headers — Cloudflare/Netlify uchun, Apache'da kerak emas
copyDir('dist/tg', join(OUT, 'app'));

/* ── 2. Bot ─────────────────────────────────────────────────────────── */
mkdirSync(join(OUT, 'bot'), { recursive: true });
for (const f of ['bot.php', 'lib.php', 'admin-api.php', 'file.php', 'set-webhook.php', 'config.example.php']) copyFileSync(join('bot', f), join(OUT, 'bot', f));
const hasConfig = existsSync('bot/config.php');
if (hasConfig) copyFileSync('bot/config.php', join(OUT, 'bot', 'config.php'));

/* ── 3. .htaccess ───────────────────────────────────────────────────── */
writeFileSync(join(OUT, '.htaccess'), `# IQuest — aHOST (Apache/LiteSpeed). tools/mkahost.mjs yasaydi, qoʻlda tahrirlamang.
Options -Indexes
DirectoryIndex index.html index.php
AddDefaultCharset utf-8

# 1. Faqat HTTPS (SSL sertifikati — DEPLOY-AHOST.md, 6-qadam).
#    .well-known — AutoSSL / Let's Encrypt tekshiruvi uchun ochiq qoladi.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_URI} !^/\\.well-known/
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</IfModule>

# 2. Toʻgʻri MIME turlari
AddType application/manifest+json .webmanifest
AddType font/woff2 .woff2
AddCharset utf-8 .html .webmanifest .xml .txt

# 3. Bot sirlari va buyurtmalar brauzerdan OCHILMAYDI
<IfModule mod_rewrite.c>
  RewriteRule ^bot/data/ - [F,L]
</IfModule>
<FilesMatch "^(config|config\\.example|lib)\\.php$|^orders\\.json$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>

# 4. Kesh: shriftlar — 1 yil, rasmlar — 30 kun, sahifalar — har safar tekshiriladi
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  <FilesMatch "\\.woff2$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(png|jpe?g|svg|ico|webp)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  <FilesMatch "\\.(html|webmanifest|xml|txt)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.php$">
    Header set Cache-Control "no-store"
  </FilesMatch>
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`);

/* ── 4. Tekshiruv: egasi toʻldirishi kerak boʻlgan joylar ─────────────── */
const warn = [];
if (!cfg.domainConfirmed) warn.push(`site.config.json: domainConfirmed = false — robots.txt qidiruvni toʻsadi. Domen ulanganda true qiling.`);
if (/^8600 0000 0000 0000$/.test(String(pw.card || '').trim())) warn.push('site.config.json: paywall.card — namuna karta raqami');
if (/ISM FAMILIYA/.test(String(pw.cardOwner || ''))) warn.push('site.config.json: paywall.cardOwner — namuna ism');
if (!pw.secret || pw.secret === 'change-me') warn.push('site.config.json: paywall.secret — "change-me" (yangi tasodifiy sir yozing)');
if (!pw.bot) warn.push('site.config.json: paywall.bot boʻsh — landing tugmasi va «Chekni yuborish» ishlamaydi');

function readBotConfig(file) {
  try {   // PHP bor boʻlsa — aniq oʻqiladi
    return JSON.parse(execFileSync('php', ['-r', `echo json_encode(require ${JSON.stringify(file)});`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch (e) {}
  const src = readFileSync(file, 'utf8'), out = {};   // zaxira: oddiy regex
  for (const m of src.matchAll(/'([A-Z_]+)'\s*=>\s*'([^']*)'/g)) out[m[1]] = m[2];
  return out;
}
if (!hasConfig) {
  warn.push('bot/config.php yoʻq — zip\'ga faqat config.example.php kirdi. bot/config.example.php ni bot/config.php ' +
            'nomi bilan nusxalab toʻldiring va qayta ishga tushiring (yoki serverda yarating).');
} else {
  const bc = readBotConfig('bot/config.php');
  if (!bc.BOT_TOKEN) warn.push('bot/config.php: BOT_TOKEN boʻsh');
  if (!String(bc.ADMIN_IDS || '').trim()) warn.push('bot/config.php: ADMIN_IDS boʻsh — botga /myid yozing va raqamni shu yerga qoʻying');
  if (String(bc.UNLOCK_SECRET) !== String(pw.secret || '')) {
    warn.push('bot/config.php: UNLOCK_SECRET site.config.json → paywall.secret bilan BIR XIL EMAS — «Natijani ochish» ishlamaydi');
  }
  if (String(bc.WEBAPP_URL || '') !== WEBAPP_URL) warn.push(`bot/config.php: WEBAPP_URL "${bc.WEBAPP_URL || ''}" — kutilgan: ${WEBAPP_URL}`);
}

/* ── 5. Zip (store/deflate, tashqi dasturlarsiz) ───────────────────────── */
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function listFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p)); else out.push(p);
  }
  return out;
}
function makeZip(root, dest) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [], centrals = [];
  let offset = 0;
  for (const file of listFiles(root)) {
    const name = Buffer.from(relative(root, file).split(sep).join('/'), 'utf8');
    const data = readFileSync(file);
    const def = zlib.deflateRawSync(data, { level: 9 });
    const useDef = def.length < data.length;
    const body = useDef ? def : data;
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(useDef ? 8 : 0, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(0x0314, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(useDef ? 8 : 0, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE((0o100644 << 16) >>> 0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8); end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(dest, Buffer.concat([...locals, cd, end]));
  return centrals.length / 2;
}
rmSync(ZIP, { force: true });
const count = makeZip(OUT, ZIP);

/* ── 6. Hisobot ─────────────────────────────────────────────────────── */
const mb = n => (n / 1024 / 1024).toFixed(2) + ' MB';
console.log('');
console.log(`aHOST papkasi → ${OUT}/`);
console.log(`  /            landing + huquqiy sahifalar`);
console.log(`  /app/        Telegram Mini App  (${WEBAPP_URL})`);
console.log(`  /bot/bot.php webhook             (https://${DOMAIN}/bot/bot.php)`);
console.log(`zip → ${ZIP}  (${count} ta fayl, ${mb(statSync(ZIP).size)})`);
console.log('Keyingi qadam: cPanel → File Manager → public_html → Upload → Extract (DEPLOY-AHOST.md).');
if (warn.length) {
  console.log('\n⚠ TOʻLDIRING (DEPLOY-AHOST.md):');
  for (const w of warn) console.log('  · ' + w);
}
