/* ─────────────────────────────────────────────────────────────────────────
   Foydalanuvchini aniqlash (Edge Function)

   Self-hosted Supabase'da (deploy/, DEPLOY.md) GoTrue tokenlarni HS256
   bilan JWT_SECRET orqali imzolaydi va edge-runtime konteyneriga
   JWT_SECRET beriladi. Shunda token shu yerda, tarmoqsiz tekshiriladi.
   JWT_SECRET berilmagan muhitda (masalan asimmetrik kalitli loyiha) —
   GoTrue'ning o'zidan so'raladi: GET {SUPABASE_URL}/auth/v1/user.

   Gateway ham tokenni tekshirishi mumkin (VERIFY_JWT), lekin bunga
   tayanilmaydi: sozlama bitta o'zgarishda o'chib qolishi mumkin.

   Qaytaradi: { id, anonymous } yoki null (token yo'q/yaroqsiz).
   ───────────────────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlJson = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

export async function verifyHs256(token, secret, nowMs) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  let header, claims;
  try {
    header = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch (e) {
    return null;
  }
  /* alg aniq HS256 bo'lishi SHART: "none" yoki boshqa algoritmni qabul
     qilish — klassik JWT teshigi (imzosiz token). */
  if (!header || header.alg !== 'HS256') return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
                                            false, ['verify']);
  let sig;
  try { sig = b64urlBytes(parts[2]); } catch (e) { return null; }
  const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  if (!claims || typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return null;
  /* Faqat foydalanuvchi tokeni. service_role/anon kaliti ham JWT — ular
     bilan "foydalanuvchi" sifatida kirib bo'lmaydi. */
  if (claims.role !== 'authenticated') return null;
  if (typeof claims.sub !== 'string' || !UUID_RE.test(claims.sub)) return null;
  return { id: claims.sub.toLowerCase(), anonymous: claims.is_anonymous === true };
}

export async function authenticate(req, deps) {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h.trim());
  if (!m) return null;
  const token = m[1];
  const secret = deps.env('JWT_SECRET');
  if (secret) return verifyHs256(token, secret, deps.now());

  const url = deps.env('SUPABASE_URL');
  const key = deps.env('SUPABASE_ANON_KEY');
  if (!url || !key) {
    const e = new Error('JWT_SECRET ham, SUPABASE_URL + SUPABASE_ANON_KEY ham berilmagan');
    e.code = 'config';
    e.status = 500;
    throw e;
  }
  const res = await deps.fetch(url.replace(/\/+$/, '') + '/auth/v1/user', {
    headers: { apikey: key, Authorization: 'Bearer ' + token },
  });
  if (!res.ok) return null;
  const u = await res.json().catch(() => null);
  if (!u || typeof u.id !== 'string' || !UUID_RE.test(u.id)) return null;
  return { id: u.id.toLowerCase(), anonymous: u.is_anonymous === true };
}
