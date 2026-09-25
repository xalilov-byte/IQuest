/* ─────────────────────────────────────────────────────────────────────────
   Deno qobig'i — ATAYLAB yupqa. Hamma mantiq handler.mjs va core.mjs da
   (Node testida sinalgan); bu yerda faqat Deno'ga xos narsa: muhit
   o'zgaruvchilari va Deno.serve.

   Muhit o'zgaruvchilari (self-hosted edge-runtime konteynerida beriladi,
   deploy/ va DEPLOY.md):
     SUPABASE_URL               — ichki API manzili (masalan http://kong:8000)
     SUPABASE_SERVICE_ROLE_KEY  — service_role JWT (FAQAT shu yerda)
     JWT_SECRET                 — foydalanuvchi tokenini tekshirish (HS256)
     SUPABASE_ANON_KEY          — JWT_SECRET bo'lmasa, /auth/v1/user uchun
     ALLOWED_ORIGINS            — ixtiyoriy, CORS (vergul bilan)
   ───────────────────────────────────────────────────────────────────── */
import { IQ } from './engine/index.mjs';
import { handle } from './handler.mjs';

export function serve(route) {
  const deps = {
    IQ,
    env: name => Deno.env.get(name),
    fetch: (url, init) => fetch(url, init),
    now: () => Date.now(),
  };
  Deno.serve(req => handle(route, req, deps));
}
