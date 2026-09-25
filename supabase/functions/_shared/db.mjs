/* ─────────────────────────────────────────────────────────────────────────
   Baza bilan aloqa (Edge Function → PostgREST RPC, service_role)

   Funksiyalar faqat 0006_record.sql dagi server funksiyalarini chaqiradi
   (EXECUTE faqat service_role'da). service_role kaliti FAQAT funksiya
   muhitida (SUPABASE_SERVICE_ROLE_KEY) — faylda ham, mijozda ham emas.

   Bazaning mashina o'qiydigan xato kodlari (ZKxxx, 0006 boshida) HTTP
   holatiga aylantiriladi.
   ───────────────────────────────────────────────────────────────────── */

const DB_ERRORS = {
  ZK400: [400, 'invalid'],
  ZK404: [404, 'not_found'],
  ZK409: [409, 'conflict'],
  ZK410: [410, 'closed'],
  ZK422: [422, 'too_fast'],
  ZK429: [429, 'limit'],
  23505: [409, 'duplicate'],   // bitta urug' ikki marta
  23514: [422, 'invalid'],     // bazadagi CHECK (server xatosi ham o'tmaydi)
};

export function dbError(body, httpStatus) {
  const code = body && body.code;
  const map = DB_ERRORS[code];
  const e = new Error((body && body.message) || ('baza: HTTP ' + httpStatus));
  e.code = map ? map[1] : 'server';
  e.status = map ? map[0] : 500;
  e.dbCode = code;
  return e;
}

export function restDb(deps) {
  const url = (deps.env('SUPABASE_URL') || '').replace(/\/+$/, '');
  const key = deps.env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    const e = new Error('SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY berilmagan');
    e.code = 'config';
    e.status = 500;
    throw e;
  }
  return {
    async rpc(name, args) {
      const res = await deps.fetch(url + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(args),
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
      if (!res.ok) throw dbError(data, res.status);
      return data;
    },
  };
}
